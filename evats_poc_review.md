# EVATS Mobile POC — Senior Engineer Review

> **Reviewer perspective:** Senior Software Engineer, IT Dept., EV Manufacturing (à la SWITCH Mobility)
> **Target users:** New trainees & interns
> **Core goal:** Interactive, game-like daily learning sessions that retain users until course completion

---

## Executive Summary

The POC successfully proves the *concept* — a trainee can install the app, explore HV Power System components, take a quiz, see results, and generate a certificate. That's a solid foundation. However, **as a vehicle to retain new hires day-after-day through gamified learning**, the current implementation has significant gaps across six dimensions:

| Dimension | Current Grade | Risk Level |
|---|---|---|
| Architecture & Scalability | C | 🟡 Medium |
| Gamification & Retention | D | 🔴 High |
| UX / Accessibility | C- | 🟡 Medium |
| Data & Content | D+ | 🔴 High |
| Security & Auth | F | 🔴 Critical |
| Code Quality & Maintainability | C+ | 🟡 Medium |

---

## 1. Architecture & Scalability Weaknesses

### 1.1 Hardcoded Single-Module Architecture
The most fundamental structural problem: **everything is hardcoded to the HV Power System module**.

- [home.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/(tabs)/home.tsx#L29) directly imports `hvPowerFlowchart` and renders it as the only real module.
- [progress.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/(tabs)/progress.tsx#L11) hardcodes `moduleResults['hv-power']` and manually lists 7 other locked modules as static JSX (lines 57–104).
- [quiz/[moduleId].tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/quiz/[moduleId].tsx#L27) ignores the `moduleId` param and always loads `hvQuizQuestions`.
- [certificate.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/certificate.tsx#L18) only reads `moduleResults['hv-power']`.
- [results.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/results.tsx#L3) imports `hvPowerFlowchart` directly.

> [!CAUTION]
> Adding a second module (e.g., LV Power) requires touching **every single screen file**. This is a scalability blocker.

**Fix:** Create a `ModuleRegistry` — a single data source mapping `moduleId → { flowchartInfo, components, quizQuestions }`. All screens should read from the registry using `moduleId` from route params. Zero hardcoding.

### 1.2 No Backend / No Authentication
- [useUserStore.ts](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/stores/useUserStore.ts#L10) — User identity is hardcoded: `userName: 'Test User'`, `userId: 'EV-001'`.
- All data lives in `AsyncStorage` on-device. If a trainee switches phones, uninstalls the app, or clears cache — **all progress is permanently lost**.
- No login, no user registration, no SSO integration.
- Certificates have zero cryptographic verification — any user can generate a fake certificate.

> [!WARNING]
> In a corporate training environment, progress data and certificates **must** be server-side verifiable. Without this, HR/management cannot trust the system.

### 1.3 `today` Variable Captured at Module Load Time
[useProgressStore.ts L18](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/stores/useProgressStore.ts#L18):
```typescript
const today = new Date().toISOString().split('T')[0]
```
This runs once when the module is first imported. If the app stays open across midnight, `today` is stale — **streak calculations will be wrong**. It should be computed at call time.

### 1.4 Massive Inline Data File
[busGlbData.ts](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/data/busGlbData.ts) is **987 KB** — likely a base64-encoded 3D model baked into a TypeScript file. This bloats the JS bundle, slows Metro bundler, and will cause memory pressure on lower-end Android devices that interns may use.

### 1.5 No Offline-First Strategy
The app stores data in AsyncStorage but has no sync layer. When a backend is eventually added, there's no conflict resolution, optimistic updates, or queue mechanism.

---

## 2. Gamification & Retention Weaknesses

> This is the **most critical area** given the stated goal: *"learning through interactive game-like sessions to retain users day after day."*

### 2.1 No Spaced Repetition
The app is a one-shot quiz. Once a module is completed, `completeModule()` in [useProgressStore.ts L60-66](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/stores/useProgressStore.ts#L60-L66) **blocks re-completion**:
```typescript
if (state.completedModules.includes(moduleId) || state.moduleResults[moduleId]) {
  return   // silently ignores the attempt
}
```
There is no mechanism to:
- Review incorrectly answered questions
- Retry a module for a better score
- Present previously-failed questions at increasing intervals (spaced repetition)

**Impact:** A trainee finishes the quiz on Day 1 and has **zero reason to return** on Day 2-9.

### 2.2 Streak System is Cosmetic Only
The streak mechanic ([useProgressStore.ts L81-94](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/stores/useProgressStore.ts#L81-L94)) only gives a points multiplier. But:
- There's only 1 module and 1 quiz, so there's nothing to do on Day 2 to maintain the streak.
- No push notifications or reminders to come back.
- No visual streak calendar (like Duolingo's).
- Streak bonus is capped at 50% but the base quiz is only taken once, so the multiplier has minimal impact.

### 2.3 No Daily Content Drip
[plan.md](file:///d:/Github/EVATS-Mobile/plan.md#L5) specifies: *"Module / flowchart section is unlocked on per day basis"*. But the implementation only has one module unlocked from Day 1. The remaining 7 modules are hardcoded "Locked" labels with no actual unlock logic tied to date progression.

### 2.4 No Learning Reinforcement Loop
The learning flow is: **Read components → Take quiz → See results → Done forever**. Missing:
- **Micro-quizzes** after reading each component (not just one big quiz at the end)
- **Flashcard mode** for daily review
- **"Question of the Day"** to drive daily opens
- **Explanation screens** — when a user gets a question wrong, there's no link back to the relevant component detail
- **Progressive difficulty** — the app shows all 20 questions in one session. Better: 5 easy → unlock medium → unlock hard

### 2.5 No Social / Competitive Elements
[plan.md](file:///d:/Github/EVATS-Mobile/plan.md#L55) mentions a future leaderboard, but there are zero social mechanics:
- No cohort/batch leaderboard
- No "challenge a colleague" feature
- No team-based competitions
- No sharing achievements to internal Slack/Teams

### 2.6 Fake Percentile
[helpers.ts L10-18](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/utils/helpers.ts#L10-L18) uses a static lookup table for percentile:
```typescript
if (percentage >= 95) return 95
if (percentage >= 90) return 85
```
This is labeled "Mock" in the README. Real percentiles require comparing against other users' scores (needs a backend).

---

## 3. UX / Accessibility Weaknesses

### 3.1 No Onboarding Flow
A new trainee opens the app and sees a module card and a 3D learning map with no context. There's:
- No welcome screen explaining the 9-day learning program
- No user registration / name entry (hardcoded "Test User")
- No tutorial or guided first-run experience
- No explanation of points, streaks, or grade system

### 3.2 Emoji-Based Icons
[_layout.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/(tabs)/_layout.tsx#L33-L63) uses emoji for tab bar icons (`🏠`, `📊`, `👤`). These:
- Render differently across Android OEMs (Samsung vs Xiaomi vs Pixel)
- Are not accessible to screen readers without proper labels
- Look unprofessional in a corporate training tool
- Have inconsistent sizing

**Fix:** Use a proper icon library like `@expo/vector-icons` or `react-native-vector-icons`.

### 3.3 Zero Accessibility Support
- No `accessibilityLabel` on any `TouchableOpacity` or interactive element
- No `accessibilityRole` hints
- No support for screen readers (TalkBack / VoiceOver)
- Color-only feedback (correct=green, wrong=red) — problematic for colorblind users (~8% of males)
- No `accessibilityHint` on the drag-and-drop components

### 3.4 Dark Mode Has No Consistent Theme System
Every screen manually checks `isDark` and applies conditional styles with `isDark && styles.somethingDark`. This pattern is:
- Repeated **in every single file** (40+ occurrences across the codebase)
- Error-prone — easy to miss a dark override
- Not centralized — there's no design token system

**Fix:** Create a `useThemedStyles(lightStyles, darkStyles)` hook or a theme context that provides resolved color tokens.

### 3.5 Certificate Screen Ignores Dark Mode
[certificate.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/certificate.tsx) has **zero dark mode support**. It always renders on a white background regardless of the user's theme preference.

### 3.6 No Loading / Skeleton States
The quiz loading state ([quiz/[moduleId].tsx L46-50](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/quiz/[moduleId].tsx#L46-L50)) is a bare `<Text>Loading quiz...</Text>`. No skeleton loader, no animated placeholder, no branded loading state.

### 3.7 No Haptic Feedback
For a "game-like" experience, there's no haptic feedback on:
- Correct/incorrect answers
- Drag-and-drop interactions
- Button presses
- Streak milestones

### 3.8 Video Player Hardcoded to a Single File
[learn/[moduleId].tsx L199](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/learn/[moduleId].tsx#L199):
```typescript
source={require('../../assets/videos/HV.mp4')}
```
This `require()` bundles the video into the app binary, increasing app size. For 8 modules with training videos, this would make the app **hundreds of MB**.

---

## 4. Data & Content Weaknesses

### 4.1 Question Point Values Don't Match Documented System
[README.md](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/README.md#L32-L34) states: Easy=10pts, Medium=20pts, Hard=30pts.
But [quizQuestions.ts](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/data/quizQuestions.ts) actual values:
- All 10 MCQ (labeled "easy") = **20 pts each** (should be 10)
- All 5 MAQ (labeled "medium") = **35 pts each** (should be 20)
- All 3 RankOrder (labeled "hard") = **50 pts each** (should be 30)
- All 2 Connector (labeled "easy") = **20 pts each**

This is inconsistent with the documented scoring system and inflates total possible points.

### 4.2 Only 20 Questions for the Entire Module
For a system with 7 components, 20 questions is thin. Interns who've been through the material once will memorize answers quickly. There's no question bank rotation or dynamic question generation.

### 4.3 No Content Versioning
If training material changes (e.g., battery specs updated from 283 kWh to 350 kWh), there's no mechanism to:
- Push content updates without a full app update
- Track which version of content a trainee was assessed on
- Migrate progress when content changes

### 4.4 Connector Questions Labeled "Easy" but Are Architecturally Complex
[quizQuestions.ts L206-233](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/data/quizQuestions.ts#L206-L233) — The connector game requires understanding the complete power flow topology. Labeling these as "easy" (20 pts) devalues the cognitive effort.

---

## 5. Security Weaknesses

### 5.1 Client-Side Only Quiz Validation
All quiz answers, scoring, and grade calculations happen on the client. A technically savvy intern could:
- Use `handleDevSkip` (exposed in development builds, [quiz/[moduleId].tsx L171-223](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/quiz/[moduleId].tsx#L171-L223)) — which auto-generates a 75% score
- Modify AsyncStorage directly to inject fake results
- Generate a certificate without completing the quiz

### 5.2 Dev Skip Button in Production
The `handleDevSkip` button is guarded by `__DEV__` ([L253](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/quiz/[moduleId].tsx#L253)), but this should be completely removed from the production codebase, not conditionally rendered.

### 5.3 No Data Encryption
AsyncStorage stores progress data in plain text. On a rooted Android device, this data is trivially accessible.

### 5.4 No Certificate Tamper Protection
Certificates are generated client-side with `react-native-view-shot` as PNG images. There's:
- No QR code linking to a server-verified record
- No digital signature
- No unique certificate ID
- No watermark with verification URL

---

## 6. Code Quality & Maintainability

### 6.1 Massive Style Duplication
The dark mode pattern adds ~40-50% more style code to every file. Common patterns like card styles, header styles, and text colors are duplicated across:
- `home.tsx` (260 lines)
- `progress.tsx` (248 lines)
- `profile.tsx` (236 lines)
- `results.tsx` (366 lines)

**Fix:** Extract a shared theme/design-tokens file and a `ThemedCard`, `ThemedText`, etc. component library.

### 6.2 No Component Abstraction for Cards/Stats
Every screen builds stat cards from scratch. There's no reusable `<StatCard>`, `<ModuleCard>`, `<SectionContainer>` component.

### 6.3 No Error Boundaries
If the FlowchartViewer WebView crashes (and WebViews do crash), the entire app crashes. There are no React Error Boundaries wrapping any screen.

### 6.4 `results.tsx` Passes Data via URL Params
[quiz/[moduleId].tsx L157-168](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/quiz/[moduleId].tsx#L157-L168) serializes quiz results into URL params:
```typescript
router.replace({
  pathname: '/results',
  params: {
    score: finalPoints.toString(),
    totalPoints: totalPoints.toString(),
    ...
  },
})
```
[results.tsx L14-19](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/results.tsx#L14-L19) parses them back with `parseInt()`:
```typescript
const score = parseInt(params.score as string)
```
This is fragile — no validation, `NaN` possible, and data could be manipulated. The result should be read from the Zustand store directly.

### 6.5 Progress Screen Manually Lists Locked Modules
[progress.tsx L57-104](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/(tabs)/progress.tsx#L57-L104) has 7 duplicate `<View>` blocks for locked modules with hardcoded names. This should be a `.map()` over a modules array.

### 6.6 No Unit Tests / Integration Tests
Zero test files. For a training system where grading accuracy matters, the scoring logic, streak calculations, and grade assignments should all have unit tests.

---

## 7. Improvement Roadmap

### Phase 1: Foundation Fix (Week 1-2) — Critical

| # | Task | Impact |
|---|---|---|
| 1 | **Create Module Registry** — single source of truth for all module data, components, and questions. Refactor all screens to read from registry by `moduleId`. | Unblocks multi-module support |
| 2 | **Allow quiz retakes** — remove the single-completion guard. Track best score, last score, and attempt count. | Enables daily engagement |
| 3 | **Fix `today` stale date bug** — move to a function `getToday()` called at each use site. | Prevents streak corruption |
| 4 | **Extract shared theme system** — create `useTheme()` hook returning resolved color tokens. Refactor all screens. | Reduces code by ~30% |
| 5 | **Replace emoji icons** with `@expo/vector-icons`. | Professional UX |
| 6 | **Add Error Boundaries** to all screen wrappers. | Crash resilience |

### Phase 2: Gamification Engine (Week 3-4) — High Priority

| # | Task | Impact |
|---|---|---|
| 7 | **Daily content drip** — implement actual date-gated module unlocking per the original [plan.md](file:///d:/Github/EVATS-Mobile/plan.md#L5) spec (1 module/day). | Drives daily return |
| 8 | **Micro-quizzes per component** — 2-3 questions after each component detail view, before the full module quiz. | Reinforces learning |
| 9 | **Spaced repetition engine** — track incorrectly answered questions, resurface them in "Review" sessions. | Proven retention mechanic |
| 10 | **"Question of the Day"** push notification — one question each morning from incomplete/review pool. | Daily engagement hook |
| 11 | **XP & Level system** — replace raw points with XP levels (Novice → Apprentice → Technician → Expert). Visual progress bar on profile. | Motivation |
| 12 | **Streak calendar** — visual 9-day grid showing completed/missed days (like GitHub contribution graph). | Streak visualization |
| 13 | **Achievement badges** — "First Quiz", "Perfect Score", "3-Day Streak", "Speed Run (<3 min)", "All Components Viewed". | Collection motivation |

### Phase 3: Backend & Authentication (Week 5-7) — Critical for Production

| # | Task | Impact |
|---|---|---|
| 14 | **Firebase/Supabase backend** — user auth (SSO with corporate AD if possible), cloud progress sync, server-side quiz validation. | Enterprise readiness |
| 15 | **Server-side certificate generation** with unique ID, QR code verification, and tamper-proof watermark. | Credible certification |
| 16 | **Real percentile calculation** using aggregate user scores from backend. | Honest benchmarking |
| 17 | **Leaderboard** — batch/cohort-scoped, weekly reset option, top-3 podium. | Competition |
| 18 | **Admin dashboard** — view trainee progress, export reports, manage content. | Management oversight |
| 19 | **Remote content delivery** — modules, questions, and videos fetched from CDN/API, not bundled in-app. | Smaller app, updatable content |

### Phase 4: UX & Accessibility Polish (Week 8-9)

| # | Task | Impact |
|---|---|---|
| 20 | **Onboarding flow** — 3-screen walkthrough explaining the 9-day program, point system, and streak mechanics. | First-time UX |
| 21 | **User registration** — name, employee ID, batch/department. Persisted to backend. | Identity |
| 22 | **Accessibility audit** — add `accessibilityLabel`, `accessibilityRole`, colorblind-safe indicators (icons + color, not color alone). | Inclusivity |
| 23 | **Haptic feedback** — `expo-haptics` for correct/incorrect, streaks, drag-and-drop. | Game feel |
| 24 | **Animations** — Reanimated for page transitions, confetti on quiz completion, XP gain animations. | Delight |
| 25 | **Skeleton loaders** for all loading states. | Perceived performance |
| 26 | **Streaming video** — replace bundled `require()` videos with remote URLs using `expo-av`. | App size reduction |

### Phase 5: Content Expansion (Week 10-12)

| # | Task | Impact |
|---|---|---|
| 27 | **Add all 8 modules** — LV, CAN, HV Aux, Regen, Propulsion, Overall, Pneumatic + Master Evaluation. | Full course |
| 28 | **Question bank expansion** — 40-60 questions per module with randomized subsets per attempt. | Anti-memorization |
| 29 | **Content versioning** — track which version each trainee was assessed on. | Audit trail |
| 30 | **Master evaluation** — Day 9 cumulative exam spanning all modules with time limits. | Final assessment |
| 31 | **Interactive scenario mode** — "A bus won't start. Diagnose the issue." Multi-step branching scenario. | Applied learning |

---

## 8. Quick Wins (Can Do This Week)

These require minimal effort but significantly improve the POC:

1. **Allow quiz retakes** — remove the early-return guard in `completeModule()`, store best attempt
2. **Fix the stale `today` bug** — takes 5 minutes, prevents real bugs
3. **Add a "Review Wrong Answers" button** on the results screen
4. **Show correct answer explanation** on quiz feedback (link back to the component detail that the question references via `componentRef`)
5. **Add a progress bar** to the quiz screen (instead of just "Question X / Y" text)
6. **Add user name input** on first launch (even just stored in AsyncStorage)
7. **Fix documentation mismatch** — update README point values to match actual code, or fix code to match README

---

## 9. Comparison: What Makes Retention Work (Lessons from Duolingo/Kahoot)

| Mechanic | Duolingo | EVATS POC | Gap |
|---|---|---|---|
| Daily goal | ✅ XP target | ❌ | No daily target |
| Streak w/ visual calendar | ✅ Fire animation | 🟡 Number only | No visual feedback |
| Spaced repetition | ✅ Cracked/golden skills | ❌ | No review system |
| Hearts/lives | ✅ Limited attempts | ❌ | No consequence for wrong answers |
| Push notifications | ✅ Passive-aggressive owl | ❌ | No notifications |
| Leaderboard | ✅ Weekly leagues | ❌ | No competition |
| Skill tree progression | ✅ Visual map | 🟡 3D map exists | Map not connected to real progression |
| Bite-sized lessons | ✅ 5-min sessions | ❌ 20 questions in one go | Session is too long |
| Celebration animations | ✅ Confetti, sounds | ❌ | No feedback animations |
| Story/narrative | ✅ Characters, stories | ❌ | No narrative context |

---

## 10. Final Verdict

**The POC proves the technical feasibility** — React Native + Expo + Zustand + the existing WebView flowchart viewer + drag-and-drop games form a viable tech stack. The component data model and quiz type system are well-structured.

**The POC does NOT yet prove retention capability** — which is the stated primary goal. Without spaced repetition, daily content drip, retake ability, push notifications, and social competition, a trainee has no reason to open the app after Day 1.

> [!IMPORTANT]
> **Priority #1 recommendation:** Before adding more modules or a backend, implement the **gamification engine** (quiz retakes, daily questions, spaced repetition, achievements). A single well-gamified module will demonstrate retention better than eight modules with no engagement hooks.
