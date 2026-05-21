// Combat / dungeon logic. Resolution is instant (no per-turn animation in V1).
import { state, notify } from './state.js';
import { computeStats, activeSetEffects } from './character.js';
import { PLAYER_BASE, biomeForFloor, MONSTER_AFFIXES } from './data.js';
import { generateItem } from './loot.js';
import { damageMultiplier, hpMultiplier, monsterGoldMultiplier } from './talents.js';
import { relicDamageMult, relicHpMult, relicDmgTakenMult, relicElemMult, relicGoldMult, relicLifesteal } from './relics.js';
import { buildSkillContext } from './skills.js';
import { activeLegendaryEffectIds } from './legendaryEffects.js';
import { trackProgress as bountyTrack, syncAbsoluteProgress as bountySync } from './bounties.js';

// Total elemental damage is a single additive % pool applied per swing. Without a
// cap, stacking elemental rolls across 8 slots reached +1300% (a ×14 multiplier),
// which one-shot everything. Cap the pool so elemental is strong but not absurd.
export const ELEM_DMG_CAP = 1.5; // max +150% from elemental

// Armor as % mitigation with diminishing returns, instead of flat subtraction.
// Flat subtraction was binary: high armor = near-invincible, low armor vs a
// high-armor monster = an unkillable wall. This curve always lets some damage
// through (capped at 85%) and never fully blocks. Tunable K (higher = armor
// worth less).
export const ARMOR_K = 380;
export function armorMitigation(armor) {
  const a = Math.max(0, armor || 0);
  return Math.min(0.85, a / (a + ARMOR_K));
}

export function isBossFloor(floor) {
  return floor > 0 && floor % 5 === 0;
}

// Seeded RNG so the previewed encounter (UI) matches the one actually fought.
// Keyed on (floor, encounterNonce): the nonce bumps after each fight so
// re-fighting / looping a floor still rerolls elite + affixes.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function encounterRng(floor) {
  const nonce = state.combat?.encounterNonce || 0;
  const seed = (Math.imul(floor | 0, 374761393) + Math.imul(nonce | 0, 668265263)) >>> 0;
  return mulberry32(seed ^ 0x9e3779b9);
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
  const rng = encounterRng(floor);
  const boss = isBossFloor(floor);
  const base = pickStableMonster(floor);
  const scale = 1 + (floor - 1) * 0.28;
  // HP scales faster than damage so geared fights last several turns instead of
  // being one-shot, without making monster damage spike into one-shotting the player.
  const hpScale = 1 + (floor - 1) * 0.55;
  const bossMult = boss ? 2.6 : 1;
  const hard = !!state.settings?.hardMode;
  const hardCombat = hard ? 1.5 : 1;
  const hardLoot = hard ? 1.5 : 1;

  // Elite: 8% chance on non-boss floors, scales with floor for extra danger/reward
  let elite = null;
  if (!boss && floor >= 3 && rng() < 0.08) {
    elite = ELITE_VARIANTS[Math.floor(rng() * ELITE_VARIANTS.length)];
  }
  const elDmg = elite?.dmgMult || 1;
  const elHp  = elite?.hpMult  || 1;
  const elArm = elite?.armorBonus || 0;
  const elGold = elite?.goldMult || 1;

  const damage = Math.round(base.dmgBase * scale * bossMult * hardCombat * elDmg);

  // Monster affixes: combat mechanics on elites (always) and deeper normals.
  // Néant (41+) can stack a second affix for endgame variety.
  const mechanics = [];
  if (boss && base.mechanic) {
    mechanics.push(base.mechanic);
  } else if (!boss) {
    let affixCount = 0;
    if (elite) {
      affixCount = floor >= 41 ? 2 : 1;
    } else {
      const chance = floor >= 8 ? Math.min(0.40, 0.05 + (floor - 8) * 0.012) : 0;
      if (rng() < chance) affixCount = (floor >= 41 && rng() < 0.4) ? 2 : 1;
    }
    const pool = [...MONSTER_AFFIXES];
    for (let i = 0; i < affixCount && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      const def = pool.splice(idx, 1)[0];
      mechanics.push(def.build({ dmg: damage }));
    }
  }
  const affixCount = boss ? 0 : mechanics.length;
  const affixBoost = 1 + 0.30 * affixCount;

  return {
    name: boss
      ? `${base.name} (BOSS)`
      : (elite ? `${elite.prefix} ${base.name}` : base.name),
    emoji: base.emoji,
    eliteIcon: elite?.icon || null,
    eliteId: elite?.id || null,
    hp: Math.round(base.hpBase * hpScale * bossMult * hardCombat * elHp),
    damage,
    armor: Math.round(((base.armorBase || 0) + elArm) * scale * bossMult * hardCombat),
    goldReward: Math.round(base.goldBase * scale * (boss ? 6 : (elite ? 2.5 : 1)) * hardLoot * elGold * affixBoost),
    dropChance: boss
      ? 1
      : Math.min(0.95, (0.05 + floor * 0.015) * hardLoot * (elite ? 2.5 : 1) * affixBoost),
    isBoss: boss,
    isElite: !!elite,
    isHard: hard,
    mechanic: boss ? (base.mechanic || null) : null,
    mechanics,
    affixCount,
    floor,
  };
}

