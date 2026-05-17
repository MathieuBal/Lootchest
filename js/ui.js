// All DOM rendering and visual effects.
import { state } from './state.js';
import {
  RARITIES, RARITY_BY_ID, SLOTS, SLOT_BY_ID,
  AUTOSELL_UNLOCK_COSTS, CHEST_TIERS, CHEST_OPEN_COOLDOWN_MS, PITY_THRESHOLD,
  ACHIEVEMENTS,
} from './data.js';
import { computeStats, computePower, computeSetSummary } from './character.js';
import { getCurrentTier, getNextTier, canUpgrade, cooldownRemaining, nextTierLockedBy } from './chest.js';
import { generateMonster, predictDifficulty, isBossFloor } from './combat.js';
import { biomeForFloor } from './data.js';
import { FORGE_ACTIONS, availableMasterCraftAffixes } from './forge.js';
import { shardYield } from './inventory.js';
import { CURRENCY_TYPES, CURRENCY_BY_ID, AFFIXES_BY_ID } from './data.js';
import { getAchievementProgress } from './achievements.js';
import { canAscend, ascensionRequirements } from './prestige.js';
import { SETS_BY_ID, SETS, TALENTS, TALENT_BY_ID, UNIQUE_LEGENDARIES, BIOMES } from './data.js';
import { rankOf, canUpgradeTalent } from './talents.js';
import { chestSpriteSVG, characterSpriteSVG, composedSpriteSVG } from './sprites.js';
import { getCompositionLayers } from './parts.js';

// === Item icon helpers ===

export function itemIconHTML(item, { big = false } = {}) {
  const r = RARITY_BY_ID[item.rarity];
  const inner = itemVisualHTML(item, big);
  return `<div class="item-icon r-${r.cssClass}${big ? ' item-icon-big' : ''}${item.parts ? ' item-icon-composed' : ''}" data-item-id="${item.id}">${inner}</div>`;
}

function itemVisualHTML(item, big = false) {
  if (item.parts) {
    const layers = getCompositionLayers(item.baseTypeId, item.parts);
    return composedSpriteSVG(layers, big ? 64 : 40);
  }
  return item.emoji || '❔';
}

function itemTotalStats(item) {
  const total = {};
  for (const [k, v] of Object.entries(item.baseStats || {})) total[k] = (total[k] || 0) + v;
  for (const a of item.affixes || []) total[a.stat] = (total[a.stat] || 0) + a.value;
  return total;
}

const PCT_STATS = new Set(['crit', 'fireDmg', 'goldFind', 'speed']);

function comparisonHTML(item) {
  // Only show comparison if item is in inventory AND another item is equipped in same slot
  const equipped = state.equipment[item.slot];
  if (!equipped || equipped.id === item.id) return '';
  const inInventory = state.inventory.some(i => i.id === item.id);
  if (!inInventory) return '';
  const a = itemTotalStats(item);
  const b = itemTotalStats(equipped);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const rows = [];
  for (const k of keys) {
    const diff = (a[k] || 0) - (b[k] || 0);
    if (diff === 0) continue;
    const cls = diff > 0 ? 'better' : 'worse';
    const sign = diff > 0 ? '+' : '';
    rows.push(`<div class="${cls}">${sign}${diff}${PCT_STATS.has(k) ? '%' : ''} ${statLabel(k)}</div>`);
  }
  if (rows.length === 0) {
    return `<div class="tt-compare"><div class="tt-compare-title">vs équipé</div><div class="same">Identique</div></div>`;
  }
  return `<div class="tt-compare"><div class="tt-compare-title">vs équipé</div>${rows.join('')}</div>`;
}

function affixTypeBadge(aff) {
  const t = aff.type || AFFIXES_BY_ID[aff.id]?.type;
  if (t === 'prefix') return '<span class="affix-type p">P</span>';
  if (t === 'suffix') return '<span class="affix-type s">S</span>';
  return '';
}

