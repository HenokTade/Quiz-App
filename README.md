# Fenote Exam

A full-featured exam/quiz application built with React, Firebase, and Tailwind CSS. Students take timed exams organized by grade; admins manage grades, exams, and questions and monitor exam integrity in real time.

## Features

### For students
- **Grade-based exam browsing** — the home page opens on large, color-coded grade cards (with exam counts and how many are currently available); choosing a grade lists that grade's exams. The selected grade lives in the URL (`?grade=8`), so refresh and the browser Back button work as expected
- **Timed exams** — accurate timer (based on start time, keeps counting correctly in background tabs) with auto-submit on expiry
- **Question navigation** — numbered question grid, back/next, bookmarks (star a question to revisit it), "Submit" on the last question with a prompt to review unanswered questions
- **Progress survives refresh** — in-progress exams are persisted to `localStorage`
- **Results & review** — score history, per-category statistics, and a detailed review showing your answer, the correct answer, and explanations (including for unanswered questions)
- **Password reset** — "Forgot password" flow on the login page

### For admins
- **Grades** — assign each exam to a grade from a dropdown; add new grades right from that dropdown ("+ Add grade…"). Default grades are 4, 5, 8 and 9
- **Exam management** — create/edit/delete exams (categories) and questions, bulk JSON upload, CSV export, all filterable by grade
- **Exam settings** — time limit, retake rule (unlimited / once / cooldown), feedback mode, question shuffling, lock/unlock, and grade
- **"All exams" overview** — on the Quizzes page admins can see every exam grouped by grade
- **Real-time anti-cheat alerts** — the dashboard shows a live banner when a student switches tabs or tries to leave an exam
- Admins are exempt from anti-cheat and retake restrictions so they can preview exams freely

### Anti-cheat
- Screen blacks out when a student switches tabs, apps, or windows (works on mobile app switchers too)
- Strike system: warning → final warning → automatic submission on the 3rd violation (per-exam `maxViolations` overrides the default)
- Right-click, copy/select, and common shortcuts (Ctrl+C/A/U/S/P, F12) are blocked during exams
- Navigating away mid-exam leads to a blocked page that records the attempt
- Every violation is saved with the result and reported to admins

### General
- Google Sign-In and email/password authentication
- Role-based access (student / admin) enforced by Firestore security rules
- Full dark mode, responsive mobile layout, skeleton loading states, error boundary, retry on connection errors
- Installable PWA

## Tech Stack

- **React 19** + **TypeScript**
- **Firebase** — Authentication, Firestore
- **Zustand** — state management (with `persist` middleware)
- **Tailwind CSS v4** — styling
- **Vite** — build tool (with `vite-plugin-pwa`)
- **Vitest** + **Testing Library** — tests

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore and Authentication enabled
- [Firebase CLI](https://firebase.google.com/docs/cli) (to deploy rules and indexes)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/HenokTade/Quiz-App.git
   cd Quiz-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Enable **Google** and **Email/Password** sign-in in the Firebase Console under **Authentication > Sign-in method**.

4. Deploy the Firestore security rules and indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run the test suite |

## Usage

### Student flow

1. Sign in with Google or create an email/password account
2. Pick your grade on the **Quizzes** page, then choose an exam
3. Answer questions within the time limit, then **Submit**
4. Review your results and track progress on the **Dashboard**

### Admin flow

1. Sign in with an account that has `role: 'admin'` in its Firestore `users` document
2. Open **Questions Manager** from the navbar
3. Create exams and assign each a grade (use **+ Add grade…** in the grade dropdown for new grades)
4. Add questions manually or via bulk JSON upload; use the grade filter to narrow the lists
5. Configure each exam in **Settings** (time, retakes, feedback, shuffle, lock, grade)
6. Watch results and anti-cheat alerts on the **Dashboard**

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users` | User profiles and roles |
| `categories` | Exams — name, `grade`, time limit, retake/feedback/shuffle/lock settings, `maxViolations` |
| `questions` | Questions linked to an exam via `category` |
| `results` | Submitted results with full per-answer data and violation count |
| `violations` | Real-time anti-cheat incident feed for admins |
| `config` | App configuration — `config/grades` holds the grade list |

## License

MIT
