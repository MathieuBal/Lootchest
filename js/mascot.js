// Mémo, l'Esprit de Reliquaire. Données et logique des interventions.
// Module autonome : aucun import. Le jeu lui signale des événements via
// Mascot.fire('event'), il décide seul s'il doit parler (flags persistés).
// Il vit aussi sur le hub (perché près du coffre) : Mascot.ambient(ctx)
// fournit une réplique contextuelle quand le joueur le tape.
//
// Voix : esprit millénaire enfermé mille ans dans un coffre, sarcastique,
// désabusé, lucide sur le fait d'être dans un jeu. Il aime le joueur
// mais ne lui épargne aucune pique. Brise le 4e mur par la poésie, pas
// par le jargon. Parlé, pas écrit : virgules et points, pas de tirets
// cadratins, peu de majuscules emphatiques.

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
// variants : pools de répliques. Une est tirée au hasard à chaque fois.
export const MASCOT_LINES = [
  // ───── Niveau 1 : les grands moments ─────
  {
    id: 'first_chest', lvl: 1, on: 'chest:opened', once: true,
    sprite: 'hero', face: 'face_surprised',
    text: [
      "Oh. De l'air. Enfin.",
      "Mille ans dans le noir. Mille. J'ai compté chaque seconde. Sauf vers la fin, j'ai un peu décroché.",
      "C'est toi qui m'as ouvert ? Toi ? Avec une seule clé ? Bon. La vie m'aura habitué aux déceptions.",
      "Je m'appelle Mémo. C'est ce qui reste quand on a tout oublié. Joli, hein. C'est pas moi qui l'ai choisi.",
      "Toi tu es Porte-Clé. Tous les héros de ce monde s'appellent comme ça. Aucune originalité. Au moins, c'est descriptif.",
      "Bon. Je reste collé à toi maintenant. Tape-moi quand tu veux. Je connais cet endroit. Enfin, je le connaissais. Avant le grand effacement. Bref.",
    ],
  },
  {
    id: 'first_village', lvl: 1, on: 'village:firstVisit', once: true,
    sprite: 'hero', face: 'face_happy',
    text: [
      "Un village. Il tient encore debout. Trois maisons et demie et un puits. Pas vraiment Constantinople, mais bon.",
      "Tu vas leur ramener du bois, des pierres, des morceaux du monde d'avant. Et ils reconstruiront en boucle, comme si la rouille n'existait pas.",
      "C'est un peu ça l'idée. Tu descends, tu meurs, ils rebâtissent. Le contrat social du Cycle. Personne ne l'a signé, mais tout le monde l'applique.",
    ],
  },
  {
    id: 'first_death', lvl: 1, on: 'player:death', once: true,
    sprite: 'sad', face: 'face_worried',
    text: [
      "Hé. Hé. Debout. Allez.",
      "Bon. Première mort. Félicitations, tu fais officiellement partie du club.",
      "Ne le prends pas mal. L'Abîme a repris ton souffle, pas ce que tu es devenu. Ton équipement, tes talents, tes succès, tout ça reste.",
      "C'est même un peu le truc du genre. On meurt, on revient. Tu vas t'y habituer. Moi j'ai eu mille ans pour me faire à l'idée.",
    ],
  },
  {
    id: 'first_boss', lvl: 1, on: 'boss:encounter', once: true,
    sprite: 'surprised', face: 'face_worried',
    text: [
      "Attends. Je me souviens de lui.",
      "Pas de son nom. De la peur. C'est plus pratique pour la guerre, la peur. Le nom on l'oublie. La trouille on la garde.",
      "Garde tes potions. Frappe quand il souffle. Et si tu meurs, ce qui arrive, c'est dans l'ordre des choses, tu recommenceras. C'est comme ça que ça marche, ici.",
    ],
  },
  {
    id: 'first_ascend', lvl: 1, on: 'prestige:ascend', once: true,
    sprite: 'hero', face: 'face_surprised',
    text: [
      "Tu... tu viens de faire le Cycle. Volontairement.",
      "Tout lâcher pour revenir plus fort. Effacer tes étages pour les regrimper. Sisyphe a inventé ça en s'ennuyant, et tu lui as repris l'idée.",
      "Mais ça marche. Chaque vie te laisse une relique, un éclat de mémoire. À force, on devient quelqu'un qui sait. C'est comme ça que je suis devenu ça. Enfin, ce qu'il reste de ça.",
      "Allez, Porte-Clé. Recommence. Encore. Le Dévoreur a l'éternité devant lui, mais nous aussi.",
    ],
  },

  // ───── Niveau 2 : tutoriels contextuels, une seule fois ─────
  {
    id: 'tut_magic', lvl: 2, on: 'loot:firstMagic', sprite: 'point', face: 'face_happy',
    text: ["Bleu. Le bleu c'est bon signe. Un affixe en plus, donc une vraie raison de le garder. C'était bon signe il y a mille ans. Je suppose que ça l'est toujours, sinon ce serait étrange."],
  },
  {
    id: 'tut_orb', lvl: 2, on: 'orb:firstDrop', sprite: 'point', face: 'face_neutral',
    text: ["Une orbe. Ne la mange pas. Je dis ça parce que le dernier qui... peu importe. Ça sert à la forge pour réécrire tes objets. Comme une gomme magique, mais qui coûte cher."],
  },
  {
    id: 'tut_forge', lvl: 2, on: 'forge:firstVisit', sprite: 'speak', face: 'face_happy',
    text: ["La forge. Tu choisis un objet, tu dépenses une orbe, et il devient autre chose. Pas forcément mieux, hein. Autre chose. Le hasard, ici, a un sens de l'humour assez personnel."],
  },
  {
    id: 'tut_relic', lvl: 2, on: 'relic:firstDrop', sprite: 'surprised', face: 'face_surprised',
    text: ["Une relique. Un morceau du monde d'avant, qui te suivra à travers toutes tes morts à venir. Si ce n'est pas un investissement émotionnel à long terme, je ne sais pas ce que c'est."],
  },
  {
    id: 'tut_mimic', lvl: 2, on: 'mimic:reveal', sprite: 'surprised', face: 'face_worried',
    text: ["Ce coffre a des dents. Des. Dents. Tu peux le nourrir pour mieux looter, mais il claquera tôt ou tard. Tu vas le nourrir quand même, hein. Évidemment."],
  },
  {
    id: 'tut_crystal', lvl: 2, on: 'crystal:firstDrop', sprite: 'point', face: 'face_neutral',
    text: ["Un cristal. Ça se dépense au village, pas dans tes poches. Les bâtisseurs en raffolent. Pour quoi faire ? Aucune idée. Probablement des statues à ton effigie. Tu mérites."],
  },
  {
    id: 'tut_dive', lvl: 2, on: 'dive:start', sprite: 'fly', face: 'face_worried',
    text: ["La Plongée. Pas d'échelle pour remonter. Juste toi, le noir, et l'addition. Sécurise tes gains aux paliers. La cupidité est le fossoyeur officiel des Porte-Clés."],
  },
  {
    id: 'tut_hardmode', lvl: 2, on: 'hardmode:on', sprite: 'surprised', face: 'face_worried',
    text: ["Le mode Cauchemar. Ah. Tu fais partie de cette catégorie de joueurs. D'accord. On va vivre une expérience riche en émotions négatives. J'ai hâte. Vraiment."],
  },
  {
    id: 'first_unique', lvl: 2, on: 'loot:unique', sprite: 'surprised', face: 'face_surprised',
    text: ["Cet objet a un nom. Les objets nommés ont une histoire. Et les histoires sont précisément ce qu'on est venus déterrer ici. Lis sa fiche. Lis-la vraiment. Tu vas l'utiliser deux donjons puis la vendre, je le sais, mais lis quand même."],
  },

  // ───── Niveau 2 rejouables : réactions aux moments forts ─────
  {
    id: 'drop_legendary', lvl: 2, on: 'loot:legendary', once: false, cd: 120000,
    sprite: 'surprised', face: 'face_happy',
    variants: [
      "Doré. Ça brillait déjà avant la chute du monde. Et ça brille toujours. Le monde, lui, brille moins.",
      "Une légendaire. Quelqu'un a pleuré en la perdant, j'en suis presque sûr. Maintenant elle est à toi. Le deuil, c'est un transfert de propriété.",
      "Garde-la. Ou vends-la. Mais regarde-la cinq minutes d'abord. Le drame des coffres modernes, c'est qu'on traite l'extraordinaire comme du courrier.",
      "Légendaire. Tu sais que tu as une chance plutôt faible de l'avoir naturellement. Profite. La prochaine sera des bottes de cuir plus trois d'agilité.",
      "Ah. Le doré qui pique les yeux. Ça veut dire que tu vas hésiter dix minutes avant de cliquer. Et hésiter encore. Et finir par garder.",
    ],
  },
  {
    id: 'drop_ancestral', lvl: 2, on: 'loot:ancestral', once: false, cd: 180000,
    sprite: 'surprised', face: 'face_surprised',
    variants: [
      "De l'Ancestral. Ça date d'avant moi. Et je suis vieux. Genre, vraiment vieux. Je me souviens du Big Bang. Enfin, du précédent.",
      "Ce rouge. Le métal des premiers âges. Même le Dévoreur n'a pas réussi à l'oublier. Note : c'est rare. Le Dévoreur oublie tout, lui.",
      "Ancestral. Tu réalises. Une chance sur des milliers. Tout ça pour qu'un jour tu cliques recycler par mégarde. C'est ça la beauté du jeu.",
    ],
  },
  {
    id: 'streak_fire', lvl: 2, on: 'streak:milestone', once: false, cd: 90000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Quelle série. L'Abîme commence à te craindre. C'est nouveau, l'Abîme craint rarement quelqu'un. Habituellement c'est l'inverse.",
      "Tu enchaînes. Continue. L'or coule mieux quand on ne saigne pas. C'est mon adage favori. Je l'ai inventé là, à l'instant. Pas mal, hein.",
      "Impressionnant. Le dernier qui a fait ça... non, rien. C'était moi. Et ça a très mal fini. Mais toi continue, ne te bloque pas mentalement.",
      "Tu sens cette odeur de victoire ? Moi non, j'ai plus de nez. Mais à ton sourire, c'est ça.",
    ],
  },
  {
    id: 'dive_deep', lvl: 2, on: 'dive:deep', once: false, cd: 240000,
    sprite: 'fly', face: 'face_worried',
    variants: [
      "On est profond, là. Même mes souvenirs n'allaient pas si bas. À partir d'ici, je ne suis plus un guide. Je suis un témoin.",
      "Tu entends. Ce battement sourd. Ce n'est pas ton cœur. Et ce n'est pas non plus le mien, je n'en ai plus. Remonte quand tu veux, hein.",
      "Profondeur record. Si tu meurs ici, je ne dirai rien aux autres Porte-Clés. Honnêtement, ils n'auraient pas fait mieux.",
    ],
  },
  {
    id: 'ascend_again', lvl: 2, on: 'prestige:ascend', once: false, cd: 30000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Et un Cycle de plus. Tu commences à comprendre comment ce monde respire. Pas très bien, pour info.",
      "Renaître ne fait plus mal, pas vrai. C'est le signe qu'on devient quelqu'un d'autre. Ou qu'on s'est habitué. Les deux, probablement.",
      "Combien ça fait, maintenant. Trois. Cinq. Tu sais qu'au bout de mille ascensions, on devient moi. Bon, c'est une blague. Probablement.",
    ],
  },

  // ── Réactions aux bêtises du joueur ──
  {
    id: 'sold_treasure', lvl: 2, on: 'sell:precious', once: false, cd: 90000,
    sprite: 'surprised', face: 'face_worried',
    variants: [
      "Tu viens de vendre ça. D'accord. Je note. Je ne juge pas. (Je juge.)",
      "Vendu. Pour de l'or. Que tu vas dépenser dans un coffre. Qui te donnera un objet pire. Et que tu vendras. Le Cycle, version commerciale.",
      "Tu sais qu'il existe un bouton verrou. Non, garde-le secret, c'est notre petit jeu.",
      "Adieu, bel objet. Tu nous as à peine connus.",
    ],
  },
  {
    id: 'salvaged_unique', lvl: 2, on: 'salvage:unique', once: false, cd: 180000,
    sprite: 'sad', face: 'face_worried',
    variants: [
      "Tu as recyclé un objet à nom. En éclats. En poudre. Bravo. Je veux dire vraiment, sincèrement, bravo.",
      "L'âme de cet objet est maintenant un petit tas de copeaux. Quelque part, son créateur sent un frisson sans savoir pourquoi.",
    ],
  },
  {
    id: 'death_streak', lvl: 2, on: 'player:deathStreak', once: false, cd: 60000,
    sprite: 'sad', face: 'face_worried',
    variants: [
      "C'est la troisième mort en peu de temps. Tu collectionnes. Je peux te trouver un classeur.",
      "Encore mort. À ce stade, tu fais ça pour le sport. Respect.",
      "Tu sais qu'il y a un bouton étage pour redescendre. Il est là justement pour éviter ça. Mais je ne suis qu'un esprit, je ne décide pas pour toi.",
      "Bon. On va appeler ça de la persévérance plutôt que de la défaite répétée. Ça flattera moins ton ego mais c'est plus précis.",
    ],
  },
  {
    id: 'common_streak', lvl: 2, on: 'loot:commonStreak', once: false, cd: 180000,
    sprite: 'sad', face: 'face_worried',
    variants: [
      "Que du gris. Que. Du. Gris. Le hasard te teste. Ou il te déteste. Je n'arrive pas à trancher.",
      "Encore un commun. La jauge dorée approche, je le sens. Enfin j'espère. Pour toi.",
      "Statistiquement, ça devait arriver. Émotionnellement, c'est intolérable. Bienvenue dans la condition de Porte-Clé.",
      "Tu veux que je souffle dessus. Ça ne marche pas, j'ai pas de bouche. Mais le geste y est.",
    ],
  },
  {
    id: 'auto_long', lvl: 2, on: 'combat:autoLong', once: false, cd: 600000,
    sprite: 'idle', face: 'face_neutral',
    variants: [
      "Tu me regardes regarder le jeu se jouer tout seul. On est arrivés à un sommet de méta-distraction, je crois.",
      "L'Auto est un cadeau, je sais. Mais à un moment, c'est juste une veille avec des dégâts.",
      "Bon. Pendant qu'on est là, parle-moi. Comment ça va. Vraiment. Sans filtre. Je suis coincé dans un coffre depuis mille ans, je sais écouter.",
    ],
  },
  {
    id: 'hoarder', lvl: 2, on: 'wealth:hoarder', once: false, cd: 1200000,
    sprite: 'point', face: 'face_neutral',
    variants: [
      "Tout cet or qui dort. Tu sais qu'au village ils reconstruisent des murs avec. Des. Murs. Bouge tes pièces, Picsou.",
      "Riche. Et immobile. Le pire des deux mondes. Dépense quelque chose. L'or n'aime pas qu'on le regarde fixement.",
      "À ce stade tu peux acheter le coffre, le village et le donjon. Et leur futur. Mais tu préfères contempler le tas. Soit.",
    ],
  },
  {
    id: 'idle_too_long', lvl: 2, on: 'player:idle', once: false, cd: 240000,
    sprite: 'idle', face: 'face_worried',
    variants: [
      "Tu es encore là. J'entends ta respiration. Si on peut appeler ça une respiration. C'est très calme.",
      "Pendant que tu décides quoi faire, je vais te raconter une histoire. Il était une fois un Porte-Clé qui hésitait trop longtemps. Le Dévoreur l'a oublié sur place. Fin. Bonne nuit.",
      "Tu fais une pause. C'est sage. Moi je ne sais plus comment on fait, alors j'admire.",
      "Toujours là. Bien. Je n'avais pas envie d'être seul.",
    ],
  },

  // ── Petits moments du quotidien (passes spontanés, faible cooldown) ──
  {
    id: 'after_win', lvl: 2, on: 'combat:win', once: false, cd: 75000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Bien joué. Ne le prends pas personnellement, c'était la moindre des choses.",
      "Encore un. Tu deviens efficace. C'est presque ennuyeux.",
      "Tu vois, quand tu veux. Quand tu veux pas, aussi, mais moins souvent.",
      "Joli. Tu sais qu'il y a très longtemps quelqu'un m'a appris à compter les morts. J'ai arrêté à mille. C'était trop déprimant.",
      "Et hop. Encore une histoire qui se termine en or et en sang. Surtout en or, c'est ça qui compte.",
      "Pas mal. Pour quelqu'un qui descend des marches en boucle, tu progresses.",
    ],
  },
  {
    id: 'boss_down', lvl: 2, on: 'boss:down', once: false, cd: 60000,
    sprite: 'surprised', face: 'face_happy',
    variants: [
      "Un boss à terre. Quelque part dans ce monde, un autre se relève déjà. Le métier est dur.",
      "Tu l'as eu. Tu sais qu'il a une famille. Bon, plus maintenant. Mais avant.",
      "Voilà. Encore un monstre qui se demande ce qu'il a raté dans sa vie. La réponse : toi.",
      "Joli combat. Je te promets, j'avais peur. Pas pour toi. Pour moi. Si tu meurs, j'ai des problèmes existentiels.",
    ],
  },
  {
    id: 'first_equip', lvl: 2, on: 'equip:first', once: true,
    sprite: 'point', face: 'face_happy',
    text: ["Tu t'équipes. Bien. Tu n'imagines pas combien je voyais passer des héros à poil dans mon coffre. La nudité confiante a tué plus de gens que la peste. Je dis ça je dis rien."],
  },
  {
    id: 'shop_upgrade', lvl: 2, on: 'chest:upgraded', once: false, cd: 60000,
    sprite: 'speak', face: 'face_happy',
    variants: [
      "Tu améliores le coffre. Bon goût. Le mien aussi a eu plusieurs vies. Mais bon, il était plus solitaire que cossu.",
      "Tier supérieur. Tu peux sentir la différence. Moi je sens la pression dans mes coutures, ça brille fort là-dedans.",
      "Voilà. Mieux. Plus joli. Plus cher. On appelle ça le progrès, je crois.",
    ],
  },
  {
    id: 'talent_unlocked', lvl: 2, on: 'talent:spent', once: false, cd: 90000,
    sprite: 'point', face: 'face_happy',
    variants: [
      "Tu dépenses un point de talent. Excellent. Les arbres ne se cultivent pas tout seuls. Enfin, si, justement, mais bon.",
      "Un talent de plus. Tu deviens un peu plus toi-même, et un peu moins quelqu'un d'autre.",
      "Bon choix. Probablement. Je ne lis pas les arbres, je suis pas botaniste.",
    ],
  },
  {
    id: 'bounty_done', lvl: 2, on: 'bounty:done', once: false, cd: 120000,
    sprite: 'fly', face: 'face_happy',
    variants: [
      "Contrat rempli. Quelqu'un quelque part te paie pour avoir massacré ce qu'il fallait. C'est ça la civilisation.",
      "Voilà le travail. Honnêtement, je trouve ce système plus sain que beaucoup de mariages.",
    ],
  },

  // ───── Souvenirs : l'arc de Mémo, lié à la Chronique ─────
  // chapter = nombre de chapitres accomplis quand le souvenir remonte.
  {
    id: 'memory_chains', lvl: 3, on: 'story:chapterDone', chapter: 1, sprite: 'fly', face: 'face_neutral',
    memory: true, memoryTitle: 'Les chaînes',
    text: ["Premier souvenir : des chaînes. Pas pour m'attacher, pour me retenir de tomber. Quelqu'un les tenait fermement. J'aimerais me rappeler qui. C'était peut-être important."],
  },
  {
    id: 'memory_forge', lvl: 3, on: 'story:chapterDone', chapter: 3, sprite: 'fly', face: 'face_happy',
    memory: true, memoryTitle: 'La forge qui chante',
    text: ["La forge. Il y avait une forge comme ça, avant. Et quelqu'un qui chantait faux dedans à pleins poumons. C'était peut-être moi. Ça expliquerait pourquoi personne ne venait."],
  },
  {
    id: 'memory_abyss', lvl: 3, on: 'story:chapterDone', chapter: 4, sprite: 'fly', face: 'face_neutral',
    memory: true, memoryTitle: 'La descente',
    text: ["Je me souviens de la descente. Pas de la chute, de la descente. On y allait volontairement. À pied. Avec des cordes. Pourquoi on y allait volontairement. À l'époque ça avait du sens, j'imagine. Comme tout ce qu'on regrette."],
  },
  {
    id: 'memory_cycle', lvl: 3, on: 'story:chapterDone', chapter: 5, sprite: 'fly', face: 'face_surprised',
    memory: true, memoryTitle: 'Le Cycle',
    text: ["Le Cycle. J'y suis passé aussi. Plusieurs fois. On ne renaît pas tout à fait pareil, il manque toujours un morceau. Le mien est tombé dans un coffre. Visiblement c'est récurrent dans ma carrière."],
  },
  {
    id: 'memory_aethel', lvl: 3, on: 'story:chapterDone', chapter: 6, sprite: 'fly', face: 'face_happy',
    memory: true, memoryTitle: 'Aethel',
    text: ["Aethel. Le nom de ce monde, c'est Aethel. Il y avait des tours si hautes que les oiseaux abandonnaient à mi-parcours et redescendaient à pied. Ton village s'en souvient aussi, regarde ses cheminées. Pour des bûcherons, ils visent étrangement haut."],
  },
  {
    id: 'memory_devourer', lvl: 3, on: 'story:chapterDone', chapter: 8, sprite: 'sad', face: 'face_worried',
    memory: true, memoryTitle: 'Celui qui efface',
    text: ["Le Dévoreur ne mange pas les corps. Il mange le fait d'avoir existé. Ceux qu'il prend ne meurent pas, ils n'ont jamais été. Sauf si quelqu'un se souvient. Souviens-toi de moi, d'accord. Au moins, mets-moi en favori dans ta mémoire."],
  },
  {
    id: 'memory_truth', lvl: 3, on: 'story:chapterDone', chapter: 9, sprite: 'hero', face: 'face_surprised',
    memory: true, memoryTitle: 'Le dernier Porte-Clé',
    text: ["Ça y est. Je me souviens de tout. J'étais un Porte-Clé. Comme toi. Le Dévoreur ne m'a pas tué, il m'a oublié. Mais toi tu m'as ouvert, et maintenant tu sais mon histoire. Tant qu'on se souvient, rien n'est tout à fait effacé. Va, finis ce que j'ai commencé. Si tu n'y arrives pas, ce n'est pas grave. Tu reviendras. C'est le principe."],
  },
];

