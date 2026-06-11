// Séquence de début de partie : le coffre, la libération de Mémo, puis
// le récit des 7 tableaux avec Mémo au premier plan.
// API : startMemoIntro({ onDone, replay })
//   onDone : callback appelé quand le joueur clique "Entrer dans l'Abîme"
//            (ou skip). Le bouton ferme tout et rend la main au jeu.
//   replay : true si appelé depuis le Codex (pas de coffre, mode revisite,
//            on commence directement aux tableaux).
//
// Tout le DOM est monté ici, dans un overlay plein écran (.intro-memo-overlay),
// puis démonté à la fin. Le CSS est injecté une seule fois.

import { CINEMATIC_SCENES } from './cinematicScenes.js';
import { Mascot, MASCOT_SPRITES, MASCOT_EMOJI } from './mascot.js';
import { spriteImg } from './spriteMap.js';

const CSS = `
.intro-memo-overlay { position:fixed; inset:0; z-index:2000; background:#05030a;
  overflow:hidden; font-family:"EB Garamond",Georgia,serif;
  -webkit-tap-highlight-color:transparent; user-select:none; }
.im-camera { position:absolute; inset:0; transition:opacity .7s ease; }
.im-camera.swap { opacity:0; }
.im-layer { position:absolute; inset:0; transform:scale(1.12);
  transform-origin:center center; will-change:transform; }
.im-layer img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.im-layer svg { position:absolute; inset:0; width:100%; height:100%; display:block; }
.im-camera.zoom { animation:imCamZoom 26s ease-in-out infinite alternate; }
@keyframes imCamZoom { from{transform:scale(1)} to{transform:scale(1.07)} }

.im-shade { position:absolute; inset:0; pointer-events:none; z-index:5;
  background:radial-gradient(130% 110% at 50% 42%, transparent 58%, rgba(5,3,10,.5) 88%, rgba(5,3,10,.85) 100%); }
.im-shade::after { content:""; position:absolute; left:0; right:0; bottom:0; height:46%;
  background:linear-gradient(180deg, transparent, rgba(6,4,12,.88) 82%); }

/* FX micro-loops (mêmes que la cinématique standalone) */
@keyframes imMote { 0%{transform:translateY(0);opacity:0} 10%{opacity:.9} 90%{opacity:.7} 100%{transform:translateY(-60px);opacity:0} }
@keyframes imDrift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(28px)} }
@keyframes imPulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
@keyframes imFall { 0%{transform:translateY(-40px);opacity:0} 15%{opacity:.8} 100%{transform:translateY(120px);opacity:0} }
@keyframes imBreathe { 0%,100%{opacity:.78;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
@keyframes imBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1.6%)} }
@keyframes imSway { 0%,100%{transform:rotate(-.5deg)} 50%{transform:rotate(.5deg)} }
@keyframes imRain { 0%{transform:translateY(-3%)} 100%{transform:translateY(3%)} }
.intro-memo-overlay .fx-mote { animation:imMote 5s linear infinite; animation-delay:var(--d,0s); }
.intro-memo-overlay .fx-fall { animation:imFall 6s linear infinite; animation-delay:var(--d,0s); }
.intro-memo-overlay .fx-drift { animation:imDrift 14s ease-in-out infinite; }
.intro-memo-overlay .fx-pulse { animation:imPulse 4.5s ease-in-out infinite; transform-origin:center; }
.intro-memo-overlay .fx-breathe { animation:imBreathe 6s ease-in-out infinite; transform-origin:center; }
.intro-memo-overlay .fx-bob { animation:imBob 8s ease-in-out infinite; }
.intro-memo-overlay .fx-sway { animation:imSway 9s ease-in-out infinite; transform-origin:50% 0; }
.intro-memo-overlay .fx-rain { animation:imRain 13s linear infinite alternate; }

/* Phase 1 : le coffre */
.im-chest { position:absolute; inset:0; z-index:8;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px;
  background:radial-gradient(90% 70% at 50% 60%, #140e22 0%, #05030a 75%); transition:opacity .6s ease; }
.im-chest.hidden { opacity:0; pointer-events:none; }
.im-chest-wrap { position:relative; cursor:pointer; }
.im-chest-wrap img { width:clamp(150px,38vmin,260px); image-rendering:pixelated; display:block;
  filter:drop-shadow(0 18px 32px rgba(0,0,0,.7)); }
.im-chest-glow { position:absolute; inset:-30%; border-radius:50%; pointer-events:none;
  background:radial-gradient(circle, rgba(240,196,99,.22), transparent 65%);
  animation:imPulse 3.6s ease-in-out infinite; }
.im-key-row { display:flex; align-items:center; gap:10px;
  font-family:"JetBrains Mono",monospace; font-size:13px; letter-spacing:.22em;
  text-transform:uppercase; color:#f0c463; }
.im-key-row img { width:30px; image-rendering:pixelated; }
.im-chest-hint { font-size:clamp(17px,2.4vmin,21px); font-style:italic; color:#8c8470;
  animation:imPulse 2.8s ease-in-out infinite; text-align:center; padding:0 20px; }
.im-chest.shaking .im-chest-wrap { animation:imShake .65s ease; }
@keyframes imShake {
  0%,100%{transform:translateX(0) rotate(0)}
  20%{transform:translateX(-7px) rotate(-2deg)}
  40%{transform:translateX(7px) rotate(2deg)}
  60%{transform:translateX(-5px) rotate(-1.4deg)}
  80%{transform:translateX(5px) rotate(1deg)}
}
.im-burst { position:absolute; inset:0; z-index:9; pointer-events:none; opacity:0;
  background:radial-gradient(circle at 50% 58%, #fff6d8 0%, rgba(240,196,99,.85) 22%, rgba(179,157,219,.5) 45%, transparent 70%); }
.im-burst.go { animation:imBurst 1.1s ease-out forwards; }
@keyframes imBurst { 0%{opacity:0;transform:scale(.3)} 18%{opacity:1} 100%{opacity:0;transform:scale(1.6)} }

/* Titre du tableau */
.im-scene-title { position:absolute; top:calc(env(safe-area-inset-top,0px) + 16px); left:0; right:0;
  z-index:18; text-align:center; pointer-events:none;
  opacity:0; transform:translateY(-8px); transition:.7s ease; }
.im-scene-title.show { opacity:1; transform:none; }
.im-scene-title .num { font-family:"JetBrains Mono",monospace; font-size:11px;
  letter-spacing:.4em; color:#d4a13a; opacity:.85; }
.im-scene-title .t { font-family:"Cinzel",serif; font-weight:600;
  font-size:clamp(20px,3.6vmin,34px); color:#fbe9b0;
  text-shadow:0 2px 14px rgba(240,196,99,.3), 0 1px 2px #000; margin-top:4px; }

/* Mémo + dialogue */
.im-dlg { position:absolute; left:0; right:0; bottom:0; z-index:20;
  display:flex; align-items:flex-end; gap:clamp(8px,1.6vw,16px);
  padding:0 max(14px,env(safe-area-inset-left)) calc(env(safe-area-inset-bottom,0px) + clamp(14px,3vmin,30px)) max(14px,env(safe-area-inset-left));
  max-width:860px; margin:0 auto; cursor:pointer; transition:opacity .6s ease; }
.im-dlg.hidden { opacity:0; pointer-events:none; }
.im-memo-sprite { flex-shrink:0; width:clamp(96px,17vmin,160px); position:relative;
  margin-bottom:-6px; display:flex; align-items:flex-end; justify-content:center; min-height:96px; }
.im-memo-sprite img { width:100%; display:block;
  filter:drop-shadow(0 0 22px rgba(150,130,255,.5));
  animation:imBob 4s ease-in-out infinite; }
.im-memo-sprite .memo-emoji-im { font-size:clamp(72px,14vmin,128px); line-height:1;
  filter:drop-shadow(0 0 22px rgba(150,130,255,.55));
  animation:imBob 4s ease-in-out infinite; display:inline-block; }
.im-box { flex:1; background:linear-gradient(160deg, rgba(28,21,48,.94), rgba(15,10,28,.96));
  border:1px solid #4a3a6e; border-radius:16px 16px 16px 5px;
  padding:clamp(11px,1.8vmin,16px) clamp(13px,2vmin,20px);
  backdrop-filter:blur(6px); box-shadow:0 10px 34px rgba(0,0,0,.5); }
.im-speaker { font-family:"JetBrains Mono",monospace; font-size:11px; letter-spacing:.24em;
  text-transform:uppercase; color:#b39ddb; margin-bottom:6px; }
.im-line { font-size:clamp(16px,2.5vmin,21px); line-height:1.5; color:#faf2dd; min-height:2.9em; }
.im-tap-hint { margin-top:6px; font-family:"JetBrains Mono",monospace; font-size:10px;
  letter-spacing:.18em; text-transform:uppercase; color:#6a5f88; text-align:right;
  animation:imPulse 2.6s ease-in-out infinite; }
.im-dlg.pop .im-box { animation:imBoxPop .3s ease; }
@keyframes imBoxPop { from{transform:translateY(8px);opacity:.4} }

/* Contrôles */
.im-skip { position:absolute; top:calc(env(safe-area-inset-top,0px) + 14px);
  right:max(14px,env(safe-area-inset-right)); z-index:30;
  font-family:"JetBrains Mono",monospace; font-size:12px; letter-spacing:.18em; text-transform:uppercase;
  color:#8c8470; background:rgba(15,10,28,.55); border:1px solid rgba(74,58,110,.6);
  border-radius:999px; padding:11px 18px; cursor:pointer; min-height:44px; transition:.2s; }
.im-skip:hover { color:#f0c463; border-color:#d4a13a; }
.im-skip.hidden { opacity:0; pointer-events:none; }
.im-back { position:absolute; left:max(14px,env(safe-area-inset-left));
  top:calc(env(safe-area-inset-top,0px) + 14px); z-index:30; width:44px; height:44px;
  border-radius:50%; background:rgba(15,10,28,.55); border:1px solid rgba(74,58,110,.6);
  color:#8c8470; font-size:19px; cursor:pointer; transition:.2s;
  display:flex; align-items:center; justify-content:center; }
.im-back:hover { color:#f0c463; }
.im-back.hidden { opacity:0; pointer-events:none; }
.im-begin { position:absolute; left:50%; bottom:calc(env(safe-area-inset-bottom,0px) + 120px);
  transform:translateX(-50%); z-index:32; display:none;
  font-family:"Cinzel",serif; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
  font-size:clamp(14px,2.2vmin,17px); color:#2a1a08; padding:15px 34px;
  border:none; border-radius:10px; cursor:pointer; min-height:48px;
  background:linear-gradient(180deg, #f5c970, #d4a13a 55%, #a07424);
  box-shadow:inset 0 1px 0 rgba(255,240,200,.6), 0 6px 22px rgba(0,0,0,.5), 0 0 0 1px #5e4318; }
.im-begin.show { display:block; animation:imRise .7s ease both; }
@keyframes imRise {
  from { opacity:0; transform:translate(-50%,16px) }
  to { opacity:1; transform:translateX(-50%) }
}
/* Dernière réplique : on remonte le dialogue pour libérer la place du bouton */
.intro-memo-overlay.is-last .im-dlg { transform:translateY(-72px); transition:transform .5s ease; }
@media (prefers-reduced-motion:reduce) {
  .intro-memo-overlay *, .intro-memo-overlay *::before, .intro-memo-overlay *::after {
    animation:none !important; transition:none !important;
  }
}
`;

