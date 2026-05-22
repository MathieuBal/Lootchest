// Item generation: rolls rarity from chest tier, base type from slot, affixes, and procedural name.
import {
  RARITIES, RARITY_BY_ID, SLOTS, BASE_TYPES, AFFIXES,
  NAME_PREFIXES, NAME_SUFFIXES, CHEST_TIERS, PITY_THRESHOLD,
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

export function rollRarity(chestTier) {
  const tier = CHEST_TIERS.find(t => t.tier === chestTier);
  const prestigeLevel = state.prestige?.level || 0;
  const rareMult = prestigeRareMult(prestigeLevel) * rareDropMultiplier() * relicDropMult() * villageRareMult();
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
    const value = Math.round(randInt(aff.min, aff.max) * tierScale(chestTier));
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
  // Regenerate name for regular items only; set/unique names are preserved.
  if (!item.setId && !item.uniqueId) {
    const mat  = item.material ? MATERIALS[item.material.id] : null;
    const elem = item.element  ? ELEMENTS[item.element.id]   : null;
    const fac  = item.faction  ? FACTIONS[item.faction.id]   : null;
    item.name = makeName(baseType, item.rarity, mat, elem, fac);
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
  const n = RARITY_BY_ID[item.rarity].affixes;
  if (n === 0) return;
  const pool = [...AFFIXES];
  const picked = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const aff = pool.splice(idx, 1)[0];
    const minHigh = Math.ceil((aff.min + aff.max) / 2);
    const value = Math.round(randInt(minHigh, aff.max) * tierScale(item.chestTier));
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

function buildRegularItem(chestTier, rarity, forceSlot) {
  const slot = (forceSlot && BASE_TYPES[forceSlot]) ? forceSlot : rollSlot();
  const baseType = pickRandom(BASE_TYPES[slot]);

  // Composed item path: any base type registered in WEAPON_PARTS (weapons + armor).
  if (hasCompositionFor(baseType.id)) {
    const statMult = RARITY_BY_ID[rarity].statMult;
    // HD parts (64×64 procedural) when the weapon type has them registered.
    // Currently: swords. Other weapons fall back to legacy 16×16.
    const useHD = ['sword','axe','wand','dagger','bow','helm','cap','crown','plate','tunic','robe','tower','buckler','band','signet','pendant','talisman'].includes(baseType.id);
    const { parts, baseStats, statSources } = rollWeaponParts(baseType.id, chestTier, statMult, { hd: useHD });
    // Faction first — drives coherence on material/element via tag bias.
    const faction = rollFaction(chestTier, rarity);
    const factionRolled = rollFactionStats(faction, chestTier, statMult);
    mergeFactionStats(baseStats, factionRolled.stats);
    if (Object.keys(factionRolled.stats).length > 0) statSources.push(factionStatSource(faction, factionRolled));
    // Material — biased by faction.materialTags.
    const material = rollMaterial(chestTier, rarity, faction);
    const matRolled = rollMaterialStats(material, chestTier, statMult);
    mergeMaterialStats(baseStats, matRolled.stats);
    if (Object.keys(matRolled.stats).length > 0) statSources.push(materialStatSource(material, matRolled));
    // Element — biased by faction.elementTags.
    const element = rollElement(chestTier, rarity, faction);
    const elemRolled = rollElementStats(element, chestTier, statMult);
    mergeElementStats(baseStats, elemRolled.stats);
    if (Object.keys(elemRolled.stats).length > 0) statSources.push(elementStatSource(element, elemRolled));
    const affixes = rollAffixes(rarity, chestTier);
    const item = {
      id: nextId(),
      slot,
      baseTypeId: baseType.id,
      emoji: baseType.emoji,
      rarity,
      name: makeName(baseType, rarity, material, element, faction),
      baseStats,
      affixes,
      goldValue: computeGoldValue(rarity, chestTier),
      chestTier,
      parts,
      statSources,
      material: { id: material.id, name: material.name, d20: matRolled.d20 },
      element:  { id: element.id,  name: element.name,  d20: elemRolled.d20 },
      faction:  { id: faction.id,  name: faction.name,  d20: factionRolled.d20 },
      hdParts: useHD,  // 64×64 procedural source — drives the renderer dispatch
    };
    // Legendary effect — 30% on legendary, 80% on ancestral, tag-gated.
    const effect = rollLegendaryEffect(item);
    if (effect) item.legendaryEffect = { id: effect.id, name: effect.name };
    return item;
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
    const useHD = ['sword','axe','wand','dagger','bow','helm','cap','crown','plate','tunic','robe','tower','buckler','band','signet','pendant','talisman'].includes(tpl.baseTypeId);
    const rolled = rollWeaponParts(tpl.baseTypeId, chestTier, 1, { hd: useHD });
    if (rolled) {
      item.parts = rolled.parts;
      if (useHD) item.hdParts = true;
    }
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
    const useHD = ['sword','axe','wand','dagger','bow','helm','cap','crown','plate','tunic','robe','tower','buckler','band','signet','pendant','talisman'].includes(piece.baseTypeId);
    const rolled = rollWeaponParts(piece.baseTypeId, chestTier, statMult, { hd: useHD });
    // Set pieces keep their canonical name (the set IS their faction-equivalent
    // identity). They still get all three layers for stats + tooltip lines.
    const faction = rollFaction(chestTier, rarity);
    const factionRolled = rollFactionStats(faction, chestTier, statMult);
    mergeFactionStats(rolled.baseStats, factionRolled.stats);
    if (Object.keys(factionRolled.stats).length > 0) {
      rolled.statSources.push(factionStatSource(faction, factionRolled));
    }
    const material = rollMaterial(chestTier, rarity, faction);
    const matRolled = rollMaterialStats(material, chestTier, statMult);
    mergeMaterialStats(rolled.baseStats, matRolled.stats);
    if (Object.keys(matRolled.stats).length > 0) {
      rolled.statSources.push(materialStatSource(material, matRolled));
    }
    const element = rollElement(chestTier, rarity, faction);
    const elemRolled = rollElementStats(element, chestTier, statMult);
    mergeElementStats(rolled.baseStats, elemRolled.stats);
    if (Object.keys(elemRolled.stats).length > 0) {
      rolled.statSources.push(elementStatSource(element, elemRolled));
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
      element:  { id: element.id,  name: element.name,  d20: elemRolled.d20 },
      faction:  { id: faction.id,  name: faction.name,  d20: factionRolled.d20 },
      hdParts: useHD,
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
