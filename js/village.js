// The Village: a management/idle layer that gives accumulated gold (and dungeon
// activity) a lasting purpose, and paces overall progression.
//
// Hybrid production: a modest passive trickle over real time (capped offline)
// PLUS the dungeon as the main faucet (kills/floors drop wood & stone).
//
// Mutual gating: the Town Hall (mairie) level caps building levels + slots and
// is itself gated by dungeon depth — so the character and the village level up
// together instead of the player rushing the dungeon in 10 minutes.
import { state, notify, grantKeys } from './state.js';
import { RARITIES, RARITY_BY_ID, SLOT_BY_ID, CURRENCY_TYPES } from './data.js';

export const OFFLINE_CAP_MIN = 480; // passive production accrues at most 8h offline

// Buildings come in three kinds:
//  - houses   : gives worker capacity (no production)
//  - producer : runs with assigned workers; output = level × workers × perWorker
//  - station  : enables an action (the Forge enables weapon crafting)
// `townhallReq` gates when a building can first be built (the Age spine).
export const BUILDINGS = [
  { id: 'houses',    emoji: '🏠', name: 'Maisons',    kind: 'houses',   townhallReq: 1, perWorker: 0,
    desc: '+3 ouvriers par niveau.' },
  { id: 'sawmill',   emoji: '🪓', name: 'Scierie',    kind: 'producer', townhallReq: 1, produces: 'wood',  perWorker: 4,
    desc: 'Produit du bois (par ouvrier/min).' },
  { id: 'quarry',    emoji: '⛏️', name: 'Carrière',   kind: 'producer', townhallReq: 1, produces: 'stone', perWorker: 3,
    desc: 'Produit de la pierre (par ouvrier/min).' },
  { id: 'locksmith', emoji: '🗝️', name: 'Serrurerie', kind: 'producer', townhallReq: 2, produces: 'keys',  perWorker: 0.1,
    desc: 'Forge des clés de coffre (par ouvrier/min).' },
  { id: 'market',    emoji: '🏪', name: 'Marché',     kind: 'station',  townhallReq: 2, perWorker: 0,
    desc: '+6% prix de vente/niv & débloque la vente auto gratuitement.' },
  { id: 'forge',     emoji: '⚒️', name: 'Forge',      kind: 'station',  townhallReq: 3, perWorker: 0,
    desc: 'Forge tes propres armes & armures (niveau = tier max).' },
  { id: 'observatory', emoji: '🔭', name: 'Observatoire', kind: 'station', townhallReq: 3, perWorker: 0,
    desc: '+3% de chance d\'objets rares+ par niveau (donjon & coffres).' },
  { id: 'barracks',  emoji: '⚔️', name: 'Caserne',    kind: 'station',  townhallReq: 4, perWorker: 0,
    desc: '+4% dégâts & +4% PV max par niveau (permanent).' },
  { id: 'guild',     emoji: '📜', name: 'Guilde',     kind: 'station',  townhallReq: 4, perWorker: 0,
    desc: '+1 contrat actif & -15% coût de relance par niveau.' },
  { id: 'foundry',   emoji: '🏭', name: 'Fonderie',   kind: 'producer', townhallReq: 5, produces: 'metal', perWorker: 2,
    desc: 'Produit du métal (par ouvrier/min).' },
  { id: 'vault',     emoji: '🏦', name: 'Trésorerie', kind: 'station',  townhallReq: 5, perWorker: 0,
    desc: '+5% d\'or gagné en donjon par niveau.' },
  { id: 'orbworks',  emoji: '🔮', name: "Atelier d'orbes", kind: 'producer', townhallReq: 6, produces: 'orbs', perWorker: 0.15,
    desc: 'Produit des orbes de forge (par ouvrier/min).' },
  { id: 'sanctuary', emoji: '💠', name: 'Sanctuaire',  kind: 'producer', townhallReq: 8, produces: 'essence', perWorker: 0.5,
    desc: "Distille de l'essence (par ouvrier/min) — requise pour forger l'ancestral." },
];
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export const PRODUCERS = BUILDINGS.filter(b => b.kind === 'producer'); // count against build slots

