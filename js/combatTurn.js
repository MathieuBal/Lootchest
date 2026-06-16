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
import { PLAYER_BASE, prestigeDamageMult, prestigeHpMult, biomeForFloor, depthPowerMult } from './data.js';
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
// Renvoie aussi le second pour les micro-procs (cf. secondaryElement).
function rankedElements(stats) {
  const pools = [
    ['fire', stats.fireDmg || 0], ['frost', stats.frostDmg || 0],
    ['poison', stats.poisonDmg || 0], ['lightning', stats.lightningDmg || 0],
    ['void', stats.voidDmg || 0],
  ];
  pools.sort((a, b) => b[1] - a[1]);
  return pools;
}
export function specialForStats(stats) {
  const top = rankedElements(stats)[0];
  return top[1] > 0 ? SPECIALS[top[0]] : SPECIALS.none;
}
// Second élément du build — sert aux micro-procs en attaque normale.
// La proba scale avec sa magnitude relative au dominant (max ~12 % à parité).
export function secondaryElement(stats) {
  const ranked = rankedElements(stats);
  if (ranked[1][1] < 5) return null; // négligeable
  const ratio = ranked[1][1] / Math.max(1, ranked[0][1]);
  return { id: ranked[1][0], procChance: Math.min(0.12, 0.04 + 0.08 * ratio) };
}

const GAUGE_MAX = 100;
const GAUGE_GAIN = { attack: 14, power: 22, defend: 10, special: 0 };
const GAUGE_ON_HIT_TAKEN = 8;

// === Affinités élémentaires par biome ===
// Le monstre prend +50 % de la part élémentaire s'il est faible à ton élément
// dominant, −50 % s'il y résiste. Affiché sur sa carte → choix d'équipement.
export const BIOME_ELEMENTS = {
  forest: { weak: 'fire',      resist: 'poison' },   // plantes : brûlent, immunisées au venin
  cave:   { weak: 'lightning', resist: 'frost' },    // roche humide conductrice, froide de nature
  castle: { weak: 'void',      resist: 'frost' },    // morts-vivants : le néant les disloque
  hell:   { weak: 'frost',     resist: 'fire' },     // démons : givre oui, feu non
  void:   { weak: 'lightning', resist: 'void' },     // créatures du néant
};
export const ELEMENT_META = {
  fire: { emoji: '🔥', name: 'Feu' }, frost: { emoji: '❄', name: 'Givre' },
  poison: { emoji: '☠', name: 'Poison' }, lightning: { emoji: '⚡', name: 'Foudre' },
  void: { emoji: '🌑', name: 'Néant' },
};

// === Attaque chargée (boss/élites) ===
// Le monstre télégraphie : tour N il CHARGE (n'attaque pas), tour N+1 il
// déchaîne ×2.3. Réponses : Défendre (−60 %), le tuer avant, ou le Geler
// (annule la charge). C'est ce qui donne un usage réel à Défendre.
const CHARGE_MULT = 2.3;
const CHARGE_COOLDOWN = 3;   // tours mini entre deux charges
const CHARGE_CHANCE = 0.45;  // proba de charger quand le CD est prêt

// === Combo ===
// Chaque action offensive consécutive empile +8 % de dégâts (cap ×5 = +40 %).
// Encaisser un coup brise le combo — esquiver, geler ou tuer vite le préserve.
// Récompense le jeu agressif et les builds esquive/contrôle.
const COMBO_STEP = 0.08;
const COMBO_CAP = 5;

// === Embuscades ===
// Variance d'ouverture : parfois le monstre frappe en premier (élites surtout),
// parfois c'est toi qui le surprends (il perd son premier tour).
const AMBUSH_MONSTER_CHANCE = 0.12;
const AMBUSH_MONSTER_CHANCE_ELITE = 0.22;
const AMBUSH_PLAYER_CHANCE = 0.12;

