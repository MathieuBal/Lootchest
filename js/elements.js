// Elements — third identity layer of a procedural item.
// An element is OPTIONAL (most items roll 'none'). When present it grants
// a small elemental damage bonus, pushes a statSource entry, and adds an
// adjective to the item name ("Lame Givrée", "Hache Vénéneuse").
//
// Mechanics: every elemental damage (fire, frost, void, poison, lightning)
// stacks identically as a % damage bonus in combat.js. Distinct elements
// exist for build diversity and visual signature (visual overlay = phase 4b).
//
// Same explainability contract as parts and materials.

import { RARITY_BY_ID, tierScale } from './data.js';

// `none` is by far the most common — keeps elemental items special.
// `minChestTier` gates rare elements so they don't appear early.
export const ELEMENTS = {
  none: {
    id: 'none', name: 'Aucun', adjective: '', icon: '', glowColor: null,
    weight: 60, minChestTier: 1,
    statBias: {},
    tags: [],
  },
  fire: {
    id: 'fire', name: 'Feu', adjective: { m: 'Ardent', f: 'Ardente' }, icon: '🔥', glowColor: '#ff7a30',
    weight: 14, minChestTier: 1,
    statBias: { fireDmg: [4, 12] },
    tags: ['fire', 'burning'],
  },
  frost: {
    id: 'frost', name: 'Givre', adjective: { m: 'Givré', f: 'Givrée' }, icon: '❄', glowColor: '#7adcff',
    weight: 12, minChestTier: 2,
    statBias: { frostDmg: [4, 12], speed: [1, 3] },
    tags: ['frost', 'slow'],
  },
  poison: {
    id: 'poison', name: 'Poison', adjective: { m: 'Vénéneux', f: 'Vénéneuse' }, icon: '☠', glowColor: '#5ad858',
    weight: 10, minChestTier: 2,
    statBias: { poisonDmg: [5, 12] },
    tags: ['poison', 'organic'],
  },
  lightning: {
    id: 'lightning', name: 'Foudre', adjective: { m: 'Foudroyant', f: 'Foudroyante' }, icon: '⚡', glowColor: '#ffe14a',
    weight: 6, minChestTier: 3,
    statBias: { lightningDmg: [5, 14], crit: [2, 4] },
    tags: ['lightning', 'fast'],
  },
  void: {
    id: 'void', name: 'Néant', adjective: 'du Néant', icon: '🌌', glowColor: '#a058ff',
    weight: 3, minChestTier: 4,
    statBias: { voidDmg: [6, 16], crit: [3, 7] },
    tags: ['void', 'rare'],
  },
};

const ELEMENT_LIST = Object.values(ELEMENTS);

function pickWeighted(list) {
  const total = list.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of list) {
    r -= (m.weight || 1);
    if (r <= 0) return m;
  }
  return list[list.length - 1];
}

/**
 * Pick an element appropriate for the item's chestTier × rarity.
 * If `faction.elementTags` is provided, elements sharing any of those tags
 * get a heavy weight boost (×4) so factions push toward their theme element.
 */
export function rollElement(chestTier, rarity = 'common', faction = null) {
  const pool = ELEMENT_LIST.filter(e => chestTier >= (e.minChestTier || 1));
  if (pool.length === 0) return ELEMENTS.none;
  const rarityBoost = (RARITY_BY_ID[rarity]?.statMult || 1) - 1;
  const factionTags = new Set(faction?.elementTags || []);
  const weighted = pool.map(e => {
    let w = e.id === 'none'
      ? Math.max(5, e.weight - rarityBoost * 20)
      : e.weight + rarityBoost * (15 - Math.min(15, e.weight));
    // Faction coherence: 4× weight when element tags match (also shrinks 'none').
    if (factionTags.size > 0 && e.tags.some(t => factionTags.has(t))) w *= 4;
    if (factionTags.size > 0 && e.id === 'none') w = Math.max(2, w * 0.3);
    return { ...e, weight: w };
  });
  return pickWeighted(weighted);
}

