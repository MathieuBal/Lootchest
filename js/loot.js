// Item generation: rolls rarity from chest tier, base type from slot, affixes, and procedural name.
import {
  RARITIES, RARITY_BY_ID, SLOTS, BASE_TYPES, AFFIXES, AFFIX_LIMITS,
  NAME_PREFIXES, NAME_SUFFIXES, CHEST_TIERS, PITY_THRESHOLD,
  PITY_ANCESTRAL_THRESHOLD, PITY_UNIQUE_THRESHOLD,
  UNIQUE_LEGENDARIES, UNIQUE_DROP_CHANCE,
  SETS, SET_DROP_CHANCE, prestigeRareMult, tierScale,
} from './data.js';
import { state } from './state.js';
import { rollWeaponParts, hasCompositionFor, recomputePartStats } from './parts.js';
import { rollMaterial, rollMaterialStats, materialStatSource, mergeMaterialStats, MATERIALS } from './materials.js';
import { rollElement, rollElementStats, elementStatSource, mergeElementStats, ELEMENTS } from './elements.js';
import { rollFaction, rollFactionStats, factionStatSource, mergeFactionStats, FACTIONS } from './factions.js';
import { rollLegendaryEffect } from './legendaryEffects.js';
import { rareDropMultiplier, pityReduction } from './talents.js';
import { relicDropMult } from './relics.js';
import { affinityDropMult } from './affinities.js';
import { trackProgress as bountyTrack } from './bounties.js';
import { villageRareMult } from './village.js';

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

// Base types that have 64×64 procedural HD parts registered. Single source of
// truth — used by every build path so the renderer dispatch stays consistent.
const HD_PART_TYPES = new Set([
  'sword', 'axe', 'wand', 'dagger', 'bow', 'helm', 'cap', 'crown', 'plate',
  'tunic', 'robe', 'tower', 'buckler', 'band', 'signet', 'pendant', 'talisman',
]);
export function hasHDParts(id) { return HD_PART_TYPES.has(id); }

