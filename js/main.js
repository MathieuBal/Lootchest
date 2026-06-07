// Bootstrap, event wiring, top-level orchestration.
import { state, subscribe, resetState, notify } from './state.js';
import { RARITIES, RARITY_BY_ID, CHEST_OPEN_COOLDOWN_MS } from './data.js';
import { startAutosave, loadFromLocal, exportSave, importSave, clearLocal } from './save.js';
import { openChest, upgradeChest, canOpen } from './chest.js';
import { attemptCurrentFloor, setCurrentFloor } from './combat.js';
import { checkAchievements, onAchievementUnlocked } from './achievements.js';
import { FORGE_ACTIONS, applyMasterCraft } from './forge.js';
import { upgradeTalent } from './talents.js';
import { refreshBoardIfEmpty, rerollBounty, onBountyComplete } from './bounties.js';
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
  equipItem, unequipSlot, autoEquipBest, itemPowerContribution,
} from './character.js';
import {
  sellItem, sellAllOfRarities, addToInventory, sellDrop,
  unlockAutoSell, toggleAutoSell, isAutoSellOn,
  salvageItem, salvageAllOfRarities, toggleLockItem,
  autoActionFor, setAutoMode, salvageDrop,
} from './inventory.js';
import {
  renderAll, showDropPopup, hideDropPopup, getCurrentDrop,
  flashRarity, startCooldownAnim, setOpenButtonEnabled,
  showTooltip, hideTooltip, itemDetailsHTML,
  setActiveTab, appendCombatLog,
  showModal, hideModal, isModalOpen, showToast, setForgeSelected, getForgeSelectedId,
  showCombatBars, hideCombatBars, updateMonsterHp, updatePlayerHp,
  getMonsterEmojiCenter, getCharacterAvatarCenter, getChestCenter,
  setInvSortMode, setInvSearchText, setForgeMode,
} from './ui.js';
import { lookupGlossary } from './glossary.js';
import { advanceMimic } from './mimic.js';
import { MIMIC } from './data.js';
import { mimicSpriteSrc, spriteImg } from './spriteMap.js';

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
// Initialise bounty board if empty
refreshBoardIfEmpty();

// Show welcome modal on very first visit
function dismissWelcome() {
  if (state.ui.hasSeenWelcome) return;
  state.ui.hasSeenWelcome = true;
  hideModal('welcome-modal');
  notify();
  refreshNextStepHint();
}
if (!state.ui.hasSeenWelcome) {
  showModal('welcome-modal');
}
document.getElementById('btn-welcome-start').addEventListener('click', () => {
  dismissWelcome();
  soundClick();
});
// Backdrop click also dismisses (sets the flag so it doesn't reappear)
document.getElementById('welcome-modal').addEventListener('click', (e) => {
  if (e.target.id === 'welcome-modal') dismissWelcome();
});

// === Next-step hint indicator ===
// Highlights ONE element the new player should interact with, based on
// game progression. Removes itself once the user has clearly made progress.
function refreshNextStepHint() {
  document.querySelectorAll('.next-step-hint').forEach(el => el.classList.remove('next-step-hint'));
  // Don't hint while the welcome modal is open
  if (isModalOpen('welcome-modal')) return;
  const opened = state.opened || 0;
  const hasItems = state.inventory.length > 0;
  const anyEquipped = Object.values(state.equipment).some(Boolean);
  const kills = state.combat?.kills || 0;

  let target = null;
  if (opened === 0 && (state.keys || 0) > 0) {
    target = document.getElementById('btn-open');             // → ouvrir 1er coffre
  } else if (hasItems && !anyEquipped) {
    target = document.querySelector('#inventory-grid [data-item-id]'); // → équiper
  } else if (anyEquipped && kills === 0) {
    target = document.querySelector('.tab[data-tab="dungeon"]'); // → aller au donjon
  }
  if (target) target.classList.add('next-step-hint');
}

subscribe(refreshNextStepHint);
refreshNextStepHint();

// === Glossary inline tooltips ===
// On hover (desktop) or tap (mobile), show the definition of a .gt term.
const _gtTip = document.getElementById('glossary-tip');
let _gtAutoHide = null;

function showGlossaryTip(el) {
  const term = el.dataset.term;
  const def = lookupGlossary(term);
  if (!def) return;
  _gtTip.innerHTML = `<div class="glossary-tip-title">${el.textContent}</div><div class="glossary-tip-body">${def}</div>`;
  _gtTip.classList.remove('hidden');
  // Position below the term, clamped to viewport
  const r = el.getBoundingClientRect();
  const ttR = _gtTip.getBoundingClientRect();
  let left = r.left;
  let top = r.bottom + 6;
  if (left + ttR.width > window.innerWidth - 8) left = window.innerWidth - ttR.width - 8;
  if (top + ttR.height > window.innerHeight - 8) top = r.top - ttR.height - 6;
  _gtTip.style.left = Math.max(8, left) + 'px';
  _gtTip.style.top  = Math.max(8, top)  + 'px';
}

