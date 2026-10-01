import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';

export type ViolationType = 'tab_switch' | 'navigation_attempt';

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
