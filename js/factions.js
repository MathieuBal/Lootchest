// Factions — fourth identity layer. Unlike parts/material/element which are
// independent rolls, a faction biases the rolls of material AND element so
// the resulting item feels thematically coherent (an Infernal sword tends
// to be obsidian + fire, a Sylvan staff tends to be bone/wood + poison).
//
// Mechanics :
//   1. Roll faction (mostly 'none' — factions are flavor, not the default)
//   2. Pass faction to rollMaterial/rollElement, which boost matching tags
//   3. Faction also pushes its own stat bonus (smaller than material/element)
//   4. On rare+ items the faction adjective replaces the random NAME_SUFFIX
//      so total name length doesn't explode
//
// Common items get no faction (keep them simple). Magic+ may roll one.

import { RARITY_BY_ID, tierScale } from './data.js';

export const FACTIONS = {
  none: {
    id: 'none', name: 'Aucune', adjective: '',
    weight: 55, minRarityIndex: 1, // 0=common, 1=magic, 2=rare...
    statBias: {},
    materialTags: [],
    elementTags: [],
  },
  royal: {
    id: 'royal', name: 'Royal', adjective: 'Royale',
    weight: 12, minRarityIndex: 1,
    statBias: { armor: [2, 6], goldFind: [3, 8] },
    materialTags: ['flashy', 'metal'],
    elementTags: [],
  },
  infernal: {
    id: 'infernal', name: 'Infernal', adjective: 'Infernale',
    weight: 10, minRarityIndex: 1,
    statBias: { damage: [3, 7], crit: [1, 4] },
    materialTags: ['dark'],
    elementTags: ['fire'],
  },
  sylvan: {
    id: 'sylvan', name: 'Sylvain', adjective: 'Sylvestre',
    weight: 10, minRarityIndex: 1,
    statBias: { vitality: [3, 8] },
    materialTags: ['organic'],
    elementTags: ['poison'],
  },
  spectral: {
    id: 'spectral', name: 'Spectral', adjective: 'Spectrale',
    weight: 6, minRarityIndex: 2,
    statBias: { crit: [2, 6] },
    materialTags: ['pale', 'magic'],
    elementTags: ['void'],
  },
  bestial: {
    id: 'bestial', name: 'Bestial', adjective: 'Bestiale',
    weight: 7, minRarityIndex: 1,
    statBias: { damage: [2, 5], speed: [1, 3] },
    materialTags: ['organic'],
    elementTags: [],
  },
};

const FACTION_LIST = Object.values(FACTIONS);

function pickWeighted(list) {
  const total = list.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of list) {
    r -= (m.weight || 1);
    if (r <= 0) return m;
  }
  return list[list.length - 1];
}

const RARITY_INDEX = { common: 0, magic: 1, rare: 2, epic: 3, legendary: 4, ancestral: 5 };

/**
 * Pick a faction. Common items never get a faction. Rare+ has a higher chance
 * of rolling a non-'none' faction (smaller 'none' weight).
 */
export function rollFaction(chestTier, rarity = 'common') {
  const rarityIdx = RARITY_INDEX[rarity] ?? 0;
  if (rarityIdx < 1) return FACTIONS.none;
  const pool = FACTION_LIST.filter(f => rarityIdx >= (f.minRarityIndex || 0));
  if (pool.length === 0) return FACTIONS.none;
  const rarityBoost = (RARITY_BY_ID[rarity]?.statMult || 1) - 1;
  const weighted = pool.map(f => ({
    ...f,
    weight: f.id === 'none'
      ? Math.max(10, f.weight - rarityBoost * 18)  // less 'none' on rare+
      : f.weight + rarityBoost * 2,
  }));
  return pickWeighted(weighted);
}

/**
 * Roll concrete stats for a faction (same d20-based formula as the other layers).
 */
export function rollFactionStats(faction, chestTier, statMult) {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const t = (d20 - 1) / 19;
  const stats = {};
  for (const [stat, [min, max]] of Object.entries(faction.statBias || {})) {
    stats[stat] = Math.max(1, Math.round((min + t * (max - min)) * tierScale(chestTier) * statMult));
  }
  return { stats, quality: t, d20 };
}

export function factionStatSource(faction, rolled) {
  return {
    sourceType: 'faction',
    sourceId: faction.id,
    label: faction.name,
    stats: rolled.stats,
    quality: rolled.quality,
  };
}

export function mergeFactionStats(baseStats, factionStats) {
  for (const [k, v] of Object.entries(factionStats || {})) {
    baseStats[k] = (baseStats[k] || 0) + v;
  }
}