// Le récit de Mémo. Voix alignée avec mascot.js : phrases courtes,
// ponctuation parlée, pas de tirets cadratins.
const SCRIPT = [
  { // 0. Juste après l'ouverture du coffre, encore en intérieur
    scene: null,
    lines: [
      { t: "Oh. De l'air. Enfin.", s: 'surprised' },
      { t: "C'est toi qui m'as ouvert ? Toi ?", s: 'surprised' },
      { t: "Bon. J'imagine que je te dois quelque chose. Je m'appelle... attends, ça va me revenir.", s: 'idle' },
      { t: "Appelle-moi Mémo. C'est ce qui reste.", s: 'speak' },
      { t: "Avant que tu poses la question. Oui, je vivais dans ce coffre. Et non, ce n'est pas triste. Écoute plutôt.", s: 'point' },
    ],
  },
  { // 1. L'Oubli
    scene: 0,
    lines: [
      { t: "Le monde n'a pas brûlé. Personne ne l'a conquis. Il a été oublié.", s: 'speak' },
      { t: "Une lente érasure, depuis les bords. Les choses s'effaçaient. Jusqu'à n'avoir jamais existé.", s: 'sad' },
      { t: "Je le sais parce que j'y étais. Enfin, je crois. C'est flou.", s: 'idle' },
    ],
  },
  { // 2. Les Reliquaires
    scene: 1,
    lines: [
      { t: "Les Anciens n'ont pas pu l'arrêter. Alors ils ont choisi d'être retenus.", s: 'speak' },
      { t: "Ils ont tout scellé. Leurs œuvres, leurs noms, leurs âmes. Dans des reliquaires. Des coffres, si tu préfères.", s: 'point' },
      { t: "J'étais dans l'un d'eux. Tu viens de le vider. Merci, au passage.", s: 'idle' },
    ],
  },
  { // 3. L'Abîme
    scene: 2,
    lines: [
      { t: "Ensuite, tout a sombré. Strate après strate.", s: 'fly' },
      { t: "L'Abîme n'est pas un gouffre. C'est le monde enseveli, qui attend qu'on s'en souvienne.", s: 'speak' },
      { t: "Il y a des choses qui veillent en bas. On en reparlera. Pas maintenant.", s: 'sad' },
    ],
  },
  { // 4. Le dernier Porte-Clé
    scene: 3,
    lines: [
      { t: "Et puis il y a toi.", s: 'point' },
      { t: "Tu es le dernier à porter les clés. Chaque coffre que tu ouvres rend au jour un fragment du monde perdu.", s: 'speak' },
      { t: "Pas de pression, hein.", s: 'idle' },
    ],
  },
  { // 5. Ce que la surface se rappelle
    scene: 4,
    lines: [
      { t: "Ce que tu remontes, tu le reforges. Et la surface s'en souvient.", s: 'speak' },
      { t: "Pierre après pierre, le monde renaît derrière toi. Un village d'abord. Puis qui sait.", s: 'fly' },
    ],
  },
  { // 6. Le Cycle
    scene: 5,
    lines: [
      { t: "Je dois être honnête. L'Oubli efface plus vite qu'une seule vie ne sauve.", s: 'sad' },
      { t: "Quand tu tombes, l'Abîme efface tes pas. Il ne te laisse que ce que tu es devenu.", s: 'speak' },
      { t: "Ton savoir. Ton équipement. Toi. Le reste, il le reprend. C'est le Cycle.", s: 'idle' },
    ],
  },
  { // 7. Le Dévoreur
    scene: 6,
    lines: [
      { t: "Et tout au fond, il y a... lui.", s: 'surprised' },
      { t: "L'Oubli fait chair. Le Dévoreur. Tant qu'il respire, le monde s'efface.", s: 'sad' },
      { t: "Descends. Souviens-toi. Et rends-lui le jour.", s: 'point' },
      { t: "Allez. Je passe devant. C'est toi qui portes les clés, mais c'est moi qui connais le chemin. Enfin, à peu près.", s: 'fly' },
    ],
  },
];

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