export function itemDetailsHTML(item) {
  const r = RARITY_BY_ID[item.rarity];
  const slot = SLOT_BY_ID[item.slot];
  const baseLines = Object.entries(item.baseStats || {})
    .map(([k, v]) => `<div class="tt-base">+${v} ${statLabel(k)}</div>`).join('');
  const affixLines = (item.affixes || [])
    .map(a => `<div class="tt-affix">${affixTypeBadge(a)}${a.value > 0 ? '+' : ''}${a.value}${a.percent ? '%' : ''} ${a.label}</div>`).join('');
  const uniqueBadge = item.uniqueId ? '<span class="unique-badge">UNIQUE</span>' : '';
  let setBlock = '';
  if (item.setId) {
    const set = SETS_BY_ID[item.setId];
    if (set) {
      setBlock = `<div class="tt-set" style="color:${set.color};border-color:${set.color}">Set : ${set.name}</div>`;
    }
  }
  const flavor = item.flavor ? `<div class="tt-flavor">"${item.flavor}"</div>` : '';
  return `
    <div class="tt-name rt-${r.cssClass}">${item.name}${uniqueBadge}</div>
    <div class="tt-slot">T${item.chestTier} · ${slot.name} — <span class="rarity-tag rt-${r.cssClass}">${r.name}</span></div>
    ${setBlock}
    ${baseLines}
    ${affixLines}
    ${flavor}
    <div class="tt-value">💰 ${item.goldValue} or · 💎 ${shardYield(item)} ${r.name}</div>
    ${comparisonHTML(item)}
  `;
}

function statLabel(key) {
  return {
    vitality: 'Vie',
    damage: 'Dégâts',
    armor: 'Armure',
    crit: '% Crit',
    fireDmg: '% Feu',
    goldFind: '% Or',
    speed: '% Vitesse',
  }[key] || key;
}

// === HUD ===

function renderHUD() {
  const tier = getCurrentTier();
  document.getElementById('hud-gold').textContent = state.gold.toLocaleString('fr-FR');
  document.getElementById('hud-tier').textContent = tier.tier;
  document.getElementById('hud-tier-name').textContent = tier.name;
  document.getElementById('hud-opened').textContent = state.opened.toLocaleString('fr-FR');
  document.getElementById('hud-power').textContent = computePower(computeStats()).toLocaleString('fr-FR');
  const ap = getAchievementProgress();
  document.getElementById('ach-count').textContent = ap.unlocked;
  document.getElementById('ach-total').textContent = ap.total;
  // Prestige badge
  const prestigeLevel = state.prestige?.level || 0;
  const prestigeEl = document.getElementById('hud-prestige');
  if (prestigeLevel > 0) {
    prestigeEl.style.display = '';
    document.getElementById('hud-prestige-level').textContent = prestigeLevel;
  } else {
    prestigeEl.style.display = 'none';
  }
  // Ascend button enable/disable
  const reqs = ascensionRequirements();
  const ascendBtn = document.getElementById('btn-ascend');
  ascendBtn.disabled = !canAscend();
  ascendBtn.title = canAscend()
    ? `Effectue une ascension (Niv ${prestigeLevel} → ${prestigeLevel + 1})`
    : `Ascension : requiert T${reqs.minChestTier} + étage ${reqs.minFloor}`;

  // Shards display
  renderShards();

  // Talent points badge
  const pts = state.talentPoints || 0;
  const badge = document.getElementById('talent-points-badge');
  if (badge) {
    badge.textContent = pts;
    badge.style.color = pts > 0 ? '#6acc6a' : '';
  }
}

export function renderTalentsModal() {
  document.getElementById('talent-points-display').textContent = state.talentPoints || 0;
  const grid = document.getElementById('talents-grid');
  grid.innerHTML = '';
  for (const t of TALENTS) {
    const rank = rankOf(t.id);
    const max = t.maxRank;
    const ratio = rank / max;
    const canBuy = canUpgradeTalent(t.id);
    const isMax = rank >= max;
    const el = document.createElement('div');
    el.className = 'talent' + (isMax ? ' maxed' : '') + (rank > 0 ? ' has-rank' : '');
    el.innerHTML = `
      <div class="talent-emoji">${t.emoji}</div>
      <div class="talent-info">
        <div class="talent-name">${t.name}</div>
        <div class="talent-desc">${t.desc}</div>
        <div class="talent-bar"><div class="talent-bar-fill" style="width:${ratio * 100}%"></div></div>
        <div class="talent-rank">${rank}/${max}${rank > 0 ? ` · effet : ${formatTalentEffect(t, rank)}` : ''}</div>
      </div>
      <button class="btn btn-small talent-buy" data-talent="${t.id}" ${canBuy ? '' : 'disabled'}>${isMax ? 'MAX' : '+1'}</button>
    `;
    grid.appendChild(el);
  }
}

function formatTalentEffect(t, rank) {
  const eff = t.perRank;
  const entries = Object.entries(eff).map(([k, v]) => {
    const total = v * rank;
    const isMult = k.endsWith('Mult');
    if (isMult) return `+${Math.round(total * 100)}%`;
    return `+${total}`;
  });
  return entries.join(' · ');
}

