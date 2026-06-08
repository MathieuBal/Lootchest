// All DOM rendering for the redesigned UI (AAA mobile-gacha shell).
// Screen-router architecture: one app shell (HUD + screen + tab bar) plus an
// overlay stack (combat, loot reveal, item detail, meta screens, modals).
// Game logic is untouched — this layer only reads state + calls logic modules.
import { state, notify } from './state.js';
import {
  RARITIES, RARITY_BY_ID, SLOTS, SLOT_BY_ID,
  CHEST_TIERS, CHEST_OPEN_COOLDOWN_MS, PITY_THRESHOLD,
  PITY_ANCESTRAL_THRESHOLD, PITY_UNIQUE_THRESHOLD,
  ACHIEVEMENTS, biomeForFloor, BIOMES, AUTOSELL_UNLOCK_COSTS,
  CURRENCY_TYPES, CURRENCY_BY_ID, CURRENCY_EXCHANGE_LADDER, AFFIXES_BY_ID,
  SETS_BY_ID, SETS, TALENTS, TALENT_BY_ID, TALENT_CATEGORIES,
  TALENT_MASTERY_THRESHOLD, UNIQUE_LEGENDARIES,
  RELIC_BY_ID, AFFIX_TIP, maxAllowedChestTier, FIXED_MAX_FLOOR, MIMIC,
} from './data.js';
import { computeStats, computePower, computeSetSummary, itemPowerContribution, computeStatsBreakdown } from './character.js';
import { getCurrentTier, getNextTier, canUpgrade, canOpen, hasKey, cooldownRemaining, nextTierLockedBy } from './chest.js';
import { generateMonster, predictDifficulty, isBossFloor } from './combat.js';
import { FORGE_ACTIONS, availableMasterCraftAffixes, canToggleAffixLock, exchangeNext, exchangeCost, canExchange, REROLL_PLUS_SHARD_COST } from './forge.js';
import { shardYield, autoActionFor } from './inventory.js';
import { getAchievementProgress } from './achievements.js';
import { canAscend, ascensionRequirements } from './prestige.js';
import { rankOf, canUpgradeTalent, pityReduction, categoryPoints, abilitySlots, totalPointsSpent, respecCost, canRespecTalents } from './talents.js';
import { SKILLS, getActiveSkills } from './skills.js';
import { ABILITIES, getLoadout, isSlotted, isAbilityUnlocked } from './abilities.js';
import { affinitySummary } from './affinities.js';
import { canDive, getSession, DIVE_BOON_BY_ID } from './dive.js';
import * as Village from './village.js';
import { buildingArtSVG } from './villageArt.js';
import { introSlides } from './cinematic.js';
import * as Story from './story.js';
import { rerollCost as bountyRerollCost } from './bounties.js';
import { chestSpriteSVG, characterSpriteSVG, composedSpriteSVG, composeCharacterWithGearSVG, hasBossSprite, bossSpriteSVG } from './sprites.js';
import { monsterSpriteSrc, bossSpriteSrcByName, chestSpriteSrc, orbSpriteSrc, treasureSpriteSrc, mimicSpriteSrc, spriteImg } from './spriteMap.js';
import { LEGENDARY_EFFECTS } from './legendaryEffects.js';
import { MATERIALS } from './materials.js';
import { ELEMENTS } from './elements.js';
import { FACTIONS } from './factions.js';
import { getCompositionLayers } from './parts.js';

// ─────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────
const fmt = (n) => (n || 0).toLocaleString('fr-FR');
const $ = (sel, root = document) => root.querySelector(sel);
const PCT_STATS = new Set(['crit', 'fireDmg', 'frostDmg', 'voidDmg', 'poisonDmg', 'lightningDmg', 'goldFind', 'speed']);

function statLabel(key) {
  return {
    vitality: 'Vie', damage: 'Dégâts', armor: 'Armure', crit: '% Crit',
    fireDmg: '% Feu', frostDmg: '% Givre', voidDmg: '% Néant',
    poisonDmg: '% Poison', lightningDmg: '% Foudre', goldFind: '% Or', speed: '% Vitesse',
  }[key] || key;
}
const STAT_ICON = {
  vitality: '❤', damage: '⚔', armor: '🛡', crit: '✦', goldFind: '💰', speed: '💨',
  fireDmg: '🔥', frostDmg: '❄', voidDmg: '🌌', poisonDmg: '☠', lightningDmg: '⚡',
};

// ─────────────────────────────────────────────────────────────
// Item visual + detail helpers (rich composition rendering preserved)
// ─────────────────────────────────────────────────────────────
function itemVisualHTML(item, px = 40) {
  if (item.parts) {
    const isHD = !!item.hdParts;
    const layers = getCompositionLayers(item.baseTypeId, item.parts, item.material?.id, item.element?.id, { hd: isHD });
    return composedSpriteSVG(layers, px, { hd: !isHD && px >= 64 });
  }
  return `<span class="item-emoji" style="font-size:${Math.round(px * 0.62)}px">${item.emoji || '❔'}</span>`;
}

// Square rarity tile with glow + corner badges (lock / set / unique / element / material).
export function itemTileHTML(item, { px = 56, big = false } = {}) {
  const r = RARITY_BY_ID[item.rarity];
  const badges = [];
  if (item.locked) badges.push('<span class="tile-badge bl">🔒</span>');
  if (item.setId && SETS_BY_ID[item.setId]) {
    badges.push(`<span class="tile-badge tr set" style="background:${SETS_BY_ID[item.setId].color}">${SETS_BY_ID[item.setId].name.charAt(0)}</span>`);
  } else if (item.uniqueId) {
    badges.push('<span class="tile-badge tr">✨</span>');
  } else if (item.legendaryEffect) {
    badges.push('<span class="tile-badge tr">✦</span>');
  }
  if (!big && item.element && item.element.id !== 'none') {
    const e = ELEMENTS[item.element.id];
    if (e) badges.push(`<span class="tile-badge tl" style="color:${e.glowColor}">${e.icon}</span>`);
  }
  if (!big && item.material) {
    const m = MATERIALS[item.material.id];
    if (m && m.icon) badges.push(`<span class="tile-badge bl2" style="color:${m.tintColor}">${m.icon}</span>`);
  }
  return `<div class="item-tile rar-glow-${r.cssClass}${big ? ' big' : ''}" data-item-id="${item.id}" data-rarity="${item.rarity}">
    <div class="item-tile-art pixel">${itemVisualHTML(item, px)}</div>${badges.join('')}
  </div>`;
}

function itemTotalStats(item) {
  const total = {};
  for (const [k, v] of Object.entries(item.baseStats || {})) total[k] = (total[k] || 0) + v;
  for (const a of item.affixes || []) total[a.stat] = (total[a.stat] || 0) + a.value;
  return total;
}

function affixTypeBadge(aff) {
  const t = aff.type || AFFIXES_BY_ID[aff.id]?.type;
  if (t === 'prefix') return '<span class="affix-type p">P</span>';
  if (t === 'suffix') return '<span class="affix-type s">S</span>';
  return '';
}

// Roll-quality stars (1–3) from the affix's recorded `roll` (0..1).
function affixQualityStars(aff) {
  if (typeof aff.roll !== 'number') return '';
  const stars = Math.max(1, Math.round(aff.roll * 3));
  const color = aff.roll >= 0.8 ? '#ffe14a' : aff.roll >= 0.5 ? '#9aa0a6' : '#6b7075';
  return ` <span class="affix-q" style="color:${color}" title="Qualité du roll ${Math.round(aff.roll * 100)}%">${'★'.repeat(stars)}</span>`;
}

function sourcesHTML(item) {
  if (!item.statSources || item.statSources.length === 0) return '';
  const SOURCE_ICON = { part: '🧩', material: '🔩', element: '✨', faction: '🏷', condition: '🌀' };
  const rows = item.statSources.map(src => {
    const icon = SOURCE_ICON[src.sourceType] || '◆';
    const stats = Object.entries(src.stats).map(([k, v]) => `+${v} ${statLabel(k)}`).join(' · ');
    const q = Math.round((src.quality || 0) * 5);
    const bar = '▓'.repeat(q) + '░'.repeat(5 - q);
    return `<div class="comp-row"><span class="comp-name">${icon} ${src.label}</span><span class="comp-q">${bar}</span><div class="comp-stats">${stats}</div></div>`;
  }).join('');
  return `<div class="comp-block"><div class="comp-title smallcap">Composition</div>${rows}</div>`;
}

function comparisonRows(item) {
  const equipped = state.equipment[item.slot];
  if (!equipped || equipped.id === item.id) return null;
  const a = itemTotalStats(item), b = itemTotalStats(equipped);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const rows = [];
  for (const k of keys) {
    const diff = (a[k] || 0) - (b[k] || 0);
    if (diff === 0) continue;
    rows.push(`<span class="${diff > 0 ? 'better' : 'worse'}">${diff > 0 ? '+' : ''}${diff}${PCT_STATS.has(k) ? '%' : ''} ${statLabel(k)}</span>`);
  }
  return rows;
}

// Compact details block (used by tooltip + action sheet).
export function itemDetailsHTML(item) {
  const r = RARITY_BY_ID[item.rarity];
  const slot = SLOT_BY_ID[item.slot];
  const baseLines = Object.entries(item.baseStats || {}).map(([k, v]) => `<div class="tt-base">+${v} ${statLabel(k)}</div>`).join('');
  const affixLines = (item.affixes || []).map(a => `<div class="tt-affix">${affixTypeBadge(a)}${a.value > 0 ? '+' : ''}${a.value}${a.percent ? '%' : ''} ${a.label}${affixQualityStars(a)}</div>`).join('');
  const uniqueBadge = item.uniqueId ? '<span class="unique-badge">UNIQUE</span>' : '';
  let setBlock = '';
  if (item.setId && SETS_BY_ID[item.setId]) {
    const set = SETS_BY_ID[item.setId];
    setBlock = `<div class="tt-set" style="color:${set.color};border-color:${set.color}">Set : ${set.name}</div>`;
  }
  const flavor = item.flavor ? `<div class="tt-flavor">"${item.flavor}"</div>` : '';
  let legendaryBlock = '';
  if (item.legendaryEffect && LEGENDARY_EFFECTS[item.legendaryEffect.id]) {
    const eff = LEGENDARY_EFFECTS[item.legendaryEffect.id];
    legendaryBlock = `<div class="tt-legendary"><span class="tt-le-title">✦ ${eff.name}</span><span class="tt-le-desc">${eff.desc}</span></div>`;
  }
  const power = Math.round(itemPowerContribution(item));
  const cmp = comparisonRows(item);
  const cmpBlock = cmp ? `<div class="tt-compare"><div class="smallcap">vs équipé</div>${cmp.length ? cmp.join(' ') : '<span class="same">Identique</span>'}</div>` : '';
  return `
    <div class="tt-name rt-${r.cssClass}">${item.name}${uniqueBadge}</div>
    <div class="tt-slot">T${item.chestTier} · ${slot.name} — <span class="rarity-tag rt-${r.cssClass}">${r.name}</span></div>
    ${setBlock}${baseLines}${affixLines}${sourcesHTML(item)}${legendaryBlock}${flavor}
    <div class="tt-power">⚡ Puissance ${fmt(power)}</div>
    <div class="tt-value">💰 ${fmt(item.goldValue)} · 💎 ${shardYield(item)} ${r.name}</div>
    ${cmpBlock}`;
}

// ─────────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────────
const CUR_GLYPH = { gold: '💰', key: '🗝', shard: '💎', orb: '🔮' };
function currencyPill(kind, value, { big = false } = {}) {
  const color = { gold: 'var(--cur-gold)', key: 'var(--cur-key)', shard: 'var(--cur-shard)', orb: 'var(--cur-orb)' }[kind] || 'var(--ink-100)';
  return `<span class="cur-pill${big ? ' big' : ''}" style="--c:${color}"><span class="cur-glyph">${CUR_GLYPH[kind]}</span><span class="mono cur-val">${fmt(value)}</span></span>`;
}

function hpBar(cur, max, { color = 'var(--r-poison)', label = '', id = '' } = {}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return `<div class="hpbar"${id ? ` id="${id}"` : ''}>
    <div class="hpbar-fill" style="width:${pct}%;background:${color}"></div>
    <div class="hpbar-text mono">${label ? label + ' ' : ''}${Math.max(0, Math.round(cur))}/${Math.round(max)}</div>
  </div>`;
}

function totalShardCount() { return Object.values(state.shards || {}).reduce((a, b) => a + b, 0); }
function totalOrbCount() { return Object.values(state.orbs || {}).reduce((a, b) => a + b, 0); }

// ─────────────────────────────────────────────────────────────
// Router / shell
// ─────────────────────────────────────────────────────────────
const nav = { tab: 'hub', overlay: null, params: {} };
const TABS = [
  { id: 'hub', icon: '📦', label: 'Coffre' },
  { id: 'dungeon', icon: '⚔', label: 'Donjon' },
  { id: 'village', icon: '🏰', label: 'Village' },
  { id: 'inventory', icon: '🎒', label: 'Sac' },
  { id: 'forge', icon: '⚒', label: 'Forge' },
  { id: 'meta', icon: '🛡', label: 'Héros' },
];

export function getMode() { return window.matchMedia('(min-width: 901px)').matches ? 'desktop' : 'mobile'; }

let appEl, overlayEl, mounted = false;
export function mountApp() {
  appEl = document.getElementById('app');
  overlayEl = document.getElementById('overlay-root');
  mounted = true;
  window.addEventListener('resize', () => { renderAll(); }, { passive: true });
  renderAll();
}

export function navTab(tab) {
  nav.tab = tab;
  state.ui.leftTab = (tab === 'dungeon') ? 'dungeon' : 'chest'; // keep loop-mode logic compatible
  renderAll();
}
export const setActiveTab = (t) => navTab(t === 'chest' ? 'hub' : t);
export function getActiveTab() { return nav.tab; }

export function navOverlay(name, params = {}) { nav.overlay = name; nav.params = params; renderOverlay(); }
export function closeOverlay() { nav.overlay = null; nav.params = {}; renderOverlay(); }
// Back-compat modal API (maps modal ids → overlays)
const MODAL_OVERLAY = {
  'forge-modal': 'forge', 'talents-modal': 'talents', 'codex-modal': 'codex',
  'skills-modal': 'skills', 'bounties-modal': 'contracts', 'settings-modal': 'settings',
  'stats-breakdown-modal': 'stats', 'achievements-modal': 'achievements',
  'help-modal': 'help', 'welcome-modal': 'onboarding',
};
export function showModal(id) { const o = MODAL_OVERLAY[id]; if (o) navOverlay(o); }
export function hideModal(id) { const o = MODAL_OVERLAY[id]; if (o && nav.overlay === o) closeOverlay(); else if (id === 'welcome-modal' && nav.overlay === 'onboarding') closeOverlay(); }
export function isModalOpen(id) { return nav.overlay === MODAL_OVERLAY[id]; }

// ─────────────────────────────────────────────────────────────
// Top render entrypoint
// ─────────────────────────────────────────────────────────────
export function renderAll() {
  if (!mounted) return;
  const mode = getMode();
  document.body.dataset.mode = mode;
  if (mode === 'desktop') renderDesktop();
  else renderMobile();
  renderOverlay();
}

function renderMobile() {
  const screen = SCREENS[nav.tab] ? SCREENS[nav.tab]() : `<div class="screen-pad">Écran inconnu</div>`;
  appEl.innerHTML = `
    ${topHUD()}
    <main class="screen scroll" data-screen="${nav.tab}">${screen}</main>
    ${tabBar()}`;
}

function renderDesktop() {
  const builder = DESKTOP_SCREENS[nav.tab] || (() => `<div class="dt-center">${SCREENS[nav.tab] ? SCREENS[nav.tab]() : ''}</div>`);
  appEl.innerHTML = `
    <div class="desktop-shell">
      ${railNav()}
      <div class="desktop-main">
        ${topHUD()}
        <main class="screen scroll" data-screen="${nav.tab}">${builder()}</main>
      </div>
    </div>`;
}

// ── HUD (top bar) ────────────────────────────────────────────
function topHUD() {
  const stats = computeStats();
  const power = computePower(stats);
  const tier = getCurrentTier();
  const prestige = state.prestige?.level || 0;
  const shard = totalShardCount(), orb = totalOrbCount();
  return `<header class="hud">
    <button class="hud-hero" data-nav="meta" title="Héros · Puissance">
      <span class="hud-hero-sprite pixel">${characterSpriteSVG(34)}</span>
      <span class="hud-power"><span class="smallcap">Puiss.</span><span class="mono">${fmt(power)}</span></span>
    </button>
    <div class="hud-cur">
      ${currencyPill('gold', state.gold)}
      ${currencyPill('key', state.keys)}
      ${shard ? currencyPill('shard', shard) : ''}
      ${orb ? currencyPill('orb', orb) : ''}
    </div>
    <div class="hud-right">
      ${prestige ? `<span class="hud-prestige" title="Prestige">🌟${prestige}</span>` : ''}
      <button class="hud-icon" data-overlay="contracts" title="Contrats">📋<span class="hud-dot" id="hud-bounty-dot"></span></button>
      <button class="hud-icon" data-menu="1" title="Menu">⋯</button>
    </div>
  </header>`;
}

