// The Village: a management/idle layer that gives accumulated gold (and dungeon
// activity) a lasting purpose, and paces overall progression.
//
// Hybrid production: a modest passive trickle over real time (capped offline)
// PLUS the dungeon as the main faucet (kills/floors drop wood & stone).
//
// Mutual gating: the Town Hall (mairie) level caps building levels + slots and
// is itself gated by dungeon depth — so the character and the village level up
// together instead of the player rushing the dungeon in 10 minutes.
import { state, notify } from './state.js';

export const OFFLINE_CAP_MIN = 480; // passive production accrues at most 8h offline

// Production buildings. `produces` is a resource key or 'keys'. A building runs
// only with assigned workers; output scales with level × workers (workers per
// building are capped at its level). Houses give worker capacity instead.
export const BUILDINGS = [
  { id: 'houses',    emoji: '🏠', name: 'Maisons',     produces: null,    perWorker: 0,
    desc: '+3 ouvriers par niveau.' },
  { id: 'sawmill',   emoji: '🪓', name: 'Scierie',     produces: 'wood',  perWorker: 4,
    desc: 'Produit du bois (par ouvrier/min).' },
  { id: 'quarry',    emoji: '⛏️', name: 'Carrière',    produces: 'stone', perWorker: 3,
    desc: 'Produit de la pierre (par ouvrier/min).' },
  { id: 'locksmith', emoji: '🗝️', name: 'Serrurerie',  produces: 'keys',  perWorker: 0.5,
    desc: 'Forge des clés de coffre (par ouvrier/min).' },
];
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export const PRODUCERS = BUILDINGS.filter(b => b.produces); // count against build slots

function v() { return state.village; }

// ── Capacities & gates ───────────────────────────────────────
export function townhall() { return v()?.townhall || 1; }
export function maxBuildingLevel() { return townhall(); }            // buildings cap at town hall level
export function buildingSlots() { return 2 + townhall(); }           // how many producers can exist
export function workerCap() { return (v()?.buildings?.houses || 0) * 3; }
export function workersUsed() {
  const w = v()?.workers || {};
  return Object.values(w).reduce((s, n) => s + (n || 0), 0);
}
export function workersFree() { return workerCap() - workersUsed(); }
export function producersBuilt() { return PRODUCERS.filter(b => (v()?.buildings?.[b.id] || 0) > 0).length; }

export function levelOf(id) { return v()?.buildings?.[id] || 0; }
export function workersOn(id) { return v()?.workers?.[id] || 0; }

// ── Costs ────────────────────────────────────────────────────
// Geometric scaling so resources & gold stay relevant deep into the game.
export function buildCost(id) {
  const lvl = levelOf(id);
  const k = Math.pow(1.7, lvl);
  if (id === 'houses')    return { wood: Math.round(40 * k), stone: Math.round(20 * k), gold: Math.round(150 * Math.pow(2.1, lvl)) };
  if (id === 'sawmill')   return { wood: Math.round(25 * k), stone: Math.round(35 * k), gold: Math.round(120 * Math.pow(2.1, lvl)) };
  if (id === 'quarry')    return { wood: Math.round(40 * k), stone: Math.round(20 * k), gold: Math.round(120 * Math.pow(2.1, lvl)) };
  if (id === 'locksmith') return { wood: Math.round(60 * k), stone: Math.round(60 * k), gold: Math.round(400 * Math.pow(2.2, lvl)) };
  return { wood: 0, stone: 0, gold: 0 };
}

export function townhallCost() {
  const L = townhall();
  return { wood: Math.round(120 * Math.pow(1.8, L - 1)), stone: Math.round(100 * Math.pow(1.8, L - 1)), gold: Math.round(2000 * Math.pow(2.4, L - 1)) };
}
// Town hall level L+1 requires a dungeon depth milestone — the mutual gate.
export function townhallFloorReq() { return townhall() * 5; }
export function townhallFloorMet() { return (state.combat?.highestUnlocked || 1) >= townhallFloorReq(); }

function canAfford(cost) {
  return (v().resources.wood || 0) >= cost.wood
      && (v().resources.stone || 0) >= cost.stone
      && (state.gold || 0) >= cost.gold;
}
function pay(cost) {
  v().resources.wood -= cost.wood;
  v().resources.stone -= cost.stone;
  state.gold -= cost.gold;
}

