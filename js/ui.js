// All DOM rendering and visual effects.
import { state } from './state.js';
import {
  RARITIES, RARITY_BY_ID, SLOTS, SLOT_BY_ID,
  AUTOSELL_UNLOCK_COSTS, CHEST_TIERS, CHEST_OPEN_COOLDOWN_MS, PITY_THRESHOLD,
  ACHIEVEMENTS,
} from './data.js';
import { computeStats, computePower, computeSetSummary } from './character.js';
import { getCurrentTier, getNextTier, canUpgrade, cooldownRemaining } from './chest.js';
import { generateMonster, predictDifficulty, isBossFloor } from './combat.js';
import { rerollCost, upgradeTierCost, transmuteCost, canReroll, canUpgradeTier, canTransmute } from './forge.js';
import { getAchievementProgress } from './achievements.js';
import { canAscend, ascensionRequirements } from './prestige.js';
import { SETS_BY_ID } from './data.js';
import { chestSpriteSVG, characterSpriteSVG } from './sprites.js';

// === Item icon helpers ===

export function itemIconHTML(item, { big = false } = {}) {
  const r = RARITY_BY_ID[item.rarity];
  return `<div class="item-icon r-${r.cssClass}${big ? ' item-icon-big' : ''}" data-item-id="${item.id}">${item.emoji || '❔'}</div>`;
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

export function itemDetailsHTML(item) {
  const r = RARITY_BY_ID[item.rarity];
  const slot = SLOT_BY_ID[item.slot];
  const baseLines = Object.entries(item.baseStats || {})
    .map(([k, v]) => `<div class="tt-base">+${v} ${statLabel(k)}</div>`).join('');
  const affixLines = (item.affixes || [])
    .map(a => `<div class="tt-affix">${a.value > 0 ? '+' : ''}${a.value}${a.percent ? '%' : ''} ${a.label}</div>`).join('');
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
    <div class="tt-value">💰 ${item.goldValue} or</div>
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
    document.getElementById('next-tier-name').textContent = next.name;
    document.getElementById('upgrade-cost').textContent = tier.upgradeCost.toLocaleString('fr-FR');
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

  const monster = generateMonster(floor);
  const card = document.getElementById('monster-card');
  card.classList.toggle('boss', monster.isBoss);
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
      slotEl.innerHTML = `${item.emoji}<span class="slot-label">${slot.name}</span>`;
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

export function setForgeSelected(itemId) {
  forgeSelectedItemId = itemId;
  renderForgeModal();
}

export function getForgeSelectedId() {
  return forgeSelectedItemId;
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
      <div style="color: var(--text-dim);">T${selected.chestTier} · ${slot.name} · <span class="rt-${r.cssClass}">${r.name}</span></div>
      ${Object.entries(selected.baseStats || {}).map(([k, v]) => `<div>+${v} ${statLabel(k)}</div>`).join('')}
      ${(selected.affixes || []).map(a => `<div class="item-affix">+${a.value}${a.percent ? '%' : ''} ${a.label}</div>`).join('')}
      <div style="color: var(--gold); margin-top: 4px;">💰 ${selected.goldValue}</div>
    </div>
  `;

  // Action costs
  document.getElementById('reroll-cost').textContent = rerollCost(selected).toLocaleString('fr-FR');
  document.getElementById('upgrade-tier-cost').textContent = upgradeTierCost(selected).toLocaleString('fr-FR');
  document.getElementById('transmute-cost').textContent = transmuteCost(selected).toLocaleString('fr-FR');

  document.getElementById('forge-tier-from').textContent = `T${selected.chestTier}`;
  document.getElementById('forge-tier-to').textContent = `T${Math.min(5, selected.chestTier + 1)}`;
  const rIdx = RARITIES.findIndex(rr => rr.id === selected.rarity);
  const nextR = RARITIES[rIdx + 1];
  document.getElementById('forge-rarity-from').textContent = r.name;
  document.getElementById('forge-rarity-to').textContent = nextR ? nextR.name : '—';

  document.getElementById('btn-reroll').disabled = !canReroll(selected);
  document.getElementById('btn-upgrade-tier').disabled = !canUpgradeTier(selected);
  document.getElementById('btn-transmute').disabled = !canTransmute(selected);
}

// === Modal show/hide ===

export function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'achievements-modal') renderAchievementsModal();
  if (id === 'forge-modal') renderForgeModal();
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
}