function tabBar() {
  return `<nav class="tabbar">
    ${TABS.map(t => `<button class="tab${nav.tab === t.id ? ' active' : ''}" data-tab="${t.id}">
      <span class="ico">${t.icon}</span><span>${t.label}</span></button>`).join('')}
  </nav>`;
}

function railNav() {
  return `<nav class="rail">
    <div class="rail-logo">⛓</div>
    ${TABS.map(t => `<button class="rail-btn${nav.tab === t.id ? ' active' : ''}" data-tab="${t.id}" title="${t.label}">
      <span class="ico">${t.icon}</span></button>`).join('')}
    <div class="rail-spacer"></div>
    <button class="rail-btn" data-overlay="contracts" title="Contrats">📋</button>
    <button class="rail-btn" data-menu="1" title="Menu">⋯</button>
  </nav>`;
}

// ═════════════════════════════════════════════════════════════
// SCREENS
// ═════════════════════════════════════════════════════════════
const SCREENS = {
  hub: screenHub,
  dungeon: screenDungeon,
  village: screenVillage,
  inventory: screenInventory,
  forge: screenForge,
  meta: screenMeta,
};

// ── ① Hub — the chest is the hero ────────────────────────────
function screenHub() {
  const tier = getCurrentTier();
  const stats = computeStats();
  const power = computePower(stats);
  const pityMax = Math.max(1, PITY_THRESHOLD - pityReduction());
  const pity = Math.min(pityMax, state.pity?.sinceLegendary || 0);
  const pityLeft = Math.max(0, pityMax - pity);
  const weights = tier.weights;
  const dropSegments = RARITIES.filter(r => (weights[r.id] || 0) > 0).map(r =>
    `<div class="drop-seg" style="flex:${weights[r.id]};background:${r.color}" title="${r.name} ${weights[r.id]}%"></div>`).join('');
  const dropLabels = RARITIES.filter(r => (weights[r.id] || 0) > 0).map(r =>
    `<span class="drop-pct mono" style="color:${r.color}">${weights[r.id]}%</span>`).join('');

  const next = getNextTier();
  const lockedBy = nextTierLockedBy();
  const canUp = canUpgrade();
  const enoughKeys = (state.keys || 0) > 0;
  const ancPity = Math.min(PITY_ANCESTRAL_THRESHOLD, state.pity?.sinceAncestral || 0);
  const uniPity = Math.min(PITY_UNIQUE_THRESHOLD, state.pity?.sinceUnique || 0);
  const focusOrbs = state.orbs?.focus || 0;

  // Next-step hint text
  let nextStep = '';
  if (pityLeft <= 5 && pityLeft > 0) nextStep = `▼ ${pityLeft} ouverture${pityLeft > 1 ? 's' : ''} jusqu'à une légendaire garantie`;
  else if ((state.opened || 0) === 0 && enoughKeys) nextStep = '▼ Ouvre ton premier coffre';
  else if (canUp) nextStep = `▼ Assez d'or pour passer au coffre ${next.name}`;

  return `<div class="hub">
    <div class="power-strip panel">
      <span class="smallcap">Puissance</span>
      <span class="mono power-val gold-text">${fmt(power)}</span>
    </div>

    <div class="hub-stage">
      <div class="stage-tier smallcap gold-text">Tier ${tier.tier} · ${tier.name}</div>
      <div class="stage-title display">Coffre ${tier.name}</div>
      <div class="chest-hero${enoughKeys ? ' has-key' : ''}" id="chest-hero">
        <div class="chest-sprite pixel" id="chest-sprite">${spriteImg(chestSpriteSrc(tier.tier, { hires: true }), chestSpriteSVG(tier.tier, 168), { size: 168, title: tier.name })}</div>
      </div>

      <div class="drop-card panel">
        <div class="drop-card-head"><span class="smallcap">Taux de butin</span></div>
        <div class="drop-bar">${dropSegments}</div>
        <div class="drop-labels">${dropLabels}</div>
        <div class="pity-row">
          <span class="smallcap">Pity</span>
          <div class="pity-bar"><div class="pity-fill" style="width:${(pity / pityMax) * 100}%"></div></div>
          <span class="mono pity-num">${pity}/${pityMax}</span>
        </div>
        <div class="pity-sub smallcap" title="Garanties anti-malchance">
          <span style="color:${RARITY_BY_ID.ancestral.color}">Ancestral ${ancPity}/${PITY_ANCESTRAL_THRESHOLD}</span>
          · <span style="color:${RARITY_BY_ID.legendary.color}">Unique ${uniPity}/${PITY_UNIQUE_THRESHOLD}</span>
        </div>
      </div>

      <div class="focus-row">
        <span class="smallcap" title="Cible le slot du prochain coffre (consomme une orbe)">🎯 ${fmt(focusOrbs)}</span>
        ${SLOTS.map(s => `<button class="focus-chip${state.focusSlot === s.id ? ' active' : ''}" data-focus-slot="${s.id}" title="${s.name}" ${(focusOrbs > 0 || state.focusSlot === s.id) ? '' : 'disabled'}>${s.emptyEmoji}</button>`).join('')}
      </div>
    </div>

    <div class="open-bar">
      <button class="btn-key" data-nav="dungeon" title="Farme des clés au donjon">
        <span class="cur-glyph">🗝</span><span class="mono">${fmt(state.keys)}</span>
      </button>
      <button class="btn-gold btn-open ${enoughKeys ? '' : 'is-disabled'}" id="btn-open">
        <span class="open-ico">⬢</span> Ouvrir <span class="open-cost">· 1 clé</span>
      </button>
      <button class="btn-ghost btn-upgrade ${canUp ? 'ready' : ''}" id="btn-upgrade" ${(!next || lockedBy) ? 'disabled' : ''}
        title="${next ? (lockedBy ? 'Débloqué via Ascension Niv ' + lockedBy : 'Améliorer → ' + next.name + ' (' + fmt(next.upgradeCost) + ' or)') : 'Tier max'}">
        ⬆ ${next ? (lockedBy ? '🔒 Niv ' + lockedBy : 'Améliorer') : 'Max'}
      </button>
    </div>
    <div class="open-bar bulk-bar">
      <button class="btn-ghost btn-open-bulk" id="btn-open10" ${(state.keys || 0) >= 1 ? '' : 'disabled'} title="Ouvrir jusqu'à 10 coffres">Ouvrir ×10</button>
      <button class="btn-ghost btn-open-bulk" id="btn-open-max" ${(state.keys || 0) >= 1 ? '' : 'disabled'} title="Ouvrir toutes les clés">Ouvrir Max</button>
    </div>
    ${nextStep ? `<div class="next-step pulse-gold">${nextStep}</div>` : '<div class="next-step-spacer"></div>'}
    <div class="chest-cooldown"><div class="chest-cooldown-fill" id="cooldown-fill"></div></div>
  </div>`;
}

// Affix/mechanic display helpers for the monster preview.
function monsterAffixIcons(monster) {
  if (monster.isBoss) return '';
  const ms = monster.mechanics || [];
  if (!ms.length) return '';
  return ' ' + ms.map(m => m.icon || '✦').join('');
}
function monsterMechLines(monster) {
  const ms = monster.mechanics || [];
  if (!ms.length) return '';
  return `<div class="mob-mech smallcap">${ms.map(m => {
    const tip = AFFIX_TIP[m.type];
    return `${m.icon ? m.icon + ' ' : ''}${m.desc || ''}${tip ? ` <span class="mech-tip">→ ${tip}</span>` : ''}`;
  }).join('<br>')}</div>`;
}

// Loot/key drop preview for the fight dock.
function monsterDropLine(monster) {
  const cap = maxAllowedChestTier(state.prestige?.level || 0);
  const baseTier = Math.max(1, Math.ceil(monster.floor / 8));
  const tier = Math.min(cap, baseTier + (monster.isBoss || monster.isElite ? 1 : 0));
  const tDef = CHEST_TIERS[tier - 1];
  const dropPct = Math.round((monster.dropChance || 0) * 100);
  const keyTxt = monster.isBoss ? '3 🗝' : (monster.isElite ? '1 🗝' : `${Math.round((0.30 + 0.15 * (monster.affixCount || 0)) * 100)}% 🗝`);
  return `<div class="mob-drop smallcap">🎁 ${dropPct}% · T${tier} ${tDef ? tDef.emoji : ''} · ${keyTxt}</div>`;
}

// Sliding 10-floor window over the endless echo region, anchored on the
// player's frontier (deep floors are reached by progressing, not by selecting).
function echoFloorWindow(highest) {
  const winTop = Math.max(FIXED_MAX_FLOOR + 10, highest);
  return { lo: Math.max(FIXED_MAX_FLOOR + 1, winTop - 9), top: winTop };
}

// Endless "Échos" node for floors beyond the fixed biomes (mobile dungeon map).
function echoNodeHTML(cur, highest) {
  if (highest <= FIXED_MAX_FLOOR) return '';
  const unlockedHere = highest > FIXED_MAX_FLOOR;
  const isCurrent = cur > FIXED_MAX_FLOOR;
  const echoBiome = biomeForFloor(Math.max(cur, FIXED_MAX_FLOOR + 1));
  const { lo: winLo, top: winTop } = echoFloorWindow(highest);
  let floors = '';
  for (let f = winLo; f <= winTop; f++) {
    const boss = isBossFloor(f);
    const unlocked = f <= highest;
    const sel = f === cur;
    floors += `<button class="floor${unlocked ? '' : ' locked'}${sel ? ' sel' : ''}${boss ? ' boss' : ''}" data-floor="${f}" ${unlocked ? '' : 'disabled'}>${boss ? '★' : (unlocked ? f : '🔒')}</button>`;
  }
  return `<div class="biome-node${isCurrent ? ' open' : ''}${unlockedHere ? '' : ' dim'}">
    <div class="biome-head">
      <span class="biome-emoji">🌀</span>
      <div class="biome-info"><div class="biome-name display">Échos${isCurrent ? ` · ${echoBiome.name}` : ''}</div><div class="smallcap">Étages ${FIXED_MAX_FLOOR + 1}–∞</div></div>
    </div>
    ${isCurrent ? `<div class="floor-grid">${floors}</div>
      <div class="biome-boss-line"><span class="biome-emoji">${echoBiome.boss.emoji}</span><span>${echoBiome.boss.name}</span><span class="smallcap">${echoBiome.boss.mechanic?.desc || ''}</span></div>` : ''}
  </div>`;
}

// ── ① Dungeon map — vertical biome path ──────────────────────
function screenDungeon() {
  const cur = state.combat.currentFloor;
  const highest = state.combat.highestUnlocked;
  const biomes = BIOMES.map(b => {
    const [lo, hi] = b.floors;
    const realHi = hi > 900 ? Math.max(hi === 9999 ? lo + 9 : hi, highest) : hi;
    const isCurrent = cur >= lo && cur <= realHi;
    const unlockedHere = highest >= lo;
    const floors = [];
    const top = hi > 900 ? lo + 9 : hi;
    for (let f = lo; f <= top; f++) {
      const boss = isBossFloor(f);
      const unlocked = f <= highest;
      const sel = f === cur;
      floors.push(`<button class="floor${unlocked ? '' : ' locked'}${sel ? ' sel' : ''}${boss ? ' boss' : ''}" data-floor="${f}" ${unlocked ? '' : 'disabled'}>
        ${boss ? '★' : (unlocked ? f : '🔒')}</button>`);
    }
    return `<div class="biome-node${isCurrent ? ' open' : ''}${unlockedHere ? '' : ' dim'}">
      <div class="biome-head">
        <span class="biome-emoji">${b.emoji}</span>
        <div class="biome-info"><div class="biome-name display">${b.name}</div><div class="smallcap">Étages ${lo}–${hi > 900 ? '∞' : hi}</div></div>
        ${unlockedHere ? '' : '<span class="biome-lock">🔒</span>'}
      </div>
      ${isCurrent ? `<div class="floor-grid">${floors.join('')}</div>
        <div class="biome-boss-line"><span class="biome-emoji">${b.boss.emoji}</span><span>${b.boss.name}</span><span class="smallcap">${b.boss.mechanic?.desc || ''}</span></div>` : ''}
    </div>`;
  }).join('') + echoNodeHTML(cur, highest);

  const monster = generateMonster(cur);
  const diff = predictDifficulty(monster);
  const beaten = cur < highest;

  return `<div class="dungeon">
    <div class="dungeon-head panel">
      <div class="dh-floor">
        <span class="smallcap">Étage actuel</span>
        <span class="mono dh-floornum">${cur}</span>
      </div>
      <div class="dh-stats smallcap">
        🗡 ${fmt(state.combat.kills)} · 💀 ${fmt(state.combat.deaths)} · 👑 ${fmt(state.combat.bossKills)}
      </div>
    </div>
    <div class="biome-path">${biomes}</div>
    <div class="fight-dock">
      <div class="fight-target">
        <span class="mob-emoji pixel">${monsterSpriteHTML(monster, 44)}</span>
        <div class="ft-info">
          <div class="ft-name">${monster.name}${monster.isBoss ? ' 👑' : ''}${monster.isElite ? ' ⭐' : ''}${monsterAffixIcons(monster)}</div>
          <div class="ft-diff" style="color:${diff.color}">${diff.label}${diff.hpLeftPct != null ? ` <span class="smallcap">· ~${diff.hpLeftPct}% PV restants · ${diff.turnsToKill}t</span>` : ''}</div>
          ${monsterMechLines(monster)}
          ${monsterDropLine(monster)}
        </div>
      </div>
      <button class="btn-gold btn-fight" id="btn-fight">⚔ Combattre</button>
      ${beaten ? `<button class="btn-ghost btn-loop ${state.combat.loopMode ? 'on' : ''}" id="btn-loop" title="Combat en boucle">🔁</button>` : ''}
      ${canDive() ? `<button class="btn-ghost btn-dive" data-dive="start" title="Plongée des Profondeurs (best ${state.dive?.bestDepth || 0})">🌊</button>` : ''}
    </div>
  </div>`;
}

// ── ② Inventory (interim functional — full redesign next) ────
let invSort = 'rarity', invSearch = '', invFilter = 'all';
export function setInvSortMode(m) { invSort = m; renderAll(); }
export function setInvSearchText(t) { invSearch = (t || '').toLowerCase(); renderAll(); }

function filteredInventory() {
  let list = state.inventory.slice();
  if (invSearch) list = list.filter(i => (i.name || '').toLowerCase().includes(invSearch));
  if (invFilter === 'weapon') list = list.filter(i => i.slot === 'weapon');
  else if (invFilter === 'armor') list = list.filter(i => ['helmet', 'armor'].includes(i.slot));
  else if (invFilter === 'access') list = list.filter(i => ['amulet', 'ring'].includes(i.slot));
  else if (invFilter === 'shield') list = list.filter(i => i.slot === 'shield');
  else if (invFilter === 'unequipped') list = list; // all inventory is unequipped by definition
  else if (invFilter === 'locked') list = list.filter(i => i.locked);
  const rIdx = (i) => RARITIES.findIndex(r => r.id === i.rarity);
  list.sort((a, b) => {
    if (invSort === 'rarity') return rIdx(b) - rIdx(a) || itemPowerContribution(b) - itemPowerContribution(a);
    if (invSort === 'value') return (b.goldValue || 0) - (a.goldValue || 0);
    if (invSort === 'tier') return (b.chestTier || 0) - (a.chestTier || 0);
    if (invSort === 'power') return itemPowerContribution(b) - itemPowerContribution(a);
    return 0;
  });
  return list;
}

function screenInventory() {
  const stats = computeStats();
  const power = computePower(stats);
  const paperDoll = SLOTS.map(s => {
    const it = state.equipment[s.id];
    return `<div class="doll-slot${it ? ' filled' : ''}" data-slot-id="${s.id}">
      ${it ? itemTileHTML(it, { px: 40 }) : `<span class="doll-empty">${s.emptyEmoji}</span>`}
      <span class="doll-label smallcap">${s.name}</span>
    </div>`;
  }).join('');
  const sets = computeSetSummary().filter(s => s.count >= 2).map(s =>
    `<span class="chip" style="--c:${s.color}">${s.setName} ${s.count}/${s.totalPieces}</span>`).join('');
  const filters = [
    ['all', `Tout ${state.inventory.length}`], ['weapon', 'Armes'], ['armor', 'Armure'],
    ['access', 'Access.'], ['shield', 'Boucliers'], ['locked', '🔒'],
  ];
  const list = filteredInventory();
  const grid = list.length
    ? list.map(i => itemTileHTML(i, { px: 48 })).join('')
    : '<div class="empty-state"><div class="empty-icon">🎒</div><div>Inventaire vide</div></div>';

  return `<div class="inv">
    <div class="paper-doll panel">
      <div class="pd-head"><span class="display">Équipement</span><span class="mono gold-text">⚡ ${fmt(power)}</span></div>
      <div class="doll-grid">${paperDoll}</div>
      ${sets ? `<div class="doll-sets">${sets}</div>` : ''}
    </div>
    <div class="inv-toolbar">
      <input class="inv-search" id="inv-search" placeholder="🔍 Rechercher…" value="${invSearch}" />
      <select class="inv-sort" id="inv-sort">
        <option value="rarity"${invSort === 'rarity' ? ' selected' : ''}>Rareté</option>
        <option value="power"${invSort === 'power' ? ' selected' : ''}>Puissance</option>
        <option value="value"${invSort === 'value' ? ' selected' : ''}>Valeur</option>
        <option value="tier"${invSort === 'tier' ? ' selected' : ''}>Tier</option>
      </select>
      <button class="btn-ghost" id="btn-auto-equip" title="Auto-équiper le meilleur">⚡</button>
    </div>
    <div class="filter-chips">
      ${filters.map(([id, lbl]) => `<button class="fchip${invFilter === id ? ' active' : ''}" data-filter="${id}">${lbl}</button>`).join('')}
    </div>
    <div class="inv-grid">${grid}</div>
    <div class="inv-bulk">
      <button class="btn-ghost" data-overlay="autosell">⚙ Auto-vente & gestion</button>
    </div>
  </div>`;
}
export function setInvFilter(f) { invFilter = f; renderAll(); }

