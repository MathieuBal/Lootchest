// Intro cinematic — establishes a lore where LOOTING IS REMEMBERING.
//
// World bible (tight, mechanically-relevant):
//   The world wasn't burned or conquered — it was *forgotten*. A slow erasure,
//   l'Oubli, unmade things from the edges inward. The Anciens couldn't fight it,
//   so they chose to be remembered: they sealed the world — works, names, souls
//   — inside countless Reliquaires (chests) and gave them to the Abyss.
//   You are the last Porte-Clé. Every chest you open returns a fragment of the
//   lost world to the light; what you reforge, the surface remembers (the
//   Village rebuilds). But l'Oubli erases faster than one life can save: when
//   you fall, the Abyss erases your path and leaves only what you've become
//   (relics = the Cycle/ascension). At the bottom waits l'Oubli made flesh —
//   le Dévoreur. While it breathes, the world keeps fading.
//
// Rich, layered SVG scenes; animated bits use the .cg-* classes in style.css.

const defs = (id, stops, type = 'linear') => {
  const grad = type === 'radial'
    ? `<radialGradient id="${id}">${stops}</radialGradient>`
    : `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`;
  return `<defs>${grad}<filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>`;
};
const motes = (n, fill = '#ffe7a0') => Array.from({ length: n }, (_, i) =>
  `<circle class="cg-mote" style="--d:${(i % 5) * 0.8}s" cx="${8 + (i * 11) % 86}" cy="${14 + (i * 23) % 70}" r="${0.5 + (i % 3) * 0.4}" fill="${fill}"/>`).join('');