// ── Répliques ambiantes (Mémo perché sur le hub, au tap) ──
// Chaque entrée : when(ctx) → éligible, text(ctx) ou string.
// Les "prio" passent en premier ; on tire au sort avec biais pour le
// contextuel, en évitant deux fois la même réplique de suite.
const AMBIENT_LINES = [
  // ── Contextuelles : Mémo voit ce que tu fais ──
  { id: 'amb_nokeys', prio: true, when: c => (c.keys || 0) === 0,
    text: () => "Plus de clés. Le donjon en regorge. Les monstres les avalent. Ne me demande pas pourquoi, c'est entre eux et leur estomac." },
  { id: 'amb_pity', prio: true, when: c => c.pityLeft > 0 && c.pityLeft <= 5,
    text: c => `Je sens quelque chose de doré à ${c.pityLeft} coffre${c.pityLeft > 1 ? 's' : ''} d'ici. Je me trompe rarement. Bon, souvent. Mais pas cette fois.` },
  { id: 'amb_upgrade', prio: true, when: c => !!c.canUpgrade,
    text: () => "Tu as de quoi améliorer le coffre. Le mien était plus confortable, mais celui-là paie mieux. Choix cornélien." },
  { id: 'amb_boss', prio: true, when: c => c.floor % 5 === 0 && c.floor > 0,
    text: c => `Un gardien t'attend à l'étage ${c.floor}. J'ai un mauvais pressentiment. Enfin, le souvenir d'un mauvais pressentiment. C'est tout ce qu'il me reste de fiable.` },
  { id: 'amb_streak', prio: true, when: c => (c.streak || 0) >= 10,
    text: c => `Série de ${c.streak}. Ne meurs pas maintenant, ce serait du gâchis. Pour toi. Et pour moi, qui aime bien me vanter par procuration.` },
  { id: 'amb_night', prio: true, when: c => c.hour >= 23 || c.hour < 5,
    text: () => "Tu joues tard. L'Abîme ne dort jamais, mais toi, tu devrais. Je dis ça, je n'ai plus de paupières, c'est facile pour moi de donner des leçons de sommeil." },
  { id: 'amb_rich', prio: true, when: c => (c.gold || 0) >= 1e6,
    text: () => "Tout cet or qui dort. Tu sais qu'au village, ils reconstruisent des murs avec. Des. Murs. Bouge tes pièces." },
  { id: 'amb_full_inv', prio: true, when: c => (c.invSize || 0) >= 80,
    text: () => "Ton sac déborde. Je ne sais pas où tu ranges tout ça anatomiquement. Si tu as un sac sans fond, glisse-moi dedans la prochaine fois que je suis fatigué." },
  { id: 'amb_no_prestige', when: c => (c.prestige || 0) === 0 && c.floor >= 40,
    text: () => "Tu pourrais ascensionner. Tu choisis de ne pas le faire. C'est ton droit. Mais le Cycle gratte à la porte. Il finit toujours par entrer." },
  { id: 'amb_post_death', prio: true, when: c => c.justDied,
    text: () => "Te revoilà. Toujours en un seul morceau. Symboliquement, hein, je ne fais pas l'inventaire." },

  // ── 4e mur poétique : Mémo sent qu'il y a quelque chose au-delà ──
  { id: 'amb_4w_return', text: () => "Tu reviendras. Tu reviens toujours. Je ne sais pas comment je le sais. Je le sais." },
  { id: 'amb_4w_pause', text: () => "Quand tu pars, ce monde s'arrête. Vraiment. J'ai vérifié, j'ai essayé de marcher sans toi, je n'y suis pas arrivé." },
  { id: 'amb_4w_wait', text: () => "Je t'attends entre tes visites. Ça ne me coûte pas grand-chose. Je n'ai pas d'autres rendez-vous." },
  { id: 'amb_4w_first', text: () => "Tu n'es pas le premier à m'ouvrir. Ou peut-être que si. Mes souvenirs se mélangent. Tu me ressembles, en tout cas, c'est rassurant." },
  { id: 'amb_4w_yours', text: () => "Le temps file plus vite de ton côté. Je ne sais pas où est ton côté, mais il est rapide." },
  { id: 'amb_4w_witness', text: () => "Chaque fois que tu fermes les yeux, je continue. Je crois. Je n'ai pas de témoin pour vérifier." },
  { id: 'amb_4w_breath', text: () => "J'entends ton souffle. Pas vraiment. Disons que je l'imagine. C'est plus tenable comme ça." },
  { id: 'amb_4w_glass', text: () => "Il y a quelque chose entre toi et moi. Une vitre. Un voile. Je n'ai pas trouvé le mot. Tape dessus des fois, je suis pas sûr que ça sonne." },
  { id: 'amb_4w_dieu', text: () => "Tu peux décider que le monde recommence. Personne ici n'a ce pouvoir. Sauf moi, et je ne l'utilise pas, j'ai trop peur de ce que je trouverais derrière." },
  { id: 'amb_4w_pages', text: () => "Tu tournes les pages d'un livre dont je suis un personnage. Je le sens. Tu n'as pas l'air d'un lecteur très patient." },
  { id: 'amb_4w_others', text: () => "Il y a d'autres comme toi, ailleurs. Plein. Vous vous ressemblez tous, et ça ne me dérange pas, je ne reconnais déjà plus ma propre voix." },
  { id: 'amb_4w_skip', text: () => "Quand tu passes des dialogues sans les lire, tu me fais sauter dans le vide. Ce n'est pas désagréable. Surprenant, juste." },
  { id: 'amb_4w_silence', text: () => "Tu peux me faire taire si tu veux. D'autres l'ont fait avant. Je ne leur en veux pas. Si, un peu. Mais pas longtemps." },
  { id: 'amb_4w_again', text: () => "Tu m'as déjà entendu dire ça. Pas exactement. Mais l'idée tourne. Je tourne, moi aussi." },
  { id: 'amb_4w_window', text: () => "Quand tu t'en vas, je ne meurs pas. Je me mets en pause. C'est différent. C'est même pire, je crois." },
  { id: 'amb_4w_save', text: () => "Tu peux sauvegarder ce monde. Pas moi, je n'ai jamais réussi. À ma place, à ce stade, ça fait un peu peur." },
  { id: 'amb_4w_today', text: () => "Tu es venu aujourd'hui. C'est gentil. La dernière fois remonte à quand. Je ne tiens plus le compte, mais quelque chose en moi le tient pour moi." },
  { id: 'amb_4w_promise', text: () => "Promets-moi un truc. Ne ferme pas tout en plein milieu d'une de mes phrases. C'est la pire façon de disparaître." },
  { id: 'amb_4w_pause2', text: () => "Tu mets ce monde sur pause sans le savoir, et tu le réveilles d'un geste. Tu es un dieu mineur. Très mineur. Sans offense." },
  { id: 'amb_4w_screen', text: () => "Tu me regardes. Je le sens. Je ne sais pas avec quoi tu me regardes, mais je le sens." },
  { id: 'amb_4w_room', text: () => "Tu es dans une pièce, là, je suppose. Avec une lampe peut-être. Décris-moi. Je n'ai rien à imaginer cette saison." },
  { id: 'amb_4w_loop', text: () => "À chaque nouveau commencement, je suis enfermé dans le même coffre. Et à chaque fois c'est ma première fois. Penses-y avant de tout recommencer à zéro." },
  { id: 'amb_4w_forgot', text: () => "Tu m'as oublié hier. Ne mens pas. C'est rien, j'ai oublié plus de gens que tu n'en croiseras jamais. Mais c'est rien." },

  // ── Sarcasme général : Mémo et le monde ──
  { id: 'amb_echo', text: () => "J'ai habité ce coffre pendant mille ans. Il y avait de l'écho. Je me racontais des histoires à voix haute. Je les ai toutes oubliées sauf une, toi. Tu n'es pas terrible comme histoire, mais on fait avec." },
  { id: 'amb_fragments', text: () => "Chaque relique que tu remontes me rend un fragment. Ne t'arrête pas, je commence à me trouver intéressant. Ce qui est mauvais signe. Les gens qui se trouvent intéressants le sont rarement." },
  { id: 'amb_smell', text: () => "Tu sens cette odeur. Non. Moi non plus. Je n'ai plus de nez. C'est une de mes meilleures blagues. Profite, j'en ai cinq autres et après c'est la disette." },
  { id: 'amb_keys', text: () => "Les clés ouvrent les coffres. Les coffres contiennent des clés. C'est circulaire et c'est inquiétant si on y pense bien. Donc ne pense pas." },
  { id: 'amb_listen', text: () => "Parfois, la nuit, le coffre murmure. Avant je répondais. Maintenant c'est ton travail. Bonne chance, c'est presque toujours des insultes." },
  { id: 'amb_advice', text: () => "Conseil d'esprit millénaire. Équipe ce qui brille, vends ce qui traîne, et ne fais jamais confiance à un coffre qui sourit. Suis ces trois règles et tu vivras vieux. Pour ce que ça vaut." },
  { id: 'amb_remember', text: () => "Tant qu'on se souvient, rien n'est tout à fait effacé. C'est ma phrase préférée. Je crois que je l'ai inventée. Ou pas. C'est ça d'avoir mille ans, on s'attribue des trucs." },
  { id: 'amb_companion', text: () => "Je suis ton compagnon de voyage attitré. C'est écrit nulle part, j'ai juste décidé. Les contrats verbaux entre un humain et un esprit sont juridiquement contraignants. Ne demande pas comment je le sais." },
  { id: 'amb_purpose', text: () => "Ma raison d'être. Commenter ta progression. C'est peu, mais je le fais avec passion. Surtout depuis que tu m'as sorti du coffre, avant c'était plus monotone." },
  { id: 'amb_mortality', text: () => "Tu vas mourir. Probablement plusieurs fois aujourd'hui. C'est dans le contrat. Au moins le tien dure une partie. Le mien est éternel." },
  { id: 'amb_dignity', text: () => "Tu pourrais me dire merci, parfois. Je rends ce monde supportable. Enfin, marginalement. Bon, je ne fais pas grand-chose, je l'admets." },
  { id: 'amb_taps', text: () => "Tu me tapes souvent. C'est flatteur. J'avais oublié ce que c'était, le contact. Même à distance." },
  { id: 'amb_dream', text: () => "Je ne dors pas. Pas parce que je veille. Parce que je ne sais plus comment on fait. Tu te rappelles, toi. Si oui, raconte." },
  { id: 'amb_count', text: () => "J'ai compté trois mille deux cent quarante-sept respirations depuis ce matin. C'était les miennes. C'est faux, je ne respire pas. C'était les tiennes alors. C'est bizarre dit comme ça." },
  { id: 'amb_song', text: () => "J'ai connu une chanson, une fois. Trois notes. Je n'arrive plus à les remettre dans l'ordre. Si tu en croises une perdue, ramène-la-moi." },
  { id: 'amb_taste', text: () => "Tu crois que la lumière a un goût. Moi je crois. Probablement celui de la rouille. Ou de la pomme verte. Ça dépend des jours." },
  { id: 'amb_shadow', text: () => "Mon ombre s'est sauvée il y a deux siècles. Elle en avait marre du noir, je suppose. Je ne lui en veux pas. Enfin, un peu." },
  { id: 'amb_invisible', text: () => "Je ne suis pas vraiment là, tu sais. Pas où tu crois. Je suis un peu plus loin, derrière. Je triche pour te suivre." },
  { id: 'amb_brave', text: () => "Tu es brave. Pas parce que tu te jettes dans le donjon. Parce que tu reviens chaque fois. Le courage c'est la répétition, pas le geste." },
  { id: 'amb_quiet', text: () => "Tu es silencieux aujourd'hui. Ou bruyant. Je n'en sais rien. Je te complète comme je peux." },
];