// ── ② Forge (interim functional) ─────────────────────────────
let forgeSelectedId = null, forgeMode = 'actions';
export function setForgeSelected(id) { forgeSelectedId = id; forgeMode = 'actions'; renderAll(); }
export function getForgeSelectedId() { return forgeSelectedId; }
export function setForgeMode(m) { forgeMode = m; renderAll(); }

function screenForge() {
  const item = state.inventory.find(i => i.id === forgeSelectedId);
  const orbStrip = CURRENCY_TYPES.map(o => {
    const icon = spriteImg(orbSpriteSrc(o.id), o.emoji, { size: 22, title: o.name });
    return `<span class="orb-chip" style="--c:${o.color}" title="${o.name}">${icon}<span class="mono">${state.orbs[o.id] || 0}</span></span>`;
  }).join('');

  let body;
  if (forgeMode === 'exchange') {
    const rows = CURRENCY_EXCHANGE_LADDER.map(id => {
      const next = exchangeNext(id);
      if (!next) return '';
      const from = CURRENCY_BY_ID[id], to = CURRENCY_BY_ID[next];
      const cost = exchangeCost(id);
      const ok = canExchange(id);
      return `<button class="ex-row${ok ? '' : ' disabled'}" data-exchange-from="${id}" ${ok ? '' : 'disabled'}>
        <span class="ex-from" style="--c:${from.color}">${from.emoji} <span class="mono">${state.orbs[id] || 0}</span></span>
        <span class="ex-cost mono">${cost} →</span>
        <span class="ex-to" style="--c:${to.color}">${to.emoji} +1</span>
      </button>`;
    }).join('');
    body = `<div class="forge-exchange">
      <div class="smallcap">Comptoir de change — convertis tes orbes vers le haut</div>
      <div class="ex-list">${rows}</div>
      <button class="btn-ghost" data-forge-action="cancel-exchange">← Retour</button>
    </div>`;
  } else if (!item) {
    const forgeable = state.inventory.slice(0, 60);
    body = `<div class="forge-pick">
      <div class="smallcap">Choisis un objet à forger</div>
      <div class="inv-grid">${forgeable.length ? forgeable.map(i => itemTileHTML(i, { px: 44 })).join('') : '<div class="empty-state"><div class="empty-icon">⚒</div><div>Aucun objet</div></div>'}</div>
    </div>`;
  } else if (forgeMode === 'master-craft') {
    const affixes = availableMasterCraftAffixes(item);
    body = `<div class="forge-master">
      <div class="smallcap">Maître Forgeron — choisis un affixe</div>
      ${affixes.map(a => `<button class="mc-row" data-affix-id="${a.id}">${affixTypeBadge({ type: a.type })} ${a.label}</button>`).join('')}
      <button class="btn-ghost" data-forge-action="cancel-master">Annuler</button>
    </div>`;
  } else {
    const actions = FORGE_ACTIONS.map(a => {
      const ok = a.can(item);
      const orb = a.orb ? CURRENCY_BY_ID[a.orb] : null;
      const have = orb ? (state.orbs[a.orb] || 0) : 0;
      return `<button class="forge-act${ok ? '' : ' disabled'}" data-forge-action="${a.id}" ${ok ? '' : 'disabled'} title="${a.desc || ''}">
        <span class="fa-orb">${orb ? orb.emoji : (a.shards ? '💎' : '')}</span>
        <span class="fa-label">${a.label}</span>
        <span class="fa-cost mono">${orb ? have : (a.shards || '')}</span>
      </button>`;
    }).join('');
    const r = RARITY_BY_ID[item.rarity];
    const affixList = (item.affixes || []).map((a, i) => {
      const lockable = canToggleAffixLock(item, i);
      return `<div class="forge-affix${a.locked ? ' locked' : ''}">
        ${affixTypeBadge(a)}<span class="fa-name">${a.label}</span>
        <span class="fa-val mono">+${a.value}${a.percent ? '%' : ''}</span>
        <button class="affix-lock${a.locked ? ' on' : ''}" data-lock-index="${i}" ${lockable ? '' : 'disabled'} title="${a.locked ? 'Déverrouiller' : 'Verrouiller (préservé au reroll)'}">${a.locked ? '🔒' : '🔓'}</button>
      </div>`;
    }).join('');
    body = `<div class="forge-work">
      <div class="forge-slot rar-glow-${r.cssClass} pixel">${itemVisualHTML(item, 84)}</div>
      <div class="forge-item-name display rt-${r.cssClass}">${item.name}</div>
      <div class="forge-item-sub smallcap">T${item.chestTier} · ${SLOT_BY_ID[item.slot].name} · ${r.name}</div>
      ${compChips(item) ? `<div class="detail-chips">${compChips(item)}</div>` : ''}
      <div class="forge-detail">${statBars(item)}</div>
      ${affixList ? `<div class="forge-affixes">${affixList}</div>` : ''}
      <div class="forge-actions">${actions}</div>
      <button class="btn-ghost" id="forge-deselect">← Changer d'objet</button>
    </div>`;
  }
  const exchangeBtn = forgeMode === 'exchange' ? '' : '<button class="btn-ghost ex-open" data-forge-mode="exchange">🔄 Comptoir</button>';
  const guideBtn = '<button class="btn-ghost ex-open" data-overlay="forgeGuide" title="Guide complet de la forge">📖 Guide</button>';
  return `<div class="forge">
    <div class="orb-strip panel">${orbStrip}${exchangeBtn}${guideBtn}</div>
    ${body}
  </div>`;
}

// ── ④ Meta hub (links to talents/skills/stats/codex/ascension) ─
function screenMeta() {
  const stats = computeStats();
  const power = computePower(stats);
  const ap = getAchievementProgress();
  const tp = state.talentPoints || 0;
  const skills = getActiveSkills().length;
  const cards = [
    { ov: 'stats', icon: '⚡', name: 'Statistiques', sub: `Puissance ${fmt(power)}` },
    { ov: 'talents', icon: '🌳', name: 'Talents', sub: tp ? `${tp} point${tp > 1 ? 's' : ''} dispo` : 'Arbre de talents' },
    { ov: 'skills', icon: '📜', name: 'Compétences', sub: `${skills}/${SKILLS.length} actives` },
    { ov: 'abilities', icon: '✦', name: 'Capacités', sub: `${getLoadout().length}/${abilitySlots()} équipées` },
    { ov: 'affinities', icon: '🜂', name: 'Affinités', sub: affinitiesSub() },
    { ov: 'story', icon: '📜', name: 'Chronique', sub: Story.storyReady() ? '◈ Chapitre à accomplir !' : (Story.activeChapter()?.title || 'Histoire'), ready: Story.storyReady() },
    { ov: 'contracts', icon: '📋', name: 'Contrats', sub: `${(state.bounties?.active || []).length} actifs` },
    { ov: 'codex', icon: '📖', name: 'Codex', sub: 'Découvertes' },
    { ov: 'achievements', icon: '🏆', name: 'Succès', sub: `${ap.unlocked}/${ap.total}` },
  ];
  const ascReady = canAscend();
  const reqs = ascensionRequirements();
  return `<div class="meta">
    <div class="meta-hero panel">
      <div class="meta-hero-sprite pixel">${composeCharacterWithGearSVG(state.equipment, 120)}</div>
      <div class="meta-hero-info">
        <div class="display">Héros</div>
        <div class="mono gold-text">⚡ ${fmt(power)}</div>
        ${state.prestige?.level ? `<div class="smallcap">Prestige Niv ${state.prestige.level}</div>` : ''}
      </div>
    </div>
    <div class="meta-grid">
      ${cards.map(c => `<button class="meta-card panel${c.ready ? ' pulse-gold' : ''}" data-overlay="${c.ov}">
        <span class="mc-icon">${c.icon}</span>
        <span class="mc-name">${c.name}</span>
        <span class="mc-sub smallcap">${c.sub}</span></button>`).join('')}
    </div>
    <button class="btn-gold meta-ascend ${ascReady ? 'pulse-gold' : 'is-disabled'}" data-overlay="ascension">
      🌟 ${ascReady ? 'Ascension' : `Ascension — T${reqs.minChestTier} + étage ${reqs.minFloor}`}
    </button>
  </div>`;
}

// ═════════════════════════════════════════════════════════════
// ⑤ DESKTOP LAYOUTS — rail + multi-column (info visible without clicks)
// ═════════════════════════════════════════════════════════════
let invSelectedId = null;
export function selectInvItem(id) { invSelectedId = id; renderAll(); }
export function getInvSelectedId() { return invSelectedId; }

const DESKTOP_SCREENS = {
  hub: dtHub,
  dungeon: dtDungeon,
  inventory: dtInventory,
};

// ⑮ Hub desktop — center chest · right info panel
function dtHub() {
  const tier = getCurrentTier();
  const stats = computeStats();
  const power = computePower(stats);
  const pityMax = Math.max(1, PITY_THRESHOLD - pityReduction());
  const pity = Math.min(pityMax, state.pity?.sinceLegendary || 0);
  const ancPity = Math.min(PITY_ANCESTRAL_THRESHOLD, state.pity?.sinceAncestral || 0);
  const uniPity = Math.min(PITY_UNIQUE_THRESHOLD, state.pity?.sinceUnique || 0);
  const focusOrbs = state.orbs?.focus || 0;
  const weights = tier.weights;
  const rows = RARITIES.filter(r => (weights[r.id] || 0) > 0).map(r =>
    `<div class="dt-droprow"><span class="rt-${r.cssClass}">${r.name}</span><div class="dt-droptrack"><i style="width:${weights[r.id]}%;background:${r.color}"></i></div><span class="mono">${weights[r.id]}%</span></div>`).join('');
  const next = getNextTier();
  const canUp = canUpgrade();
  const enoughKeys = (state.keys || 0) > 0;
  return `<div class="dt-cols hub-dt">
    <div class="dt-stage">
      <div class="stage-tier smallcap gold-text">Tier ${tier.tier} · ${tier.name}</div>
      <div class="stage-title display">Coffre ${tier.name}</div>
      <div class="chest-hero${enoughKeys ? ' has-key' : ''}"><div class="chest-sprite pixel" id="chest-sprite">${spriteImg(chestSpriteSrc(tier.tier, { hires: true }), chestSpriteSVG(tier.tier, 220), { size: 220, title: tier.name })}</div></div>
      <div class="open-bar">
        <button class="btn-key" data-nav="dungeon"><span class="cur-glyph">🗝</span><span class="mono">${fmt(state.keys)}</span></button>
        <button class="btn-gold btn-open ${enoughKeys ? '' : 'is-disabled'}" id="btn-open"><span class="open-ico">⬢</span> Ouvrir <span class="open-cost">· 1 clé</span></button>
      </div>
      <div class="open-bar bulk-bar">
        <button class="btn-ghost btn-open-bulk" id="btn-open10" ${enoughKeys ? '' : 'disabled'} title="Ouvrir jusqu'à 10 coffres">Ouvrir ×10</button>
        <button class="btn-ghost btn-open-bulk" id="btn-open-max" ${enoughKeys ? '' : 'disabled'} title="Ouvrir toutes les clés">Ouvrir Max</button>
      </div>
      <div class="chest-cooldown"><div class="chest-cooldown-fill" id="cooldown-fill"></div></div>
    </div>
    <aside class="dt-panel">
      <div class="dt-card panel"><div class="smallcap">Puissance</div><div class="mono power-val gold-text">${fmt(power)}</div></div>
      <div class="dt-card panel"><div class="smallcap">Taux de butin</div>${rows}</div>
      <div class="dt-card panel"><div class="smallcap">Pity légendaire</div>
        <div class="pity-row"><div class="pity-bar"><div class="pity-fill" style="width:${(pity / pityMax) * 100}%"></div></div><span class="mono">${pity}/${pityMax}</span></div>
        <div class="pity-sub smallcap" title="Garanties anti-malchance">
          <span style="color:${RARITY_BY_ID.ancestral.color}">Ancestral ${ancPity}/${PITY_ANCESTRAL_THRESHOLD}</span>
          · <span style="color:${RARITY_BY_ID.legendary.color}">Unique ${uniPity}/${PITY_UNIQUE_THRESHOLD}</span>
        </div></div>
      <div class="dt-card panel"><div class="smallcap">🎯 Focalisation · ${fmt(focusOrbs)} orbe${focusOrbs > 1 ? 's' : ''}</div>
        <div class="focus-row">
          ${SLOTS.map(s => `<button class="focus-chip${state.focusSlot === s.id ? ' active' : ''}" data-focus-slot="${s.id}" title="${s.name}" ${(focusOrbs > 0 || state.focusSlot === s.id) ? '' : 'disabled'}>${s.emptyEmoji}</button>`).join('')}
        </div></div>
      <button class="btn-ghost btn-upgrade ${canUp ? 'ready' : ''}" id="btn-upgrade" ${next && canUp ? '' : 'disabled'}>
        ⬆ ${next ? `${next.name} · ${fmt(next.upgradeCost)} 💰` : 'Tier max'}</button>
    </aside>
  </div>`;
}

// ⑱ Dungeon desktop — biome list · floor detail · monster preview
function dtDungeon() {
  const cur = state.combat.currentFloor;
  const highest = state.combat.highestUnlocked;
  const monster = generateMonster(cur);
  const diff = predictDifficulty(monster);
  const biome = biomeForFloor(cur);
  const beaten = cur < highest;
  const inEcho = cur > FIXED_MAX_FLOOR;
  let biomeList = BIOMES.map(b => {
    const [lo, hi] = b.floors;
    const unlocked = highest >= lo;
    const active = !inEcho && cur >= lo && cur <= hi;
    return `<button class="dt-biome${active ? ' active' : ''}${unlocked ? '' : ' locked'}" data-floor="${unlocked ? Math.max(lo, Math.min(highest, hi)) : lo}" ${unlocked ? '' : 'disabled'}>
      <span class="biome-emoji">${b.emoji}</span><div><div class="biome-name">${b.name}</div><div class="smallcap">${lo}–${hi}</div></div>${unlocked ? '' : '<span class="biome-lock">🔒</span>'}</button>`;
  }).join('');
  if (highest > FIXED_MAX_FLOOR) {
    const win = echoFloorWindow(highest);
    biomeList += `<button class="dt-biome${inEcho ? ' active' : ''}" data-floor="${Math.min(highest, win.top)}">
      <span class="biome-emoji">🌀</span><div><div class="biome-name">Échos</div><div class="smallcap">${FIXED_MAX_FLOOR + 1}–∞</div></div></button>`;
  }
  const range = inEcho ? echoFloorWindow(highest) : { lo: biome.floors[0], top: biome.floors[1] };
  const floors = [];
  for (let f = range.lo; f <= range.top; f++) {
    const boss = isBossFloor(f), unlocked = f <= highest, sel = f === cur;
    floors.push(`<button class="floor${unlocked ? '' : ' locked'}${sel ? ' sel' : ''}${boss ? ' boss' : ''}" data-floor="${f}" ${unlocked ? '' : 'disabled'}>${boss ? '★' : (unlocked ? f : '🔒')}</button>`);
  }
  return `<div class="dt-cols dungeon-dt">
    <aside class="dt-panel dt-biomelist">${biomeList}</aside>
    <div class="dt-floordetail">
      <div class="dh-floor"><span class="smallcap">${biome.emoji} ${biome.name} · Étage</span><span class="mono dh-floornum">${cur}</span></div>
      <div class="floor-grid">${floors.join('')}</div>
      <div class="dh-stats smallcap">🗡 ${fmt(state.combat.kills)} · 💀 ${fmt(state.combat.deaths)} · 👑 ${fmt(state.combat.bossKills)}</div>
      <div class="fight-dock">
        <button class="btn-gold btn-fight" id="btn-fight">⚔ Combattre</button>
        ${beaten ? `<button class="btn-ghost btn-loop ${state.combat.loopMode ? 'on' : ''}" id="btn-loop">🔁 Boucle</button>` : ''}
        ${canDive() ? `<button class="btn-ghost btn-dive" data-dive="start" title="best ${state.dive?.bestDepth || 0}">🌊 Plongée</button>` : ''}
      </div>
    </div>
    <aside class="dt-panel">
      <div class="dt-card panel mob-preview">
        <div class="mob-sprite-lg pixel">${monsterSpriteHTML(monster, 96)}</div>
        <div class="ft-name">${monster.name}${monster.isBoss ? ' 👑' : ''}${monster.isElite ? ' ⭐' : ''}${monsterAffixIcons(monster)}</div>
        <div class="ft-diff" style="color:${diff.color}">${diff.label}${diff.hpLeftPct != null ? ` <span class="smallcap">· ~${diff.hpLeftPct}% PV · ${diff.turnsToKill}t</span>` : ''}</div>
        <div class="mob-stats smallcap">❤ ${fmt(monster.hp)} · ⚔ ${fmt(monster.damage)} · 🛡 ${fmt(monster.armor)}</div>
        ${monsterMechLines(monster)}
        ${monsterDropLine(monster)}
      </div>
    </aside>
  </div>`;
}

