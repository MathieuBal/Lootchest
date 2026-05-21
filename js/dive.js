// Deep Dive: a roguelite endurance run. HP carries across a chain of fights,
// you push as deep as you can, banking escalating gold. Every few depths a
// checkpoint lets you pick a boon and decide to push on or cash out. Dying
// only costs you half of the gold earned since the last checkpoint.
//
// The session is transient (module-level): reloading mid-dive abandons the run.
// Only the best depth + dive count persist (state.dive).
import { state, notify } from './state.js';
import { CURRENCY_TYPES } from './data.js';

export const DIVE_CHECKPOINT_EVERY = 3;
export const DIVE_HEAL_PER_WIN = 0.08;   // % max HP healed after each won fight
export const DIVE_UNLOCK_FLOOR = 10;

export const DIVE_BOONS = [
  { id: 'rest',  emoji: '💚', name: 'Repos',    desc: 'Soigne 45% de tes PV max maintenant.' },
  { id: 'fury',  emoji: '⚔️', name: 'Furie',    desc: '+15% dégâts pour le reste de la plongée.' },
  { id: 'ward',  emoji: '🛡', name: 'Égide',    desc: '−12% dégâts subis pour le reste de la plongée.' },
  { id: 'vigor', emoji: '❤️', name: 'Vigueur',  desc: '+20% PV max (et soigne d\'autant).' },
  { id: 'greed', emoji: '💰', name: 'Cupidité', desc: '+50% d\'or banké pour le reste de la plongée.' },
];
export const DIVE_BOON_BY_ID = Object.fromEntries(DIVE_BOONS.map(b => [b.id, b]));

let session = null;

export function getSession() { return session; }
export function isDiving() { return !!session && session.active; }
export function canDive() { return (state.combat?.highestUnlocked || 1) >= DIVE_UNLOCK_FLOOR; }

export function startDive() {
  if (!canDive() || isDiving()) return false;
  session = {
    active: true,
    baseFloor: Math.max(1, state.combat?.highestUnlocked || 1),
    depth: 0,
    hp: null,                 // null → first fight starts at full HP
    maxHp: 0,
    securedGold: 0,           // locked in (100% kept on death)
    pendingGold: 0,           // since last checkpoint (50% kept on death)
    securedOrbs: {},
    pendingOrbs: {},
    mods: { damageMult: 1, dmgTakenMult: 1, maxHpMult: 1 },
    goldMult: 1,
    pendingBoon: null,        // [boonId, boonId, boonId] awaiting a pick
  };
  notify();
  return true;
}

// Carried HP for the next fight (undefined = full).
export function nextStartHp() {
  return session && session.hp != null ? session.hp : undefined;
}
export function diveMods() { return session ? session.mods : {}; }
export function diveDepth() { return session ? session.depth : 0; }

function bankOrb(map) {
  // Bias toward more common orbs.
  const pool = CURRENCY_TYPES.map(c => ({ id: c.id, w: c.baseDropChance }));
  const total = pool.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of pool) { r -= p.w; if (r <= 0) { map[p.id] = (map[p.id] || 0) + 1; return; } }
}

// Record a won dive fight. Returns { gold, depth, checkpoint }.
export function recordWin(monster, result) {
  if (!session) return null;
  session.depth += 1;
  session.maxHp = result.playerMaxHp;
  session.hp = Math.min(result.playerMaxHp, result.playerHpLeft + Math.round(result.playerMaxHp * DIVE_HEAL_PER_WIN));
  const gold = Math.round((monster.goldReward || 0) * session.goldMult);
  session.pendingGold += gold;
  const checkpoint = session.depth % DIVE_CHECKPOINT_EVERY === 0;
  if (checkpoint) {
    bankOrb(session.pendingOrbs);
    // Secure everything earned since the last checkpoint.
    session.securedGold += session.pendingGold;
    session.pendingGold = 0;
    for (const [k, q] of Object.entries(session.pendingOrbs)) session.securedOrbs[k] = (session.securedOrbs[k] || 0) + q;
    session.pendingOrbs = {};
  }
  notify();
  return { gold, depth: session.depth, checkpoint };
}

// Roll 3 distinct boon choices for the current checkpoint.
export function openBoonChoice() {
  if (!session) return [];
  const pool = DIVE_BOONS.map(b => b.id);
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  session.pendingBoon = out;
  notify();
  return out;
}

export function chooseBoon(id) {
  if (!session || !session.pendingBoon || !session.pendingBoon.includes(id)) return false;
  const max = session.maxHp || 0;
  if (id === 'rest')  session.hp = Math.min(max, (session.hp || max) + Math.round(max * 0.45));
  else if (id === 'fury')  session.mods.damageMult += 0.15;
  else if (id === 'ward')  session.mods.dmgTakenMult = Math.max(0.3, session.mods.dmgTakenMult - 0.12);
  else if (id === 'vigor') { session.mods.maxHpMult += 0.20; session.hp = (session.hp || max) + Math.round(max * 0.20); }
  else if (id === 'greed') session.goldMult += 0.50;
  session.pendingBoon = null;
  notify();
  return true;
}

// End the dive. died=true halves the unsecured (pending) winnings.
export function finalizeDive(died) {
  if (!session) return null;
  const gold = session.securedGold + Math.round(session.pendingGold * (died ? 0.5 : 1));
  const orbs = {};
  const merge = (map, factor) => {
    for (const [k, q] of Object.entries(map)) {
      const qq = Math.round(q * factor);
      if (qq > 0) orbs[k] = (orbs[k] || 0) + qq;
    }
  };
  merge(session.securedOrbs, 1);
  merge(session.pendingOrbs, died ? 0.5 : 1);
  state.gold += gold;
  for (const [k, q] of Object.entries(orbs)) state.orbs[k] = (state.orbs[k] || 0) + q;
  if (!state.dive) state.dive = { bestDepth: 0, totalDives: 0 };
  state.dive.bestDepth = Math.max(state.dive.bestDepth || 0, session.depth);
  state.dive.totalDives = (state.dive.totalDives || 0) + 1;
  const summary = { depth: session.depth, gold, orbs, died, best: state.dive.bestDepth };
  session = null;
  notify();
  return summary;
}
