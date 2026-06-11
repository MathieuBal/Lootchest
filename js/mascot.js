// Mémo, l'Esprit de Reliquaire. Données et logique des interventions.
// Module autonome : aucun import. Le jeu lui signale des événements via
// Mascot.fire('event'), il décide seul s'il doit parler (flags persistés).
// Il vit aussi sur le hub (perché près du coffre) : Mascot.ambient(ctx)
// fournit une réplique contextuelle quand le joueur le tape.
//
// Branchement :
//   1. state.mascot = { seen: {}, mode: 'normal' } (save.js le persiste)
//   2. Aux endroits clés du code, appeler Mascot.fire('chest:opened', ctx)
//   3. mascotUI.js écoute Mascot.onSpeak et affiche la bulle.

// ── Sprites disponibles (assets/mascot/) + fallback emoji ──
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
// Tant que les PNG n'existent pas, Mémo est un feu follet emoji.
export const MASCOT_EMOJI = {
  idle: '🔮', speak: '🔮', point: '🔮', surprised: '🔮', sad: '🔮',
  fly: '🔮', hero: '🔮',
  face_neutral: '🔮', face_happy: '✨', face_surprised: '💫', face_worried: '🌫️',
};

// ── Les interventions ──
// lvl 1 : plein écran, bloquant, une seule fois. Réservé aux grands moments.
// lvl 2 : bulle non bloquante, se ferme au tap. once par défaut ;
//         once:false + cd (ms) = rejouable avec son propre cooldown.
// lvl 3 : pastille discrète, le joueur vient la chercher.
// variants : pools de répliques — une est tirée au hasard à chaque fois.
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
      "Je reste avec toi. Tape-moi quand tu veux, je connais cet endroit. Enfin, je le connaissais.",
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
  {
    id: 'first_ascend', lvl: 1, on: 'prestige:ascend', once: true,
    sprite: 'hero', face: 'face_surprised',
    text: [
      "Tu... tu viens de faire le Cycle. Volontairement.",
      "Tout lâcher pour revenir plus fort. Je connais ce geste. Je l'ai déjà vu. Souvent ?",
      "Chaque vie laisse une relique. Empile-les. C'est comme ça qu'on descend assez bas pour comprendre.",
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
  {
    id: 'tut_dive', lvl: 2, on: 'dive:start', sprite: 'fly', face: 'face_worried',
    text: ["La Plongée. Pas d'échelle pour remonter, juste toi et la profondeur. Sécurise tes gains aux paliers — la cupidité est un excellent fossoyeur."],
  },
  {
    id: 'tut_hardmode', lvl: 2, on: 'hardmode:on', sprite: 'surprised', face: 'face_worried',
    text: ["Le mode Cauchemar. Je me souviens de la personne qui a inventé ça. Je ne l'aimais pas."],
  },
  {
    id: 'first_unique', lvl: 2, on: 'loot:unique', sprite: 'surprised', face: 'face_surprised',
    text: ["Cet objet a un NOM. Les objets qui ont un nom ont une histoire. Et les histoires, c'est exactement ce qu'on est venus chercher."],
  },

  // ───── Niveau 2 rejouables : réactions aux moments forts ─────
  {
    id: 'drop_legendary', lvl: 2, on: 'loot:legendary', once: false, cd: 180000,
    sprite: 'surprised', face: 'face_happy',
    variants: [
      "Doré ! Ça, ça brillait déjà avant la chute du monde.",
      "Une légendaire. Quelqu'un a pleuré en la perdant, j'en suis presque sûr.",
      "Oh. OH. Garde-la. Ou vends-la. Mais regarde-la d'abord cinq minutes, ça se mérite.",
    ],
  },
  {
    id: 'drop_ancestral', lvl: 2, on: 'loot:ancestral', once: false, cd: 180000,
    sprite: 'surprised', face: 'face_surprised',
    variants: [
      "De l'Ancestral. Ça date d'avant moi, et je suis VIEUX.",
      "Ce rouge... le métal des premiers âges. Même le Dévoreur n'a pas réussi à l'oublier.",
    ],
  },
  {
    id: 'streak_fire', lvl: 2, on: 'streak:milestone', once: false, cd: 120000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Quelle série ! L'Abîme commence à te craindre. Ça ne lui ressemble pas.",
      "Tu enchaînes. Continue — l'or coule mieux quand on ne saigne pas.",
      "Impressionnant. Le dernier qui a fait ça... non, rien. Continue.",
    ],
  },
  {
    id: 'dive_deep', lvl: 2, on: 'dive:deep', once: false, cd: 300000,
    sprite: 'fly', face: 'face_worried',
    variants: [
      "On est profond, là. Même mes souvenirs n'allaient pas si bas.",
      "Tu entends ? Ce battement sourd. Ce n'est pas ton cœur. Remonte quand tu veux, hein.",
    ],
  },
  {
    id: 'ascend_again', lvl: 2, on: 'prestige:ascend', once: false, cd: 60000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Et un Cycle de plus. Tu commences à comprendre comment ce monde respire.",
      "Renaître ne fait plus mal, pas vrai ? C'est le signe qu'on devient quelqu'un d'autre.",
    ],
  },

  // ───── Souvenirs : l'arc de Mémo, lié à la Chronique ─────
  // chapter = nombre de chapitres accomplis quand le souvenir remonte.
  {
    id: 'memory_chains', lvl: 3, on: 'story:chapterDone', chapter: 1, sprite: 'fly', face: 'face_neutral',
    memory: true, memoryTitle: 'Les chaînes',
    text: ["Premier souvenir : des chaînes. Pas pour m'attacher — pour me retenir de tomber. Quelqu'un les tenait. J'aimerais me rappeler qui."],
  },
  {
    id: 'memory_forge', lvl: 3, on: 'story:chapterDone', chapter: 3, sprite: 'fly', face: 'face_happy',
    memory: true, memoryTitle: 'La forge qui chante',
    text: ["La forge. Il y avait une forge comme ça, avant. Et quelqu'un qui chantait faux dedans. C'était peut-être moi."],
  },
  {
    id: 'memory_abyss', lvl: 3, on: 'story:chapterDone', chapter: 4, sprite: 'fly', face: 'face_neutral',
    memory: true, memoryTitle: 'La descente',
    text: ["Je me souviens de la descente. Pas de la chute, de la descente. On y allait volontairement. Pourquoi est-ce qu'on y allait volontairement ?"],
  },
  {
    id: 'memory_cycle', lvl: 3, on: 'story:chapterDone', chapter: 5, sprite: 'fly', face: 'face_surprised',
    memory: true, memoryTitle: 'Le Cycle',
    text: ["Le Cycle... j'y suis passé aussi. Plusieurs fois. On ne renaît pas tout à fait pareil — il manque toujours un morceau. Le mien est tombé dans un coffre, visiblement."],
  },
  {
    id: 'memory_aethel', lvl: 3, on: 'story:chapterDone', chapter: 6, sprite: 'fly', face: 'face_happy',
    memory: true, memoryTitle: 'Aethel',
    text: ["Aethel. Le nom de ce monde, c'est Aethel. Il y avait des tours si hautes que les oiseaux abandonnaient. Ton village se souvient, lui aussi — regarde ses cheminées."],
  },
  {
    id: 'memory_devourer', lvl: 3, on: 'story:chapterDone', chapter: 8, sprite: 'sad', face: 'face_worried',
    memory: true, memoryTitle: 'Celui qui efface',
    text: ["Le Dévoreur ne mange pas les corps. Il mange le fait d'avoir existé. Ceux qu'il prend ne meurent pas — ils n'ont jamais été. Sauf si quelqu'un se souvient. Souviens-toi de moi, d'accord ?"],
  },
  {
    id: 'memory_truth', lvl: 3, on: 'story:chapterDone', chapter: 9, sprite: 'hero', face: 'face_surprised',
    memory: true, memoryTitle: 'Le dernier Porte-Clé',
    text: ["Ça y est. Je me souviens de tout. J'étais un Porte-Clé. Comme toi. Le Dévoreur ne m'a pas tué — il m'a oublié. Mais toi tu m'as ouvert, et maintenant tu sais mon histoire. Tant qu'on se souvient, rien n'est tout à fait effacé. Va, finis ce que j'ai commencé."],
  },
];