// ⑰ Inventory desktop — paper-doll+stats · 8-col grid · item detail (no click needed)
function dtInventory() {
  const stats = computeStats();
  const power = computePower(stats);
  const paperDoll = SLOTS.map(s => {
    const it = state.equipment[s.id];
    return `<div class="doll-slot${it ? ' filled' : ''}" data-slot-id="${s.id}">
      ${it ? itemTileHTML(it, { px: 40 }) : `<span class="doll-empty">${s.emptyEmoji}</span>`}<span class="doll-label smallcap">${s.name}</span></div>`;
  }).join('');
  const sets = computeSetSummary().filter(s => s.count >= 2).map(s => `<span class="chip" style="--c:${s.color}">${s.setName} ${s.count}/${s.totalPieces}</span>`).join('');
  const statLines = Object.entries(stats).filter(([, v]) => v).map(([k, v]) =>
    `<div class="dt-statline"><span>${STAT_ICON[k] || ''} ${statLabel(k)}</span><span class="mono">${v}${PCT_STATS.has(k) ? '%' : ''}</span></div>`).join('');
  const list = filteredInventory();
  if (invSelectedId && !list.some(i => i.id === invSelectedId) && !state.equipment[SLOT_BY_ID[invSelectedId] ? '' : '']) { /* keep selection if equipped */ }
  const selected = findAnyItem(invSelectedId) || list[0];
  const filters = [['all', `Tout ${state.inventory.length}`], ['weapon', 'Armes'], ['armor', 'Armure'], ['access', 'Access.'], ['shield', 'Boucliers'], ['locked', '🔒']];
  const grid = list.length ? list.map(i => itemTileHTML(i, { px: 52 })).join('') : '<div class="empty-state"><div class="empty-icon">🎒</div><div>Inventaire vide</div></div>';
  return `<div class="dt-cols inv-dt">
    <aside class="dt-panel">
      <div class="dt-card panel"><div class="pd-head"><span class="display">Équipement</span><span class="mono gold-text">⚡ ${fmt(power)}</span></div>
        <div class="doll-grid">${paperDoll}</div>${sets ? `<div class="doll-sets">${sets}</div>` : ''}</div>
      <div class="dt-card panel"><div class="smallcap">Statistiques</div>${statLines}</div>
    </aside>
    <div class="dt-invmain">
      <div class="inv-toolbar">
        <input class="inv-search" id="inv-search" placeholder="🔍 Rechercher…" value="${invSearch}" />
        <select class="inv-sort" id="inv-sort">
          <option value="rarity"${invSort === 'rarity' ? ' selected' : ''}>Rareté</option>
          <option value="power"${invSort === 'power' ? ' selected' : ''}>Puissance</option>
          <option value="value"${invSort === 'value' ? ' selected' : ''}>Valeur</option>
          <option value="tier"${invSort === 'tier' ? ' selected' : ''}>Tier</option>
        </select>
        <button class="btn-ghost" id="btn-auto-equip">⚡ Auto</button>
      </div>
      <div class="filter-chips">${filters.map(([id, lbl]) => `<button class="fchip${invFilter === id ? ' active' : ''}" data-filter="${id}">${lbl}</button>`).join('')}</div>
      <div class="inv-grid dt-grid">${grid}</div>
      <div class="inv-bulk"><button class="btn-ghost" data-overlay="autosell">⚙ Auto-vente & gestion</button></div>
    </div>
    <aside class="dt-panel dt-detail">
      ${selected ? detailBody(selected) : '<div class="empty-state"><div class="empty-icon">🗡</div><div>Sélectionne un objet</div></div>'}
    </aside>
  </div>`;
}

// ═════════════════════════════════════════════════════════════
// OVERLAYS
// ═════════════════════════════════════════════════════════════
// Track what's currently painted so we can skip redundant innerHTML writes
// when notify() fires for unrelated state changes (village tick, bounty
// progress, etc.). Re-painting the same overlay restarts CSS animations
// and destroys the live button between touchstart and touchend on mobile,
// causing taps to be lost.
let _renderedOverlay = null;        // name currently in the DOM
let _renderedParamsKey = '';        // params signature for that paint

function paramsKey(p) {
  try { return JSON.stringify(p || {}); } catch { return ''; }
}

// Overlays that should be refreshed in place when their underlying state
// changes (their content depends on inventory/stats/etc, so a re-render
// is desirable). Excluded by default = the "static" overlays (intro,
// help, forgeGuide, settings, menu, onboarding, ascension/relicChoice)
// where DOM thrash actively breaks taps and animations.
const STATIC_OVERLAYS = new Set([
  'help', 'forgeGuide', 'settings', 'menu', 'onboarding', 'intro',
  'ascension', 'relicChoice', 'diveBoon', 'diveSummary', 'story',
  'mimic',  // mimic is driven explicitly by refreshMimic()
  'bulkResult',
]);

export function refreshOverlay() {
  // Force a re-render of the current overlay (used by mimic step transitions etc.)
  _renderedOverlay = null;
  renderOverlay();
}

function renderOverlay() {
  if (!overlayEl) return;
  if (!nav.overlay) {
    if (_renderedOverlay !== null) {
      overlayEl.innerHTML = '';
      overlayEl.classList.remove('on');
      _renderedOverlay = null;
      _renderedParamsKey = '';
    }
    return;
  }
  // Never clobber a live combat overlay mid-animation (its monster + HP bars
  // are mutated directly by the fight loop; a re-render would reset them).
  if (nav.overlay === 'combat' && overlayEl.querySelector('.combat')) return;
  const pKey = paramsKey(nav.params);
  // Static overlays : only render on identity change. Notifications from
  // background ticks must not destroy the DOM under the user's finger.
  if (STATIC_OVERLAYS.has(nav.overlay)
      && _renderedOverlay === nav.overlay
      && _renderedParamsKey === pKey) {
    return;
  }
  // Other overlays : refresh in place (their content depends on live state).
  // Skip only if absolutely nothing changed.
  if (_renderedOverlay === nav.overlay && _renderedParamsKey === pKey) {
    // Same overlay, same params — still re-render to reflect state changes.
    // (Inventory item detail, contracts, codex etc. need fresh stats.)
  }
  overlayEl.classList.add('on');
  const fn = OVERLAYS[nav.overlay];
  overlayEl.innerHTML = fn ? fn(nav.params) : '';
  _renderedOverlay = nav.overlay;
  _renderedParamsKey = pKey;
}
const OVERLAYS = {
  combat: ovCombat,
  loot: ovLoot,
  mimic: ovMimic,
  item: ovItemDetail,
  stats: ovStats,
  talents: ovTalents,
  skills: ovSkills,
  abilities: ovAbilities,
  affinities: ovAffinities,
  diveBoon: ovDiveBoon,
  diveSummary: ovDiveSummary,
  villageBuilding: ovVillageBuilding,
  intro: ovIntro,
  story: ovStory,
  contracts: ovContracts,
  codex: ovCodex,
  achievements: ovAchievements,
  ascension: ovAscension,
  relicChoice: ovRelicChoice,
  onboarding: ovOnboarding,
  settings: ovSettings,
  help: ovHelp,
  forgeGuide: ovForgeGuide,
  menu: ovMenu,
  autosell: ovAutosell,
  bulkResult: ovBulkResult,
};

function overlayShell(title, inner, { wide = false, dark = false } = {}) {
  return `<div class="overlay-backdrop" data-close-overlay="1"></div>
    <div class="sheet${wide ? ' wide' : ''}${dark ? ' dark' : ''}">
      <div class="sheet-head"><span class="display">${title}</span><button class="sheet-close" data-close-overlay="1">✕</button></div>
      <div class="sheet-body scroll">${inner}</div>
    </div>`;
}

// ── ① Combat (cinematic) ─────────────────────────────────────
function ovCombat() {
  const cur = state.combat.currentFloor;
  const monster = nav.params.monster || generateMonster(cur);
  const biome = biomeForFloor(cur);
  const stats = computeStats();
  const playerMax = Math.round(100 + (stats.vitality || 0));
  const monsterTags = [
    monster.isBoss ? '<span class="cf-tag boss">👑 BOSS</span>' : '',
    monster.isElite ? '<span class="cf-tag elite">⭐ ÉLITE</span>' : '',
    `<span class="cf-tag biome">${biome.emoji} ${biome.name}</span>`,
  ].filter(Boolean).join('');
  const heroTags = [
    `<span class="cf-tag dmg">⚔ ${Math.round(stats.damage || 0)}</span>`,
    `<span class="cf-tag def">🛡 ${Math.round(stats.armor || 0)}</span>`,
  ].join('');
  return `<div class="combat rpg" style="--biome:${biome.bgGradient}">
    <div class="combat-stage">
      <!-- Monstre haut-droite façon Pokémon -->
      <div class="cf-card mob">
        <div class="cf-head">
          <div class="cf-name">${monster.name}${monster.isBoss ? ' 👑' : ''}${monster.isElite ? ' ⭐' : ''}</div>
          <div class="cf-tags">${monsterTags}</div>
        </div>
        ${hpBar(monster.hp, monster.hp, { color: 'var(--r-ancestral)', id: 'combat-mob-hp' })}
      </div>
      <div class="mob-sprite pixel" id="combat-mob-sprite">${monsterSpriteHTML(monster, 120)}</div>

      <!-- Action callout central : flash CRIT/DODGE/BLOC etc. -->
      <div class="combat-call" id="combat-call"></div>

      <!-- Hero bas-gauche -->
      <div class="hero-sprite pixel" id="combat-hero-sprite">${composeCharacterWithGearSVG(state.equipment, 120)}</div>
      <div class="cf-card hero">
        <div class="cf-head">
          <div class="cf-name">⚔ Héros</div>
          <div class="cf-tags">${heroTags}</div>
        </div>
        ${hpBar(playerMax, playerMax, { color: 'var(--r-poison)', id: 'combat-hero-hp' })}
        <div class="cf-turn smallcap"><span id="combat-turn">Tour 1</span> · <span class="cf-floor">${biome.emoji} Étage ${cur}</span></div>
      </div>
    </div>

    <!-- Dialog box façon Pokémon en bas, avec messages typewriter -->
    <div class="combat-dialog" id="combat-dialog">
      <div class="combat-dialog-text" id="combat-dialog-text">Le combat commence…</div>
    </div>

    <!-- Menu d'actions décoratif (auto/rush/defensive/skip) -->
    <div class="combat-actions">
      <button class="combat-act" data-combat-act="speed" id="btn-combat-speed" title="Accélère le combat">⏩ Vitesse</button>
      <button class="combat-act" data-combat-act="skip" id="btn-combat-skip" title="Saute à la fin">⏭ Skip</button>
    </div>
  </div>`;
}

// ── ① Loot reveal ────────────────────────────────────────────
let currentDrop = null;
export function getCurrentDrop() { return currentDrop; }
export function showDropPopup(item) { currentDrop = item; navOverlay('loot', {}); }
export function hideDropPopup() { currentDrop = null; if (nav.overlay === 'loot') closeOverlay(); }

// ── Sprite helper: picks PNG when present, falls back to boss SVG / emoji ──
function monsterSpriteHTML(monster, size) {
  if (monster.isBoss) {
    const fallback = hasBossSprite(monster.name) ? bossSpriteSVG(monster.name, size) : `<span style="font-size:${Math.round(size * 0.8)}px">${monster.emoji}</span>`;
    return spriteImg(bossSpriteSrcByName(monster.name, { hires: true }), fallback, { size, title: monster.name });
  }
  const png = monsterSpriteSrc(monster.name, { hires: true });
  const fallback = `<span style="font-size:${Math.round(size * 0.8)}px">${monster.emoji}</span>`;
  if (png) return spriteImg(png, fallback, { size, title: monster.name });
  return fallback;
}

// ── Mimic encounter ──────────────────────────────────────────
let currentMimic = null;
export function getCurrentMimic() { return currentMimic; }
export function showMimicEncounter(enc) { currentMimic = enc; navOverlay('mimic', {}); }
export function refreshMimic() { if (nav.overlay === 'mimic') refreshOverlay(); }
export function hideMimicEncounter() { currentMimic = null; if (nav.overlay === 'mimic') closeOverlay(); }

function ovMimic() {
  const enc = currentMimic;
  if (!enc) return overlayShell('Mimic', '');
  const rungs = MIMIC.ladder.map((r, i) => {
    const reached = (i + 1) <= enc.rung;
    const cur = (i + 1) === enc.rung;
    return `<div class="mimic-rung${reached ? ' reached' : ''}${cur ? ' current' : ''}">
      <div class="rung-label">${r.label}</div>
      <div class="rung-gold">×${r.goldMult}</div>
    </div>`;
  }).join('');
  let flavor = '', haul = '', actions = '';
  if (enc.state === 'choosing') {
    flavor = enc.rung === 0
      ? 'Le coffre… grogne. Tu peux fuir ou tenter ta chance.'
      : (MIMIC.ladder[enc.rung - 1]?.flavor || '');
    const nextRung = MIMIC.ladder[enc.rung];
    const biteP = nextRung ? MIMIC.biteCurve[enc.rung] : 1;
    const biteHint = nextRung ? `${Math.round(biteP * 100)}% morsure` : 'sommet atteint';
    haul = enc.rung > 0
      ? `<div>Verrouillé : <b>${MIMIC.ladder[enc.rung - 1].label}</b> (×${MIMIC.ladder[enc.rung - 1].goldMult} or, +${MIMIC.ladder[enc.rung - 1].orbBonus} orbes)</div>
         <div class="mimic-hint">Tenter le palier suivant : ${biteHint}</div>`
      : `<div>Aucun butin pour le moment.</div>
         <div class="mimic-hint">Tenter le 1er palier : ${biteHint}</div>`;
    const riskDisabled = nextRung ? '' : 'disabled';
    const takeLabel = enc.rung > 0 ? 'Prendre & partir' : 'S\'enfuir';
    actions = `<button class="btn btn-gold" data-mimic-action="take">${takeLabel}</button>
               <button class="btn btn-primary" data-mimic-action="risk" ${riskDisabled}>${nextRung ? `Risquer (${nextRung.label})` : 'Au sommet'}</button>`;
  } else if (enc.state === 'won') {
    const rung = MIMIC.ladder[enc.rung - 1];
    flavor = `🎉 ${rung.label} verrouillé !`;
    haul = `<div class="mimic-win-gold">+${enc.reward.gold.toLocaleString('fr-FR')} 💰</div>
            <div class="mimic-win-meta">+${enc.reward.orbs.length} orbe${enc.reward.orbs.length > 1 ? 's' : ''} · objet ${enc.reward.item.rarity}</div>`;
    actions = `<button class="btn btn-primary" data-mimic-action="close">Continuer</button>`;
  } else if (enc.state === 'bitten') {
    flavor = '💀 Le mimic claque la mâchoire…';
    haul = `<div class="mimic-bite">${enc.lastBite.label} — ${enc.lastBite.desc}</div>` +
      (enc.goldLost ? `<div class="mimic-loss">-${enc.goldLost.toLocaleString('fr-FR')} 💰</div>` : '');
    actions = `<button class="btn btn-primary" data-mimic-action="close">Continuer</button>`;
  }
  const goldenCls = enc.golden ? ' golden' : '';
  const banner = enc.golden ? '✨ MIMIC DORÉ ! ✨' : '⚠ UN MIMIC !';
  const sprite = spriteImg(mimicSpriteSrc({ golden: enc.golden, hires: true }), enc.golden ? '🟡🦷' : '🟫🦷', { size: 128, title: 'Mimic' });
  return `<div class="overlay-backdrop"></div>
    <div class="sheet mimic-sheet${goldenCls}">
      <div class="mimic-banner${goldenCls}">${banner}</div>
      <div class="mimic-stage">
        <div class="mimic-sprite pixel">${sprite}</div>
        <div class="mimic-flavor">${flavor}</div>
      </div>
      <div class="mimic-ladder">${rungs}</div>
      <div class="mimic-haul">${haul}</div>
      <div class="mimic-actions">${actions}</div>
    </div>`;
}

// ── Bulk open recap ──────────────────────────────────────────
let bulkSummary = null;
export function showBulkResult(summary) { bulkSummary = summary; navOverlay('bulkResult', {}); }

