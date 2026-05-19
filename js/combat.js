// Combat / dungeon logic. Resolution is instant (no per-turn animation in V1).
import { state, notify } from './state.js';
import { computeStats, activeSetEffects } from './character.js';
import { PLAYER_BASE, biomeForFloor } from './data.js';
import { generateItem } from './loot.js';
import { damageMultiplier, hpMultiplier, monsterGoldMultiplier } from './talents.js';
import { buildSkillContext } from './skills.js';
import { trackProgress as bountyTrack, syncAbsoluteProgress as bountySync } from './bounties.js';

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

// Elite monster prefixes: each adds a name marker + stat skew. Not used for bosses.
const ELITE_VARIANTS = [
  { id: 'savage',     prefix: 'Sauvage',     icon: '⚡', dmgMult: 1.6, hpMult: 1.2 },
  { id: 'armored',    prefix: 'Cuirassé',    icon: '🛡', armorBonus: 8, hpMult: 1.4 },
  { id: 'frenzied',   prefix: 'Frénétique',  icon: '💢', dmgMult: 1.3, hpMult: 1.1, goldMult: 1.5 },
  { id: 'colossal',   prefix: 'Colossal',    icon: '💀', hpMult: 2.0, dmgMult: 1.1 },
];

export function generateMonster(floor) {
  const boss = isBossFloor(floor);
  const base = pickStableMonster(floor);
  const scale = 1 + (floor - 1) * 0.28;
  const bossMult = boss ? 2.6 : 1;
  const hard = !!state.settings?.hardMode;
  const hardCombat = hard ? 1.5 : 1;
  const hardLoot = hard ? 1.5 : 1;

  // Elite: 8% chance on non-boss floors, scales with floor for extra danger/reward
  let elite = null;
  if (!boss && floor >= 3 && Math.random() < 0.08) {
    elite = ELITE_VARIANTS[Math.floor(Math.random() * ELITE_VARIANTS.length)];
  }
  const elDmg = elite?.dmgMult || 1;
  const elHp  = elite?.hpMult  || 1;
  const elArm = elite?.armorBonus || 0;
  const elGold = elite?.goldMult || 1;

  return {
    name: boss
      ? `${base.name} (BOSS)`
      : (elite ? `${elite.prefix} ${base.name}` : base.name),
    emoji: base.emoji,
    eliteIcon: elite?.icon || null,
    eliteId: elite?.id || null,
    hp: Math.round(base.hpBase * scale * bossMult * hardCombat * elHp),
    damage: Math.round(base.dmgBase * scale * bossMult * hardCombat * elDmg),
    armor: Math.round(((base.armorBase || 0) + elArm) * scale * bossMult * hardCombat),
    goldReward: Math.round(base.goldBase * scale * (boss ? 6 : (elite ? 2.5 : 1)) * hardLoot * elGold),
    dropChance: boss
      ? 1
      : Math.min(0.95, (0.05 + floor * 0.015) * hardLoot * (elite ? 2.5 : 1)),
    isBoss: boss,
    isElite: !!elite,
    isHard: hard,
    mechanic: boss ? (base.mechanic || null) : null,
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
  // All elemental damages stack additively — each is a % damage bonus rolled
  // 0..max per swing (random multiplier, identical mechanic to fire).
  const fireBonus    = (stats.fireDmg     || 0) / 100;
  const frostBonus   = (stats.frostDmg    || 0) / 100;
  const voidBonus    = (stats.voidDmg     || 0) / 100;
  const poisonBonus  = (stats.poisonDmg   || 0) / 100;
  const lightBonus   = (stats.lightningDmg|| 0) / 100;
  const elemBonus    = fireBonus + frostBonus + voidBonus + poisonBonus + lightBonus;

  // Skill context (active skills + per-fight state)
  const { active: activeSkills, states: skillStates } = buildSkillContext();

  // Active set effects (4-piece bonuses)
  const setEffectIds = new Set(activeSetEffects().map(e => e.id));
  let phoenixUsed = false;       // phoenix_rebirth fires only once per combat
  let shadowDodgeCharge = false; // shadow_strike: next attack after dodge guarantees crit
  let demonPactReady = setEffectIds.has('demon_pact'); // first attack of combat hits ×3

  function runHook(hookName, ctx) {
    const results = [];
    for (const s of activeSkills) {
      const fn = s[hookName];
      if (!fn) continue;
      const r = fn({ ...ctx, skillState: skillStates.get(s.id), stats });
      if (r) results.push({ skill: s, result: r });
    }
    return results;
  }

  const monsterMaxHp = monster.hp;
  let pHp = playerMaxHp;
  let mHp = monsterMaxHp;
  let turns = 0;
  const maxTurns = 200;
  const events = [];
  const mechanic = monster.mechanic;
  while (turns < maxTurns) {
    turns++;

    // Set effect: druid_growth → heal 20% max HP every 4 turns
    if (setEffectIds.has('druid_growth') && turns > 1 && (turns % 4) === 0 && pHp > 0 && pHp < playerMaxHp) {
      const heal = Math.max(1, Math.round(playerMaxHp * 0.20));
      const before = pHp;
      pHp = Math.min(playerMaxHp, pHp + heal);
      events.push({ type: 'set_heal', amount: pHp - before, emoji: '🌿', playerHp: pHp, monsterHp: mHp });
    }

    // Boss mechanic: triggers at turn start (regen / burn / shield / enrage / phaseShift)
    let monsterDmgMod = 1;
    let monsterShielded = false;
    if (mechanic) {
      if (mechanic.type === 'regen' && mHp > 0 && mHp < monsterMaxHp) {
        const heal = Math.max(1, Math.round(monsterMaxHp * (mechanic.percentPerTurn || 0.05)));
        mHp = Math.min(monsterMaxHp, mHp + heal);
        events.push({ type: 'boss_regen', amount: heal, monsterHp: mHp, playerHp: pHp });
      } else if (mechanic.type === 'burn') {
        const burn = mechanic.dmgPerTurn || 5;
        pHp = Math.max(0, pHp - burn);
        events.push({ type: 'boss_burn', amount: burn, playerHp: pHp, monsterHp: mHp });
        if (pHp <= 0) break;
      } else if (mechanic.type === 'shieldCycle') {
        monsterShielded = (turns % (mechanic.everyTurns || 3)) === 0;
        if (monsterShielded) events.push({ type: 'boss_shield', monsterHp: mHp, playerHp: pHp });
      } else if (mechanic.type === 'enrage') {
        if (mHp / monsterMaxHp <= (mechanic.triggerHpPct || 0.3)) monsterDmgMod = mechanic.dmgMult || 2;
      } else if (mechanic.type === 'phaseShift') {
        if ((turns % (mechanic.everyTurns || 4)) === 0) monsterDmgMod = mechanic.dmgMult || 1.5;
      }
    }

    // Turn start: heal, etc.
    const startHooks = runHook('onTurnStart', { playerHp: pHp, playerMaxHp, monsterHp: mHp, monsterMaxHp });
    for (const h of startHooks) {
      if (h.result.kind === 'heal') {
        pHp = Math.min(playerMaxHp, pHp + h.result.amount);
        events.push({ type: 'skill_heal', amount: h.result.amount, skill: h.skill.id, emoji: h.skill.emoji, playerHp: pHp });
      }
    }

    // Player attack: forceCrit + damage multipliers
    let forceCrit = false;
    let extraMult = 1;
    let mults = [];
    const atkHooks = runHook('onPlayerAttack', { playerHp: pHp, playerMaxHp, monsterHp: mHp, monsterMaxHp });
    for (const h of atkHooks) {
      if (h.result.kind === 'forceCrit') forceCrit = true;
      if (h.result.kind === 'heal') {
        const before = pHp;
        pHp = Math.min(playerMaxHp, pHp + h.result.amount);
        if (pHp > before) {
          events.push({ type: 'skill_heal', amount: pHp - before, skill: h.skill.id, emoji: h.skill.emoji, playerHp: pHp });
        }
      }
    }
    const dmgHooks = runHook('onDamageCalc', { playerHp: pHp, playerMaxHp, monsterHp: mHp, monsterMaxHp });
    for (const h of dmgHooks) {
      if (h.result.kind === 'mult') {
        extraMult *= h.result.mult;
        if (h.result.label) mults.push({ emoji: h.skill.emoji, label: h.result.label });
      }
    }
    // Set effect: shadow_strike → next attack after dodge is guaranteed crit
    if (setEffectIds.has('shadow_strike') && shadowDodgeCharge) {
      forceCrit = true;
      shadowDodgeCharge = false;
      mults.push({ emoji: '🌑', label: 'Frappe d\'ombre' });
    }
    // Set effect: dragon_breath → 15% chance to double damage (counts as fire)
    let dragonProc = false;
    if (setEffectIds.has('dragon_breath') && Math.random() < 0.15) {
      dragonProc = true;
      extraMult *= 2;
      mults.push({ emoji: '🐉', label: 'Souffle dragon' });
    }
    // Set effect: demon_pact → first hit of combat does triple damage
    if (demonPactReady) {
      demonPactReady = false;
      extraMult *= 3;
      mults.push({ emoji: '👹', label: 'Pacte démoniaque' });
    }
    const isCrit = forceCrit || Math.random() < critChance;
    let hit = Math.round(playerDmg * (isCrit ? 2 : 1) * (1 + elemBonus * Math.random()) * extraMult);
    if (monsterShielded) hit = 0;
    mHp = Math.max(0, mHp - hit);
    events.push({ type: 'player_hit', dmg: hit, isCrit, forceCrit, monsterHp: mHp, playerHp: pHp, mults, blocked: monsterShielded });

    // Set effect: lich_drain → heal 10% of damage dealt
    if (setEffectIds.has('lich_drain') && hit > 0) {
      const healed = Math.max(1, Math.round(hit * 0.10));
      const before = pHp;
      pHp = Math.min(playerMaxHp, pHp + healed);
      if (pHp > before) {
        events.push({ type: 'set_drain', amount: pHp - before, emoji: '🧪', playerHp: pHp, monsterHp: mHp });
      }
    }
    if (mHp <= 0) break;

    // Set effect: frost_freeze → 20% per hit to skip monster's turn
    if (setEffectIds.has('frost_freeze') && Math.random() < 0.20) {
      events.push({ type: 'set_freeze', emoji: '❄', playerHp: pHp, monsterHp: mHp });
      continue;
    }

    // Monster attack: dodge hook
    const moHooks = runHook('onMonsterAttack', { playerHp: pHp, playerMaxHp, monsterHp: mHp, monsterMaxHp });
    let dodged = moHooks.some(h => h.result.kind === 'dodge');
    // Set effect: titan_wall → 15% pure dodge
    if (!dodged && setEffectIds.has('titan_wall') && Math.random() < 0.15) {
      dodged = true;
      events.push({ type: 'set_dodge', emoji: '🛡', playerHp: pHp, monsterHp: mHp });
    }
    // Set effect: wanderer_haste → 25% pure dodge
    if (!dodged && setEffectIds.has('wanderer_haste') && Math.random() < 0.25) {
      dodged = true;
      events.push({ type: 'set_dodge', emoji: '🧭', playerHp: pHp, monsterHp: mHp });
    }
    if (dodged) {
      if (setEffectIds.has('shadow_strike')) shadowDodgeCharge = true;
      // Push the standard dodge event only if no set_dodge already
      const last = events[events.length - 1];
      if (!last || last.type !== 'set_dodge') {
        events.push({ type: 'skill_dodge', playerHp: pHp, monsterHp: mHp });
      }
      continue;
    }
    const monsterFinalDmg = Math.max(1, Math.round(monsterDmg * monsterDmgMod));
    pHp = Math.max(0, pHp - monsterFinalDmg);
    events.push({ type: 'monster_hit', dmg: monsterFinalDmg, monsterHp: mHp, playerHp: pHp, enraged: monsterDmgMod > 1 });

    // Set effect: phoenix_rebirth → on lethal hit, revive once at 30% HP
    if (setEffectIds.has('phoenix_rebirth') && !phoenixUsed && pHp <= 0) {
      phoenixUsed = true;
      pHp = Math.round(playerMaxHp * 0.30);
      events.push({ type: 'set_rebirth', emoji: '🔥', amount: pHp, playerHp: pHp, monsterHp: mHp });
    }

    // On-take-damage hook: reflect damage
    const takeHooks = runHook('onTakeDamage', { playerHp: pHp, playerMaxHp, monsterHp: mHp, monsterMaxHp, dmgTaken: monsterDmg });
    for (const h of takeHooks) {
      if (h.result.kind === 'reflect') {
        mHp = Math.max(0, mHp - h.result.amount);
        events.push({ type: 'skill_reflect', amount: h.result.amount, emoji: h.skill.emoji, monsterHp: mHp, playerHp: pHp });
        if (mHp <= 0) break;
      }
    }
    if (mHp <= 0) break;
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
    bountyTrack('kill_monsters', 1);
    if (monster.isBoss) {
      state.combat.bossKills += 1;
      bountyTrack('kill_bosses', 1);
      // Codex: track boss kills per biome
      const biome = biomeForFloor(floor);
      if (state.codex && biome) {
        state.codex.bosses[biome.id] = (state.codex.bosses[biome.id] || 0) + 1;
      }
    }
    monster.goldReward = Math.round(monster.goldReward * monsterGoldMultiplier());
    state.gold += monster.goldReward;

    // 🗝 Key drops: boss = 3 guaranteed, elite = 1 guaranteed, normal = 30% chance
    let keyDrop = 0;
    if (monster.isBoss) keyDrop = 3;
    else if (monster.isElite) keyDrop = 1;
    else if (Math.random() < 0.30) keyDrop = 1;
    if (keyDrop > 0) {
      state.keys = (state.keys || 0) + keyDrop;
      monster.keyDrop = keyDrop;
    }

    if (Math.random() < monster.dropChance) {
      const baseTier = Math.min(5, Math.max(1, Math.ceil(floor / 5)));
      // Elite/boss drop at one tier higher (capped to 5)
      const itemTier = Math.min(5, baseTier + (monster.isBoss || monster.isElite ? 1 : 0));
      droppedItem = generateItem(itemTier);
      if ((monster.isBoss || monster.isElite) && (droppedItem.rarity === 'common' || droppedItem.rarity === 'magic')) {
        droppedItem = generateItem(itemTier);
      }
    }

    if (floor === state.combat.highestUnlocked) {
      state.combat.highestUnlocked = floor + 1;
      advanced = true;
      bountySync();
      // Milestone crossed? Only on first-time progression beyond a multiple of 25.
      if (floor > 0 && floor % 25 === 0) {
        const level = floor / 25;
        const reward = grantMilestoneReward(level);
        milestone = { floor, level, reward };
      }
    }
    // Stay on the same floor when looping a beaten floor; otherwise advance.
    // (Loop mode is meant to farm the current floor, not push forward.)
    const wasBeatenFloor = !advanced; // !advanced ↔ floor was already in highestUnlocked range
    if (!(state.combat.loopMode && wasBeatenFloor)) {
      state.combat.currentFloor = floor + 1;
    }
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
  // Sum all elemental %damages for difficulty preview (same model as resolveFight)
  const elemBonus = ((stats.fireDmg || 0) + (stats.frostDmg || 0) + (stats.voidDmg || 0)
                   + (stats.poisonDmg || 0) + (stats.lightningDmg || 0)) / 100;
  const avgDmg = playerDmg * (1 + critChance + elemBonus);
  const turnsToKill = Math.ceil(monster.hp / avgDmg);
  const damageTaken = monsterDmg * Math.max(0, turnsToKill - 1);
  const ratio = damageTaken / playerMaxHp;
  if (ratio < 0.25) return { label: 'Facile',   color: '#6acc6a' };
  if (ratio < 0.6)  return { label: 'Modéré',   color: '#ffe14a' };
  if (ratio < 0.95) return { label: 'Risqué',   color: '#ff7a1a' };
  if (ratio < 1.5)  return { label: 'Difficile',color: '#ff3050' };
  return { label: 'Suicide', color: '#b35bd6' };
}