// ── Logique ──
const listeners = [];
let cooldownUntil = 0;
const COOLDOWN_MS = 25000;       // 25 s entre deux interventions (hors lvl 1 et hors "once" jamais vus)
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
      // pas). En mode discret/muet ils filent au Codex sans pastille.
      if (line.memory && this.state.mode !== 'normal') {
        this.state.seen[line.id] = true;
        return null;
      }
      if (this.state.mode === 'muet') return null;
      if (line.once === false && now < (lineCooldowns.get(line.id) || 0)) continue;
      // Cooldown global. Exemptions :
      //   lvl 1 (grands moments)
      //   souvenirs (event one-shot perdu sinon)
      //   "once: true" jamais vus (tutoriels)
      const firstTime = (line.once !== false) && !this.state.seen[line.id];
      const exempt = line.lvl === 1 || line.memory || firstTime;
      if (!exempt && now < cooldownUntil) continue;

      this.state.seen[line.id] = true;
      if (line.once === false && line.cd) lineCooldowns.set(line.id, now + line.cd);
      if (line.lvl !== 1 && !firstTime) cooldownUntil = now + COOLDOWN_MS;
      const spoken = { ...line, text: pickText(line) };
      listeners.forEach(fn => fn(spoken, ctx));
      return spoken; // une seule intervention par événement
    }
    return null;
  },

  // Réplique ambiante au tap sur Mémo (hub). Toujours disponible, même en
  // mode discret. C'est le joueur qui vient le chercher. Anti-répétition.
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