function ovBulkResult() {
  const s = bulkSummary;
  if (!s) return '';
  const rarityRows = RARITIES.filter(r => (s.byRarity[r.id] || 0) > 0).map(r =>
    `<div class="bulk-rar"><span class="rarity-tag rt-${r.cssClass}">${r.name}</span><span class="mono">×${s.byRarity[r.id]}</span></div>`).join('');
  const notable = s.notable.slice(0, 12).map(it => {
    const r = RARITY_BY_ID[it.rarity];
    const tag = it.uniqueId ? ' ✦UNIQUE' : it.setId ? ' ⬡SET' : '';
    return `<div class="bulk-notable rt-${r.cssClass}" style="color:${r.color}">${it.emoji || '◆'} ${it.name}${tag}</div>`;
  }).join('');
  const orbBits = Object.entries(s.orbs).map(([oid, q]) => {
    const o = CURRENCY_BY_ID[oid]; return o ? `${o.emoji} ×${q}` : '';
  }).filter(Boolean).join(' · ');
  const totals = [];
  if (s.gold > 0) totals.push(`💰 +${fmt(s.gold)}`);
  if (s.shards > 0) totals.push(`💎 +${fmt(s.shards)}`);
  if (s.kept > 0) totals.push(`🎒 ${fmt(s.kept)} gardé${s.kept > 1 ? 's' : ''}`);
  const inner = `
    <div class="bulk-head smallcap">${fmt(s.opened)} coffre${s.opened > 1 ? 's' : ''} ouvert${s.opened > 1 ? 's' : ''} · ${fmt(s.total)} objet${s.total > 1 ? 's' : ''}</div>
    <div class="bulk-rars">${rarityRows || '<span class="smallcap">Aucun objet</span>'}</div>
    ${totals.length ? `<div class="bulk-totals">${totals.join(' &nbsp; ')}</div>` : ''}
    ${orbBits ? `<div class="bulk-orbs smallcap">Orbes : ${orbBits}</div>` : ''}
    ${notable ? `<div class="bulk-notables"><div class="smallcap">Trouvailles notables</div>${notable}</div>` : ''}
    <button class="btn-gold" data-close-overlay="1" style="margin-top:12px;width:100%">Continuer</button>`;
  return overlayShell('📦 Butin en masse', inner);
}

function ovLoot() {
  const item = currentDrop;
  if (!item) return '';
  const r = RARITY_BY_ID[item.rarity];
  const stats = itemTotalStats(item);
  const chips = Object.entries(stats).slice(0, 6).map(([k, v]) =>
    `<span class="chip"><span class="chip-ico">${STAT_ICON[k] || '◆'}</span>${v > 0 ? '+' : ''}${v}${PCT_STATS.has(k) ? '%' : ''}</span>`).join('');
  // Ray intensity scales with rarity (commons get a faint shimmer, ancestrals blaze).
  const rayTier = { common: 0, magic: 1, rare: 2, epic: 3, legendary: 4, ancestral: 5 }[item.rarity] || 0;
  return `<div class="loot rar-${r.cssClass}" style="--rc:${r.color}" data-ray="${rayTier}">
    <div class="loot-rays"></div>
    <div class="loot-rays fine"></div>
    <div class="loot-bloom"></div>
    <div class="loot-stamp display" style="color:${r.color}">${r.name.toUpperCase()}</div>
    <div class="loot-art rar-glow-${r.cssClass} pixel">${itemVisualHTML(item, 128)}</div>
    <div class="loot-name display rt-${r.cssClass}">${item.name}</div>
    <div class="loot-sub smallcap">T${item.chestTier} · ${SLOT_BY_ID[item.slot].name}</div>
    <div class="loot-chips">${chips}</div>
    ${item.legendaryEffect && LEGENDARY_EFFECTS[item.legendaryEffect.id] ? `<div class="loot-effect"><span class="le-title">✦ ${LEGENDARY_EFFECTS[item.legendaryEffect.id].name}</span><span class="le-desc">${LEGENDARY_EFFECTS[item.legendaryEffect.id].desc}</span></div>` : ''}
    <div class="loot-actions">
      <button class="btn-gold" id="btn-equip">Équiper</button>
      <button class="btn-ghost" id="btn-keep">Garder</button>
      <button class="btn-ghost" id="btn-sell">Vendre · ${fmt(item.goldValue)} 💰</button>
    </div>
  </div>`;
}

// Composition chips: material 🔩 / element ✨ / faction 🏷 / legendary effect ✦.
function compChips(item) {
  const chips = [];
  if (item.material) { const m = MATERIALS[item.material.id]; if (m) chips.push(`<span class="comp-chip" style="--c:${m.tintColor}">${m.icon || '🔩'} ${m.name}</span>`); }
  if (item.element && item.element.id !== 'none') { const e = ELEMENTS[item.element.id]; if (e) chips.push(`<span class="comp-chip" style="--c:${e.glowColor}">${e.icon || '✨'} ${e.name}</span>`); }
  if (item.faction && item.faction.id && item.faction.id !== 'none') { const f = FACTIONS[item.faction.id]; chips.push(`<span class="comp-chip" style="--c:var(--ink-300)">🏷 ${f?.name || item.faction.name}</span>`); }
  if (item.legendaryEffect) chips.push(`<span class="comp-chip" style="--c:var(--r-legendary)">✦ ${item.legendaryEffect.name}</span>`);
  return chips.join('');
}
// Horizontal stat bars, scaled to the largest stat on the item.
function statBars(item) {
  const total = itemTotalStats(item);
  const entries = Object.entries(total).filter(([, v]) => v);
  if (!entries.length) return '';
  const max = Math.max(...entries.map(([, v]) => Math.abs(v)));
  return entries.map(([k, v]) => `<div class="sb-row">
    <span class="sb-label">${STAT_ICON[k] || '◆'} ${statLabel(k)}</span>
    <div class="sb-track"><i style="width:${Math.max(6, (Math.abs(v) / max) * 100)}%"></i></div>
    <span class="sb-val mono">${v > 0 ? '+' : ''}${v}${PCT_STATS.has(k) ? '%' : ''}</span>
  </div>`).join('');
}

// Shared item-detail body (used by the mobile sheet + the desktop inv panel).
function detailBody(item) {
  const equipped = !!Object.values(state.equipment).find(i => i && i.id === item.id);
  const r = RARITY_BY_ID[item.rarity];
  const slot = SLOT_BY_ID[item.slot];
  const power = Math.round(itemPowerContribution(item));
  const cur = state.equipment[item.slot];
  let delta = null;
  if (cur && cur.id !== item.id) delta = power - Math.round(itemPowerContribution(cur));
  const eff = item.legendaryEffect && LEGENDARY_EFFECTS[item.legendaryEffect.id];
  return `<div class="detail rar-${r.cssClass}">
    <div class="detail-hero">
      <div class="detail-frame rar-glow-${r.cssClass} pixel">${itemVisualHTML(item, 120)}</div>
      <div class="detail-stamp display" style="color:${r.color}">${r.name.toUpperCase()}</div>
      <div class="detail-name display rt-${r.cssClass}">${item.name}${item.uniqueId ? '<span class="unique-badge">UNIQUE</span>' : ''}</div>
      <div class="detail-slot smallcap">T${item.chestTier} · ${slot.name}</div>
    </div>
    <div class="detail-power">
      <span class="dp-num mono gold-text">⚡ ${fmt(power)}</span>
      ${delta !== null ? `<span class="dp-delta ${delta >= 0 ? 'up' : 'down'} mono">${delta >= 0 ? '▲ +' : '▼ '}${fmt(delta)} vs équipé</span>` : ''}
    </div>
    ${compChips(item) ? `<div class="detail-chips">${compChips(item)}</div>` : ''}
    <div class="detail-stats">${statBars(item)}</div>
    ${sourcesHTML(item)}
    ${eff ? `<div class="detail-legendary"><span class="dl-title">✦ ${eff.name}</span><span class="dl-desc">${eff.desc}</span></div>` : ''}
    ${item.flavor ? `<blockquote class="detail-flavor">"${item.flavor}"</blockquote>` : ''}
    <div class="detail-value smallcap">💰 ${fmt(item.goldValue)} or · 💎 ${shardYield(item)} ${r.name}</div>
  </div>
  <div class="detail-actionbar">
    <button class="btn-gold" data-item-action="equip">${equipped ? 'Déséquiper' : 'Équiper'}</button>
    <button class="btn-ghost" data-item-action="sell" ${item.locked ? 'disabled' : ''}>💰 ${fmt(item.goldValue)}</button>
    <button class="btn-ghost" data-item-action="salvage" ${item.locked ? 'disabled' : ''}>💎 ${shardYield(item)}</button>
    <button class="btn-ghost ${item.locked ? 'locked' : ''}" data-item-action="lock">${item.locked ? '🔓' : '🔒'}</button>
  </div>`;
}

// ── ⑥ Item detail — replaces the text-wall tooltip (mobile sheet) ──
function ovItemDetail(p) {
  const item = findAnyItem(p.itemId);
  if (!item) return overlayShell('Objet', '<div class="empty-state">Objet introuvable</div>');
  return `<div class="overlay-backdrop" data-close-overlay="1"></div>
    <div class="sheet item-sheet">
      <div class="sheet-grip"></div>
      <div class="sheet-body scroll">${detailBody(item)}</div>
    </div>`;
}

// ── ③ Stats breakdown ────────────────────────────────────────
function ovStats() {
  const stats = computeStats();
  const power = computePower(stats);
  const bd = computeStatsBreakdown();
  const rows = Object.entries(stats).filter(([, v]) => v).map(([k, v]) => {
    const srcs = bd[k] || [];
    const max = srcs.reduce((a, s) => a + Math.abs(s.value), 0) || 1;
    const segs = srcs.map((s, i) => `<div class="bd-seg" style="flex:${Math.abs(s.value)};background:hsl(${(i * 57) % 360} 60% 55%)" title="${s.source}: ${s.value}"></div>`).join('');
    const leg = srcs.map((s, i) => `<span class="bd-leg"><i style="background:hsl(${(i * 57) % 360} 60% 55%)"></i>${s.source} ${s.value}${PCT_STATS.has(k) ? '%' : ''}</span>`).join('');
    return `<div class="bd-row"><div class="bd-label">${STAT_ICON[k] || ''} ${statLabel(k)} <span class="mono">${v}${PCT_STATS.has(k) ? '%' : ''}</span></div>
      <div class="bd-bar">${segs}</div><div class="bd-legend">${leg}</div></div>`;
  }).join('');
  return overlayShell('Statistiques', `<div class="bd-power display gold-text">⚡ ${fmt(power)}</div>${rows}`, { wide: true });
}

// ── ③ Talents ────────────────────────────────────────────────
function ovTalents() {
  const cats = Object.entries(TALENT_CATEGORIES).map(([cid, cat]) => {
    const pts = categoryPoints(cid);
    const dots = Array.from({ length: 10 }, (_, i) =>
      `<span class="mastery-dot${i < Math.min(10, pts) ? ' on' : ''}${(i === 4 || i === 9) ? ' tier' : ''}"></span>`).join('');
    const talents = TALENTS.filter(t => t.category === cid).map(t => {
      const rank = rankOf(t.id);
      const can = canUpgradeTalent(t.id);
      const pips = Array.from({ length: t.maxRank }, (_, i) => `<span class="pip${i < rank ? ' on' : ''}"></span>`).join('');
      return `<div class="talent">
        <span class="talent-ico">${t.emoji}</span>
        <div class="talent-info"><div class="talent-name">${t.name}</div><div class="talent-desc smallcap">${t.desc}</div><div class="pips">${pips}</div></div>
        <button class="talent-add${can ? '' : ' disabled'}" data-talent="${t.id}" ${can ? '' : 'disabled'}>+</button>
      </div>`;
    }).join('');
    return `<div class="talent-cat"><div class="tc-head" style="color:${cat.color}">${cat.emoji} ${cat.name} <span class="mastery">${dots}</span></div>${talents}</div>`;
  }).join('');
  const spent = totalPointsSpent();
  const cost = respecCost();
  const can = canRespecTalents();
  const respec = spent > 0
    ? `<div class="talent-respec"><button class="btn-respec${can ? '' : ' disabled'}" data-respec ${can ? '' : 'disabled'}>↺ Réinitialiser les talents (${fmt(cost)} or)</button></div>`
    : '';
  return overlayShell(`Talents · ${state.talentPoints || 0} pts`, cats + respec, { wide: true });
}

// ── ③ Skills ─────────────────────────────────────────────────
function ovSkills() {
  const active = new Set(getActiveSkills().map(s => s.id));
  const grid = SKILLS.map(s => {
    const on = active.has(s.id);
    return `<div class="skill${on ? ' active' : ' locked'}">
      <span class="skill-ico">${s.emoji}</span>
      <div class="skill-info"><div class="skill-name">${s.name}</div><div class="skill-desc smallcap">${s.desc}</div>
        ${on ? '<div class="skill-state gold-text smallcap">ACTIVE</div>' : `<div class="skill-state smallcap">${s.unlockText || 'Verrouillée'}</div>`}</div>
    </div>`;
  }).join('');
  return overlayShell(`Compétences · ${active.size}/${SKILLS.length}`, `<div class="skills-grid">${grid}</div>`, { wide: true });
}

// ── Abilities loadout (player-chosen active abilities) ───────
function ovAbilities() {
  const loadout = getLoadout();
  const maxSlots = abilitySlots();
  const slots = [];
  for (let i = 0; i < maxSlots; i++) {
    const id = loadout[i];
    const a = id ? ABILITIES.find(x => x.id === id) : null;
    slots.push(a
      ? `<button class="ab-slot filled" data-ability="${a.id}" title="Retirer"><span class="ab-ico">${a.emoji}</span><span class="smallcap">${a.name}</span></button>`
      : `<div class="ab-slot empty"><span class="ab-ico">＋</span><span class="smallcap">Vide</span></div>`);
  }
  const full = loadout.length >= maxSlots;
  const grid = ABILITIES.map(a => {
    const unlocked = isAbilityUnlocked(a.id);
    const on = isSlotted(a.id);
    const cls = on ? ' active' : (unlocked ? '' : ' locked');
    const stateLabel = on ? '<div class="skill-state gold-text smallcap">ÉQUIPÉE</div>'
      : (unlocked ? (full ? '<div class="skill-state smallcap">Slots pleins</div>' : '<div class="skill-state smallcap">Tap pour équiper</div>')
                  : `<div class="skill-state smallcap">🔒 ${a.unlockText || 'Verrouillée'}</div>`);
    const badge = a.rank >= 2 ? '<span class="ab-badge t2">T2</span>' : '';
    const attr = unlocked ? `data-ability="${a.id}"` : '';
    return `<button class="skill${cls}" ${attr} ${unlocked ? '' : 'disabled'}>
      <span class="skill-ico">${a.emoji}</span>
      <div class="skill-info"><div class="skill-name">${a.name}${badge}</div><div class="skill-desc smallcap">${a.desc}</div>${stateLabel}</div>
    </button>`;
  }).join('');
  const inner = `<p class="smallcap">Équipe jusqu'à ${maxSlots} capacités actives (talent 🎯 Tacticien = +1 slot/rang). Elles se déclenchent automatiquement en combat — le choix du loadout est ta décision de build.</p>
    <div class="ab-slots">${slots.join('')}</div>
    <div class="skills-grid">${grid}</div>`;
  return overlayShell(`Capacités · ${loadout.length}/${maxSlots}`, inner, { wide: true });
}

// ── Affinités d'archétype (synergies transversales) ──────────
const AFFINITY_BONUS_LABELS = { damage: 'dégâts', hp: 'PV max', elem: 'dégâts élém.', gold: 'or', drop: 'drops rares' };
function affinityBonusText(bonus) {
  if (!bonus) return '—';
  return Object.entries(bonus).map(([k, v]) => `+${Math.round(v * 100)}% ${AFFINITY_BONUS_LABELS[k] || k}`).join(' · ');
}
// Hub sub-label: count of axes that have reached at least tier 1.
function affinitiesSub() {
  const active = affinitySummary().filter(a => a.tier > 0).length;
  return active ? `${active}/4 actives` : 'Synergies de build';
}
function ovAffinities() {
  const cards = affinitySummary().map(a => {
    const pips = Array.from({ length: 3 }, (_, i) => `<span class="aff-pip${i < a.tier ? ' on' : ''}"></span>`).join('');
    const next = a.tier < 3 ? `<div class="smallcap aff-next">Palier ${a.tier + 1} à ${[4, 8, 12][a.tier]} pts</div>` : '<div class="smallcap aff-next">Palier max</div>';
    return `<div class="aff-card${a.tier > 0 ? ' on' : ''}" style="--c:${a.color}">
      <div class="aff-head"><span class="aff-emoji">${a.emoji}</span><span class="aff-name display">${a.name}</span><span class="aff-pips">${pips}</span></div>
      <div class="aff-score mono">${a.score} pts</div>
      <div class="aff-bonus smallcap">${a.tier > 0 ? affinityBonusText(a.activeBonus) : 'Inactif'}</div>
      ${next}
      <div class="aff-desc smallcap">${a.desc}</div>
    </div>`;
  }).join('');
  const inner = `<p class="smallcap">Aligne tes investissements à travers plusieurs systèmes (talents, reliques, set, éléments). Plus un axe est nourri, plus son bonus passif grandit — la cohérence de build est récompensée.</p>
    <div class="aff-grid">${cards}</div>`;
  return overlayShell('Affinités d\'archétype', inner, { wide: true });
}