function renderShards() {
  const el = document.getElementById('hud-shards');
  const shards = state.shards || {};
  const nonZero = RARITIES.filter(r => (shards[r.id] || 0) > 0);
  if (nonZero.length === 0) {
    el.style.display = 'none';
  } else {
    el.style.display = '';
    el.innerHTML = nonZero.map(r =>
      `<span class="shard-chip shard-c-${r.cssClass}" title="${r.name}"><span class="shard-gem shard-g-${r.cssClass}"></span>${shards[r.id].toLocaleString('fr-FR')}</span>`
    ).join('');
  }
  renderOrbs();
}

function renderOrbs() {
  const el = document.getElementById('hud-orbs');
  const orbs = state.orbs || {};
  const nonZero = CURRENCY_TYPES.filter(c => (orbs[c.id] || 0) > 0);
  if (nonZero.length === 0) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.innerHTML = nonZero.map(c =>
    `<span class="orb-chip" style="border-color:${c.color};color:${c.color}" title="${c.name}: ${c.desc}">${c.emoji}<span class="orb-count">${orbs[c.id]}</span></span>`
  ).join('');
}

// === Chest panel ===

function renderChest() {
  const tier = getCurrentTier();
  const next = getNextTier();
  // Render pixel-art chest sprite (replaces emoji)
  const chestEl = document.getElementById('chest-emoji');
  chestEl.innerHTML = chestSpriteSVG(tier.tier, 96);
  document.getElementById('chest-tier-label').textContent = `Tier ${tier.tier} — ${tier.name}`;

  if (next) {
    const lockedBy = nextTierLockedBy();
    if (lockedBy) {
      document.getElementById('next-tier-name').textContent = `${next.name} 🔒`;
      document.getElementById('upgrade-cost').textContent = `Ascension Niv ${lockedBy}`;
    } else {
      document.getElementById('next-tier-name').textContent = next.name;
      document.getElementById('upgrade-cost').textContent = tier.upgradeCost.toLocaleString('fr-FR');
    }
    const btn = document.getElementById('btn-upgrade');
    btn.disabled = !canUpgrade();
    btn.style.display = '';
  } else {
    document.getElementById('next-tier-name').textContent = '— MAX —';
    document.getElementById('upgrade-cost').textContent = '∞';
    document.getElementById('btn-upgrade').style.display = 'none';
  }

  // Pity bar
  const pityCount = Math.min(PITY_THRESHOLD, state.pity.sinceLegendary);
  document.getElementById('pity-count').textContent = pityCount;
  document.getElementById('pity-max').textContent = PITY_THRESHOLD;
  document.getElementById('pity-fill').style.width = `${(pityCount / PITY_THRESHOLD) * 100}%`;
}

// === Dungeon panel ===

function renderDungeon() {
  const floor = state.combat.currentFloor;
  document.getElementById('dungeon-floor-num').textContent = floor;
  document.getElementById('dungeon-best').textContent = state.combat.highestUnlocked;
  document.getElementById('dungeon-kills').textContent = state.combat.kills;
  document.getElementById('dungeon-deaths').textContent = state.combat.deaths;
  document.getElementById('dungeon-boss-kills').textContent = state.combat.bossKills;
  document.getElementById('tab-badge-dungeon').textContent = state.combat.highestUnlocked;

  // Floor selector buttons
  document.getElementById('btn-floor-prev').disabled = floor <= 1;
  document.getElementById('btn-floor-next').disabled = floor >= state.combat.highestUnlocked;

  const biome = biomeForFloor(floor);
  document.getElementById('dungeon-biome').textContent = `${biome.emoji} ${biome.name}`;

  const monster = generateMonster(floor);
  const card = document.getElementById('monster-card');
  card.classList.toggle('boss', monster.isBoss);
  // Apply biome background to the monster card
  card.style.background = biome.bgGradient;
  document.getElementById('monster-emoji').textContent = monster.emoji;
  document.getElementById('monster-name').textContent = monster.name;
  document.getElementById('monster-stats').innerHTML =
    `<span>❤️ ${monster.hp}</span><span>⚔️ ${monster.damage}</span><span>🛡 ${monster.armor}</span><span>💰 ${monster.goldReward}</span>`;
  const diff = predictDifficulty(monster);
  const diffEl = document.getElementById('monster-difficulty');
  diffEl.textContent = diff.label;
  diffEl.style.color = diff.color;
  diffEl.style.borderColor = diff.color;
}

// === Tab switching ===

export function setActiveTab(tabId) {
  state.ui.leftTab = tabId;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('hidden', c.dataset.content !== tabId);
  });
}

// === Auto-sell panel ===

