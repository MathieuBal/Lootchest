// Talent tree: passive bonuses purchased with talent points.
// Points earned via ascensions (+2) and dungeon milestones every 25 floors (+1).
import { state, notify } from './state.js';
import { TALENTS, TALENT_BY_ID, TALENT_MASTERY_THRESHOLD, TALENT_MASTERY_BONUS,
         TALENT_MASTERY_THRESHOLD_2, TALENT_MASTERY_BONUS_2, ABILITY_SLOTS_BASE } from './data.js';

// Total points invested in a given category (combat / wealth / utility)
export function categoryPoints(category) {
  let total = 0;
  for (const t of TALENTS) {
    if (t.category === category) total += rankOf(t.id);
  }
  return total;
}

// Two-tier mastery (absolute, not stacked): ≥10 pts → 1.25, ≥5 pts → 1.10, else 1.
export function categoryMastery(category) {
  const pts = categoryPoints(category);
  if (pts >= TALENT_MASTERY_THRESHOLD_2) return 1 + TALENT_MASTERY_BONUS_2;
  if (pts >= TALENT_MASTERY_THRESHOLD)   return 1 + TALENT_MASTERY_BONUS;
  return 1;
}

export function rankOf(id) {
  return state.talents?.[id] || 0;
}

export function bonus(id, key) {
  const def = TALENT_BY_ID[id];
  if (!def) return 0;
  return rankOf(id) * (def.perRank[key] || 0);
}

export function canUpgradeTalent(id) {
  const def = TALENT_BY_ID[id];
  if (!def) return false;
  return rankOf(id) < def.maxRank && (state.talentPoints || 0) >= 1;
}

export function upgradeTalent(id) {
  if (!canUpgradeTalent(id)) return false;
  state.talents[id] = (state.talents[id] || 0) + 1;
  state.talentPoints -= 1;
  notify();
  return true;
}

export function totalPointsSpent() {
  return Object.values(state.talents || {}).reduce((s, n) => s + (n || 0), 0);
}

// === Convenience multipliers used by the rest of the game ===

// Each multiplier applies category mastery on top of the per-rank bonus.
export function sellMultiplier()        { return (1 + bonus('merchant',       'sellMult'))        * categoryMastery('wealth'); }
export function rareDropMultiplier()    { return (1 + bonus('sharpEye',       'rareMult'))        * categoryMastery('wealth'); }
export function damageMultiplier()      { return (1 + bonus('berserker',      'dmgMult'))         * categoryMastery('combat'); }
export function hpMultiplier()          { return (1 + bonus('tanky',          'hpMult'))          * categoryMastery('combat'); }
export function monsterGoldMultiplier() { return (1 + bonus('treasureHunter', 'monsterGoldMult')) * categoryMastery('wealth'); }
export function orbDropMultiplier()     { return (1 + bonus('orbFinder',      'orbDropMult'))     * categoryMastery('utility'); }
export function shardBonus()            { return Math.round(bonus('recycler', 'shardBonus')      * categoryMastery('utility')); }
export function pityReduction()         { return Math.round(bonus('pityMaster','pityReduction') * categoryMastery('utility')); }

// Award talent points (called from prestige + milestone hooks).
export function grantPoints(n) {
  state.talentPoints = (state.talentPoints || 0) + n;
  notify();
}

// === Active ability slots (talent-driven, the agency lever) ===
export function abilitySlots() {
  return ABILITY_SLOTS_BASE + rankOf('tactician');
}

// Trim the loadout to the current slot count (e.g. after a respec drops Tacticien).
export function clampLoadout() {
  if (!Array.isArray(state.loadout)) return;
  const max = abilitySlots();
  if (state.loadout.length > max) state.loadout.length = max;
}

// === Respec ===
// Gold cost to refund all spent points. Quadratic so early experimentation is
// cheap while late, fully-invested respecs are a real (recoverable) sink.
export function respecCost() {
  const spent = totalPointsSpent();
  return spent > 0 ? 500 * spent * spent : 0;
}

export function canRespecTalents() {
  return totalPointsSpent() > 0 && (state.gold || 0) >= respecCost();
}

export function respecTalents() {
  if (!canRespecTalents()) return false;
  const refund = totalPointsSpent();
  state.gold -= respecCost();
  state.talentPoints = (state.talentPoints || 0) + refund;
  state.talents = {};
  clampLoadout();
  notify();
  return true;
}
