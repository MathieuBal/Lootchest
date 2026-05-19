// Item generation: rolls rarity from chest tier, base type from slot, affixes, and procedural name.
import {
  RARITIES, RARITY_BY_ID, SLOTS, BASE_TYPES, AFFIXES,
  NAME_PREFIXES, NAME_SUFFIXES, CHEST_TIERS, PITY_THRESHOLD,
  UNIQUE_LEGENDARIES, UNIQUE_DROP_CHANCE,
  SETS, SET_DROP_CHANCE, prestigeRareMult,
} from './data.js';
import { state } from './state.js';
import { rollWeaponParts, hasCompositionFor, recomputePartStats } from './parts.js';
import { rollMaterial, rollMaterialStats, materialStatSource, mergeMaterialStats, MATERIALS } from './materials.js';
import { rareDropMultiplier, pityReduction } from './talents.js';
import { trackProgress as bountyTrack } from './bounties.js';

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
  const rareMult = prestigeRareMult(prestigeLevel) * rareDropMultiplier();
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
    const value = randInt(aff.min, aff.max) * chestTier;
    picked.push({
      id: aff.id,
      stat: aff.stat,
      label: aff.label,
      value,
      percent: aff.percent,
      type: aff.type,
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

// Re-derive a material's contribution using its stored d20 (preserves the
// material's roll quality across rebuilds/rescales). Pushes stats into
// baseStats and a statSource entry. No-op if the item has no material.
function applyMaterialContribution(item, baseStats, statSources) {
  if (!item.material) return;
  const mat = MATERIALS[item.material.id];
  if (!mat) return;
  const statMult = RARITY_BY_ID[item.rarity].statMult;
  const d20 = item.material.d20 || 10;
  const t = (d20 - 1) / 19;
  const stats = {};
  for (const [stat, [min, max]] of Object.entries(mat.statBias || {})) {
    stats[stat] = Math.max(1, Math.round((min + t * (max - min)) * item.chestTier * statMult));
  }
  mergeMaterialStats(baseStats, stats);
  if (Object.keys(stats).length > 0) {
    statSources.push({
      sourceType: 'material',
      sourceId: mat.id,
      label: mat.name,
      stats,
      quality: t,
    });
  }
}

function makeName(baseType, rarity, material) {
  const matSuffix = material ? ` ${material.adjective}` : '';
  if (rarity === 'common') return `${baseType.name}${matSuffix}`;
  if (rarity === 'magic') return `${pickRandom(NAME_PREFIXES)} ${baseType.name}${matSuffix}`;
  // rare+ get prefix + suffix; the material adjective goes between them
  return `${pickRandom(NAME_PREFIXES)} ${baseType.name}${matSuffix} ${pickRandom(NAME_SUFFIXES)}`;
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
  const effectivePity = Math.max(5, PITY_THRESHOLD - pityReduction());
  if (state.pity.sinceLegendary >= effectivePity - 1 && rarity !== 'legendary' && rarity !== 'ancestral') {
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
  // Codex discovery
  if (state.codex) {
    if (item.uniqueId) state.codex.uniques[item.uniqueId] = true;
    if (item.setId) state.codex.sets[item.setId] = (state.codex.sets[item.setId] || 0) + 1;
  }
  // Bounty tracking
  const rarePlus = ['rare', 'epic', 'legendary', 'ancestral'].includes(item.rarity);
  if (rarePlus) bountyTrack('loot_rare_plus', 1);
  if (item.rarity === 'legendary' || item.rarity === 'ancestral') bountyTrack('loot_legendary', 1);
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

  // Composed weapons: re-roll parts to scale with new tier/rarity.
  if (item.parts && hasCompositionFor(item.baseTypeId)) {
    const statMult = RARITY_BY_ID[item.rarity].statMult;
    const { parts, baseStats, statSources } = rollWeaponParts(item.baseTypeId, item.chestTier, statMult);
    item.parts = parts;
    item.baseStats = baseStats;
    item.statSources = statSources;
    // Preserve material identity (don't re-roll which material) but rescale its contribution.
    applyMaterialContribution(item, item.baseStats, item.statSources);
  } else {
    item.baseStats = scaleBaseStats(baseType.baseStats, item.chestTier, item.rarity);
  }
  item.affixes = rollAffixes(item.rarity, item.chestTier);
  item.goldValue = computeGoldValue(item.rarity, item.chestTier);
  // Regenerate name for regular items only; set/unique names are preserved.
  if (!item.setId && !item.uniqueId) {
    const mat = item.material ? MATERIALS[item.material.id] : null;
    item.name = makeName(baseType, item.rarity, mat);
  }
}

export function rebuildItemAffixesOnly(item) {
  if (item.uniqueId) return; // unique fixed affixes cannot be rerolled
  item.affixes = rollAffixes(item.rarity, item.chestTier);
}

// Alias matching the procedural-engine plan terminology.
export const rerollAffixesOnly = rebuildItemAffixesOnly;

// Re-roll part VALUES (d20) but keep the same variants → same visual identity,
// new stat numbers. Material identity preserved (stats re-derived). Affixes
// are untouched. No-op for uniques/non-composed items.
export function rerollPartValuesOnly(item) {
  if (item.uniqueId) return;
  if (!item.parts || !hasCompositionFor(item.baseTypeId)) return;
  const statMult = RARITY_BY_ID[item.rarity].statMult;
  const { parts, baseStats, statSources } =
    recomputePartStats(item.baseTypeId, item.parts, item.chestTier, statMult, 'rerollRoll');
  item.parts = parts;
  item.baseStats = baseStats;
  item.statSources = statSources;
  applyMaterialContribution(item, item.baseStats, item.statSources);
}

// Re-roll parts (which variants are picked) AND their values → visual changes.
// Material identity preserved. Affixes untouched.
export function rerollPartsAndVisuals(item) {
  if (item.uniqueId) return;
  if (!item.parts || !hasCompositionFor(item.baseTypeId)) return;
  const statMult = RARITY_BY_ID[item.rarity].statMult;
  const { parts, baseStats, statSources } = rollWeaponParts(item.baseTypeId, item.chestTier, statMult);
  item.parts = parts;
  item.baseStats = baseStats;
  item.statSources = statSources;
  applyMaterialContribution(item, item.baseStats, item.statSources);
}

// Rescale an item to a new tier WITHOUT touching its identity (same parts
// variants, same affixes, same name). Stats scale with the new tier.
// Used by Pierre de Forge so the player doesn't lose a beloved sprite.
export function rescaleItemToTier(item, newTier) {
  if (newTier <= 0) return;
  const oldTier = item.chestTier;
  if (oldTier === newTier) return;
  item.chestTier = newTier;

  // Unique items: re-derive stats + affixes from template (template's formula
  // already scales with chestTier, so this is a faithful rescale).
  if (item.uniqueId) {
    rebuildItemAffixesAndStats(item);
    return;
  }

  // Composed items: recompute part stats keeping the same d20 (preserves roll
  // quality so a perfect-roll T4 stays a perfect-roll T5 after a Pierre).
  if (item.parts && hasCompositionFor(item.baseTypeId)) {
    const statMult = RARITY_BY_ID[item.rarity].statMult;
    const { parts, baseStats, statSources } =
      recomputePartStats(item.baseTypeId, item.parts, newTier, statMult, 'keepRoll');
    item.parts = parts;
    item.baseStats = baseStats;
    item.statSources = statSources;
    applyMaterialContribution(item, item.baseStats, item.statSources);
  } else {
    const baseType = BASE_TYPES[item.slot].find(b => b.id === item.baseTypeId);
    if (baseType) item.baseStats = scaleBaseStats(baseType.baseStats, newTier, item.rarity);
  }

  // Rescale affixes proportionally (affix.value scales linearly with chestTier
  // at roll time, so we mirror that here).
  const ratio = newTier / oldTier;
  for (const a of item.affixes || []) {
    a.value = Math.max(1, Math.round(a.value * ratio));
  }

  item.goldValue = computeGoldValue(item.rarity, newTier);
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
    picked.push({ id: aff.id, stat: aff.stat, label: aff.label, value, percent: aff.percent, type: aff.type });
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

  // Composed item path: any base type registered in WEAPON_PARTS (weapons + armor).
  if (hasCompositionFor(baseType.id)) {
    const statMult = RARITY_BY_ID[rarity].statMult;
    const { parts, baseStats, statSources } = rollWeaponParts(baseType.id, chestTier, statMult);
    // Material — second identity layer, adds stats + appears in tooltip/name.
    const material = rollMaterial(chestTier, rarity);
    const matRolled = rollMaterialStats(material, chestTier, statMult);
    mergeMaterialStats(baseStats, matRolled.stats);
    if (Object.keys(matRolled.stats).length > 0) {
      statSources.push(materialStatSource(material, matRolled));
    }
    const affixes = rollAffixes(rarity, chestTier);
    return {
      id: nextId(),
      slot,
      baseTypeId: baseType.id,
      emoji: baseType.emoji,
      rarity,
      name: makeName(baseType, rarity, material),
      baseStats,
      affixes,
      goldValue: computeGoldValue(rarity, chestTier),
      chestTier,
      parts,
      statSources,
      material: { id: material.id, name: material.name, d20: matRolled.d20 },
    };
  }

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
  const item = {
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
  // Visual-only composed sprite for uniques whose base type has parts (weapons + armor).
  if (hasCompositionFor(tpl.baseTypeId)) {
    const rolled = rollWeaponParts(tpl.baseTypeId, chestTier, 1);
    if (rolled) item.parts = rolled.parts;
  }
  return item;
}

function buildSetPiece(chestTier, rarity) {
  // Pick a random set, then a random slot within that set
  const set = pickRandom(SETS);
  const slotIds = Object.keys(set.pieces);
  const slot = pickRandom(slotIds);
  const piece = set.pieces[slot];
  const baseType = BASE_TYPES[slot].find(b => b.id === piece.baseTypeId)
                || BASE_TYPES[slot][0];

  // Composed item path (weapons + armor): parts contribute baseStats AND visual.
  if (hasCompositionFor(piece.baseTypeId)) {
    const statMult = RARITY_BY_ID[rarity].statMult;
    const rolled = rollWeaponParts(piece.baseTypeId, chestTier, statMult);
    // Material — set pieces keep their canonical name (the set's identity) but
    // still benefit from material stat bonuses + tooltip explanation.
    const material = rollMaterial(chestTier, rarity);
    const matRolled = rollMaterialStats(material, chestTier, statMult);
    mergeMaterialStats(rolled.baseStats, matRolled.stats);
    if (Object.keys(matRolled.stats).length > 0) {
      rolled.statSources.push(materialStatSource(material, matRolled));
    }
    const affixes = rollAffixes(rarity, chestTier);
    return {
      id: nextId(),
      slot,
      baseTypeId: piece.baseTypeId,
      emoji: piece.emoji,
      rarity,
      name: piece.name,
      baseStats: rolled.baseStats,
      affixes,
      goldValue: computeGoldValue(rarity, chestTier),
      chestTier,
      setId: set.id,
      setName: set.name,
      parts: rolled.parts,
      statSources: rolled.statSources,
      material: { id: material.id, name: material.name, d20: matRolled.d20 },
    };
  }

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
