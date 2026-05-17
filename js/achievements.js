// Achievements: check unlocks on every state change, grant rewards, fire toast events.
import { state, notify } from './state.js';
import { ACHIEVEMENTS } from './data.js';

const onUnlockHandlers = new Set();

export function onAchievementUnlocked(fn) {
  onUnlockHandlers.add(fn);
  return () => onUnlockHandlers.delete(fn);
}

export function checkAchievements() {
  let granted = false;
  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.unlocked[ach.id]) continue;
    if (ach.check(state)) {
      state.achievements.unlocked[ach.id] = true;
      if (ach.reward?.gold) {
        state.gold += ach.reward.gold;
        granted = true;
      }
      for (const fn of onUnlockHandlers) fn(ach);
    }
  }
  if (granted) notify();
}

export function getAchievementProgress() {
  const total = ACHIEVEMENTS.length;
  const unlocked = Object.keys(state.achievements.unlocked).length;
  return { unlocked, total };
}