function hideGlossaryTip() {
  _gtTip.classList.add('hidden');
  if (_gtAutoHide) { clearTimeout(_gtAutoHide); _gtAutoHide = null; }
}

// Hover (desktop only — touch uses click below)
document.body.addEventListener('mouseover', (e) => {
  if (isTouchDevice()) return;
  const el = e.target.closest('.gt');
  if (el) showGlossaryTip(el);
});
document.body.addEventListener('mouseout', (e) => {
  if (isTouchDevice()) return;
  if (e.target.closest('.gt')) hideGlossaryTip();
});

// Tap (mobile): show + auto-hide after 4s, or hide on outside tap
document.body.addEventListener('click', (e) => {
  const el = e.target.closest('.gt');
  if (el) {
    e.stopPropagation();
    showGlossaryTip(el);
    if (_gtAutoHide) clearTimeout(_gtAutoHide);
    _gtAutoHide = setTimeout(hideGlossaryTip, 4500);
    return;
  }
  if (!_gtTip.classList.contains('hidden') && !e.target.closest('#glossary-tip')) {
    hideGlossaryTip();
  }
});
onBountyComplete(b => {
  const rewardSummary = [`+${b.reward.gold.toLocaleString('fr-FR')} 💰`];
  for (const [orbId, q] of Object.entries(b.reward.orbs)) {
    const orb = CURRENCY_BY_ID[orbId];
    if (orb) rewardSummary.push(`${q} ${orb.emoji}`);
  }
  if (b.reward.talents) rewardSummary.push(`${b.reward.talents} 🌳`);
  showToast(b.emoji, `Contrat complété : ${b.name}`, rewardSummary.join(' · '));
  soundAchievement();
  spawnParticles(b.diffColor, window.innerWidth / 2, window.innerHeight / 3, 30);
});

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

// === Mobile detection ===
// Use (hover: none) — true ONLY on touch-primary devices (phones/tablets).
// `(pointer: coarse)` was too aggressive: it matched touchscreen laptops
// where the user actually wants the desktop click-to-equip behavior.
const isTouchDevice = () => window.matchMedia('(hover: none)').matches;

// === Mimic encounter popup ===
let _currentMimic = null;

function showMimicPopup(encounter) {
  _currentMimic = encounter;
  const popup = document.getElementById('mimic-popup');
  popup.classList.remove('hidden');
  renderMimicState();
}

function hideMimicPopup() {
  document.getElementById('mimic-popup').classList.add('hidden');
  _currentMimic = null;
}