// ── Répliques ambiantes (Mémo perché sur le hub, au tap) ──
// Chaque entrée : when(ctx) → éligible, text(ctx) ou string.
// Les plus spécifiques d'abord ; on tire au sort parmi les éligibles
// avec un fort biais pour le contextuel, en évitant la répétition.
const AMBIENT_LINES = [
  { id: 'amb_nokeys', prio: true, when: c => (c.keys || 0) === 0,
    text: () => "Plus de clés. Le donjon en regorge — les monstres les avalent, ne me demande pas pourquoi." },
  { id: 'amb_pity', prio: true, when: c => c.pityLeft > 0 && c.pityLeft <= 5,
    text: c => `Je sens quelque chose de doré à ${c.pityLeft} coffre${c.pityLeft > 1 ? 's' : ''} d'ici. C'est rarement faux.` },
  { id: 'amb_upgrade', prio: true, when: c => !!c.canUpgrade,
    text: () => "Tu as de quoi améliorer le coffre. Le mien était plus confortable, mais celui-là paie mieux." },
  { id: 'amb_boss', prio: true, when: c => c.floor % 5 === 0,
    text: c => `Un gardien t'attend à l'étage ${c.floor}. J'ai un mauvais pressentiment. Enfin... le souvenir d'un mauvais pressentiment.` },
  { id: 'amb_streak', prio: true, when: c => (c.streak || 0) >= 10,
    text: c => `Série de ${c.streak}. Ne meurs pas maintenant, ce serait du gâchis statistique.` },
  { id: 'amb_night', when: c => c.hour >= 23 || c.hour < 5,
    text: () => "Tu joues tard. L'Abîme ne dort jamais, mais toi, tu devrais. Je dis ça, je n'ai plus de paupières." },
  { id: 'amb_rich', when: c => (c.gold || 0) >= 1e6,
    text: () => "Tout cet or... Tu sais qu'au village ils reconstruisent des MURS avec ? Des murs. Bref, dépense." },
  // Pool par défaut : les rêveries de Mémo.
  { id: 'amb_echo', text: () => "J'ai habité ce coffre pendant mille ans. Il y avait de l'écho. Je me racontais des histoires. Je les ai toutes oubliées sauf une — toi." },
  { id: 'amb_fragments', text: () => "Chaque relique que tu remontes me rend un fragment. Ne t'arrête pas, je commence à me trouver intéressant." },
  { id: 'amb_smell', text: () => "Tu sens cette odeur ? Non ? Moi non plus. Je n'ai plus de nez. C'est une de mes meilleures blagues, profite." },
  { id: 'amb_keys', text: () => "Les clés ouvrent les coffres, les coffres contiennent le passé, le passé contient des clés. Ce monde tourne en rond, et c'est tant mieux pour toi." },
  { id: 'amb_listen', text: () => "Parfois, la nuit, le coffre murmure. Avant je répondais. Maintenant c'est ton travail." },
  { id: 'amb_advice', text: () => "Un conseil d'esprit millénaire : équipe ce qui brille, vends ce qui traîne, et ne fais JAMAIS confiance à un coffre qui sourit." },
  { id: 'amb_remember', text: () => "Tant qu'on se souvient, rien n'est tout à fait effacé. C'est ma phrase préférée. C'est peut-être moi qui l'ai inventée. Ou pas." },
];