// ── Deep Dive: boon checkpoint ───────────────────────────────
function ovDiveBoon() {
  const s = getSession();
  const choice = (s && s.pendingBoon) || [];
  const secured = s ? s.securedGold : 0;
  const pending = s ? s.pendingGold : 0;
  const cards = choice.map(id => {
    const b = DIVE_BOON_BY_ID[id];
    if (!b) return '';
    return `<button class="relic-card" data-dive-boon="${id}">
        <div class="relic-emoji">${b.emoji}</div>
        <div class="relic-name display">${b.name}</div>
        <div class="relic-desc smallcap">${b.desc}</div>
      </button>`;
  }).join('');
  return `<div class="overlay-backdrop"></div>
    <div class="sheet dark">
      <div class="sheet-head"><span class="display">🌊 Point de contrôle · profondeur ${s ? s.depth : 0}</span></div>
      <div class="sheet-body scroll">
        <p class="smallcap">Butin sécurisé : <b class="gold-text">${fmt(secured)} 💰</b>. Choisis un bonus pour continuer, ou récupère ton or et sors.</p>
        <div class="relic-grid">${cards}</div>
        <button class="btn-ghost dive-exit-btn" data-dive="exit">💰 Récupérer ${fmt(secured)} or & sortir</button>
      </div>
    </div>`;
}

// ── Deep Dive: end summary ───────────────────────────────────
function ovDiveSummary(params) {
  const s = (params && params.summary) || {};
  const orbBits = Object.entries(s.orbs || {}).map(([id, q]) => { const o = CURRENCY_BY_ID[id]; return o ? `${o.emoji}×${q}` : ''; }).filter(Boolean).join(' · ');
  const isBest = s.depth && s.depth >= (state.dive?.bestDepth || 0);
  return `<div class="overlay-backdrop" data-close-overlay="1"></div>
    <div class="sheet dark">
      <div class="sheet-head"><span class="display">🌊 ${s.died ? 'Plongée terminée' : 'Remonté sain et sauf'}</span><button class="sheet-close" data-close-overlay="1">✕</button></div>
      <div class="sheet-body scroll" style="text-align:center">
        <div style="font-size:46px;margin:6px 0">${s.died ? '💀' : '🏆'}</div>
        <div class="display" style="font-size:24px">Profondeur ${s.depth || 0}</div>
        ${isBest ? '<div class="gold-text smallcap">★ Nouveau record !</div>' : `<div class="smallcap">Record : ${state.dive?.bestDepth || 0}</div>`}
        <div class="asc-grid" style="margin:14px auto">
          <div class="asc-cell"><span class="smallcap">Or récupéré</span><span class="mono">${fmt(s.gold || 0)}</span></div>
          <div class="asc-cell"><span class="smallcap">Orbes</span><span class="mono">${orbBits || '—'}</span></div>
        </div>
        ${s.died ? '<p class="smallcap">Mort : tu n\'as gardé que la moitié du butin non sécurisé.</p>' : ''}
        <button class="btn-gold" data-close-overlay="1">Continuer</button>
      </div>
    </div>`;
}

// ── Village (management / idle layer) ────────────────────────
let forgeCraftRarity = 'magic';
export function setForgeCraftRarity(r) { forgeCraftRarity = r; renderOverlay(); }
export function getForgeCraftRarity() { return forgeCraftRarity; }
function costStr(c) {
  const bits = [];
  if (c.wood) bits.push(`🪵 ${fmt(c.wood)}`);
  if (c.stone) bits.push(`🪨 ${fmt(c.stone)}`);
  if (c.metal) bits.push(`⚙️ ${fmt(c.metal)}`);
  if (c.essence) bits.push(`💠 ${fmt(c.essence)}`);
  if (c.gold) bits.push(`💰 ${fmt(c.gold)}`);
  return bits.join(' · ') || '—';
}
// Visual building-dot row (filled = worker present).
function workerDots(id) {
  const max = Village.maxWorkersOn(id), on = Village.workersOn(id);
  if (max <= 0) return '';
  let s = '';
  for (let i = 0; i < max; i++) s += `<span class="vp-dot${i < on ? ' on' : ''}"></span>`;
  return `<span class="vp-dots">${s}</span>`;
}

// ── Chronicle (story) ────────────────────────────────────────
function ovStory() {
  const step = Story.storyStep();
  const ready = Story.storyReady();
  const rows = Story.CHAPTERS.map((c, i) => {
    const status = Story.chapterStatus(i);
    if (status === 'locked') {
      return `<div class="chr-row chr-locked"><div class="chr-act smallcap">${c.act}</div>
        <div class="chr-title">🔒 ${i === step + 1 ? 'Chapitre scellé' : '???'}</div></div>`;
    }
    const isActive = status === 'active';
    const rwd = [];
    if (c.reward?.gold) rwd.push(`💰 ${fmt(c.reward.gold)}`);
    if (c.reward?.keys) rwd.push(`🗝 ${c.reward.keys}`);
    if (c.reward?.orbs) rwd.push(`🔮 ${c.reward.orbs}`);
    return `<div class="chr-row ${isActive ? 'chr-active' : 'chr-done'}">
      <div class="chr-act smallcap">${c.act}</div>
      <div class="chr-title">${isActive ? '◈' : '✓'} ${c.title}</div>
      <p class="chr-text">${c.text}</p>
      ${isActive ? `<div class="chr-goal smallcap">🎯 ${c.goal}${rwd.length ? ` · récompense ${rwd.join(' ')}` : ''}</div>
        ${ready ? `<button class="btn-gold" data-story-claim="1">Accomplir ce chapitre</button>`
                : `<div class="smallcap chr-wait">En cours…</div>`}` : ''}
    </div>`;
  }).join('');
  return overlayShell('📜 Chronique', `<div class="chr">${rows}</div>`, { wide: true });
}

// ── Intro cinematic ──────────────────────────────────────────
let introIndex = 0;
export function startIntro() { introIndex = 0; navOverlay('intro'); }
export function advanceIntro() {
  const slides = introSlides('');
  if (introIndex >= slides.length - 1) { endIntro(); return; }
  introIndex += 1; renderOverlay();
}
export function endIntro() {
  state.ui.hasSeenIntro = true;
  closeOverlay();
  if (!state.ui.hasSeenWelcome) navOverlay('onboarding');
}
function ovIntro() {
  const slides = introSlides(characterSpriteSVG(40));
  const i = Math.min(introIndex, slides.length - 1);
  const s = slides[i];
  const last = i >= slides.length - 1;
  const dots = slides.map((_, k) => `<span class="cine-dot${k === i ? ' on' : ''}"></span>`).join('');
  const words = s.text.split(' ').map((w, k) => `<span class="cine-w" style="--i:${k}">${w}</span>`).join(' ');
  const dust = Array.from({ length: 9 }, (_, k) => `<span class="cine-dust cine-dust${k % 5}"></span>`).join('');
  return `<div class="cine" data-intro="next">
    <div class="cine-bar cine-bar-top"></div>
    <div class="cine-stage">
      <div class="cine-kb" key="${i}">${s.scene}</div>
      <div class="cine-dustlayer">${dust}</div>
      <div class="cine-vignette"></div>
    </div>
    <div class="cine-body">
      <div class="cine-title display" key="t${i}">${s.title}</div>
      <p class="cine-text" key="${i}">${words}</p>
      <div class="cine-dots">${dots}</div>
    </div>
    <div class="cine-actions">
      <button class="btn-ghost" data-intro="skip">Passer ▸</button>
      <button class="btn-gold" data-intro="next">${last ? '✦ Commencer' : 'Suivant ▸'}</button>
    </div>
    <div class="cine-bar cine-bar-bot"></div>
  </div>`;
}

// ── Village = a visual scene (prominent top-level tab) ───────
function screenVillage() {
  const { wood, stone, metal, essence } = Village.woodStone();
  const r = Village.rates();
  const age = Village.currentAge();
  const banner = `<div class="vlg-banner">
      <div class="vlg-banner-title">
        <span class="vlg-crest">${age.emoji}</span>
        <span><span class="display vlg-bn">Village</span>
        <span class="smallcap vlg-bs">${age.name} · prospérité ${Village.prosperity()}</span></span>
      </div>
      <div class="vlg-resbar">
        <span class="vlg-r" title="Bois">🪵 ${fmt(wood)}<em>+${r.wood.toFixed(0)}</em></span>
        <span class="vlg-r" title="Pierre">🪨 ${fmt(stone)}<em>+${r.stone.toFixed(0)}</em></span>
        <span class="vlg-r" title="Métal">⚙️ ${fmt(metal)}<em>+${r.metal.toFixed(1)}</em></span>
        ${(essence > 0 || r.essence > 0) ? `<span class="vlg-r" title="Essence">💠 ${fmt(essence)}<em>+${r.essence.toFixed(1)}</em></span>` : ''}
        ${r.orbs > 0 ? `<span class="vlg-r" title="Orbes/min">🔮<em>+${r.orbs.toFixed(2)}</em></span>` : ''}
        <span class="vlg-r" title="Ouvriers">👷 ${Village.workersUsed()}/${Village.workerCap()}</span>
      </div>
    </div>`;

  // Town hall is the centerpiece plot.
  const thLvl = Village.townhall();
  const thReady = Village.canUpgradeTownhall();
  const thCs = Village.constructionState();
  let mairie;
  if (thCs && thCs.id === 'townhall') {
    const elapsed = thCs.durationMs - thCs.remainingMs;
    mairie = `<button class="vp vp-mairie vp-building" data-village-open="townhall">
      <span class="vp-badge">→ niv ${thCs.level}</span>
      <span class="vp-art vp-tile vp-ghost">${buildingArtSVG('mairie', thCs.level, 72)}<span class="vp-scaffold">🏗️</span></span>
      <span class="vp-name">Mairie</span>
      <div class="vp-buildbar"><div class="vp-buildbar-fill" style="animation: vp-build ${thCs.durationMs}ms linear ${-elapsed}ms forwards"></div></div>
      <span class="vp-sub smallcap">⏳ ${Math.ceil(thCs.remainingMs / 1000)}s</span></button>`;
  } else {
    mairie = `<button class="vp vp-mairie${thReady ? ' vp-ready' : ''}" data-village-open="townhall">
      <span class="vp-badge">niv ${thLvl}</span>
      <span class="vp-art vp-tile">${buildingArtSVG('mairie', thLvl, 72)}</span>
      <span class="vp-name">Mairie</span>
      <span class="vp-sub smallcap">${Village.producersBuilt()}/${Village.buildingSlots()} emplacements${thReady ? ' · ⬆ prête' : ''}</span>
    </button>`;
  }

  const cs = Village.constructionState();
  const plots = Village.BUILDINGS.map(b => {
    const lvl = Village.levelOf(b.id);
    const unlocked = Village.isUnlocked(b.id);
    // Under construction: scaffolding + progress bar (smooth via negative-delay anim).
    if (cs && cs.id === b.id) {
      const elapsed = cs.durationMs - cs.remainingMs;
      const secs = Math.ceil(cs.remainingMs / 1000);
      return `<button class="vp vp-building" data-village-open="${b.id}">
        <span class="vp-badge">→ niv ${cs.level}</span>
        <span class="vp-art vp-tile vp-ghost">${buildingArtSVG(b.id, cs.level, 56)}<span class="vp-scaffold">🏗️</span></span>
        <span class="vp-name">${b.name}</span>
        <div class="vp-buildbar"><div class="vp-buildbar-fill" style="animation: vp-build ${cs.durationMs}ms linear ${-elapsed}ms forwards"></div></div>
        <span class="vp-sub smallcap">⏳ ${secs}s</span></button>`;
    }
    if (!unlocked) {
      return `<div class="vp vp-locked" title="Mairie niv ${b.townhallReq}">
        <span class="vp-art">🔒</span><span class="vp-name">${b.name}</span>
        <span class="vp-sub smallcap">Mairie niv ${b.townhallReq}</span></div>`;
    }
    if (lvl === 0) {
      const can = Village.canBuild(b.id);
      return `<button class="vp vp-empty${can ? ' vp-can' : ''}" data-village-open="${b.id}">
        <span class="vp-art vp-tile vp-ghost">${buildingArtSVG(b.id, 1, 56)}</span>
        <span class="vp-name">${b.name}</span>
        <span class="vp-sub smallcap">${can ? '🔨 Construire' : 'Construire'}</span></button>`;
    }
    // Built: show activity at a glance.
    let activity = '';
    if (b.kind === 'producer') { const rn = Village.ratePerMin(b.id); activity = `${workerDots(b.id)}<span class="vp-sub smallcap">${rn ? `+${rn.toFixed(1)}/min` : '⚠ sans ouvrier'}</span>`; }
    else if (b.kind === 'houses') activity = `<span class="vp-sub smallcap">👷 ${Village.workerCap()} ouvriers</span>`;
    else if (b.id === 'forge') activity = `<span class="vp-sub smallcap">⚒️ tier ${Village.maxCraftTier()}</span>`;
    else if (b.id === 'barracks') activity = `<span class="vp-sub smallcap gold-text">+${lvl * 4}% dmg/PV</span>`;
    else if (b.id === 'market') activity = `<span class="vp-sub smallcap gold-text">+${lvl * 6}% vente</span>`;
    else if (b.id === 'guild') activity = `<span class="vp-sub smallcap gold-text">+${lvl} contrat</span>`;
    else if (b.id === 'vault') activity = `<span class="vp-sub smallcap gold-text">+${lvl * 5}% or</span>`;
    else if (b.id === 'observatory') activity = `<span class="vp-sub smallcap gold-text">+${lvl * 3}% rares</span>`;
    const ready = Village.canBuild(b.id);
    return `<button class="vp vp-built${ready ? ' vp-ready' : ''}" data-village-open="${b.id}">
        <span class="vp-badge">niv ${lvl}</span>
        <span class="vp-art vp-tile">${buildingArtSVG(b.id, lvl, 56)}</span>
        <span class="vp-name">${b.name}</span>
        ${activity}
      </button>`;
  }).join('');

  const fireflies = Array.from({ length: 7 }, (_, i) => `<span class="vlg-fly vlg-fly${i % 4}"></span>`).join('');
  return `<div class="vlg-screen">
    ${banner}
    <div class="vlg-scene">
      <div class="vlg-sky">
        <div class="vlg-sun"></div>
        <div class="vlg-cloud vlg-cloud1"></div>
        <div class="vlg-cloud vlg-cloud2"></div>
        <div class="vlg-cloud vlg-cloud3"></div>
      </div>
      <svg class="vlg-hills" viewBox="0 0 100 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,20 L0,12 Q15,4 30,10 T60,8 T100,11 L100,20 Z" fill="#243a1c"/>
        <path d="M0,20 L0,15 Q20,9 42,13 T80,12 T100,14 L100,20 Z" fill="#2f4a23"/>
      </svg>
      <div class="vlg-ground">
        <div class="vlg-flies">${fireflies}</div>
        <div class="vlg-mairie-row">${mairie}</div>
        <div class="vlg-plots">${plots}</div>
      </div>
    </div>
    <p class="vlg-hint smallcap">Touche un bâtiment pour le gérer. Le donjon est ton robinet principal de ressources ; les bâtiments produisent en continu (hors-ligne plafonné 8h).</p>
  </div>`;
}

// Construction status line for the detail overlay.
function vbStatus(id) {
  const cs = Village.constructionState();
  if (cs && cs.id === id) return `<div class="smallcap gold-text">🏗️ En construction… ${Math.ceil(cs.remainingMs / 1000)}s (→ niv ${cs.level})</div>`;
  if (cs) { const ob = Village.BUILDING_BY_ID[cs.id]; return `<div class="smallcap vlg-locked">⏳ Chantier occupé : ${ob ? ob.name : 'Mairie'}</div>`; }
  return '';
}

