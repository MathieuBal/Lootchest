// Turn-based battle engine — same depth as resolveFight (combat.js) but
// driven by player actions one turn at a time. Carries the FULL build
// pipeline : elemental damage, skill/ability hooks, set effects, legendary
// effects, relic effects, monster mechanics (regen/enrage/shield/burn/
// thorns/lifesteal/swift/healBlock/damageCap/phaseShift/executioner).
//
// resolveFight stays in combat.js for the Dive auto-resolution ; both engines
// share the same stat helpers so numbers stay coherent. If you touch a combat
// rule here, check whether resolveFight needs the mirror change.
//
// The engine mutates only the battle object — never global game state.
// applyCombatOutcome (combat.js) handles gold/keys/drops once a battle ends.

import { state } from './state.js';
import { computeStats, activeSetEffects } from './character.js';
import { PLAYER_BASE, prestigeDamageMult, prestigeHpMult } from './data.js';
import { armorMitigation, ELEM_DMG_CAP } from './combat.js';
import { damageMultiplier, hpMultiplier } from './talents.js';
import { relicDamageMult, relicHpMult, relicDmgTakenMult, relicElemMult, relicLifesteal, relicEffects } from './relics.js';
import { villageCombatBonus } from './village.js';
import { affinityDamageMult, affinityHpMult, affinityElemMult } from './affinities.js';
import { buildSkillContext } from './skills.js';
import { activeLegendaryEffectIds } from './legendaryEffects.js';

const POWER_CD = 2;          // turns between Frappe Puissante uses
const POWER_MULT = 2.2;      // damage multiplier of Frappe Puissante
const DEFEND_REDUCTION = 0.6;
const DEFEND_HEAL_PCT = 0.08;

export const ACTIONS = {
  attack:  { id: 'attack',  emoji: '⚔', label: 'Attaquer', desc: 'Coup normal.' },
  power:   { id: 'power',   emoji: '💥', label: 'Frappe Puissante', desc: '×2.2 dégâts, mais le monstre frappe en premier.' },
  defend:  { id: 'defend',  emoji: '🛡', label: 'Défendre', desc: '–60 % dégâts subis et soin 8 % PV max.' },
  special: { id: 'special', emoji: '✨', label: 'Spécial', desc: 'Attaque signature de ton élément dominant. Consomme la jauge.' },
  flee:    { id: 'flee',    emoji: '🏃', label: 'Fuir',    desc: 'Quitte le combat sans récompense.' },
};

// === Attaques spéciales (jauge pleine) ===
// La signature dépend de l'élément dominant du build : un build feu ne se
// joue pas comme un build givre. Sans élément, fallback Cri de Guerre.
export const SPECIALS = {
  fire:      { id: 'fire',      emoji: '🔥', name: 'Embrasement',   desc: '×1.6 dégâts + Brûlure (4 % PV max du monstre pendant 3 tours).' },
  frost:     { id: 'frost',     emoji: '❄',  name: 'Blizzard',      desc: '×1.4 dégâts + Gel (le monstre passe son tour) + Givre (−25 % dégâts, 2 tours).' },
  poison:    { id: 'poison',    emoji: '☠',  name: 'Toxines',       desc: '×1.2 dégâts + Poison (4 % PV max du monstre pendant 5 tours).' },
  lightning: { id: 'lightning', emoji: '⚡', name: 'Tempête',       desc: '3 frappes ×0.65 — chacune peut être critique.' },
  void:      { id: 'void',      emoji: '🌑', name: 'Annihilation',  desc: '×1.5 dégâts — ignore boucliers et carapaces.' },
  none:      { id: 'none',      emoji: '💢', name: 'Cri de Guerre', desc: '×1.3 dégâts + 20 % de dégâts pour le reste du combat.' },
};

