// Village illustré. Carte cliquable avec 14 hotspots posés sur la
// peinture du village. Remplace l'ancienne grille de cartes par emoji.
//
// Le HTML est généré à chaque renderAll (le state peut changer entre deux
// renders : niveau, construction, déblocage). Les listeners de clic sont
// déjà attrapés par la délégation globale de main.js sur [data-village-open]
// et la fiche utilise l'overlay villageBuilding existant.
//
// Le pan mobile est natif : un wrapper en overflow:auto sur un monde
// sur-zoomé. Sur PC la carte tient entière, overflow:hidden, pas de pan.

import { state } from './state.js';
import * as Village from './village.js';

// Positions des hotspots en pourcentage de l'illustration 1672×941.
const SPOTS = [
  { id: 'townhall',    x: 48.5, y: 36   },
  { id: 'houses',      x: 22,   y: 21   },
  { id: 'sawmill',     x: 61,   y: 19   },
  { id: 'quarry',      x: 11,   y: 38   },
  { id: 'locksmith',   x: 55.5, y: 82   },
  { id: 'market',      x: 73,   y: 46   },
  { id: 'forge',       x: 82,   y: 79   },
  { id: 'observatory', x: 88.5, y: 9    },
  { id: 'barracks',    x: 88,   y: 42   },
  { id: 'guild',       x: 70,   y: 64   },
  { id: 'foundry',     x: 12,   y: 72   },
  { id: 'vault',       x: 31,   y: 55   },
  { id: 'orbworks',    x: 37,   y: 77   },
  { id: 'sanctuary',   x: 69.5, y: 8.5  },
];

const fmt = (n) => (n || 0).toLocaleString('fr-FR');

function spotState(id) {
  if (id === 'townhall') {
    return { lvl: Village.townhall(), locked: false, constructing: Village.buildingUnderConstruction() === 'townhall',
      upgradable: Village.canUpgradeTownhall() };
  }
  const b = Village.BUILDING_BY_ID[id];
  const lvl = Village.levelOf(id);
  return {
    lvl,
    locked: !Village.isUnlocked(id),
    constructing: Village.buildingUnderConstruction() === id,
    upgradable: lvl > 0 && Village.canBuild(id),
  };
}

function renderSpot(s) {
  const st = spotState(s.id);
  const classes = ['vmap-spot'];
  if (st.locked) classes.push('locked');
  if (st.constructing) classes.push('constructing');
  if (st.upgradable) classes.push('upgradable');
  const lvlText = st.locked ? '🔒' : (st.lvl === 0 ? '+' : 'Nv ' + st.lvl);
  const b = Village.BUILDING_BY_ID[s.id];
  const name = s.id === 'townhall' ? 'Mairie' : b.name;
  return `<button class="${classes.join(' ')}" style="left:${s.x}%;top:${s.y}%" data-village-open="${s.id}" title="${name}">
    <div class="vmap-ring"><div class="vmap-lvl">${lvlText}</div></div>
    <div class="vmap-name">${name}</div>
  </button>`;
}

function topbar() {
  const r = Village.rates();
  const age = Village.currentAge();
  const v = state.village || {};
  const res = v.resources || {};
  const used = Village.workersUsed();
  const cap = Village.workerCap();
  // Construction en cours : pastille avec timer
  const cs = Village.constructionState();
  const busyChip = cs ? `<span class="vmap-res vmap-busy" title="${Village.BUILDING_BY_ID[cs.id]?.name || 'Mairie'}">⏳ ${Math.ceil(cs.remainingMs / 1000)}s</span>` : '';
  return `<div class="vmap-topbar">
    <span class="vmap-res">🪙 ${fmt(state.gold || 0)}</span>
    <span class="vmap-res" title="Bois +${r.wood.toFixed(0)}/min">🪵 ${fmt(Math.floor(res.wood || 0))}</span>
    <span class="vmap-res" title="Pierre +${r.stone.toFixed(0)}/min">🪨 ${fmt(Math.floor(res.stone || 0))}</span>
    ${(res.metal || 0) > 0 || r.metal > 0 ? `<span class="vmap-res" title="Métal +${r.metal.toFixed(1)}/min">⚙️ ${fmt(Math.floor(res.metal || 0))}</span>` : ''}
    ${(res.essence || 0) > 0 || r.essence > 0 ? `<span class="vmap-res" title="Essence +${r.essence.toFixed(1)}/min">💠 ${fmt(Math.floor(res.essence || 0))}</span>` : ''}
    <span class="vmap-res" title="Ouvriers">👷 ${used}/${cap}</span>
    ${busyChip}
    <span class="vmap-age">${age.emoji} ${age.name}</span>
  </div>`;
}

