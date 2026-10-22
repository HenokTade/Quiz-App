# Security Policy

## Supported Versions

Only the latest version on the `main` branch (the live deployment) receives security fixes.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| Older commits | ❌ |

## Reporting a Vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately through GitHub:

1. Go to the repository's **Security** tab
2. Click **Report a vulnerability**
3. Describe the issue, the steps to reproduce it, and its potential impact

What to expect:

- An acknowledgement within **7 days**
- An assessment and, if confirmed, a fix plan within **30 days**
- Credit in the fix commit if you would like it

Please give us a reasonable amount of time to release a fix before disclosing the issue publicly, and only test against your own accounts and data.

## Scope

In scope:

- Firestore security rules (`firestore.rules`) — e.g. reading or writing data a user should not have access to
- Authentication and role checks (student vs. admin)
- Ways to modify or delete submitted results
- Cross-site scripting or other injection in the web app

Out of scope:

- The Firebase web config in `src/lib/firebase.ts` — Firebase web API keys are public identifiers by design; access is controlled by security rules, not by keeping the key secret
- Bypassing the in-browser anti-cheat measures (see below)
- Denial-of-service, spam, or social-engineering attacks
- Vulnerabilities in third-party services (Firebase, Vercel, GitHub) — report those to the vendor

## Security Model

- **Authentication** — Firebase Authentication (Google Sign-In and email/password)
- **Authorization** — enforced server-side by Firestore security rules:
  - Exams, questions, and app config: any signed-in user can read; only admins can write
  - Results: readable by the student who took the exam and by admins; students can create their own results but cannot modify them afterwards
  - Violations (anti-cheat incidents): students can only report their own; only admins can read them
- **Admin role** — stored in the user's Firestore `users` document (`role: 'admin'`); UI-level role checks are for convenience only, the rules are the real enforcement

## Known Limitations

These are deliberate trade-offs of a client-side quiz app, not bugs:

- **Anti-cheat is best-effort.** Tab-switch detection, blackout screens, and blocked shortcuts run in the student's browser and can be bypassed by a determined user (e.g. a second device or modified browser). Treat violation reports as signals for review, not proof.
- **Grading happens in the browser.** Questions (including correct answers) are readable by signed-in users so the app can show feedback, and scores are computed client-side before being saved. For high-stakes exams, grading should move to a trusted backend (e.g. Cloud Functions).

## Deploying Rule Changes

After any change to `firestore.rules`, publish it — either paste it into the Firebase Console (**Firestore Database → Rules → Publish**) or run:

```bash
firebase deploy --only firestore:rules
```
