// Mimic encounter — push-your-luck mini-game that occasionally replaces a
// normal chest open. The player sees a 6-rung ladder of escalating rewards;
// at each rung they choose: take what's locked in, or flip a coin to climb.
// Losing the flip = bite (lose the haul, possibly extra punishment).
//
// Public API:
//   shouldTriggerMimic() → boolean
//   startMimicEncounter({ chestTier }) → encounter object
//   advanceMimic(encounter, choice: 'take' | 'risk') → updated encounter
// The UI layer reads encounter.state ('reveal'|'choosing'|'won'|'bitten')
// and renders accordingly. We only mutate game state when the encounter
// resolves ('won' or 'bitten').

import { state, notify } from './state.js';
import { MIMIC } from './data.js';
import { generateItemFromChest } from './loot.js';
import { rollOrbDrops } from './chest.js';

export function shouldTriggerMimic() {
  return Math.random() < MIMIC.triggerChance;
}

export function rollGolden() {
  return Math.random() < MIMIC.goldenChance;
}

// Force-escalate an item's rarity to at least the floor specified by the rung.
// We re-roll a fresh item and pick if it beats the floor, otherwise we promote.
function forgeMimicItem(chestTier, rarityFloor) {
  // Try a few times to land on or above the floor naturally
  const rarityOrder = ['common','magic','rare','epic','legendary','ancestral'];
  const floorIdx = rarityFloor ? rarityOrder.indexOf(rarityFloor) : 0;
  let item = generateItemFromChest(chestTier);
  let curIdx = rarityOrder.indexOf(item.rarity);
  for (let i = 0; i < 4 && curIdx < floorIdx; i++) {
    item = generateItemFromChest(chestTier);
    curIdx = rarityOrder.indexOf(item.rarity);
  }
  return item;
}

export function startMimicEncounter({ chestTier }) {
  return {
    golden: rollGolden(),
    chestTier,
    rung: 0,                   // current locked-in rung (0 = nothing yet)
    state: 'choosing',         // 'choosing' | 'won' | 'bitten'
    lastBite: null,
  };
}

// `choice`: 'take' = lock in current rung & end. 'risk' = flip coin to climb.
export function advanceMimic(encounter, choice) {
  if (encounter.state !== 'choosing') return encounter;

  if (choice === 'take') {
    if (encounter.rung === 0) {
      // chickened out before even climbing — small consolation
      encounter.rung = 1;
    }
    encounter.state = 'won';
    return resolveMimicWin(encounter);
  }
  if (choice === 'risk') {
    const nextRung = encounter.rung + 1;
    if (nextRung > MIMIC.ladder.length) {
      // Already at the top — auto-win
      encounter.state = 'won';
      return resolveMimicWin(encounter);
    }
    const biteP = MIMIC.biteCurve[nextRung - 1] || 0.85;
    if (Math.random() < biteP) {
      encounter.state = 'bitten';
      return resolveMimicLoss(encounter);
    }
    encounter.rung = nextRung;
    if (encounter.rung === MIMIC.ladder.length) {
      encounter.state = 'won';
      return resolveMimicWin(encounter);
    }
    return encounter;
  }
  return encounter;
}

function resolveMimicWin(encounter) {
  const rung = MIMIC.ladder[encounter.rung - 1];
  if (!rung) return encounter;
  const goldMult = rung.goldMult * (encounter.golden ? 2 : 1);
  const orbBonus = rung.orbBonus * (encounter.golden ? 2 : 1);

  // Item: rarity floored by the rung
  const item = forgeMimicItem(encounter.chestTier, rung.rarityFloor);
  // Gold: based on the chest's base value but scaled by the rung
  const baseGold = Math.max(30, encounter.chestTier * 80);
  const goldGain = Math.round(baseGold * goldMult);
  state.gold += goldGain;

  // Orbs: roll standard (rollOrbDrops already increments state.orbs) then
  // add the rung's bonus, which we increment manually.
  const orbs = rollOrbDrops(encounter.chestTier);
  for (let i = 0; i < orbBonus; i++) {
    const id = rollSingleOrb();
    state.orbs[id] = (state.orbs[id] || 0) + 1;
    orbs.push(id);
  }

  encounter.reward = { item, gold: goldGain, orbs };
  notify();
  return encounter;
}

function resolveMimicLoss(encounter) {
  // Pick a bite effect — weighted toward 'nip' on early rungs, 'curse' later
  const idx = encounter.rung >= 4 ? 2 : encounter.rung >= 2 ? 1 : 0;
  const bite = MIMIC.bite[idx];
  encounter.lastBite = bite;
  if (bite.effect.goldLossPct) {
    const loss = Math.floor((state.gold || 0) * bite.effect.goldLossPct);
    state.gold = Math.max(0, state.gold - loss);
    encounter.goldLost = loss;
  }
  if (bite.effect.keyLoss) {
    state.keys = Math.max(0, (state.keys || 0) - bite.effect.keyLoss);
  }
  notify();
  return encounter;
}

function rollSingleOrb() {
  // Quick weighted roll for a single bonus orb — favors commons.
  const pool = [
    ['transmu', 30], ['augm', 25], ['alte', 18], ['regal', 10],
    ['chaos', 7], ['pierre', 4], ['divin', 3], ['exil', 2], ['maitre', 1],
  ];
  const total = pool.reduce((a, [_, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [id, w] of pool) {
    r -= w;
    if (r <= 0) return id;
  }
  return 'transmu';
}