// Ages: a progression spine derived from the town hall level. Each unlocks
// the next tier of buildings/resources.
export const AGES = [
  { id: 'wood',  name: 'Âge du Bois',    emoji: '🪵', minTownhall: 1 },
  { id: 'stone', name: 'Âge de la Pierre', emoji: '🪨', minTownhall: 3 },
  { id: 'iron',  name: 'Âge du Fer',     emoji: '⚙️', minTownhall: 5 },
  { id: 'steel', name: "Âge de l'Acier", emoji: '🛡️', minTownhall: 8 },
];
export function currentAge() {
  let age = AGES[0];
  for (const a of AGES) if (townhall() >= a.minTownhall) age = a;
  return age;
}

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
  const g = (base, r) => Math.round(base * Math.pow(r, lvl));
  // Metal is only required from level 4→5 onward (which needs town hall 5, i.e.
  // the Foundry, the only metal source) so buildings that unlock earlier (Forge
  // TH3, Caserne TH4) are never blocked waiting for a metal source.
  const m = (per) => (lvl >= 4 ? Math.round(per * lvl * k / 1.7) : 0);
  if (id === 'houses')      return { wood: Math.round(40 * k), stone: Math.round(20 * k), metal: 0, gold: g(150, 2.1) };
  if (id === 'sawmill')     return { wood: Math.round(25 * k), stone: Math.round(35 * k), metal: 0, gold: g(120, 2.1) };
  if (id === 'quarry')      return { wood: Math.round(40 * k), stone: Math.round(20 * k), metal: 0, gold: g(120, 2.1) };
  if (id === 'market')      return { wood: Math.round(50 * k), stone: Math.round(50 * k), metal: 0, gold: g(500, 2.2) };
  if (id === 'locksmith')   return { wood: Math.round(60 * k), stone: Math.round(60 * k), metal: 0, gold: g(400, 2.2) };
  if (id === 'forge')       return { wood: Math.round(80 * k), stone: Math.round(120 * k), metal: m(20), gold: g(800, 2.3) };
  if (id === 'observatory') return { wood: Math.round(100 * k), stone: Math.round(90 * k), metal: m(12), gold: g(1200, 2.3) };
  if (id === 'barracks')    return { wood: Math.round(90 * k), stone: Math.round(110 * k), metal: m(15), gold: g(700, 2.3) };
  if (id === 'guild')       return { wood: Math.round(110 * k), stone: Math.round(130 * k), metal: m(12), gold: g(1500, 2.3) };
  if (id === 'foundry')     return { wood: Math.round(100 * k), stone: Math.round(140 * k), metal: 0, gold: g(1000, 2.3) };
  if (id === 'vault')       return { wood: Math.round(130 * k), stone: Math.round(130 * k), metal: m(18), gold: g(2500, 2.4) };
  if (id === 'orbworks')    return { wood: Math.round(120 * k), stone: Math.round(120 * k), metal: m(30), gold: g(1500, 2.4) };
  return { wood: 0, stone: 0, metal: 0, gold: 0 };
}

export function townhallCost() {
  const L = townhall();
  return { wood: Math.round(120 * Math.pow(1.8, L - 1)), stone: Math.round(100 * Math.pow(1.8, L - 1)), gold: Math.round(2000 * Math.pow(2.4, L - 1)) };
}
// Town hall level L+1 requires a dungeon depth milestone — the mutual gate.
export function townhallFloorReq() { return townhall() * 5; }
export function townhallFloorMet() { return (state.combat?.highestUnlocked || 1) >= townhallFloorReq(); }

function canAfford(cost) {
  return (v().resources.wood || 0) >= (cost.wood || 0)
      && (v().resources.stone || 0) >= (cost.stone || 0)
      && (v().resources.metal || 0) >= (cost.metal || 0)
      && (v().resources.essence || 0) >= (cost.essence || 0)
      && (state.gold || 0) >= (cost.gold || 0);
}
function pay(cost) {
  v().resources.wood -= (cost.wood || 0);
  v().resources.stone -= (cost.stone || 0);
  v().resources.metal = (v().resources.metal || 0) - (cost.metal || 0);
  v().resources.essence = (v().resources.essence || 0) - (cost.essence || 0);
  state.gold -= (cost.gold || 0);
}