const wrap = (inner) => `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;

// 1 — The forgetting: a lit world dissolving into void on the right.
function sceneForget() {
  return wrap(`${defs('s1', '<stop offset="0" stop-color="#3a5a8c"/><stop offset=".6" stop-color="#caa46a"/><stop offset="1" stop-color="#e8c79a"/>')}
    <rect width="100" height="100" fill="url(#s1)"/>
    <circle class="cg-pulse" cx="26" cy="30" r="13" fill="#fff3c4" filter="url(#s1b)"/>
    <path d="M0,70 Q22,60 44,68 T78,64 L78,100 L0,100 Z" fill="#3c6130"/>
    <path d="M0,80 Q20,72 40,78 T74,75 L74,100 L0,100 Z" fill="#2f4d24"/>
    <rect x="30" y="56" width="3" height="12" fill="#6d4523"/><polygon points="27,56 31.5,49 36,56" fill="#9c3b3b"/>
    <rect x="44" y="58" width="3" height="10" fill="#6d4523"/><polygon points="41,58 45.5,52 50,58" fill="#742b2b"/>
    <rect x="60" y="100" width="40" height="0" fill="none"/>
    <rect x="58" y="0" width="42" height="100" fill="#0a0610" opacity=".0"/>
    <g class="cg-fade-right"><rect x="56" y="0" width="44" height="100" fill="#0a0610"/></g>
    <g>${motes(10, '#cdb8d8')}</g>`);
}
// 2 — The Reliquaries: ornate chests glowing, light beams, sinking into dark.
function sceneReliquaries() {
  return wrap(`${defs('s2', '<stop offset="0" stop-color="#1a2740"/><stop offset="1" stop-color="#0a0c18"/>')}
    <rect width="100" height="100" fill="url(#s2)"/>
    <g class="cg-beam" opacity=".5"><polygon points="50,8 40,100 60,100" fill="#ffe7a0"/></g>
    ${chest(50, 50, 1.4)} ${chest(28, 64, 0.9)} ${chest(72, 66, 0.85)}
    <g class="cg-pulse">${chest(50, 50, 1.4, true)}</g>
    <g>${motes(12)}</g>`);
}
function chest(cx, cy, s, glowOnly = false) {
  const w = 22 * s, h = 14 * s, x = cx - w / 2, y = cy - h / 2;
  if (glowOnly) return `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.9}" ry="${h}" fill="#ffe7a0" opacity=".12" filter="url(#s2b)"/>`;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${1.5 * s}" fill="#7a5230"/>
    <path d="M${x},${y} q${w / 2},${-9 * s} ${w},0 Z" fill="#9c6a3c"/>
    <rect x="${x - 0.5}" y="${y + h * 0.35}" width="${w + 1}" height="${2.4 * s}" fill="#f0c463"/>
    <rect x="${cx - 2 * s}" y="${y + h * 0.2}" width="${4 * s}" height="${6 * s}" rx="${s}" fill="#f0c463"/></g>`;
}
// 3 — Descent through buried strata.
function sceneDescent() {
  const strata = ['#3a2c4e', '#332541', '#2b1f37', '#241a2e', '#1c1426', '#15101d'];
  let bands = '';
  strata.forEach((c, i) => { bands += `<rect x="0" y="${16 + i * 14}" width="100" height="15" fill="${c}"/>`; });
  return wrap(`<rect width="100" height="100" fill="#0e0a18"/>
    ${defs('s3', '<stop offset="0" stop-color="#ffe7a0"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/>', 'radial')}
    ${bands}
    <g opacity=".4">${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${30 + i * 14}" x2="100" y2="${30 + i * 14}" stroke="#000" stroke-width=".4"/>`).join('')}</g>
    <circle class="cg-pulse" cx="50" cy="18" r="6" fill="url(#s3)"/>
    <g class="cg-descend"><polygon points="50,34 46,42 50,40 54,42" fill="#f0c463"/><circle cx="50" cy="33" r="2.2" fill="#ffe7a0"/></g>
    <g>${motes(8, '#a98fd0')}</g>`);
}
// 4 — The last Keybearer, raising a key that pulls a fragment of light.
function sceneHero(heroSvg) {
  return wrap(`${defs('s4', '<stop offset="0" stop-color="#243a66"/><stop offset="1" stop-color="#0c1322"/>')}
    <rect width="100" height="100" fill="url(#s4)"/>
    <circle class="cg-pulse" cx="62" cy="30" r="9" fill="#fff3c4" filter="url(#s4b)"/>
    <polygon class="cg-shard" points="62,22 65,30 62,38 59,30" fill="#ffe7a0"/>
    <path d="M0,82 L100,82 L100,100 L0,100 Z" fill="#0a0f1c"/>
    <ellipse cx="44" cy="82" rx="18" ry="4" fill="#000" opacity=".45"/>
    <g transform="translate(30,34) scale(2.4)">${heroSvg || ''}</g>
    <g>${motes(9)}</g>`);
}
// 5 — The surface remembering: a village reassembling from rising light.
function sceneRebuild() {
  return wrap(`${defs('s5', '<stop offset="0" stop-color="#3a2c5e"/><stop offset=".55" stop-color="#7a5a8c"/><stop offset="1" stop-color="#c98a6a"/>')}
    <rect width="100" height="100" fill="url(#s5)"/>
    <circle cx="74" cy="24" r="10" fill="#ffd96a" opacity=".9" filter="url(#s5b)"/>
    <path d="M0,74 Q30,66 60,72 T100,70 L100,100 L0,100 Z" fill="#34532a"/>
    <g transform="translate(0,2)">
      <rect x="30" y="56" width="14" height="16" fill="#c9b48a"/><polygon points="28,56 37,47 46,56" fill="#9c3b3b"/>
      <rect x="50" y="52" width="16" height="20" fill="#b3a07a"/><polygon points="48,52 58,42 68,52" fill="#742b2b"/>
      <rect x="20" y="62" width="10" height="10" fill="#a8916a"/><polygon points="18,62 25,55 32,62" fill="#8c3b3b"/>
    </g>
    <g class="cg-rise">${Array.from({ length: 7 }, (_, i) => `<rect x="${22 + i * 9}" y="${60 + (i % 3) * 5}" width="2.4" height="2.4" fill="#ffe7a0"/>`).join('')}</g>
    <g>${motes(10)}</g>`);
}
// 6 — The Cycle: a ring of light, fading footprints, relics orbiting the soul.
function sceneCycle() {
  return wrap(`${defs('s6', '<stop offset="0" stop-color="#241a3e"/><stop offset="1" stop-color="#0c0816"/>')}
    <rect width="100" height="100" fill="url(#s6)"/>
    <g class="cg-spin" style="transform-origin:50px 50px"><circle cx="50" cy="50" r="28" fill="none" stroke="#c79bff" stroke-width="2" stroke-dasharray="6 7" opacity=".8"/></g>
    <circle class="cg-pulse" cx="50" cy="50" r="7" fill="#c79bff" filter="url(#s6b)"/>
    <circle cx="50" cy="50" r="4" fill="#e3cbff"/>
    <g class="cg-spin" style="transform-origin:50px 50px"><circle cx="50" cy="22" r="2.2" fill="#ffe7a0"/><circle cx="78" cy="50" r="2" fill="#ffd060"/><circle cx="50" cy="78" r="2.2" fill="#7ad0ff"/><circle cx="22" cy="50" r="2" fill="#ff8a3c"/></g>
    <g opacity=".5" fill="#7a6a9c"><ellipse cx="30" cy="86" rx="2.5" ry="1.4"/><ellipse cx="38" cy="88" rx="2.2" ry="1.2"/><ellipse cx="46" cy="86" rx="1.8" ry="1"/></g>`);
}
// 7 — The Devourer: a vast maw swallowing the last light.
function sceneDevourer() {
  return wrap(`${defs('s7', '<stop offset="0" stop-color="#1a0e1a"/><stop offset="1" stop-color="#000"/>', 'radial')}
    <rect width="100" height="100" fill="#000"/>
    <circle cx="50" cy="58" r="46" fill="url(#s7)"/>
    <circle class="cg-pulse" cx="50" cy="58" r="30" fill="#0a0610"/>
    <circle cx="50" cy="58" r="30" fill="none" stroke="#7a1f3c" stroke-width="2" opacity=".7"/>
    <g class="cg-eyes"><circle cx="40" cy="50" r="3.4" fill="#ff3c5a"/><circle cx="60" cy="50" r="3.4" fill="#ff3c5a"/>
    <circle cx="40" cy="50" r="7" fill="#ff3c5a" opacity=".2"/><circle cx="60" cy="50" r="7" fill="#ff3c5a" opacity=".2"/></g>
    <path d="M34,66 Q50,80 66,66 Q58,73 50,73 Q42,73 34,66 Z" fill="#7a1f3c"/>
    <g fill="#ff3c5a"><polygon points="40,66 42,71 44,66"/><polygon points="48,68 50,73 52,68"/><polygon points="56,66 58,71 60,66"/></g>
    <g class="cg-suck">${Array.from({ length: 6 }, (_, i) => `<circle cx="${14 + i * 14}" cy="${18 + (i % 3) * 6}" r="1.2" fill="#ffe7a0"/>`).join('')}</g>`);
}

export function introSlides(heroSvg) {
  return [
    { title: "L'Oubli", text: "Le monde ne fut ni brûlé ni conquis. Il fut oublié. Une lente érasure, depuis les bords, effaça les choses — jusqu'à ce qu'elles n'aient jamais été.", scene: sceneForget() },
    { title: 'Les Reliquaires', text: "Les Anciens ne purent l'arrêter. Alors ils choisirent d'être retenus : ils scellèrent le monde — leurs œuvres, leurs noms, leurs âmes — dans d'innombrables reliquaires, et les confièrent à l'Abîme.", scene: sceneReliquaries() },
    { title: "L'Abîme", text: "Tout ce qui fut sombra, strate après strate. L'Abîme n'est pas un gouffre : c'est le monde enseveli, qui attend qu'on s'en souvienne.", scene: sceneDescent() },
    { title: 'Le dernier Porte-Clé', text: "Tu es le dernier à porter les clés. Chaque coffre que tu ouvres rend au jour un fragment du monde perdu.", scene: sceneHero(heroSvg) },
    { title: 'Ce que la surface se rappelle', text: "Ce que tu remontes, tu le reforges — et la surface s'en souvient. Pierre après pierre, le monde renaît derrière toi.", scene: sceneRebuild() },
    { title: 'Le Cycle', text: "Mais l'Oubli efface plus vite qu'une seule vie ne sauve. Quand tu tombes, l'Abîme efface tes pas, et ne te laisse que ce que tu es devenu.", scene: sceneCycle() },
    { title: 'Le Dévoreur', text: "Au plus profond veille l'Oubli fait chair : le Dévoreur. Tant qu'il respire, le monde s'efface. Descends. Souviens-toi. Et rends-lui le jour.", scene: sceneDevourer() },
  ];
}
