// Sprite registry — maps game entities (monsters, bosses, chests, orbs) to
// PNG asset paths. Each lookup returns a path; if the file is missing on
// disk, the consumer's <img onerror> fallback kicks back to the legacy
// emoji / procedural SVG.
//
// Convention (mirrors assets/INTEGRATION.md):
//   assets/monsters/<id>.png       (small, ~64×64 — for HUD / cards)
//   assets/monsters/<id>-hires.png (large, ~500-900px — for combat panel)
//
// Use hasAsset() to probe at runtime; we cache results so we only fail once
// per missing asset.

const _assetCache = new Map();   // url → 'ok' | 'missing'

// Synchronous accessor for cached result. Returns undefined if unknown.
export function assetState(url) { return _assetCache.get(url); }

// Mark + start probing if unknown. Caller can keep rendering the fallback
// while the probe runs and re-render when it resolves.
function probeAssetAsync(url, onResolve) {
  if (_assetCache.has(url)) return;
  _assetCache.set(url, 'probing');
  const img = new Image();
  img.onload  = () => { _assetCache.set(url, 'ok');      onResolve?.(true); };
  img.onerror = () => { _assetCache.set(url, 'missing'); onResolve?.(false); };
  img.src = url;
}

export function probeAsset(url) {
  if (_assetCache.get(url) === 'ok') return Promise.resolve(true);
  if (_assetCache.get(url) === 'missing') return Promise.resolve(false);
  return new Promise(resolve => probeAssetAsync(url, resolve));
}

// === Monsters (25 entries) ===
export const MONSTER_SPRITE = {
  // Forêt
  'Gobelin':'gobelin', 'Loup':'loup', 'Araignée':'araignee', 'Ours':'ours', 'Plante carnivore':'plante',
  // Cavernes
  'Chauve-souris':'chauvesouris', 'Squelette':'squelette', 'Slime':'slime', 'Troll':'troll', 'Golem de pierre':'golem',
  // Château
  'Zombie':'zombie', 'Bandit':'bandit', 'Spectre':'spectre', 'Garde Maudit':'garde', 'Sorcier':'sorcier',
  // Enfer
  'Diablotin':'diablotin', 'Démonette':'demonette', 'Cerbère':'cerbere', 'Incube':'incube', 'Démon de Lave':'lave',
  // Néant
  'Ombre':'ombre', 'Horreur':'horreur', 'Wraith':'wraith', 'Tentacule':'tentacule', 'Vide-marcheur':'videmarcheur',
};

export function monsterSpriteSrc(name, { hires = false } = {}) {
  const id = MONSTER_SPRITE[name];
  if (!id) return null;
  return `assets/monsters/${id}${hires ? '-hires' : ''}.png`;
}

// === Bosses (5 entries) ===
export const BOSS_SPRITE = {
  'Roi Sylvain':'roi_sylvain',
  'Hydre des Profondeurs':'hydre',
  'Roi Mort':'roi_mort',
  'Seigneur Démon':'seigneur_demon',
  'Maître du Néant':'maitre_neant',
};

export function bossSpriteSrcByName(name, { hires = false } = {}) {
  const id = BOSS_SPRITE[name];
  if (!id) return null;
  return `assets/bosses/${id}${hires ? '-hires' : ''}.png`;
}

// === Chests (10 tiers) ===
const CHEST_NAME_BY_TIER = ['', 'bois', 'fer', 'or', 'mythique', 'ancestral', 'stellaire', 'cosmique', 'vide', 'primordial', 'divin'];
export function chestSpriteSrc(tier, { hires = false } = {}) {
  if (tier < 1 || tier > 10) return null;
  return `assets/chests/t${tier}_${CHEST_NAME_BY_TIER[tier]}${hires ? '-hires' : ''}.png`;
}
export function mimicSpriteSrc({ golden = false, hires = false } = {}) {
  const id = golden ? 'mimic_gold' : 'mimic';
  return `assets/chests/${id}${hires ? '-hires' : ''}.png`;
}

// === Orbs (9 forge currencies) ===
// IDs match CURRENCY_TYPES from data.js
export function orbSpriteSrc(id, { hires = false } = {}) {
  if (!id) return null;
  return `assets/orbs/${id}${hires ? '-hires' : ''}.png`;
}

