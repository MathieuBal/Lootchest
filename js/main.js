// Bootstrap, event wiring, top-level orchestration.
import { state, subscribe, resetState } from './state.js';
import { RARITIES, RARITY_BY_ID, CHEST_OPEN_COOLDOWN_MS } from './data.js';
import { startAutosave, loadFromLocal, exportSave, importSave, clearLocal } from './save.js';
import { openChest, upgradeChest, canOpen } from './chest.js';
import { attemptCurrentFloor, setCurrentFloor } from './combat.js';
import { checkAchievements, onAchievementUnlocked } from './achievements.js';
import { FORGE_ACTIONS, applyMasterCraft } from './forge.js';
import { upgradeTalent } from './talents.js';
import { CURRENCY_BY_ID } from './data.js';
import { canAscend, ascend } from './prestige.js';
import {
  unlockAudio, toggleMuted, isMuted, setMuted,
  soundChestOpen, soundDrop, soundCoin, soundHit, soundCrit,
  soundWin, soundLose, soundAchievement, soundUpgrade, soundClick,
  soundForge, soundAscension,
} from './sound.js';
import {
  spawnParticles, explodeFromElement, screenShake,
  floatingDamage, floatingText,
} from './fx.js';
import {
  equipItem, unequipSlot, autoEquipBest,
} from './character.js';
import {
  sellItem, sellAllOfRarities, addToInventory, sellDrop,
  unlockAutoSell, toggleAutoSell, isAutoSellOn,
  salvageItem, salvageAllOfRarities,
} from './inventory.js';
import {
  renderAll, showDropPopup, hideDropPopup, getCurrentDrop,
  flashRarity, startCooldownAnim, setOpenButtonEnabled,
  showTooltip, moveTooltip, hideTooltip,
  setActiveTab, appendCombatLog,
  showModal, hideModal, isModalOpen, showToast, setForgeSelected, getForgeSelectedId,
  showCombatBars, hideCombatBars, updateMonsterHp, updatePlayerHp,
  getMonsterEmojiCenter, getCharacterAvatarCenter, getChestCenter,
  setInvSortMode, setInvSearchText, setForgeMode,
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
  soundAchievement();
});
setMuted(!!state.ui?.muted);
updateMuteButton();
renderAll();
setActiveTab(state.ui?.leftTab || 'chest');
// First check on load (in case of imported save with already-met conditions)
checkAchievements();

// Unlock audio on first user interaction (browser autoplay policy)
document.addEventListener('click', unlockAudio, { once: true });

// Show help modal on very first session (no save existed)
if (state.opened === 0 && state.combat.kills === 0) {
  // Defer so the rest of the UI is rendered first
  setTimeout(() => showModal('help-modal'), 200);
}

function updateMuteButton() {
  const btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = isMuted() ? '🔇' : '🔊';
}

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
  soundChestOpen();
  const result = openChest();
  if (!result) return;
  const { item, orbs } = result;
  flashRarity(item.rarity);
  startCooldownAnim();
  setOpenButtonEnabled(false);
  setTimeout(() => setOpenButtonEnabled(true), CHEST_OPEN_COOLDOWN_MS);

  // Drop sound + particle effects per rarity
  soundDrop(item.rarity);
  const rcolor = RARITY_BY_ID[item.rarity].color;
  const center = getChestCenter();
  const isRarePlus = ['rare', 'epic', 'legendary', 'ancestral'].includes(item.rarity);
  if (isRarePlus) {
    const particleCount = item.rarity === 'ancestral' ? 60
                       : item.rarity === 'legendary' ? 40
                       : item.rarity === 'epic' ? 24
                       : 16;
    spawnParticles(rcolor, center.x, center.y, particleCount);
    if (item.rarity === 'legendary' || item.rarity === 'ancestral') {
      screenShake(item.rarity === 'ancestral' ? 10 : 6, 350);
    }
  }

  // Orb drops: floating text + small toast for each
  if (orbs && orbs.length > 0) {
    let offset = 0;
    for (const orbId of orbs) {
      const def = CURRENCY_BY_ID[orbId];
      if (!def) continue;
      floatingText(`+1 ${def.emoji}`, center.x, center.y - 40 - offset, def.color);
      offset += 22;
      spawnParticles(def.color, center.x, center.y, 12);
    }
    soundCoin();
  }

  // Auto-sell?
  if (isAutoSellOn(item.rarity)) {
    sellDrop(item);
    soundCoin();
    return;
  }
  showDropPopup(item);
});