// ── Logique ──
const listeners = [];
let cooldownUntil = 0;
const COOLDOWN_MS = 60000;       // jamais deux interventions en moins d'une minute (hors lvl 1)
const lineCooldowns = new Map(); // cooldowns par réplique rejouable (non persistés)
let lastAmbientId = null;

function pickText(line) {
  if (line.variants) return [line.variants[Math.floor(Math.random() * line.variants.length)]];
  return line.text;
}

export const Mascot = {
  state: null, // à brancher : state.mascot du jeu

  init(mascotState) {
    this.state = mascotState || { seen: {}, mode: 'normal' };
    return this.state;
  },

  mode() { return this.state?.mode || 'normal'; },
  setMode(m) { if (this.state) this.state.mode = m; },

  // Le jeu appelle Mascot.fire('chest:opened', { ... }) aux endroits clés.
  fire(event, ctx = {}) {
    if (!this.state) return null;
    const now = Date.now();
    for (const line of MASCOT_LINES) {
      if (line.on !== event) continue;
      if (line.once !== false && this.state.seen[line.id]) continue;
      if (line.chapter != null && ctx.chapter !== line.chapter) continue;
      // Les souvenirs se débloquent toujours (leur événement ne se reproduit
      // pas) ; en mode discret/muet ils filent au Codex sans pastille.
      if (line.memory && this.state.mode !== 'normal') {
        this.state.seen[line.id] = true;
        return null;
      }
      if (this.state.mode === 'muet') return null;
      if (line.once === false && now < (lineCooldowns.get(line.id) || 0)) continue;
      // cooldown global, sauf grands moments et souvenirs (perdus sinon)
      if (line.lvl !== 1 && !line.memory && now < cooldownUntil) continue;

      this.state.seen[line.id] = true;
      if (line.once === false && line.cd) lineCooldowns.set(line.id, now + line.cd);
      if (line.lvl !== 1) cooldownUntil = now + COOLDOWN_MS;
      const spoken = { ...line, text: pickText(line) };
      listeners.forEach(fn => fn(spoken, ctx));
      return spoken; // une seule intervention par événement
    }
    return null;
  },

  // Réplique ambiante au tap sur Mémo (hub). Toujours disponible, même en
  // mode discret — c'est le joueur qui vient le chercher. Anti-répétition.
  ambient(ctx = {}) {
    const eligible = AMBIENT_LINES.filter(l => !l.when || l.when(ctx));
    const contextual = eligible.filter(l => l.prio && l.id !== lastAmbientId);
    // 70 % de chances de servir le contextuel s'il y en a un.
    let pool = (contextual.length && Math.random() < 0.7) ? contextual : eligible;
    if (pool.length > 1) pool = pool.filter(l => l.id !== lastAmbientId);
    const line = pool[Math.floor(Math.random() * pool.length)];
    lastAmbientId = line.id;
    return {
      id: line.id, lvl: 2, sprite: 'speak', face: 'face_happy',
      text: [typeof line.text === 'function' ? line.text(ctx) : line.text],
      ambient: true,
    };
  },

  // mascotUI.js s'abonne ici pour afficher la bulle.
  onSpeak(fn) { listeners.push(fn); },

  // Pour le Codex : tous les souvenirs (débloqués ou non).
  memories() {
    return MASCOT_LINES.filter(l => l.memory).map(l => ({
      id: l.id, title: l.memoryTitle || l.id, text: l.text,
      unlocked: !!this.state?.seen[l.id],
    }));
  },

  // Mémo apparaît sur le hub dès qu'il est sorti de son coffre.
  isFreed() { return !!this.state?.seen?.first_chest; },
};
