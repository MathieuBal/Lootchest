// Item generation: rolls rarity from chest tier, base type from slot, affixes, and procedural name.
import {
  RARITIES, RARITY_BY_ID, SLOTS, BASE_TYPES, AFFIXES,
  NAME_PREFIXES, NAME_SUFFIXES, CHEST_TIERS, PITY_THRESHOLD,
  UNIQUE_LEGENDARIES, UNIQUE_DROP_CHANCE,
  SETS, SET_DROP_CHANCE, PRESTIGE_BONUS_PER_LEVEL,
} from './data.js';
import { state } from './state.js';

let _id = 0;
function nextId() { return `it_${Date.now().toString(36)}_${(_id++).toString(36)}`; }

function pickWeighted(entries) {
  // entries: [{ key, weight }] — returns key
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.key;
  }
  return entries[entries.length - 1].key;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollRarity(chestTier) {
  const tier = CHEST_TIERS.find(t => t.tier === chestTier);
  const prestigeLevel = state.prestige?.level || 0;
  const rareMult = Math.pow(PRESTIGE_BONUS_PER_LEVEL.rareDropWeightMult, prestigeLevel);
  const rarePlusSet = new Set(['rare', 'epic', 'legendary', 'ancestral']);
  const entries = Object.entries(tier.weights)
    .filter(([_, w]) => w > 0)
    .map(([key, weight]) => ({
      key,
      weight: weight * (rarePlusSet.has(key) ? rareMult : 1),
    }));
  return pickWeighted(entries);
}

export function rollSlot() {
  return pickRandom(SLOTS).id;
}

function rollAffixes(rarity, chestTier) {
  const n = RARITY_BY_ID[rarity].affixes;
  if (n === 0) return [];
  // pick N distinct affixes
  const pool = [...AFFIXES];
  const picked = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const aff = pool.splice(idx, 1)[0];
    // value scales linearly with chest tier
    const value = randInt(aff.min, aff.max) * chestTier;
    picked.push({
      id: aff.id,
      stat: aff.stat,
      label: aff.label,
      value,
      percent: aff.percent,
    });
  }
  return picked;
}

function scaleBaseStats(baseStats, chestTier, rarity) {
  const mult = RARITY_BY_ID[rarity].statMult;
  const result = {};
  for (const [k, v] of Object.entries(baseStats)) {
    result[k] = Math.max(1, Math.round(v * chestTier * mult));
  }
  return result;
}

function makeName(baseType, rarity) {
  if (rarity === 'common') return baseType.name;
  if (rarity === 'magic') return `${pickRandom(NAME_PREFIXES)} ${baseType.name}`;
  // rare+ get prefix + suffix
  return `${pickRandom(NAME_PREFIXES)} ${baseType.name} ${pickRandom(NAME_SUFFIXES)}`;
}

function computeGoldValue(rarity, chestTier) {
  const mult = RARITY_BY_ID[rarity].goldMult;
  // base value scales with tier squared (so high-tier loot is worth a lot)
  return Math.round(mult * (1 + chestTier * chestTier * 0.6));
}

// Pity-aware version: used by chest opening to update the counter.
// Forces a legendary if PITY_THRESHOLD non-legendary+ drops have been seen.
export function generateItemFromChest(chestTier) {
  let rarity = rollRarity(chestTier);
  if (state.pity.sinceLegendary >= PITY_THRESHOLD - 1 && rarity !== 'legendary' && rarity !== 'ancestral') {
    rarity = 'legendary';
  }
  if (rarity === 'legendary' || rarity === 'ancestral') {
    state.pity.sinceLegendary = 0;
  } else {
    state.pity.sinceLegendary += 1;
  }
  const item = buildItem(chestTier, rarity);
  trackDropStats(item);
  return item;
}

export function generateItem(chestTier) {
  const rarity = rollRarity(chestTier);
  const item = buildItem(chestTier, rarity);
  trackDropStats(item);
  return item;
}

function trackDropStats(item) {
  if (!state.stats) return;
  if (item.rarity === 'legendary') state.stats.legendaryDropped += 1;
  else if (item.rarity === 'ancestral') state.stats.ancestralDropped += 1;
  if (item.uniqueId) state.stats.uniquesDropped += 1;
}

