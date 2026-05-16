// All DOM rendering and visual effects.
import { state } from './state.js';
import {
  RARITIES, RARITY_BY_ID, SLOTS, SLOT_BY_ID,
  AUTOSELL_UNLOCK_COSTS, CHEST_TIERS, CHEST_OPEN_COOLDOWN_MS, PITY_THRESHOLD,
  ACHIEVEMENTS,
} from './data.js';
import { computeStats, computePower } from './character.js';
import { getCurrentTier, getNextTier, canUpgrade, cooldownRemaining } from './chest.js';
import { generateMonster, predictDifficulty, isBossFloor } from './combat.js';
import { rerollCost, upgradeTierCost, transmuteCost, canReroll, canUpgradeTier, canTransmute } from './forge.js';
import { getAchievementProgress } from './achievements.js';

// === Item icon helpers ===

export function itemIconHTML(item, { big = false } = {}) {
  const r = RARITY_BY_ID[item.rarity];
  return `<div class="item-icon r-${r.cssClass}${big ? ' item-icon-big' : ''}" data-item-id="${item.id}">${item.emoji || '❔'}</div>`;
}

export function itemDetailsHTML(item) {
  const r = RARITY_BY_ID[item.rarity];
  const slot = SLOT_BY_ID[item.slot];
  const baseLines = Object.entries(item.baseStats || {})
    .map(([k, v]) => `<div class="tt-base">+${v} ${statLabel(k)}</div>`).join('');
  const affixLines = (item.affixes || [])
    .map(a => `<div class="tt-affix">+${a.value}${a.percent ? '%' : ''} ${a.label}</div>`).join('');
  return `
    <div class="tt-name rt-${r.cssClass}">${item.name}</div>
    <div class="tt-slot">${slot.name} — <span class="rarity-tag rt-${r.cssClass}">${r.name}</span></div>
    ${baseLines}
    ${affixLines}
    <div class="tt-value">💰 ${item.goldValue} or</div>
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
}

// === Chest panel ===

function renderChest() {
  const tier = getCurrentTier();
  const next = getNextTier();
  document.getElementById('chest-emoji').textContent = tier.emoji;
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

function renderInventory() {
  document.getElementById('inv-count').textContent = state.inventory.length;
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';

  // Sort by rarity (desc) then by goldValue desc
  const rarityOrder = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));
  const sorted = [...state.inventory].sort((a, b) => {
    const dr = rarityOrder[b.rarity] - rarityOrder[a.rarity];
    if (dr !== 0) return dr;
    return b.goldValue - a.goldValue;
  });

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
