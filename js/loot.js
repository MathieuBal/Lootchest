// Item generation: rolls rarity from chest tier, base type from slot, affixes, and procedural name.
import {
  RARITIES, RARITY_BY_ID, SLOTS, BASE_TYPES, AFFIXES,
  NAME_PREFIXES, NAME_SUFFIXES, CHEST_TIERS,
} from './data.js';

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
  const entries = Object.entries(tier.weights)
    .filter(([_, w]) => w > 0)
    .map(([key, weight]) => ({ key, weight }));
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

export function generateItem(chestTier) {
  const rarity = rollRarity(chestTier);
  const slot = rollSlot();
  const baseType = pickRandom(BASE_TYPES[slot]);
  const baseStats = scaleBaseStats(baseType.baseStats, chestTier, rarity);
  const affixes = rollAffixes(rarity, chestTier);
  const item = {
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
  return item;
}
