// Combat skills: passive abilities that trigger automatically during fights.
// Each skill is unlocked by reaching certain stat or talent thresholds.
import { state } from './state.js';
import { computeStats } from './character.js';

// Skills are checked in order; multiple can be active at once.
// Hooks: onTurnStart, onPlayerAttack, onDamageCalc, onMonsterAttack.
export const SKILLS = [
  {
    id: 'heal',
    emoji: '❤️‍🩹',
    name: 'Soin Vital',
    desc: 'Soigne 30% PV max une fois par combat si tes PV passent sous 30%.',
    unlockText: 'Vie totale ≥ 60',
    isUnlocked: (stats) => (stats.vitality || 0) >= 60,
    initState: () => ({ used: false }),
    onTurnStart: (ctx) => {
      if (ctx.skillState.used) return null;
      if (ctx.playerHp / ctx.playerMaxHp >= 0.3) return null;
      ctx.skillState.used = true;
      const heal = Math.floor(ctx.playerMaxHp * 0.3);
      return { kind: 'heal', amount: heal };
    },
  },
  {
    id: 'berserker',
    emoji: '💢',
    name: 'Rage du Berserker',
    desc: 'Tant que tes PV sont sous 50%, tes dégâts gagnent +50%.',
    unlockText: 'Talent Berserker rang 3+',
    isUnlocked: (stats, talents) => (talents.berserker || 0) >= 3,
    onDamageCalc: (ctx) => {
      if (ctx.playerHp / ctx.playerMaxHp < 0.5) {
        return { kind: 'mult', mult: 1.5, label: '💢' };
      }
      return null;
    },
  },
  {
    id: 'fireball',
    emoji: '🔥',
    name: 'Boule de Feu',
    desc: 'Le premier coup du combat fait le double de dégâts.',
    unlockText: 'Dégâts feu ≥ 30%',
    isUnlocked: (stats) => (stats.fireDmg || 0) >= 30,
    initState: () => ({ fired: false }),
    onDamageCalc: (ctx) => {
      if (ctx.skillState.fired) return null;
      ctx.skillState.fired = true;
      return { kind: 'mult', mult: 2.0, label: '🔥' };
    },
  },
  {
    id: 'dodge',
    emoji: '💨',
    name: 'Esquive',
    desc: '20% chance d\'esquiver une attaque ennemie par tour.',
    unlockText: 'Vitesse ≥ 25%',
    isUnlocked: (stats) => (stats.speed || 0) >= 25,
    onMonsterAttack: () => {
      if (Math.random() < 0.20) return { kind: 'dodge' };
      return null;
    },
  },
  {
    id: 'first_strike',
    emoji: '⚡',
    name: 'Frappe Foudroyante',
    desc: 'Ta première attaque est garantie en critique.',
    unlockText: 'Crit ≥ 30%',
    isUnlocked: (stats) => (stats.crit || 0) >= 30,
    initState: () => ({ fired: false }),
    onPlayerAttack: (ctx) => {
      if (ctx.skillState.fired) return null;
      ctx.skillState.fired = true;
      return { kind: 'forceCrit' };
    },
  },
  {
    id: 'execute',
    emoji: '☠',
    name: 'Coup Mortel',
    desc: 'Si le monstre est sous 20% PV, tes dégâts sont triplés.',
    unlockText: 'Dégâts ≥ 80 OU Berserker rang 5',
    isUnlocked: (stats, talents) => (stats.damage || 0) >= 80 || (talents.berserker || 0) >= 5,
    onDamageCalc: (ctx) => {
      if (ctx.monsterHp / ctx.monsterMaxHp < 0.2) {
        return { kind: 'mult', mult: 3.0, label: '☠' };
      }
      return null;
    },
  },
  {
    id: 'thorns',
    emoji: '🌵',
    name: 'Épines',
    desc: 'Renvoie 20% des dégâts subis au monstre.',
    unlockText: 'Armure ≥ 40',
    isUnlocked: (stats) => (stats.armor || 0) >= 40,
    onTakeDamage: (ctx) => {
      const ret = Math.max(1, Math.round(ctx.dmgTaken * 0.2));
      return { kind: 'reflect', amount: ret };
    },
  },
  {
    id: 'lucky_strike',
    emoji: '🍀',
    name: 'Coup Chanceux',
    desc: '10% de chance que chaque coup soit un crit (en plus du crit normal).',
    unlockText: '"Or trouvé" ≥ 30%',
    isUnlocked: (stats) => (stats.goldFind || 0) >= 30,
    onPlayerAttack: () => {
      if (Math.random() < 0.10) return { kind: 'forceCrit' };
      return null;
    },
  },
  {
    id: 'tempest',
    emoji: '🌪',
    name: 'Tempête',
    desc: '15% par coup : ton attaque inflige les dégâts deux fois.',
    unlockText: 'Vitesse ≥ 40%',
    isUnlocked: (stats) => (stats.speed || 0) >= 40,
    onDamageCalc: () => {
      if (Math.random() < 0.15) return { kind: 'mult', mult: 2.0, label: '🌪' };
      return null;
    },
  },
  {
    id: 'vampirism',
    emoji: '🩸',
    name: 'Vampirisme',
    desc: 'Soigne 5% de tes PV max à chaque coup porté.',
    unlockText: 'Vie totale ≥ 100',
    isUnlocked: (stats) => (stats.vitality || 0) >= 100,
    onPlayerAttack: (ctx) => {
      const heal = Math.max(1, Math.round(ctx.playerMaxHp * 0.05));
      return { kind: 'heal', amount: heal };
    },
  },
  {
    id: 'adrenaline',
    emoji: '💉',
    name: 'Adrénaline',
    desc: 'Tous les 3 tours, ta prochaine attaque inflige +75% dégâts.',
    unlockText: 'Dégâts ≥ 50',
    isUnlocked: (stats) => (stats.damage || 0) >= 50,
    initState: () => ({ turns: 0 }),
    onDamageCalc: (ctx) => {
      ctx.skillState.turns += 1;
      if (ctx.skillState.turns % 3 === 0) return { kind: 'mult', mult: 1.75, label: '💉' };
      return null;
    },
  },
  {
    id: 'last_stand',
    emoji: '🦴',
    name: 'Ultime résistance',
    desc: 'Sous 25% PV, +60% chance d\'esquive.',
    unlockText: 'PV total ≥ 80 OU Endurci rang 3+',
    isUnlocked: (stats, talents) => (stats.vitality || 0) >= 80 || (talents.tanky || 0) >= 3,
    onMonsterAttack: (ctx) => {
      if (ctx.playerHp / ctx.playerMaxHp < 0.25 && Math.random() < 0.60) {
        return { kind: 'dodge' };
      }
      return null;
    },
  },
];

export const SKILLS_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// Returns array of currently-unlocked skills, ready to be used in combat.
export function getActiveSkills() {
  const stats = computeStats();
  const talents = state.talents || {};
  return SKILLS.filter(s => s.isUnlocked(stats, talents));
}

// Build per-fight state for each active skill (init persistent vars).
export function buildSkillContext() {
  const active = getActiveSkills();
  const states = new Map();
  for (const s of active) {
    states.set(s.id, s.initState ? s.initState() : {});
  }
  return { active, states };
}

export function unlockedCount() {
  return getActiveSkills().length;
}
