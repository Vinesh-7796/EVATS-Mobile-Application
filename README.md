# EVATS Mobile POC - HV Power System

Electric Vehicle Advanced Training System - Proof of Concept

## Overview

This is a fully functional POC of the EVATS mobile training application, featuring the **HV Power System** module. The app implements a gamified learning experience with quizzes, progress tracking, streaks, and certificate generation.

## Features Implemented

### ✅ Phase 0-8 Complete

- **Home Screen**: Module cards with unlock status and streak tracking
- **Learn Screen**: Component exploration with detailed information
- **Quiz System**: 20 questions across 4 game types (MCQ, MAQ implemented; Rank Order & Connector placeholders)
- **Results Screen**: Grade, points, percentage, and performance breakdown
- **Certificate Screen**: Professional certificate with grade and percentile
- **Progress Tracking**: Persistent storage with AsyncStorage
- **Streak System**: Daily activity tracking with bonus multipliers (5% per day, max 50%)
- **State Management**: Zustand for global state
- **Navigation**: Expo Router with tabs and stack navigation

### 📊 Quiz Types

1. **MCQ (Multiple Choice)** - 10 questions ✅
2. **MAQ (Multiple Answer)** - 5 questions ✅
3. **Rank Order** - 3 questions (placeholder - marked as correct)
4. **Connector Game** - 2 questions (placeholder - marked as correct)

### 🎯 Scoring System

- Easy questions: 10 points
- Medium questions: 20 points
- Hard questions: 30 points
- Streak bonus: +5% per consecutive day (max 50%)

### 📱 Screens

1. **Home Tab**: Module overview, points, streak
2. **Progress Tab**: Module completion status, grades, streak visualization
3. **Profile Tab**: User stats, certificate generation, reset progress
4. **Learn Screen**: Component details and training materials
5. **Quiz Screen**: Interactive quiz with instant feedback
6. **Results Screen**: Detailed performance breakdown
7. **Certificate Screen**: Shareable completion certificate

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo Go app on your phone (iOS or Android)
- Both phone and computer on same network

### Installation

```bash
cd evats-mobile-poc
npm install
```

**Note:** All dependencies are already installed, including fixes for:
- ✅ `react-native-worklets-core` (required for reanimated)
- ✅ `babel.config.js` (Babel plugin configuration)
- ✅ Package version compatibility fixes

### Running the App

```bash
npx expo start
```

**First-time launch takes 1-2 minutes for bundling.**

Scan the QR code with:
- **iOS**: Camera app
- **Android**: Expo Go app

**If you encounter connection issues:**
```bash
npx expo start --tunnel
```

## Testing Instructions

### Test Flow 1: First Time User Experience

1. Open app → See HV Power System module unlocked
2. Tap on HV Power System card
3. Explore the 7 components (tap each to see details)
4. Tap "Start Quiz"
5. Answer all 20 questions
6. View results screen with grade and points
7. Navigate to Profile tab → Generate Certificate
8. Navigate to Progress tab → See module completion

### Test Flow 2: Streak Testing

1. Complete the quiz (Day 1)
2. Close app completely
3. In Profile tab → Reset Progress (for testing)
4. Open app again
5. Complete quiz again → Streak should be maintained/updated

### Test Flow 3: Navigation Testing

- Test all 3 tab screens
- Test back button behavior
- Test Learn → Quiz flow
- Test Quiz → Results → Home flow
- Test Results → Certificate flow

## Data Structure

### HV Power System Components

1. Motor Control Unit (MCU)
2. Junction Box
3. AC/DC Charging Station
4. CCS 2 / Fast Charger
5. HV Battery System (283 kWh, 650V)
6. Power Distribution Box (PDB)
7. Traction Motor

### Quiz Questions

- 10 Easy questions (10 pts each)
- 7 Medium questions (20 pts each)
- 3 Hard questions (30 pts each)
- **Total possible points: 340 (before streak bonus)**

