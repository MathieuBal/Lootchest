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

export function probeAsset(url) {
  if (_assetCache.get(url) === 'ok') return Promise.resolve(true);
  if (_assetCache.get(url) === 'missing') return Promise.resolve(false);
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => { _assetCache.set(url, 'ok'); resolve(true); };
    img.onerror = () => { _assetCache.set(url, 'missing'); resolve(false); };
    img.src = url;
  });
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
export function spriteImg(src, fallbackHTML, { size = null, title = '', extraClass = '' } = {}) {
  if (!src) return fallbackHTML;
  const sizeAttr = size ? ` width="${size}" height="${size}"` : '';
  const cls = `pixel-sprite${extraClass ? ' ' + extraClass : ''}`;
  // The onerror handler replaces THIS img with the fallback markup.
  // We escape the fallback for safe attribute injection.
  const esc = fallbackHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<img src="${src}" alt="${title}" title="${title}" class="${cls}"${sizeAttr} onerror="this.outerHTML='${esc}'">`;
}