// Forge helpers — rebuild item in-place based on its current slot/baseTypeId/rarity/chestTier.
export function rebuildItemAffixesAndStats(item) {
  const baseType = BASE_TYPES[item.slot].find(b => b.id === item.baseTypeId);
  if (!baseType) return;

  if (item.uniqueId) {
    const tpl = UNIQUE_LEGENDARIES.find(u => u.id === item.uniqueId);
    if (tpl) {
      item.baseStats = scaleBaseStats(baseType.baseStats, item.chestTier, 'legendary');
      if (tpl.baseStatBonus) {
        for (const [k, v] of Object.entries(tpl.baseStatBonus)) {
          item.baseStats[k] = (item.baseStats[k] || 0) + Math.round(v * item.chestTier);
        }
      }
      item.affixes = tpl.fixedAffixes.map(a => ({
        ...a,
        value: Math.max(1, Math.round(a.value * (0.7 + 0.3 * item.chestTier))),
      }));
      item.goldValue = Math.round(computeGoldValue('legendary', item.chestTier) * 1.5);
      return;
    }
  }

  item.baseStats = scaleBaseStats(baseType.baseStats, item.chestTier, item.rarity);
  item.affixes = rollAffixes(item.rarity, item.chestTier);
  item.goldValue = computeGoldValue(item.rarity, item.chestTier);
  // Regenerate name for regular items only; set/unique names are preserved.
  if (!item.setId && !item.uniqueId) {
    item.name = makeName(baseType, item.rarity);
  }
}

export function rebuildItemAffixesOnly(item) {
  if (item.uniqueId) return; // unique fixed affixes cannot be rerolled
  item.affixes = rollAffixes(item.rarity, item.chestTier);
}

// Same as rebuildItemAffixesOnly but values roll in the TOP 50% of their range.
// Used by the "Reroll+" forge action that costs crystals.
export function rebuildItemAffixesPlus(item) {
  if (item.uniqueId) return;
  const n = RARITY_BY_ID[item.rarity].affixes;
  if (n === 0) return;
  const pool = [...AFFIXES];
  const picked = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const aff = pool.splice(idx, 1)[0];
    const minHigh = Math.ceil((aff.min + aff.max) / 2);
    const value = randInt(minHigh, aff.max) * item.chestTier;
    picked.push({ id: aff.id, stat: aff.stat, label: aff.label, value, percent: aff.percent });
  }
  item.affixes = picked;
}

function buildItem(chestTier, rarity) {
  // Roll for unique legendary first
  if (rarity === 'legendary' && Math.random() < UNIQUE_DROP_CHANCE) {
    return buildUniqueLegendary(chestTier);
  }
  // Roll for set piece (rare+)
  if (SET_DROP_CHANCE[rarity] && Math.random() < SET_DROP_CHANCE[rarity]) {
    return buildSetPiece(chestTier, rarity);
  }
  return buildRegularItem(chestTier, rarity);
}

function buildRegularItem(chestTier, rarity) {
  const slot = rollSlot();
  const baseType = pickRandom(BASE_TYPES[slot]);
  const baseStats = scaleBaseStats(baseType.baseStats, chestTier, rarity);
  const affixes = rollAffixes(rarity, chestTier);
  return {
    id: nextId(),
    slot,
    baseTypeId: baseType.id,
    emoji: baseType.emoji,
    rarity,
    name: makeName(baseType, rarity),
    baseStats,
    affixes,
    goldValue: computeGoldValue(rarity, chestTier),
    chestTier,
  };
}

function buildUniqueLegendary(chestTier) {
  const tpl = pickRandom(UNIQUE_LEGENDARIES);
  // Find the base type to get base stats
  const baseType = BASE_TYPES[tpl.slot].find(b => b.id === tpl.baseTypeId)
                || BASE_TYPES[tpl.slot][0];
  const baseStats = scaleBaseStats(baseType.baseStats, chestTier, 'legendary');
  // Apply baseStatBonus (additive)
  if (tpl.baseStatBonus) {
    for (const [k, v] of Object.entries(tpl.baseStatBonus)) {
      baseStats[k] = (baseStats[k] || 0) + Math.round(v * chestTier);
    }
  }
  // Affixes are fixed but scale with chestTier
  const affixes = tpl.fixedAffixes.map(a => ({
    ...a,
    value: Math.max(1, Math.round(a.value * (0.7 + 0.3 * chestTier))),
  }));
  return {
    id: nextId(),
    slot: tpl.slot,
    baseTypeId: tpl.baseTypeId,
    emoji: tpl.emoji,
    rarity: 'legendary',
    name: tpl.name,
    baseStats,
    affixes,
    goldValue: Math.round(computeGoldValue('legendary', chestTier) * 1.5),
    chestTier,
    uniqueId: tpl.id,
    flavor: tpl.flavor,
  };
}

function buildSetPiece(chestTier, rarity) {
  // Pick a random set, then a random slot within that set
  const set = pickRandom(SETS);
  const slotIds = Object.keys(set.pieces);
  const slot = pickRandom(slotIds);
  const piece = set.pieces[slot];
  const baseType = BASE_TYPES[slot].find(b => b.id === piece.baseTypeId)
                || BASE_TYPES[slot][0];
  const baseStats = scaleBaseStats(baseType.baseStats, chestTier, rarity);
  const affixes = rollAffixes(rarity, chestTier);
  return {
    id: nextId(),
    slot,
    baseTypeId: piece.baseTypeId,
    emoji: piece.emoji,
    rarity,
    name: piece.name,
    baseStats,
    affixes,
    goldValue: computeGoldValue(rarity, chestTier),
    chestTier,
    setId: set.id,
    setName: set.name,
  };
}