// Contextual per-building management (replaces the old monolithic table).
function ovVillageBuilding({ id } = {}) {
  if (id === 'townhall') {
    const thLvl = Village.townhall();
    const thCost = Village.townhallCost();
    const floorMet = Village.townhallFloorMet();
    const thCan = Village.canUpgradeTownhall();
    const inner = `<div class="vb-detail">
        <div class="vb-art vp-tile">${buildingArtSVG('mairie', thLvl, 96)}</div>
        <div class="vb-info">
          <div class="display">Mairie · niv ${thLvl}</div>
          <p class="smallcap">Plafonne le niveau des bâtiments (max ${thLvl}) et le nombre d'emplacements de production (${Village.producersBuilt()}/${Village.buildingSlots()}). Faire monter la Mairie ouvre les Âges et de nouveaux bâtiments.</p>
          <div class="smallcap">Améliorer → niv ${thLvl + 1} : ${costStr(thCost)}</div>
          <div class="smallcap ${floorMet ? 'gold-text' : 'vlg-locked'}">${floorMet ? '✓ étage atteint' : '🔒'} requiert d'avoir débloqué l'étage ${Village.townhallFloorReq()}</div>
          ${vbStatus('townhall')}
          <button class="btn-gold" data-village-townhall ${thCan ? '' : 'disabled'}>Améliorer la Mairie</button>
        </div>
      </div>`;
    return overlayShell('🏛️ Mairie', inner);
  }
  const b = Village.BUILDING_BY_ID[id];
  if (!b) return overlayShell('Village', '<p>Bâtiment inconnu.</p>');
  const lvl = Village.levelOf(b.id);
  const can = Village.canBuild(b.id);
  const capped = lvl >= Village.maxBuildingLevel();
  const cost = Village.buildCost(b.id);
  let body = '';
  if (b.kind === 'houses') body = `<div class="smallcap">Capacité d'ouvriers : <b>${Village.workerCap()}</b> (+3 par niveau).</div>`;
  else if (b.kind === 'producer') {
    const rn = Village.ratePerMin(b.id);
    body = `<div class="smallcap">Production : <b>${rn ? `+${rn.toFixed(1)}/min` : '0'}</b> ${rn ? '' : '— assigne des ouvriers'}</div>
      ${lvl > 0 ? `<div class="vlg-workers">
        <span class="smallcap">👷 ${Village.workersOn(b.id)}/${Village.maxWorkersOn(b.id)} ouvriers</span>
        <button class="vlg-wbtn" data-village-assign="${b.id}" data-delta="-1" ${Village.canUnassign(b.id) ? '' : 'disabled'}>−</button>
        <button class="vlg-wbtn" data-village-assign="${b.id}" data-delta="1" ${Village.canAssign(b.id) ? '' : 'disabled'}>+</button>
        <span class="smallcap">(${Village.workersFree()} libre${Village.workersFree() > 1 ? 's' : ''})</span>
      </div>` : ''}`;
  } else if (b.id === 'forge') body = lvl ? `<div class="smallcap">Tier de craft : <b>${Village.maxCraftTier()}</b> · rareté max : <b>${RARITIES[Village.maxCraftRarityIndex()]?.name || '—'}</b></div>` : '';
  else if (b.id === 'barracks') body = lvl ? `<div class="smallcap gold-text">Bonus permanent : +${lvl * 4}% dégâts · +${lvl * 4}% PV max</div>` : '';
  else if (b.id === 'market') body = lvl ? `<div class="smallcap gold-text">+${lvl * 6}% prix de vente · vente auto débloquée gratuitement</div>` : '';
  else if (b.id === 'guild') body = lvl ? `<div class="smallcap gold-text">+${lvl} contrat actif · relance −${lvl * 15}%</div>` : '';
  else if (b.id === 'vault') body = lvl ? `<div class="smallcap gold-text">+${lvl * 5}% d'or gagné en donjon</div>` : '';
  else if (b.id === 'observatory') body = lvl ? `<div class="smallcap gold-text">+${lvl * 3}% de chance d'objets rares+</div>` : '';
  const btnLabel = lvl === 0 ? 'Construire' : (capped ? `Niveau max (Mairie ${Village.townhall()})` : `Améliorer → niv ${lvl + 1}`);
  const inner = `<div class="vb-detail">
      <div class="vb-art vp-tile">${buildingArtSVG(b.id, lvl || 1, 96)}</div>
      <div class="vb-info">
        <div class="display">${b.name}${lvl ? ` · niv ${lvl}` : ''}</div>
        <p class="smallcap">${b.desc}</p>
        ${body}
        ${capped ? '' : `<div class="smallcap">Coût : ${costStr(cost)} · ⏳ ${Math.ceil(Village.buildDurationMs(lvl) / 1000)}s</div>`}
        ${vbStatus(b.id)}
        <button class="btn-gold" data-village-build="${b.id}" ${can ? '' : 'disabled'}>${btnLabel}</button>
      </div>
    </div>
    ${b.id === 'forge' && lvl > 0 ? forgeCraftPanel() : ''}`;
  return overlayShell(`${b.emoji} ${b.name}`, inner);
}

// Forge crafting panel — pick rarity (capped by forge level) + a slot to craft.
function forgeCraftPanel() {
  if (Village.forgeLevel() < 1) return '';
  const maxRi = Village.maxCraftRarityIndex();
  if (!RARITIES.some(r => r.id === forgeCraftRarity && RARITIES.indexOf(r) <= maxRi)) forgeCraftRarity = 'magic';
  const rarityBtns = RARITIES.slice(0, maxRi + 1).map(r =>
    `<button class="vlg-rar${r.id === forgeCraftRarity ? ' on' : ''}" data-village-craft-rarity="${r.id}" style="--c:${r.color}">${r.name}</button>`).join('');
  const cost = Village.craftCost(Village.maxCraftTier(), forgeCraftRarity);
  const slotBtns = SLOTS.map(s => {
    const can = Village.canCraft(s.id, forgeCraftRarity);
    return `<button class="vlg-craft-slot" data-village-craft="${s.id}" ${can ? '' : 'disabled'} title="${s.name}">${s.emoji}<span class="smallcap">${s.name}</span></button>`;
  }).join('');
  return `<div class="vlg-card vlg-forgepanel">
      <div class="vlg-name">⚒️ Forger un objet · tier ${Village.maxCraftTier()}</div>
      <div class="vlg-rar-row">${rarityBtns}</div>
      <div class="smallcap">Coût par objet : ${costStr(cost)}</div>
      <div class="vlg-craft-grid">${slotBtns}</div>
    </div>`;
}