function renderMimicState() {
  const enc = _currentMimic;
  if (!enc) return;
  const banner = document.getElementById('mimic-banner');
  const sprite = document.getElementById('mimic-sprite');
  const flavor = document.getElementById('mimic-flavor');
  const ladder = document.getElementById('mimic-ladder');
  const haul = document.getElementById('mimic-haul');
  const takeBtn = document.getElementById('btn-mimic-take');
  const riskBtn = document.getElementById('btn-mimic-risk');
  const closeBtn = document.getElementById('btn-mimic-close');

  banner.classList.toggle('golden', !!enc.golden);
  banner.textContent = enc.golden ? '✨ MIMIC DORÉ ! ✨' : '⚠ UN MIMIC !';

  const mimicEmoji = enc.golden ? '🟡🦷' : '🟫🦷';
  sprite.innerHTML = spriteImg(mimicSpriteSrc({ golden: enc.golden, hires: true }), mimicEmoji, { size: 96, title: 'Mimic' });

  // Ladder rendering
  ladder.innerHTML = MIMIC.ladder.map((rung, i) => {
    const reached = (i + 1) <= enc.rung;
    const isCurrent = (i + 1) === enc.rung;
    return `<div class="mimic-rung${reached ? ' reached' : ''}${isCurrent ? ' current' : ''}">
      <div class="rung-label">${rung.label}</div>
      <div class="rung-gold">×${rung.goldMult}</div>
    </div>`;
  }).join('');

  if (enc.state === 'reveal' || enc.state === 'choosing') {
    flavor.textContent = enc.rung === 0
      ? 'Le coffre... grogne. Tu peux t\'enfuir ou tenter ta chance.'
      : (MIMIC.ladder[enc.rung - 1]?.flavor || '');
    const nextRung = MIMIC.ladder[enc.rung]; // the one we'd climb to
    const biteP = nextRung ? MIMIC.biteCurve[enc.rung] : 1;
    const biteHint = nextRung ? `${Math.round(biteP * 100)}% morsure` : 'sommet atteint';
    haul.innerHTML = enc.rung > 0
      ? `Verrouillé : <b>${MIMIC.ladder[enc.rung - 1].label}</b> (×${MIMIC.ladder[enc.rung - 1].goldMult} or, +${MIMIC.ladder[enc.rung - 1].orbBonus} orbes)<br><span style="opacity:0.7;font-size:11px">Tenter : ${biteHint}</span>`
      : `Aucun butin pour le moment.<br><span style="opacity:0.7;font-size:11px">Tenter le 1er palier : ${biteHint}</span>`;
    takeBtn.classList.remove('hidden');
    riskBtn.classList.remove('hidden');
    closeBtn.classList.add('hidden');
    takeBtn.textContent = enc.rung > 0 ? 'Prendre & partir' : 'S\'enfuir';
    takeBtn.disabled = false;
    riskBtn.disabled = !nextRung;
    riskBtn.textContent = nextRung ? `Risquer (${MIMIC.ladder[enc.rung].label})` : 'Au sommet';
  } else if (enc.state === 'won') {
    const rung = MIMIC.ladder[enc.rung - 1];
    flavor.textContent = `🎉 ${rung.label} verrouillé !`;
    haul.innerHTML = `<div style="color:#ffd060;font-weight:700">+${enc.reward.gold.toLocaleString('fr-FR')} 💰</div>
      <div style="font-size:11px;color:#ffc888">+${enc.reward.orbs.length} orbes &middot; objet ${enc.reward.item.rarity}</div>`;
    takeBtn.classList.add('hidden');
    riskBtn.classList.add('hidden');
    closeBtn.classList.remove('hidden');
    // Side effects on win
    const center = getChestCenter();
    spawnParticles('#ffd060', center.x, center.y, 40);
    soundDrop(enc.reward.item.rarity);
    soundCoin();
    pushRecentLoot(enc.reward.item, 'fresh');
    addToInventory(enc.reward.item);
  } else if (enc.state === 'bitten') {
    flavor.textContent = '💀 Le mimic claque la mâchoire...';
    haul.innerHTML = `<div class="mimic-bite">${enc.lastBite.label} — ${enc.lastBite.desc}</div>` +
      (enc.goldLost ? `<div style="font-size:11px;color:#ff8080">-${enc.goldLost.toLocaleString('fr-FR')} 💰</div>` : '');
    takeBtn.classList.add('hidden');
    riskBtn.classList.add('hidden');
    closeBtn.classList.remove('hidden');
    const center = getChestCenter();
    spawnParticles('#ff3030', center.x, center.y, 30);
    screenShake(8, 300);
    soundLose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const takeBtn = document.getElementById('btn-mimic-take');
  const riskBtn = document.getElementById('btn-mimic-risk');
  const closeBtn = document.getElementById('btn-mimic-close');
  if (takeBtn) takeBtn.addEventListener('click', () => {
    if (!_currentMimic) return;
    soundClick();
    advanceMimic(_currentMimic, 'take');
    renderMimicState();
  });
  if (riskBtn) riskBtn.addEventListener('click', () => {
    if (!_currentMimic) return;
    soundClick();
    advanceMimic(_currentMimic, 'risk');
    renderMimicState();
  });
  if (closeBtn) closeBtn.addEventListener('click', () => {
    soundClick();
    hideMimicPopup();
  });
});

// === Recent loot strip (multi-open recap) ===
// Ephemeral list of the last N dropped items with their disposition.
// Lets the player compare what they just looted vs what they're wearing
// without scrolling through inventory — especially useful when opening
// many chests in sequence.
const _recentLoot = [];
const RECENT_LOOT_MAX = 8;
const DISPO_BADGE = { fresh: '📥', sold: '💰', salvaged: '💎', equipped: '⚔', kept: '✅' };

function pushRecentLoot(item, disposition) {
  _recentLoot.unshift({ item, disposition, ts: Date.now() });
  if (_recentLoot.length > RECENT_LOOT_MAX) _recentLoot.pop();
  renderRecentLoot();
}

function setRecentLootDisposition(itemId, disposition) {
  const entry = _recentLoot.find(e => e.item.id === itemId);
  if (entry) { entry.disposition = disposition; renderRecentLoot(); }
}

function renderRecentLoot() {
  const wrap = document.getElementById('recent-loot');
  const list = document.getElementById('recent-loot-list');
  if (!wrap || !list) return;
  if (_recentLoot.length === 0) {
    wrap.classList.add('hidden');
    list.innerHTML = '';
    return;
  }
  wrap.classList.remove('hidden');
  // Import dynamically to avoid circular: we need itemIconHTML + power compute
  // (already available via the ui.js import at top of file)
  const cards = _recentLoot.map(entry => {
    const item = entry.item;
    const equipped = state.equipment[item.slot];
    let powerDeltaHTML = '';
    if (equipped && equipped.id !== item.id) {
      const pa = Math.round(itemPowerContribution(item));
      const pb = Math.round(itemPowerContribution(equipped));
      const pd = pa - pb;
      const cls = pd > 0 ? 'better' : pd < 0 ? 'worse' : 'same';
      const arrow = pd > 0 ? '▲' : pd < 0 ? '▼' : '=';
      const sign = pd > 0 ? '+' : '';
      powerDeltaHTML = `<div class="recent-loot-delta ${cls}">${arrow} ${sign}${pd}</div>`;
    } else if (!equipped) {
      powerDeltaHTML = `<div class="recent-loot-delta better">▲ slot vide</div>`;
    }
    const rCls = RARITY_BY_ID[item.rarity].cssClass;
    const badge = DISPO_BADGE[entry.disposition] || '';
    return `<div class="recent-loot-card rt-${rCls}" data-item-id="${item.id}" data-disposition="${entry.disposition}">
      <div class="recent-loot-thumb">${itemIconHTML(item)}</div>
      <div class="recent-loot-name rt-${rCls}">${item.name}</div>
      ${powerDeltaHTML}
      <div class="recent-loot-badge" title="${entry.disposition}">${badge}</div>
    </div>`;
  });
  list.innerHTML = cards.join('');
}