export function rollRarity(chestTier) {
  const tier = CHEST_TIERS.find(t => t.tier === chestTier);
  const prestigeLevel = state.prestige?.level || 0;
  const rareMult = prestigeRareMult(prestigeLevel) * rareDropMultiplier() * relicDropMult() * affinityDropMult() * villageRareMult();
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

// Build a rolled affix object. `roll` (0..1) records where the raw value landed
// in its range so the UI can show quality and selling can reward good rolls.
// `highHalf` forces the value into the top 50% (used by Reroll+).
function makeAffix(aff, chestTier, highHalf = false) {
  const lo = highHalf ? Math.ceil((aff.min + aff.max) / 2) : aff.min;
  const raw = randInt(lo, aff.max);
  const roll = aff.max === aff.min ? 1 : (raw - aff.min) / (aff.max - aff.min);
  return {
    id: aff.id,
    stat: aff.stat,
    label: aff.label,
    value: Math.round(raw * tierScale(chestTier)),
    percent: aff.percent,
    type: aff.type,
    roll: Math.round(roll * 100) / 100,
  };
}

function pickDistinctAffixes(pool, count, out, chestTier, highHalf) {
  const avail = [...pool];
  for (let i = 0; i < count && avail.length > 0; i++) {
    const idx = Math.floor(Math.random() * avail.length);
    const aff = avail.splice(idx, 1)[0];
    out.push(makeAffix(aff, chestTier, highHalf));
  }
}

// Decide how the N affixes split between prefix/suffix, respecting AFFIX_LIMITS
// and pool sizes, biased toward a balanced spread (≥1 of each as soon as n≥2).
// usedPrefix/usedSuffix: slots already occupied (e.g. by locked affixes kept
// across a reroll). Counts toward the limits but only the NEWLY added counts are
// returned, so the pick loop semantics stay identical for default (0,0) callers.
function splitAffixCounts(rarity, n, prefixPoolSize, suffixPoolSize, usedPrefix = 0, usedSuffix = 0) {
  const limits = AFFIX_LIMITS[rarity] || { prefix: n, suffix: n };
  let pCount = usedPrefix, sCount = usedSuffix;
  let addP = 0, addS = 0;
  for (let i = 0; i < n; i++) {
    const canP = pCount < limits.prefix && addP < prefixPoolSize;
    const canS = sCount < limits.suffix && addS < suffixPoolSize;
    if (!canP && !canS) break;
    let pickP;
    if (canP && !canS) pickP = true;
    else if (canS && !canP) pickP = false;
    else if (pCount < sCount) pickP = true;       // under-represented → prefix
    else if (sCount < pCount) pickP = false;      // under-represented → suffix
    else pickP = Math.random() < 0.5;             // tie → random
    if (pickP) { pCount++; addP++; } else { sCount++; addS++; }
  }
  return { pCount: addP, sCount: addS };
}

// keep: affixes to preserve verbatim (locked). They occupy slots and exclude
// their stats from the pools; only the remaining slots are rolled.
function rollAffixes(rarity, chestTier, { highHalf = false, keep = [] } = {}) {
  const n = RARITY_BY_ID[rarity].affixes;
  if (n === 0) return [];
  const keptPrefix = keep.filter(a => (a.type || 'prefix') === 'prefix').length;
  const keptSuffix = keep.length - keptPrefix;
  const keptStats = new Set(keep.map(a => a.stat));
  const prefixPool = AFFIXES.filter(a => a.type === 'prefix' && !keptStats.has(a.stat));
  const suffixPool = AFFIXES.filter(a => a.type === 'suffix' && !keptStats.has(a.stat));
  const remaining = Math.max(0, n - keep.length);
  const { pCount, sCount } = splitAffixCounts(rarity, remaining, prefixPool.length, suffixPool.length, keptPrefix, keptSuffix);
  const picked = [...keep];
  pickDistinctAffixes(prefixPool, pCount, picked, chestTier, highHalf);
  pickDistinctAffixes(suffixPool, sCount, picked, chestTier, highHalf);
  return picked;
}

// Overall roll quality (0..1): average of affix rolls and identity-layer d20s.
// Drives the quality-weighted gold value.
export function itemQuality(item) {
  const samples = [];
  for (const a of item.affixes || []) {
    if (typeof a.roll === 'number') samples.push(a.roll);
  }
  for (const key of ['material', 'element', 'faction']) {
    const layer = item[key];
    if (layer && layer.d20) samples.push((layer.d20 - 1) / 19);
  }
  if (samples.length === 0) return 0.5;
  return samples.reduce((s, v) => s + v, 0) / samples.length;
}

// Scale an item's gold value by its roll quality (≈ 0.8× trash → 1.3× perfect).
function applyQualityGold(item) {
  const q = itemQuality(item);
  item.goldValue = Math.max(1, Math.round(item.goldValue * (0.8 + 0.5 * q)));
}

// Roll the three identity layers (faction → material → element), merge their
// stats into baseStats, push stat-sources, and return both the stored layer
// descriptors and the full defs (for naming). Shared by regular + set builds.
function rollIdentityLayers(baseStats, statSources, chestTier, rarity, statMult) {
  const faction = rollFaction(chestTier, rarity);
  const factionRolled = rollFactionStats(faction, chestTier, statMult);
  mergeFactionStats(baseStats, factionRolled.stats);
  if (Object.keys(factionRolled.stats).length > 0) statSources.push(factionStatSource(faction, factionRolled));

  const material = rollMaterial(chestTier, rarity, faction);
  const matRolled = rollMaterialStats(material, chestTier, statMult);
  mergeMaterialStats(baseStats, matRolled.stats);
  if (Object.keys(matRolled.stats).length > 0) statSources.push(materialStatSource(material, matRolled));

  const element = rollElement(chestTier, rarity, faction);
  const elemRolled = rollElementStats(element, chestTier, statMult);
  mergeElementStats(baseStats, elemRolled.stats);
  if (Object.keys(elemRolled.stats).length > 0) statSources.push(elementStatSource(element, elemRolled));

  return {
    material: { id: material.id, name: material.name, d20: matRolled.d20 },
    element:  { id: element.id,  name: element.name,  d20: elemRolled.d20 },
    faction:  { id: faction.id,  name: faction.name,  d20: factionRolled.d20 },
    materialDef: material, elementDef: element, factionDef: faction,
  };
}

function scaleBaseStats(baseStats, chestTier, rarity) {
  const mult = RARITY_BY_ID[rarity].statMult;
  const result = {};
  for (const [k, v] of Object.entries(baseStats)) {
    result[k] = Math.max(1, Math.round(v * tierScale(chestTier) * mult));
  }
  return result;
}

// Re-derive a stored layer's contribution (material or element) using its
// stored d20. Pushes stats into baseStats and a statSource entry. No-op when
// the item has no such layer. Same d20-keep semantics as parts: rescaling
// tier preserves the roll quality.
function applyLayerContribution(item, layerKey, table, sourceType, baseStats, statSources) {
  const layer = item[layerKey];
  if (!layer) return;
  const def = table[layer.id];
  if (!def) return;
  const statMult = RARITY_BY_ID[item.rarity].statMult;
  const d20 = layer.d20 || 10;
  const t = (d20 - 1) / 19;
  const stats = {};
  for (const [stat, [min, max]] of Object.entries(def.statBias || {})) {
    stats[stat] = Math.max(1, Math.round((min + t * (max - min)) * tierScale(item.chestTier) * statMult));
  }
  for (const [k, v] of Object.entries(stats)) baseStats[k] = (baseStats[k] || 0) + v;
  if (Object.keys(stats).length > 0) {
    statSources.push({
      sourceType,
      sourceId: def.id,
      label: def.name,
      stats,
      quality: t,
    });
  }
}

function applyMaterialContribution(item, baseStats, statSources) {
  applyLayerContribution(item, 'material', MATERIALS, 'material', baseStats, statSources);
}

function applyElementContribution(item, baseStats, statSources) {
  applyLayerContribution(item, 'element', ELEMENTS, 'element', baseStats, statSources);
}

function applyFactionContribution(item, baseStats, statSources) {
  applyLayerContribution(item, 'faction', FACTIONS, 'faction', baseStats, statSources);
}

// Re-apply all identity layers (material + element + faction). Used by every
// rebuild path so the layers survive operations that re-derive baseStats.
function applyIdentityLayers(item) {
  applyMaterialContribution(item, item.baseStats, item.statSources);
  applyElementContribution(item, item.baseStats, item.statSources);
  applyFactionContribution(item, item.baseStats, item.statSources);
}

function makeName(baseType, rarity, material, element, faction) {
  const matSuffix = material ? ` ${material.adjective}` : '';
  // Element adjective comes RIGHT AFTER the base name (before the material):
  // "Lame Givrée en Acier" reads better than "Lame en Acier Givrée".
  const elemAdj = (element && element.adjective) ? ` ${element.adjective}` : '';
  // Faction adjective REPLACES the random NAME_SUFFIX on rare+ items so the
  // total name doesn't explode. Falls back to a random suffix if no faction.
  const factionAdj = (faction && faction.adjective) ? faction.adjective : null;
  if (rarity === 'common') return `${baseType.name}${elemAdj}${matSuffix}`;
  if (rarity === 'magic')  return `${pickRandom(NAME_PREFIXES)} ${baseType.name}${elemAdj}${matSuffix}`;
  const suffix = factionAdj || pickRandom(NAME_SUFFIXES);
  return `${pickRandom(NAME_PREFIXES)} ${baseType.name}${elemAdj}${matSuffix} ${suffix}`;
}

function computeGoldValue(rarity, chestTier) {
  const mult = RARITY_BY_ID[rarity].goldMult;
  // base value scales with tier squared (so high-tier loot is worth a lot)
  return Math.round(mult * (1 + chestTier * chestTier * 0.6));
}

// Pity-aware version: used by chest opening to update the counter.
// Forces a legendary if PITY_THRESHOLD non-legendary+ drops have been seen.
export function generateItemFromChest(chestTier, opts = {}) {
  let rarity = rollRarity(chestTier);
  const effectivePity = Math.max(5, PITY_THRESHOLD - pityReduction());
  // Ancestral pity takes priority (it's the rarest outcome).
  if ((state.pity.sinceAncestral || 0) >= PITY_ANCESTRAL_THRESHOLD - 1) {
    rarity = 'ancestral';
  } else if (state.pity.sinceLegendary >= effectivePity - 1 && rarity !== 'legendary' && rarity !== 'ancestral') {
    rarity = 'legendary';
  }
  // Update legendary + ancestral counters.
  if (rarity === 'ancestral') {
    state.pity.sinceLegendary = 0;
    state.pity.sinceAncestral = 0;
  } else if (rarity === 'legendary') {
    state.pity.sinceLegendary = 0;
    state.pity.sinceAncestral = (state.pity.sinceAncestral || 0) + 1;
  } else {
    state.pity.sinceLegendary += 1;
    state.pity.sinceAncestral = (state.pity.sinceAncestral || 0) + 1;
  }
  // Unique pity: force a unique when a legendary is due and the drought is long.
  const forceUnique = rarity === 'legendary' && (state.pity.sinceUnique || 0) >= PITY_UNIQUE_THRESHOLD - 1;
  const item = buildItem(chestTier, rarity, { forceSlot: opts.forceSlot, forceUnique });
  if (rarity === 'legendary') {
    state.pity.sinceUnique = item.uniqueId ? 0 : (state.pity.sinceUnique || 0) + 1;
  }
  trackDropStats(item);
  return item;
}

export function generateItem(chestTier) {
  const rarity = rollRarity(chestTier);
  const item = buildItem(chestTier, rarity);
  trackDropStats(item);
  return item;
}

// Village Forge: craft a regular item of a chosen slot, at a given tier &
// rarity (both decided by the player + forge level). Deterministic slot, no
// unique/set rolls — you control what you make.
export function craftItem(slot, chestTier, rarity) {
  const item = buildRegularItem(chestTier, rarity, slot);
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
      applyQualityGold(item);
      return;
    }
  }

  // Composed weapons: re-roll parts to scale with new tier/rarity.
  if (item.parts && hasCompositionFor(item.baseTypeId)) {
    const statMult = RARITY_BY_ID[item.rarity].statMult;
    const { parts, baseStats, statSources } = rollWeaponParts(item.baseTypeId, item.chestTier, statMult, { hd: !!item.hdParts });
    item.parts = parts;
    item.baseStats = baseStats;
    item.statSources = statSources;
    // Preserve material identity (don't re-roll which material) but rescale its contribution.
    applyIdentityLayers(item);
  } else {
    item.baseStats = scaleBaseStats(baseType.baseStats, item.chestTier, item.rarity);
  }
  item.affixes = rollAffixes(item.rarity, item.chestTier);
  item.goldValue = computeGoldValue(item.rarity, item.chestTier);
  applyQualityGold(item);
  // Regenerate name for regular items only; set/unique names are preserved.
  if (!item.setId && !item.uniqueId) {
    const mat  = item.material ? MATERIALS[item.material.id] : null;
    const elem = item.element  ? ELEMENTS[item.element.id]   : null;
    const fac  = item.faction  ? FACTIONS[item.faction.id]   : null;
    item.name = makeName(baseType, item.rarity, mat, elem, fac);
  }
}