// Élément dominant du build = la plus grosse stat élémentaire équipée.
export function specialForStats(stats) {
  const pools = [
    ['fire', stats.fireDmg || 0], ['frost', stats.frostDmg || 0],
    ['poison', stats.poisonDmg || 0], ['lightning', stats.lightningDmg || 0],
    ['void', stats.voidDmg || 0],
  ];
  pools.sort((a, b) => b[1] - a[1]);
  return (pools[0][1] > 0) ? SPECIALS[pools[0][0]] : SPECIALS.none;
}

const GAUGE_MAX = 100;
const GAUGE_GAIN = { attack: 14, power: 22, defend: 10, special: 0 };
const GAUGE_ON_HIT_TAKEN = 8;

export function createBattle(monster, opts = {}) {
  const mods = opts.mods || {};
  const dmgMod = mods.damageMult || 1;
  const takenMod = mods.dmgTakenMult || 1;
  const maxHpMod = mods.maxHpMult || 1;
  const stats = computeStats();
  const vlg = villageCombatBonus();
  const pLvl = state.prestige?.level || 0;

  const pMaxHp = Math.round((PLAYER_BASE.hp + (stats.vitality || 0) * 5) * hpMultiplier() * relicHpMult() * prestigeHpMult(pLvl) * affinityHpMult() * vlg.hpMult * maxHpMod);
  const pBaseDmg = Math.max(1, Math.round((PLAYER_BASE.damage + (stats.damage || 0)) * damageMultiplier() * relicDamageMult() * prestigeDamageMult(pLvl) * affinityDamageMult() * vlg.dmgMult * dmgMod * (1 - armorMitigation(monster.armor))));
  const monsterDmg = Math.max(1, Math.round(monster.damage * relicDmgTakenMult() * takenMod * (1 - armorMitigation(stats.armor || 0))));

  // Elemental pool : additive % bonus rolled 0..max per swing, capped.
  const arcaneMult = affinityElemMult();
  const elemBonus = Math.min(
    ELEM_DMG_CAP * arcaneMult,
    (((stats.fireDmg || 0) + (stats.frostDmg || 0) + (stats.voidDmg || 0) + (stats.poisonDmg || 0) + (stats.lightningDmg || 0)) / 100) * relicElemMult() * arcaneMult,
  );

  // Per-fight contexts : skills + slotted abilities share the hook system.
  const { active: activeSkills, states: skillStates } = buildSkillContext();
  const setEffectIds = new Set(activeSetEffects().map(e => e.id));
  const legendaryEffects = activeLegendaryEffectIds();
  const relicFx = relicEffects();

  const mechanics = monster.mechanics || (monster.mechanic ? [monster.mechanic] : []);
  // healBlock affix : all player healing reduced for the whole fight.
  const healMod = mechanics.reduce((m, x) => x.type === 'healBlock' ? m * (1 - (x.pct || 0.5)) : m, 1);
  // damageCap affix : each player swing capped to a share of monster max HP.
  let playerHitCap = Infinity;
  for (const m of mechanics) {
    if (m.type === 'damageCap') playerHitCap = Math.min(playerHitCap, Math.max(1, Math.round(monster.hp * (m.pctMaxHp || 0.2))));
  }

  return {
    monster, stats, mechanics,
    pMaxHp,
    pHp: opts.startHp != null ? Math.max(1, Math.min(pMaxHp, Math.round(opts.startHp))) : pMaxHp,
    pBaseDmg,
    mMaxHp: monster.hp,
    mHp: monster.hp,
    monsterDmg,
    elemBonus,
    critChance: Math.min(0.75, (stats.crit || 0) / 100),
    lifestealPct: relicLifesteal(),
    healMod, playerHitCap,
    activeSkills, skillStates, setEffectIds, legendaryEffects,
    momentumStacks: Math.min(relicFx.relicMomentum || 0, 4),
    executeStacks:  Math.min(relicFx.relicExecute  || 0, 4),
    thornsStacks:   Math.min(relicFx.relicThorns   || 0, 4),
    phoenixCharges: relicFx.relicPhoenix || 0,
    phoenixUsed: false,
    shadowDodgeCharge: false,
    demonPactReady: setEffectIds.has('demon_pact'),
    bloodPactReady: legendaryEffects.has('bloodPact'),
    turn: 0,
    cooldowns: { power: 0 },
    lastAction: null,
    // Jauge d'ultime : se remplit en agissant et en encaissant ; pleine = Spécial.
    gauge: 0,
    gaugeMax: GAUGE_MAX,
    special: specialForStats(stats),
    // Statuts infligés au monstre : { burn: {turns, dmgPerTurn}, poison: {...},
    // freeze: {turns}, chill: {turns} }. Tick à chaque début de tour.
    mStatuses: {},
    dmgBuffMult: 1,   // Cri de Guerre : buff permanent pour le combat
    ended: false,
    won: null,
    fled: false,
  };
}

