# EVATS Mobile — Electric Vehicle Architecture Training System

> **IMPORTANT DEPLOYMENT DISCLAIMER:** This repository hosts an unofficial, non-commercial educational prototype developed strictly for training visualization, systems topology modeling, and portfolio verification. It is not commissioned, endorsed, or officially affiliated with SWITCH Mobility Automotive Ltd. All corporate names, layouts, and logos are implemented in a mock capacity to simulate a real-world, production-tier OEM software environment.

---

## Overview

EVATS Mobile is a React Native training application for field service technicians and graduate engineering trainees at SWITCH Mobility. The app delivers an interactive, gamified learning experience across 8 electric bus subsystem modules — from HV Power to Pneumatic Systems — with daily content drip, quizzes, progress tracking, streaks, and certificate generation.

This repository contains the **mobile proof-of-concept** (POC). The companion desktop application lives in `ev-bus-trainer/`.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React Native + Expo | SDK 54 |
| Language | TypeScript | 5.9 (strict) |
| Routing | Expo Router | 6.x (file-based) |
| State Management | Zustand | 5.x |
| Persistence | AsyncStorage | 2.2 |
| Animations | react-native-reanimated | 4.1 |
| Gesture Handling | react-native-gesture-handler | 2.28 |
| 3D Rendering | react-native-webview + Three.js | — |
| Lists | @shopify/flash-list | 2.3 |
| Icons | @expo/vector-icons (Ionicons) | — |
| Video | expo-video | 3.0 |
| Audio | expo-audio | 1.1 |

### New Architecture

**Confirmed active.** Expo SDK 54 enables New Architecture by default, and Expo Go only supports New Architecture. No explicit `newArchEnabled` flag is needed — it cannot be disabled in Expo Go. `react-native-reanimated` v4 and `react-native-gesture-handler` v2.28 both run natively on the New Architecture.

> SDK 55 makes New Architecture mandatory and removes the `newArchEnabled` toggle entirely. This project is already forward-compatible.

---

## Architecture

### Application Flow

```
┌─────────────┐     role selected      ┌──────────────┐
│  Login Screen│ ──────────────────────▶│  Tab Navigator│
│  (index.tsx) │                        │              │
│  Role select │◀──────────────────────│  Home / Progress / Profile│
└─────────────┘     reset progress     └──────┬───────┘
                                              │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                     │ Learn Screen │ │ Quiz Screen  │ │ Games Screen │
                     │ (components) │ │ (4 types)    │ │ (mini-games) │
                     └──────────────┘ └──────┬───────┘ └──────────────┘
                                             │
                                             ▼
                                    ┌──────────────┐
                                    │ Results Screen│
                                    └──────┬───────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │ Certificate     │
                                  └────────────────┘
```

### Role-Based Entry

The app opens to a login screen with 3 role options: **Trainees**, **Interns**, **Admin**. The selected role is persisted to AsyncStorage and determines the user's entry point. Resetting progress from the Profile tab clears the role and forces re-login.

### State Management

Three Zustand stores manage all application state:

| Store | Responsibility |
|---|---|
| `useThemeStore` | Dark/light mode toggle, persisted to AsyncStorage |
| `useUserStore` | User identity, role selection, role persistence |
| `useProgressStore` | XP, streaks, module results, achievements, quiz history, game types |

### Module Registry

All module data is centralized in `src/data/moduleRegistry.ts` — a single source of truth mapping module IDs to flowchart info, component details, and quiz questions. Currently only `hv-power` is fully populated; the remaining 7 modules are skeleton entries.

**Module prerequisite chain:**
```
hv-power → lv-power → can-bus → hv-aux → regen-braking → propulsion → overall-power → pneumatic
```

### Daily Content Drip

Modules unlock on a per-day basis. Completion of a module triggers the next module's unlock date (tomorrow). Date-gated logic is checked on each app launch.

---

## Directory Structure

```
evats-mobile-poc/
├── app/                            # Expo Router — file-based routing
│   ├── _layout.tsx                 # Root Stack (theme-aware, loads stores)
│   ├── index.tsx                   # Login / role-selection screen
│   ├── (tabs)/                     # Tab navigator group
│   │   ├── _layout.tsx             # Tab bar config (Home / Progress / Profile)
│   │   ├── home.tsx                # Module list, 3D learning map, streak display
│   │   ├── progress.tsx            # Stats grid, XP bar, 9-day tracker, achievements
│   │   └── profile.tsx             # User info, role badge, certificate, theme toggle, reset
│   ├── learn/[moduleId].tsx        # Component explorer per module
│   ├── games/[moduleId].tsx        # Progressive mini-games (MCQ → Connector → MAQ → Rank)
│   ├── quiz/[moduleId].tsx         # Quiz engine per module
│   ├── results.tsx                 # Quiz results summary
│   └── certificate.tsx             # Certificate generation / screenshot
├── src/
│   ├── components/
│   │   ├── flowchart/FlowchartViewer.tsx
│   │   ├── quiz/ConnectorGame.tsx, RankOrderGame.tsx
│   │   └── ui/LearningMap3D.tsx, ErrorBoundary.tsx
│   ├── data/
│   │   ├── moduleRegistry.ts       # Central module registry (8 modules)
│   │   ├── hvSystemData.ts         # HV Power component data (populated)
│   │   ├── flowchartData.ts        # Flowchart definitions
│   │   ├── quizQuestions.ts         # Quiz question bank
│   │   └── busGlbData.ts           # 3D bus model (base64)
│   ├── hooks/
│   │   └── useThemedColors.ts      # Centralized color token resolver
│   ├── stores/
│   │   ├── useProgressStore.ts     # XP, streaks, achievements, module results
│   │   ├── useThemeStore.ts        # Dark/light toggle with persistence
│   │   └── useUserStore.ts         # User identity, role selection
│   ├── types/index.ts              # All TypeScript types & constants
│   └── utils/helpers.ts            # Grade calc, percentile, date helpers
├── assets/
│   ├── flowcharts/                 # SVG flowcharts per module
│   ├── images/                     # Component images
│   ├── videos/                     # Training videos
│   └── bus.glb                     # 3D bus model
├── app.json                        # Expo config
├── babel.config.js                 # Babel + Reanimated plugin
├── tsconfig.json                   # Strict TypeScript config
└── package.json
```

