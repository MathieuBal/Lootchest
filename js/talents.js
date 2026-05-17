// Talent tree: passive bonuses purchased with talent points.
// Points earned via ascensions (+2) and dungeon milestones every 25 floors (+1).
import { state, notify } from './state.js';
import { TALENTS, TALENT_BY_ID } from './data.js';

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

export function sellMultiplier()        { return 1 + bonus('merchant',       'sellMult'); }
export function rareDropMultiplier()    { return 1 + bonus('sharpEye',       'rareMult'); }
export function damageMultiplier()      { return 1 + bonus('berserker',      'dmgMult'); }
export function hpMultiplier()          { return 1 + bonus('tanky',          'hpMult'); }
export function monsterGoldMultiplier() { return 1 + bonus('treasureHunter', 'monsterGoldMult'); }
export function orbDropMultiplier()     { return 1 + bonus('orbFinder',      'orbDropMult'); }
export function shardBonus()            { return bonus('recycler',           'shardBonus'); }
export function pityReduction()         { return bonus('pityMaster',         'pityReduction'); }

// Award talent points (called from prestige + milestone hooks).
export function grantPoints(n) {
  state.talentPoints = (state.talentPoints || 0) + n;
  notify();
}
