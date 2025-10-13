Excellent — that’s the right call.
Using the **Firebase Emulator Suite** from the beginning will ensure your multiplayer logic, locking system, and persistence tests reflect real-world conditions.

Below is the **fully regenerated Collab Canvas MVP PR + Task List**, now fully aligned with your tech stack (**React + TypeScript + Redux + Fabric.js + Firebase + Emulator Suite + Vitest**).
It’s formatted for a `PROJECT_TASKS.md` file — complete with checkboxes, file paths, test coverage, and testing strategy.

---

# ✅ **Collab Canvas MVP — Task & Pull Request Plan (with Firebase Emulator + Testing Coverage)**

---

## **PR 1 — Project Setup and Environment Configuration**

**Goal:** Establish base project structure, dependencies, and build pipeline.

### **Tasks**

* [X] Initialize project using **Vite (React + TypeScript)**.
* [X] Install base dependencies:

  * `react`, `react-dom`, `firebase`, `fabric`, `@reduxjs/toolkit`, `react-redux`, `react-router-dom`
* [X] Install dev + type dependencies:

  * `typescript`, `vite`, `@types/react`, `@types/react-dom`, `@types/fabric`, `eslint`, `prettier`, `eslint-config-prettier`, `husky`, `lint-staged`, `dotenv`