// Click on a recent-loot card → equip it if it's still in inventory.
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('recent-loot-list');
  if (list) {
    list.addEventListener('click', (e) => {
      const card = e.target.closest('.recent-loot-card');
      if (!card) return;
      const item = findItem(card.dataset.itemId);
      if (!item) return;  // already gone (sold/salvaged)
      equipItem(item);
      setRecentLootDisposition(item.id, 'equipped');
      soundClick();
    });
  }
  const clearBtn = document.getElementById('btn-clear-recent');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    _recentLoot.length = 0;
    renderRecentLoot();
  });
});

// Re-render the recent-loot strip whenever state changes (power deltas
// depend on what's equipped, which can change).
subscribe(renderRecentLoot);

// === Combat animation helpers ===
// Add a CSS animation class for a brief duration, then remove it so the
// animation can re-trigger on the next hit. CSS handles the actual motion;
// JS just toggles the class.
function triggerCombatAnim(elementId, className, durationMs) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove(className);
  // Force reflow so the animation restarts even if it's already in progress.
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), durationMs);
}

function triggerMonsterCardPulse() {
  const card = document.getElementById('monster-card');
  if (!card || !card.classList.contains('combat')) return;
  card.classList.remove('dmg-pulse');
  void card.offsetWidth;
  card.classList.add('dmg-pulse');
  setTimeout(() => card.classList.remove('dmg-pulse'), 350);
}

function triggerPlayerCardPulse() {
  const el = document.getElementsByClassName('character-avatar')[0];
  if (!el) return;
  el.classList.remove('dmg-pulse');
  void el.offsetWidth;
  el.classList.add('dmg-pulse');
  setTimeout(() => el.classList.remove('dmg-pulse'), 350);
}

// Spawn a glowing slash streak between the player avatar and the monster.
function spawnSlashFromPlayerToMonster() {
  const playerEl  = document.getElementsByClassName('character-avatar')[0];
  const monsterEl = document.getElementById('monster-emoji');
  if (!playerEl || !monsterEl) return;
  const p = playerEl.getBoundingClientRect();
  const m = monsterEl.getBoundingClientRect();
  const x1 = p.left + p.width / 2;
  const y1 = p.top  + p.height / 2;
  const x2 = m.left + m.width / 2;
  const y2 = m.top  + m.height / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const slash = document.createElement('div');
  slash.className = 'combat-slash';
  slash.style.left  = x1 + 'px';
  slash.style.top   = (y1 - 3) + 'px';
  slash.style.width = len + 'px';
  slash.style.setProperty('--slash-rot', angle + 'deg');
  document.body.appendChild(slash);
  setTimeout(() => slash.remove(), 350);
}

// === Mobile Action Sheet ===
// On touch, replaces modifier-key interactions (Shift/Ctrl/Alt+click) with a
// bottom sheet that surfaces all item actions in large, tappable buttons.

let _sheetItem = null;
let _sheetSlot = null; // non-null when opened from an equipped slot

function showItemActionSheet(item, fromSlot = null) {
  _sheetItem = item;
  _sheetSlot = fromSlot;

  const sheet = document.getElementById('action-sheet');
  sheet.querySelector('.action-sheet-item-info').innerHTML = itemDetailsHTML(item);

  const equipBtn = document.getElementById('action-equip');
  equipBtn.textContent = fromSlot ? 'Déséquiper' : 'Équiper';

  const lockBtn = document.getElementById('action-lock');
  lockBtn.textContent = item.locked ? '🔓 Déverrouiller' : '🔒 Verrouiller';

  const sellBtn    = document.getElementById('action-sell');
  const salvageBtn = document.getElementById('action-salvage');
  sellBtn.disabled    = !!item.locked;
  salvageBtn.disabled = !!item.locked;

  // Hide equip button for accessories that aren't directly equippable via the sheet
  // (all item types are equippable, so show it always)
  equipBtn.style.display = '';

  sheet.classList.remove('hidden');
}

function hideActionSheet() {
  document.getElementById('action-sheet').classList.add('hidden');
  _sheetItem = null;
  _sheetSlot = null;
}

document.getElementById('action-sheet').querySelector('.action-sheet-backdrop')
  .addEventListener('click', hideActionSheet);

document.getElementById('action-cancel').addEventListener('click', hideActionSheet);

document.getElementById('action-equip').addEventListener('click', () => {
  if (!_sheetItem) return;
  if (_sheetSlot) {
    unequipSlot(_sheetSlot);
  } else {
    equipItem(_sheetItem);
    soundClick();
  }
  hideActionSheet();
});