export function createBattle(monster, opts = {}) {
  const mods = opts.mods || {};
  const dmgMod = mods.damageMult || 1;
  const takenMod = mods.dmgTakenMult || 1;
  const maxHpMod = mods.maxHpMult || 1;
  const stats = computeStats();
  const vlg = villageCombatBonus();
  const pLvl = state.prestige?.level || 0;
  const depthMult = depthPowerMult(monster.floor); // BAL-012 (levier C) — cohérent avec resolveFight

  const pMaxHp = Math.round((PLAYER_BASE.hp + (stats.vitality || 0) * 5) * hpMultiplier() * relicHpMult() * prestigeHpMult(pLvl) * affinityHpMult() * vlg.hpMult * maxHpMod * depthMult);
  const pBaseDmg = Math.max(1, Math.round((PLAYER_BASE.damage + (stats.damage || 0)) * damageMultiplier() * relicDamageMult() * prestigeDamageMult(pLvl) * affinityDamageMult() * vlg.dmgMult * dmgMod * depthMult * (1 - armorMitigation(monster.armor))));
  const monsterDmg = Math.max(1, Math.round(monster.damage * relicDmgTakenMult() * takenMod * (1 - armorMitigation(stats.armor || 0))));

  // Elemental pool : additive % bonus rolled 0..max per swing, capped.
  const arcaneMult = affinityElemMult();
  let elemBonus = Math.min(
    ELEM_DMG_CAP * arcaneMult,
    (((stats.fireDmg || 0) + (stats.frostDmg || 0) + (stats.voidDmg || 0) + (stats.poisonDmg || 0) + (stats.lightningDmg || 0)) / 100) * relicElemMult() * arcaneMult,
  );
  // Affinité biome vs élément dominant du joueur : ±50 % sur la part élémentaire.
  const special = specialForStats(stats);
  const secondary = secondaryElement(stats);
  const biome = monster.floor ? biomeForFloor(monster.floor) : null;
  const biomeElems = biome ? BIOME_ELEMENTS[biome.baseId || biome.id] : null;
  let elemAffinity = null;
  if (biomeElems && special.id !== 'none') {
    if (special.id === biomeElems.weak)   { elemBonus *= 1.5; elemAffinity = 'weak'; }
    if (special.id === biomeElems.resist) { elemBonus *= 0.5; elemAffinity = 'resist'; }
  }

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
    // startGauge permet de la conserver entre combats en mode Boucle — le farm
    // peut alors planifier « j'ouvre le suivant avec un Blizzard ».
    gauge: opts.startGauge != null ? Math.max(0, Math.min(GAUGE_MAX, opts.startGauge)) : 0,
    gaugeMax: GAUGE_MAX,
    special,
    secondary,
    biomeElems, elemAffinity,
    // Attaque chargée : 'attack' | 'windup' (charge, n'attaque pas) | 'unleash' (×2.3)
    mNextMove: 'attack',
    mChargeCd: CHARGE_COOLDOWN,
    canCharge: !!(monster.isBoss || monster.isElite),
    // Combo offensif + embuscade d'ouverture + coup de grâce à l'ultime.
    combo: 0,
    ambush: rollAmbush(monster),
    finisher: false,
    // Statuts infligés au monstre : { burn: {turns, dmgPerTurn}, poison: {...},
    // freeze: {turns}, chill: {turns} }. Tick à chaque début de tour.
    mStatuses: {},
    dmgBuffMult: 1,   // Cri de Guerre : buff permanent pour le combat
    ended: false,
    won: null,
    fled: false,
  };
}

function rollAmbush(monster) {
  // Les boss n'embusquent pas (leurs charges suffisent) ; toi tu peux les surprendre.
  if (!monster.isBoss && Math.random() < (monster.isElite ? AMBUSH_MONSTER_CHANCE_ELITE : AMBUSH_MONSTER_CHANCE)) return 'monster';
  if (Math.random() < AMBUSH_PLAYER_CHANCE) return 'player';
  return null;
}

