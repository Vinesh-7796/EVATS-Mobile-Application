# Quick Start Guide - EVATS Mobile POC

## Test on Your Phone NOW

### Step 1: Start the Server
```bash
cd evats-mobile-poc
npx expo start
```

### Step 2: Install Expo Go
- **iOS**: Download from App Store
- **Android**: Download from Play Store

### Step 3: Scan QR Code
- **iOS**: Use Camera app
- **Android**: Open Expo Go app, tap "Scan QR Code"

### Step 4: Test the App

#### Flow 1: Complete the HV Module (5 minutes)
1. ✅ Home screen shows HV Power System unlocked
2. ✅ Tap module card → Learn screen
3. ✅ Tap each of 7 components to explore
4. ✅ Tap "Start Quiz" button
5. ✅ Answer 20 questions (MCQ and MAQ)
6. ✅ View results with grade and points
7. ✅ Navigate to Profile → Generate Certificate

#### Flow 2: Check Progress (1 minute)
1. ✅ Progress tab shows module completion
2. ✅ Home tab shows total points and streak
3. ✅ Profile tab shows statistics

#### Flow 3: Test Persistence (1 minute)
1. ✅ Close app completely
2. ✅ Reopen app
3. ✅ Verify progress is saved

## What Works

✅ **Navigation**: All screens and tabs work  
✅ **Quiz System**: 20 questions with instant feedback  
✅ **Scoring**: Points calculation with streak bonuses  
✅ **Persistence**: Progress saved locally  
✅ **Certificate**: Professional certificate generation  
✅ **Components**: 7 HV system components with details  

## What's Placeholder

⏳ **Flowchart Viewer**: Shows component list instead of SVG  
⏳ **Video Player**: Shows alert instead of playing video  
⏳ **Rank Order Game**: Auto-marked correct (placeholder)  
⏳ **Connector Game**: Auto-marked correct (placeholder)  
⏳ **Share/Download**: Certificate shows alerts  

## Reset Progress for Testing

Profile Tab → "Reset Progress" button → Confirm

This lets you:
- Retake the quiz
- Test streak system
- Test first-time experience again

## Expected Results

### Perfect Score
- 20/20 correct = 340 points base
- Day 1 streak = no bonus
- Grade: A+
- Percentage: 100%

### Good Score (15/20 correct)
- Base: ~255 points
- Grade: B
- Percentage: 75%

## Device Requirements

- Works on iOS and Android
- Requires Expo Go app
- No simulator needed
- No app build needed

## Troubleshooting

**Can't connect?**
```bash
npx expo start --tunnel
```

**TypeScript errors?**
```bash
npx tsc --noEmit
```

**Cache issues?**
```bash
npx expo start --clear
```

---

**The POC is production-ready for testing!** 🎉

All 8 phases complete. Ready to validate and scale to full app.