// Précharge les planches en arrière-plan dès que l'intro démarre. Sur mobile
// (3G/4G), chaque PNG fait ~1 Mo ; en lançant la précharge pendant la phase
// coffre, les premières scènes sont déjà en cache au moment de la transition.
let preloaded = false;
function preloadCinematic() {
  if (preloaded) return;
  preloaded = true;
  // On extrait les URLs `assets/cinematic/scene*.png` depuis le SVG des layers.
  const urls = new Set();
  for (const scene of CINEMATIC_SCENES) {
    for (const layer of scene.layers) {
      const matches = (layer.svg || '').match(/assets\/cinematic\/[a-z0-9_-]+\.png/gi) || [];
      matches.forEach(u => urls.add(u));
    }
  }
  // On lance les chargements en série pour ne pas saturer la bande mobile.
  const list = [...urls];
  let i = 0;
  const next = () => {
    if (i >= list.length) return;
    const img = new Image();
    img.onload = img.onerror = () => { i++; next(); };
    img.src = list[i];
  };
  next();
}

// Sprite Mémo avec fallback emoji (mêmes règles que mascotUI).
function memoIntroSprite(key) {
  const src = MASCOT_SPRITES[key] || MASCOT_SPRITES.idle;
  const emoji = `<span class="memo-emoji-im">${MASCOT_EMOJI[key] || '🔮'}</span>`;
  return spriteImg(src, emoji, { size: null, title: 'Mémo' });
}