// Returns { won, log[], turns, damageTaken, playerMaxHp, events[] }
// events: array of { type: 'player_hit' | 'monster_hit', dmg, isCrit?, monsterHp, playerHp }
// opts: { startHp, mods } — startHp carries HP across dive fights; mods are dive
// boons { damageMult, dmgTakenMult, maxHpMult } (default identity).
export function resolveFight(monster, opts = {}) {
  const mods = opts.mods || {};
  const dmgMod = mods.damageMult || 1;
  const takenMod = mods.dmgTakenMult || 1;
  const maxHpMod = mods.maxHpMult || 1;
  const stats = computeStats();
  const playerMaxHp = Math.round((PLAYER_BASE.hp + (stats.vitality || 0) * 5) * hpMultiplier() * relicHpMult() * maxHpMod);
  const playerDmg = Math.max(1, Math.round((PLAYER_BASE.damage + (stats.damage || 0)) * damageMultiplier() * relicDamageMult() * dmgMod * (1 - armorMitigation(monster.armor))));
  const playerArmor = (stats.armor || 0);
  const monsterDmg = Math.max(1, Math.round(monster.damage * relicDmgTakenMult() * takenMod * (1 - armorMitigation(playerArmor))));
  const lifestealPct = relicLifesteal();
  const critChance = Math.min(0.75, (stats.crit || 0) / 100);
  // All elemental damages stack additively — each is a % damage bonus rolled
  // 0..max per swing (random multiplier, identical mechanic to fire).
  const fireBonus    = (stats.fireDmg     || 0) / 100;
  const frostBonus   = (stats.frostDmg    || 0) / 100;
  const voidBonus    = (stats.voidDmg     || 0) / 100;
  const poisonBonus  = (stats.poisonDmg   || 0) / 100;
  const lightBonus   = (stats.lightningDmg|| 0) / 100;
  const elemBonus    = Math.min(ELEM_DMG_CAP, (fireBonus + frostBonus + voidBonus + poisonBonus + lightBonus) * relicElemMult());

  // Skill context (active skills + per-fight state)
  const { active: activeSkills, states: skillStates } = buildSkillContext();

  // Active set effects (4-piece bonuses)
  const setEffectIds = new Set(activeSetEffects().map(e => e.id));
  let phoenixUsed = false;       // phoenix_rebirth fires only once per combat
  let shadowDodgeCharge = false; // shadow_strike: next attack after dodge guarantees crit
  let demonPactReady = setEffectIds.has('demon_pact'); // first attack of combat hits ×3

  // Active legendary effects (one per equipped legendary item)
  const legendaryEffects = activeLegendaryEffectIds();
  let bloodPactReady = legendaryEffects.has('bloodPact'); // mirror demon_pact for legendaries

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
  let pHp = opts.startHp != null ? Math.max(1, Math.min(playerMaxHp, Math.round(opts.startHp))) : playerMaxHp;
  let mHp = monsterMaxHp;
  let turns = 0;
  const maxTurns = 200;
  const events = [];
  const mechanics = monster.mechanics || (monster.mechanic ? [monster.mechanic] : []);

  // Apply one monster attack: damage + phoenix revive + lifesteal affixes.
  function applyMonsterHit(dmg, opts = {}) {
    pHp = Math.max(0, pHp - dmg);
    events.push({ type: 'monster_hit', dmg, monsterHp: mHp, playerHp: pHp, ...opts });
    if (setEffectIds.has('phoenix_rebirth') && !phoenixUsed && pHp <= 0) {
      phoenixUsed = true;
      pHp = Math.round(playerMaxHp * 0.30);
      events.push({ type: 'set_rebirth', emoji: '🔥', amount: pHp, playerHp: pHp, monsterHp: mHp });
    }
    for (const m of mechanics) {
      if (m.type === 'lifesteal' && dmg > 0 && mHp > 0 && mHp < monsterMaxHp) {
        const heal = Math.max(1, Math.round(dmg * (m.pct || 0.4)));
        mHp = Math.min(monsterMaxHp, mHp + heal);
        events.push({ type: 'monster_leech', amount: heal, emoji: '🩸', monsterHp: mHp, playerHp: pHp });
      }
    }
  }

  while (turns < maxTurns) {
    turns++;

    // Set effect: druid_growth → heal 20% max HP every 4 turns
    if (setEffectIds.has('druid_growth') && turns > 1 && (turns % 4) === 0 && pHp > 0 && pHp < playerMaxHp) {
      const heal = Math.max(1, Math.round(playerMaxHp * 0.20));
      const before = pHp;
      pHp = Math.min(playerMaxHp, pHp + heal);
      events.push({ type: 'set_heal', amount: pHp - before, emoji: '🌿', playerHp: pHp, monsterHp: mHp });
    }

    // Legendary effect: searingTouch → 3% monster max HP burn each turn from t2 onward
    if (legendaryEffects.has('searingTouch') && turns > 1 && mHp > 0) {
      const burn = Math.max(1, Math.round(monsterMaxHp * 0.03));
      mHp = Math.max(0, mHp - burn);
      events.push({ type: 'legendary_burn', amount: burn, emoji: '🔥', monsterHp: mHp, playerHp: pHp });
      if (mHp <= 0) break;
    }

    // Boss + affix mechanics: trigger at turn start (regen / burn / shield / enrage / phaseShift).
    // Multiple can stack (a monster may carry several affixes).
    let monsterDmgMod = 1;
    let monsterShielded = false;
    let playerDiedToMechanic = false;
    for (const m of mechanics) {
      if (m.type === 'regen' && mHp > 0 && mHp < monsterMaxHp) {
        const heal = Math.max(1, Math.round(monsterMaxHp * (m.percentPerTurn || 0.05)));
        mHp = Math.min(monsterMaxHp, mHp + heal);
        events.push({ type: 'boss_regen', amount: heal, monsterHp: mHp, playerHp: pHp });
      } else if (m.type === 'burn') {
        const burn = m.dmgPerTurn || 5;
        pHp = Math.max(0, pHp - burn);
        events.push({ type: 'boss_burn', amount: burn, playerHp: pHp, monsterHp: mHp });
        if (pHp <= 0) playerDiedToMechanic = true;
      } else if (m.type === 'shieldCycle') {
        if ((turns % (m.everyTurns || 3)) === 0) {
          monsterShielded = true;
          events.push({ type: 'boss_shield', monsterHp: mHp, playerHp: pHp });
        }
      } else if (m.type === 'enrage') {
        if (mHp / monsterMaxHp <= (m.triggerHpPct || 0.3)) monsterDmgMod *= (m.dmgMult || 2);
      } else if (m.type === 'phaseShift') {
        if ((turns % (m.everyTurns || 4)) === 0) monsterDmgMod *= (m.dmgMult || 1.5);
      }
    }
    if (playerDiedToMechanic) break;

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
    // Legendary effect: bloodPact → first hit of combat does triple damage
    // (stacks multiplicatively with demon_pact set if both equipped)
    if (bloodPactReady) {
      bloodPactReady = false;
      extraMult *= 3;
      mults.push({ emoji: '🩸', label: 'Pacte de Sang' });
    }
    const isCrit = forceCrit || Math.random() < critChance;
    let hit = Math.round(playerDmg * (isCrit ? 2 : 1) * (1 + elemBonus * Math.random()) * extraMult);
    if (monsterShielded) hit = 0;
    mHp = Math.max(0, mHp - hit);
    events.push({ type: 'player_hit', dmg: hit, isCrit, forceCrit, monsterHp: mHp, playerHp: pHp, mults, blocked: monsterShielded });

    // Relic: lifesteal → heal a share of damage dealt
    if (lifestealPct > 0 && hit > 0) {
      const healed = Math.max(1, Math.round(hit * lifestealPct));
      const before = pHp;
      pHp = Math.min(playerMaxHp, pHp + healed);
      if (pHp > before) events.push({ type: 'set_drain', amount: pHp - before, emoji: '🩸', playerHp: pHp, monsterHp: mHp });
    }

    // Monster affix: thorns → reflect a share of your hit back at you
    for (const m of mechanics) {
      if (m.type === 'thorns' && hit > 0) {
        const ret = Math.max(1, Math.round(hit * (m.reflectPct || 0.25)));
        pHp = Math.max(0, pHp - ret);
        events.push({ type: 'monster_thorns', amount: ret, emoji: '🌵', playerHp: pHp, monsterHp: mHp });
      }
    }
    if (pHp <= 0) break;

    // Legendary effect: chainLightning → on crit, a 50%-damage follow-up
    if (legendaryEffects.has('chainLightning') && isCrit && hit > 0 && !monsterShielded) {
      const followHit = Math.max(1, Math.round(hit * 0.5));
      mHp = Math.max(0, mHp - followHit);
      events.push({ type: 'player_hit', dmg: followHit, isCrit: false, monsterHp: mHp, playerHp: pHp,
                    mults: [{ emoji: '⚡', label: 'Foudre en Chaîne' }] });
      if (mHp <= 0) break;
    }
    // Legendary effect: voidEcho → 12% chance the attack repeats
    if (legendaryEffects.has('voidEcho') && hit > 0 && !monsterShielded && Math.random() < 0.12) {
      const echoHit = hit;
      mHp = Math.max(0, mHp - echoHit);
      events.push({ type: 'player_hit', dmg: echoHit, isCrit: false, monsterHp: mHp, playerHp: pHp,
                    mults: [{ emoji: '🌑', label: 'Écho du Néant' }] });
      if (mHp <= 0) break;
    }
    // Legendary effect: vampireMark → heal 8% of damage dealt
    if (legendaryEffects.has('vampireMark') && hit > 0) {
      const healed = Math.max(1, Math.round(hit * 0.08));
      const before = pHp;
      pHp = Math.min(playerMaxHp, pHp + healed);
      if (pHp > before) {
        events.push({ type: 'set_drain', amount: pHp - before, emoji: '🧛', playerHp: pHp, monsterHp: mHp });
      }
    }

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
    applyMonsterHit(monsterFinalDmg, { enraged: monsterDmgMod > 1 });

    // Monster affix: swift → chance to strike a second time this turn
    const swift = mechanics.find(m => m.type === 'swift');
    if (swift && pHp > 0 && Math.random() < (swift.chance || 0.3)) {
      applyMonsterHit(monsterFinalDmg, { swift: true });
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
    monster.goldReward = Math.round(monster.goldReward * monsterGoldMultiplier() * relicGoldMult());
    // Legendary effect: goldenTouch → +30% gold per kill (compounds with other multipliers)
    if (activeLegendaryEffectIds().has('goldenTouch')) {
      monster.goldReward = Math.round(monster.goldReward * 1.30);
    }
    state.gold += monster.goldReward;

    // 🗝 Key drops: boss = 3 guaranteed, elite = 1 guaranteed, normal = 30% chance
    let keyDrop = 0;
    if (monster.isBoss) keyDrop = 3;
    else if (monster.isElite) keyDrop = 1;
    else if (Math.random() < 0.30 + 0.15 * (monster.affixCount || 0)) keyDrop = 1;
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
  // Reroll the encounter (elite + affixes) for the next visit to any floor.
  state.combat.encounterNonce = (state.combat.encounterNonce || 0) + 1;
  notify();
  return { result, monster, droppedItem, advanced, milestone };
}

// === Deep Dive (roguelite endurance run) ===
// A dive monster is a normal monster at a deeper effective floor, plus a "dive
// tax" so the run stays challenging even for a maxed character. depth starts at 1.
export function generateDiveMonster(baseFloor, depth) {
  const floor = baseFloor + depth;
  const m = generateMonster(floor);
  const tax = 1 + depth * 0.05;
  m.hp = Math.round(m.hp * 1.15 * tax);
  m.damage = Math.round(m.damage * 1.10 * tax);
  m.goldReward = Math.round(m.goldReward * (1 + depth * 0.12));
  m.isDive = true;
  m.diveDepth = depth;
  return m;
}

// Resolve one dive fight without touching run progression or granting rewards
// (the dive controller banks rewards itself). Carries HP via startHp + boon mods.
export function attemptDiveFight(baseFloor, depth, startHp, mods) {
  const monster = generateDiveMonster(baseFloor, depth);
  const result = resolveFight(monster, { startHp, mods });
  return { monster, result, won: result.won, hpLeft: result.playerHpLeft, maxHp: result.playerMaxHp };
}

export function setCurrentFloor(floor) {
  const f = Math.max(1, Math.min(state.combat.highestUnlocked, floor | 0));
  state.combat.currentFloor = f;
  notify();
}

// Predict difficulty for UI ("Facile" / "Risqué" / "Difficile" / "Suicide")
export function predictDifficulty(monster) {
  const stats = computeStats();
  const playerMaxHp = (PLAYER_BASE.hp + (stats.vitality || 0) * 5) * hpMultiplier() * relicHpMult();
  const playerDmg = Math.max(1, (PLAYER_BASE.damage + (stats.damage || 0)) * damageMultiplier() * relicDamageMult() * (1 - armorMitigation(monster.armor)));
  const monsterDmg = Math.max(1, monster.damage * relicDmgTakenMult() * (1 - armorMitigation(stats.armor || 0)));
  const critChance = Math.min(0.75, (stats.crit || 0) / 100);
  // Sum all elemental %damages for difficulty preview (same model as resolveFight)
  const elemBonus = Math.min(ELEM_DMG_CAP, (((stats.fireDmg || 0) + (stats.frostDmg || 0) + (stats.voidDmg || 0)
                   + (stats.poisonDmg || 0) + (stats.lightningDmg || 0)) / 100) * relicElemMult());
  const avgDmg = playerDmg * (1 + critChance + elemBonus);
  const turnsToKill = Math.ceil(monster.hp / avgDmg);
  const damageTaken = monsterDmg * Math.max(0, turnsToKill - 1);
  // Account for affix/boss mechanics that raise effective danger.
  let affixFactor = 1;
  for (const m of (monster.mechanics || [])) {
    if (m.type === 'swift') affixFactor += 0.30;
    else if (m.type === 'burn') affixFactor += 0.25;
    else if (m.type === 'enrage' || m.type === 'thorns' || m.type === 'lifesteal' || m.type === 'regen') affixFactor += 0.20;
    else affixFactor += 0.15;
  }
  const ratio = (damageTaken * affixFactor) / playerMaxHp;
  if (ratio < 0.25) return { label: 'Facile',   color: '#6acc6a' };
  if (ratio < 0.6)  return { label: 'Modéré',   color: '#ffe14a' };
  if (ratio < 0.95) return { label: 'Risqué',   color: '#ff7a1a' };
  if (ratio < 1.5)  return { label: 'Difficile',color: '#ff3050' };
  return { label: 'Suicide', color: '#b35bd6' };
}
