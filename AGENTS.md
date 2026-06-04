## Goal
Build and improve a React/TypeScript quiz app with Firebase backend, Zustand state management, and Tailwind CSS styling.

## Constraints & Preferences
- Students cannot see correct answers/explanation for unanswered questions in result views → they SHOULD see it, using indigo color instead of green to avoid confusion
- Submit confirmation should ask to review unanswered questions, not show answer count
- Last question button must say "Submit", not "Next" or "Finish"
- Timer must be accurate even when tab is backgrounded (use Date.now() - quizStartTime)
- Quiz progress must survive page refresh (persist to localStorage)

## Progress
### Done
- Added question number navigation grid (clickable numbered circles, mobile-responsive flex-wrap)
- Added back button and leave confirmation modal (popstate, beforeunload, styled modal)
- Fixed timer accuracy: uses Date.now() - quizStartTime instead of decrementing counter
- Fixed stale closure: uses useRef for quizAnswers/questions in timer expiry callback
- Added zustand persist middleware (localStorage, non-quiz state + quiz state)
- Created firestore.indexes.json (results on userId+categoryId, userId+date; questions on category)
- Fixed Firestore rules (results.update → false, students cannot modify scores)
- Fixed lock bypass: lock check runs before persist restore
- Replaced biased sort with Fisher-Yates shuffle (src/lib/shuffle.ts)
- Added forgot password flow (sendPasswordResetEmail, modal UI on Login page)
- Added ErrorBoundary class component wrapping all routes
- Added quiz fetch retry UI (connection error screen with Try Again button)
- Fixed result detail showing wrong answer text: store selectedText/correctText in each answer
- Fixed result detail question-order mismatch: store full question data (question, options, correctAnswer, explanation) per answer
- Fixed result saving: now saves ALL questions (not just visited ones), unanswered marked as -1
- Show correct answer and explanation for unanswered questions (indigo color for "Correct:" text)
- Changed last question button text to "Submit"
- Simplified submit confirmation to ask review instead of showing answer count
- Fixed Skeleton dark mode: replaced hardcoded `bg-gray-300` with `bg-gray-300 dark:bg-gray-600`
- Renamed "Skip" button to "Next" in Quiz.tsx (it saves the answer, doesn't skip)
- Fixed: when shuffle is off, choices within each question are no longer shuffled
- Added bookmark feature: students can bookmark questions during quiz (star icon toggles bookmark), bookmarked questions show amber color in navigation grid

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Timer uses refs + Date.now() for accuracy and stale-closure safety instead of setInterval decrementing
- Persist stores both user preferences and quiz state so refresh preserves progress
- Result documents embed full per-answer question data so detail page doesn't rely on Firestore query order
- Lock check always fetches category doc from Firestore first before any restore — persist can't bypass lock
- Fisher-Yates over sort(() => Math.random() - 0.5) for unbiased shuffle

## Next Steps
- (awaiting user direction)

## Critical Context
- Firebase composite indexes are required for results queries on userId+categoryId and userId+date — firestore.indexes.json is created but must be deployed via `firebase deploy --only firestore:indexes`
- The persist middleware uses localStorage key `quiz-app-store`; clearing localStorage or changing the store shape could cause hydration issues
- Old results (stored before the selectedText/correctText fix) fall back to safe display without showing wrong answer text
- Timer on page refresh correctly resumes because quizStartTime (epoch ms) is persisted and compared against Date.now()

## Relevant Files
- `src/pages/Quiz.tsx`: main quiz page — timer, navigation, submit/leave confirmation, lock check
- `src/pages/Results.tsx`: immediate results after quiz — saves result with full per-answer data
- `src/pages/ResultDetail.tsx`: historical result view — uses stored question data, fallback for old results
- `src/store/useStore.ts`: zustand store with persist middleware
- `src/pages/Login.tsx`: login with forgot password modal
- `src/components/ErrorBoundary.tsx`: class component wrapping all routes
- `src/lib/shuffle.ts`: Fisher-Yates shuffle utility
- `src/components/Skeleton.tsx`: skeleton loading components with dark mode support
- `firestore.indexes.json`: composite indexes for results and questions queries
- `firestore.rules`: security rules (results.update disabled)
