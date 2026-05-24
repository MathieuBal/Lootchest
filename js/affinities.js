// Archetype affinities — the cross-system synergy layer.
// An affinity's score is summed from investments spread across MULTIPLE systems
// (talents + relics + equipped set + item elements), so no single system can max
// an axis alone. Crossing 4/8/12 points grants escalating, additive bonuses that
// feed combat (damage/HP/elemental) and loot (gold/drops). Everything here is
// derived from existing state — no new persisted fields.
import { state } from './state.js';
import { AFFINITIES, AFFINITY_BY_ID, AFFINITY_THRESHOLDS } from './data.js';
import { rankOf, categoryPoints } from './talents.js';
import { activeSetEffects } from './character.js';

function relicCountIn(ids) {
  const owned = state.prestige?.relics || {};
  return ids.reduce((s, id) => s + (owned[id] || 0), 0);
}

function equippedElementPieces() {
  let n = 0;
  for (const item of Object.values(state.equipment || {})) {
    if (item && item.element && item.element.id && item.element.id !== 'none') n++;
  }
  return n;
}

// Raw point score for an axis, applying per-source caps.
export function affinityScore(axisId) {
  const def = AFFINITY_BY_ID[axisId];
  if (!def) return 0;
  const src = def.sources || {};
  let score = 0;

  if (src.talents) {
    for (const tid of src.talents) score += rankOf(tid);
  }
  if (src.wealthCategory) {
    score += categoryPoints('wealth') * src.wealthCategory;
  }
  if (src.elementPieces) {
    score += equippedElementPieces() * src.elementPieces;
  }
  if (src.relics) {
    const raw = relicCountIn(src.relics.ids) * (src.relics.points || 1);
    score += src.relics.cap != null ? Math.min(raw, src.relics.cap) : raw;
  }
  if (src.setEffects) {
    const active = new Set(activeSetEffects().map(e => e.id));
    if (src.setEffects.ids.some(id => active.has(id))) score += src.setEffects.points || 0;
  }
  return score;
}

// Current tier (0..3) for an axis based on thresholds.
export function affinityTier(axisId) {
  const score = affinityScore(axisId);
  let tier = 0;
  for (const t of AFFINITY_THRESHOLDS) if (score >= t) tier++;
  return tier;
}

// Bonus value for a given key at the axis's current tier (0 if untiered).
export function affinityBonus(axisId, key) {
  const def = AFFINITY_BY_ID[axisId];
  if (!def) return 0;
  const tier = affinityTier(axisId);
  if (tier <= 0) return 0;
  return def.tiers[tier - 1]?.[key] || 0;
}

// Full snapshot for the UI: score, tier, and the active tier's bonus object.
export function affinitySummary() {
  return AFFINITIES.map(def => {
    const score = affinityScore(def.id);
    const tier = affinityTier(def.id);
    return { ...def, score, tier, activeBonus: tier > 0 ? def.tiers[tier - 1] : null };
  });
}

// === Convenience multipliers consumed by combat & loot ===
export function affinityDamageMult() { return 1 + affinityBonus('force', 'damage'); }
export function affinityHpMult()     { return 1 + affinityBonus('garde', 'hp'); }
export function affinityElemMult()   { return 1 + affinityBonus('arcane', 'elem'); }
export function affinityGoldMult()   { return 1 + affinityBonus('cupidite', 'gold'); }
export function affinityDropMult()   { return 1 + affinityBonus('cupidite', 'drop'); }
