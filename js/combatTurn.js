// Turn-based battle engine — Pokémon-like layered on top of the same stat
// system as resolveFight, but driven by player actions one turn at a time.
// Lives alongside js/combat.js : resolveFight stays for dive auto-resolution
// and any other "play out the whole thing" use case ; createBattle/executeTurn
// are used by the interactive dungeon flow.
//
// Battle state is the source of truth between turns — the UI/main.js pass it
// back in for each new turn. The engine doesn't mutate any global game state
// (gold/inventory/etc.) ; that's the caller's job once the battle resolves.

import { state } from './state.js';
import { computeStats } from './character.js';
import { damageMultiplier, hpMultiplier } from './talents.js';
import { PLAYER_BASE, prestigeDamageMult, prestigeHpMult } from './data.js';
import { armorMitigation } from './combat.js';
import { getActiveSkills } from './skills.js';

// Cooldowns expressed in TURNS REMAINING until usable again.
const POWER_CD = 2;

// All possible player actions. Each can be queried for availability via
// canUseAction() — handles cooldowns, can't-defend-twice, no-flee-vs-boss.
export const ACTIONS = {
  attack: { id: 'attack', emoji: '⚔', label: 'Attaquer', desc: 'Coup normal.' },
  power:  { id: 'power',  emoji: '💥', label: 'Frappe Puissante', desc: '×2.2 dégâts, mais le monstre frappe en premier.' },
  defend: { id: 'defend', emoji: '🛡', label: 'Défendre', desc: '–60 % dégâts subis et soin 8 % PV max.' },
  flee:   { id: 'flee',   emoji: '🏃', label: 'Fuir',    desc: 'Quitte le combat sans récompense.' },
};

export function createBattle(monster, opts = {}) {
  const stats = computeStats();
  const pLvl = state.prestige?.level || 0;
  const pMaxHp = Math.round(
    (PLAYER_BASE.hp + (stats.vitality || 0) * 5)
    * hpMultiplier()
    * prestigeHpMult(pLvl)
  );
  const pBaseDmg = Math.max(1, Math.round(
    (PLAYER_BASE.damage + (stats.damage || 0))
    * damageMultiplier()
    * prestigeDamageMult(pLvl)
    * (1 - armorMitigation(monster.armor))
  ));
  const monsterDmg = Math.max(1, Math.round(
    monster.damage * (1 - armorMitigation(stats.armor || 0))
  ));
  return {
    monster,
    stats,
    pMaxHp, pHp: opts.startHp != null ? Math.max(1, Math.min(pMaxHp, opts.startHp)) : pMaxHp,
    pBaseDmg,
    mMaxHp: monster.hp,
    mHp: monster.hp,
    monsterDmg,
    turn: 0,
    cooldowns: { power: 0 },
    lastAction: null,
    defendStreak: 0,
    ended: false,
    won: null,
    fled: false,
  };
}

export function canUseAction(battle, actionId) {
  if (battle.ended) return false;
  switch (actionId) {
    case 'attack': return true;
    case 'power':  return (battle.cooldowns.power || 0) <= 0;
    case 'defend': return battle.lastAction !== 'defend';
    case 'flee':   return !battle.monster.isBoss && !battle.monster.isElite;
  }
  return false;
}