export function renderVillageMap() {
  const spots = SPOTS.map(renderSpot).join('');
  return `<div class="vmap-screen" data-village-map>
    ${topbar()}
    <div class="vmap-scene">
      <div class="vmap-world">
        <img class="vmap-bg" src="assets/village/village_bg.png" alt="Village" draggable="false">
        <div class="vmap-spots">${spots}</div>
      </div>
    </div>
  </div>`;
}

// Précharge les 14 portraits des bâtiments dès l'import du module : la
// fiche s'ouvre instantanément avec sa peinture la première fois.
(function preloadVillagePortraits() {
  for (const s of SPOTS) {
    const i = new Image();
    i.src = `assets/village/buildings/${s.id}.png`;
  }
})();

// ── Pan & zoom natifs ────────────────────────────────────────────
// La carte garde son ratio 1672/941. Sur PC elle tient en entier
// (overflow: hidden, calculé par "contain"). Sur mobile elle sur-zoome à
// x1.45 et on autorise le pan via overflow: auto natif sur .vmap-scene.
// Pas d'auto-reset entre les renders : le scrollLeft/scrollTop est
// préservé dans une variable module-level pour rester en place quand
// l'UI redraw (notify toutes les secondes par exemple).
const RATIO = 1672 / 941;
let savedScrollX = null, savedScrollY = null;
const SCROLL_KEY = 'lootchest_vmap_scroll';

function applyDims(screen) {
  const scene = screen.querySelector('.vmap-scene');
  const world = screen.querySelector('.vmap-world');
  if (!scene || !world) return;
  const r = scene.getBoundingClientRect();
  const vw = r.width, vh = r.height;
  if (vw < 100 || vh < 100) return; // pas encore monté
  let w, h;
  if (vw / vh > RATIO) { w = vw; h = vw / RATIO; }
  else { h = vh; w = vh * RATIO; }
  // Sur-zoom mobile : la carte reste lisible et chaque bâtiment tappable.
  const overzoom = vw < 700;
  if (overzoom) { w *= 1.45; h *= 1.45; scene.classList.add('vmap-pan'); }
  else { scene.classList.remove('vmap-pan'); }
  world.style.width = w + 'px';
  world.style.height = h + 'px';
  // Centrage. En mode pan natif (overflow:auto), on restaure la position
  // antérieure si on en a une, sinon on centre.
  if (overzoom) {
    scene.scrollLeft = (savedScrollX != null) ? savedScrollX : Math.max(0, (w - vw) / 2);
    scene.scrollTop = (savedScrollY != null) ? savedScrollY : Math.max(0, (h - vh) / 2);
  }
}

function attachScrollSaver(scene) {
  if (scene.dataset.vmapScrollAttached) return;
  scene.dataset.vmapScrollAttached = '1';
  scene.addEventListener('scroll', () => {
    savedScrollX = scene.scrollLeft;
    savedScrollY = scene.scrollTop;
    try { sessionStorage.setItem(SCROLL_KEY, `${savedScrollX},${savedScrollY}`); } catch {}
  }, { passive: true });
}

// Restaure depuis sessionStorage au premier passage (survit aux refreshs).
function loadSavedScroll() {
  if (savedScrollX != null) return;
  try {
    const s = sessionStorage.getItem(SCROLL_KEY);
    if (s) { const [x, y] = s.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) { savedScrollX = x; savedScrollY = y; } }
  } catch {}
}

// Setup observé via MutationObserver : à chaque fois que .vmap-screen
// apparaît dans le DOM (renderAll en a (re)créé un), on redimensionne.
// resize global : on recalcule pour les rotations d'écran.
if (typeof window !== 'undefined') {
  loadSavedScroll();
  const setup = () => {
    const screen = document.querySelector('.vmap-screen');
    if (screen) {
      applyDims(screen);
      const scene = screen.querySelector('.vmap-scene');
      if (scene) attachScrollSaver(scene);
    }
  };
  // Délai après chaque render pour laisser le layout se stabiliser.
  let rafQueued = false;
  function queueSetup() {
    if (rafQueued) return; rafQueued = true;
    requestAnimationFrame(() => { rafQueued = false; setup(); });
  }
  const obs = new MutationObserver(queueSetup);
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => obs.observe(document.body, { childList: true, subtree: true }));
  window.addEventListener('resize', queueSetup);
}
