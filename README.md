# Quiz App

A full-featured quiz application built with React, Firebase, and Tailwind CSS. Supports student and admin roles with Google Sign-In and email/password authentication.

## Features

- **Authentication** — Google Sign-In (`signInWithPopup`) or email/password registration
- **Role-based access** — Students take quizzes, admins manage content
- **Quiz engine** — Timed quizzes with progress dots, answer shuffling, instant feedback
- **Categories** — Organize questions into categories
- **Results tracking** — Score history, high scores, and per-category statistics
- **Admin dashboard** — CRUD for categories/questions, bulk JSON upload, CSV export
- **Dark mode** — Full dark mode support throughout

## Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Firebase** — Auth, Firestore (database)
- **Zustand** — State management
- **Tailwind CSS v4** — Styling
- **Vite** — Build tool

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore and Authentication enabled

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

3. Enable **Google** and **Email/Password** sign-in in your Firebase Console under **Authentication > Sign-in method**.

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |

## Usage

### Student Flow

1. Sign in with Google or create an email/password account
2. Browse quiz categories on the home page
3. Select a category to start a timed 10-question quiz
4. Submit answers and review results
5. Track progress on the **Dashboard**

### Admin Flow

1. Sign in with an account that has `role: 'admin'` in Firestore
2. Access the **Admin** panel from the navbar
3. Manage categories, questions, or use bulk JSON upload
4. Export questions to CSV

## License

MIT