## Project Structure

```
evats-mobile-poc/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── progress.tsx
│   │   └── profile.tsx
│   ├── learn/
│   │   └── [moduleId].tsx
│   ├── quiz/
│   │   └── [moduleId].tsx
│   ├── _layout.tsx
│   ├── certificate.tsx
│   └── results.tsx
├── src/
│   ├── components/
│   │   ├── flowchart/
│   │   ├── quiz/
│   │   └── ui/
│   ├── data/
│   │   ├── hvSystemData.ts
│   │   └── quizQuestions.ts
│   ├── stores/
│   │   ├── useProgressStore.ts
│   │   └── useUserStore.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── helpers.ts
├── app.json
├── package.json
└── tsconfig.json
```

## Known Limitations (POC)

### Not Yet Implemented

- **Flowchart Viewer**: Interactive SVG with zoom/pan (Phase 2 enhancement)
- **Video Player**: Training video playback (Phase 2 enhancement)
- **Rank Order Game**: Drag-and-drop question type (Phase 3 enhancement)
- **Connector Game**: Component connection drawing (Phase 3 enhancement)
- **Certificate Sharing**: Share/download functionality (Phase 6 enhancement)
- **Animations**: Confetti, transitions, feedback animations (Phase 7 enhancement)

### Placeholder Features

- All rank order and connector questions auto-marked as correct
- Video button shows alert instead of playing video
- Flowchart shows placeholder with component list
- Certificate share/download shows alert

## Technologies Used

- **Framework**: React Native (0.86.0) + Expo (SDK 57)
- **Language**: TypeScript (6.0.3)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Storage**: AsyncStorage
- **UI**: React Native core components (no external UI library)

## Grade Calculation

| Grade | Percentage |
|-------|------------|
| A+    | 95-100%    |
| A     | 90-94%     |
| B     | 80-89%     |
| C     | 70-79%     |
| D     | 60-69%     |
| F     | <60%       |

## Percentile Calculation (Mock)

Based on percentage:
- 95%+ → 95th percentile
- 90-94% → 85th percentile
- 80-89% → 70th percentile
- 70-79% → 55th percentile
- 60-69% → 40th percentile
- <60% → 25th percentile

## Troubleshooting

### App won't load
```bash
npx expo start --clear
```

### Connection issues
```bash
npx expo start --tunnel
```

### TypeScript errors
```bash
npx tsc --noEmit
```

### Reset progress for testing
Open app → Profile tab → Reset Progress button

### Can't scan QR code
Make sure both devices are on the same WiFi network, or use Tunnel mode:
```bash
npx expo start --tunnel
```

### Bundling takes too long
First launch takes 1-2 minutes - this is normal. Subsequent launches are faster.

### For detailed troubleshooting
See `TROUBLESHOOTING.md` for complete fix documentation.

## Next Steps (Full App Implementation)

1. **Add 7 More Modules** (LV, CAN, HV Aux, Regen, Propulsion, Overall, Pneumatic)
2. **Implement Flowchart Viewer** with SVG interaction
3. **Add Video Playback** using expo-av
4. **Build Game Mechanics** (drag-and-drop, line drawing)
5. **Add Backend** (Firebase/Supabase for multi-user)
6. **Implement Leaderboard**
7. **Add User Authentication**
8. **Build Admin Dashboard**
9. **Add Push Notifications** for daily reminders
10. **Polish Animations** with react-native-reanimated

## Development Notes

- Progress is stored locally in AsyncStorage
- Streak resets if more than 1 day gap between activities
- Module unlock dates are stored and checked on app load
- All quiz questions are shuffled on quiz start
- Feedback is shown immediately after answering each question

## License

Proprietary - EVATS Training System

## Support

For issues or questions, refer to the detailed plan at `.opencode/plans/plan_detailed.md`

---

**Ready to test!** 🚀

Run `npx expo start` and scan the QR code with Expo Go.