export function canUseAction(battle, actionId) {
  if (battle.ended) return false;
  switch (actionId) {
    case 'attack':  return true;
    case 'power':   return (battle.cooldowns.power || 0) <= 0;
    case 'defend':  return battle.lastAction !== 'defend';
    case 'special': return battle.gauge >= battle.gaugeMax;
    case 'flee':    return !battle.monster.isBoss && !battle.monster.isElite;
  }
  return false;
}

function runHook(battle, hookName, ctx) {
  const results = [];
  for (const s of battle.activeSkills) {
    const fn = s[hookName];
    if (!fn) continue;
    const r = fn({ ...ctx, skillState: battle.skillStates.get(s.id), stats: battle.stats });
    if (r) results.push({ skill: s, result: r });
  }
  return results;
}

function hookCtx(battle) {
  return { playerHp: battle.pHp, playerMaxHp: battle.pMaxHp, monsterHp: battle.mHp, monsterMaxHp: battle.mMaxHp };
}

function applyHeal(battle, amount) {
  return Math.max(0, Math.round(amount * battle.healMod));
}

// One monster blow : damage + phoenix revives + lifesteal affix.
function applyMonsterHit(battle, events, dmg, extra = {}) {
  battle.pHp = Math.max(0, battle.pHp - dmg);
  battle.gauge = Math.min(battle.gaugeMax, battle.gauge + GAUGE_ON_HIT_TAKEN);
  events.push({ type: 'monster_hit', dmg, monsterHp: battle.mHp, playerHp: battle.pHp, ...extra });
  if (battle.setEffectIds.has('phoenix_rebirth') && !battle.phoenixUsed && battle.pHp <= 0) {
    battle.phoenixUsed = true;
    battle.pHp = Math.round(battle.pMaxHp * 0.30);
    events.push({ type: 'set_rebirth', emoji: '🔥', amount: battle.pHp, playerHp: battle.pHp, monsterHp: battle.mHp });
  }
  if (battle.phoenixCharges > 0 && battle.pHp <= 0) {
    battle.phoenixCharges -= 1;
    battle.pHp = Math.round(battle.pMaxHp * 0.30);
    events.push({ type: 'set_rebirth', emoji: '🔥', amount: battle.pHp, playerHp: battle.pHp, monsterHp: battle.mHp });
  }
  for (const m of battle.mechanics) {
    if (m.type === 'lifesteal' && dmg > 0 && battle.mHp > 0 && battle.mHp < battle.mMaxHp) {
      const heal = Math.max(1, Math.round(dmg * (m.pct || 0.4)));
      battle.mHp = Math.min(battle.mMaxHp, battle.mHp + heal);
      events.push({ type: 'monster_leech', amount: heal, emoji: '🩸', monsterHp: battle.mHp, playerHp: battle.pHp });
    }
  }
}

