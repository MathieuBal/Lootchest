// Bootstrap, event wiring, top-level orchestration.
import { state, subscribe, resetState } from './state.js';
import { RARITIES, RARITY_BY_ID, CHEST_OPEN_COOLDOWN_MS } from './data.js';
import { startAutosave, loadFromLocal, exportSave, importSave, clearLocal } from './save.js';
import { openChest, upgradeChest, canOpen } from './chest.js';
import { attemptCurrentFloor, setCurrentFloor } from './combat.js';
import { checkAchievements, onAchievementUnlocked } from './achievements.js';
import { reroll, upgradeTier, transmute } from './forge.js';
import {
  equipItem, unequipSlot,
} from './character.js';
import {
  sellItem, sellAllOfRarities, addToInventory, sellDrop,
  unlockAutoSell, toggleAutoSell, isAutoSellOn,
} from './inventory.js';
import {
  renderAll, showDropPopup, hideDropPopup, getCurrentDrop,
  flashRarity, startCooldownAnim, setOpenButtonEnabled,
  showTooltip, moveTooltip, hideTooltip,
  setActiveTab, appendCombatLog,
  showModal, hideModal, isModalOpen, showToast, setForgeSelected, getForgeSelectedId,
} from './ui.js';

// === Init ===

loadFromLocal();
startAutosave();
// Order matters: check achievements BEFORE renderAll so rewards show immediately
subscribe(checkAchievements);
subscribe(renderAll);
onAchievementUnlocked(ach => {
  const rewardLine = ach.reward?.gold ? `+${ach.reward.gold.toLocaleString('fr-FR')} 💰` : '';
  showToast(ach.emoji, `Succès débloqué : ${ach.name}`, rewardLine);
});
renderAll();
setActiveTab(state.ui?.leftTab || 'chest');
// First check on load (in case of imported save with already-met conditions)
checkAchievements();

// === Helpers ===

function findItem(id) {
  return state.inventory.find(i => i.id === id)
      || Object.values(state.equipment).find(i => i && i.id === id)
      || null;
}

// === Open chest ===

const btnOpen = document.getElementById('btn-open');
btnOpen.addEventListener('click', () => {
  if (!canOpen()) return;
  const item = openChest();
  if (!item) return;
  flashRarity(item.rarity);
  startCooldownAnim();
  setOpenButtonEnabled(false);
  setTimeout(() => setOpenButtonEnabled(true), CHEST_OPEN_COOLDOWN_MS);

  // Auto-sell?
  if (isAutoSellOn(item.rarity)) {
    sellDrop(item);
    return;
  }
  showDropPopup(item);
});

// === Drop popup actions ===

document.getElementById('btn-equip').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  equipItem(drop);
  hideDropPopup();
});

document.getElementById('btn-keep').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  addToInventory(drop);
  hideDropPopup();
});

document.getElementById('btn-sell').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  sellDrop(drop);
  hideDropPopup();
});

// === Upgrade chest ===

document.getElementById('btn-upgrade').addEventListener('click', () => {
  upgradeChest();
});

// === Tabs ===

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => setActiveTab(t.dataset.tab));
});

// === Dungeon: floor selection ===

document.getElementById('btn-floor-prev').addEventListener('click', () => {
  setCurrentFloor(state.combat.currentFloor - 1);
});
document.getElementById('btn-floor-next').addEventListener('click', () => {
  setCurrentFloor(state.combat.currentFloor + 1);
});

// === Dungeon: fight ===

document.getElementById('btn-fight').addEventListener('click', () => {
  const fightBtn = document.getElementById('btn-fight');
  if (fightBtn.disabled) return;
  fightBtn.disabled = true;
  setTimeout(() => { fightBtn.disabled = false; }, 400);

  const { result, monster, droppedItem, advanced } = attemptCurrentFloor();
  appendCombatLog(result.log, result.won ? 'win' : 'lose');
  if (advanced) appendCombatLog([`🆙 Nouvel étage débloqué : ${state.combat.highestUnlocked}`], 'reward');

  // Flash on win (boss flash legendary color)
  if (result.won) {
    flashRarity(monster.isBoss ? 'legendary' : 'magic');
  }

  if (droppedItem) {
    appendCombatLog([`🎁 Drop : ${droppedItem.name}`], 'reward');
    // Respect auto-sell
    if (isAutoSellOn(droppedItem.rarity)) {
      sellDrop(droppedItem);
    } else {
      showDropPopup(droppedItem);
    }
  }
});

// === Auto-sell toggle/unlock (event delegation) ===

document.getElementById('autosell-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-rarity]');
  if (!btn) return;
  const rarity = btn.dataset.rarity;
  if (btn.dataset.action === 'unlock') {
    unlockAutoSell(rarity);
  } else if (btn.dataset.action === 'toggle') {
    toggleAutoSell(rarity);
  }
});