// === Treasures (cle, crystal) ===
export function treasureSpriteSrc(id, { hires = false } = {}) {
  if (!id) return null;
  return `assets/treasures/${id}${hires ? '-hires' : ''}.png`;
}

// === <img> renderer with auto-fallback ===
// Renders an <img> that swaps to the fallback HTML when the PNG fails to load.
// Use this everywhere you want PNG-when-available, emoji/SVG otherwise.
//
//   spriteImg('assets/monsters/gobelin.png', '👺', { size: 96, title: 'Gobelin' })
//   → <img src="..." onerror="..." class="pixel-sprite" width="96" alt="Gobelin">
//   → on error, the parent's textContent becomes the fallback emoji.
// Callback fired once when the cache transitions from 'probing' to a
// terminal state. UI uses it to schedule a single re-render so newly
// confirmed sprites swap in (vs flashing on every render).
let _onProbeResolved = null;
export function onAssetProbed(cb) { _onProbeResolved = cb; }

export function spriteImg(src, fallbackHTML, { size = null, title = '', extraClass = '' } = {}) {
  if (!src) return fallbackHTML;
  const state = _assetCache.get(src);
  // Known missing → render the fallback directly. No flicker, no network.
  if (state === 'missing') return fallbackHTML;
  // Unknown → start probing in the background, render fallback for now.
  // When the probe resolves to 'ok', the global hook triggers a re-render
  // and the next pass will hit the 'ok' branch below.
  if (state === undefined) {
    probeAssetAsync(src, (ok) => {
      if (ok && _onProbeResolved) _onProbeResolved(src);
    });
    return fallbackHTML;
  }
  // 'probing' (in flight) → keep showing the fallback
  if (state === 'probing') return fallbackHTML;
  // 'ok' → safe to render the <img>
  const sizeAttr = size ? ` width="${size}" height="${size}"` : '';
  const cls = `pixel-sprite${extraClass ? ' ' + extraClass : ''}`;
  return `<img src="${src}" alt="${title}" title="${title}" class="${cls}"${sizeAttr}>`;
}

// === Debug helper: expose a live audit of every known sprite URL ===
// Usage from devtools: window.spriteAudit()
// Prints a console table grouped by category with status (ok / missing / probing).
// Triggers probes for unknown URLs so a 2nd call gives definitive results.
export function spriteAudit() {
  // Lazy-imported so this module stays self-contained at the top of the file.
  return import('./data.js').then(d => {
    const rows = [];
    const push = (category, label, url) => {
      if (!url) return;
      let status = _assetCache.get(url) || 'unknown';
      if (status === 'unknown') probeAssetAsync(url);
      rows.push({ category, label, url, status });
    };
    for (const b of d.BIOMES) {
      for (const m of b.monsters) push('monster', m.name, monsterSpriteSrc(m.name, { hires: true }));
      push('boss', b.boss.name, bossSpriteSrcByName(b.boss.name, { hires: true }));
    }
    for (const t of d.CHEST_TIERS) push('chest', `T${t.tier} ${t.name}`, chestSpriteSrc(t.tier, { hires: true }));
    push('chest', 'Mimic',       mimicSpriteSrc({ hires: true }));
    push('chest', 'Mimic doré',  mimicSpriteSrc({ golden: true, hires: true }));
    for (const c of d.CURRENCY_TYPES) push('orb', c.id, orbSpriteSrc(c.id, { hires: true }));
    push('treasure', 'cle',     treasureSpriteSrc('cle',     { hires: true }));
    push('treasure', 'crystal', treasureSpriteSrc('crystal', { hires: true }));
    console.table(rows);
    const counts = rows.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
    console.log('%cTotal:', 'font-weight:bold', counts);
    console.log('%cReprends la commande dans 2 secondes pour avoir les résultats finaux (les "unknown" / "probing" auront résolu).', 'color:#aaa');
    return rows;
  });
}

// Expose on window so non-developers can call it from devtools without an import.
if (typeof window !== 'undefined') window.spriteAudit = spriteAudit;