// ── Build / upgrade (with construction time) ─────────────────
// Building isn't instant: paying starts a timed construction job (one at a
// time). The level applies when the job completes (tickConstruction), so the
// village visibly grows over time. Offline progress is honoured via timestamps.
export function buildDurationMs(currentLevel) {
  return Math.min(240000, 10000 + (currentLevel || 0) * 8000); // 10s → 4min cap
}
export function isBusy() { return !!v()?.construction; }
export function buildingUnderConstruction() { return v()?.construction?.id || null; }
export function constructionState() {
  const c = v()?.construction;
  if (!c) return null;
  const now = Date.now();
  const elapsed = Math.max(0, now - c.start);
  return { id: c.id, level: c.level, durationMs: c.duration, remainingMs: Math.max(0, c.duration - elapsed),
    progress: Math.min(1, c.duration ? elapsed / c.duration : 1) };
}
// Apply a finished job. Returns the completed building id (for the UI effect).
export function tickConstruction() {
  const c = v()?.construction;
  if (!c) return null;
  if (Date.now() < c.start + c.duration) return null;
  if (c.id === 'townhall') v().townhall = c.level;
  else v().buildings[c.id] = c.level;
  v().construction = null;
  notify();
  return c.id;
}

export function isUnlocked(id) {
  const b = BUILDING_BY_ID[id];
  return !!b && townhall() >= b.townhallReq;
}
export function canBuild(id) {
  const b = BUILDING_BY_ID[id];
  if (!b || !isUnlocked(id)) return false;                     // gated by town hall / age
  if (isBusy()) return false;                                  // one construction at a time
  const lvl = levelOf(id);
  if (lvl >= maxBuildingLevel()) return false;                 // capped by town hall
  // New producer needs a free build slot
  if (b.kind === 'producer' && lvl === 0 && producersBuilt() >= buildingSlots()) return false;
  return canAfford(buildCost(id));
}
export function buildOrUpgrade(id) {
  if (!canBuild(id)) return false;
  pay(buildCost(id));
  v().construction = { id, level: levelOf(id) + 1, start: Date.now(), duration: buildDurationMs(levelOf(id)) };
  notify();
  return true;
}

export function canUpgradeTownhall() {
  return !isBusy() && townhallFloorMet() && canAfford(townhallCost());
}
export function upgradeTownhall() {
  if (!canUpgradeTownhall()) return false;
  pay(townhallCost());
  v().construction = { id: 'townhall', level: townhall() + 1, start: Date.now(), duration: buildDurationMs(townhall()) };
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
  const out = { wood: 0, stone: 0, metal: 0, keys: 0, orbs: 0, essence: 0 };
  for (const b of PRODUCERS) out[b.produces] += ratePerMin(b.id);
  return out;
}

// Caserne: permanent combat buff folded into resolveFight (like relics/talents).
export function villageCombatBonus() {
  const lvl = levelOf('barracks');
  return { dmgMult: 1 + lvl * 0.04, hpMult: 1 + lvl * 0.04 };
}

function grantRandomOrb() {
  const total = CURRENCY_TYPES.reduce((s, c) => s + c.baseDropChance, 0);
  let r = Math.random() * total;
  for (const c of CURRENCY_TYPES) { r -= c.baseDropChance; if (r <= 0) { state.orbs[c.id] = (state.orbs[c.id] || 0) + 1; return; } }
}