// Returns { events, ended, won, fled } — caller animates events then re-calls.
export function executeTurn(battle, actionId) {
  if (!canUseAction(battle, actionId)) return { events: [], invalid: true, ended: battle.ended, won: battle.won };

  battle.turn += 1;
  const events = [];
  const finish = () => {
    if (battle.mHp <= 0) { battle.ended = true; battle.won = true; }
    else if (battle.pHp <= 0) { battle.ended = true; battle.won = false; }
    return battle.ended;
  };

  if (actionId === 'flee') {
    battle.ended = true; battle.won = false; battle.fled = true;
    events.push({ type: 'player_flee', playerHp: battle.pHp, monsterHp: battle.mHp });
    return { events, ended: true, won: false, fled: true };
  }

  for (const k of Object.keys(battle.cooldowns)) {
    if (battle.cooldowns[k] > 0) battle.cooldowns[k] -= 1;
  }

  // ── Turn-start effects ──────────────────────────────────────
  // Statuts infligés au monstre : DoT (brûlure/poison) tick, durées décomptées.
  for (const key of ['burn', 'poison']) {
    const st = battle.mStatuses[key];
    if (!st) continue;
    const tick = Math.max(1, st.dmgPerTurn || 1);
    battle.mHp = Math.max(0, battle.mHp - tick);
    events.push({ type: 'status_tick', status: key, amount: tick, emoji: key === 'burn' ? '🔥' : '☠', monsterHp: battle.mHp, playerHp: battle.pHp });
    st.turns -= 1;
    if (st.turns <= 0) delete battle.mStatuses[key];
    if (finish()) return { events, ended: true, won: battle.won };
  }
  if (battle.mStatuses.chill) {
    battle.mStatuses.chill.turns -= 1;
    if (battle.mStatuses.chill.turns < 0) delete battle.mStatuses.chill;
  }
  // Set : druid_growth → heal 20% max HP every 4 turns.
  if (battle.setEffectIds.has('druid_growth') && battle.turn > 1 && (battle.turn % 4) === 0 && battle.pHp > 0 && battle.pHp < battle.pMaxHp) {
    const heal = applyHeal(battle, Math.max(1, Math.round(battle.pMaxHp * 0.20)));
    const before = battle.pHp;
    battle.pHp = Math.min(battle.pMaxHp, battle.pHp + heal);
    events.push({ type: 'set_heal', amount: battle.pHp - before, emoji: '🌿', playerHp: battle.pHp, monsterHp: battle.mHp });
  }
  // Legendary : searingTouch → 3% monster max HP burn per turn from t2.
  if (battle.legendaryEffects.has('searingTouch') && battle.turn > 1 && battle.mHp > 0) {
    const burn = Math.max(1, Math.round(battle.mMaxHp * 0.03));
    battle.mHp = Math.max(0, battle.mHp - burn);
    events.push({ type: 'legendary_burn', amount: burn, emoji: '🔥', monsterHp: battle.mHp, playerHp: battle.pHp });
    if (finish()) return { events, ended: true, won: battle.won };
  }
  // Monster mechanics at turn start.
  let monsterDmgMod = 1;
  let monsterShielded = false;
  for (const m of battle.mechanics) {
    if (m.type === 'regen' && battle.mHp > 0 && battle.mHp < battle.mMaxHp) {
      const heal = Math.max(1, Math.round(battle.mMaxHp * (m.percentPerTurn || 0.05)));
      battle.mHp = Math.min(battle.mMaxHp, battle.mHp + heal);
      events.push({ type: 'boss_regen', amount: heal, monsterHp: battle.mHp, playerHp: battle.pHp });
    } else if (m.type === 'burn') {
      const burn = m.dmgPerTurn || 5;
      battle.pHp = Math.max(0, battle.pHp - burn);
      events.push({ type: 'boss_burn', amount: burn, playerHp: battle.pHp, monsterHp: battle.mHp });
      if (finish()) return { events, ended: true, won: battle.won };
    } else if (m.type === 'shieldCycle') {
      if ((battle.turn % (m.everyTurns || 3)) === 0) {
        monsterShielded = true;
        events.push({ type: 'boss_shield', monsterHp: battle.mHp, playerHp: battle.pHp });
      }
    } else if (m.type === 'enrage') {
      if (battle.mHp / battle.mMaxHp <= (m.triggerHpPct || 0.3)) monsterDmgMod *= (m.dmgMult || 2);
    } else if (m.type === 'phaseShift') {
      if ((battle.turn % (m.everyTurns || 4)) === 0) monsterDmgMod *= (m.dmgMult || 1.5);
    } else if (m.type === 'executioner') {
      if ((battle.turn % (m.everyTurns || 4)) === 0) {
        let mult = m.dmgMult || 2.5;
        if (battle.pHp / battle.pMaxHp < 0.4) mult *= (m.lowHpBonus || 1.5);
        monsterDmgMod *= mult;
      }
    }
  }
  // Skills/abilities : onTurnStart (heals).
  for (const h of runHook(battle, 'onTurnStart', hookCtx(battle))) {
    if (h.result.kind === 'heal') {
      const amt = applyHeal(battle, h.result.amount);
      battle.pHp = Math.min(battle.pMaxHp, battle.pHp + amt);
      events.push({ type: 'skill_heal', amount: amt, skill: h.skill.id, emoji: h.skill.emoji, playerHp: battle.pHp, monsterHp: battle.mHp });
    }
  }

  // ── Action resolution ───────────────────────────────────────
  let playerFirst = true;
  let actionDmgMult = 1;
  let damageReduction = 0;
  let defendHeal = 0;
  let playerAttacks = true;
  let monsterFrozen = false;

  let specialMode = null;
  if (actionId === 'power') {
    actionDmgMult = POWER_MULT;
    playerFirst = false;
    battle.cooldowns.power = POWER_CD;
  } else if (actionId === 'defend') {
    playerAttacks = false;
    damageReduction = DEFEND_REDUCTION;
    defendHeal = Math.round(battle.pMaxHp * DEFEND_HEAL_PCT);
  } else if (actionId === 'special') {
    specialMode = battle.special;
    battle.gauge = 0;
    // Multiplicateur par signature ; lightning gère ses 3 frappes plus bas.
    actionDmgMult = { fire: 1.6, frost: 1.4, poison: 1.2, lightning: 0.65, void: 1.5, none: 1.3 }[specialMode.id] || 1.3;
  }

  const playerPhase = () => {
    if (!playerAttacks || battle.ended) return;
    // Hooks : forceCrit / heal / damage multipliers.
    let forceCrit = false;
    let extraMult = actionDmgMult;
    const mults = [];
    if (actionId === 'power') mults.push({ emoji: '💥', label: 'Frappe Puissante' });
    for (const h of runHook(battle, 'onPlayerAttack', hookCtx(battle))) {
      if (h.result.kind === 'forceCrit') forceCrit = true;
      if (h.result.kind === 'heal') {
        const before = battle.pHp;
        battle.pHp = Math.min(battle.pMaxHp, battle.pHp + applyHeal(battle, h.result.amount));
        if (battle.pHp > before) events.push({ type: 'skill_heal', amount: battle.pHp - before, skill: h.skill.id, emoji: h.skill.emoji, playerHp: battle.pHp, monsterHp: battle.mHp });
      }
    }
    for (const h of runHook(battle, 'onDamageCalc', hookCtx(battle))) {
      if (h.result.kind === 'mult') {
        extraMult *= h.result.mult;
        if (h.result.label) mults.push({ emoji: h.skill.emoji, label: h.result.label });
      }
    }
    if (battle.setEffectIds.has('shadow_strike') && battle.shadowDodgeCharge) {
      forceCrit = true;
      battle.shadowDodgeCharge = false;
      mults.push({ emoji: '🌑', label: 'Frappe d\'ombre' });
    }
    if (battle.setEffectIds.has('dragon_breath') && Math.random() < 0.15) {
      extraMult *= 2;
      mults.push({ emoji: '🐉', label: 'Souffle dragon' });
    }
    if (battle.demonPactReady) {
      battle.demonPactReady = false;
      extraMult *= 3;
      mults.push({ emoji: '👹', label: 'Pacte démoniaque' });
    }
    if (battle.bloodPactReady) {
      battle.bloodPactReady = false;
      extraMult *= 3;
      mults.push({ emoji: '🩸', label: 'Pacte de Sang' });
    }
    if (battle.momentumStacks > 0 && battle.turn > 1) {
      extraMult *= 1 + 0.06 * battle.momentumStacks * (battle.turn - 1);
      mults.push({ emoji: '🌀', label: 'Élan' });
    }
    if (battle.executeStacks > 0 && battle.mHp / battle.mMaxHp < 0.30) {
      extraMult *= 1 + 0.5 * battle.executeStacks;
      mults.push({ emoji: '🪓', label: 'Faucheur' });
    }
    if (specialMode) {
      events.push({ type: 'special_cast', name: specialMode.name, emoji: specialMode.emoji, playerHp: battle.pHp, monsterHp: battle.mHp });
      mults.push({ emoji: specialMode.emoji, label: specialMode.name });
    }
    // Annihilation (void) perce boucliers et carapaces.
    const piercing = specialMode?.id === 'void';
    const swings = specialMode?.id === 'lightning' ? 3 : 1;
    let hit = 0;          // total des dégâts du tour (sert aux riders ci-dessous)
    let isCrit = false;   // au moins un crit dans le tour
    for (let s = 0; s < swings && battle.mHp > 0; s++) {
      const swingCrit = (s === 0 && forceCrit) || Math.random() < battle.critChance;
      let swing = Math.round(battle.pBaseDmg * (swingCrit ? 2 : 1) * (1 + battle.elemBonus * Math.random()) * extraMult * battle.dmgBuffMult);
      if (!piercing && swing > battle.playerHitCap) swing = battle.playerHitCap;
      if (!piercing && monsterShielded) swing = 0;
      battle.mHp = Math.max(0, battle.mHp - swing);
      hit += swing;
      isCrit = isCrit || swingCrit;
      events.push({ type: 'player_hit', dmg: swing, isCrit: swingCrit, forceCrit, monsterHp: battle.mHp, playerHp: battle.pHp, mults: s === 0 ? mults : [{ emoji: '⚡', label: 'Tempête' }], blocked: !piercing && monsterShielded });
    }
    // Effets de signature post-frappe.
    if (specialMode && hit > 0) {
      if (specialMode.id === 'fire') {
        battle.mStatuses.burn = { turns: 3, dmgPerTurn: Math.max(1, Math.round(battle.mMaxHp * 0.04)) };
        events.push({ type: 'status_apply', status: 'burn', emoji: '🔥', label: 'Brûlure', monsterHp: battle.mHp, playerHp: battle.pHp });
      } else if (specialMode.id === 'frost') {
        battle.mStatuses.freeze = { turns: 1 };
        battle.mStatuses.chill = { turns: 2 };
        events.push({ type: 'status_apply', status: 'freeze', emoji: '❄', label: 'Gel + Givre', monsterHp: battle.mHp, playerHp: battle.pHp });
      } else if (specialMode.id === 'poison') {
        battle.mStatuses.poison = { turns: 5, dmgPerTurn: Math.max(1, Math.round(battle.mMaxHp * 0.04)) };
        events.push({ type: 'status_apply', status: 'poison', emoji: '☠', label: 'Poison', monsterHp: battle.mHp, playerHp: battle.pHp });
      } else if (specialMode.id === 'none') {
        battle.dmgBuffMult *= 1.2;
        events.push({ type: 'status_apply', status: 'warcry', emoji: '💢', label: '+20 % dégâts', monsterHp: battle.mHp, playerHp: battle.pHp });
      }
    }

    // Relic lifesteal.
    if (battle.lifestealPct > 0 && hit > 0) {
      const healed = applyHeal(battle, Math.max(1, Math.round(hit * battle.lifestealPct)));
      const before = battle.pHp;
      battle.pHp = Math.min(battle.pMaxHp, battle.pHp + healed);
      if (battle.pHp > before) events.push({ type: 'set_drain', amount: battle.pHp - before, emoji: '🩸', playerHp: battle.pHp, monsterHp: battle.mHp });
    }
    // Monster thorns affix.
    for (const m of battle.mechanics) {
      if (m.type === 'thorns' && hit > 0) {
        const ret = Math.max(1, Math.round(hit * (m.reflectPct || 0.25)));
        battle.pHp = Math.max(0, battle.pHp - ret);
        events.push({ type: 'monster_thorns', amount: ret, emoji: '🌵', playerHp: battle.pHp, monsterHp: battle.mHp });
      }
    }
    if (finish()) return;
    // Legendary : chainLightning → crit triggers a 50% follow-up.
    if (battle.legendaryEffects.has('chainLightning') && isCrit && hit > 0 && !monsterShielded) {
      const follow = Math.max(1, Math.round(hit * 0.5));
      battle.mHp = Math.max(0, battle.mHp - follow);
      events.push({ type: 'player_hit', dmg: follow, isCrit: false, monsterHp: battle.mHp, playerHp: battle.pHp, mults: [{ emoji: '⚡', label: 'Foudre en Chaîne' }] });
      if (finish()) return;
    }
    // Legendary : voidEcho → 12% chance the attack repeats.
    if (battle.legendaryEffects.has('voidEcho') && hit > 0 && !monsterShielded && Math.random() < 0.12) {
      battle.mHp = Math.max(0, battle.mHp - hit);
      events.push({ type: 'player_hit', dmg: hit, isCrit: false, monsterHp: battle.mHp, playerHp: battle.pHp, mults: [{ emoji: '🌑', label: 'Écho du Néant' }] });
      if (finish()) return;
    }
    // Legendary : vampireMark → heal 8% of damage dealt.
    if (battle.legendaryEffects.has('vampireMark') && hit > 0) {
      const healed = applyHeal(battle, Math.max(1, Math.round(hit * 0.08)));
      const before = battle.pHp;
      battle.pHp = Math.min(battle.pMaxHp, battle.pHp + healed);
      if (battle.pHp > before) events.push({ type: 'set_drain', amount: battle.pHp - before, emoji: '🧛', playerHp: battle.pHp, monsterHp: battle.mHp });
    }
    // Set : lich_drain → heal 10% of damage dealt.
    if (battle.setEffectIds.has('lich_drain') && hit > 0) {
      const healed = applyHeal(battle, Math.max(1, Math.round(hit * 0.10)));
      const before = battle.pHp;
      battle.pHp = Math.min(battle.pMaxHp, battle.pHp + healed);
      if (battle.pHp > before) events.push({ type: 'set_drain', amount: battle.pHp - before, emoji: '🧪', playerHp: battle.pHp, monsterHp: battle.mHp });
    }
    // Set : frost_freeze → 20% chance the monster skips its turn.
    if (battle.setEffectIds.has('frost_freeze') && hit > 0 && Math.random() < 0.20) {
      monsterFrozen = true;
      events.push({ type: 'set_freeze', emoji: '❄', playerHp: battle.pHp, monsterHp: battle.mHp });
    }
  };

  const monsterPhase = () => {
    if (battle.ended || battle.mHp <= 0 || monsterFrozen) return;
    // Statut Gel (Blizzard) : le monstre passe son tour.
    if (battle.mStatuses.freeze) {
      delete battle.mStatuses.freeze;
      events.push({ type: 'status_freeze_skip', emoji: '❄', playerHp: battle.pHp, monsterHp: battle.mHp });
      return;
    }
    // Dodges : skill hooks then set effects.
    let dodged = runHook(battle, 'onMonsterAttack', hookCtx(battle)).some(h => h.result.kind === 'dodge');
    if (!dodged && battle.setEffectIds.has('titan_wall') && Math.random() < 0.15) {
      dodged = true;
      events.push({ type: 'set_dodge', emoji: '🛡', playerHp: battle.pHp, monsterHp: battle.mHp });
    }
    if (!dodged && battle.setEffectIds.has('wanderer_haste') && Math.random() < 0.25) {
      dodged = true;
      events.push({ type: 'set_dodge', emoji: '🧭', playerHp: battle.pHp, monsterHp: battle.mHp });
    }
    if (dodged) {
      if (battle.setEffectIds.has('shadow_strike')) battle.shadowDodgeCharge = true;
      const last = events[events.length - 1];
      if (!last || last.type !== 'set_dodge') events.push({ type: 'skill_dodge', playerHp: battle.pHp, monsterHp: battle.mHp });
      return;
    }
    // Givre (Blizzard) : −25 % dégâts du monstre tant que le statut court.
    const chillMod = battle.mStatuses.chill ? 0.75 : 1;
    const dmg = Math.max(1, Math.round(battle.monsterDmg * monsterDmgMod * chillMod * (1 - damageReduction)));
    applyMonsterHit(battle, events, dmg, { enraged: monsterDmgMod > 1 });
    if (finish()) return;
    // Swift affix : chance of a second strike.
    const swift = battle.mechanics.find(m => m.type === 'swift');
    if (swift && battle.pHp > 0 && Math.random() < (swift.chance || 0.3)) {
      applyMonsterHit(battle, events, dmg, { swift: true });
      if (finish()) return;
    }
    // Relic thorns : reflect 20% per stack of the blow taken.
    if (battle.thornsStacks > 0 && battle.mHp > 0) {
      const ret = Math.max(1, Math.round(dmg * 0.20 * battle.thornsStacks));
      battle.mHp = Math.max(0, battle.mHp - ret);
      events.push({ type: 'skill_reflect', amount: ret, emoji: '🌵', monsterHp: battle.mHp, playerHp: battle.pHp });
      if (finish()) return;
    }
    // Skills : onTakeDamage reflect.
    for (const h of runHook(battle, 'onTakeDamage', { ...hookCtx(battle), dmgTaken: dmg })) {
      if (h.result.kind === 'reflect') {
        battle.mHp = Math.max(0, battle.mHp - h.result.amount);
        events.push({ type: 'skill_reflect', amount: h.result.amount, emoji: h.skill.emoji, monsterHp: battle.mHp, playerHp: battle.pHp });
        if (finish()) return;
      }
    }
  };

  if (playerFirst) { playerPhase(); monsterPhase(); }
  else { monsterPhase(); playerPhase(); }
  finish();

  // Jauge : chaque action en donne (l'ultime non — il vient de la consommer).
  battle.gauge = Math.min(battle.gaugeMax, battle.gauge + (GAUGE_GAIN[actionId] || 0));

  // Defend : end-of-turn heal.
  if (defendHeal > 0 && !battle.ended) {
    const amt = applyHeal(battle, defendHeal);
    const before = battle.pHp;
    battle.pHp = Math.min(battle.pMaxHp, battle.pHp + amt);
    const gained = battle.pHp - before;
    if (gained > 0) events.push({ type: 'skill_heal', amount: gained, emoji: '🛡', playerHp: battle.pHp, monsterHp: battle.mHp });
  }

  battle.lastAction = actionId;
  return { events, ended: battle.ended, won: battle.won };
}

// Auto-pick : what a competent player would do.
export function autoChoice(battle) {
  const pPct = battle.pHp / battle.pMaxHp;
  const mPct = battle.mHp / battle.mMaxHp;
  if (pPct < 0.3 && canUseAction(battle, 'defend')) return 'defend';
  // Ultime : le lâcher dès qu'il est prêt, sauf si le monstre est presque
  // mort (gaspillage), ou si son bouclier va se lever ce tour-ci.
  const shieldNext = battle.mechanics.some(m => m.type === 'shieldCycle' && ((battle.turn + 1) % (m.everyTurns || 3)) === 0);
  if (canUseAction(battle, 'special') && mPct > 0.15 && !shieldNext) return 'special';
  if (canUseAction(battle, 'power')) {
    if (mPct < 0.25) return 'power';
    if (mPct > 0.7 && pPct > 0.6) return 'power';
  }
  return 'attack';
}