document.getElementById('action-sell').addEventListener('click', () => {
  if (!_sheetItem) return;
  const earned = sellItem(_sheetItem);
  if (earned > 0) soundCoin();
  hideActionSheet();
});

document.getElementById('action-salvage').addEventListener('click', () => {
  if (!_sheetItem) return;
  const qty = salvageItem(_sheetItem);
  if (qty > 0) soundForge();
  hideActionSheet();
});

document.getElementById('action-lock').addEventListener('click', () => {
  if (!_sheetItem) return;
  const locked = toggleLockItem(_sheetItem.id);
  soundClick();
  document.getElementById('action-lock').textContent = locked ? '🔓 Déverrouiller' : '🔒 Verrouiller';
  document.getElementById('action-sell').disabled    = locked;
  document.getElementById('action-salvage').disabled = locked;
  // Refresh item info display
  const fresh = findItem(_sheetItem.id);
  if (fresh) {
    _sheetItem = fresh;
    document.querySelector('#action-sheet .action-sheet-item-info').innerHTML = itemDetailsHTML(fresh);
  }
});

// === Open chest ===

const btnOpen = document.getElementById('btn-open');
btnOpen.addEventListener('click', () => {
  if (!canOpen()) return;
  soundChestOpen();
  const result = openChest();
  if (!result) return;
  // Mimic encounter — hand off to the dedicated modal flow.
  if (result.mimic) {
    startCooldownAnim();
    setOpenButtonEnabled(false);
    btnOpen.dataset.cooling = '1';
    setTimeout(() => {
      btnOpen.dataset.cooling = '0';
      setOpenButtonEnabled(true);
    }, CHEST_OPEN_COOLDOWN_MS);
    showMimicPopup(result.mimic);
    return;
  }
  const { item, orbs } = result;
  flashRarity(item.rarity);
  startCooldownAnim();
  setOpenButtonEnabled(false);
  btnOpen.dataset.cooling = '1';
  setTimeout(() => {
    btnOpen.dataset.cooling = '0';
    setOpenButtonEnabled(true);
  }, CHEST_OPEN_COOLDOWN_MS);

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

  // Auto-action?
  const action = autoActionFor(item.rarity);
  if (action === 'sell') {
    sellDrop(item);
    soundCoin();
    pushRecentLoot(item, 'sold');
    return;
  }
  if (action === 'salvage') {
    salvageDrop(item);
    soundForge();
    pushRecentLoot(item, 'salvaged');
    return;
  }
  pushRecentLoot(item, 'fresh');
  showDropPopup(item);
  // Phase 4B — celebratory particles bursting from the popup item frame.
  // Scale intensity by rarity so the "wow" matches the loot.
  requestAnimationFrame(() => {
    const frame = document.querySelector('.drop-item-frame');
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const count = item.rarity === 'ancestral' ? 50
                : item.rarity === 'legendary' ? 32
                : item.rarity === 'epic' ? 18
                : item.rarity === 'rare' ? 10
                : item.rarity === 'magic' ? 5
                : 0;
    if (count > 0) {
      spawnParticles(RARITY_BY_ID[item.rarity].color, cx, cy, count);
      // Element overlay particles (a few sparks in the element's color)
      if (item.element && item.element.id !== 'none') {
        const elemColor = {
          fire: '#ff7a30', frost: '#7adcff', poison: '#5ad858',
          lightning: '#ffe14a', void: '#a058ff',
        }[item.element.id];
        if (elemColor) spawnParticles(elemColor, cx, cy, Math.max(6, count / 3));
      }
    }
  });
});

// === Drop popup actions ===

function resumeLoopIfActive() {
  if (state.combat.loopMode && state.ui.leftTab === 'dungeon') {
    setTimeout(() => {
      if (state.combat.loopMode && !getCurrentDrop()) {
        document.getElementById('btn-fight').click();
      }
    }, 250);
  }
}

document.getElementById('btn-equip').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  equipItem(drop);
  setRecentLootDisposition(drop.id, 'equipped');
  soundClick();
  hideDropPopup();
  resumeLoopIfActive();
});

document.getElementById('btn-keep').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  addToInventory(drop);
  setRecentLootDisposition(drop.id, 'kept');
  soundClick();
  hideDropPopup();
  resumeLoopIfActive();
});