* [X] Install test + coverage tooling:

  * `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `c8`, `playwright`, `firebase-tools`
* [X] Configure ESLint + Prettier configuration files.
* [X] Create `.env.local` template with Firebase config placeholders.
* [X] Set up Vercel deployment scaffold (`vercel.json`).

### **Files Created/Modified**

```
package.json
vite.config.ts
tsconfig.json
.eslintrc.json
.prettierrc
.husky/pre-commit
.env.local
vercel.json
```

### **Testing**

❌ No unit tests required.
✅ Manual verification: build, lint, and start scripts run cleanly.

---

## **PR 2 — Firebase Integration + Emulator Suite Setup**

**Goal:** Connect Firebase backend and local emulators for Auth, Firestore, and Realtime DB.

### **Tasks**

* [ ] Initialize Firebase project in the console.
* [ ] Add configuration files:

  * `firebase.json`
  * `.firebaserc`
* [ ] Implement Firebase SDK config:

  * `src/firebase/config.ts`
* [ ] Add Firebase Auth utilities:

  * `src/firebase/auth.ts`
  * Functions: `signInWithEmail`, `signUpWithEmail`, `signInAnonymously`, `signOutUser`
* [ ] Add Firestore + Realtime DB utilities:

  * `src/firebase/db.ts`
  * Functions: `getCanvasState`, `updateCanvasState`, `subscribeToPresence`
* [ ] Set up Firebase Emulator Suite:

  * Add npm scripts:

    ```json
    "emulators:start": "firebase emulators:start --import=./.firebase-data --export-on-exit",
    "test:integration": "firebase emulators:exec --only firestore,database,auth 'vitest run --config vitest.config.ts'"
    ```
* [ ] Add local emulator environment variables in test setup.

### **Files Created/Modified**

```
firebase.json
.firebaserc
src/firebase/config.ts
src/firebase/auth.ts
src/firebase/db.ts
```

### **Testing**

✅ **Unit Tests (Mocked Firebase Utilities Only)**

* [ ] `__tests__/firebaseUtils.test.ts`

  * Tests DB helpers for correct read/write calls and auth wrappers.
    ✅ **Integration Tests (via Emulator)**
* [ ] Run `npm run test:integration`

  * Confirms emulator services start and basic auth/firestore interactions succeed.

---

## **PR 3 — Authentication UI and Presence Tracking**

**Goal:** Implement user login flow and display online user presence.

### **Tasks**

* [ ] Create `AuthContext` for session management.
* [ ] Build LoginPage and GuestLogin components.
* [ ] Add Navbar showing active user and sign-out option.
* [ ] Track online users in presence list using Realtime DB (`subscribeToPresence`).
* [ ] Integrate emulator authentication for tests.

### **Files Created/Modified**

```
src/context/AuthContext.tsx
src/pages/LoginPage.tsx
src/components/GuestLogin.tsx
src/components/Navbar.tsx
src/components/PresenceList.tsx
src/App.tsx
```

### **Testing**

✅ **Integration Test (with Emulator)**

* [ ] `__tests__/authFlow.test.tsx`

  * Logs in guest and registered users.
  * Confirms presence list updates when users connect/disconnect.

---

## **PR 4 — Core Canvas Implementation (5,000×5,000 px Rectangle Canvas)**

**Goal:** Implement collaborative canvas using **Fabric.js**, including rectangle creation and interaction.

### **Tasks**

* [ ] Create `CanvasPage.tsx` and `Canvas.tsx` components.
* [ ] Configure **5,000×5,000 px Fabric canvas** with pan and zoom support.
* [ ] Add “Create Rectangle” button (rectangle spawns at center of viewport).
* [ ] Enable move, resize, and delete actions.
* [ ] Connect Fabric events to Redux store (`canvasSlice.ts`).

### **Files Created/Modified**

```
src/pages/CanvasPage.tsx
src/components/Canvas.tsx
src/components/Toolbar.tsx
src/store/canvasSlice.ts
src/styles/canvas.css
```

### **Testing**

✅ **Unit Tests**

* [ ] `__tests__/canvasSlice.test.ts`

  * Verify reducers: `addShape`, `moveShape`, `resizeShape`, `deleteShape`.
    ✅ **Integration Tests**
* [ ] `__tests__/canvasInteraction.test.tsx`

  * Simulate “Create Rectangle” button click and Fabric canvas rendering.
  * Confirm shape appears at viewport center and moves/resizes properly.

---

## **PR 5 — Real-Time Sync, Locking System & Consistent Color Generation**

**Goal:** Implement multiplayer editing, locking, and consistent user color mapping.

### **Tasks**

* [ ] Subscribe to Firestore for shape updates (real-time).
* [ ] Broadcast shape deltas (debounced).
* [ ] Implement **first-mover lock system**:

  * Locks object when user starts editing.
  * Gray/desaturate locked objects.
  * Release on `mouseup` or 5 s inactivity (only reset timer on interactions with the locked object).
* [ ] Implement **consistent color generation**:

  * Hash username to map onto 8 HTML colors: firebrick (0-1), hotpink (2-3), darkorange (4-5), yellow (6-7), darkmagenta (8-9), chartreuse (A-B), cyan (C-D), saddlebrown (E-F) (`src/utils/colorUtils.ts`).
  * All users see identical colors per user based on last hex character of username hash.
* [ ] Sync cursor positions (<50 ms latency).
* [ ] Test with up to **5 simultaneous users** in emulator sessions.

### **Files Created/Modified**

```
src/firebase/db.ts
src/hooks/useCursors.ts
src/components/Cursors.tsx
src/utils/colorUtils.ts
src/store/canvasSlice.ts
```

### **Testing**

✅ **Integration Tests (via Emulator)**

* [ ] `__tests__/lockingSystem.test.ts`

  * Simulate concurrent edits → confirm locks + releases.
* [ ] `__tests__/cursorSync.test.ts`

  * Verify cross-user cursor latency <50 ms.
* [ ] `__tests__/colorConsistency.test.ts`

  * Ensure consistent colors for identical user IDs across all clients.

---

## **PR 6 — Persistence and Reconnection Handling**

**Goal:** Ensure canvas state persistence and reconnection reliability.

### **Tasks**

* [ ] Implement auto-save strategy:
  * Auto-save every 30 seconds while canvas is active.
  * Save state snapshot to Firestore on disconnect/exit events.
* [ ] Restore state on reconnect.
* [ ] Handle concurrent reconnects and prevent duplication.
* [ ] Anonymous user session timeout after 15 minutes of inactivity.
* [ ] Canvas ownership model: guests can collaborate but only permanent users own persistent canvases.
* [ ] Anonymous canvas claiming system (Hybrid approach):
  * Store anonymous canvas IDs in localStorage with device fingerprint
  * Optional email reservation for cross-device access during canvas creation
  * Auto-detect claimable canvases on account creation (localStorage + email-reserved)
  * 7-day expiration for unclaimed anonymous canvases
  * One-click bulk claiming UI during signup flow
  * Canvas metadata includes: browserFingerprint, reservedEmail, claimableUntil timestamp
* [ ] Run emulator-based tests to validate multi-user persistence.

### **Files Created/Modified**

```
src/firebase/db.ts
src/store/canvasSlice.ts
src/utils/anonymousCanvas.ts
src/components/ClaimCanvasPrompt.tsx
src/App.tsx
```

### **Testing**

✅ **Integration Test (via Emulator)**

* [ ] `__tests__/persistence.test.ts`

  * Tests disconnect, reconnect, and snapshot reload behavior.
  * Confirms shared state remains consistent for all users.
* [ ] `__tests__/anonymousClaiming.test.ts`

  * Tests localStorage canvas tracking and device fingerprinting.
  * Tests email reservation and cross-device claiming flow.
  * Validates 7-day expiration cleanup and bulk claiming UI.

---

## **PR 7 — Deployment and Final QA**

**Goal:** Deploy MVP to Vercel and validate real-time collaboration at scale.

### **Tasks**

* [ ] Configure Vercel build + Firebase environment variables.
* [ ] Run performance testing with 5 concurrent emulator clients.
* [ ] Validate sync (<100 ms), pan/zoom (60 FPS).
* [ ] Record demo video showing features.
* [ ] Merge and tag release `v0.1.0`.

### **Files Created/Modified**

```
vercel.json
README.md
```

### **Testing**

✅ **E2E Test (Playwright + Emulator)**

* [ ] `__tests__/performance.test.ts`

  * [Simulate] 5 clients interacting concurrently.
  * Verify frame rate ≥ 55 FPS and latency < 100 ms.

---

## **PR 8 — Test Coverage & Reporting**

**Goal:** Integrate full test coverage, reporting, and documentation of intentional exclusions.

### **Tasks**

* [ ] Add `vitest.config.ts` with coverage reporters.
* [ ] Add coverage threshold to `package.json`:

  ```json
  "coverage": {
    "lines": 80,
    "branches": 70
  }
  ```
* [ ] Add `docs/testing-notes.md` listing **untested areas**:

  * Fabric.js DOM rendering (visual verification only).
  * Firebase SDK internals (tested via emulator).
  * Real network latency (mocked for E2E tests).
  * Visual styles and UI appearance.
* [ ] Add GitHub Actions CI workflow for automated test + coverage run.

### **Files Created/Modified**

```
vitest.config.ts
package.json
docs/testing-notes.md
.github/workflows/test.yml
coverage/
```

### **Testing**

✅ **Meta-Test**

* [ ] `npm run test:coverage` generates HTML report.
* [ ] Coverage > 80% lines / > 70% branches.
* [ ] Manual verification that untested zones are intentional.

---

## **📂 Folder Structure**

```
collab-canvas/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Canvas.tsx
│   │   ├── Toolbar.tsx
│   │   ├── Cursors.tsx
│   │   ├── Navbar.tsx
│   │   └── PresenceList.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   └── db.ts
│   ├── hooks/
│   │   └── useCursors.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── CanvasPage.tsx
│   ├── store/
│   │   └── canvasSlice.ts
│   ├── styles/
│   │   └── canvas.css
│   ├── utils/
│   │   └── colorUtils.ts
│   ├── tests/
│   │   └── setup.ts
│   └── main.tsx
├── __tests__/
│   ├── firebaseUtils.test.ts
│   ├── authFlow.test.tsx
│   ├── canvasSlice.test.ts
│   ├── canvasInteraction.test.tsx
│   ├── lockingSystem.test.ts
│   ├── cursorSync.test.ts
│   ├── colorConsistency.test.ts
│   ├── persistence.test.ts
│   └── performance.test.ts
├── docs/
│   └── testing-notes.md
├── firebase.json
├── .firebaserc
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vercel.json
├── vitest.config.ts
└── README.md
```

---

## **🧪 Testing Summary**

| PR | Test File(s)                                                              | Type               | Backend  | Focus                              |
| -- | ------------------------------------------------------------------------- | ------------------ | -------- | ---------------------------------- |
| 2  | `firebaseUtils.test.ts`                                                   | Unit + Integration | Emulator | Auth + Firestore connectivity      |
| 3  | `authFlow.test.tsx`                                                       | Integration        | Emulator | Login + presence tracking          |
| 4  | `canvasSlice.test.ts`, `canvasInteraction.test.tsx`                       | Unit + Integration | Local    | Shape state + Fabric interactions  |
| 5  | `lockingSystem.test.ts`, `cursorSync.test.ts`, `colorConsistency.test.ts` | Integration        | Emulator | Sync, locks, and color consistency |
| 6  | `persistence.test.ts`, `anonymousClaiming.test.ts`                        | Integration        | Emulator | Persistence + reconnect + claiming |
| 7  | `performance.test.ts`                                                     | E2E                | Emulator | Multi-user performance             |
| 8  | Coverage Report                                                           | Meta               | —        | Coverage thresholds + exclusions   |

---
