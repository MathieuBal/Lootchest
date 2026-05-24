// Active abilities: a player-chosen loadout of powerful, cooldown-based effects.
// Unlike passive skills (auto-unlocked by stat thresholds), abilities are slotted
// by the player (up to abilitySlots()) — a real build decision. They reuse the exact
// same combat hook shape as skills (onTurnStart / onPlayerAttack / onDamageCalc /
// onMonsterAttack / onTakeDamage) so resolveFight needs no special handling: they
// are simply merged into the active hook list by buildSkillContext().
import { state } from './state.js';
import { abilitySlots, categoryPoints } from './talents.js';
import { ABILITY_RANK2_PRESTIGE } from './data.js';

export const ABILITIES = [
  {
    id: 'ab_power_strike', emoji: '🗡', name: 'Frappe Puissante',
    desc: 'Tous les 3 tours, ton attaque inflige ×2.5 dégâts.',
    unlockText: 'Disponible', unlock: () => true,
    initState: () => ({ t: 0 }),
    onDamageCalc: (ctx) => {
      ctx.skillState.t += 1;
      if (ctx.skillState.t % 3 === 0) return { kind: 'mult', mult: 2.5, label: '🗡 Frappe Puissante' };
      return null;
    },
  },
  {
    id: 'ab_frenzy', emoji: '⚡', name: 'Frénésie',
    desc: 'Tous les 3 tours, ton attaque est un critique garanti.',
    unlockText: 'Disponible', unlock: () => true,
    initState: () => ({ t: 0 }),
    onPlayerAttack: (ctx) => {
      ctx.skillState.t += 1;
      if (ctx.skillState.t % 3 === 0) return { kind: 'forceCrit' };
      return null;
    },
  },
  {
    id: 'ab_second_wind', emoji: '💚', name: 'Second Souffle',
    desc: 'Une fois par combat, sous 40% PV, soigne 45% PV max.',
    unlockText: 'Disponible', unlock: () => true,
    initState: () => ({ used: false }),
    onTurnStart: (ctx) => {
      if (ctx.skillState.used) return null;
      if (ctx.playerHp / ctx.playerMaxHp >= 0.4) return null;
      ctx.skillState.used = true;
      return { kind: 'heal', amount: Math.floor(ctx.playerMaxHp * 0.45) };
    },
  },
  {
    id: 'ab_war_cry', emoji: '💢', name: 'Cri de Guerre',
    desc: 'Tes dégâts montent de +10% par tour (max +50%).',
    unlockText: '100 monstres tués', unlock: (s) => (s.combat?.kills || 0) >= 100,
    initState: () => ({ stk: 0 }),
    onDamageCalc: (ctx) => {
      ctx.skillState.stk = Math.min(5, ctx.skillState.stk + 1);
      return { kind: 'mult', mult: 1 + 0.1 * ctx.skillState.stk, label: '💢 Cri de Guerre' };
    },
  },
  {
    id: 'ab_haste', emoji: '🌀', name: 'Hâte',
    desc: 'Tous les 4 tours, ton attaque inflige +100% dégâts.',
    unlockText: 'Étage 15', unlock: (s) => (s.combat?.highestUnlocked || 1) >= 15,
    initState: () => ({ t: 0 }),
    onDamageCalc: (ctx) => {
      ctx.skillState.t += 1;
      if (ctx.skillState.t % 4 === 0) return { kind: 'mult', mult: 2.0, label: '🌀 Hâte' };
      return null;
    },
  },
  {
    id: 'ab_execute', emoji: '☠', name: 'Exécution',
    desc: 'Quand le monstre est sous 35% PV, +150% dégâts.',
    unlockText: 'Étage 25', unlock: (s) => (s.combat?.highestUnlocked || 1) >= 25,
    onDamageCalc: (ctx) => {
      if (ctx.monsterHp / ctx.monsterMaxHp < 0.35) return { kind: 'mult', mult: 2.5, label: '☠ Exécution' };
      return null;
    },
  },
  {
    id: 'ab_guard', emoji: '🛡', name: 'Garde',
    desc: 'Bloque une attaque ennemie tous les 4 tours.',
    unlockText: '75 coffres ouverts', unlock: (s) => (s.opened || 0) >= 75,
    initState: () => ({ t: 0 }),
    onMonsterAttack: (ctx) => {
      ctx.skillState.t += 1;
      if (ctx.skillState.t % 4 === 0) return { kind: 'dodge' };
      return null;
    },
  },
  {
    id: 'ab_riposte', emoji: '🌵', name: 'Riposte',
    desc: 'Renvoie 50% des dégâts subis au monstre.',
    unlockText: '200 monstres tués', unlock: (s) => (s.combat?.kills || 0) >= 200,
    onTakeDamage: (ctx) => {
      const ret = Math.max(1, Math.round((ctx.dmgTaken || 0) * 0.5));
      return { kind: 'reflect', amount: ret };
    },
  },
  // --- Tier 2 (prestige-gated) — chacune scale avec une catégorie de talents ---
  {
    id: 'ab_war_scholar', emoji: '📕', name: 'Érudit de Guerre', rank: 2,
    desc: '+8% dégâts par point investi en catégorie Combat.',
    unlockText: 'Prestige 3', unlock: (s) => (s.prestige?.level || 0) >= ABILITY_RANK2_PRESTIGE,
    onDamageCalc: () => {
      const pts = categoryPoints('combat');
      return pts > 0 ? { kind: 'mult', mult: 1 + 0.08 * pts, label: '📕 Érudit de Guerre' } : null;
    },
  },
  {
    id: 'ab_treasury', emoji: '🏦', name: 'Trésorier', rank: 2,
    desc: 'Crit garanti tous les 5 tours · +5% dégâts par point en Richesse.',
    unlockText: 'Prestige 3', unlock: (s) => (s.prestige?.level || 0) >= ABILITY_RANK2_PRESTIGE,
    initState: () => ({ t: 0 }),
    onPlayerAttack: (ctx) => { ctx.skillState.t += 1; return ctx.skillState.t % 5 === 0 ? { kind: 'forceCrit' } : null; },
    onDamageCalc: () => {
      const pts = categoryPoints('wealth');
      return pts > 0 ? { kind: 'mult', mult: 1 + 0.05 * pts, label: '🏦 Trésorier' } : null;
    },
  },
  {
    id: 'ab_overload', emoji: '🔆', name: 'Surcharge', rank: 2,
    desc: 'Soigne 6% PV max par tour, +1% par point en Utilitaire.',
    unlockText: 'Prestige 3', unlock: (s) => (s.prestige?.level || 0) >= ABILITY_RANK2_PRESTIGE,
    onTurnStart: (ctx) => {
      const pct = 0.06 + 0.01 * categoryPoints('utility');
      return { kind: 'heal', amount: Math.floor(ctx.playerMaxHp * pct) };
    },
  },
];

export const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map(a => [a.id, a]));

export function isAbilityUnlocked(id) {
  const a = ABILITY_BY_ID[id];
  return !!a && a.unlock(state);
}

export function unlockedAbilities() {
  return ABILITIES.filter(a => a.unlock(state));
}

// The loadout as an array of ability ids (cleaned of unknown/locked entries).
export function getLoadout() {
  const raw = Array.isArray(state.loadout) ? state.loadout : [];
  return raw.filter(id => ABILITY_BY_ID[id] && isAbilityUnlocked(id)).slice(0, abilitySlots());
}

// Ability definitions currently slotted (used by combat).
export function getSlottedAbilities() {
  return getLoadout().map(id => ABILITY_BY_ID[id]);
}

export function isSlotted(id) {
  return getLoadout().includes(id);
}

// Toggle an ability in/out of the loadout. Returns true if the loadout changed.
export function toggleAbility(id) {
  if (!isAbilityUnlocked(id)) return false;
  if (!Array.isArray(state.loadout)) state.loadout = [];
  const idx = state.loadout.indexOf(id);
  if (idx >= 0) {
    state.loadout.splice(idx, 1);
    return true;
  }
  if (getLoadout().length >= abilitySlots()) return false;
  state.loadout.push(id);
  return true;
}