export function rebuildItemAffixesOnly(item, { highHalf = false } = {}) {
  if (item.uniqueId) return; // unique fixed affixes cannot be rerolled
  const keep = (item.affixes || []).filter(a => a.locked);
  item.affixes = rollAffixes(item.rarity, item.chestTier, { highHalf, keep });
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
    recomputePartStats(item.baseTypeId, item.parts, item.chestTier, statMult, 'rerollRoll', { hd: !!item.hdParts });
  item.parts = parts;
  item.baseStats = baseStats;
  item.statSources = statSources;
  applyIdentityLayers(item);
}

// Re-roll parts (which variants are picked) AND their values → visual changes.
// Material identity preserved. Affixes untouched.
export function rerollPartsAndVisuals(item) {
  if (item.uniqueId) return;
  if (!item.parts || !hasCompositionFor(item.baseTypeId)) return;
  const statMult = RARITY_BY_ID[item.rarity].statMult;
  const { parts, baseStats, statSources } = rollWeaponParts(item.baseTypeId, item.chestTier, statMult, { hd: !!item.hdParts });
  item.parts = parts;
  item.baseStats = baseStats;
  item.statSources = statSources;
  applyIdentityLayers(item);
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
      recomputePartStats(item.baseTypeId, item.parts, newTier, statMult, 'keepRoll', { hd: !!item.hdParts });
    item.parts = parts;
    item.baseStats = baseStats;
    item.statSources = statSources;
    applyIdentityLayers(item);
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
  const keep = (item.affixes || []).filter(a => a.locked);
  item.affixes = rollAffixes(item.rarity, item.chestTier, { highHalf: true, keep });
}