function addResource(key, amount) {
  if (amount <= 0) return;
  if (key === 'keys') grantKeys(amount); // BAL-011 : passe par le soft cap
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
  const gained = { wood: r.wood * dtMin, stone: r.stone * dtMin, metal: r.metal * dtMin, essence: r.essence * dtMin, keys: r.keys * dtMin, orbs: r.orbs * dtMin };
  v().resources.wood = (v().resources.wood || 0) + gained.wood;
  v().resources.stone = (v().resources.stone || 0) + gained.stone;
  v().resources.metal = (v().resources.metal || 0) + gained.metal;
  v().resources.essence = (v().resources.essence || 0) + gained.essence;
  // Keys & orbs: accumulate fractional buffers, pay out whole units.
  v()._keyBuf = (v()._keyBuf || 0) + gained.keys;
  const wholeKeys = Math.floor(v()._keyBuf);
  if (wholeKeys > 0) { grantKeys(wholeKeys); v()._keyBuf -= wholeKeys; } // BAL-011 : soft cap sur la prod idle
  v()._orbBuf = (v()._orbBuf || 0) + gained.orbs;
  let wholeOrbs = Math.floor(v()._orbBuf);
  v()._orbBuf -= wholeOrbs;
  while (wholeOrbs-- > 0) grantRandomOrb();
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
  const res = v()?.resources || {};
  return { wood: Math.floor(res.wood || 0), stone: Math.floor(res.stone || 0), metal: Math.floor(res.metal || 0), essence: Math.floor(res.essence || 0) };
}

// ── Forge: craft your own gear ───────────────────────────────
export function forgeLevel() { return levelOf('forge'); }
export function maxCraftTier() { return forgeLevel(); } // forge level = highest craftable tier
// Rarity cap rises with forge level: L1-2 magic, 3-4 rare, 5-6 epic, 7-8 legendary, 9+ ancestral.
export function maxCraftRarityIndex() {
  const L = forgeLevel();
  if (L >= 9) return 5;       // ancestral
  if (L >= 7) return 4;       // legendary
  if (L >= 5) return 3;       // epic
  if (L >= 3) return 2;       // rare
  if (L >= 1) return 1;       // magic
  return 0;                   // common
}
const RARITY_COST_MULT = { common: 1, magic: 1.5, rare: 2.5, epic: 4, legendary: 7, ancestral: 11 };
export function craftCost(tier, rarityId) {
  const rm = RARITY_COST_MULT[rarityId] || 1;
  const t = Math.max(1, tier);
  return {
    wood:  Math.round(40 * t * rm),
    stone: Math.round(40 * t * rm),
    // Metal only from tier 5+ (needs Forge lvl 5 → town hall 5 → Foundry).
    metal: t >= 5 ? Math.round(12 * t * rm) : 0,
    // Essence gates the very top: ancestral craft only (Forge lvl 9 → town
    // hall 9, by which point the Sanctuary at TH8 has been producing essence).
    essence: rarityId === 'ancestral' ? Math.round(6 * t) : 0,
    gold:  Math.round(250 * t * rm * rm),
  };
}
export function canCraft(slotId, rarityId) {
  if (forgeLevel() < 1) return false;
  if (!SLOT_BY_ID[slotId]) return false;
  const ri = RARITIES.findIndex(r => r.id === rarityId);
  if (ri < 0 || ri > maxCraftRarityIndex()) return false;
  return canAfford(craftCost(maxCraftTier(), rarityId));
}
// Validate + pay for a craft, returning the crafted item's tier (or null). The
// caller builds the item via loot.craftItem — keeps village.js free of a loot
// import (avoids a loot↔village import cycle).
export function commitCraft(slotId, rarityId) {
  if (!canCraft(slotId, rarityId)) return null;
  const tier = maxCraftTier();
  pay(craftCost(tier, rarityId));
  notify();
  return tier;
}

// ── Convenience bonuses (consumed by other systems) ──────────
export function villageSellMult()      { return 1 + levelOf('market') * 0.06; }       // +6% sell price/level
export function marketUnlocksAutoSell() { return levelOf('market') > 0; }              // free auto-sell unlocks
export function villageBountySlots()    { return levelOf('guild'); }                   // +1 active bounty/level
export function villageRerollMult()     { return Math.max(0.1, 1 - levelOf('guild') * 0.15); } // cheaper rerolls
export function villageGoldMult()       { return 1 + levelOf('vault') * 0.05; }        // +5% dungeon gold/level
export function villageRareMult()       { return 1 + levelOf('observatory') * 0.03; }  // +3% rare+ drop/level

// Total invested levels — drives the "prosperity" headline in the UI.
export function prosperity() {
  return BUILDINGS.reduce((s, b) => s + levelOf(b.id), 0) + (townhall() - 1);
}
