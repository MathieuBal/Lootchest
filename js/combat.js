// Combat / dungeon logic. Resolution is instant (no per-turn animation in V1).
import { state, notify } from './state.js';
import { computeStats } from './character.js';
import { MONSTER_TYPES, BOSS_TYPES, PLAYER_BASE } from './data.js';
import { generateItem } from './loot.js';

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function isBossFloor(floor) {
  return floor > 0 && floor % 5 === 0;
}

// Pseudo-random but stable per floor: same floor always shows same monster name/emoji.
// Stats however are deterministic from floor (no rng).
function pickStableMonster(floor) {
  const pool = isBossFloor(floor) ? BOSS_TYPES : MONSTER_TYPES;
  return pool[floor % pool.length];
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

// Returns { won, log[], turns, damageTaken, playerMaxHp }
export function resolveFight(monster) {
  const stats = computeStats();
  const playerMaxHp = PLAYER_BASE.hp + (stats.vitality || 0) * 5;
  const playerDmg = Math.max(1, PLAYER_BASE.damage + (stats.damage || 0) - monster.armor);
  const playerArmor = (stats.armor || 0);
  const monsterDmg = Math.max(1, monster.damage - playerArmor);
  const critChance = Math.min(0.75, (stats.crit || 0) / 100);
  const fireBonus = (stats.fireDmg || 0) / 100;
  const avgDmg = playerDmg * (1 + critChance + fireBonus);

  // turn-based: each turn player hits, then if monster alive it hits back.
  let pHp = playerMaxHp;
  let mHp = monster.hp;
  let turns = 0;
  const maxTurns = 200;
  while (turns < maxTurns) {
    turns++;
    const isCrit = Math.random() < critChance;
    const hit = Math.round(playerDmg * (isCrit ? 2 : 1) * (1 + fireBonus * Math.random()));
    mHp -= hit;
    if (mHp <= 0) break;
    pHp -= monsterDmg;
    if (pHp <= 0) break;
  }
  const won = mHp <= 0;
  const log = [
    `Vous (${playerMaxHp} PV, ${playerDmg} dmg) vs ${monster.name} (${monster.hp} PV, ${monster.damage} dmg)`,
  ];
  if (won) {
    const damageTaken = playerMaxHp - Math.max(0, pHp);
    log.push(`Victoire en ${turns} tours · PV restants : ${Math.max(0, pHp)}/${playerMaxHp}`);
    log.push(`+${monster.goldReward} 💰`);
  } else {
    log.push(`Défaite après ${turns} tours. Reviens plus fort !`);
  }
  return { won, log, turns, playerHpLeft: Math.max(0, pHp), playerMaxHp };
}

// Returns { result, monster, droppedItem, advanced }
export function attemptCurrentFloor() {
  const floor = state.combat.currentFloor;
  const monster = generateMonster(floor);
  const result = resolveFight(monster);

  let droppedItem = null;
  let advanced = false;
  if (result.won) {
    state.combat.kills += 1;
    if (monster.isBoss) state.combat.bossKills += 1;
    state.gold += monster.goldReward;

    if (Math.random() < monster.dropChance) {
      // Item tier = floor / 5 (rounded up), capped to 5
      const itemTier = Math.min(5, Math.max(1, Math.ceil(floor / 5)));
      droppedItem = generateItem(itemTier);
      // Boss guarantees at least rare-tier rarity by re-rolling if too low
      if (monster.isBoss && (droppedItem.rarity === 'common' || droppedItem.rarity === 'magic')) {
        droppedItem = generateItem(itemTier);
        // (one re-roll is enough for soft guarantee)
      }
    }

    if (floor === state.combat.highestUnlocked) {
      state.combat.highestUnlocked = floor + 1;
      advanced = true;
    }
    state.combat.currentFloor = floor + 1;
  } else {
    state.combat.deaths += 1;
  }
  notify();
  return { result, monster, droppedItem, advanced };
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
