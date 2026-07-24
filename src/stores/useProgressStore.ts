import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { UserProgress, QuizResult, AchievementId, WrongAnswerRecord, XpLevel, GameStageId } from '../types'
import { XP_LEVELS, ACHIEVEMENTS, GAME_STAGES } from '../types'
import { MODULE_ORDER } from '../data/moduleRegistry'
import { calculateGrade } from '../utils/helpers'
import { syncModuleProgress, syncQuizAttempt, syncGameAttempt, syncStreak } from '../lib/syncService'

const STORAGE_KEY = '@evats_user_progress'

interface ProgressState extends UserProgress {
  isLoaded: boolean
  loadProgress: () => Promise<void>
  saveProgress: () => Promise<void>
  completeModule: (moduleId: string, result: QuizResult) => Promise<void>
  completeGameType: (moduleId: string, gameType: GameStageId, result: QuizResult) => Promise<void>
  isGameTypeCompleted: (moduleId: string, gameType: GameStageId) => boolean
  getCompletedGameCount: (moduleId: string) => number
  isModuleFullyCompleted: (moduleId: string) => boolean
  updateStreak: () => void
  addPoints: (points: number) => void
  resetProgress: () => Promise<void>
  getStreakMultiplier: () => number
  // Phase 2
  addXp: (amount: number) => void
  getCurrentLevel: () => XpLevel
  getNextLevel: () => XpLevel | null
  getXpProgress: () => number
  unlockAchievement: (id: AchievementId) => void
  hasAchievement: (id: AchievementId) => boolean
  recordQuizStart: () => void
  recordWrongAnswer: (questionId: string, moduleId: string) => void
  recordCorrectAnswer: (questionId: string, moduleId: string) => void
  getWrongAnswersForModule: (moduleId: string) => WrongAnswerRecord[]
  getReviewQuestions: () => WrongAnswerRecord[]
}

const getTodayDateString = () => new Date().toISOString().split('T')[0]

