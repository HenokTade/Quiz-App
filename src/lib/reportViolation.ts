import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';

export type ViolationType = 'tab_switch' | 'navigation_attempt';

export const DEFAULT_STRIKE_LIMIT = 3;

export function getStrikeLimit(configuredLimit: number): number {
  return configuredLimit > 0 ? configuredLimit : DEFAULT_STRIKE_LIMIT;
}

export function getViolationMessage(newCount: number, configuredLimit: number): string {
  const strikeLimit = getStrikeLimit(configuredLimit);

  if (newCount >= strikeLimit) {
    return `🚨 Attempt ${newCount} detected — your quiz is being automatically submitted. Your answers will be recorded and this incident will be reviewed by your instructor.`;
  }

  if (newCount === strikeLimit - 1) {
    return `⚠️ Final warning (${newCount}/${strikeLimit}): You left the quiz tab! On your next attempt the quiz will automatically close and be submitted.`;
  }

  if (configuredLimit > 0) {
    const remaining = strikeLimit - newCount;
    return `⚠️ Warning ${newCount}/${strikeLimit}: You left the quiz tab! ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before the quiz auto-submits.`;
  }

  return `⚠️ Warning #${newCount}: You left the quiz tab! Switching tabs is not allowed. This incident has been recorded.`;
}

export function reportViolation(type: ViolationType): number {
  const state = useStore.getState();
  const newCount = state.tabViolations + 1;
  state.incrementTabViolation();

  const user = state.user;
  if (user) {
    addDoc(collection(db, 'violations'), {
      userId: user.uid,
      userName: user.displayName || user.email,
      userEmail: user.email,
      categoryId: state.currentCategoryId,
      categoryName: state.currentCategoryName || 'Unknown',
      type,
      violationCount: newCount,
      createdAt: Date.now(),
    }).catch(() => {});
  }

  return newCount;
}