/**
 * Roll concrete stats for an element. Same d20-based formula as parts/materials.
 */
export function rollElementStats(element, chestTier, statMult) {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const t = (d20 - 1) / 19;
  const stats = {};
  for (const [stat, [min, max]] of Object.entries(element.statBias || {})) {
    stats[stat] = Math.max(1, Math.round((min + t * (max - min)) * tierScale(chestTier) * statMult));
  }
  return { stats, quality: t, d20 };
}

export function elementStatSource(element, rolled) {
  return {
    sourceType: 'element',
    sourceId: element.id,
    label: element.name,
    stats: rolled.stats,
    quality: rolled.quality,
  };
}

export function mergeElementStats(baseStats, elementStats) {
  for (const [k, v] of Object.entries(elementStats || {})) {
    baseStats[k] = (baseStats[k] || 0) + v;
  }
}

// === Element overlay sprites (phase 4D) ===
// Sparse 16×16 layouts painted ON TOP of the composed weapon sprite so the
// element's signature is visually present on the item — embers along a fire
// blade, frost crystals on a frost axe, etc. Most pixels are transparent.
//
// Palettes follow the 4-step ramp (dark → mid → light → glow) from the
// art-pack spec so overlays read clearly without overwhelming the base.

const ELEMENT_OVERLAY_PALETTES = {
  fire:      { d: '#7a1a08', m: '#ff6728', l: '#ffb347', g: '#fff0a8' },
  frost:     { d: '#145070', m: '#54cfff', l: '#b8f4ff', g: '#ffffff' },
  poison:    { d: '#174f18', m: '#4bc84a', l: '#a8ff6a', g: '#eaffc8' },
  lightning: { d: '#8a6400', m: '#ffd33d', l: '#fff08a', g: '#ffffff' },
  void:      { d: '#210840', m: '#6d34d7', l: '#a66cff', g: '#f0ddff' },
};

// Per-weapon-type overlays. Each overlay is a 16×16 sparse layout that
// targets the typical "blade region" of that weapon family:
//   - sword/dagger: vertical blade centered cols 6-9, rows 0-10
//   - axe: head occupies upper third, cols 3-12, rows 0-7
//   - wand: head at top center, cols 6-9, rows 0-5
//   - bow: tips at top/bottom + middle grip
//
// Pixels at empty space simply don't render (no spurious dots floating).