function buildItem(chestTier, rarity, opts = {}) {
  const { forceSlot = null, forceUnique = false } = opts;
  // Roll for unique legendary first (or force it via unique pity).
  if (rarity === 'legendary' && (forceUnique || Math.random() < UNIQUE_DROP_CHANCE)) {
    return buildUniqueLegendary(chestTier);
  }
  // Roll for set piece (rare+). Set/unique slots are fixed, so a focused slot
  // only steers the regular-item path below.
  if (SET_DROP_CHANCE[rarity] && Math.random() < SET_DROP_CHANCE[rarity]) {
    return buildSetPiece(chestTier, rarity);
  }
  return buildRegularItem(chestTier, rarity, forceSlot);
}

function buildRegularItem(chestTier, rarity, forceSlot) {
  const slot = (forceSlot && BASE_TYPES[forceSlot]) ? forceSlot : rollSlot();
  const baseType = pickRandom(BASE_TYPES[slot]);

  // Composed item path: any base type registered in WEAPON_PARTS (weapons + armor).
  if (hasCompositionFor(baseType.id)) {
    const statMult = RARITY_BY_ID[rarity].statMult;
    const useHD = hasHDParts(baseType.id);
    const { parts, baseStats, statSources } = rollWeaponParts(baseType.id, chestTier, statMult, { hd: useHD });
    const layers = rollIdentityLayers(baseStats, statSources, chestTier, rarity, statMult);
    const affixes = rollAffixes(rarity, chestTier);
    const item = {
      id: nextId(),
      slot,
      baseTypeId: baseType.id,
      emoji: baseType.emoji,
      rarity,
      name: makeName(baseType, rarity, layers.materialDef, layers.elementDef, layers.factionDef),
      baseStats,
      affixes,
      goldValue: computeGoldValue(rarity, chestTier),
      chestTier,
      parts,
      statSources,
      material: layers.material,
      element: layers.element,
      faction: layers.faction,
      hdParts: useHD,  // 64×64 procedural source — drives the renderer dispatch
    };
    // Legendary effect — 30% on legendary, 80% on ancestral, tag-gated.
    const effect = rollLegendaryEffect(item);
    if (effect) item.legendaryEffect = { id: effect.id, name: effect.name };
    applyQualityGold(item);
    return item;
  }

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
  applyQualityGold(item);
  return item;
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
    const useHD = hasHDParts(tpl.baseTypeId);
    const rolled = rollWeaponParts(tpl.baseTypeId, chestTier, 1, { hd: useHD });
    if (rolled) {
      item.parts = rolled.parts;
      if (useHD) item.hdParts = true;
    }
  }
  applyQualityGold(item);
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
    const useHD = hasHDParts(piece.baseTypeId);
    const rolled = rollWeaponParts(piece.baseTypeId, chestTier, statMult, { hd: useHD });
    // Set pieces keep their canonical name (the set IS their faction-equivalent
    // identity). They still get all three layers for stats + tooltip lines.
    const layers = rollIdentityLayers(rolled.baseStats, rolled.statSources, chestTier, rarity, statMult);
    const affixes = rollAffixes(rarity, chestTier);
    const item = {
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
      material: layers.material,
      element: layers.element,
      faction: layers.faction,
      hdParts: useHD,
    };
    applyQualityGold(item);
    return item;
  }

  const baseStats = scaleBaseStats(baseType.baseStats, chestTier, rarity);
  const affixes = rollAffixes(rarity, chestTier);
  const item = {
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
  applyQualityGold(item);
  return item;
}