export function canUseAction(battle, actionId) {
  if (battle.ended) return false;
  switch (actionId) {
    case 'attack':  return true;
    // Frappe Puissante : CD 2 ET interdite si déjà jouée au dernier tour.
    // Empêche le spam ×2.2 contre le trash où le malus « monstre frappe en
    // premier » est négligeable — la rend un vrai choix tactique.
    case 'power':   return (battle.cooldowns.power || 0) <= 0 && battle.lastAction !== 'power';
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
  // Encaisser un coup SIGNIFICATIF (>5 % PV max) brise le combo. Les
  // égratignures n'interrompent pas — l'armure et la mitigation deviennent
  // une voie vers le combo, au même titre que l'esquive et le gel.
  if (dmg > battle.pMaxHp * 0.05 && battle.combo > 0) {
    const broken = battle.combo;
    battle.combo = 0;
    if (broken >= 2) events.push({ type: 'combo_break', broken, playerHp: battle.pHp, monsterHp: battle.mHp });
  }
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

  // Embuscades — uniquement le premier tour.
  if (battle.turn === 1) {
    if (battle.ambush === 'monster') playerFirst = false;
    else if (battle.ambush === 'player') monsterFrozen = true;
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
    // Combo : +8 % par action offensive consécutive (cap +40 %).
    if (battle.combo > 0) {
      extraMult *= 1 + COMBO_STEP * Math.min(battle.combo, COMBO_CAP);
      mults.push({ emoji: '🔥', label: `Combo ×${Math.min(battle.combo, COMBO_CAP)}` });
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
    // Coup de grâce : tuer avec l'ultime = bonus d'or (géré par le caller).
    if (specialMode && battle.mHp <= 0) battle.finisher = true;

    // L'action offensive empile le combo — un coup reçu APRÈS (riposte du
    // monstre) le brisera via applyMonsterHit : il représente donc les
    // attaques enchaînées sans encaisser.
    battle.combo += 1;

    // Micro-procs de l'élément secondaire : seulement sur Attaquer/Power
    // (l'ultime déjà spectaculaire, suffirait à dominer). Refresh-pas-empile
    // pour ne pas dépasser la version Spécial. Touche le trash où la jauge
    // n'a pas le temps de se remplir.
    if (battle.secondary && !specialMode && hit > 0 && Math.random() < battle.secondary.procChance) {
      const id = battle.secondary.id;
      if (id === 'fire' && (!battle.mStatuses.burn || battle.mStatuses.burn.turns <= 0)) {
        battle.mStatuses.burn = { turns: 1, dmgPerTurn: Math.max(1, Math.round(battle.mMaxHp * 0.02)) };
        events.push({ type: 'proc_apply', element: 'fire', emoji: '🔥', label: 'Étincelle', monsterHp: battle.mHp, playerHp: battle.pHp });
      } else if (id === 'frost' && !battle.mStatuses.chill) {
        battle.mStatuses.chill = { turns: 1 };
        events.push({ type: 'proc_apply', element: 'frost', emoji: '🧊', label: 'Engourdi', monsterHp: battle.mHp, playerHp: battle.pHp });
      } else if (id === 'poison' && (!battle.mStatuses.poison || battle.mStatuses.poison.turns <= 1)) {
        battle.mStatuses.poison = { turns: 2, dmgPerTurn: Math.max(1, Math.round(battle.mMaxHp * 0.02)) };
        events.push({ type: 'proc_apply', element: 'poison', emoji: '☠', label: 'Toxine', monsterHp: battle.mHp, playerHp: battle.pHp });
      } else if (id === 'lightning') {
        const bolt = Math.max(1, Math.round(hit * 0.25));
        battle.mHp = Math.max(0, battle.mHp - bolt);
        events.push({ type: 'proc_apply', element: 'lightning', emoji: '⚡', label: 'Foudre', amount: bolt, monsterHp: battle.mHp, playerHp: battle.pHp });
      } else if (id === 'void') {
        // Pic pur, perce la moitié de l'armure conceptuellement.
        const pierce = Math.max(1, Math.round(battle.pBaseDmg * 0.35));
        battle.mHp = Math.max(0, battle.mHp - pierce);
        events.push({ type: 'proc_apply', element: 'void', emoji: '🌑', label: 'Faille', amount: pierce, monsterHp: battle.mHp, playerHp: battle.pHp });
      }
      if (battle.mHp <= 0) battle.ended = true; // proc letal autorisé
      if (battle.mHp <= 0) battle.won = true;
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
    // Statut Gel (Blizzard) : le monstre passe son tour — et une charge en
    // cours est ANNULÉE (le contre du build givre).
    if (battle.mStatuses.freeze) {
      delete battle.mStatuses.freeze;
      const wasCharging = battle.mNextMove !== 'attack';
      if (wasCharging) { battle.mNextMove = 'attack'; battle.mChargeCd = CHARGE_COOLDOWN; }
      events.push({ type: 'status_freeze_skip', emoji: '❄', chargeCancelled: wasCharging, playerHp: battle.pHp, monsterHp: battle.mHp });
      return;
    }
    // Charge télégraphiée : tour de windup = le monstre n'attaque pas.
    if (battle.mNextMove === 'windup') {
      events.push({ type: 'charge_windup', emoji: '💢', playerHp: battle.pHp, monsterHp: battle.mHp });
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
    // Attaque dévastatrice (fin de charge) : ×2.3.
    const chargeMod = battle.mNextMove === 'unleash' ? CHARGE_MULT : 1;
    const dmg = Math.max(1, Math.round(battle.monsterDmg * monsterDmgMod * chillMod * chargeMod * (1 - damageReduction)));
    applyMonsterHit(battle, events, dmg, { enraged: monsterDmgMod > 1, charged: chargeMod > 1 });
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

  // Machine à états de la charge : windup → unleash → repos (CD).
  if (!battle.ended) {
    if (battle.mNextMove === 'windup') battle.mNextMove = 'unleash';
    else if (battle.mNextMove === 'unleash') { battle.mNextMove = 'attack'; battle.mChargeCd = CHARGE_COOLDOWN; }
    else if (battle.canCharge) {
      battle.mChargeCd -= 1;
      if (battle.mChargeCd <= 0 && Math.random() < CHARGE_CHANCE) battle.mNextMove = 'windup';
    }
  }

  battle.lastAction = actionId;
  return { events, ended: battle.ended, won: battle.won };
}

// Intention du monstre pour le PROCHAIN tour — affichée sur sa carte.
// C'est l'info qui transforme Défendre en vraie décision tactique.
export function getIntent(battle) {
  if (!battle || battle.ended) return null;
  const nextTurn = battle.turn + 1;
  const shield = battle.mechanics.some(m => m.type === 'shieldCycle' && (nextTurn % (m.everyTurns || 3)) === 0);
  const enrage = battle.mechanics.find(m => m.type === 'enrage' && battle.mHp / battle.mMaxHp <= (m.triggerHpPct || 0.3));
  const chillMod = battle.mStatuses.chill ? 0.75 : 1;
  const estim = Math.round(battle.monsterDmg * (enrage ? (enrage.dmgMult || 2) : 1) * chillMod);
  if (battle.mStatuses.freeze) return { type: 'frozen',  emoji: '❄',  text: 'Gelé — il passera son tour', shield };
  if (battle.mNextMove === 'windup')  return { type: 'windup',  emoji: '💢', text: 'CHARGE une attaque dévastatrice !', shield };
  if (battle.mNextMove === 'unleash') return { type: 'unleash', emoji: '💥', text: `DÉVASTATION imminente (~${Math.round(estim * CHARGE_MULT)}) — défends-toi !`, shield };
  return { type: 'attack', emoji: '⚔', text: `Va attaquer (~${estim})${shield ? ' · 🛡 bouclier' : ''}`, shield };
}

// Auto-pick : what a competent player would do.
export function autoChoice(battle) {
  const pPct = battle.pHp / battle.pMaxHp;
  const mPct = battle.mHp / battle.mMaxHp;
  const shieldNext = battle.mechanics.some(m => m.type === 'shieldCycle' && ((battle.turn + 1) % (m.everyTurns || 3)) === 0);
  // Dévastation annoncée : finir le monstre si possible, sinon Défendre.
  if (battle.mNextMove === 'unleash') {
    if (battle.mHp <= battle.pBaseDmg) return 'attack';
    if (canUseAction(battle, 'defend')) return 'defend';
    if (canUseAction(battle, 'special') && mPct > 0.15 && !shieldNext) return 'special';
  }
  // Windup : le monstre n'attaque pas ce tour → Frappe Puissante gratuite.
  if (battle.mNextMove === 'windup' && canUseAction(battle, 'power')) return 'power';
  if (pPct < 0.3 && canUseAction(battle, 'defend')) return 'defend';
  // Ultime : le lâcher dès qu'il est prêt, sauf si le monstre est presque
  // mort (gaspillage), ou si son bouclier va se lever ce tour-ci.
  if (canUseAction(battle, 'special') && mPct > 0.15 && !shieldNext) return 'special';
  if (canUseAction(battle, 'power')) {
    if (mPct < 0.25) return 'power';
    if (mPct > 0.7 && pPct > 0.6) return 'power';
  }
  return 'attack';
}
