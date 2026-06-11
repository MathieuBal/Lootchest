// Mémo, l'Esprit de Reliquaire. Données et logique des interventions.
// Module autonome : aucun import. Le jeu lui signale des événements via
// Mascot.fire('event'), il décide seul s'il doit parler (flags persistés).
//
// Branchement minimal :
//   1. state.mascot = { seen: {}, mode: 'normal' } dans l'état initial (save.js le persiste avec le reste)
//   2. Aux endroits clés du code, appeler Mascot.fire('chest:opened'), etc. (liste plus bas)
//   3. mascotUI.js écoute Mascot.onSpeak et affiche la bulle.

// ── Sprites disponibles (assets/mascot/) ──
export const MASCOT_SPRITES = {
  idle:      'assets/mascot/idle.png',
  speak:     'assets/mascot/speak.png',
  point:     'assets/mascot/point.png',
  surprised: 'assets/mascot/surprised.png',
  sad:       'assets/mascot/sad.png',
  fly:       'assets/mascot/fly.png',
  hero:      'assets/mascot/hero.png',            // grand format, dialogues plein écran
  face_neutral:   'assets/mascot/face_neutral.png',
  face_happy:     'assets/mascot/face_happy.png',
  face_surprised: 'assets/mascot/face_surprised.png',
  face_worried:   'assets/mascot/face_worried.png',
};

// ── Les interventions ──
// lvl 1 : plein écran, bloquant, une seule fois. Réservé aux grands moments.
// lvl 2 : bulle non bloquante, une seule fois, se ferme au tap.
// lvl 3 : pastille discrète, le joueur vient la chercher. Rejouable.
export const MASCOT_LINES = [
  // ───── Niveau 1 : les grands moments ─────
  {
    id: 'first_chest', lvl: 1, on: 'chest:opened', once: true,
    sprite: 'hero', face: 'face_surprised',
    text: [
      "Oh. De l'air. Enfin.",
      "C'est toi qui m'as ouvert ? Toi ?",
      "Bon. J'imagine que je te dois quelque chose. Je m'appelle... attends, ça va me revenir.",
      "Appelle-moi Mémo. C'est ce qui reste.",
    ],
  },
  {
    id: 'first_village', lvl: 1, on: 'village:firstVisit', once: true,
    sprite: 'hero', face: 'face_happy',
    text: [
      "Un village. Il tient encore debout, c'est déjà ça.",
      "Ce que tu remontes de l'Abîme leur rend la mémoire. Rapporte, reforge, et regarde les murs se relever.",
    ],
  },
  {
    id: 'first_death', lvl: 1, on: 'player:death', once: true,
    sprite: 'sad', face: 'face_worried',
    text: [
      "Hé. Hé ! Debout.",
      "L'Abîme a repris tes pas. Pas ce que tu es devenu.",
      "Ton équipement, ton savoir, tout ça reste. Remonte. Je t'attends en haut.",
    ],
  },
  {
    id: 'first_boss', lvl: 1, on: 'boss:encounter', once: true,
    sprite: 'surprised', face: 'face_worried',
    text: [
      "Attends. Je me souviens de lui.",
      "Pas de son nom. De la peur.",
      "Garde tes potions et frappe quand il souffle. Tu vas y arriver.",
    ],
  },

  // ───── Niveau 2 : tutoriels contextuels, une seule fois ─────
  {
    id: 'tut_magic', lvl: 2, on: 'loot:firstMagic', sprite: 'point', face: 'face_happy',
    text: ["Bleu. C'est bon signe, le bleu. Un affixe en plus, donc une vraie raison de le garder. Enfin, c'était bon signe il y a mille ans."],
  },
  {
    id: 'tut_orb', lvl: 2, on: 'orb:firstDrop', sprite: 'point', face: 'face_neutral',
    text: ["Une orbe. Ne la mange pas. Je dis ça parce que le dernier qui... peu importe. Ça sert à la forge, pour réécrire tes objets."],
  },
  {
    id: 'tut_forge', lvl: 2, on: 'forge:firstVisit', sprite: 'speak', face: 'face_happy',
    text: ["La forge. Tu choisis un objet, tu dépenses une orbe, et il devient autre chose. Commence petit, transmute du commun, tu verras vite l'idée."],
  },
  {
    id: 'tut_relic', lvl: 2, on: 'relic:firstDrop', sprite: 'surprised', face: 'face_surprised',
    text: ["Ça, c'est une relique. Un morceau du monde d'avant. Elle marche tant que tu la portes, alors choisis bien lesquelles."],
  },
  {
    id: 'tut_mimic', lvl: 2, on: 'mimic:reveal', sprite: 'surprised', face: 'face_worried',
    text: ["CE COFFRE A DES DENTS. Je répète, des dents. Tu peux le nourrir pour de meilleurs trésors, mais il finira par claquer. Tu vas le nourrir quand même, c'est ça ?"],
  },
  {
    id: 'tut_crystal', lvl: 2, on: 'crystal:firstDrop', sprite: 'point', face: 'face_neutral',
    text: ["Un cristal. Ça se dépense au village, pas dans ta poche. Les bâtisseurs en raffolent."],
  },

  // ───── Niveau 3 : facultatif, le joueur vient le chercher ─────
  {
    id: 'village_idle', lvl: 3, on: 'village:idle', sprite: 'idle', face: 'face_neutral',
    text: ["Ils reconstruisent vite, pour des gens qui n'existaient pas la semaine dernière. N'y pense pas trop fort."],
  },
  {
    id: 'memory_forge', lvl: 3, on: 'story:chapterDone', chapter: 2, sprite: 'fly', face: 'face_happy',
    memory: true,
    text: ["La forge. Il y avait une forge comme ça, avant. Et quelqu'un qui chantait faux dedans. C'était peut-être moi."],
  },
  {
    id: 'memory_abyss', lvl: 3, on: 'story:chapterDone', chapter: 4, sprite: 'fly', face: 'face_neutral',
    memory: true,
    text: ["Je me souviens de la descente. Pas de la chute, de la descente. On y allait volontairement. Pourquoi est-ce qu'on y allait volontairement ?"],
  },
];