function renderAutoSell() {
  const grid = document.getElementById('autosell-grid');
  grid.innerHTML = '';
  for (const r of RARITIES) {
    if (AUTOSELL_UNLOCK_COSTS[r.id] === null) continue;       // skip ancestral
    const slot = state.autoSell[r.id];
    const row = document.createElement('div');
    row.className = 'autosell-row';
    const cost = AUTOSELL_UNLOCK_COSTS[r.id];
    let toggleHTML;
    if (slot.unlocked) {
      toggleHTML = `<button class="autosell-toggle ${slot.on ? 'on' : ''}" data-rarity="${r.id}" data-action="toggle">${slot.on ? 'ON' : 'OFF'}</button>`;
    } else {
      toggleHTML = `<button class="autosell-toggle locked" data-rarity="${r.id}" data-action="unlock" ${state.gold < cost ? 'disabled' : ''}>${cost.toLocaleString('fr-FR')} 💰</button>`;
    }
    row.innerHTML = `<span class="rarity-tag rt-${r.cssClass}">${r.name}</span>${toggleHTML}`;
    grid.appendChild(row);
  }
}

// === Character panel ===

function renderCharacter() {
  // Render pixel-art character sprite
  const avatarEl = document.getElementById('character-avatar');
  if (avatarEl) avatarEl.innerHTML = characterSpriteSVG(80);

  const grid = document.getElementById('equipment-grid');
  grid.innerHTML = '';
  for (const slot of SLOTS) {
    const item = state.equipment[slot.id];
    const slotEl = document.createElement('div');
    slotEl.className = 'equipment-slot' + (item ? '' : ' empty');
    slotEl.dataset.slotId = slot.id;
    if (item) {
      const r = RARITY_BY_ID[item.rarity];
      slotEl.style.borderColor = r.color;
      slotEl.innerHTML = `<div class="slot-visual">${itemVisualHTML(item)}</div><span class="slot-label">${slot.name}</span>`;
      slotEl.dataset.itemId = item.id;
    } else {
      slotEl.innerHTML = `<span style="opacity:0.3">${slot.emptyEmoji}</span><span class="slot-label">${slot.name}</span>`;
    }
    grid.appendChild(slotEl);
  }

  // Set summary
  const setSummary = computeSetSummary();
  const setEl = document.getElementById('set-summary');
  setEl.innerHTML = '';
  for (const s of setSummary) {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.style.borderColor = s.color;
    row.innerHTML = `
      <span class="set-name" style="color:${s.color}">${s.setName}</span>
      <span class="set-count">${s.count}/${s.totalPieces}</span>
    `;
    setEl.appendChild(row);
    if (s.activeBonuses.length > 0) {
      const bonusList = document.createElement('div');
      bonusList.className = 'set-bonuses';
      bonusList.innerHTML = s.activeBonuses.map(b =>
        `<div class="active">(${b.threshold}) +${b.value}${b.percent ? '%' : ''} ${b.label}</div>`
      ).join('');
      setEl.appendChild(bonusList);
    }
  }

  const stats = computeStats();
  const statsEl = document.getElementById('character-stats');
  const lines = [
    ['❤️ Vie',      stats.vitality || 0, false],
    ['⚔️ Dégâts',   stats.damage || 0, false],
    ['🛡 Armure',   stats.armor || 0, false],
    ['💥 Crit',     stats.crit || 0, true],
    ['🔥 Feu',      stats.fireDmg || 0, true],
    ['💰 Or trouvé', stats.goldFind || 0, true],
  ];
  statsEl.innerHTML = lines.map(([name, val, pct]) =>
    `<div class="stat-line"><span class="stat-name">${name}</span><span class="stat-value">${val}${pct ? '%' : ''}</span></div>`
  ).join('');
}

// === Inventory ===

function renderInventoryFilter() {
  const sel = document.getElementById('inv-filter');
  // Re-render only if not already filled (keep current selection)
  if (sel.options.length > 1) return;
  for (const r of RARITIES) {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = `<= ${r.name}`;
    sel.appendChild(opt);
  }
}

let invSortMode = 'rarity';
let invSearchText = '';

export function setInvSortMode(mode) { invSortMode = mode; renderInventory(); }
export function setInvSearchText(text) { invSearchText = (text || '').toLowerCase(); renderInventory(); }

function sortInventory(items, mode) {
  const rarityOrder = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));
  const slotOrder = Object.fromEntries(SLOTS.map((s, i) => [s.id, i]));
  const arr = [...items];
  switch (mode) {
    case 'value':
      arr.sort((a, b) => b.goldValue - a.goldValue || rarityOrder[b.rarity] - rarityOrder[a.rarity]);
      break;
    case 'tier':
      arr.sort((a, b) => b.chestTier - a.chestTier || rarityOrder[b.rarity] - rarityOrder[a.rarity]);
      break;
    case 'slot':
      arr.sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot] || rarityOrder[b.rarity] - rarityOrder[a.rarity]);
      break;
    case 'rarity':
    default:
      arr.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity] || b.goldValue - a.goldValue);
  }
  return arr;
}

