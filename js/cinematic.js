// Intro cinematic — a storybook sequence that establishes the world's lore and
// ties every system together (chests, the Abyss/dungeon, the village, the
// reincarnation cycle = prestige, and the final foe). Pure procedural SVG/CSS,
// skippable and replayable from the menu.
//
// World bible (short):
//   Aethel prospered until the Effondrement split the world and swallowed it
//   into the Abîme. The Anciens sealed their power in coffres before vanishing.
//   You are the last Porte-Clé: descend, reclaim that power, rebuild the surface
//   (the Village), and — life after life (the Cycle = ascension) — reach the
//   bottom to face le Dévoreur, the maw that devoured the world.

const SKY = (a, b) => `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="100" height="100" fill="url(#g)"/>`;

function sceneWorld() {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    ${SKY('#2a3d6e', '#c98a6a')}
    <circle cx="72" cy="26" r="11" fill="#ffe7a0"/><circle cx="72" cy="26" r="18" fill="#ffe7a0" opacity=".25"/>
    <path d="M0,72 Q25,60 50,70 T100,66 L100,100 L0,100 Z" fill="#3c6130"/>
    <path d="M0,82 Q30,72 60,80 T100,78 L100,100 L0,100 Z" fill="#2f4d24"/>
    <rect x="44" y="58" width="4" height="14" fill="#6d4523"/><polygon points="40,58 46,50 52,58" fill="#9c3b3b"/>
    <rect x="30" y="62" width="3" height="10" fill="#6d4523"/><polygon points="27,62 31.5,56 36,62" fill="#742b2b"/>
  </svg>`;
}
function sceneCollapse() {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    ${SKY('#3a1c2e', '#1a0e1a')}
    <path d="M0,60 L40,58 L48,100 L0,100 Z" fill="#2a1d20"/>
    <path d="M100,58 L62,56 L54,100 L100,100 Z" fill="#241a1e"/>
    <polygon points="48,58 54,58 58,100 44,100" fill="#0a0610"/>
    <path d="M50,58 L46,76 L52,82 L48,100" stroke="#ff7a3c" stroke-width="1.5" fill="none" opacity=".8"/>
    <circle cx="51" cy="64" r="1.6" fill="#ffd060"/><circle cx="47" cy="78" r="1.2" fill="#ff8a3c"/>
  </svg>`;
}
function sceneChest() {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    ${SKY('#16223a', '#0e1424')}
    <ellipse cx="50" cy="62" rx="30" ry="8" fill="#f0c463" opacity=".15"/>
    <rect x="34" y="48" width="32" height="20" rx="2" fill="#7a5230"/>
    <path d="M34,48 q16,-12 32,0 Z" fill="#9c6a3c"/>
    <rect x="33" y="55" width="34" height="4" fill="#f0c463"/>
    <rect x="47" y="52" width="6" height="9" rx="1" fill="#f0c463"/>
    <g opacity=".9"><circle cx="50" cy="40" r="2" fill="#ffe7a0"/><circle cx="40" cy="44" r="1.3" fill="#ffd060"/><circle cx="60" cy="43" r="1.5" fill="#ffd060"/></g>
  </svg>`;
}
function sceneHero(heroSvg) {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    ${SKY('#1c2a4a', '#0e1626')}
    <path d="M0,80 L100,80 L100,100 L0,100 Z" fill="#161024"/>
    <ellipse cx="50" cy="80" rx="20" ry="5" fill="#000" opacity=".4"/>
    <g transform="translate(34,30) scale(2.6)">${heroSvg || ''}</g>
    <circle cx="50" cy="22" r="3" fill="#f0c463"/><circle cx="50" cy="22" r="7" fill="#f0c463" opacity=".25"/>
  </svg>`;
}
function sceneCycle() {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    ${SKY('#241a3e', '#120a1c')}
    <g fill="none" stroke="#c79bff" stroke-width="2" opacity=".85">
      <path d="M50,20 a30,30 0 1 1 -21,9" />
      <polygon points="29,29 24,24 34,24" fill="#c79bff" stroke="none"/>
    </g>
    <circle cx="50" cy="50" r="6" fill="#c79bff"/><circle cx="50" cy="50" r="12" fill="#c79bff" opacity=".2"/>
    <g fill="#e3cbff"><circle cx="50" cy="20" r="1.5"/><circle cx="80" cy="50" r="1.5"/><circle cx="50" cy="80" r="1.5"/></g>
  </svg>`;
}
function sceneDevourer() {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    ${SKY('#1a0e1a', '#000')}
    <circle cx="50" cy="55" r="34" fill="#0a0610"/>
    <circle cx="50" cy="55" r="34" fill="none" stroke="#7a1f3c" stroke-width="2" opacity=".7"/>
    <circle cx="40" cy="48" r="4" fill="#ff3c5a"/><circle cx="60" cy="48" r="4" fill="#ff3c5a"/>
    <circle cx="40" cy="48" r="7" fill="#ff3c5a" opacity=".25"/><circle cx="60" cy="48" r="7" fill="#ff3c5a" opacity=".25"/>
    <path d="M34,64 Q50,76 66,64 Q58,70 50,70 Q42,70 34,64 Z" fill="#7a1f3c"/>
    <g fill="#ff3c5a"><polygon points="40,64 42,69 44,64"/><polygon points="48,66 50,71 52,66"/><polygon points="56,64 58,69 60,64"/></g>
  </svg>`;
}

export function introSlides(heroSvg) {
  return [
    { title: 'Aethel', text: "Il fut un temps où le monde d'Aethel prospérait sous mille soleils, gardé par l'ordre des Porte-Clés.", scene: sceneWorld() },
    { title: "L'Effondrement", text: "Puis la terre se fendit. En une nuit, le monde tout entier sombra dans l'Abîme — un gouffre sans fond, sans fin.", scene: sceneCollapse() },
    { title: 'Les Coffres scellés', text: "Avant de disparaître, les Anciens scellèrent leur puissance dans d'innombrables coffres, dispersés au plus profond des ténèbres.", scene: sceneChest() },
    { title: 'Le dernier Porte-Clé', text: "Tu es le dernier de l'ordre. À toi de descendre, de briser les sceaux, et de rebâtir à la surface ce qui fut perdu.", scene: sceneHero(heroSvg) },
    { title: 'Le Cycle', text: "La mort n'est pas une fin. À chaque chute, tu renais — gardant en toi les reliques et la mémoire de tes vies passées.", scene: sceneCycle() },
    { title: 'Le Dévoreur', text: "Tout au fond t'attend Celui qui engloutit le monde. Descends. Reprends ton pouvoir. Renais. Et affronte le Dévoreur.", scene: sceneDevourer() },
  ];
}
