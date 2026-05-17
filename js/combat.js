// Combat / dungeon logic. Resolution is instant (no per-turn animation in V1).
import { state, notify } from './state.js';
import { computeStats } from './character.js';
import { PLAYER_BASE, biomeForFloor } from './data.js';
import { generateItem } from './loot.js';
import { damageMultiplier, hpMultiplier, monsterGoldMultiplier } from './talents.js';

export function isBossFloor(floor) {
  return floor > 0 && floor % 5 === 0;
}

// Pseudo-random but stable per floor: same floor always shows same monster.
// Monster pool is determined by the floor's biome.
function pickStableMonster(floor) {
  const biome = biomeForFloor(floor);
  if (isBossFloor(floor)) return biome.boss;
  return biome.monsters[floor % biome.monsters.length];
}

export function generateMonster(floor) {
  const boss = isBossFloor(floor);
  const base = pickStableMonster(floor);
  const scale = 1 + (floor - 1) * 0.28;
  const bossMult = boss ? 2.6 : 1;
  return {
    name: boss ? `${base.name} (BOSS)` : base.name,
    emoji: base.emoji,
    hp: Math.round(base.hpBase * scale * bossMult),
    damage: Math.round(base.dmgBase * scale * bossMult),
    armor: Math.round((base.armorBase || 0) * scale * bossMult),
    goldReward: Math.round(base.goldBase * scale * (boss ? 6 : 1)),
    dropChance: boss ? 1 : Math.min(0.6, 0.05 + floor * 0.015),
    isBoss: boss,
    floor,
  };
}

// Returns { won, log[], turns, damageTaken, playerMaxHp, events[] }
// events: array of { type: 'player_hit' | 'monster_hit', dmg, isCrit?, monsterHp, playerHp }
export function resolveFight(monster) {
  const stats = computeStats();
  const playerMaxHp = Math.round((PLAYER_BASE.hp + (stats.vitality || 0) * 5) * hpMultiplier());
  const playerDmg = Math.max(1, Math.round((PLAYER_BASE.damage + (stats.damage || 0)) * damageMultiplier()) - monster.armor);
  const playerArmor = (stats.armor || 0);
  const monsterDmg = Math.max(1, monster.damage - playerArmor);
  const critChance = Math.min(0.75, (stats.crit || 0) / 100);
  const fireBonus = (stats.fireDmg || 0) / 100;

  let pHp = playerMaxHp;
  let mHp = monster.hp;
  let turns = 0;
  const maxTurns = 200;
  const events = [];
  while (turns < maxTurns) {
    turns++;
    const isCrit = Math.random() < critChance;
    const hit = Math.round(playerDmg * (isCrit ? 2 : 1) * (1 + fireBonus * Math.random()));
    mHp = Math.max(0, mHp - hit);
    events.push({ type: 'player_hit', dmg: hit, isCrit, monsterHp: mHp, playerHp: pHp });
    if (mHp <= 0) break;
    pHp = Math.max(0, pHp - monsterDmg);
    events.push({ type: 'monster_hit', dmg: monsterDmg, monsterHp: mHp, playerHp: pHp });
    if (pHp <= 0) break;
  }
  const won = mHp <= 0;
  const log = [
    `Vous (${playerMaxHp} PV, ${playerDmg} dmg) vs ${monster.name} (${monster.hp} PV, ${monster.damage} dmg)`,
  ];
  if (won) {
    log.push(`Victoire en ${turns} tours · PV restants : ${Math.max(0, pHp)}/${playerMaxHp}`);
    log.push(`+${monster.goldReward} 💰`);
  } else {
    log.push(`Défaite après ${turns} tours. Reviens plus fort !`);
  }
  return { won, log, turns, playerHpLeft: Math.max(0, pHp), playerMaxHp, events };
}