function renderInventory() {
  document.getElementById('inv-count').textContent = state.inventory.length;
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';

  let items = state.inventory;
  if (invSearchText) {
    items = items.filter(it =>
      it.name.toLowerCase().includes(invSearchText)
      || (it.setId || '').toLowerCase().includes(invSearchText)
      || (it.flavor || '').toLowerCase().includes(invSearchText)
    );
  }
  const sorted = sortInventory(items, invSortMode);

  for (const item of sorted) {
    const el = document.createElement('div');
    el.innerHTML = itemIconHTML(item);
    const icon = el.firstChild;
    icon.dataset.itemId = item.id;
    grid.appendChild(icon);
  }
}

// === Tooltip ===

const tooltipEl = () => document.getElementById('tooltip');

export function showTooltip(item, x, y) {
  const tt = tooltipEl();
  tt.innerHTML = itemDetailsHTML(item);
  tt.classList.remove('hidden');
  positionTooltip(x, y);
}

export function moveTooltip(x, y) {
  if (tooltipEl().classList.contains('hidden')) return;
  positionTooltip(x, y);
}

function positionTooltip(x, y) {
  const tt = tooltipEl();
  const rect = tt.getBoundingClientRect();
  let left = x + 16;
  let top = y + 16;
  if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 16;
  if (top + rect.height > window.innerHeight - 8) top = y - rect.height - 16;
  tt.style.left = Math.max(8, left) + 'px';
  tt.style.top = Math.max(8, top) + 'px';
}

export function hideTooltip() {
  tooltipEl().classList.add('hidden');
}

// === Drop popup ===

let currentDrop = null;

export function showDropPopup(item) {
  currentDrop = item;
  const popup = document.getElementById('drop-popup');
  const inner = document.getElementById('drop-item');
  inner.innerHTML = `
    ${itemIconHTML(item, { big: true })}
    <div class="item-name rt-${RARITY_BY_ID[item.rarity].cssClass}">${item.name}</div>
    <div class="item-details">
      ${Object.entries(item.baseStats || {}).map(([k, v]) => `<div>+${v} ${statLabel(k)}</div>`).join('')}
      ${(item.affixes || []).map(a => `<div class="item-affix">+${a.value}${a.percent ? '%' : ''} ${a.label}</div>`).join('')}
    </div>
  `;
  document.getElementById('drop-sell-value').textContent = item.goldValue.toLocaleString('fr-FR');
  popup.classList.remove('hidden');
}

export function hideDropPopup() {
  currentDrop = null;
  document.getElementById('drop-popup').classList.add('hidden');
}

export function getCurrentDrop() {
  return currentDrop;
}

// === Flash effect ===

export function flashRarity(rarityId) {
  const r = RARITY_BY_ID[rarityId];
  const flash = document.getElementById('flash');
  flash.style.background = `radial-gradient(circle, ${r.color}cc 0%, transparent 70%)`;
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 250);

  const chest = document.getElementById('chest-emoji');
  chest.classList.remove('shake');
  void chest.offsetWidth;
  chest.classList.add('shake');
}

// === Cooldown bar ===

let cooldownAnimId = null;
export function startCooldownAnim() {
  const bar = document.getElementById('cooldown-bar');
  const start = Date.now();
  const total = CHEST_OPEN_COOLDOWN_MS;
  if (cooldownAnimId) cancelAnimationFrame(cooldownAnimId);
  function tick() {
    const elapsed = Date.now() - start;
    const ratio = Math.min(1, elapsed / total);
    bar.style.transform = `scaleX(${ratio})`;
    if (ratio < 1) {
      cooldownAnimId = requestAnimationFrame(tick);
    } else {
      bar.style.transform = 'scaleX(1)';
      // briefly fade back
      setTimeout(() => { bar.style.transform = 'scaleX(0)'; }, 80);
      cooldownAnimId = null;
    }
  }
  bar.style.transform = 'scaleX(0)';
  tick();
}

export function setOpenButtonEnabled(enabled) {
  document.getElementById('btn-open').disabled = !enabled;
}

// === Master render ===

// === Combat HP bars ===

export function showCombatBars(playerMaxHp, monsterMaxHp) {
  document.getElementById('monster-card').classList.add('combat');
  document.getElementById('monster-hp-wrap').classList.remove('hidden');
  document.getElementById('player-hp-wrap').classList.remove('hidden');
  updateMonsterHp(monsterMaxHp, monsterMaxHp);
  updatePlayerHp(playerMaxHp, playerMaxHp);
}

