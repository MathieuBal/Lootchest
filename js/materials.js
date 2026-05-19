// Materials — second identity layer (after parts) of a procedural item.
// A material lives alongside the parts: it pushes its own stat contribution
// into baseStats + statSources, may rename the item ("Hache en Obsidienne"),
// and (in a later phase) will retint palette codes tagged with its paletteRole.
//
// Combat consumes only `item.baseStats` — materials are 100% additive on top
// of part stats. Same explainability contract as `statSources`.

import { RARITY_BY_ID } from './data.js';

// `weight` is the base draw weight. `minChestTier` gates rare materials so
// they don't appear on tier-1 wood chests.
// `paletteRole` will drive the visual retint phase (3b) — not yet rendered.
export const MATERIALS = {
  iron: {
    id: 'iron', name: 'Fer', adjective: 'en Fer', icon: '⚙', tintColor: '#9090a8',
    weight: 30, minChestTier: 1,
    paletteRole: 'metal',
    statBias: { armor: [2, 5] },
    tags: ['metal', 'common'],
  },
  bronze: {
    id: 'bronze', name: 'Bronze', adjective: 'en Bronze', icon: '🔶', tintColor: '#c89020',
    weight: 20, minChestTier: 1,
    paletteRole: 'warmMetal',
    statBias: { goldFind: [3, 7] },
    tags: ['metal', 'common'],
  },
  bone: {
    id: 'bone', name: 'Os', adjective: 'en Os', icon: '🦴', tintColor: '#e8e0c8',
    weight: 14, minChestTier: 1,
    paletteRole: 'bone',
    statBias: { vitality: [3, 7], crit: [1, 3] },
    tags: ['organic', 'pale'],
  },
  steel: {
    id: 'steel', name: 'Acier', adjective: 'en Acier', icon: '🛡', tintColor: '#b0b8c8',
    weight: 18, minChestTier: 2,
    paletteRole: 'brightMetal',
    statBias: { damage: [3, 7], armor: [1, 4] },
    tags: ['metal', 'balanced'],
  },
  silver: {
    id: 'silver', name: 'Argent', adjective: 'en Argent', icon: '🌙', tintColor: '#d8d8e8',
    weight: 10, minChestTier: 2,
    paletteRole: 'paleMetal',
    statBias: { crit: [2, 5], armor: [1, 4] },
    tags: ['metal', 'holy'],
  },
  obsidian: {
    id: 'obsidian', name: 'Obsidienne', adjective: 'en Obsidienne', icon: '⚫', tintColor: '#181020',
    weight: 7, minChestTier: 3,
    paletteRole: 'darkGlass',
    statBias: { damage: [5, 11], crit: [2, 6] },
    tags: ['dark', 'fragile', 'highCrit'],
  },
  gold: {
    id: 'gold', name: 'Or', adjective: 'en Or', icon: '💰', tintColor: '#ffe14a',
    weight: 6, minChestTier: 3,
    paletteRole: 'gold',
    statBias: { goldFind: [10, 22] },
    tags: ['metal', 'soft', 'flashy'],
  },
  crystal: {
    id: 'crystal', name: 'Cristal', adjective: 'en Cristal', icon: '💎', tintColor: '#7adcff',
    weight: 5, minChestTier: 3,
    paletteRole: 'crystal',
    statBias: { fireDmg: [4, 9], crit: [2, 5] },
    tags: ['magic', 'fragile'],
  },
  mithril: {
    id: 'mithril', name: 'Mithril', adjective: 'en Mithril', icon: '⭐', tintColor: '#a8d0ff',
    weight: 3, minChestTier: 4,
    paletteRole: 'mithril',
    statBias: { damage: [4, 9], speed: [2, 5] },
    tags: ['metal', 'light', 'rare'],
  },
  dragonbone: {
    id: 'dragonbone', name: 'Os de Dragon', adjective: 'en Os de Dragon', icon: '🐉', tintColor: '#c08060',
    weight: 2, minChestTier: 4,
    paletteRole: 'dragonbone',
    statBias: { damage: [8, 16], vitality: [4, 10], fireDmg: [3, 7] },
    tags: ['organic', 'legendary', 'fire'],
  },
};

const MATERIAL_LIST = Object.values(MATERIALS);

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
 * Pick a material appropriate for the item's chestTier.
 * Higher tiers unlock rarer materials (gated by minChestTier).
 * Rarity boosts the chance of drawing from the rarer end of the pool.
 * If `faction.materialTags` is provided, materials sharing any of those tags
 * get a heavy weight boost (×3) so factions feel thematically coherent.
 */
export function rollMaterial(chestTier, rarity = 'common', faction = null) {
  const pool = MATERIAL_LIST.filter(m => chestTier >= (m.minChestTier || 1));
  if (pool.length === 0) return MATERIALS.iron;
  const rarityBoost = (RARITY_BY_ID[rarity]?.statMult || 1) - 1;
  const factionTags = new Set(faction?.materialTags || []);
  const weighted = pool.map(m => {
    let w = m.weight + rarityBoost * (10 - Math.min(10, m.weight));
    // Faction coherence: triple weight when material tags match.
    if (factionTags.size > 0 && m.tags.some(t => factionTags.has(t))) w *= 3;
    return { ...m, weight: w };
  });
  return pickWeighted(weighted);
}

/**
 * Roll concrete stats for a material at a given chestTier × statMult.
 * Same formula as parts: lerp(min,max) by a d20-derived quality, then × tier × statMult.
 * Returns { stats, quality, d20 }.
 */
export function rollMaterialStats(material, chestTier, statMult) {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const t = (d20 - 1) / 19;
  const stats = {};
  for (const [stat, [min, max]] of Object.entries(material.statBias || {})) {
    stats[stat] = Math.max(1, Math.round((min + t * (max - min)) * chestTier * statMult));
  }
  return { stats, quality: t, d20 };
}

/**
 * Build a statSources entry for a rolled material.
 */
export function materialStatSource(material, rolled) {
  return {
    sourceType: 'material',
    sourceId: material.id,
    label: material.name,
    stats: rolled.stats,
    quality: rolled.quality,
  };
}

/**
 * Merge material.stats into the existing baseStats (mutates baseStats).
 */
export function mergeMaterialStats(baseStats, materialStats) {
  for (const [k, v] of Object.entries(materialStats || {})) {
    baseStats[k] = (baseStats[k] || 0) + v;
  }
}