// Reward template for crossing a milestone (every 25 floors).
function buildMilestoneReward(level) {
  return {
    gold: Math.floor(500 * Math.pow(level, 1.8)),
    orbs: {
      chaos:  Math.min(5, level),
      pierre: Math.min(3, Math.ceil(level / 2)),
      exil:   Math.max(0, Math.min(3, level - 1)),
      maitre: Math.max(0, Math.min(2, Math.floor(level / 2))),
    },
  };
}

function grantMilestoneReward(level) {
  const reward = buildMilestoneReward(level);
  state.gold += reward.gold;
  for (const [orbId, qty] of Object.entries(reward.orbs)) {
    if (qty > 0) state.orbs[orbId] = (state.orbs[orbId] || 0) + qty;
  }
  // +1 talent point per milestone
  state.talentPoints = (state.talentPoints || 0) + 1;
  reward.talentPoints = 1;
  return reward;
}

// Returns { result, monster, droppedItem, advanced, milestone }
export function attemptCurrentFloor() {
  const floor = state.combat.currentFloor;
  const monster = generateMonster(floor);
  const result = resolveFight(monster);

  let droppedItem = null;
  let advanced = false;
  let milestone = null;
  if (result.won) {
    state.combat.kills += 1;
    if (monster.isBoss) {
      state.combat.bossKills += 1;
      // Codex: track boss kills per biome
      const biome = biomeForFloor(floor);
      if (state.codex && biome) {
        state.codex.bosses[biome.id] = (state.codex.bosses[biome.id] || 0) + 1;
      }
    }
    monster.goldReward = Math.round(monster.goldReward * monsterGoldMultiplier());
    state.gold += monster.goldReward;

    if (Math.random() < monster.dropChance) {
      const itemTier = Math.min(5, Math.max(1, Math.ceil(floor / 5)));
      droppedItem = generateItem(itemTier);
      if (monster.isBoss && (droppedItem.rarity === 'common' || droppedItem.rarity === 'magic')) {
        droppedItem = generateItem(itemTier);
      }
    }

    if (floor === state.combat.highestUnlocked) {
      state.combat.highestUnlocked = floor + 1;
      advanced = true;
      // Milestone crossed? Only on first-time progression beyond a multiple of 25.
      if (floor > 0 && floor % 25 === 0) {
        const level = floor / 25;
        const reward = grantMilestoneReward(level);
        milestone = { floor, level, reward };
      }
    }
    state.combat.currentFloor = floor + 1;
  } else {
    state.combat.deaths += 1;
  }
  notify();
  return { result, monster, droppedItem, advanced, milestone };
}

export function setCurrentFloor(floor) {
  const f = Math.max(1, Math.min(state.combat.highestUnlocked, floor | 0));
  state.combat.currentFloor = f;
  notify();
}

// Predict difficulty for UI ("Facile" / "Risqué" / "Difficile" / "Suicide")
export function predictDifficulty(monster) {
  const stats = computeStats();
  const playerMaxHp = PLAYER_BASE.hp + (stats.vitality || 0) * 5;
  const playerDmg = Math.max(1, PLAYER_BASE.damage + (stats.damage || 0) - monster.armor);
  const monsterDmg = Math.max(1, monster.damage - (stats.armor || 0));
  const critChance = Math.min(0.75, (stats.crit || 0) / 100);
  const fireBonus = (stats.fireDmg || 0) / 100;
  const avgDmg = playerDmg * (1 + critChance + fireBonus);
  const turnsToKill = Math.ceil(monster.hp / avgDmg);
  const damageTaken = monsterDmg * Math.max(0, turnsToKill - 1);
  const ratio = damageTaken / playerMaxHp;
  if (ratio < 0.25) return { label: 'Facile',   color: '#6acc6a' };
  if (ratio < 0.6)  return { label: 'Modéré',   color: '#ffe14a' };
  if (ratio < 0.95) return { label: 'Risqué',   color: '#ff7a1a' };
  if (ratio < 1.5)  return { label: 'Difficile',color: '#ff3050' };
  return { label: 'Suicide', color: '#b35bd6' };
}