const toIsoTimestamp = (value: Date | string | undefined): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const getDefaultProgress = (): UserProgress => {
  const today = getTodayDateString()
  return {
    completedModules: [],
    totalPoints: 0,
    currentStreak: 0,
    lastActivityDate: today,
    moduleResults: {},
    moduleUnlockDates: {
      'hv-power': today,
    },
    xp: 0,
    unlockedAchievements: [],
    streakCalendar: { activeDays: [] },
    wrongAnswers: [],
    completedGameTypes: {},
  }
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...getDefaultProgress(),
  isLoaded: false,

  loadProgress: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      if (stored) {
        const progress: UserProgress = JSON.parse(stored)
        set({ ...getDefaultProgress(), ...progress, isLoaded: true })
        get().updateStreak()
      } else {
        set({ ...getDefaultProgress(), isLoaded: true })
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
      set({ ...getDefaultProgress(), isLoaded: true })
    }
  },

  saveProgress: async () => {
    try {
      const state = get()
      const { isLoaded, loadProgress, saveProgress, completeModule, completeGameType, isGameTypeCompleted, getCompletedGameCount, isModuleFullyCompleted, updateStreak, addPoints, resetProgress, getStreakMultiplier, addXp, getCurrentLevel, getNextLevel, getXpProgress, unlockAchievement, hasAchievement, recordQuizStart, recordWrongAnswer, recordCorrectAnswer, getWrongAnswersForModule, getReviewQuestions, ...progress } = state
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  },

  completeModule: async (moduleId: string, result: QuizResult) => {
    const state = get()
    const today = getTodayDateString()
    
    const prevResult = state.moduleResults[moduleId]
    const prevScore = prevResult ? prevResult.score : 0
    const newScore = result.score

    const completedModules = state.completedModules.includes(moduleId)
      ? state.completedModules
      : [...state.completedModules, moduleId]

    const shouldUpdateResult = !prevResult || newScore > prevScore
    const moduleResults = shouldUpdateResult
      ? { ...state.moduleResults, [moduleId]: result }
      : state.moduleResults

    const scoreDiff = shouldUpdateResult ? (newScore - prevScore) : 0

    // Daily drip: unlock next module when this one is completed
    const newUnlockDates = { ...state.moduleUnlockDates }
    if (!prevResult) {
      const moduleIdx = MODULE_ORDER.indexOf(moduleId)
      if (moduleIdx >= 0 && moduleIdx < MODULE_ORDER.length - 1) {
        const nextModuleId = MODULE_ORDER[moduleIdx + 1]
        if (!newUnlockDates[nextModuleId]) {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          newUnlockDates[nextModuleId] = tomorrow.toISOString().split('T')[0]
        }
      }
    }

    set({
      completedModules,
      moduleResults,
      totalPoints: state.totalPoints + scoreDiff,
      lastActivityDate: today,
      moduleUnlockDates: newUnlockDates,
    })

    // XP gain: 10 base per quiz + bonus for grade
    const xpGain = result.score + (result.grade === 'A+' ? 50 : result.grade === 'A' ? 30 : result.grade === 'B' ? 15 : 5)
    get().addXp(xpGain)

    // Streak calendar
    const activeDays = state.streakCalendar.activeDays
    if (!activeDays.includes(today)) {
      set({ streakCalendar: { activeDays: [...activeDays, today] } })
    }

    // Achievements
    if (state.completedModules.length === 0) {
      get().unlockAchievement('first_quiz')
    }
    if (result.percentage === 100) {
      get().unlockAchievement('perfect_score')
    }
    if (result.grade === 'A+' || result.grade === 'A') {
      get().unlockAchievement('module_master')
    }
    if (prevResult) {
      get().unlockAchievement('first_retake')
    }
    if (state.currentStreak >= 3) {
      get().unlockAchievement('three_day_streak')
    }
    if (state.currentStreak >= 5) {
      get().unlockAchievement('five_day_streak')
    }

    await get().saveProgress()

    // P1.1 direct backend mirror. Offline queuing is intentionally deferred to P1.2.
    const s = get()
    void syncQuizAttempt({
      module_id: moduleId,
      score: result.score,
      total_points: result.totalPoints,
      percentage: result.percentage,
      grade: result.grade,
      correct_answers: result.correctAnswers,
      total_questions: result.totalQuestions,
    })
    for (const [progressModuleId, unlockedAt] of Object.entries(s.moduleUnlockDates)) {
      const isCompleted = s.completedModules.includes(progressModuleId)
      void syncModuleProgress(
        progressModuleId,
        isCompleted ? 'completed' : 'unlocked',
        unlockedAt,
        isCompleted ? toIsoTimestamp(s.moduleResults[progressModuleId]?.completedAt) : null,
      )
    }
    void syncStreak(s.currentStreak, Math.max(s.currentStreak, s.streakCalendar.activeDays.length), today)
  },

  updateStreak: () => {
    const state = get()
    const lastDate = state.lastActivityDate
    const today = getTodayDateString()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (lastDate === today) {
      return
    } else if (lastDate === yesterdayStr) {
      set({ currentStreak: state.currentStreak + 1, lastActivityDate: today })
    } else {
      set({ currentStreak: 1, lastActivityDate: today })
    }

    const updated = get()
    void syncStreak(
      updated.currentStreak,
      Math.max(updated.currentStreak, updated.streakCalendar.activeDays.length),
      today,
    )
  },

  addPoints: (points: number) => {
    set(state => ({ totalPoints: state.totalPoints + points }))
  },

  getStreakMultiplier: () => {
    const streak = get().currentStreak
    const multiplier = 1 + Math.min(streak * 0.05, 0.5)
    return multiplier
  },

  resetProgress: async () => {
    set({ ...getDefaultProgress() })
    await AsyncStorage.removeItem(STORAGE_KEY)
  },

  // ── Phase 2: XP ──────────────────────────────────────────────────────

  completeGameType: async (moduleId: string, gameType: GameStageId, result: QuizResult) => {
    const state = get()
    const today = getTodayDateString()

    // Record this game type as completed
    const prev = state.completedGameTypes[moduleId] || []
    if (prev.includes(gameType)) return
    const updated = [...prev, gameType]
    const newCompletedGameTypes = { ...state.completedGameTypes, [moduleId]: updated }
    let completedModuleResult: QuizResult | null = null

    // Best-score tracking per game type
    const gameTypeResultKey = `${moduleId}:${gameType}`
    const prevGameResult = (state.moduleResults as any)[gameTypeResultKey] as QuizResult | undefined
    const shouldUpdateResult = !prevGameResult || result.score > prevGameResult.score
    const newModuleResults = shouldUpdateResult
      ? { ...state.moduleResults, [gameTypeResultKey]: result }
      : state.moduleResults

    // Points diff
    const prevScore = prevGameResult ? prevGameResult.score : 0
    const scoreDiff = shouldUpdateResult ? (result.score - prevScore) : 0

    set({
      completedGameTypes: newCompletedGameTypes,
      moduleResults: newModuleResults,
      totalPoints: state.totalPoints + scoreDiff,
      lastActivityDate: today,
    })

    // XP gain
    const xpGain = result.score + (result.grade === 'A+' ? 50 : result.grade === 'A' ? 30 : result.grade === 'B' ? 15 : 5)
    get().addXp(xpGain)

    // Streak calendar
    const activeDays = state.streakCalendar.activeDays
    if (!activeDays.includes(today)) {
      set({ streakCalendar: { activeDays: [...activeDays, today] } })
    }

    // Check if all game types done → mark module as fully completed
    if (updated.length >= GAME_STAGES.length) {
      // Aggregate score from all game types
      let totalScore = 0
      let totalPointsSum = 0
      let totalCorrect = 0
      let totalQuestions = 0
      for (const gt of GAME_STAGES) {
        const key = `${moduleId}:${gt}`
        const r = (get().moduleResults as any)[key] as QuizResult | undefined
        if (r) {
          totalScore += r.score
          totalPointsSum += r.totalPoints
          totalCorrect += r.correctAnswers
          totalQuestions += r.totalQuestions
        }
      }
      const percentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0
      const grade = calculateGrade(percentage)

      const moduleResult: QuizResult = {
        moduleId,
        score: totalScore,
        totalPoints: totalPointsSum,
        percentage,
        grade,
        correctAnswers: totalCorrect,
        totalQuestions,
        completedAt: new Date(),
        answers: [],
      }
      completedModuleResult = moduleResult

      // Unlock module + daily drip
      const completedModules = state.completedModules.includes(moduleId)
        ? state.completedModules
        : [...state.completedModules, moduleId]
      const newUnlockDates = { ...state.moduleUnlockDates }
      if (!state.completedModules.includes(moduleId)) {
        const moduleIdx = MODULE_ORDER.indexOf(moduleId)
        if (moduleIdx >= 0 && moduleIdx < MODULE_ORDER.length - 1) {
          const nextModuleId = MODULE_ORDER[moduleIdx + 1]
          if (!newUnlockDates[nextModuleId]) {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            newUnlockDates[nextModuleId] = tomorrow.toISOString().split('T')[0]
          }
        }
      }

      set({
        completedModules,
        moduleResults: { ...get().moduleResults, [moduleId]: moduleResult },
        moduleUnlockDates: newUnlockDates,
      })

      // Achievements
      if (!state.completedModules.includes(moduleId)) {
        if (state.completedModules.length === 0) get().unlockAchievement('first_quiz')
      }
      if (percentage === 100) get().unlockAchievement('perfect_score')
      if (grade === 'A+' || grade === 'A') get().unlockAchievement('module_master')
      if (state.currentStreak >= 3) get().unlockAchievement('three_day_streak')
      if (state.currentStreak >= 5) get().unlockAchievement('five_day_streak')
    }

    await get().saveProgress()

    // P1.1 direct backend mirror. Offline queuing is intentionally deferred to P1.2.
    void syncGameAttempt({
      module_id: moduleId,
      game_type: gameType,
      score: result.score,
      percentage: result.percentage,
      grade: result.grade,
    })
    // The four mini-games are the module evaluation. Store one aggregate
    // evaluation attempt when the final stage completes so the P1.1 percentile
    // query compares complete module outcomes, not individual game stages.
    if (completedModuleResult) {
      void syncQuizAttempt({
        module_id: moduleId,
        score: completedModuleResult.score,
        total_points: completedModuleResult.totalPoints,
        percentage: completedModuleResult.percentage,
        grade: completedModuleResult.grade,
        correct_answers: completedModuleResult.correctAnswers,
        total_questions: completedModuleResult.totalQuestions,
      })
    }
    const sg = get()
    for (const [progressModuleId, unlockedAt] of Object.entries(sg.moduleUnlockDates)) {
      const isCompleted = sg.completedModules.includes(progressModuleId)
      void syncModuleProgress(
        progressModuleId,
        isCompleted ? 'completed' : 'unlocked',
        unlockedAt,
        isCompleted ? toIsoTimestamp(sg.moduleResults[progressModuleId]?.completedAt) : null,
      )
    }
    void syncStreak(sg.currentStreak, Math.max(sg.currentStreak, sg.streakCalendar.activeDays.length), today)
  },

  isGameTypeCompleted: (moduleId: string, gameType: GameStageId) => {
    return (get().completedGameTypes[moduleId] || []).includes(gameType)
  },

  getCompletedGameCount: (moduleId: string) => {
    const types = get().completedGameTypes[moduleId] || []
    return types.filter(t => (GAME_STAGES as readonly string[]).includes(t)).length
  },

  isModuleFullyCompleted: (moduleId: string) => {
    const types = get().completedGameTypes[moduleId] || []
    return types.filter(t => (GAME_STAGES as readonly string[]).includes(t)).length >= GAME_STAGES.length
  },

  addXp: (amount: number) => {
    set(state => ({ xp: state.xp + amount }))
  },

  getCurrentLevel: () => {
    const xp = get().xp
    let current = XP_LEVELS[0]
    for (const level of XP_LEVELS) {
      if (xp >= level.minXp) current = level
    }
    return current
  },

  getNextLevel: () => {
    const xp = get().xp
    for (let i = 0; i < XP_LEVELS.length; i++) {
      if (xp < XP_LEVELS[i].minXp) return XP_LEVELS[i]
    }
    return null
  },

  getXpProgress: () => {
    const xp = get().xp
    const current = get().getCurrentLevel()
    const next = get().getNextLevel()
    if (!next) return 1
    return (xp - current.minXp) / (next.minXp - current.minXp)
  },

  // ── Phase 2: Achievements ────────────────────────────────────────────

  unlockAchievement: (id: AchievementId) => {
    const state = get()
    if (state.unlockedAchievements.includes(id)) return
    set({ unlockedAchievements: [...state.unlockedAchievements, id] })
    // Bonus XP for achievement
    set(s => ({ xp: s.xp + 25 }))
  },

  hasAchievement: (id: AchievementId) => {
    return get().unlockedAchievements.includes(id)
  },

  // ── Phase 2: Quiz timer ──────────────────────────────────────────────

  recordQuizStart: () => {
    set({ quizStartTime: Date.now() })
  },

  // ── Phase 2: Spaced repetition ───────────────────────────────────────

  recordWrongAnswer: (questionId: string, moduleId: string) => {
    const state = get()
    const today = getTodayDateString()
    const existing = state.wrongAnswers.find(w => w.questionId === questionId)
    if (existing) {
      set({
        wrongAnswers: state.wrongAnswers.map(w =>
          w.questionId === questionId
            ? { ...w, timesWrong: w.timesWrong + 1, lastSeen: today }
            : w
        ),
      })
    } else {
      set({
        wrongAnswers: [...state.wrongAnswers, { questionId, moduleId, lastSeen: today, timesWrong: 1, timesCorrect: 0 }],
      })
    }
    get().saveProgress()
  },

  recordCorrectAnswer: (questionId: string, moduleId: string) => {
    const state = get()
    const existing = state.wrongAnswers.find(w => w.questionId === questionId)
    if (existing) {
      set({
        wrongAnswers: state.wrongAnswers.map(w =>
          w.questionId === questionId
            ? { ...w, timesCorrect: w.timesCorrect + 1 }
            : w
        ),
      })
      get().saveProgress()
    }
  },

  getWrongAnswersForModule: (moduleId: string) => {
    return get().wrongAnswers.filter(w => w.moduleId === moduleId && w.timesCorrect < 1)
  },

  getReviewQuestions: () => {
    return get().wrongAnswers.filter(w => w.timesCorrect < 1)
  },
}))
