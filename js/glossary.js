// In-game glossary: hover/tap a marked term to see its definition.
// Used to onboard non-RPG players to terms like "affixe", "orbe", "ascension"…

export const GLOSSARY = {
  affixe:    'Bonus statistique aléatoire sur un objet (ex : +10 Dégâts). Vient s\'ajouter aux stats de base.',
  prefixe:   'Affixe en tête de nom — souvent offensif (Dégâts, Crit, Vitesse).',
  suffixe:   'Affixe en fin de nom — souvent défensif/utilitaire (Vie, Or, Armure).',
  rarete:    'De Commun → Magique → Rare → Épique → Légendaire → Ancestral. Plus c\'est rare, plus il y a d\'affixes.',
  ancestral: 'Rareté la plus haute (rose). Au-dessus de Légendaire. Très rare.',
  orbe:      'Devise de la Forge. Chaque type d\'orbe modifie un objet d\'une façon précise (transmu, alté, exil…).',
  forge:     'Atelier où tu modifies tes objets : ajouter/rerollr des affixes, monter le tier, etc.',
  ascension: 'Reset complet du jeu à T5 + étage 50. Tu gagnes +1 prestige (bonus permanents) et débloques un tier de coffre.',
  prestige:  'Niveau permanent gagné via Ascension. +25% drops rares et or par niveau, cumulatif.',
  cristaux:  'Devise issue du recyclage d\'items. Sert au Reroll+ (rolls garantis hauts).',
  recyclage: 'Détruit un item pour en récupérer des cristaux de sa rareté. Alternative à la vente.',
  pity:      'Compteur de coffres ouverts. À 50, un légendaire est garanti automatiquement.',
  set:       'Objets d\'une même famille (Dragon, Ombre, Titan…) qui donnent des bonus à 2/3/4 pièces équipées.',
  unique:    'Légendaire nommé avec affixes fixes et lore. Ne peut pas être rerollé.',
  elite:     'Monstre violet aux stats ×2.5. Récompenses x2.5, 1 clé garantie.',
  boss:      'Apparaît tous les 5 étages. Stats ×2.6, drop garanti, 3 clés.',
  biome:     'Zone du donjon avec ses monstres et son ambiance : Forêt → Cavernes → Château → Enfer → Néant.',
  talent:    'Compétence permanente débloquée via points de talent (atteindre un palier d\'étage / faire une ascension).',
  competence: 'Effet de combat automatique qui s\'active si tes stats remplissent ses conditions (ex : Soin Vital si Vie ≥ 60).',
  contrat:   'Objectif court (tuer X monstres, looter Y légendaires…) avec une récompense. 3 actifs en permanence.',
  boucle:    'Mode auto-combat : refight l\'étage en boucle jusqu\'à défaite ou désactivation.',
  reroll:    'Régénère aléatoirement les affixes d\'un objet via un orbe (chaos / altération).',
  rerollplus: 'Reroll garanti hauts rolls. Coûte 3 cristaux de la rareté de l\'objet.',

  // === Couches procédurales (parts → material → element → faction → effet) ===
  partie:    'Pièce visuelle composant une arme (lame, garde, pommeau…) ou une armure. Chaque pièce contribue ses propres stats.',
  qualite:   'Roll d20 d\'une partie/matériau/élément. ▓▓▓▓▓ = top roll, ▓░░░░ = bas. Visible dans le tooltip.',
  materiau:  'Composition physique de l\'objet (Fer, Acier, Os, Or, Mithril, Os de Dragon…). Ajoute des stats et apparaît dans le nom : "Hache en Obsidienne".',
  element:   'Charge élémentaire optionnelle d\'un objet (Feu, Givre, Poison, Foudre, Néant). Ajoute des dégâts élémentaires + un adjectif au nom : "Lame Givrée", "Hache Vénéneuse".',
  faction:   'Identité thématique d\'un objet rare+ (Royal, Infernal, Sylvain, Spectral, Bestial). Biaise les rolls de matériau et d\'élément vers son thème.',
  composition: 'Liste détaillée des couches qui composent un objet : parts, matériau, élément, faction, effet légendaire. Chaque couche pousse ses stats dans baseStats avec son origine traçable.',

  // === Effets légendaires ===
  effetlegendaire: 'Comportement spécial d\'un objet légendaire/ancestral (✦ doré). Mute le combat, contrairement aux affixes qui ne font qu\'ajouter des stats.',
  pactedesang:  'Effet légendaire : le premier coup de chaque combat inflige le triple des dégâts.',
  marquevampire:'Effet légendaire : 8 % du dégât infligé te soigne (vol de vie).',
  toucherbrulant:'Effet légendaire (élément Feu) : brûle 3 % des PV max de l\'ennemi chaque tour.',
  foudrechaine:'Effet légendaire (élément Foudre) : chaque coup critique déclenche une seconde attaque à 50 % de dégâts.',
  toucherdor:  'Effet légendaire (matériau Or) : +30 % d\'or par monstre tué.',
  echoneant:   'Effet légendaire (élément Néant) : 12 % de chance que ton attaque se répète immédiatement.',

  // === Forge clarifiée ===
  pierre:    'Pierre de Forge : monte le tier d\'objet +1. Préserve l\'identité visuelle (parts, matériau, élément, affixes) — seules les valeurs montent.',
  rescaletier: 'Opération "rescale tier" : change le tier d\'un objet en gardant les variants de parts, le matériau, l\'élément, les affixes. Préserve la qualité (d20).',
};

// Aliases — terms with multiple spellings/cases that share a definition
export const GLOSSARY_ALIASES = {
  affixes: 'affixe',
  préfixe: 'prefixe',
  préfixes: 'prefixe',
  suffixes: 'suffixe',
  raretés: 'rarete',
  rarities: 'rarete',
  orbes: 'orbe',
  cristal: 'cristaux',
  sets: 'set',
  uniques: 'unique',
  élite: 'elite',
  elites: 'elite',
  bosses: 'boss',
  biomes: 'biome',
  talents: 'talent',
  compétence: 'competence',
  compétences: 'competence',
  contrats: 'contrat',
  'reroll+': 'rerollplus',
  parties: 'partie',
  qualité: 'qualite',
  matériau: 'materiau',
  matériaux: 'materiau',
  élément: 'element',
  éléments: 'element',
  factions: 'faction',
  'effet légendaire': 'effetlegendaire',
  'effets légendaires': 'effetlegendaire',
  'pacte de sang': 'pactedesang',
  'marque du vampire': 'marquevampire',
  'toucher brûlant': 'toucherbrulant',
  'foudre en chaîne': 'foudrechaine',
  "toucher d'or": 'toucherdor',
  'écho du néant': 'echoneant',
  'pierre de forge': 'pierre',
};

export function lookupGlossary(term) {
  if (!term) return null;
  const key = term.toLowerCase().trim();
  const aliased = GLOSSARY_ALIASES[key] || key;
  return GLOSSARY[aliased] || null;
}