const OVERLAY_SWORD_FIRE = [
  '.......g........',
  '......gmg.......',
  '......dmd.......',
  '.......d........',
  '......l.........',
  '......d.l.......',
  '.......d........',
  '......l.........',
  '.......d........',
  '......d.l.......',
  '.......d........',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_SWORD_FROST = [
  '......l.l.......',
  '.......g........',
  '......lml.......',
  '.....g..g.......',
  '.......d........',
  '......l.l.......',
  '.....g..g.......',
  '.......m........',
  '......l.l.......',
  '.......g........',
  '......d.d.......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_SWORD_POISON = [
  '................',
  '......m.m.......',
  '.......l........',
  '......l.l.......',
  '.......m........',
  '.....l...l......',
  '......m.m.......',
  '.......g........',
  '......d.d.......',
  '.......l........',
  '......m.m.......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_SWORD_LIGHTNING = [
  '.......g........',
  '......lml.......',
  '.......d........',
  '......l.........',
  '.......m........',
  '........l.......',
  '.......d........',
  '......m.........',
  '.......l........',
  '........d.......',
  '.......g........',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_SWORD_VOID = [
  '......l.l.......',
  '.......g........',
  '.....l.d.l......',
  '......dgd.......',
  '.......g........',
  '......dmd.......',
  '.......g........',
  '......dgd.......',
  '.....l.d.l......',
  '.......g........',
  '......l.l.......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_AXE_FIRE = [
  '....g...g.......',
  '...gmg.gmg......',
  '...dmd.dmd......',
  '....d...d.......',
  '....l...l.......',
  '....m...m.......',
  '.....d.d........',
  '......d.........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_AXE_FROST = [
  '....l...l.......',
  '...g.g.g.g......',
  '....l...l.......',
  '....m...m.......',
  '....d...d.......',
  '.....l.l........',
  '......g.........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_AXE_POISON = [
  '................',
  '....m...m.......',
  '...l.l.l.l......',
  '....m...m.......',
  '.....l.l........',
  '......d.........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_AXE_LIGHTNING = [
  '....g...g.......',
  '....l...l.......',
  '....d...d.......',
  '.....m.m........',
  '......l.........',
  '......d.........',
  '......g.........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_AXE_VOID = [
  '....l...l.......',
  '...g.g.g.g......',
  '....dgggd.......',
  '....mgggm.......',
  '....dgggd.......',
  '.....l.l........',
  '......g.........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_WAND_FIRE = [
  '......g.g.......',
  '.....gmgmg......',
  '......lml.......',
  '......dmd.......',
  '.......d........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_WAND_FROST = [
  '......l.l.......',
  '......glg.......',
  '.....l.g.l......',
  '......lml.......',
  '.......d........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_WAND_VOID = [
  '......l.l.......',
  '......dgd.......',
  '.....l.g.l......',
  '.....g.d.g......',
  '......dmd.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_WAND_LIGHTNING = [
  '......g.g.......',
  '......dld.......',
  '.....lgmgl......',
  '......dld.......',
  '......g.g.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const OVERLAY_WAND_POISON = [
  '......m.m.......',
  '.....l.g.l......',
  '......lml.......',
  '.......d........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// Registry: weapon baseTypeId → element id → { layout, palette }
const ELEMENT_OVERLAYS = {
  sword:  { fire: OVERLAY_SWORD_FIRE, frost: OVERLAY_SWORD_FROST, poison: OVERLAY_SWORD_POISON, lightning: OVERLAY_SWORD_LIGHTNING, void: OVERLAY_SWORD_VOID },
  dagger: { fire: OVERLAY_SWORD_FIRE, frost: OVERLAY_SWORD_FROST, poison: OVERLAY_SWORD_POISON, lightning: OVERLAY_SWORD_LIGHTNING, void: OVERLAY_SWORD_VOID },
  axe:    { fire: OVERLAY_AXE_FIRE,   frost: OVERLAY_AXE_FROST,   poison: OVERLAY_AXE_POISON,   lightning: OVERLAY_AXE_LIGHTNING,   void: OVERLAY_AXE_VOID   },
  wand:   { fire: OVERLAY_WAND_FIRE,  frost: OVERLAY_WAND_FROST,  poison: OVERLAY_WAND_POISON,  lightning: OVERLAY_WAND_LIGHTNING,  void: OVERLAY_WAND_VOID  },
  // Bow could share sword overlays if needed — leaving it for now since the
  // bow silhouette is sideways and the centered overlays would float in air.
};

/**
 * Return the overlay layer ({ layout, palette, kind, elementId }) for a
 * given weapon base type and element id, or null if no overlay applies.
 * The `kind: 'element-overlay'` flag lets the renderer wrap this layer in
 * a class-tagged SVG group so it can be animated independently (phase 4F).
 */
export function getElementOverlayLayer(weaponBaseTypeId, elementId) {
  if (!elementId || elementId === 'none') return null;
  const overlays = ELEMENT_OVERLAYS[weaponBaseTypeId];
  if (!overlays) return null;
  const layout = overlays[elementId];
  if (!layout) return null;
  const palette = ELEMENT_OVERLAY_PALETTES[elementId];
  if (!palette) return null;
  return { layout, palette, kind: 'element-overlay', elementId };
}