// === Inventory: click on item = sell with shift, equip otherwise ===

document.getElementById('inventory-grid').addEventListener('click', (e) => {
  const icon = e.target.closest('[data-item-id]');
  if (!icon) return;
  const item = findItem(icon.dataset.itemId);
  if (!item) return;
  if (e.shiftKey) {
    sellItem(item);
  } else {
    equipItem(item);
  }
});

// === Equipment: click on equipped slot = unequip ===

document.getElementById('equipment-grid').addEventListener('click', (e) => {
  const slotEl = e.target.closest('.equipment-slot');
  if (!slotEl) return;
  const slotId = slotEl.dataset.slotId;
  if (!slotId) return;
  if (state.equipment[slotId]) {
    unequipSlot(slotId);
  }
});

// === Inventory filter + bulk sell ===

document.getElementById('btn-sell-filter').addEventListener('click', () => {
  const filterValue = document.getElementById('inv-filter').value;
  let raritySet;
  if (filterValue === 'all') {
    raritySet = new Set(RARITIES.map(r => r.id));
  } else {
    // sell <= selected rarity (inclusive)
    const maxIdx = RARITIES.findIndex(r => r.id === filterValue);
    raritySet = new Set(RARITIES.slice(0, maxIdx + 1).map(r => r.id));
  }
  // Don't bulk-sell ancestrals by accident
  if (filterValue !== 'ancestral' && filterValue !== 'all') {
    raritySet.delete('ancestral');
  }
  const earned = sellAllOfRarities(raritySet);
  if (earned > 0) {
    // small visual feedback
    const btn = document.getElementById('btn-sell-filter');
    const old = btn.textContent;
    btn.textContent = `+${earned} 💰`;
    setTimeout(() => { btn.textContent = old; }, 900);
  }
});

// === Tooltip on hover (delegation) ===

document.body.addEventListener('mousemove', (e) => {
  const icon = e.target.closest('[data-item-id]');
  if (icon) {
    const item = findItem(icon.dataset.itemId);
    if (item) {
      showTooltip(item, e.clientX, e.clientY);
      return;
    }
  }
  // Equipment slot?
  const slotEl = e.target.closest('.equipment-slot');
  if (slotEl && slotEl.dataset.slotId && state.equipment[slotEl.dataset.slotId]) {
    showTooltip(state.equipment[slotEl.dataset.slotId], e.clientX, e.clientY);
    return;
  }
  hideTooltip();
});

document.body.addEventListener('mouseleave', hideTooltip);

// === Modals: achievements + forge ===

document.getElementById('btn-achievements').addEventListener('click', () => {
  showModal('achievements-modal');
});

document.getElementById('btn-forge').addEventListener('click', () => {
  showModal('forge-modal');
});

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => hideModal(btn.dataset.close));
});

// Close modal by clicking the dark backdrop
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) hideModal(m.id);
  });
});

// Forge: select item from forge inventory
document.getElementById('forge-inventory').addEventListener('click', (e) => {
  const icon = e.target.closest('[data-item-id]');
  if (!icon) return;
  setForgeSelected(icon.dataset.itemId);
});

// Forge: action buttons
document.getElementById('btn-reroll').addEventListener('click', () => {
  const id = getForgeSelectedId();
  const item = state.inventory.find(i => i.id === id);
  if (item) reroll(item);
});
document.getElementById('btn-upgrade-tier').addEventListener('click', () => {
  const id = getForgeSelectedId();
  const item = state.inventory.find(i => i.id === id);
  if (item) upgradeTier(item);
});
document.getElementById('btn-transmute').addEventListener('click', () => {
  const id = getForgeSelectedId();
  const item = state.inventory.find(i => i.id === id);
  if (item) transmute(item);
});

// === Save controls ===

document.getElementById('btn-export').addEventListener('click', () => {
  exportSave();
});

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('file-import').click();
});

document.getElementById('file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await importSave(file);
  } catch (err) {
    alert('Import échoué : ' + err.message);
  }
  e.target.value = '';
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Reset complet de la partie ? Cette action est irréversible (pense à exporter avant).')) {
    clearLocal();
    resetState();
  }
});

// === Close popup with ESC ===

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const drop = getCurrentDrop();
    if (drop) {
      addToInventory(drop);
      hideDropPopup();
      return;
    }
    if (isModalOpen('forge-modal')) { hideModal('forge-modal'); return; }
    if (isModalOpen('achievements-modal')) { hideModal('achievements-modal'); return; }
  } else if (e.key === ' ' || e.code === 'Space') {
    // Spacebar: chest open OR fight depending on current tab
    if (getCurrentDrop()) return;
    // Ignore if focus on input (file/select)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    e.preventDefault();
    if (state.ui.leftTab === 'dungeon') {
      document.getElementById('btn-fight').click();
    } else if (canOpen()) {
      btnOpen.click();
    }
  }
});