// ── Logique ──
const listeners = [];
let cooldownUntil = 0;
const COOLDOWN_MS = 60000; // jamais deux interventions en moins d'une minute (hors lvl 1)

export const Mascot = {
  state: null, // à brancher : state.mascot du jeu

  init(mascotState) {
    this.state = mascotState || { seen: {}, mode: 'normal' };
    return this.state;
  },

  // Le jeu appelle Mascot.fire('chest:opened', { ... }) aux endroits clés.
  fire(event, ctx = {}) {
    if (!this.state || this.state.mode === 'muet') return;
    const now = Date.now();
    for (const line of MASCOT_LINES) {
      if (line.on !== event) continue;
      if (line.once !== false && this.state.seen[line.id]) continue;
      if (line.chapter != null && ctx.chapter !== line.chapter) continue;
      // mode discret : on saute les lvl 3 spontanés
      if (this.state.mode === 'discret' && line.lvl === 3) continue;
      // cooldown global, sauf grands moments
      if (line.lvl !== 1 && now < cooldownUntil) continue;

      this.state.seen[line.id] = true;
      if (line.lvl !== 1) cooldownUntil = now + COOLDOWN_MS;
      listeners.forEach(fn => fn(line, ctx));
      return line; // une seule intervention par événement
    }
    return null;
  },

  // mascotUI.js s'abonne ici pour afficher la bulle.
  onSpeak(fn) { listeners.push(fn); },

  // Pour le Codex : les souvenirs déjà débloqués.
  memories() {
    return MASCOT_LINES.filter(l => l.memory && this.state?.seen[l.id]);
  },
};