// ── ④ Contracts ──────────────────────────────────────────────
function ovContracts() {
  const list = (state.bounties?.active || []).map(b => {
    const pct = b.target > 0 ? Math.min(100, (b.progress / b.target) * 100) : 0;
    const ready = b.completed;
    const chips = [`<span class="chip" style="--c:var(--cur-gold)">💰 ${fmt(b.reward.gold)}</span>`];
    for (const [oid, q] of Object.entries(b.reward.orbs || {})) { const o = CURRENCY_BY_ID[oid]; if (o) chips.push(`<span class="chip" style="--c:${o.color}">${o.emoji}×${q}</span>`); }
    if (b.reward.talents) chips.push(`<span class="chip" style="--c:#6acc6a">🌳×${b.reward.talents}</span>`);
    const canReroll = (state.gold || 0) >= bountyRerollCost() && !b.completed;
    return `<div class="contract panel${ready ? ' ready pulse-gold' : ''}" style="border-color:${b.diffColor}">
      <div class="contract-top"><span class="contract-emoji">${b.emoji}</span>
        <div><div class="contract-name" style="color:${b.diffColor}">${b.name}</div><div class="contract-desc smallcap">${b.desc}</div></div>
        ${ready ? '<span class="contract-ready gold-text">PRÊT</span>' : `<button class="btn-ghost contract-reroll" data-bounty-reroll="${b.id}" ${canReroll ? '' : 'disabled'}>🔄</button>`}</div>
      <div class="contract-bar"><div class="contract-bar-fill" style="width:${pct}%;background:${b.diffColor}"></div></div>
      <div class="contract-prog mono">${fmt(b.progress)} / ${fmt(b.target)}</div>
      <div class="contract-rewards">${chips.join(' ')}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-icon">📋</div><div>Aucun contrat</div></div>';
  return overlayShell('Contrats', list, { wide: true });
}

// ── ④ Codex (tabs Uniques / Sets / Boss) ─────────────────────
let codexTab = 'uniques';
export function setCodexTab(t) { codexTab = t; renderOverlay(); }
function ovCodex() {
  let grid, count, total;
  if (codexTab === 'uniques') {
    total = UNIQUE_LEGENDARIES.length;
    count = UNIQUE_LEGENDARIES.filter(u => state.codex?.uniques?.[u.id]).length;
    grid = UNIQUE_LEGENDARIES.map(u => { const f = state.codex?.uniques?.[u.id];
      return `<div class="codex-cell${f ? '' : ' unknown'}" title="${f ? u.name : '???'}">${f ? u.emoji : '?'}</div>`; }).join('');
  } else if (codexTab === 'sets') {
    total = SETS.length;
    count = SETS.filter(s => state.codex?.sets?.[s.id]).length;
    grid = SETS.map(s => { const seen = state.codex?.sets?.[s.id];
      return `<div class="codex-cell${seen ? '' : ' unknown'}" title="${seen ? s.name : '???'}" style="${seen ? `--c:${s.color}` : ''}">${seen ? s.emoji : '?'}</div>`; }).join('');
  } else {
    total = BIOMES.length;
    count = BIOMES.filter(b => state.codex?.bosses?.[b.id]).length;
    grid = BIOMES.map(b => { const k = state.codex?.bosses?.[b.id];
      return `<div class="codex-cell${k ? '' : ' unknown'}" title="${k ? b.boss.name : '???'}">${k ? b.boss.emoji : '?'}</div>`; }).join('');
  }
  const tabs = [['uniques', 'Uniques'], ['sets', 'Sets'], ['bosses', 'Boss']];
  return overlayShell('Codex', `
    <div class="codex-tabs">${tabs.map(([id, lbl]) => `<button class="codex-tab${codexTab === id ? ' active' : ''}" data-codex-tab="${id}">${lbl}</button>`).join('')}</div>
    <div class="codex-count smallcap">${count}/${total} découverts</div>
    <div class="codex-grid">${grid}</div>`, { wide: true });
}

// ── Achievements ─────────────────────────────────────────────
function ovAchievements() {
  const grid = ACHIEVEMENTS.map(a => {
    const got = state.achievements?.unlocked?.[a.id];
    return `<div class="ach${got ? ' got' : ''}"><span class="ach-ico">${a.emoji}</span>
      <div><div class="ach-name">${a.name}</div><div class="ach-desc smallcap">${a.desc}</div></div>${got ? '<span class="ach-check">✓</span>' : ''}</div>`;
  }).join('');
  const ap = getAchievementProgress();
  return overlayShell(`Succès · ${ap.unlocked}/${ap.total}`, `<div class="ach-grid">${grid}</div>`, { wide: true });
}

// ── ④ Ascension ──────────────────────────────────────────────
function ovAscension() {
  const ready = canAscend();
  const reqs = ascensionRequirements();
  const lvl = state.prestige?.level || 0;
  const next = lvl + 1;
  const bonus = 15 * next;   // drops + or
  const cbonus = 6 * next;   // dégâts + PV (combat)
  return `<div class="overlay-backdrop" data-close-overlay="1"></div>
    <div class="ascension dark">
      <button class="sheet-close" data-close-overlay="1">✕</button>
      <div class="asc-rings"><div class="asc-halo"></div><div class="asc-hero pixel">${characterSpriteSVG(140)}</div></div>
      <div class="asc-title display">Ascension</div>
      <div class="asc-sub smallcap">Niveau de prestige ${lvl} → ${next}</div>
      <div class="asc-grid">
        <div class="asc-cell"><span class="smallcap">Dégâts</span><span class="mono">+${cbonus}%</span></div>
        <div class="asc-cell"><span class="smallcap">PV max</span><span class="mono">+${cbonus}%</span></div>
        <div class="asc-cell"><span class="smallcap">Drops raretés</span><span class="mono">+${bonus}%</span></div>
        <div class="asc-cell"><span class="smallcap">Or de vente</span><span class="mono">+${bonus}%</span></div>
        <div class="asc-cell"><span class="smallcap">Points talent</span><span class="mono">+2</span></div>
        <div class="asc-cell"><span class="smallcap">Relique</span><span class="mono">1 au choix</span></div>
      </div>
      ${ownedRelicsBlock()}
      <button class="btn-gold ${ready ? 'pulse-gold' : 'is-disabled'}" id="btn-ascend">
        ${ready ? '🌟 Ascensionner' : `🔒 T${reqs.minChestTier} + étage ${reqs.minFloor}`}
      </button>
    </div>`;
}

// Compact list of relics the player already owns (with stack counts).
function ownedRelicsBlock() {
  const owned = state.prestige?.relics || {};
  const entries = Object.entries(owned).filter(([, n]) => n > 0);
  if (!entries.length) return '';
  const chips = entries.map(([id, n]) => {
    const r = RELIC_BY_ID[id];
    if (!r) return '';
    return `<span class="relic-chip" title="${r.desc}">${r.emoji} ${r.name}${n > 1 ? ` ×${n}` : ''}</span>`;
  }).join('');
  return `<div class="asc-relics"><div class="smallcap">🏺 Reliques actives</div><div class="relic-chips">${chips}</div></div>`;
}

// ── Relic choice (after ascension) ───────────────────────────
function ovRelicChoice() {
  const choice = state.prestige?.pendingRelicChoice || [];
  const rerolls = state.prestige?.pendingRelicRerolls || 0;
  const cards = choice.map(id => {
    const r = RELIC_BY_ID[id];
    if (!r) return '';
    const have = state.prestige?.relics?.[id] || 0;
    const rankBadge = (r.rank || 1) >= 2 ? `<span class="relic-badge rank2">★ Rang ${r.rank}</span>` : '';
    const fxBadge = r.effect ? `<span class="relic-badge fx">✦ Effet</span>` : '';
    return `<button class="relic-card" data-relic="${id}">
        <div class="relic-emoji">${r.emoji}</div>
        <div class="relic-name display">${r.name}${have ? ` <span class="smallcap">(×${have})</span>` : ''}</div>
        <div class="relic-desc smallcap">${r.desc}</div>
        <div class="relic-badges">${rankBadge}${fxBadge}</div>
      </button>`;
  }).join('');
  const rerollBtn = `<button class="btn-ghost ${rerolls > 0 ? '' : 'is-disabled'}" id="btn-reroll-relic">
      🔄 Relancer le choix${rerolls > 0 ? ` (${rerolls})` : ' (0)'}
    </button>`;
  return `<div class="overlay-backdrop"></div>
    <div class="sheet dark">
      <div class="sheet-head"><span class="display">🏺 Choisis une relique</span></div>
      <div class="sheet-body scroll">
        <p class="smallcap">Modificateur permanent et cumulable. Il survit à chaque ascension et oriente ton build. Les reliques à effet ✦ modifient le combat ; les reliques de rang ★ se débloquent en profondeur.</p>
        <div class="relic-grid">${cards}</div>
        ${rerollBtn}
      </div>
    </div>`;
}

// ── Onboarding ───────────────────────────────────────────────
function ovOnboarding() {
  const steps = [
    ['🗝', 'Ouvre des coffres', 'Tu démarres avec 10 clés. Ouvre des coffres pour looter armes et armures.'],
    ['⚔', 'Équipe et combats', 'Équipe tes meilleurs objets, puis va au donjon pour gagner or, clés et items.'],
    ['📈', 'Progresse', 'Améliore ton coffre, débloque la forge, les talents, et grimpe les étages.'],
    ['💡', 'Astuces', 'Tape un objet pour ouvrir sa fiche. Le menu ⋯ contient l\'aide complète.'],
  ];
  return `<div class="overlay-backdrop"></div>
    <div class="onboarding dark">
      <div class="ob-hero display">Bienvenue dans Lootchest</div>
      <div class="ob-tag smallcap">Un RPG-looter pixel art. Chaque coffre est une promesse.</div>
      <div class="ob-steps">${steps.map(([i, t, d], n) => `<div class="ob-card panel"><div class="ob-num">${n + 1}</div><div class="ob-ico">${i}</div><div class="ob-title">${t}</div><div class="ob-desc smallcap">${d}</div></div>`).join('')}</div>
      <button class="btn-gold" id="btn-welcome-start">⚔ Commencer l'aventure</button>
    </div>`;
}

// ── Auto-vente & gestion en masse (fonctionnalité restaurée) ──
function ovAutosell() {
  const rows = RARITIES.map(r => {
    const cost = AUTOSELL_UNLOCK_COSTS[r.id];
    const inInv = state.inventory.filter(i => i.rarity === r.id && !i.locked).length;
    let control;
    if (cost === null) {
      control = `<span class="as-never smallcap">protégé</span>`;
    } else {
      const conf = state.autoSell?.[r.id] || {};
      if (!conf.unlocked) {
        const can = (state.gold || 0) >= cost;
        control = `<button class="btn-ghost as-unlock" data-autosell-unlock="${r.id}" ${can ? '' : 'disabled'}>${cost === 0 ? 'Activer' : '🔓 ' + fmt(cost) + ' 💰'}</button>`;
      } else {
        const act = autoActionFor(r.id); // 'off' | 'sell' | 'salvage'
        control = `<div class="as-seg">
          <button class="${act === 'off' ? 'on' : ''}" data-autosell="${r.id}:off">Off</button>
          <button class="${act === 'sell' ? 'on' : ''}" data-autosell="${r.id}:sell">💰</button>
          <button class="${act === 'salvage' ? 'on' : ''}" data-autosell="${r.id}:salvage">💎</button>
        </div>`;
      }
    }
    const bulk = (cost === null) ? '' : `<div class="as-bulk">
      <button class="as-bulkbtn" data-bulk-sell="${r.id}" title="Vendre tout (${inInv})" ${inInv ? '' : 'disabled'}>💰×${inInv}</button>
      <button class="as-bulkbtn" data-bulk-salvage="${r.id}" title="Recycler tout (${inInv})" ${inInv ? '' : 'disabled'}>💎×${inInv}</button>
    </div>`;
    return `<div class="as-row">
      <span class="as-name rt-${r.cssClass}">${r.name}</span>
      ${control}
      ${bulk}
    </div>`;
  }).join('');
  return overlayShell('Auto-vente & gestion', `
    <p class="smallcap">À l'ouverture d'un coffre, les drops d'une rareté en mode 💰/💎 sont automatiquement vendus ou recyclés. Les objets verrouillés 🔒 sont toujours épargnés.</p>
    <div class="as-list">${rows}</div>`, { wide: true });
}

// ── Settings ─────────────────────────────────────────────────
function ovSettings() {
  const s = state.settings || {};
  const row = (id, on, label) => `<label class="set-row"><input type="checkbox" data-setting="${id}" ${on ? 'checked' : ''}/><span>${label}</span></label>`;
  return overlayShell('Paramètres', `
    ${row('mute', state.ui?.muted, '🔇 Muet')}
    ${row('fastCombat', s.fastCombat, '⚡ Combat rapide')}
    ${row('reducedParticles', s.reducedParticles, '🎇 Particules réduites')}
    ${row('confirmAscend', s.confirmAscend, '🌟 Confirmer Ascension')}
    ${row('confirmDestructiveSell', s.confirmDestructiveSell, '🛡 Confirmer vente épique+')}
    ${row('hardMode', s.hardMode, '💀 Mode Cauchemar')}
    <div class="set-data">
      <button class="btn-ghost" data-action="export">⬇ Exporter</button>
      <button class="btn-ghost" data-action="import">⬆ Importer</button>
      <button class="btn-ghost set-reset" data-action="reset">⚠ Reset</button>
    </div>
    <input type="file" id="file-import" accept="application/json" hidden />`);
}

// ── Help (kept concise) ──────────────────────────────────────
function ovHelp() {
  return overlayShell('Comment jouer', `
    <h3>📦 Coffre</h3><p>Ouvre des coffres (1 clé) pour looter des objets. Améliore le tier pour de meilleurs drops. Légendaire garanti tous les ${PITY_THRESHOLD} coffres (jauge pity).</p>
    <h3>⚔ Donjon</h3><p>Affronte des monstres pour or, items et clés. Tous les 5 étages : boss. Mode 🔁 Boucle sur un étage déjà battu.</p>
    <h3>⚒ Forge</h3><p>Chaque action consomme un orbe spécifique. Transmute, augmente, reroll… pour améliorer tes objets. <button class="btn-ghost" data-overlay="forgeGuide">📖 Guide forge & orbes</button></p>
    <h3>🌟 Ascension & 🌳 Talents</h3><p>À T5 + étage 50, ascensionne pour repartir plus puissant (+prestige permanent). Gagne des points de talent par paliers d'étage.</p>
    <h3>💡 Raccourcis</h3><p>Espace : ouvrir/combattre · Échap : fermer.</p>
    <button class="btn-ghost" data-intro-replay="1">🎬 Revoir la cinématique</button>
    <button class="btn-ghost" data-action="replay-welcome">🎓 Revoir le tutoriel</button>`, { wide: true });
}

function ovForgeGuide() {
  const orb = (id) => {
    const c = CURRENCY_BY_ID[id];
    if (!c) return id;
    const icon = spriteImg(orbSpriteSrc(id), c.emoji, { size: 22, title: c.name });
    return `<span class="guide-orb" style="--c:${c.color}">${icon} <b>${c.name}</b></span>`;
  };
  const rarityChip = (id) => {
    const r = RARITY_BY_ID[id];
    return `<span class="guide-rar rt-${r.cssClass}" style="color:${r.color}">${r.name}</span>`;
  };
  return overlayShell('📖 Guide de la Forge', `
    <p class="guide-lead">Tu loot des objets, la forge te permet de les <b>améliorer</b> en consommant des <b>orbes</b> (drop des coffres) ou des <b>cristaux 💎</b> (recyclage d'objets).</p>

    <h3>1 · La rareté, c'est le plafond</h3>
    <p>Chaque objet a une rareté qui dicte combien d'<b>affixes</b> (stats bonus) il peut avoir :</p>
    <ul class="guide-list">
      <li>${rarityChip('common')} — 0 affixe (juste les stats de base)</li>
      <li>${rarityChip('magic')} — 1-2 affixes</li>
      <li>${rarityChip('rare')} — 3-4 affixes</li>
      <li>${rarityChip('epic')} — 4-5 affixes</li>
      <li>${rarityChip('legendary')} — 5-6 affixes</li>
      <li>${rarityChip('ancestral')} — le top, valeurs ×1.5</li>
    </ul>
    <p>👉 Premier objectif quand tu craft : <b>monter la rareté</b>, ensuite tu remplis les affixes, ensuite tu optimises leurs valeurs.</p>

    <h3>2 · Les orbes de rareté (montent le plafond)</h3>
    <div class="guide-row">${orb('transmu')}</div>
    <p>Transforme un objet <b>commun → magique</b>. C'est par là que tu commences.</p>
    <div class="guide-row">${orb('regal')}</div>
    <p>Transforme un objet <b>magique → rare</b>. Garde les affixes existants et en ajoute 1.</p>

    <h3>3 · Les orbes d'affixes (modifient les stats)</h3>
    <div class="guide-row">${orb('augm')}</div>
    <p>Ajoute un affixe à un objet <b>magique</b> (max 2). Pas cher, à spammer dès qu'un magique te plaît.</p>
    <div class="guide-row">${orb('alte')}</div>
    <p><b>Reroll complet</b> d'un objet magique. Tu jettes tout et tu repioches. À utiliser quand tu cherches un affixe précis sur du magique cheap.</p>
    <div class="guide-row">${orb('chaos')}</div>
    <p><b>Reroll complet</b> d'un rare ou plus. L'orbe casino par excellence — tu peux tout perdre comme tout gagner.</p>
    <div class="guide-row">${orb('exil')}</div>
    <p>Ajoute un affixe à un objet rare+. Permet de dépasser le nombre standard (1 affixe bonus).</p>
    <div class="guide-row">${orb('divin')}</div>
    <p>Reroll <b>les valeurs</b> des affixes (les stats restent les mêmes, mais leurs nombres bougent). Pour optimiser un objet déjà parfait sur le papier.</p>

    <h3>4 · Les orbes spéciaux</h3>
    <div class="guide-row">${orb('maitre')}</div>
    <p>Mode <b>Maître Forgeron</b> : tu <b>choisis</b> l'affixe que tu veux ajouter (au lieu d'en piocher un au hasard). L'orbe le plus rare et le plus puissant — garde-le pour des items légendaires.</p>
    <div class="guide-row">${orb('pierre')}</div>
    <p><b>Pierre de Forge</b> : monte le tier de l'objet de +1. Un objet T3 devient T5 → toutes ses valeurs scalent. À utiliser sur tes meilleures pièces uniquement.</p>
    <div class="guide-row">${orb('focus')}</div>
    <p>Cible le <b>slot</b> du prochain coffre ouvert. Tu sais qu'il te manque une amulette ? Active focus + slot Amulette → le prochain drop sera forcément une amulette.</p>

    <h3>5 · Le verrou d'affixe 🔒</h3>
    <p>Sur un objet rare+, tu peux <b>verrouiller 1 affixe</b> avant un Chaos ou un Divin. L'affixe ne bougera pas pendant le reroll — les autres oui. Idéal quand tu as <i>un</i> affixe parfait et que tu veux retenter les autres sans le perdre.</p>

    <h3>6 · Les cristaux 💎 et Reroll+</h3>
    <p>Quand tu <b>recycles</b> un objet (bouton 💎 dans l'inventaire), tu reçois des cristaux de la <b>même rareté</b> que l'objet recyclé. Tu en gagnes aussi en farmant.</p>
    <p>👉 Avec <b>${REROLL_PLUS_SHARD_COST} cristaux</b> de la rareté de ton objet, tu peux faire un <b>Reroll+</b> : un reroll qui privilégie les <b>hauts rolls</b>. C'est l'outil de min-maxing du late game.</p>

    <h3>7 · Le comptoir de change</h3>
    <p>Trop de petits orbes ? Le comptoir convertit <b>vers le haut</b> :</p>
    <ul class="guide-list">
      <li>3 ${orb('transmu')} → 1 ${orb('augm')}</li>
      <li>3 ${orb('augm')} → 1 ${orb('alte')}</li>
      <li>3 ${orb('alte')} → 1 ${orb('regal')}</li>
      <li>… et ainsi de suite jusqu'à ${orb('maitre')}</li>
    </ul>
    <p>Conversion à sens unique — pas de retour en arrière. Pense-y avant de tout convertir.</p>

    <h3>🎯 Parcours type : commun → légendaire</h3>
    <ol class="guide-list">
      <li>Loot un objet <b>commun</b> avec un base type qui te plaît.</li>
      <li>${orb('transmu')} → <b>magique</b> (1 affixe).</li>
      <li>${orb('augm')} → 2 affixes. Si pas terrible, ${orb('alte')} pour reroll.</li>
      <li>${orb('regal')} → <b>rare</b> (+1 affixe automatique).</li>
      <li>${orb('exil')} pour ajouter un affixe bonus si l'objet est prometteur.</li>
      <li>${orb('chaos')} pour reroll les affixes restants (verrouille ton meilleur avant 🔒).</li>
      <li>${orb('divin')} ou Reroll+ 💎 pour maximiser les valeurs.</li>
      <li>${orb('pierre')} si tu veux pousser le tier de l'objet.</li>
    </ol>
    <p class="guide-tip">💡 <b>Erreur classique :</b> spammer Chaos sur un objet sans rien verrouiller. Tu reroll tout à chaque fois — tu vas tourner en rond. Verrouille toujours ton meilleur affixe avant.</p>
  `, { wide: true });
}

// ── ⋯ Menu ───────────────────────────────────────────────────
function ovMenu() {
  return `<div class="overlay-backdrop" data-close-overlay="1"></div>
    <div class="menu-sheet">
      <button data-overlay="autosell">⚙ Auto-vente</button>
      <button data-overlay="help">❓ Aide</button>
      <button data-overlay="achievements">🏆 Succès</button>
      <button data-overlay="settings">⚙ Paramètres</button>
      <button data-action="mute">${state.ui?.muted ? '🔇 Son coupé' : '🔊 Son actif'}</button>
      <button data-action="export">⬇ Exporter</button>
      <button data-action="import">⬆ Importer</button>
      <button class="danger" data-action="reset">⚠ Reset</button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// Combat animation helpers (called by main.js fight sequence)
// ─────────────────────────────────────────────────────────────
export function openCombat(monster) { navOverlay('combat', { monster }); }
export function closeCombat() { if (nav.overlay === 'combat') closeOverlay(); }
export function showCombatBars(playerMax, monsterMax) {
  const ph = $('#combat-hero-hp'), mh = $('#combat-mob-hp');
  if (ph) updateBar(ph, playerMax, playerMax);
  if (mh) updateBar(mh, monsterMax, monsterMax);
}
export function hideCombatBars() { /* combat overlay closes via closeCombat() */ }
function updateBar(barEl, cur, max) {
  const fill = barEl.querySelector('.hpbar-fill');
  const txt = barEl.querySelector('.hpbar-text');
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  if (fill) fill.style.width = pct + '%';
  if (txt) txt.textContent = `${Math.max(0, Math.round(cur))}/${Math.round(max)}`;
}
export function updateMonsterHp(cur, max) { const b = $('#combat-mob-hp'); if (b) updateBar(b, cur, max); }
export function updatePlayerHp(cur, max) { const b = $('#combat-hero-hp'); if (b) updateBar(b, cur, max); }
function centerOf(sel, fallback) {
  const el = $(sel);
  if (!el) return fallback || { x: innerWidth / 2, y: innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
export function getMonsterEmojiCenter() { return centerOf('#combat-mob-sprite', { x: innerWidth / 2, y: innerHeight * 0.28 }); }
export function getCharacterAvatarCenter() { return centerOf('#combat-hero-sprite', { x: innerWidth / 2, y: innerHeight * 0.72 }); }
export function getChestCenter() { return centerOf('#chest-sprite', { x: innerWidth / 2, y: innerHeight * 0.4 }); }

export function appendCombatLog(lines, cls = '') {
  const log = $('#combat-log');
  if (!log) return;
  for (const line of (Array.isArray(lines) ? lines : [lines])) {
    const div = document.createElement('div');
    div.className = 'cl-line ' + cls;
    div.textContent = line;
    log.appendChild(div);
  }
  log.scrollTop = log.scrollHeight;
}
export function setCombatCall(text, color = 'var(--gold-200)') {
  const el = $('#combat-call');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

// === Dialog box typewriter — affiche un message lettre par lettre, façon Pokémon ===
let _typewriterTimer = null;
let _typewriterFullText = '';
export function setCombatDialog(text, { speed = 18, instant = false } = {}) {
  const el = $('#combat-dialog-text');
  if (!el) return;
  if (_typewriterTimer) { clearInterval(_typewriterTimer); _typewriterTimer = null; }
  _typewriterFullText = text;
  if (instant) { el.textContent = text; return; }
  el.textContent = '';
  let i = 0;
  _typewriterTimer = setInterval(() => {
    i++;
    el.textContent = text.slice(0, i);
    if (i >= text.length) { clearInterval(_typewriterTimer); _typewriterTimer = null; }
  }, speed);
}
// Permet au moteur de combat de skipper l'effet (clic skip, mode rapide…).
export function completeCombatDialog() {
  if (_typewriterTimer) { clearInterval(_typewriterTimer); _typewriterTimer = null; }
  const el = $('#combat-dialog-text');
  if (el) el.textContent = _typewriterFullText;
}

export function setCombatTurn(n) {
  const el = $('#combat-turn');
  if (el) el.textContent = `Tour ${n}`;
}

// Petite animation de coup : strike CSS pour secouer un fighter, lunge pour le héros.
export function animateCombatSprite(who, kind) {
  // who: 'mob' | 'hero' ; kind: 'hit' | 'attack'
  const sel = who === 'mob' ? '#combat-mob-sprite' : '#combat-hero-sprite';
  const el = $(sel);
  if (!el) return;
  const cls = `cf-anim-${kind}`;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 400);
}

// ─────────────────────────────────────────────────────────────
// Open-chest button cooldown / enable
// ─────────────────────────────────────────────────────────────
export function setOpenButtonEnabled(on) {
  const b = $('#btn-open');
  if (b) b.classList.toggle('is-disabled', !on || !hasKey());
}
// Chest-open burst: lid-lift jolt + expanding white flash. Animates a floating
// CLONE of the sprite (appended to body) because opening the chest mutates
// state → renderAll() rebuilds the live sprite and would cut the animation off.
export function playChestOpen() {
  const sprite = $('#chest-sprite');
  if (!sprite) return;
  const r = sprite.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'chest-ghost chest-opening pixel';
  ghost.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  ghost.innerHTML = sprite.innerHTML;
  const burst = document.createElement('div');
  burst.className = 'chest-burst';
  burst.style.left = (r.left + r.width / 2) + 'px';
  burst.style.top = (r.top + r.height / 2) + 'px';
  document.body.append(ghost, burst);
  setTimeout(() => { ghost.remove(); burst.remove(); }, 640);
}

export function startCooldownAnim() {
  const fill = $('#cooldown-fill');
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '100%';
  requestAnimationFrame(() => {
    fill.style.transition = `width ${CHEST_OPEN_COOLDOWN_MS}ms linear`;
    fill.style.width = '0%';
  });
}

// ── Rarity flash ─────────────────────────────────────────────
export function flashRarity(rarity) {
  const f = document.getElementById('flash');
  if (!f) return;
  const color = RARITY_BY_ID[rarity]?.color || '#fff';
  f.style.background = `radial-gradient(circle, ${color}55, transparent 70%)`;
  f.classList.remove('active'); void f.offsetWidth; f.classList.add('active');
  setTimeout(() => f.classList.remove('active'), 500);
}

// ── Tooltip (desktop hover) ──────────────────────────────────
let tipEl;
export function showTooltip(item, x, y) {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tooltip'; document.body.appendChild(tipEl); }
  tipEl.innerHTML = itemDetailsHTML(item);
  tipEl.classList.remove('hidden');
  const r = tipEl.getBoundingClientRect();
  let left = x + 16, top = y + 16;
  if (left + r.width > innerWidth - 8) left = x - r.width - 16;
  if (top + r.height > innerHeight - 8) top = innerHeight - r.height - 8;
  tipEl.style.left = Math.max(8, left) + 'px';
  tipEl.style.top = Math.max(8, top) + 'px';
}
export function hideTooltip() { if (tipEl) tipEl.classList.add('hidden'); }

// ── Toast ────────────────────────────────────────────────────
export function showToast(emoji, title, reward = '') {
  const wrap = document.getElementById('toast-container');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="toast-emoji">${emoji}</span><div class="toast-content"><div class="toast-title">${title}</div>${reward ? `<div class="toast-reward">${reward}</div>` : ''}</div>`;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 400); }, 3200);
}

// ── Lookup helpers ───────────────────────────────────────────
export function findAnyItem(id) {
  return state.inventory.find(i => i.id === id)
    || Object.values(state.equipment).find(i => i && i.id === id)
    || (currentDrop && currentDrop.id === id ? currentDrop : null);
}
export function getInvFilter() { return invFilter; }
export function getOverlayParam(key) { return nav.params ? nav.params[key] : undefined; }
