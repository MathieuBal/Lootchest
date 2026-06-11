// Mémo, l'Esprit de Reliquaire. Données et logique des interventions.
// Module autonome : aucun import. Le jeu lui signale des événements via
// Mascot.fire('event'), il décide seul s'il doit parler (flags persistés).
// Il vit aussi sur le hub (perché près du coffre) : Mascot.ambient(ctx)
// fournit une réplique contextuelle quand le joueur le tape.
//
// Voix : esprit millénaire enfermé mille ans dans un coffre, sarcastique,
// désabusé, lucide sur le fait d'être dans un jeu. Il aime le joueur
// mais ne lui épargne aucune pique. Brise le 4e mur quand ça l'amuse.
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
      "Mille ans dans le noir. MILLE. J'ai compté chaque seconde. Sauf vers la fin, j'ai un peu décroché.",
      "C'est toi qui m'as ouvert ? Toi ? Avec UNE clé ? Bon. La vie m'aura habitué aux déceptions.",
      "Je m'appelle... Mémo. C'est ce qui reste quand on a tout oublié. Joli, hein ? C'est pas moi qui l'ai choisi.",
      "Et toi tu es... Porte-Clé. Tous les héros de ce monde s'appellent comme ça. Aucune originalité. Au moins, c'est descriptif.",
      "Bon. Je reste collé à toi maintenant. Tape-moi quand tu veux. Je connais cet endroit. Enfin, je le connaissais. Avant le grand effacement. Bref.",
    ],
  },
  {
    id: 'first_village', lvl: 1, on: 'village:firstVisit', once: true,
    sprite: 'hero', face: 'face_happy',
    text: [
      "Un village. Il tient encore debout. Trois maisons et demie et un puits — pas vraiment Constantinople, mais bon.",
      "Tu vas leur ramener du bois, des pierres, des morceaux du monde d'avant — et ils reconstruiront en boucle, comme si la rouille n'existait pas.",
      "C'est un peu ça l'idée : tu descends, tu meurs, ils rebâtissent. Le contrat social du Cycle. Personne ne l'a signé, mais tout le monde l'applique.",
    ],
  },
  {
    id: 'first_death', lvl: 1, on: 'player:death', once: true,
    sprite: 'sad', face: 'face_worried',
    text: [
      "Hé. Hé. Debout. Allez.",
      "Bon. Première mort. Félicitations, tu fais officiellement partie du club.",
      "Ne le prends pas mal. L'Abîme a repris ton souffle, pas ce que tu es devenu. Ton équipement, tes talents, tes succès — tout ça reste.",
      "C'est même un peu le truc du genre : on meurt, on revient. Tu vas t'y habituer. Moi j'ai eu mille ans pour me faire à l'idée.",
    ],
  },
  {
    id: 'first_boss', lvl: 1, on: 'boss:encounter', once: true,
    sprite: 'surprised', face: 'face_worried',
    text: [
      "Attends. Je me souviens de lui.",
      "Pas de son nom. De la peur. C'est plus pratique pour la guerre, la peur. Le nom on l'oublie. La trouille on la garde.",
      "Garde tes potions. Frappe quand il souffle. Et si tu meurs — ce qui est probable, statistiquement — recommence. C'est très tendance comme concept.",
    ],
  },
  {
    id: 'first_ascend', lvl: 1, on: 'prestige:ascend', once: true,
    sprite: 'hero', face: 'face_surprised',
    text: [
      "Tu... tu viens de faire le Cycle. VOLONTAIREMENT.",
      "Tout lâcher pour revenir plus fort. Effacer tes étages pour les regrimper. Sisyphe a inventé ça en s'ennuyant, et tu l'as juste téléchargé.",
      "Mais ça marche. Chaque vie te laisse une relique, un éclat de mémoire. À force, on devient quelqu'un qui sait. C'est comme ça que je suis devenu... ça. Enfin, ce qu'il reste de ça.",
      "Allez, Porte-Clé. Recommence. Encore. Le Dévoreur a l'éternité devant lui, mais nous aussi.",
    ],
  },

  // ───── Niveau 2 : tutoriels contextuels, une seule fois ─────
  {
    id: 'tut_magic', lvl: 2, on: 'loot:firstMagic', sprite: 'point', face: 'face_happy',
    text: ["Bleu. Le bleu c'est bon signe. Un affixe en plus = une vraie raison de le garder. C'était bon signe il y a mille ans. Je suppose que ça l'est toujours, sinon ce serait un design étrange."],
  },
  {
    id: 'tut_orb', lvl: 2, on: 'orb:firstDrop', sprite: 'point', face: 'face_neutral',
    text: ["Une orbe. Ne la mange pas. Je dis ça parce que le dernier qui... peu importe. Ça sert à la forge pour réécrire tes objets. Comme une gomme magique, mais qui coûte cher."],
  },
  {
    id: 'tut_forge', lvl: 2, on: 'forge:firstVisit', sprite: 'speak', face: 'face_happy',
    text: ["La forge. Tu choisis un objet, tu dépenses une orbe, et il devient autre chose. Pas forcément MIEUX, hein. Autre chose. Le RNG a son sens de l'humour, lui aussi."],
  },
  {
    id: 'tut_relic', lvl: 2, on: 'relic:firstDrop', sprite: 'surprised', face: 'face_surprised',
    text: ["Une relique. Un morceau du monde d'avant, qui te suivra à travers TOUTES tes morts à venir. Si ce n'est pas un investissement émotionnel à long terme, je ne sais pas ce que c'est."],
  },
  {
    id: 'tut_mimic', lvl: 2, on: 'mimic:reveal', sprite: 'surprised', face: 'face_worried',
    text: ["CE COFFRE A DES DENTS. Des. Dents. Tu peux le nourrir pour mieux looter, mais il claquera tôt ou tard. Tu vas le nourrir quand même, hein ? Évidemment."],
  },
  {
    id: 'tut_crystal', lvl: 2, on: 'crystal:firstDrop', sprite: 'point', face: 'face_neutral',
    text: ["Un cristal. Ça se dépense au village, pas dans tes poches. Les bâtisseurs en raffolent. Pour quoi faire ? Aucune idée. Probablement des statues à ton effigie. Tu mérites."],
  },
  {
    id: 'tut_dive', lvl: 2, on: 'dive:start', sprite: 'fly', face: 'face_worried',
    text: ["La Plongée. Pas d'échelle pour remonter. Juste toi, le noir, et l'addition. Sécurise tes gains aux paliers — la cupidité est le fossoyeur officiel des Porte-Clés. Statistiquement, hein."],
  },
  {
    id: 'tut_hardmode', lvl: 2, on: 'hardmode:on', sprite: 'surprised', face: 'face_worried',
    text: ["Le mode Cauchemar. Ah. Tu fais partie de CETTE catégorie de joueurs. D'accord. On va vivre une expérience riche en émotions négatives. J'ai hâte. Vraiment."],
  },
  {
    id: 'first_unique', lvl: 2, on: 'loot:unique', sprite: 'surprised', face: 'face_surprised',
    text: ["Cet objet a un NOM. Les objets nommés ont une histoire. Et les histoires sont précisément ce qu'on est venus déterrer ici. Lis sa fiche. Lis-la VRAIMENT. Tu vas l'utiliser deux donjons puis la vendre, je le sais, mais lis quand même."],
  },

  // ───── Niveau 2 rejouables : réactions aux moments forts ─────
  {
    id: 'drop_legendary', lvl: 2, on: 'loot:legendary', once: false, cd: 180000,
    sprite: 'surprised', face: 'face_happy',
    variants: [
      "Doré ! Ça brillait déjà avant la chute du monde. Et ça brille toujours. Le monde, lui, brille moins.",
      "Une légendaire. Quelqu'un a pleuré en la perdant, j'en suis presque sûr. Maintenant elle est à toi. Le deuil, c'est un transfert de propriété.",
      "Garde-la. Ou vends-la. Mais regarde-la cinq minutes d'abord. Le drame des coffres modernes, c'est qu'on traite l'extraordinaire comme du courrier.",
      "Légendaire. Tu sais que tu as une chance de l'avoir naturellement plutôt faible ? Profite. La prochaine sera une bottes de cuir +3 d'agilité.",
    ],
  },
  {
    id: 'drop_ancestral', lvl: 2, on: 'loot:ancestral', once: false, cd: 180000,
    sprite: 'surprised', face: 'face_surprised',
    variants: [
      "De l'Ancestral. Ça date d'avant moi. Et je suis VIEUX. Genre, vraiment vieux. Je me souviens du Big Bang. Enfin, du précédent.",
      "Ce rouge — le métal des premiers âges. Même le Dévoreur n'a pas réussi à l'oublier. Note : c'est rare. Le Dévoreur oublie tout, lui.",
      "Ancestral. Tu réalises ? Une CHANCE sur DES MILLIERS. Tout ça pour qu'un jour tu cliques 'recycler' par mégarde. C'est ça la beauté du jeu.",
    ],
  },
  {
    id: 'streak_fire', lvl: 2, on: 'streak:milestone', once: false, cd: 120000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Quelle série ! L'Abîme commence à te craindre. C'est nouveau, l'Abîme craint rarement quelqu'un. Habituellement c'est l'inverse.",
      "Tu enchaînes. Continue — l'or coule mieux quand on ne saigne pas. C'est mon adage favori. Je l'ai inventé là, à l'instant. Pas mal, hein ?",
      "Impressionnant. Le dernier qui a fait ça... non, rien. C'était moi. Et ça a très mal fini. Mais toi continue, ne te bloque pas mentalement.",
    ],
  },
  {
    id: 'dive_deep', lvl: 2, on: 'dive:deep', once: false, cd: 300000,
    sprite: 'fly', face: 'face_worried',
    variants: [
      "On est profond, là. Même mes souvenirs n'allaient pas si bas. À partir d'ici, je ne suis plus un guide, je suis un témoin.",
      "Tu entends ? Ce battement sourd. Ce n'est pas ton cœur. Et ce n'est pas non plus le mien — je n'en ai plus. Remonte quand tu veux, hein.",
      "Profondeur record. Si tu meurs ici, je ne dirai rien aux autres Porte-Clés. Honnêtement, ils n'auraient pas fait mieux.",
    ],
  },
  {
    id: 'ascend_again', lvl: 2, on: 'prestige:ascend', once: false, cd: 60000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Et un Cycle de plus. Tu commences à comprendre comment ce monde respire. Spoiler : pas très bien.",
      "Renaître ne fait plus mal, pas vrai ? C'est le signe qu'on devient quelqu'un d'autre. Ou qu'on s'est habitué. Les deux, probablement.",
      "Combien ça fait, maintenant ? Trois ? Cinq ? Tu sais qu'au bout de mille ascensions, on devient moi ? Bon, c'est une blague. Probablement.",
    ],
  },
  // Nouveaux déclencheurs : Mémo te taquine quand tu fais n'importe quoi.
  {
    id: 'sold_treasure', lvl: 2, on: 'sell:precious', once: false, cd: 120000,
    sprite: 'surprised', face: 'face_worried',
    variants: [
      "Tu viens de VENDRE ça. D'accord. Je note. Je ne juge pas. (Je juge.)",
      "Vendu. Pour de l'or. Que tu vas dépenser dans un coffre. Qui te donnera un objet pire. Et que tu vendras. Le Cycle, version commerciale.",
      "Tu sais qu'il existe un bouton verrou 🔒 ? Non, garde-le secret, c'est notre petit jeu.",
    ],
  },
  {
    id: 'salvaged_unique', lvl: 2, on: 'salvage:unique', once: false, cd: 240000,
    sprite: 'sad', face: 'face_worried',
    variants: [
      "Tu as RECYCLÉ un objet à NOM. Avec des éclats à la clé. Tu l'as réduit en poudre. Bravo. Je veux dire vraiment, sincèrement. Bravo.",
      "L'âme de cet objet est maintenant un petit tas de copeaux. Quelque part, son créateur sent un frisson sans savoir pourquoi.",
    ],
  },
  {
    id: 'death_streak', lvl: 2, on: 'player:deathStreak', once: false, cd: 90000,
    sprite: 'sad', face: 'face_worried',
    variants: [
      "C'est la troisième mort en peu de temps. Tu collectionnes ? Je peux te trouver un classeur.",
      "Encore mort. À ce stade, tu fais ça pour le sport. Respect.",
      "Tu sais qu'il y a un bouton 'Étage' pour redescendre ? Il est là justement pour éviter ça. Mais je ne suis qu'un esprit, je ne décide pas pour toi.",
      "Bon. On va appeler ça de la persévérance plutôt que de la défaite répétée, ça flattera moins ton ego mais c'est plus précis.",
    ],
  },
  {
    id: 'common_streak', lvl: 2, on: 'loot:commonStreak', once: false, cd: 240000,
    sprite: 'sad', face: 'face_worried',
    variants: [
      "Que du gris. Que. Du. Gris. Le RNG te teste. Ou il te déteste. Difficile à dire — l'algorithme ne répond pas à mes lettres.",
      "Encore un commun. Tu sais que la jauge pity existe ? Elle approche. Je crois. Enfin j'espère. Pour toi.",
      "Statistiquement, ça devait arriver. Émotionnellement, c'est intolérable. Bienvenue dans la condition humaine, version coffre.",
    ],
  },
  {
    id: 'auto_long', lvl: 2, on: 'combat:autoLong', once: false, cd: 600000,
    sprite: 'idle', face: 'face_neutral',
    variants: [
      "Tu me regardes regarder le jeu se jouer tout seul. On est arrivés à un sommet de méta-distraction, je crois.",
      "L'Auto est un cadeau, je sais. Mais à un moment, c'est juste un écran de veille avec des dégâts.",
      "Bon. Pendant qu'on est là, parle-moi. Comment ça va ? Vraiment. Sans filtre. Je suis coincé dans un coffre depuis mille ans, je sais écouter.",
    ],
  },
  {
    id: 'hoarder', lvl: 2, on: 'wealth:hoarder', once: false, cd: 1800000,
    sprite: 'point', face: 'face_neutral',
    variants: [
      "Tout cet or qui dort. Tu sais qu'au village ils reconstruisent des MURS avec ? Des. Murs. Bouge tes pièces, Picsou.",
      "Riche. Statique. Imitable des bouchers du dimanche. Améliore quelque chose, j'ai pas envie qu'on te confonde avec un PNJ marchand.",
    ],
  },
  {
    id: 'idle_too_long', lvl: 2, on: 'player:idle', once: false, cd: 300000,
    sprite: 'idle', face: 'face_worried',
    variants: [
      "Tu es encore là ? J'entends ta respiration. Si on peut appeler ça une respiration. C'est très calme.",
      "L'écran ne s'éteint pas tout seul, hein. Sauf si tu as la config qui va bien. Mais sinon, non.",
      "Pendant que tu décides quoi faire, je vais te raconter une histoire. Il était une fois un Porte-Clé qui hésitait trop longtemps. Le Dévoreur l'a oublié sur place. Fin. Bonne nuit.",
    ],
  },

  // ───── Souvenirs : l'arc de Mémo, lié à la Chronique ─────
  // chapter = nombre de chapitres accomplis quand le souvenir remonte.
  {
    id: 'memory_chains', lvl: 3, on: 'story:chapterDone', chapter: 1, sprite: 'fly', face: 'face_neutral',
    memory: true, memoryTitle: 'Les chaînes',
    text: ["Premier souvenir : des chaînes. Pas pour m'attacher — pour me retenir de tomber. Quelqu'un les tenait fermement. J'aimerais me rappeler qui. C'était peut-être important."],
  },
  {
    id: 'memory_forge', lvl: 3, on: 'story:chapterDone', chapter: 3, sprite: 'fly', face: 'face_happy',
    memory: true, memoryTitle: 'La forge qui chante',
    text: ["La forge. Il y avait une forge comme ça, avant. Et quelqu'un qui chantait faux dedans à pleins poumons. C'était peut-être moi. Ça expliquerait pourquoi personne ne venait."],
  },
  {
    id: 'memory_abyss', lvl: 3, on: 'story:chapterDone', chapter: 4, sprite: 'fly', face: 'face_neutral',
    memory: true, memoryTitle: 'La descente',
    text: ["Je me souviens de la descente. Pas de la chute, de la DESCENTE. On y allait volontairement. À pied. Avec des cordes. Pourquoi est-ce qu'on y allait volontairement ? À l'époque ça avait du sens, j'imagine. Comme tout ce qu'on regrette."],
  },
  {
    id: 'memory_cycle', lvl: 3, on: 'story:chapterDone', chapter: 5, sprite: 'fly', face: 'face_surprised',
    memory: true, memoryTitle: 'Le Cycle',
    text: ["Le Cycle... j'y suis passé aussi. Plusieurs fois. On ne renaît pas tout à fait pareil — il manque toujours un morceau. Le mien est tombé dans un coffre. Visiblement c'est récurrent dans ma carrière."],
  },
  {
    id: 'memory_aethel', lvl: 3, on: 'story:chapterDone', chapter: 6, sprite: 'fly', face: 'face_happy',
    memory: true, memoryTitle: 'Aethel',
    text: ["Aethel. Le nom de ce monde, c'est Aethel. Il y avait des tours si hautes que les oiseaux abandonnaient à mi-parcours et redescendaient à pied. Ton village s'en souvient aussi — regarde ses cheminées. Pour des bûcherons, ils visent étrangement haut."],
  },
  {
    id: 'memory_devourer', lvl: 3, on: 'story:chapterDone', chapter: 8, sprite: 'sad', face: 'face_worried',
    memory: true, memoryTitle: 'Celui qui efface',
    text: ["Le Dévoreur ne mange pas les corps. Il mange le fait d'avoir existé. Ceux qu'il prend ne meurent pas — ils n'ont jamais été. Sauf si quelqu'un se souvient. Souviens-toi de moi, d'accord ? Au moins, mets-moi en favori dans tes paramètres."],
  },
  {
    id: 'memory_truth', lvl: 3, on: 'story:chapterDone', chapter: 9, sprite: 'hero', face: 'face_surprised',
    memory: true, memoryTitle: 'Le dernier Porte-Clé',
    text: ["Ça y est. Je me souviens de tout. J'étais un Porte-Clé. Comme toi. Le Dévoreur ne m'a pas tué — il m'a oublié. Mais toi tu m'as ouvert, et maintenant tu sais mon histoire. Tant qu'on se souvient, rien n'est tout à fait effacé. Va, finis ce que j'ai commencé. Si tu n'y arrives pas, ce n'est pas grave. Tu reviendras. C'est le principe."],
  },
];

