// Ascension relics: permanent, stackable build modifiers chosen at each ascension.
// state.prestige.relics is a map { relicId: count }. Effects are additive across
// counts and folded into the existing multiplier pipeline (talents/prestige).
import { state } from './state.js';
import { RELIC_BY_ID, RELICS } from './data.js';

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

// Pick `n` distinct random relic ids for an ascension choice.
export function rollRelicChoice(n = 3) {
  const pool = RELICS.map(r => r.id);
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// Grant a chosen relic and clear the pending choice.
export function chooseRelic(id) {
  if (!RELIC_BY_ID[id]) return false;
  if (!state.prestige.relics) state.prestige.relics = {};
  const pending = state.prestige.pendingRelicChoice || [];
  if (!pending.includes(id)) return false;
  state.prestige.relics[id] = (state.prestige.relics[id] || 0) + 1;
  state.prestige.pendingRelicChoice = null;
  return true;
}
