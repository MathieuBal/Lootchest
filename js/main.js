// Bootstrap + event wiring for the redesigned screen-router UI.
// All DOM is built by ui.js; this file owns interactions (event delegation on
// document so handlers survive full re-renders) and the combat sequence.
import { state, subscribe, resetState, notify } from './state.js';
import { RARITIES, RARITY_BY_ID, CHEST_OPEN_COOLDOWN_MS, CURRENCY_BY_ID } from './data.js';
import { startAutosave, loadFromLocal, exportSave, importSave, clearLocal } from './save.js';
import { openChest, upgradeChest, canOpen } from './chest.js';
import { attemptCurrentFloor, setCurrentFloor, attemptDiveFight } from './combat.js';
import {
  startDive, isDiving, getSession, recordWin, openBoonChoice, chooseBoon,
  finalizeDive, nextStartHp, diveMods, diveDepth,
} from './dive.js';
import { checkAchievements, onAchievementUnlocked } from './achievements.js';
import { FORGE_ACTIONS, applyMasterCraft } from './forge.js';
import { upgradeTalent } from './talents.js';
import { refreshBoardIfEmpty, rerollBounty, onBountyComplete } from './bounties.js';
import { canAscend, ascend } from './prestige.js';
import { chooseRelic } from './relics.js';
import { toggleAbility } from './abilities.js';
import {
  accruePassive, grantDungeonResources, buildOrUpgrade, upgradeTownhall, assignWorker, commitCraft,
  tickConstruction, isBusy as villageIsBusy, BUILDING_BY_ID as VILLAGE_BUILDING_BY_ID,
} from './village.js';
import { craftItem } from './loot.js';
import {
  unlockAudio, toggleMuted, isMuted, setMuted,
  soundChestOpen, soundDrop, soundCoin, soundHit, soundCrit,
  soundWin, soundLose, soundAchievement, soundUpgrade, soundClick,
  soundForge, soundAscension,
} from './sound.js';
import { spawnParticles, screenShake, floatingDamage, floatingText } from './fx.js';
import { equipItem, unequipSlot, autoEquipBest } from './character.js';
import {
  sellItem, sellAllOfRarities, addToInventory, sellDrop,
  salvageItem, salvageAllOfRarities, toggleLockItem, autoActionFor, salvageDrop,
  unlockAutoSell, toggleAutoSell, setAutoMode, isAutoSellOn,
} from './inventory.js';
import * as UI from './ui.js';

// ── Init ─────────────────────────────────────────────────────
loadFromLocal();
startAutosave();
subscribe(checkAchievements);
subscribe(UI.renderAll);
subscribe(refreshNextStepHint);
onAchievementUnlocked(ach => {
  UI.showToast(ach.emoji, `Succès : ${ach.name}`, ach.reward?.gold ? `+${ach.reward.gold.toLocaleString('fr-FR')} 💰` : '');
  soundAchievement();
});
onBountyComplete(b => {
  const bits = [`+${b.reward.gold.toLocaleString('fr-FR')} 💰`];
  for (const [oid, q] of Object.entries(b.reward.orbs || {})) { const o = CURRENCY_BY_ID[oid]; if (o) bits.push(`${q} ${o.emoji}`); }
  if (b.reward.talents) bits.push(`${b.reward.talents} 🌳`);
  UI.showToast(b.emoji, `Contrat complété : ${b.name}`, bits.join(' · '));
  soundAchievement();
  spawnParticles(b.diffColor, innerWidth / 2, innerHeight / 3, 30);
});
setMuted(!!state.ui?.muted);
UI.mountApp();
checkAchievements();
refreshBoardIfEmpty();

// Village passive production: accrue offline gains once, then trickle on a timer.
accruePassive();
tickConstruction(); // finish anything that completed while away
let _vtick = 0;
setInterval(() => {
  const done = tickConstruction();          // notifies internally on completion
  const accrued = (++_vtick % 5 === 0);
  if (accrued) accruePassive();
  if (done) {
    const b = VILLAGE_BUILDING_BY_ID[done];
    soundUpgrade();
    UI.showToast(b ? b.emoji : '🏛️', 'Chantier terminé', b ? b.name : 'Mairie');
    spawnParticles('#f0c463', innerWidth / 2, innerHeight / 3, 24);
    return;
  }
  // Re-render only when it actually matters — avoid rebuilding the whole DOM
  // (and any open modal) every second. Live updates are only needed while the
  // player is watching the Village (build countdown, resource trickle).
  if (UI.getActiveTab() === 'village' && (villageIsBusy() || accrued)) notify();
}, 1000);