document.getElementById('btn-sell').addEventListener('click', () => {
  const drop = getCurrentDrop();
  if (!drop) return;
  sellDrop(drop);
  setRecentLootDisposition(drop.id, 'sold');
  soundCoin();
  hideDropPopup();
  resumeLoopIfActive();
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

document.getElementById('btn-loop').addEventListener('click', () => {
  const floor = state.combat.currentFloor;
  const beaten = floor < state.combat.highestUnlocked;
  if (!beaten) return;
  state.combat.loopMode = !state.combat.loopMode;
  notify();
  // Auto-trigger first fight if turning ON
  if (state.combat.loopMode) {
    setActiveTab('dungeon');
    setTimeout(() => document.getElementById('btn-fight').click(), 200);
  }
});

// Stop the loop when changing floor manually
document.getElementById('btn-floor-prev').addEventListener('click', () => {
  if (state.combat.loopMode) { state.combat.loopMode = false; notify(); }
});
document.getElementById('btn-floor-next').addEventListener('click', () => {
  if (state.combat.loopMode) { state.combat.loopMode = false; notify(); }
});

document.getElementById('btn-fight').addEventListener('click', async () => {
  const fightBtn = document.getElementById('btn-fight');
  if (fightBtn.disabled) return;
  fightBtn.disabled = true;

  const { result, monster, droppedItem, advanced, milestone } = attemptCurrentFloor();

  // Animate combat HP bars + damage numbers, then apply consequences.
  const playerMaxHp = result.playerMaxHp;
  const monsterMaxHp = monster.hp;
  showCombatBars(playerMaxHp, monsterMaxHp);

  // Tween events at variable speed; cap total animation around 1.5s.
  // Fast combat setting: short delay, no slow-down.
  const events = result.events || [];
  const fast = !!state.settings?.fastCombat;
  const perEvent = fast ? 12 : Math.max(50, Math.min(160, 1400 / Math.max(1, events.length)));

  for (const ev of events) {
    await sleep(perEvent);
    if (ev.type === 'player_hit') {
      updateMonsterHp(ev.monsterHp, monsterMaxHp);
      const c = getMonsterEmojiCenter();
      // Player swings: lunge animation on the avatar
      triggerCombatAnim('character-avatar', 'attacking', 240);
      if (ev.blocked) {
        floatingText('🛡 BLOQUÉ', c.x, c.y, '#5a8af0');
        soundClick();
      } else {
        // Monster recoils + flashes red; crit punches harder + screen shake
        triggerCombatAnim('monster-emoji', ev.isCrit ? 'hit-crit' : 'hit', ev.isCrit ? 450 : 320);
        triggerMonsterCardPulse();
        if (ev.dmg > 0) spawnSlashFromPlayerToMonster();
        floatingDamage(ev.dmg, c.x, c.y, ev.isCrit ? 'crit' : 'normal');
        ev.isCrit ? soundCrit() : soundHit();
        if (ev.isCrit) screenShake(3, 120);
      }
      // Show skill multiplier icons next to the damage number
      if (ev.mults && ev.mults.length > 0) {
        const txt = ev.mults.map(m => m.emoji).join(' ');
        floatingText(txt, c.x + 30, c.y - 20, '#ffe14a');
      }
    } else if (ev.type === 'monster_hit') {
      updatePlayerHp(ev.playerHp, playerMaxHp);
      const c = getCharacterAvatarCenter();
      // Player flinches + red flash on avatar
      triggerCombatAnim('character-avatar', 'took-hit', 280);
      triggerPlayerCardPulse();
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
    } else if (ev.type === 'set_drain') {
      updatePlayerHp(ev.playerHp, playerMaxHp);
      const c = getCharacterAvatarCenter();
      floatingText(`${ev.emoji} +${ev.amount}`, c.x, c.y - 30, '#5acc6a');
    } else if (ev.type === 'set_heal') {
      updatePlayerHp(ev.playerHp, playerMaxHp);
      const c = getCharacterAvatarCenter();
      floatingText(`${ev.emoji} +${ev.amount}`, c.x, c.y - 30, '#7adc4a');
    } else if (ev.type === 'legendary_burn') {
      updateMonsterHp(ev.monsterHp, monsterMaxHp);
      const c = getMonsterEmojiCenter();
      floatingDamage(ev.amount, c.x, c.y, 'normal');
      floatingText(`${ev.emoji} Brûlure`, c.x, c.y - 40, '#ff6a30');
    } else if (ev.type === 'set_freeze') {
      const c = getMonsterEmojiCenter();
      floatingText(`${ev.emoji} GEL`, c.x, c.y, '#5ad8e8');
      soundClick();
    } else if (ev.type === 'set_dodge') {
      const c = getCharacterAvatarCenter();
      floatingText(`${ev.emoji} BLOC`, c.x, c.y, '#ffaa00');
      soundClick();
    } else if (ev.type === 'set_rebirth') {
      updatePlayerHp(ev.playerHp, playerMaxHp);
      const c = getCharacterAvatarCenter();
      floatingText(`${ev.emoji} RENAISSANCE`, c.x, c.y - 40, '#ff3000');
      spawnParticles('#ff3000', c.x, c.y, 25);
      soundWin();
    } else if (ev.type === 'boss_regen') {
      updateMonsterHp(ev.monsterHp, monsterMaxHp);
      const c = getMonsterEmojiCenter();
      floatingText(`🌿 +${ev.amount}`, c.x, c.y - 30, '#6acc6a');
    } else if (ev.type === 'boss_burn') {
      updatePlayerHp(ev.playerHp, playerMaxHp);
      const c = getCharacterAvatarCenter();
      floatingDamage(ev.amount, c.x, c.y, 'player-took');
      floatingText('🔥 Brûlure', c.x, c.y - 40, '#ff7a1a');
    } else if (ev.type === 'boss_shield') {
      const c = getMonsterEmojiCenter();
      floatingText('🛡 BOUCLIER', c.x, c.y, '#5a8af0');
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
    if (monster.keyDrop) {
      floatingText(`+${monster.keyDrop} 🗝`, c.x + 40, c.y - 30, '#ffd060');
      spawnParticles('#ffd060', c.x + 40, c.y, 10);
      soundCoin();
    }
    if (monster.isBoss) screenShake(8, 350);
  } else {
    soundLose();
    screenShake(10, 400);
  }

  if (result.won && monster.keyDrop) {
    appendCombatLog([`🗝 +${monster.keyDrop} clé${monster.keyDrop > 1 ? 's' : ''}`], 'reward');
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
    const action = autoActionFor(droppedItem.rarity);
    if (action === 'sell') {
      sellDrop(droppedItem);
      soundCoin();
    } else if (action === 'salvage') {
      salvageDrop(droppedItem);
      soundForge();
    } else {
      showDropPopup(droppedItem);
    }
  }

  await sleep(400);
  hideCombatBars();
  fightBtn.disabled = false;

  // Loop mode : re-trigger fight if still in beaten-floor mode and player survived
  if (state.combat.loopMode) {
    const floor = state.combat.currentFloor;
    const beaten = floor < state.combat.highestUnlocked;
    if (!beaten || !result.won) {
      // Lost the fight, or progressed onto a new highest floor → stop the loop
      state.combat.loopMode = false;
      notify();
    } else if (state.ui.leftTab === 'dungeon') {
      // Schedule next fight (let drop popup, if any, block us)
      setTimeout(() => {
        if (state.combat.loopMode && !getCurrentDrop()) {
          document.getElementById('btn-fight').click();
        }
      }, 350);
    }
  }
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
  } else if (btn.dataset.action === 'mode') {
    const cur = state.autoSell[rarity]?.mode || 'sell';
    setAutoMode(rarity, cur === 'sell' ? 'salvage' : 'sell');
  }
});

// === Inventory: click on item ===
// Desktop: click=equip, Shift+click=sell, Ctrl+click=salvage, Alt+click=lock
// Mobile (touch): click opens action sheet with all options

document.getElementById('inventory-grid').addEventListener('click', (e) => {
  const icon = e.target.closest('[data-item-id]');
  if (!icon) return;
  const item = findItem(icon.dataset.itemId);
  if (!item) return;

  // On touch devices, open action sheet for all interactions
  if (isTouchDevice() && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
    showItemActionSheet(item);
    return;
  }

  // Desktop modifier-key interactions
  if (e.altKey) {
    const locked = toggleLockItem(item.id);
    soundClick();
    const r = icon.getBoundingClientRect();
    floatingText(locked ? '🔒 Verrouillé' : '🔓 Déverrouillé', r.left + r.width / 2, r.top, '#ffe14a');
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    const qty = salvageItem(item);
    if (qty > 0) {
      soundForge();
      const r = icon.getBoundingClientRect();
      floatingText(`+${qty} 💎`, r.left + r.width / 2, r.top, '#a0e0ff');
    } else if (item.locked) {
      const r = icon.getBoundingClientRect();
      floatingText('🔒 Verrouillé', r.left + r.width / 2, r.top, '#ff7a1a');
    }
  } else if (e.shiftKey) {
    const earned = sellItem(item);
    if (earned > 0) soundCoin();
    else if (item.locked) {
      const r = icon.getBoundingClientRect();
      floatingText('🔒 Verrouillé', r.left + r.width / 2, r.top, '#ff7a1a');
    }
  } else {
    equipItem(item);
    soundClick();
  }
});

// === Equipment: click on equipped slot ===
// Desktop: click = unequip
// Mobile: click = action sheet (shows item details + unequip/sell/salvage buttons)

document.getElementById('equipment-grid').addEventListener('click', (e) => {
  const slotEl = e.target.closest('.equipment-slot');
  if (!slotEl) return;
  const slotId = slotEl.dataset.slotId;
  if (!slotId) return;
  const equipped = state.equipment[slotId];
  if (!equipped) return;
  if (isTouchDevice()) {
    showItemActionSheet(equipped, slotId);
  } else {
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
  // Confirm before selling epic+
  if (state.settings?.confirmDestructiveSell && (raritySet.has('epic') || raritySet.has('legendary') || raritySet.has('ancestral'))) {
    const ok = confirm('Vendre en masse des objets épiques+ ? (verrouille les pépites précieuses avec Alt+clic d\'abord)');
    if (!ok) return;
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

// === Tooltip on hover (desktop only — mobile uses action sheet) ===

document.body.addEventListener('mousemove', (e) => {
  // Skip on touch/coarse-pointer devices; action sheet handles item info there
  if (isTouchDevice()) return;
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

document.getElementById('btn-stats-breakdown').addEventListener('click', () => {
  showModal('stats-breakdown-modal');
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

document.getElementById('btn-bounties').addEventListener('click', () => {
  refreshBoardIfEmpty();
  showModal('bounties-modal');
});

document.getElementById('bounties-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-bounty-reroll]');
  if (!btn || btn.disabled) return;
  if (rerollBounty(btn.dataset.bountyReroll)) {
    soundClick();
  }
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

// === HUD dropdown menu (Aide / Son / Paramètres / Export / Import / Reset) ===
const _hudMenu     = document.getElementById('hud-menu-list');
const _hudMenuBtn  = document.getElementById('btn-menu');

function toggleHudMenu(open) {
  const shouldOpen = open ?? _hudMenu.classList.contains('hidden');
  _hudMenu.classList.toggle('hidden', !shouldOpen);
  _hudMenuBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

_hudMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleHudMenu();
  soundClick();
});

// Click any menu item → close menu (each button keeps its own behavior)
_hudMenu.addEventListener('click', () => toggleHudMenu(false));

// Click outside → close menu
document.addEventListener('click', (e) => {
  if (_hudMenu.classList.contains('hidden')) return;
  if (e.target.closest('.hud-menu')) return;
  toggleHudMenu(false);
});

// Help modal
document.getElementById('btn-help').addEventListener('click', () => {
  showModal('help-modal');
});
// "Revoir l'intro" inside the help modal → re-show the welcome flow
document.getElementById('btn-replay-welcome').addEventListener('click', () => {
  hideModal('help-modal');
  state.ui.hasSeenWelcome = false;
  showModal('welcome-modal');
  soundClick();
});

// Settings modal
document.getElementById('btn-settings').addEventListener('click', () => {
  showModal('settings-modal');
});
document.getElementById('setting-mute').addEventListener('change', (e) => {
  setMuted(e.target.checked);
  state.ui.muted = e.target.checked;
  updateMuteButton();
  notify();
});
document.getElementById('setting-fast-combat').addEventListener('change', (e) => {
  state.settings.fastCombat = e.target.checked;
  notify();
});
document.getElementById('setting-reduced-particles').addEventListener('change', (e) => {
  state.settings.reducedParticles = e.target.checked;
  notify();
});
document.getElementById('setting-confirm-ascend').addEventListener('change', (e) => {
  state.settings.confirmAscend = e.target.checked;
  notify();
});
document.getElementById('setting-confirm-sell').addEventListener('change', (e) => {
  state.settings.confirmDestructiveSell = e.target.checked;
  notify();
});
document.getElementById('setting-hard-mode').addEventListener('change', (e) => {
  state.settings.hardMode = e.target.checked;
  notify();
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
  const bonusPct = 15 * newLevel;
  let confirmed = true;
  if (state.settings?.confirmAscend !== false) {
    const msg = `🌟 Ascension Niv ${newLevel} ?\n\n`
      + `Tu repars de zéro (or, items, coffre T1, étage 1).\n`
      + `Tu gardes : succès, prestige, statistiques.\n\n`
      + `Bonus permanent : +${bonusPct}% drops raretés et or de vente.\n\n`
      + `Confirmer ?`;
    confirmed = confirm(msg);
  }
  if (confirmed) {
    if (ascend()) {
      soundAscension();
      screenShake(8, 600);
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
  // Ignore when typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'Escape') {
    const drop = getCurrentDrop();
    if (drop) {
      addToInventory(drop);
      hideDropPopup();
      return;
    }
    if (isModalOpen('welcome-modal')) { dismissWelcome(); return; }
    const modals = ['forge-modal','achievements-modal','help-modal','talents-modal','codex-modal','skills-modal','bounties-modal','settings-modal','stats-breakdown-modal'];
    for (const id of modals) {
      if (isModalOpen(id)) { hideModal(id); return; }
    }
    return;
  }

  // Block all other shortcuts when a modal is open
  const anyModal = ['forge-modal','achievements-modal','help-modal','talents-modal','codex-modal','skills-modal','bounties-modal','settings-modal','stats-breakdown-modal','welcome-modal']
    .some(id => isModalOpen(id));
  if (anyModal) return;

  if (e.key === ' ' || e.code === 'Space') {
    if (getCurrentDrop()) return;
    e.preventDefault();
    if (state.ui.leftTab === 'dungeon') {
      document.getElementById('btn-fight').click();
    } else if (canOpen()) {
      btnOpen.click();
    }
    return;
  }
  // Tab switch
  if (e.key === '1') { setActiveTab('chest'); return; }
  if (e.key === '2') { setActiveTab('dungeon'); return; }
  // Modal shortcuts (no Ctrl/Alt to avoid clashing with browser)
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const lower = e.key.toLowerCase();
  if (lower === 'i') { showModal('forge-modal'); return; }   // (I)nventaire de forge
  if (lower === 't') { showModal('talents-modal'); return; } // (T)alents
  if (lower === 'a') { showModal('achievements-modal'); return; } // (A)chievements
  if (lower === 'b') { showModal('bounties-modal'); return; } // (B)ounties
  if (lower === 'c') { showModal('codex-modal'); return; }   // (C)odex
  if (lower === 'k') { showModal('skills-modal'); return; }  // s(K)ills
  if (lower === 's') { showModal('stats-breakdown-modal'); return; } // (S)tats
});