export function hideCombatBars() {
  document.getElementById('monster-card').classList.remove('combat');
  document.getElementById('monster-hp-wrap').classList.add('hidden');
  document.getElementById('player-hp-wrap').classList.add('hidden');
}

export function updateMonsterHp(current, max) {
  const pct = Math.max(0, (current / max) * 100);
  document.getElementById('monster-hp-fill').style.width = `${pct}%`;
  document.getElementById('monster-hp-label').textContent = `${Math.max(0, Math.round(current))}/${Math.round(max)}`;
}

export function updatePlayerHp(current, max) {
  const pct = Math.max(0, (current / max) * 100);
  document.getElementById('player-hp-fill').style.width = `${pct}%`;
  document.getElementById('player-hp-label').textContent = `${Math.max(0, Math.round(current))}/${Math.round(max)}`;
}

export function getMonsterEmojiCenter() {
  const el = document.getElementById('monster-emoji');
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function getCharacterAvatarCenter() {
  const el = document.getElementById('character-avatar');
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function getChestCenter() {
  const el = document.getElementById('chest-emoji');
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// === Combat log ===

export function appendCombatLog(lines, type = '') {
  const log = document.getElementById('combat-log');
  // Clear empty placeholder
  const empty = log.querySelector('.combat-log-empty');
  if (empty) empty.remove();
  // Add divider
  if (log.children.length > 0) {
    const div = document.createElement('div');
    div.style.cssText = 'border-top: 1px dashed var(--border); margin: 4px 0;';
    log.appendChild(div);
  }
  for (const line of lines) {
    const el = document.createElement('div');
    el.className = `combat-log-line ${type}`;
    el.textContent = line;
    log.appendChild(el);
  }
  log.scrollTop = log.scrollHeight;
  // Trim log to last ~30 lines
  while (log.children.length > 40) log.removeChild(log.firstChild);
}

// === Achievements modal ===

export function renderAchievementsModal() {
  const ap = getAchievementProgress();
  document.getElementById('modal-ach-count').textContent = ap.unlocked;
  document.getElementById('modal-ach-total').textContent = ap.total;
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = '';
  for (const ach of ACHIEVEMENTS) {
    const unlocked = !!state.achievements.unlocked[ach.id];
    const el = document.createElement('div');
    el.className = 'achievement ' + (unlocked ? 'unlocked' : 'locked');
    el.innerHTML = `
      <div class="ach-emoji">${ach.emoji}</div>
      <div class="ach-info">
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
        ${ach.reward?.gold ? `<div class="ach-reward">+${ach.reward.gold.toLocaleString('fr-FR')} 💰</div>` : ''}
      </div>
    `;
    grid.appendChild(el);
  }
}

// === Toasts ===

export function showToast(emoji, title, subtitle) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-emoji">${emoji}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${subtitle ? `<div class="toast-reward">${subtitle}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

// === Forge modal ===

let forgeSelectedItemId = null;
let forgeMode = 'actions';  // 'actions' | 'master-craft'

export function setForgeSelected(itemId) {
  forgeSelectedItemId = itemId;
  forgeMode = 'actions';
  renderForgeModal();
}

export function getForgeSelectedId() {
  return forgeSelectedItemId;
}

export function setForgeMode(mode) {
  forgeMode = mode;
  renderForgeModal();
}

export function getForgeMode() {
  return forgeMode;
}

export function renderForgeModal() {
  const invGrid = document.getElementById('forge-inventory');
  invGrid.innerHTML = '';
  const rarityOrder = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));
  const sorted = [...state.inventory].sort((a, b) => {
    return rarityOrder[b.rarity] - rarityOrder[a.rarity] || b.goldValue - a.goldValue;
  });
  for (const item of sorted) {
    const el = document.createElement('div');
    el.innerHTML = itemIconHTML(item);
    const icon = el.firstChild;
    icon.dataset.itemId = item.id;
    if (item.id === forgeSelectedItemId) icon.classList.add('selected');
    invGrid.appendChild(icon);
  }

  // If selected item is gone (sold/equipped), clear selection
  const selected = state.inventory.find(i => i.id === forgeSelectedItemId);
  const selectedPanel = document.getElementById('forge-selected');
  if (!selected) {
    forgeSelectedItemId = null;
    selectedPanel.classList.add('hidden');
    return;
  }
  selectedPanel.classList.remove('hidden');

  // Preview
  const r = RARITY_BY_ID[selected.rarity];
  const slot = SLOT_BY_ID[selected.slot];
  document.getElementById('forge-preview').innerHTML = `
    ${itemIconHTML(selected, { big: true })}
    <div class="forge-preview-info">
      <div class="forge-preview-name rt-${r.cssClass}">${selected.name}</div>
      <div style="color: var(--text-dim);">T${selected.chestTier} · ${slot.name} · <span class="rt-${r.cssClass}">${r.name}</span> · ${selected.affixes.length} affixe${selected.affixes.length > 1 ? 's' : ''}</div>
      ${Object.entries(selected.baseStats || {}).map(([k, v]) => `<div>+${v} ${statLabel(k)}</div>`).join('')}
      ${(selected.affixes || []).map(a => `<div class="item-affix">+${a.value}${a.percent ? '%' : ''} ${a.label}</div>`).join('')}
      <div style="color: var(--gold); margin-top: 4px;">💰 ${selected.goldValue}</div>
    </div>
  `;

  const actionsEl = document.getElementById('forge-actions');
  if (forgeMode === 'master-craft') {
    renderMasterCraftPanel(actionsEl, selected);
  } else {
    renderForgeActionsPanel(actionsEl, selected);
  }
}

function renderForgeActionsPanel(actionsEl, selected) {
  actionsEl.innerHTML = '';
  for (const action of FORGE_ACTIONS) {
    const enabled = action.can(selected);
    let costHTML;
    if (action.orb) {
      const orbDef = CURRENCY_BY_ID[action.orb];
      const have = state.orbs[action.orb] || 0;
      const haveColor = have >= 1 ? orbDef.color : '#666';
      costHTML = `<div class="forge-cost" style="color:${haveColor}">${orbDef.emoji} ${have}</div>`;
    } else if (action.shards) {
      const have = state.shards[selected.rarity] || 0;
      const haveColor = have >= action.shards ? '#a0e0ff' : '#666';
      costHTML = `<div class="forge-cost" style="color:${haveColor}">${have}/${action.shards} 💎</div>`;
    } else {
      costHTML = '';
    }
    const btn = document.createElement('button');
    btn.className = 'btn forge-btn';
    btn.dataset.forgeAction = action.id;
    btn.disabled = !enabled;
    btn.innerHTML = `
      <div class="forge-btn-label">${action.label}</div>
      <div class="forge-btn-desc">${action.desc}</div>
      ${costHTML}
    `;
    actionsEl.appendChild(btn);
  }
}

function renderMasterCraftPanel(actionsEl, selected) {
  const available = availableMasterCraftAffixes(selected);
  const usedStats = new Set(selected.affixes.map(a => a.stat));
  const orbCount = state.orbs.maitre || 0;
  let html = `
    <div class="master-craft-header">
      <div>🟪 Choisis un affixe à ajouter — coût : 1 🟪 (${orbCount} disponible)</div>
      <button class="btn btn-small" data-forge-action="cancel-master">← Retour</button>
    </div>
    <div class="master-craft-list">
  `;
  // Show all affixes, marking unavailable ones
  for (const def of AFFIXES_LIST_FOR_UI()) {
    const isAvailable = available.includes(def);
    const isPresent = usedStats.has(def.stat);
    const typeLetter = def.type === 'prefix' ? 'P' : 'S';
    const minMax = `+${def.min * selected.chestTier}-${def.max * selected.chestTier}${def.percent ? '%' : ''}`;
    let status;
    if (isPresent) status = '<span class="mc-status present">déjà présent</span>';
    else if (!isAvailable) status = '<span class="mc-status full">slot plein</span>';
    else if (orbCount < 1) status = '<span class="mc-status full">pas d\'orbe</span>';
    else status = '<span class="mc-status ok">disponible</span>';
    const btnClass = (isAvailable && orbCount >= 1) ? '' : ' disabled';
    html += `
      <div class="mc-row${btnClass}" data-affix-id="${def.id}">
        <span class="affix-type ${def.type === 'prefix' ? 'p' : 's'}">${typeLetter}</span>
        <span class="mc-name">${def.label}</span>
        <span class="mc-range">${minMax}</span>
        ${status}
      </div>
    `;
  }
  html += '</div>';
  actionsEl.innerHTML = html;
}

// Tiny helper to fetch the list (used by master craft) without a circular import
function AFFIXES_LIST_FOR_UI() {
  return Object.values(AFFIXES_BY_ID);
}

// === Modal show/hide ===

export function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'achievements-modal') renderAchievementsModal();
  if (id === 'forge-modal') renderForgeModal();
  if (id === 'talents-modal') renderTalentsModal();
  if (id === 'codex-modal') renderCodexModal();
}