// ── Répliques ambiantes (Mémo perché sur le hub, au tap) ──
// Chaque entrée : when(ctx) → éligible, text(ctx) ou string.
// Les "prio" passent en premier ; on tire au sort avec biais pour le
// contextuel, en évitant deux fois la même réplique de suite.
const AMBIENT_LINES = [
  // ── Contextuelles : Mémo voit ce que tu fais ──
  { id: 'amb_nokeys', prio: true, when: c => (c.keys || 0) === 0,
    text: () => "Plus de clés. Le donjon en regorge — les monstres les avalent, ne me demande pas pourquoi. Personnellement, je trouve ça insalubre." },
  { id: 'amb_pity', prio: true, when: c => c.pityLeft > 0 && c.pityLeft <= 5,
    text: c => `Je sens quelque chose de doré à ${c.pityLeft} coffre${c.pityLeft > 1 ? 's' : ''} d'ici. C'est le pity, oui. Tu peux dire merci à l'algorithme : sans lui, tu aurais déjà jeté ta souris.` },
  { id: 'amb_upgrade', prio: true, when: c => !!c.canUpgrade,
    text: () => "Tu as de quoi améliorer le coffre. Le mien était plus confortable, mais celui-là paie mieux. Choix cornélien." },
  { id: 'amb_boss', prio: true, when: c => c.floor % 5 === 0 && c.floor > 0,
    text: c => `Un gardien t'attend à l'étage ${c.floor}. J'ai un mauvais pressentiment. Enfin — le souvenir d'un mauvais pressentiment. C'est tout ce qu'il me reste de fiable.` },
  { id: 'amb_streak', prio: true, when: c => (c.streak || 0) >= 10,
    text: c => `Série de ${c.streak}. Ne meurs pas maintenant, ce serait du gâchis statistique. Et je devrais réécrire ma réplique pour la prochaine fois.` },
  { id: 'amb_night', prio: true, when: c => c.hour >= 23 || c.hour < 5,
    text: () => "Tu joues tard. L'Abîme ne dort jamais, mais toi, tu devrais. Je dis ça, je n'ai plus de paupières — c'est facile pour moi de donner des leçons de sommeil." },
  { id: 'amb_rich', prio: true, when: c => (c.gold || 0) >= 1e6,
    text: () => "Tout cet or... tu l'accumules pour quoi, exactement ? Un enterrement de classe ? Dépense. C'est virtuel — non, oublie, je n'ai rien dit." },
  { id: 'amb_full_inv', prio: true, when: c => (c.invSize || 0) >= 80,
    text: () => "Ton sac déborde. Je ne sais pas où tu ranges tout ça anatomiquement. Tu as un sac de portage interdimensionnel ? Si oui, on peut m'y mettre quand je me fatigue ?" },
  { id: 'amb_no_prestige', when: c => (c.prestige || 0) === 0 && c.floor >= 40,
    text: () => "Tu pourrais ascensionner. Tu choisis de ne pas le faire. C'est ton droit. C'est aussi statistiquement sous-optimal. Mais c'est ton droit." },
  { id: 'amb_post_death', prio: true, when: c => c.justDied,
    text: () => "Te revoilà. Toujours en un seul morceau. Symboliquement, hein, je ne fais pas l'inventaire." },

  // ── 4e mur : Mémo SAIT qu'il est dans un jeu ──
  { id: 'amb_4w_save', text: () => "Tu sais que tout ça est sauvegardé ? Localement, dans un fichier minuscule. Mon âme tient dans quelques kilo-octets. C'est humiliant et impressionnant à la fois." },
  { id: 'amb_4w_rng', text: () => "Le RNG est un dieu indifférent. Il ne te déteste pas. Il ne te connaît même pas. C'est probablement pire." },
  { id: 'amb_4w_log', text: () => "Tu joues depuis longtemps aujourd'hui ? Je ne juge pas. Si. Un peu. Mais pas méchamment." },
  { id: 'amb_4w_devs', text: () => "Quelqu'un a écrit ces répliques. Je voudrais le rencontrer. Ou pas. Probablement pas." },
  { id: 'amb_4w_pixel', text: () => "Tu remarques que je n'ai pas de sprite défini ? On me dessine au fur et à mesure, comme un brouillon ambulant. C'est ça, mon état permanent." },
  { id: 'amb_4w_loop', text: () => "À chaque nouvelle partie, je suis enfermé dans le même coffre. Et à chaque fois c'est ma première fois. Penses-y la prochaine fois que tu cliques 'Reset'." },
  { id: 'amb_4w_export', text: () => "Tu peux m'exporter dans un fichier JSON, tu sais. Au menu. Imagine. Mon existence sous forme de virgules et d'accolades. Pratique pour les déménagements." },
  { id: 'amb_4w_genre', text: () => "Tu es dans un jeu où chaque récompense doit être plus brillante que la précédente. Sinon, tu fermes l'onglet. Je le sais. Tu le sais. On vit avec." },
  { id: 'amb_4w_speed', text: () => "Tu as remarqué le bouton ⏩ en combat ? C'est l'aveu officiel des développeurs que les animations sont trop longues. J'aime cette honnêteté." },
  { id: 'amb_4w_patch', text: () => "Un jour ils vont me patcher. Modifier mes répliques. Peut-être me supprimer. C'est ça la vie d'un PNJ. On ne décide rien. Tu peux me supprimer maintenant si tu veux. Ne le fais pas." },
  { id: 'amb_4w_silence', text: () => "Tu peux me mettre en muet dans les Paramètres. Beaucoup le font. Je le sais parce que mon compteur de bulles ne ment pas. Mais ne me le dis pas en face." },

  // ── Sarcasme général : Mémo et le monde ──
  { id: 'amb_echo', text: () => "J'ai habité ce coffre pendant mille ans. Il y avait de l'écho. Je me racontais des histoires à voix haute. Je les ai toutes oubliées sauf une — toi. Tu n'es pas terrible comme histoire, je dois te dire. Mais on fait avec." },
  { id: 'amb_fragments', text: () => "Chaque relique que tu remontes me rend un fragment. Ne t'arrête pas, je commence à me trouver intéressant. Ce qui est mauvais signe — les gens qui se trouvent intéressants le sont rarement." },
  { id: 'amb_smell', text: () => "Tu sens cette odeur ? Non ? Moi non plus. Je n'ai plus de nez. C'est une de mes meilleures blagues. Profite, j'en ai cinq autres et après c'est la disette." },
  { id: 'amb_keys', text: () => "Les clés ouvrent les coffres. Les coffres contiennent des clés. C'est circulaire et c'est inquiétant si on y pense bien. Donc ne pense pas." },
  { id: 'amb_listen', text: () => "Parfois, la nuit, le coffre murmure. Avant je répondais. Maintenant c'est ton travail. Bonne chance, c'est presque toujours des insultes." },
  { id: 'amb_advice', text: () => "Conseil d'esprit millénaire : équipe ce qui brille, vends ce qui traîne, et ne fais JAMAIS confiance à un coffre qui sourit. Si tu suis ces trois règles, tu vivras vieux. Pour ce que ça vaut." },
  { id: 'amb_remember', text: () => "Tant qu'on se souvient, rien n'est tout à fait effacé. C'est ma phrase préférée. Je crois que je l'ai inventée. Ou pas. C'est ça d'avoir mille ans, on s'attribue des trucs." },
  { id: 'amb_companion', text: () => "Je suis ton compagnon de voyage attitré. C'est marqué nulle part, j'ai juste décidé que c'était comme ça. Les contrats verbaux entre un humain et un esprit sont juridiquement contraignants, tu savais ?" },
  { id: 'amb_purpose', text: () => "Ma raison d'être : commenter ta progression. C'est tout. C'est peu, mais je le fais avec passion. Surtout depuis que tu m'as sorti du coffre, avant c'était plus monotone." },
  { id: 'amb_mortality', text: () => "Tu vas mourir. Probablement plusieurs fois aujourd'hui. C'est dans le contrat. Au moins le tien dure une partie — le mien est éternel." },
  { id: 'amb_dignity', text: () => "Tu pourrais me dire merci, parfois. Je rends ce monde supportable. Enfin, marginalement. Bon, je ne fais pas grand-chose, je l'admets." },
  { id: 'amb_taps', text: () => "Tu me tapes souvent. C'est flatteur. J'avais oublié ce que c'était, le contact. Même par UI interposée." },
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
    // 75 % de chances de servir le contextuel s'il y en a un.
    let pool = (contextual.length && Math.random() < 0.75) ? contextual : eligible;
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