if (!state.ui.hasSeenIntro) UI.startIntro();
else if (!state.ui.hasSeenWelcome) UI.navOverlay('onboarding');
else if (state.prestige?.pendingRelicChoice?.length) UI.navOverlay('relicChoice');

document.addEventListener('click', unlockAudio, { once: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
function findItem(id) {
  return state.inventory.find(i => i.id === id)
      || Object.values(state.equipment).find(i => i && i.id === id) || null;
}

function dismissWelcome() {
  if (state.ui.hasSeenWelcome) return;
  state.ui.hasSeenWelcome = true;
  UI.closeOverlay();
  notify();
}

// ── Next-step hint (kept simple: drives the hub pulse text in ui.js) ──
function refreshNextStepHint() { /* hub computes its own hint; nothing imperative needed */ }

// ═════════════════════════════════════════════════════════════
// Global click delegation
// ═════════════════════════════════════════════════════════════
document.body.addEventListener('click', async (e) => {
  const t = e.target;

  // Intro cinematic
  const introBtn = t.closest('[data-intro]');
  if (introBtn) { if (introBtn.dataset.intro === 'skip') UI.endIntro(); else { soundClick(); UI.advanceIntro(); } return; }
  if (t.closest('[data-intro-replay]')) { UI.startIntro(); soundClick(); return; }

  // Close overlay (backdrop / ✕)
  if (t.closest('[data-close-overlay]')) { UI.closeOverlay(); return; }

  // Tab / rail navigation
  const tabBtn = t.closest('[data-tab]');
  if (tabBtn) { UI.navTab(tabBtn.dataset.tab); soundClick(); return; }
  const navBtn = t.closest('[data-nav]');
  if (navBtn) { UI.navTab(navBtn.dataset.nav); soundClick(); return; }

  // Open an overlay
  const ovBtn = t.closest('[data-overlay]');
  if (ovBtn) { if (ovBtn.dataset.overlay === 'contracts') refreshBoardIfEmpty(); UI.navOverlay(ovBtn.dataset.overlay); soundClick(); return; }
  if (t.closest('[data-menu]')) { UI.navOverlay('menu'); soundClick(); return; }

  // ── Hub: open chest ──
  if (t.closest('#btn-open')) { openChestFlow(); return; }
  if (t.closest('#btn-upgrade')) {
    if (upgradeChest()) { soundUpgrade(); const c = UI.getChestCenter(); spawnParticles('#f5c842', c.x, c.y, 30); }
    return;
  }

  // ── Dungeon: floor select / fight / loop ──
  const floorBtn = t.closest('[data-floor]');
  if (floorBtn && !floorBtn.disabled) {
    setCurrentFloor(parseInt(floorBtn.dataset.floor, 10));
    if (state.combat.loopMode) { state.combat.loopMode = false; }
    notify(); soundClick(); return;
  }
  if (t.closest('#btn-fight')) { fightFlow(); return; }
  if (t.closest('#btn-loop')) {
    const floor = state.combat.currentFloor;
    if (floor >= state.combat.highestUnlocked) return;
    state.combat.loopMode = !state.combat.loopMode;
    notify();
    if (state.combat.loopMode) setTimeout(fightFlow, 150);
    return;
  }

  // ── Inventory ──
  const fchip = t.closest('[data-filter]');
  if (fchip) { UI.setInvFilter(fchip.dataset.filter); soundClick(); return; }
  if (t.closest('#btn-auto-equip')) {
    const n = autoEquipBest();
    if (n > 0) { soundClick(); floatingText(`Équipé ×${n}`, innerWidth / 2, innerHeight / 2, '#f5c842'); }
    return;
  }
  // ── Auto-vente & gestion en masse ──
  const asUnlock = t.closest('[data-autosell-unlock]');
  if (asUnlock && !asUnlock.disabled) { if (unlockAutoSell(asUnlock.dataset.autosellUnlock)) { soundUpgrade(); } return; }
  const asSeg = t.closest('[data-autosell]');
  if (asSeg) {
    const [rar, target] = asSeg.dataset.autosell.split(':');
    const on = isAutoSellOn(rar);
    if (target === 'off') { if (on) toggleAutoSell(rar); }
    else { if (!on) toggleAutoSell(rar); setAutoMode(rar, target); }
    soundClick(); return;
  }
  const bSell = t.closest('[data-bulk-sell]');
  if (bSell && !bSell.disabled) { if (sellAllOfRarities(new Set([bSell.dataset.bulkSell])) > 0) soundCoin(); return; }
  const bSalv = t.closest('[data-bulk-salvage]');
  if (bSalv && !bSalv.disabled) { const { totalShards } = salvageAllOfRarities(new Set([bSalv.dataset.bulkSalvage])); if (totalShards > 0) soundForge(); return; }

  // Forge: pick item (checked before the inventory grid — the forge picker
  // reuses the .inv-grid class, so this must win).
  const tile = t.closest('[data-item-id]');
  if (tile && t.closest('.forge-pick')) { UI.setForgeSelected(tile.dataset.itemId); soundClick(); return; }
  if (t.closest('#forge-deselect')) { UI.setForgeSelected(null); return; }

  // Item tile → desktop selects the inline detail panel; mobile opens the sheet.
  if (tile && t.closest('.inv-grid, .doll-slot')) {
    if (UI.getMode() === 'desktop') UI.selectInvItem(tile.dataset.itemId);
    else UI.navOverlay('item', { itemId: tile.dataset.itemId });
    soundClick(); return;
  }

  // Item detail actions
  const iAct = t.closest('[data-item-action]');
  if (iAct) { itemAction(iAct.dataset.itemAction); return; }

  // Loot reveal actions
  if (t.closest('#btn-equip')) { const d = UI.getCurrentDrop(); if (d) { equipItem(d); soundClick(); UI.hideDropPopup(); resumeLoop(); } return; }
  if (t.closest('#btn-keep')) { const d = UI.getCurrentDrop(); if (d) { addToInventory(d); soundClick(); UI.hideDropPopup(); resumeLoop(); } return; }
  if (t.closest('#btn-sell') && UI.getCurrentDrop()) { const d = UI.getCurrentDrop(); sellDrop(d); soundCoin(); UI.hideDropPopup(); resumeLoop(); return; }

  // Forge actions
  const fAct = t.closest('[data-forge-action]');
  if (fAct) { forgeAction(fAct.dataset.forgeAction); return; }
  const mcRow = t.closest('.mc-row[data-affix-id]');
  if (mcRow) {
    const item = state.inventory.find(i => i.id === UI.getForgeSelectedId());
    if (item && applyMasterCraft(item, mcRow.dataset.affixId)) { soundForge(); soundDrop(item.rarity); UI.setForgeMode('actions'); }
    return;
  }

  // Codex tabs
  const cxTab = t.closest('[data-codex-tab]');
  if (cxTab) { UI.setCodexTab(cxTab.dataset.codexTab); soundClick(); return; }

  // Talents
  const talBtn = t.closest('[data-talent]');
  if (talBtn && !talBtn.disabled) { if (upgradeTalent(talBtn.dataset.talent)) { soundClick(); soundUpgrade(); } return; }

  // Bounty reroll
  const rrBtn = t.closest('[data-bounty-reroll]');
  if (rrBtn && !rrBtn.disabled) { if (rerollBounty(rrBtn.dataset.bountyReroll)) soundClick(); return; }

  // Ascension
  if (t.closest('#btn-ascend')) { ascendFlow(); return; }

  // Relic choice (after ascension)
  const relicBtn = t.closest('[data-relic]');
  if (relicBtn) { chooseRelicFlow(relicBtn.dataset.relic); return; }

  // Ability loadout toggle
  const abBtn = t.closest('[data-ability]');
  if (abBtn) { if (toggleAbility(abBtn.dataset.ability)) { soundClick(); notify(); } return; }

  // Village
  const vopen = t.closest('[data-village-open]');
  if (vopen) { UI.navOverlay('villageBuilding', { id: vopen.dataset.villageOpen }); soundClick(); return; }
  const vbuild = t.closest('[data-village-build]');
  if (vbuild && !vbuild.disabled) { if (buildOrUpgrade(vbuild.dataset.villageBuild)) { soundUpgrade(); } return; }
  if (t.closest('[data-village-townhall]')) { if (upgradeTownhall()) { soundUpgrade(); } return; }
  const vasg = t.closest('[data-village-assign]');
  if (vasg && !vasg.disabled) { if (assignWorker(vasg.dataset.villageAssign, parseInt(vasg.dataset.delta, 10))) soundClick(); return; }
  if (t.closest('[data-village-craft-rarity]')) { UI.setForgeCraftRarity(t.closest('[data-village-craft-rarity]').dataset.villageCraftRarity); soundClick(); return; }
  const vcraft = t.closest('[data-village-craft]');
  if (vcraft && !vcraft.disabled) {
    const slot = vcraft.dataset.villageCraft, rarity = UI.getForgeCraftRarity();
    const tier = commitCraft(slot, rarity);
    if (tier) { soundForge(); UI.showDropPopup(craftItem(slot, tier, rarity)); }
    return;
  }

  // Deep Dive
  if (t.closest('[data-dive="start"]')) { beginDive(); return; }
  if (t.closest('[data-dive="exit"]')) { diveExit(); return; }
  const boonBtn = t.closest('[data-dive-boon]');
  if (boonBtn) { diveBoonPick(boonBtn.dataset.diveBoon); return; }

  // Onboarding start
  if (t.closest('#btn-welcome-start')) { dismissWelcome(); soundClick(); return; }

  // Generic actions (menu / settings)
  const act = t.closest('[data-action]');
  if (act) { genericAction(act.dataset.action); return; }
});

// ── Input changes (search / sort / settings) ────────────────
document.body.addEventListener('input', (e) => {
  if (e.target.id === 'inv-search') UI.setInvSearchText(e.target.value);
});
document.body.addEventListener('change', (e) => {
  if (e.target.id === 'inv-sort') { UI.setInvSortMode(e.target.value); return; }
  const setEl = e.target.closest('[data-setting]');
  if (setEl) {
    const key = setEl.dataset.setting;
    const on = setEl.checked;
    if (key === 'mute') { setMuted(on); state.ui.muted = on; }
    else state.settings[key] = on;
    notify();
    return;
  }
  if (e.target.id === 'file-import') {
    const file = e.target.files[0];
    if (file) importSave(file).catch(err => alert('Import échoué : ' + err.message));
    e.target.value = '';
  }
});

// ── Desktop hover tooltips ───────────────────────────────────
document.body.addEventListener('mousemove', (e) => {
  if (isTouch()) return;
  const tile = e.target.closest('.inv-grid [data-item-id], .doll-slot [data-item-id]');
  if (tile) { const it = findItem(tile.dataset.itemId); if (it) { UI.showTooltip(it, e.clientX, e.clientY); return; } }
  UI.hideTooltip();
});

// ═════════════════════════════════════════════════════════════
// Flows
// ═════════════════════════════════════════════════════════════
function openChestFlow() {
  if (!canOpen()) { if (!state.keys) UI.showToast('🗝', 'Pas de clé', 'Farme des clés au donjon'); return; }
  soundChestOpen();
  const result = openChest();
  if (!result) return;
  const { item, orbs } = result;
  UI.playChestOpen();
  flashAndCooldown(item);
  soundDrop(item.rarity);
  const center = UI.getChestCenter();
  const rcolor = RARITY_BY_ID[item.rarity].color;
  if (['rare', 'epic', 'legendary', 'ancestral'].includes(item.rarity)) {
    const n = { ancestral: 60, legendary: 40, epic: 24 }[item.rarity] || 16;
    spawnParticles(rcolor, center.x, center.y, n);
    if (['legendary', 'ancestral'].includes(item.rarity)) screenShake(item.rarity === 'ancestral' ? 10 : 6, 350);
  }
  if (orbs && orbs.length) {
    let off = 0;
    for (const oid of orbs) { const d = CURRENCY_BY_ID[oid]; if (!d) continue; floatingText(`+1 ${d.emoji}`, center.x, center.y - 40 - off, d.color); off += 22; spawnParticles(d.color, center.x, center.y, 12); }
    soundCoin();
  }
  const action = autoActionFor(item.rarity);
  if (action === 'sell') { sellDrop(item); soundCoin(); return; }
  if (action === 'salvage') { salvageDrop(item); soundForge(); return; }
  // Let the lid-lift + flash read before the reveal slides in.
  setTimeout(() => UI.showDropPopup(item), 300);
}

function flashAndCooldown(item) {
  UI.flashRarity(item.rarity);
  UI.startCooldownAnim();
  UI.setOpenButtonEnabled(false);
  setTimeout(() => UI.setOpenButtonEnabled(true), CHEST_OPEN_COOLDOWN_MS);
}

function resumeLoop() {
  if (state.combat.loopMode && UI.getActiveTab() === 'dungeon') {
    setTimeout(() => { if (state.combat.loopMode && !UI.getCurrentDrop()) fightFlow(); }, 250);
  }
}

let fighting = false;
async function fightFlow() {
  if (fighting || isDiving()) return;
  fighting = true;
  try {
    const { result, monster, droppedItem, advanced, milestone } = attemptCurrentFloor();
    UI.openCombat(monster);
    await sleep(60);
    const playerMaxHp = result.playerMaxHp;
    const monsterMaxHp = monster.hp;
    UI.showCombatBars(playerMaxHp, monsterMaxHp);

    const events = result.events || [];
    const fast = !!state.settings?.fastCombat;
    const perEvent = fast ? 12 : Math.max(45, Math.min(150, 1300 / Math.max(1, events.length)));

    for (const ev of events) {
      await sleep(perEvent);
      handleCombatEvent(ev, monsterMaxHp, playerMaxHp);
    }
    await sleep(280);

    UI.appendCombatLog(result.log, result.won ? 'win' : 'lose');
    if (result.won) {
      soundWin();
      UI.setCombatCall(monster.isBoss ? 'VICTOIRE !' : 'Vaincu', '#6acc6a');
      const c = UI.getMonsterEmojiCenter();
      spawnParticles(monster.isBoss ? '#ff7a1a' : '#ffe14a', c.x, c.y, monster.isBoss ? 40 : 20);
      floatingText(`+${monster.goldReward} 💰`, c.x, c.y - 30, '#f5c842');
      if (monster.keyDrop) { floatingText(`+${monster.keyDrop} 🗝`, c.x + 40, c.y - 30, '#ffd060'); soundCoin(); UI.appendCombatLog([`🗝 +${monster.keyDrop} clé${monster.keyDrop > 1 ? 's' : ''}`], 'reward'); }
      const res = grantDungeonResources(monster.floor, monster.isBoss, monster.isElite);
      if (res) UI.appendCombatLog([`🪵 +${res.wood} · 🪨 +${res.stone}`], 'reward');
      if (monster.isBoss) screenShake(8, 350);
    } else {
      soundLose(); UI.setCombatCall('DÉFAITE', '#ff5050'); screenShake(10, 400);
    }
    if (advanced) UI.appendCombatLog([`🆙 Étage débloqué : ${state.combat.highestUnlocked}`], 'reward');
    if (milestone) {
      const orbBits = Object.entries(milestone.reward.orbs).filter(([, q]) => q > 0).map(([id, q]) => `${q} ${CURRENCY_BY_ID[id].emoji}`).join(' · ');
      UI.appendCombatLog([`🎉 PALIER ÉTAGE ${milestone.floor} (niv ${milestone.level})`, `+${milestone.reward.gold.toLocaleString('fr-FR')} 💰${orbBits ? ' · ' + orbBits : ''}`], 'reward');
      UI.showToast('🎉', `Palier étage ${milestone.floor} !`, `+${milestone.reward.gold.toLocaleString('fr-FR')} 💰  ${orbBits}`);
      soundAchievement(); screenShake(14, 600);
      spawnParticles('#ffe14a', innerWidth / 2, innerHeight / 2, 60, { minSpeed: 150, maxSpeed: 400, size: 10 });
    }

    let drop = null;
    if (droppedItem) {
      UI.appendCombatLog([`🎁 Drop : ${droppedItem.name}`], 'reward');
      soundDrop(droppedItem.rarity);
      const action = autoActionFor(droppedItem.rarity);
      if (action === 'sell') { sellDrop(droppedItem); soundCoin(); }
      else if (action === 'salvage') { salvageDrop(droppedItem); soundForge(); }
      else drop = droppedItem;
    }

    await sleep(700);
    UI.closeCombat();
    if (drop) UI.showDropPopup(drop);

    // Loop mode continuation
    if (state.combat.loopMode) {
      const beaten = state.combat.currentFloor < state.combat.highestUnlocked;
      if (!beaten || !result.won) { state.combat.loopMode = false; notify(); }
      else if (UI.getActiveTab() === 'dungeon' && !drop) setTimeout(fightFlow, 350);
    }
  } finally {
    fighting = false;
  }
}

// ── Deep Dive controller ─────────────────────────────────────
let diving = false;
function beginDive() {
  if (state.combat.loopMode) { state.combat.loopMode = false; }
  if (!startDive()) return;
  soundAscension();
  UI.showToast('🌊', 'Plongée lancée', 'Descends aussi profond que possible !');
  diveFlow();
}

async function diveFlow() {
  if (diving || !isDiving()) return;
  diving = true;
  try {
    const s = getSession();
    const startHp = nextStartHp();
    const { monster, result, won, maxHp } = attemptDiveFight(s.baseFloor, s.depth + 1, startHp, diveMods());
    UI.openCombat(monster);
    await sleep(60);
    const monsterMaxHp = monster.hp;
    UI.showCombatBars(maxHp, monsterMaxHp);
    if (startHp != null) UI.updatePlayerHp(startHp, maxHp); // begin from carried HP

    const events = result.events || [];
    const fast = !!state.settings?.fastCombat;
    const perEvent = fast ? 12 : Math.max(40, Math.min(140, 1200 / Math.max(1, events.length)));
    for (const ev of events) {
      await sleep(perEvent);
      handleCombatEvent(ev, monsterMaxHp, maxHp);
    }
    await sleep(260);
    UI.appendCombatLog(result.log, won ? 'win' : 'lose');

    if (won) {
      const rec = recordWin(monster, result);
      soundWin();
      UI.setCombatCall(`Profondeur ${rec.depth}`, '#5ad8e8');
      const c = UI.getMonsterEmojiCenter();
      spawnParticles('#5ad8e8', c.x, c.y, 18);
      floatingText(`+${rec.gold} 💰`, c.x, c.y - 30, '#f5c842');
      UI.appendCombatLog([`🌊 Profondeur ${rec.depth} · butin en jeu sécurisé`], 'reward');
      await sleep(600);
      UI.closeCombat();
      if (rec.checkpoint) {
        openBoonChoice();
        UI.navOverlay('diveBoon');     // pauses the loop until the player picks/exits
      } else if (isDiving()) {
        setTimeout(diveFlow, 320);
      }
    } else {
      soundLose(); UI.setCombatCall('VAINCU', '#ff5050'); screenShake(10, 400);
      await sleep(600);
      UI.closeCombat();
      const summary = finalizeDive(true);
      UI.navOverlay('diveSummary', { summary });
    }
  } finally {
    diving = false;
  }
}

function diveBoonPick(id) {
  if (chooseBoon(id)) { soundUpgrade(); UI.closeOverlay(); setTimeout(diveFlow, 200); }
}

function diveExit() {
  const summary = finalizeDive(false);
  UI.closeOverlay();
  if (summary) UI.navOverlay('diveSummary', { summary });
}

function handleCombatEvent(ev, monsterMaxHp, playerMaxHp) {
  if (ev.type === 'player_hit') {
    UI.updateMonsterHp(ev.monsterHp, monsterMaxHp);
    const c = UI.getMonsterEmojiCenter();
    if (ev.blocked) { floatingText('🛡 BLOQUÉ', c.x, c.y, '#5a8af0'); soundClick(); }
    else { floatingDamage(ev.dmg, c.x, c.y, ev.isCrit ? 'crit' : 'normal'); ev.isCrit ? soundCrit() : soundHit(); if (ev.isCrit) { screenShake(3, 120); UI.setCombatCall('Frappe Critique', '#ffe14a'); } }
    if (ev.mults && ev.mults.length) floatingText(ev.mults.map(m => m.emoji).join(' '), c.x + 30, c.y - 20, '#ffe14a');
  } else if (ev.type === 'monster_hit') {
    UI.updatePlayerHp(ev.playerHp, playerMaxHp);
    const c = UI.getCharacterAvatarCenter();
    floatingDamage(ev.dmg, c.x, c.y, 'player-took'); soundHit();
    if (ev.swift) floatingText('⚡', c.x + 28, c.y - 24, '#ffe14a');
  } else if (ev.type === 'monster_thorns') {
    UI.updatePlayerHp(ev.playerHp, playerMaxHp);
    const c = UI.getCharacterAvatarCenter();
    floatingDamage(ev.amount, c.x, c.y, 'player-took'); floatingText('🌵 Épines', c.x, c.y - 40, '#7adc4a'); soundHit();
  } else if (ev.type === 'monster_leech') {
    UI.updateMonsterHp(ev.monsterHp, monsterMaxHp);
    const c = UI.getMonsterEmojiCenter();
    floatingText(`🩸 +${ev.amount}`, c.x, c.y - 30, '#ff4a6a');
  } else if (ev.type === 'skill_heal') {
    UI.updatePlayerHp(ev.playerHp, playerMaxHp);
    const c = UI.getCharacterAvatarCenter();
    floatingDamage(ev.amount, c.x, c.y, 'heal'); floatingText(`${ev.emoji} Soin`, c.x, c.y - 40, '#6acc6a'); soundUpgrade(); spawnParticles('#6acc6a', c.x, c.y, 12);
  } else if (ev.type === 'skill_dodge') {
    floatingText('💨 ESQUIVE', UI.getCharacterAvatarCenter().x, UI.getCharacterAvatarCenter().y, '#5a8af0'); soundClick();
  } else if (ev.type === 'skill_reflect' || ev.type === 'legendary_burn') {
    UI.updateMonsterHp(ev.monsterHp, monsterMaxHp);
    const c = UI.getMonsterEmojiCenter();
    floatingDamage(ev.amount, c.x, c.y, 'normal'); floatingText(`${ev.emoji} ${ev.type === 'legendary_burn' ? 'Brûlure' : 'Épines'}`, c.x, c.y - 40, '#ff6a30'); soundHit();
  } else if (ev.type === 'set_drain' || ev.type === 'set_heal') {
    UI.updatePlayerHp(ev.playerHp, playerMaxHp);
    const c = UI.getCharacterAvatarCenter();
    floatingText(`${ev.emoji} +${ev.amount}`, c.x, c.y - 30, '#7adc4a');
  } else if (ev.type === 'set_freeze' || ev.type === 'boss_shield') {
    floatingText(`${ev.emoji || '🛡'} ${ev.type === 'set_freeze' ? 'GEL' : 'BOUCLIER'}`, UI.getMonsterEmojiCenter().x, UI.getMonsterEmojiCenter().y, '#5ad8e8');
  } else if (ev.type === 'set_dodge') {
    floatingText(`${ev.emoji} BLOC`, UI.getCharacterAvatarCenter().x, UI.getCharacterAvatarCenter().y, '#ffaa00'); soundClick();
  } else if (ev.type === 'set_rebirth') {
    UI.updatePlayerHp(ev.playerHp, playerMaxHp);
    const c = UI.getCharacterAvatarCenter();
    floatingText(`${ev.emoji} RENAISSANCE`, c.x, c.y - 40, '#ff3000'); spawnParticles('#ff3000', c.x, c.y, 25); soundWin();
  } else if (ev.type === 'boss_regen') {
    UI.updateMonsterHp(ev.monsterHp, monsterMaxHp);
    const c = UI.getMonsterEmojiCenter(); floatingText(`🌿 +${ev.amount}`, c.x, c.y - 30, '#6acc6a');
  } else if (ev.type === 'boss_burn') {
    UI.updatePlayerHp(ev.playerHp, playerMaxHp);
    const c = UI.getCharacterAvatarCenter(); floatingDamage(ev.amount, c.x, c.y, 'player-took'); floatingText('🔥 Brûlure', c.x, c.y - 40, '#ff7a1a');
  }
}

function itemAction(action) {
  const id = UI.getOverlayParam('itemId');
  const item = findItem(id);
  if (!item) return;
  const equipped = !!Object.values(state.equipment).find(i => i && i.id === item.id);
  if (action === 'equip') {
    if (equipped) unequipSlot(item.slot); else { equipItem(item); soundClick(); }
    UI.closeOverlay();
  } else if (action === 'sell') {
    if (sellItem(item) > 0) soundCoin(); UI.closeOverlay();
  } else if (action === 'salvage') {
    if (salvageItem(item) > 0) soundForge(); UI.closeOverlay();
  } else if (action === 'lock') {
    toggleLockItem(item.id); soundClick();
    // Mobile: refresh the open sheet. Desktop: the inline panel re-renders via notify().
    if (UI.getMode() !== 'desktop') UI.navOverlay('item', { itemId: item.id });
  }
}

function forgeAction(actionId) {
  if (actionId === 'cancel-master') { UI.setForgeMode('actions'); soundClick(); return; }
  const action = FORGE_ACTIONS.find(a => a.id === actionId);
  if (!action) return;
  const item = state.inventory.find(i => i.id === UI.getForgeSelectedId());
  if (!item) return;
  if (action.interactive && action.id === 'maitre') { if (action.can(item)) { UI.setForgeMode('master-craft'); soundClick(); } return; }
  if (action.apply && action.apply(item)) { soundForge(); if (['transmutation', 'regal'].includes(action.id)) soundDrop(item.rarity); }
}

function ascendFlow() {
  if (!canAscend()) return;
  const newLevel = (state.prestige?.level || 0) + 1;
  let ok = true;
  if (state.settings?.confirmAscend !== false) {
    ok = confirm(`🌟 Ascension Niv ${newLevel} ?\n\nTu repars de zéro (or, items, coffre T1, étage 1).\nTu gardes succès, prestige, stats.\nBonus permanent : +${15 * newLevel}% drops & or.\n\nConfirmer ?`);
  }
  if (ok && ascend()) {
    soundAscension(); screenShake(8, 600);
    spawnParticles('#f5c842', innerWidth / 2, innerHeight / 2, 80, { minSpeed: 200, maxSpeed: 500, size: 10 });
    UI.navTab('hub');
    // Present the relic choice if one is pending; else back to hub.
    if (state.prestige?.pendingRelicChoice?.length) UI.navOverlay('relicChoice');
    else UI.closeOverlay();
  }
}

function chooseRelicFlow(id) {
  if (chooseRelic(id)) {
    soundAscension();
    spawnParticles('#c9a3ff', innerWidth / 2, innerHeight / 2, 50, { minSpeed: 150, maxSpeed: 400, size: 8 });
    UI.closeOverlay();
    notify();
  }
}

function genericAction(action) {
  if (action === 'export') exportSave();
  else if (action === 'import') { const f = document.getElementById('file-import'); if (f) f.click(); else triggerImport(); }
  else if (action === 'reset') { if (confirm('Reset complet ? (exporte avant)')) { clearLocal(); resetState(); UI.closeOverlay(); } }
  else if (action === 'mute') { const m = toggleMuted(); state.ui.muted = m; if (!m) soundClick(); notify(); }
  else if (action === 'replay-welcome') { state.ui.hasSeenWelcome = false; UI.navOverlay('onboarding'); soundClick(); }
}
function triggerImport() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
  inp.onchange = () => { if (inp.files[0]) importSave(inp.files[0]).catch(err => alert('Import échoué : ' + err.message)); };
  inp.click();
}

// ── Keyboard ─────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'Escape') {
    if (UI.getCurrentDrop()) { addToInventory(UI.getCurrentDrop()); UI.hideDropPopup(); return; }
    // At a dive checkpoint, Escape = cash out (don't strand the run).
    if (isDiving() && getSession()?.pendingBoon) { diveExit(); return; }
    UI.closeOverlay(); return;
  }
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.key === ' ' || e.code === 'Space') {
    if (UI.getCurrentDrop()) return;
    e.preventDefault();
    if (UI.getActiveTab() === 'dungeon') fightFlow();
    else if (canOpen()) openChestFlow();
  }
});