// ── Build / upgrade ──────────────────────────────────────────
export function canBuild(id) {
  const lvl = levelOf(id);
  if (lvl >= maxBuildingLevel()) return false;                 // capped by town hall
  // New producer needs a free build slot
  const b = BUILDING_BY_ID[id];
  if (b.produces && lvl === 0 && producersBuilt() >= buildingSlots()) return false;
  return canAfford(buildCost(id));
}
export function buildOrUpgrade(id) {
  if (!canBuild(id)) return false;
  pay(buildCost(id));
  v().buildings[id] = levelOf(id) + 1;
  notify();
  return true;
}

export function canUpgradeTownhall() {
  return townhallFloorMet() && canAfford(townhallCost());
}
export function upgradeTownhall() {
  if (!canUpgradeTownhall()) return false;
  pay(townhallCost());
  v().townhall = townhall() + 1;
  notify();
  return true;
}

// ── Worker assignment ────────────────────────────────────────
// A producer employs at most `level` workers; total assigned ≤ workerCap.
export function maxWorkersOn(id) { return BUILDING_BY_ID[id].produces ? levelOf(id) : 0; }
export function canAssign(id) { return workersOn(id) < maxWorkersOn(id) && workersFree() > 0; }
export function canUnassign(id) { return workersOn(id) > 0; }
export function assignWorker(id, delta) {
  if (!v().workers) v().workers = {};
  if (delta > 0 && !canAssign(id)) return false;
  if (delta < 0 && !canUnassign(id)) return false;
  v().workers[id] = workersOn(id) + delta;
  notify();
  return true;
}

// ── Production ───────────────────────────────────────────────
// Per-minute output of a building given its level and assigned workers.
export function ratePerMin(id) {
  const b = BUILDING_BY_ID[id];
  if (!b || !b.produces) return 0;
  const lvl = levelOf(id);
  const workers = Math.min(workersOn(id), lvl);
  return b.perWorker * lvl * workers;
}
export function rates() {
  const out = { wood: 0, stone: 0, keys: 0 };
  for (const b of PRODUCERS) out[b.produces] += ratePerMin(b.id);
  return out;
}

function addResource(key, amount) {
  if (amount <= 0) return;
  if (key === 'keys') state.keys = (state.keys || 0) + amount;
  else v().resources[key] = (v().resources[key] || 0) + amount;
}

// Accrue passive production since lastTick (called on a timer + on load).
// Keys accrue as a fractional buffer so slow producers still pay out.
export function accruePassive() {
  if (!v()) return { wood: 0, stone: 0, keys: 0 };
  const now = Date.now();
  const dtMin = Math.min(OFFLINE_CAP_MIN, Math.max(0, (now - (v().lastTick || now)) / 60000));
  v().lastTick = now;
  if (dtMin <= 0) return { wood: 0, stone: 0, keys: 0 };
  const r = rates();
  const gained = { wood: r.wood * dtMin, stone: r.stone * dtMin, keys: r.keys * dtMin };
  v().resources.wood = (v().resources.wood || 0) + gained.wood;
  v().resources.stone = (v().resources.stone || 0) + gained.stone;
  // Keys: accumulate fractional buffer, pay out whole keys.
  v()._keyBuf = (v()._keyBuf || 0) + gained.keys;
  const whole = Math.floor(v()._keyBuf);
  if (whole > 0) { state.keys = (state.keys || 0) + whole; v()._keyBuf -= whole; }
  return gained;
}

// Dungeon faucet: kills/floors drop wood & stone (the main income source).
export function grantDungeonResources(floor, isBoss, isElite) {
  if (!v()) return null;
  const mult = isBoss ? 5 : (isElite ? 2.5 : 1);
  const wood = Math.round((2 + floor * 0.6) * mult);
  const stone = Math.round((1 + floor * 0.45) * mult);
  v().resources.wood = (v().resources.wood || 0) + wood;
  v().resources.stone = (v().resources.stone || 0) + stone;
  return { wood, stone };
}

export function woodStone() {
  return { wood: Math.floor(v()?.resources?.wood || 0), stone: Math.floor(v()?.resources?.stone || 0) };
}
