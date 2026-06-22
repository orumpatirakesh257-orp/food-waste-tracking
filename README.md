# GreenLog — Food Waste Ledger (Prototype)

SDG goal #22 prototype: "AI / App-Based Food Waste Tracking" — supports SDG Targets 12.3 and 9.5.

A simple ledger app where users log wasted food (item, quantity, category, reason, date), see live stats, a category chart, and rule-based "smart insights" generated from their own logged patterns.

## File structure

```
foodwaste-tracker/
├── index.html              ← login / signup page
├── dashboard.html          ← main app
├── css/style.css
└── js/
    ├── firebase-config.js  ← YOU fill this in (step 1 below)
    ├── auth.js
    └── dashboard.js
```

## Step 1 — Firebase setup (5 min)

1. Go to **console.firebase.google.com** → create a new project (or reuse your LinkVault project — a new project is cleaner for this submission).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database → Start in test mode** (fine for a prototype/demo).
4. **Project settings (gear icon, top left) → General → scroll to "Your apps" → click the `</>` web icon → register app.**
5. Copy the `firebaseConfig` object Firebase shows you.
6. Open `js/firebase-config.js` in this project and paste your values into the `firebaseConfig` object (replace the `YOUR_...` placeholders).

That's it — auth and data storage are live once this file has your real keys.

## Step 2 — Firestore security rules (before final submission)

Test mode rules expire after 30 days and are public. Before you submit/demo long-term, go to **Firestore → Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each user can only read/write their own entries.

## Step 3 — Run locally

No build step — it's plain HTML/CSS/JS. Easiest way to test locally (opening `index.html` directly can cause issues with Firebase):

```
cd foodwaste-tracker
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

## Step 4 — Deploy to Vercel (same flow as LinkVault)

1. Push this folder to a GitHub repo.
2. Vercel → New Project → Import the repo.
3. Framework preset: **Other** (it's static HTML, no build command needed).
4. Deploy.

## How it works

- **Auth**: Firebase Authentication (email/password). Each user only sees their own entries.
- **Data**: Entries stored at `users/{uid}/entries/{entryId}` in Firestore, synced live with `onSnapshot` (no manual refresh needed).
- **Stats**: Computed client-side from the live entry list — total entries, entries in the last 7 days, top category, top reason.
- **Chart**: Chart.js bar chart of entry count by category.
- **Smart insights**: Rule-based, not a black box — it counts your own logged categories/reasons/days and surfaces the dominant pattern with a matching tip (e.g. most waste is "Cooked / Leftovers" → suggests smaller batch cooking). This is the "data-driven recommendations" piece from the goal description, computed entirely in the browser with no external API.

## Optional upgrade: real AI-generated tips

If you want to lean harder into the "AI" half of the goal title for the demo, you already have the pieces from Nexora: send the same category/reason counts to your existing Groq backend and have it generate a short personalized paragraph instead of (or alongside) the rule-based insights. Happy to wire that in if you want it — just say the word.