// === Drop popup actions ===

document.getElementById('btn-equip').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  equipItem(drop);
  soundClick();
  hideDropPopup();
});

document.getElementById('btn-keep').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  addToInventory(drop);
  soundClick();
  hideDropPopup();
});

document.getElementById('btn-sell').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  sellDrop(drop);
  soundCoin();
  hideDropPopup();
});

// === Upgrade chest ===

document.getElementById('btn-upgrade').addEventListener('click', () => {
  if (upgradeChest()) {
    soundUpgrade();
    const c = getChestCenter();
    spawnParticles('#f5c842', c.x, c.y, 30);
  }
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

document.getElementById('btn-fight').addEventListener('click', async () => {
  const fightBtn = document.getElementById('btn-fight');
  if (fightBtn.disabled) return;
  fightBtn.disabled = true;

  const { result, monster, droppedItem, advanced, milestone } = attemptCurrentFloor();

  // Animate combat HP bars + damage numbers, then apply consequences.
  const playerMaxHp = result.playerMaxHp;
  const monsterMaxHp = monster.hp;
  showCombatBars(playerMaxHp, monsterMaxHp);

  // Tween events at variable speed; cap total animation around 1.5s
  const events = result.events || [];
  const perEvent = Math.max(50, Math.min(160, 1400 / Math.max(1, events.length)));

  for (const ev of events) {
    await sleep(perEvent);
    if (ev.type === 'player_hit') {
      updateMonsterHp(ev.monsterHp, monsterMaxHp);
      const c = getMonsterEmojiCenter();
      floatingDamage(ev.dmg, c.x, c.y, ev.isCrit ? 'crit' : 'normal');
      ev.isCrit ? soundCrit() : soundHit();
      if (ev.isCrit) screenShake(3, 120);
      // Show skill multiplier icons next to the damage number
      if (ev.mults && ev.mults.length > 0) {
        const txt = ev.mults.map(m => m.emoji).join(' ');
        floatingText(txt, c.x + 30, c.y - 20, '#ffe14a');
      }
    } else if (ev.type === 'monster_hit') {
      updatePlayerHp(ev.playerHp, playerMaxHp);
      const c = getCharacterAvatarCenter();
      floatingDamage(ev.dmg, c.x, c.y, 'player-took');
      soundHit();
    } else if (ev.type === 'skill_heal') {
      updatePlayerHp(ev.playerHp, playerMaxHp);
      const c = getCharacterAvatarCenter();
      floatingDamage(ev.amount, c.x, c.y, 'heal');
      floatingText(`${ev.emoji} Soin`, c.x, c.y - 40, '#6acc6a');
      soundUpgrade();
      spawnParticles('#6acc6a', c.x, c.y, 12);
    } else if (ev.type === 'skill_dodge') {
      const c = getCharacterAvatarCenter();
      floatingText('💨 ESQUIVE', c.x, c.y, '#5a8af0');
      soundClick();
    } else if (ev.type === 'skill_reflect') {
      updateMonsterHp(ev.monsterHp, monsterMaxHp);
      const c = getMonsterEmojiCenter();
      floatingDamage(ev.amount, c.x, c.y, 'normal');
      floatingText(`${ev.emoji} Épines`, c.x, c.y - 40, '#5acc6a');
      soundHit();
    }
  }

  await sleep(300);

  appendCombatLog(result.log, result.won ? 'win' : 'lose');
  if (result.won) {
    soundWin();
    flashRarity(monster.isBoss ? 'legendary' : 'magic');
    const c = getMonsterEmojiCenter();
    spawnParticles(monster.isBoss ? '#ff7a1a' : '#ffe14a', c.x, c.y, monster.isBoss ? 40 : 20);
    floatingText(`+${monster.goldReward} 💰`, c.x, c.y - 30, '#f5c842');
    if (monster.isBoss) screenShake(8, 350);
  } else {
    soundLose();
    screenShake(10, 400);
  }

  if (advanced) appendCombatLog([`🆙 Nouvel étage débloqué : ${state.combat.highestUnlocked}`], 'reward');

  if (milestone) {
    const orbBits = Object.entries(milestone.reward.orbs)
      .filter(([_, q]) => q > 0)
      .map(([id, q]) => `${q} ${CURRENCY_BY_ID[id].emoji}`)
      .join(' · ');
    appendCombatLog([
      `🎉 PALIER ÉTAGE ${milestone.floor} ATTEINT (niv ${milestone.level})`,
      `+${milestone.reward.gold.toLocaleString('fr-FR')} 💰${orbBits ? ' · ' + orbBits : ''}`,
    ], 'reward');
    showToast('🎉', `Palier étage ${milestone.floor} !`, `+${milestone.reward.gold.toLocaleString('fr-FR')} 💰  ${orbBits}`);
    soundAchievement();
    soundUpgrade();
    screenShake(14, 600);
    spawnParticles('#ffe14a', window.innerWidth / 2, window.innerHeight / 2, 60, { minSpeed: 150, maxSpeed: 400, size: 10 });
    floatingText(`PALIER ${milestone.level}`, window.innerWidth / 2, window.innerHeight / 3, '#f5c842');
  }

  if (droppedItem) {
    appendCombatLog([`🎁 Drop : ${droppedItem.name}`], 'reward');
    soundDrop(droppedItem.rarity);
    if (isAutoSellOn(droppedItem.rarity)) {
      sellDrop(droppedItem);
      soundCoin();
    } else {
      showDropPopup(droppedItem);
    }
  }

  await sleep(400);
  hideCombatBars();
  fightBtn.disabled = false;
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
  if (e.ctrlKey || e.metaKey) {
    const qty = salvageItem(item);
    if (qty > 0) {
      soundForge();
      const r = icon.getBoundingClientRect();
      floatingText(`+${qty} 💎`, r.left + r.width / 2, r.top, '#a0e0ff');
    }
  } else if (e.shiftKey) {
    sellItem(item);
    soundCoin();
  } else {
    equipItem(item);
    soundClick();
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
    soundCoin();
    const btn = document.getElementById('btn-sell-filter');
    const old = btn.textContent;
    btn.textContent = `+${earned} 💰`;
    setTimeout(() => { btn.textContent = old; }, 900);
  }
});

document.getElementById('btn-salvage-filter').addEventListener('click', () => {
  const filterValue = document.getElementById('inv-filter').value;
  let raritySet;
  if (filterValue === 'all') {
    raritySet = new Set(RARITIES.map(r => r.id));
  } else {
    const maxIdx = RARITIES.findIndex(r => r.id === filterValue);
    raritySet = new Set(RARITIES.slice(0, maxIdx + 1).map(r => r.id));
  }
  // Never bulk-salvage ancestrals by accident
  if (filterValue !== 'ancestral' && filterValue !== 'all') {
    raritySet.delete('ancestral');
  }
  const { totalShards } = salvageAllOfRarities(raritySet);
  if (totalShards > 0) {
    soundForge();
    const btn = document.getElementById('btn-salvage-filter');
    const old = btn.textContent;
    btn.textContent = `+${totalShards} 💎`;
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

document.getElementById('btn-talents').addEventListener('click', () => {
  showModal('talents-modal');
});

document.getElementById('btn-codex').addEventListener('click', () => {
  showModal('codex-modal');
});

document.getElementById('btn-skills').addEventListener('click', () => {
  showModal('skills-modal');
});

document.getElementById('talents-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-talent]');
  if (!btn || btn.disabled) return;
  if (upgradeTalent(btn.dataset.talent)) {
    soundClick();
    soundUpgrade();
  }
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

// Forge: action button delegation
document.getElementById('forge-actions').addEventListener('click', (e) => {
  // Cancel button from master-craft mode
  if (e.target.closest('[data-forge-action="cancel-master"]')) {
    setForgeMode('actions');
    soundClick();
    return;
  }
  // Master-craft affix selection
  const mcRow = e.target.closest('.mc-row[data-affix-id]');
  if (mcRow) {
    if (mcRow.classList.contains('disabled')) return;
    const id = getForgeSelectedId();
    const item = state.inventory.find(i => i.id === id);
    if (!item) return;
    if (applyMasterCraft(item, mcRow.dataset.affixId)) {
      soundForge();
      soundDrop(item.rarity);
      setForgeMode('actions');
    }
    return;
  }
  // Normal forge action button
  const btn = e.target.closest('button[data-forge-action]');
  if (!btn) return;
  const actionId = btn.dataset.forgeAction;
  const action = FORGE_ACTIONS.find(a => a.id === actionId);
  if (!action) return;
  // Master craft button opens the sub-mode instead of applying directly
  if (action.interactive && action.id === 'maitre') {
    if (action.can(state.inventory.find(i => i.id === getForgeSelectedId()))) {
      setForgeMode('master-craft');
      soundClick();
    }
    return;
  }
  const id = getForgeSelectedId();
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;
  if (action.apply && action.apply(item)) {
    soundForge();
    if (action.id === 'transmutation' || action.id === 'regal') soundDrop(item.rarity);
  }
});

// Mute toggle
document.getElementById('btn-mute').addEventListener('click', () => {
  const m = toggleMuted();
  state.ui.muted = m;
  updateMuteButton();
  if (!m) soundClick(); // confirm unmute
});

// Help modal
document.getElementById('btn-help').addEventListener('click', () => {
  showModal('help-modal');
});

// Inventory sort + search + auto-equip
document.getElementById('inv-sort').addEventListener('change', (e) => {
  setInvSortMode(e.target.value);
});
document.getElementById('inv-search').addEventListener('input', (e) => {
  setInvSearchText(e.target.value);
});
document.getElementById('btn-auto-equip').addEventListener('click', () => {
  const n = autoEquipBest();
  if (n > 0) {
    soundClick();
    const c = getCharacterAvatarCenter();
    spawnParticles('#f5c842', c.x, c.y, 20);
    floatingText(`Équipé ×${n}`, c.x, c.y - 30, '#f5c842');
  }
});

// === Ascension ===

document.getElementById('btn-ascend').addEventListener('click', () => {
  if (!canAscend()) return;
  const newLevel = (state.prestige?.level || 0) + 1;
  const msg = `🌟 Ascension Niv ${newLevel} ?\n\n`
    + `Tu repars de zéro (or, items, coffre T1, étage 1).\n`
    + `Tu gardes : succès, prestige, statistiques.\n\n`
    + `Bonus permanent : +${Math.round((Math.pow(1.25, newLevel) - 1) * 100)}% drops raretés et or de vente.\n\n`
    + `Confirmer ?`;
  if (confirm(msg)) {
    if (ascend()) {
      soundAscension();
      screenShake(8, 600);
      // Burst of golden particles from center of screen
      spawnParticles('#f5c842', window.innerWidth / 2, window.innerHeight / 2, 80, { minSpeed: 200, maxSpeed: 500, size: 10 });
    }
  }
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
    if (isModalOpen('help-modal')) { hideModal('help-modal'); return; }
    if (isModalOpen('talents-modal')) { hideModal('talents-modal'); return; }
    if (isModalOpen('codex-modal')) { hideModal('codex-modal'); return; }
    if (isModalOpen('skills-modal')) { hideModal('skills-modal'); return; }
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