// API publique. onDone est appelé avec true si "Entrer dans l'Abîme",
// false si skip ou Escape avant la fin.
export function startMemoIntro({ onDone, replay = false } = {}) {
  injectCss();
  preloadCinematic();
  const root = document.createElement('div');
  root.className = 'intro-memo-overlay';
  root.innerHTML = `
    <div class="im-camera" id="im-camera"></div>
    <div class="im-shade"></div>
    <div class="im-chest" id="im-chest">
      <div class="im-key-row">
        <img src="assets/treasures/cle.png" alt="🗝" width="30" height="30">
        <span>1 clé</span>
      </div>
      <div class="im-chest-wrap" id="im-chest-wrap">
        <div class="im-chest-glow"></div>
        <img src="assets/chests/t1_bois.png" alt="Coffre" class="im-chest-img">
      </div>
      <div class="im-chest-hint">Touche le coffre pour l'ouvrir</div>
    </div>
    <div class="im-burst" id="im-burst"></div>
    <div class="im-scene-title" id="im-scene-title"><div class="num"></div><div class="t"></div></div>
    <div class="im-dlg hidden" id="im-dlg">
      <div class="im-memo-sprite" id="im-memo-sprite"></div>
      <div class="im-box">
        <div class="im-speaker">Mémo</div>
        <div class="im-line" id="im-line"></div>
        <div class="im-tap-hint" id="im-tap-hint">toucher pour continuer</div>
      </div>
    </div>
    <button class="im-back hidden" id="im-back" aria-label="Précédent">‹</button>
    <button class="im-skip hidden" id="im-skip">Passer ▸</button>
    <button class="im-begin" id="im-begin">${replay ? 'Refermer' : "Entrer dans l'Abîme"}</button>
  `;
  document.body.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const camera = $('#im-camera');
  const chestEl = $('#im-chest');
  const burst = $('#im-burst');
  const dlg = $('#im-dlg');
  const memoSlot = $('#im-memo-sprite');
  const lineEl = $('#im-line');
  const tapHint = $('#im-tap-hint');
  const sceneTitle = $('#im-scene-title');
  const titleNum = sceneTitle.querySelector('.num');
  const titleT = sceneTitle.querySelector('.t');
  const skipBtn = $('#im-skip');
  const backBtn = $('#im-back');
  const beginBtn = $('#im-begin');

  // Mode replay : on saute la phase coffre.
  let phase = replay ? 'dialogue' : 'chest';
  let chap = replay ? 1 : 0;
  let li = 0;
  let busy = false;
  let done = false;

  function renderScene(idx) {
    const s = CINEMATIC_SCENES[idx];
    camera.className = 'im-camera';
    camera.innerHTML = s.layers.map(l =>
      `<div class="im-layer" data-depth="${l.depth || 0}" style="z-index:${l.z || 0}">${l.svg}</div>`).join('');
    void camera.offsetWidth;
    camera.classList.add('zoom');
  }

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function showTitle(sceneIdx) {
    if (sceneIdx == null) { sceneTitle.classList.remove('show'); return; }
    titleNum.textContent = ROMAN[sceneIdx] + ' · ' + CINEMATIC_SCENES.length;
    titleT.textContent = CINEMATIC_SCENES[sceneIdx].title;
    sceneTitle.classList.add('show');
  }

  function showLine() {
    const c = SCRIPT[chap];
    const l = c.lines[li];
    memoSlot.innerHTML = memoIntroSprite(l.s);
    lineEl.textContent = l.t;
    const last = chap === SCRIPT.length - 1 && li === c.lines.length - 1;
    tapHint.textContent = last ? '' : 'toucher pour continuer';
    dlg.classList.remove('pop');
    void dlg.offsetWidth;
    dlg.classList.add('pop');
    if (last) { beginBtn.classList.add('show'); root.classList.add('is-last'); }
    else { beginBtn.classList.remove('show'); root.classList.remove('is-last'); }
  }

  function goChapter(n, dir) {
    if (n < 0 || n >= SCRIPT.length) return;
    busy = true;
    camera.classList.add('swap');
    beginBtn.classList.remove('show');
    setTimeout(() => {
      chap = n; li = 0;
      const c = SCRIPT[chap];
      if (c.scene != null) { chestEl.classList.add('hidden'); renderScene(c.scene); }
      showTitle(c.scene);
      camera.classList.remove('swap');
      showLine();
      busy = false;
    }, 700);
  }

  function advance() {
    if (busy || phase !== 'dialogue') return;
    const c = SCRIPT[chap];
    if (li < c.lines.length - 1) { li++; showLine(); }
    else if (chap < SCRIPT.length - 1) goChapter(chap + 1);
    // dernier chapitre, dernière ligne : bouton "Entrer dans l'Abîme" déjà visible
  }
  function goBack() {
    if (busy || phase !== 'dialogue') return;
    if (li > 0) { li--; showLine(); }
    else if (chap > (replay ? 1 : 0)) goChapter(chap - 1, 'back');
  }

  // Phase 1 : le coffre
  let opened = false;
  function openChestPhase() {
    if (opened) return;
    opened = true;
    chestEl.classList.add('shaking');
    setTimeout(() => {
      burst.classList.add('go');
      setTimeout(() => {
        phase = 'dialogue';
        dlg.classList.remove('hidden');
        skipBtn.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        showLine();
      }, 480);
    }, 520);
  }

  // Listeners
  const onChestClick = () => openChestPhase();
  const chestWrap = $('#im-chest-wrap');
  if (chestWrap) chestWrap.addEventListener('click', onChestClick);

  dlg.addEventListener('click', advance);
  root.addEventListener('click', (e) => {
    if (phase !== 'dialogue') return;
    if (e.target.closest('.im-dlg, .im-skip, .im-back, .im-begin, .im-chest-wrap')) return;
    advance();
  });
  backBtn.addEventListener('click', (e) => { e.stopPropagation(); goBack(); });
  skipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (phase !== 'dialogue') return;
    goChapter(SCRIPT.length - 1);
    setTimeout(() => { li = SCRIPT[SCRIPT.length - 1].lines.length - 1; showLine(); }, 750);
  });
  beginBtn.addEventListener('click', () => finish(true));

  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') advance();
    else if (e.key === 'ArrowLeft') goBack();
    else if (e.key === 'Escape') finish(false);
  }
  document.addEventListener('keydown', onKey);

  // Parallaxe souris + touch
  let px = 0, py = 0, tx = 0, ty = 0;
  function setTarget(nx, ny) { tx = nx; ty = ny; }
  root.addEventListener('mousemove', (e) => {
    setTarget(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  });
  root.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    setTarget((t.clientX / innerWidth - 0.5) * 0.7, (t.clientY / innerHeight - 0.5) * 0.7);
  }, { passive: true });
  let raf = 0;
  function loop() {
    if (done) return;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    const MAX = 26;
    camera.querySelectorAll('.im-layer').forEach(l => {
      const d = (parseFloat(l.dataset.depth) || 0) / 28;
      l.style.transform = `translate(${-px * d * MAX}px, ${-py * d * MAX * 0.6}px) scale(1.12)`;
    });
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  function finish(confirmed) {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    root.style.transition = 'opacity .5s ease';
    root.style.opacity = '0';
    setTimeout(() => {
      root.remove();
      if (typeof onDone === 'function') onDone(confirmed);
    }, 480);
  }

  // Si mode replay, on saute directement aux tableaux
  if (replay) {
    chestEl.classList.add('hidden');
    dlg.classList.remove('hidden');
    skipBtn.classList.remove('hidden');
    backBtn.classList.remove('hidden');
    const c = SCRIPT[chap];
    if (c.scene != null) { renderScene(c.scene); showTitle(c.scene); }
    showLine();
  }
}