export function renderCodexModal() {
  const codex = state.codex || { uniques: {}, sets: {}, bosses: {} };
  const uniquesFound = Object.keys(codex.uniques).length;
  const setsFound = Object.keys(codex.sets).length;
  const bossesFound = Object.keys(codex.bosses).length;
  const total = UNIQUE_LEGENDARIES.length + SETS.length + BIOMES.length;
  const found = uniquesFound + setsFound + bossesFound;
  const pct = Math.round((found / total) * 100);

  document.getElementById('codex-pct').textContent = pct;
  document.getElementById('codex-uniques-count').textContent = uniquesFound;
  document.getElementById('codex-uniques-total').textContent = UNIQUE_LEGENDARIES.length;
  document.getElementById('codex-sets-count').textContent = setsFound;
  document.getElementById('codex-sets-total').textContent = SETS.length;
  document.getElementById('codex-bosses-count').textContent = bossesFound;
  document.getElementById('codex-bosses-total').textContent = BIOMES.length;

  // Uniques
  const uniquesEl = document.getElementById('codex-uniques');
  uniquesEl.innerHTML = '';
  for (const u of UNIQUE_LEGENDARIES) {
    const known = !!codex.uniques[u.id];
    const el = document.createElement('div');
    el.className = 'codex-entry' + (known ? ' known' : ' locked');
    el.innerHTML = known
      ? `<div class="codex-emoji">${u.emoji}</div>
         <div class="codex-info">
           <div class="codex-name rt-legendary">${u.name}</div>
           <div class="codex-flavor">"${u.flavor}"</div>
         </div>`
      : `<div class="codex-emoji">❓</div>
         <div class="codex-info">
           <div class="codex-name">??? (légendaire)</div>
           <div class="codex-flavor">Loot un légendaire unique pour le découvrir.</div>
         </div>`;
    uniquesEl.appendChild(el);
  }

  // Sets
  const setsEl = document.getElementById('codex-sets');
  setsEl.innerHTML = '';
  for (const s of SETS) {
    const piecesSeen = codex.sets[s.id] || 0;
    const known = piecesSeen > 0;
    const totalPieces = Object.keys(s.pieces).length;
    const bonuses = Object.entries(s.bonuses).map(([k, b]) => `(${k}) ${b.map(bb => `+${bb.value}${bb.percent?'%':''} ${bb.label}`).join(', ')}`).join(' · ');
    const el = document.createElement('div');
    el.className = 'codex-entry' + (known ? ' known' : ' locked');
    el.innerHTML = known
      ? `<div class="codex-emoji" style="color:${s.color}">●</div>
         <div class="codex-info">
           <div class="codex-name" style="color:${s.color}">Set ${s.name}</div>
           <div class="codex-flavor">${piecesSeen} pièce${piecesSeen>1?'s':''} découverte${piecesSeen>1?'s':''} / ${totalPieces} · ${bonuses}</div>
         </div>`
      : `<div class="codex-emoji">❓</div>
         <div class="codex-info">
           <div class="codex-name">??? (set)</div>
           <div class="codex-flavor">Trouve une pièce de ce set pour le découvrir.</div>
         </div>`;
    setsEl.appendChild(el);
  }

  // Bosses
  const bossesEl = document.getElementById('codex-bosses');
  bossesEl.innerHTML = '';
  for (const b of BIOMES) {
    const kills = codex.bosses[b.id] || 0;
    const known = kills > 0;
    const el = document.createElement('div');
    el.className = 'codex-entry' + (known ? ' known' : ' locked');
    el.innerHTML = known
      ? `<div class="codex-emoji">${b.boss.emoji}</div>
         <div class="codex-info">
           <div class="codex-name">${b.boss.name}</div>
           <div class="codex-flavor">${b.emoji} ${b.name} · ${kills} kill${kills>1?'s':''}</div>
         </div>`
      : `<div class="codex-emoji">❓</div>
         <div class="codex-info">
           <div class="codex-name">??? (boss ${b.emoji} ${b.name})</div>
           <div class="codex-flavor">Tue ce boss pour le découvrir.</div>
         </div>`;
    bossesEl.appendChild(el);
  }
}

export function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

export function isModalOpen(id) {
  return !document.getElementById(id).classList.contains('hidden');
}

export function renderAll() {
  renderHUD();
  renderChest();
  renderAutoSell();
  renderCharacter();
  renderInventoryFilter();
  renderInventory();
  renderDungeon();
  // Re-render open modals if needed
  if (isModalOpen('forge-modal')) renderForgeModal();
  if (isModalOpen('achievements-modal')) renderAchievementsModal();
  if (isModalOpen('talents-modal')) renderTalentsModal();
  if (isModalOpen('codex-modal')) renderCodexModal();
}
