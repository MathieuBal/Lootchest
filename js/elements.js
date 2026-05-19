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

import { RARITY_BY_ID } from './data.js';

// `none` is by far the most common — keeps elemental items special.
// `minChestTier` gates rare elements so they don't appear early.
export const ELEMENTS = {
  none: {
    id: 'none', name: 'Aucun', adjective: '',
    weight: 60, minChestTier: 1,
    statBias: {},
    tags: [],
  },
  fire: {
    id: 'fire', name: 'Feu', adjective: 'Ardente',
    weight: 14, minChestTier: 1,
    statBias: { fireDmg: [4, 12] },
    tags: ['fire', 'burning'],
  },
  frost: {
    id: 'frost', name: 'Givre', adjective: 'Givrée',
    weight: 12, minChestTier: 2,
    statBias: { frostDmg: [4, 12], speed: [1, 3] },
    tags: ['frost', 'slow'],
  },
  poison: {
    id: 'poison', name: 'Poison', adjective: 'Vénéneuse',
    weight: 10, minChestTier: 2,
    statBias: { poisonDmg: [5, 12] },
    tags: ['poison', 'organic'],
  },
  lightning: {
    id: 'lightning', name: 'Foudre', adjective: 'Foudroyante',
    weight: 6, minChestTier: 3,
    statBias: { lightningDmg: [5, 14], crit: [2, 4] },
    tags: ['lightning', 'fast'],
  },
  void: {
    id: 'void', name: 'Néant', adjective: 'du Néant',
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
 * Pick an element appropriate for the item's chestTier × rarity. Rare items
 * are biased slightly toward rarer elements (lower weights).
 */
export function rollElement(chestTier, rarity = 'common') {
  const pool = ELEMENT_LIST.filter(e => chestTier >= (e.minChestTier || 1));
  if (pool.length === 0) return ELEMENTS.none;
  const rarityBoost = (RARITY_BY_ID[rarity]?.statMult || 1) - 1;
  const weighted = pool.map(e => ({
    ...e,
    // Boost rare elements (low weight) on high-rarity items.
    // Never boost 'none' though — high-rarity items SHOULD have an element.
    weight: e.id === 'none'
      ? Math.max(5, e.weight - rarityBoost * 20)  // shrink 'none' weight at rare+
      : e.weight + rarityBoost * (15 - Math.min(15, e.weight)),
  }));
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
    stats[stat] = Math.max(1, Math.round((min + t * (max - min)) * chestTier * statMult));
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
