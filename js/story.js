// The Chronicle — a jalonned story that unfolds through normal play. Each
// chapter has a narrative beat, a concrete objective checked against real game
// state, and a small reward claimed when the objective is met. Linear: chapter
// `step` is active; claiming it reveals the next.
import { state, notify } from './state.js';
import { townhall, prosperity } from './village.js';

export const CHAPTERS = [
  { id: 'awaken', act: 'I · La Descente', title: "L'Éveil",
    text: "Tu brises le premier sceau. Un fragment du monde oublié remonte à la lumière — et, dans ton esprit, une voix : « Porte-Clé… souviens-toi de nous. »",
    goal: 'Ouvre ton premier coffre.', check: () => (state.opened || 0) >= 1, reward: { keys: 5 } },
  { id: 'firststeps', act: 'I · La Descente', title: "Premiers pas dans l'Abîme",
    text: "L'Abîme n'est pas qu'un gouffre : c'est le monde d'antan, enseveli strate par strate. Son premier gardien tombe sous tes coups.",
    goal: "Atteins l'étage 5 (premier boss).", check: () => (state.combat?.highestUnlocked || 1) >= 5, reward: { gold: 2000, keys: 5 } },
  { id: 'bastion', act: 'I · La Descente', title: 'Le Bastion',
    text: "Avec les fragments remontés de l'Abîme, une première pierre est reposée. La surface, peu à peu, se souvient d'elle-même — ton village renaît.",
    goal: 'Construis ton premier bâtiment au Village.', check: () => prosperity() >= 1, reward: { gold: 3000 } },
  { id: 'strata', act: 'I · La Descente', title: 'Les Gardiens des strates',
    text: "Chaque palier de l'Abîme garde la mémoire d'un âge englouti — et un gardien pour la défendre. Tu t'enfonces, plus bas, toujours plus bas.",
    goal: "Atteins l'étage 15.", check: () => (state.combat?.highestUnlocked || 1) >= 15, reward: { gold: 12000, orbs: 3 } },
  { id: 'cycle', act: 'II · Le Cycle', title: 'Le Cycle',
    text: "Tu tombes. Tout devient noir… puis la surface, à nouveau. Tu renais, plus fort, gardant en toi les reliques de ta vie passée. Ainsi va le Cycle des Porte-Clés.",
    goal: 'Accomplis ta première Ascension.', check: () => (state.prestige?.level || 0) >= 1, reward: { gold: 50000, orbs: 5 } },
  { id: 'ironage', act: 'II · Le Cycle', title: "L'Âge du Fer",
    text: "Le bastion grandit, ses cheminées crachent le métal. Aethel se souvient de ce qu'elle fut, et se prépare à ce qui l'attend.",
    goal: 'Fais monter ta Mairie au niveau 5 (Âge du Fer).', check: () => townhall() >= 5, reward: { gold: 120000, orbs: 6 } },
  { id: 'deep', act: 'II · Le Cycle', title: 'Les profondeurs cosmiques',
    text: "Si bas que la lumière elle-même hésite. Les strates ne portent plus de nom connu. Quelque chose, en dessous, respire.",
    goal: "Atteins l'étage 30.", check: () => (state.combat?.highestUnlocked || 1) >= 30, reward: { gold: 400000, orbs: 8 } },
  { id: 'threshold', act: 'III · Le Dévoreur', title: 'Le Seuil',
    text: "Tu touches au fond du monde. La voix des Anciens s'est tue. Il ne reste que le battement sourd de Celui qui a tout englouti.",
    goal: "Atteins l'étage 45.", check: () => (state.combat?.highestUnlocked || 1) >= 45, reward: { gold: 1500000, orbs: 12 } },
  { id: 'devourer', act: 'III · Le Dévoreur', title: 'Face au Dévoreur',
    text: "Le voilà : l'Oubli fait chair. Tu n'es qu'un Porte-Clé — mais le dernier, et tu portes la mémoire de toutes tes vies. Tant qu'on se souvient, rien n'est tout à fait effacé. Lève ton arme.",
    goal: "Atteins l'étage 50 et affronte le Dévoreur.", check: () => (state.combat?.highestUnlocked || 1) >= 50, reward: { gold: 5000000, orbs: 20 } },
  { id: 'dawn', act: 'III · Le Dévoreur', title: "L'Aurore reprise",
    text: "Le Dévoreur n'est pas vaincu en un jour — peut-être en mille vies. Mais à chaque cycle, un peu d'aurore est reprise aux ténèbres. Aethel renaîtra. Continue, Porte-Clé.",
    goal: 'Atteins le prestige 3.', check: () => (state.prestige?.level || 0) >= 3, reward: { gold: 20000000, orbs: 30 } },
];

function st() {
  if (!state.story) state.story = { step: 0, claimed: {} };
  return state.story;
}
export function storyStep() { return st().step || 0; }
export function activeChapter() { return CHAPTERS[storyStep()] || null; }
export function chapterStatus(i) {
  const step = storyStep();
  if (i < step) return 'done';
  if (i === step) return 'active';
  return 'locked';
}
// Is the active chapter's objective met (claimable)?
export function storyReady() {
  const c = activeChapter();
  return !!c && !!c.check && c.check();
}
// Claim the active chapter: grant its reward and advance to the next.
export function claimChapter() {
  if (!storyReady()) return null;
  const c = activeChapter();
  const r = c.reward || {};
  if (r.gold) state.gold = (state.gold || 0) + r.gold;
  if (r.keys) state.keys = (state.keys || 0) + r.keys;
  if (r.orbs) { for (let i = 0; i < r.orbs; i++) grantBasicOrb(); }
  st().claimed[c.id] = true;
  st().step = storyStep() + 1;
  notify();
  return c;
}

function grantBasicOrb() {
  // Skew rewards toward the common, useful orbs.
  const pool = ['transmu', 'augm', 'alte', 'regal', 'transmu', 'augm'];
  const id = pool[Math.floor(Math.random() * pool.length)];
  if (!state.orbs) state.orbs = {};
  state.orbs[id] = (state.orbs[id] || 0) + 1;
}