// Returns { events, ended, won } — does NOT mutate global state. Caller animates
// `events` (same shape as resolveFight events for compat) then re-calls.
export function executeTurn(battle, actionId) {
  if (!canUseAction(battle, actionId)) return { events: [], invalid: true, ended: battle.ended, won: battle.won };

  battle.turn += 1;
  const events = [];

  // Flee : terminates immediately, no exchange.
  if (actionId === 'flee') {
    battle.ended = true;
    battle.won = false;
    battle.fled = true;
    events.push({ type: 'player_flee', playerHp: battle.pHp, monsterHp: battle.mHp });
    return { events, ended: true, won: false, fled: true };
  }

  // Decrement cooldowns BEFORE we set new ones for this turn.
  for (const k of Object.keys(battle.cooldowns)) {
    if (battle.cooldowns[k] > 0) battle.cooldowns[k] -= 1;
  }

  // Action effects
  let playerFirst = true;
  let playerDmgMult = 1;
  let damageReduction = 0;
  let healPlanned = 0;
  let playerAttacks = true;

  if (actionId === 'power') {
    playerDmgMult = 2.2;
    playerFirst = false;
    battle.cooldowns.power = POWER_CD;
  } else if (actionId === 'defend') {
    playerAttacks = false;
    damageReduction = 0.6;
    healPlanned = Math.round(battle.pMaxHp * 0.08);
    battle.defendStreak += 1;
  } else if (actionId === 'attack') {
    battle.defendStreak = 0;
  }
  if (actionId !== 'defend') battle.defendStreak = 0;

  // Resolve turn in the chosen order.
  const order = playerFirst ? ['player', 'monster'] : ['monster', 'player'];
  for (const who of order) {
    if (battle.ended) break;
    if (who === 'player' && playerAttacks) {
      doPlayerAttack(battle, events, playerDmgMult);
      if (battle.mHp <= 0) { battle.ended = true; battle.won = true; }
    } else if (who === 'monster') {
      doMonsterAttack(battle, events, damageReduction);
      if (battle.pHp <= 0) { battle.ended = true; battle.won = false; }
    }
  }

  // End-of-turn heal (Defend).
  if (healPlanned > 0 && !battle.ended) {
    const before = battle.pHp;
    battle.pHp = Math.min(battle.pMaxHp, battle.pHp + healPlanned);
    const gained = battle.pHp - before;
    if (gained > 0) events.push({ type: 'skill_heal', amount: gained, emoji: '🛡', playerHp: battle.pHp, monsterHp: battle.mHp });
  }

  battle.lastAction = actionId;
  return { events, ended: battle.ended, won: battle.won };
}

function doPlayerAttack(battle, events, dmgMult) {
  const stats = battle.stats;
  const critChance = Math.min(0.75, (stats.crit || 0) / 100);
  const critDmgPct = 1 + (stats.critDmg || 50) / 100;
  const isCrit = Math.random() < critChance;
  const swingVar = 0.85 + Math.random() * 0.3;
  const dmg = Math.max(1, Math.round(battle.pBaseDmg * dmgMult * swingVar * (isCrit ? critDmgPct : 1)));
  battle.mHp -= dmg;
  events.push({ type: 'player_hit', dmg, isCrit, monsterHp: Math.max(0, battle.mHp), playerHp: battle.pHp });
}

function doMonsterAttack(battle, events, damageReduction) {
  const stats = battle.stats;
  // Dodge check
  const dodgeChance = Math.min(0.6, (stats.dodge || 0) / 100);
  if (Math.random() < dodgeChance) {
    events.push({ type: 'skill_dodge', playerHp: battle.pHp, monsterHp: battle.mHp });
    return;
  }
  const swingVar = 0.85 + Math.random() * 0.3;
  let dmg = Math.max(1, Math.round(battle.monsterDmg * swingVar * (1 - damageReduction)));
  battle.pHp -= dmg;
  events.push({ type: 'monster_hit', dmg, playerHp: Math.max(0, battle.pHp), monsterHp: battle.mHp });
}

// Auto-pick the best action given the current state. The boucle mode + the
// Auto toggle both delegate here. Heuristic, not optimal — but readable and
// matches "what a competent player would do".
export function autoChoice(battle) {
  const pPct = battle.pHp / battle.pMaxHp;
  const mPct = battle.mHp / battle.mMaxHp;
  // Critical HP : defend if we can (can't twice in a row).
  if (pPct < 0.3 && canUseAction(battle, 'defend')) return 'defend';
  // Power Strike : finisher if monster is almost dead, OR opener if both fresh.
  if (canUseAction(battle, 'power')) {
    if (mPct < 0.25) return 'power';
    if (mPct > 0.7 && pPct > 0.6) return 'power';
  }
  return 'attack';
}
