// Ascension relics: permanent, stackable build modifiers chosen at each ascension.
// state.prestige.relics is a map { relicId: count }. Effects are additive across
// counts and folded into the existing multiplier pipeline (talents/prestige).
import { state } from './state.js';
import { RELIC_BY_ID, RELICS, RELIC_RANK2_PRESTIGE } from './data.js';

export const RELIC_REROLLS_PER_ASCENSION = 2;

// Sum every owned relic's mods (× count) into a single totals object.
export function relicTotals() {
  const t = {
    damagePct: 0, hpPct: 0, dmgTakenPct: 0, goldPct: 0,
    dropPct: 0, critFlat: 0, armorFlat: 0, elemPct: 0, lifesteal: 0,
  };
  const owned = state.prestige?.relics || {};
  for (const [id, count] of Object.entries(owned)) {
    const def = RELIC_BY_ID[id];
    if (!def || !count) continue;
    for (const [k, v] of Object.entries(def.mods)) {
      t[k] = (t[k] || 0) + v * count;
    }
  }
  return t;
}

// Stacked relics sum additively; cap the offensive multipliers so many
// ascensions' worth of Berserker/Glasscannon/Elementalist can't re-create the
// one-shot burst the combat rebalance removed.
export function relicDamageMult()   { return Math.max(0.1, Math.min(4, 1 + relicTotals().damagePct)); }
export function relicHpMult()       { return Math.max(0.2, Math.min(4, 1 + relicTotals().hpPct)); }
export function relicDmgTakenMult() { return Math.max(0.1, 1 + relicTotals().dmgTakenPct); }
export function relicGoldMult()     { return 1 + relicTotals().goldPct; }
export function relicDropMult()     { return 1 + relicTotals().dropPct; }
export function relicElemMult()     { return Math.min(2.5, 1 + relicTotals().elemPct); }
export function relicCritFlat()     { return relicTotals().critFlat; }
export function relicArmorFlat()    { return relicTotals().armorFlat; }
export function relicLifesteal()    { return relicTotals().lifesteal; }

// Total relics owned (with stacks).
export function relicCount() {
  return Object.values(state.prestige?.relics || {}).reduce((s, n) => s + (n || 0), 0);
}

// === Relic combat effects (build-defining behaviours, à la legendaryEffects) ===
// Returns { effectId: totalCopies } for owned relics that carry an `effect`.
// Magnitude in resolveFight scales with the copy count.
export function relicEffects() {
  const out = {};
  const owned = state.prestige?.relics || {};
  for (const [id, count] of Object.entries(owned)) {
    const def = RELIC_BY_ID[id];
    if (def && def.effect && count > 0) out[def.effect] = (out[def.effect] || 0) + count;
  }
  return out;
}

// === Rank gating ===
// Rank 2 relics unlock once the player is deep enough in prestige.
export function maxRelicRank(level) {
  return (level || 0) >= RELIC_RANK2_PRESTIGE ? 2 : 1;
}
export function unlockedRelics(level) {
  const cap = maxRelicRank(level);
  return RELICS.filter(r => (r.rank || 1) <= cap);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Pick `n` distinct relic ids for an ascension choice. Respects rank unlock and
// favours not-yet-owned relics (anti-malchance) so the player keeps seeing new
// options until the unlocked pool is collected, then falls back to stackables.
export function rollRelicChoice(n = 3) {
  const level = state.prestige?.level || 0;
  const owned = state.prestige?.relics || {};
  const pool = unlockedRelics(level).map(r => r.id);
  const fresh = shuffle(pool.filter(id => !owned[id]));
  const stack = shuffle(pool.filter(id => owned[id]));
  const ordered = [...fresh, ...stack];
  return ordered.slice(0, Math.min(n, ordered.length));
}

// Grant a chosen relic and clear the pending choice + reroll budget.
export function chooseRelic(id) {
  if (!RELIC_BY_ID[id]) return false;
  if (!state.prestige.relics) state.prestige.relics = {};
  const pending = state.prestige.pendingRelicChoice || [];
  if (!pending.includes(id)) return false;
  state.prestige.relics[id] = (state.prestige.relics[id] || 0) + 1;
  state.prestige.pendingRelicChoice = null;
  state.prestige.pendingRelicRerolls = 0;
  return true;
}

// Reroll the pending relic choice (limited free rerolls per ascension).
export function canRerollRelic() {
  return !!(state.prestige?.pendingRelicChoice?.length) && (state.prestige?.pendingRelicRerolls || 0) > 0;
}
export function rerollRelicChoice() {
  if (!canRerollRelic()) return false;
  state.prestige.pendingRelicRerolls -= 1;
  state.prestige.pendingRelicChoice = rollRelicChoice(3);
  return true;
}