---

## Screens

| Screen | Route | Description |
|---|---|---|
| Login | `/` | Role selection (Trainees / Interns / Admin) |
| Home | `/(tabs)/home` | Module cards, 3D learning map, points & streak |
| Progress | `/(tabs)/progress` | Stats grid, XP level bar, 9-day tracker, achievements |
| Profile | `/(tabs)/profile` | User info, role badge, certificate generation, theme toggle, reset |
| Learn | `/learn/[moduleId]` | Component explorer with detail cards |
| Games | `/games/[moduleId]` | Progressive mini-games (4 stages per module) |
| Quiz | `/quiz/[moduleId]` | 20-question quiz with instant feedback |
| Results | `/results` | Grade, points, percentage, performance breakdown |
| Certificate | `/certificate` | Professional certificate with grade & percentile |

---

## Quiz System

### Game Types (Progressive Unlock)

| Stage | Type | Questions | Status |
|---|---|---|---|
| 1 | MCQ (Multiple Choice) | 10 | Implemented |
| 2 | Connector Game | 2 | Placeholder |
| 3 | MAQ (Multiple Answer) | 5 | Implemented |
| 4 | Rank Order | 3 | Placeholder |

### Scoring

| Difficulty | Points |
|---|---|
| Easy | 10 |
| Medium | 20 |
| Hard | 30 |

- Streak bonus: +5% per consecutive day (max 50%)
- XP gain: base score + grade bonus (A+ = +50, A = +30, B = +15)

### Grade Scale

| Grade | Percentage |
|---|---|
| A+ | 95-100% |
| A | 90-94% |
| B | 80-89% |
| C | 70-79% |
| D | 60-69% |
| F | <60% |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go app (iOS App Store / Google Play Store)
- Phone and computer on the same network

### Install & Run

```bash
cd evats-mobile-poc
npm install
npx expo start
```

Scan the QR code with Expo Go. First launch takes 1-2 minutes for bundling.

### Troubleshooting

```bash
npx expo start --clear        # clear cache
npx expo start --tunnel       # network issues
npx tsc --noEmit              # typecheck
```

For detailed troubleshooting, see `TROUBLESHOOTING.md`.

---

## Current Status

### Working

- Login / role selection with persistence
- Dark/light theme toggle
- Module registry with prerequisite chain
- HV Power System: 7 components with detail cards
- 20-question quiz with MCQ + MAQ types
- XP & level system (Novice → Expert)
- Streak tracking with daily calendar
- Achievement badges (7 types)
- Certificate generation
- 3D learning map (WebView + Three.js)

### POC / Placeholder

- Rank Order and Connector games auto-mark as correct
- Video playback shows alert (not streaming)
- Flowchart viewer shows component list (not SVG)
- Certificate share/download shows alert
- Only `hv-power` has populated component data and quiz questions
- Percentile is mock (static lookup, not server-computed)

---

## Roadmap

### Phase 1: Foundation Fixes
- Centralized module registry (all screens read from single source)
- Quiz retakes with best-score tracking
- Shared theme system (`useThemedColors` hook)
- Error boundaries on critical screens
- Replace emoji icons with `@expo/vector-icons`

### Phase 2: Gamification Engine
- Daily content drip (1 module/day unlock)
- Micro-quizzes per component (2-3 questions before full quiz)
- Spaced repetition engine (review wrong answers)
- "Question of the Day" push notification
- XP & level system with visual progress
- Streak calendar (9-day grid)
- Achievement badges

### Phase 3: Backend & Authentication
- Firebase/Supabase backend (user auth, cloud sync, server-side validation)
- Server-side certificate generation with QR verification
- Real percentile calculation from aggregate scores
- Batch-scoped leaderboard
- Admin dashboard (trainee progress, reports, content management)
- Remote content delivery (modules, questions, videos from CDN)

### Phase 4: UX & Accessibility
- Onboarding flow (3-screen walkthrough)
- User registration (name, employee ID, department)
- Accessibility audit (labels, roles, colorblind-safe indicators)
- Haptic feedback (expo-haptics)
- Animations (Reanimated transitions, confetti, XP gain)
- Skeleton loaders
- Streaming video (replace bundled `require()` with remote URLs)

### Phase 5: Content Expansion
- All 8 modules fully populated
- 40-60 questions per module with randomized subsets
- Content versioning (audit trail)
- Master evaluation (Day 9 cumulative exam)
- Interactive scenario mode ("diagnose the bus" branching)

---

## License

Proprietary — EVATS Training System, SWITCH Mobility Automotive Ltd.

## Credits

Built by Vinesh — Technical Documentation, Flowchart Logic, and UI Architecture.
[linkedin.com/in/vinesh7796](https://www.linkedin.com/in/vinesh7796)
