export type Domain = 'HV' | 'LV' | 'CAN' | 'Thermal' | 'Safety' | 'Control' | 'Ground' | 'Hydraulic / Mechanical' | 'Powertrain / Drivetrain'

export interface ComponentDetail {
  id: string
  flowchartId: string
  name: string
  aliases?: string[]
  svgCellIds?: string[]
  description: string
  detailedNotes?: string
  domain: Domain
  cableType?: string
  communicationType?: string
  upstream?: string[]
  downstream?: string[]
  relatedSystems?: string[]
  diagnostics?: string
  image?: string
  sourceReferences?: string[]
}

export interface FlowchartInfo {
  id: string
  title: string
  shortDescription: string
  svgFile: string
  videoFile?: string
  colorTheme: Domain
  componentIds: string[]
}

export type ModuleStatus = 'locked' | 'unlocked' | 'completed'

export interface Module {
  id: string
  flowchartInfo: FlowchartInfo
  status: ModuleStatus
  unlockDate: Date
  completionDate?: Date
  score?: number
  grade?: string
}

export type QuestionType = 'MCQ' | 'MAQ' | 'RankOrder' | 'Connector'

/** Progressive game stage IDs — ordered by difficulty */
export const GAME_STAGES = ['mcq', 'connector', 'maq', 'rank'] as const
export type GameStageId = typeof GAME_STAGES[number]
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface BaseQuestion {
  id: string
  type: QuestionType
  difficulty: Difficulty
  points: number
  question: string
  componentRef?: string
}

export interface MCQQuestion extends BaseQuestion {
  type: 'MCQ'
  options: string[]
  correctAnswer: string
}

export interface MAQQuestion extends BaseQuestion {
  type: 'MAQ'
  options: string[]
  correctAnswers: string[]
}

export interface RankOrderQuestion extends BaseQuestion {
  type: 'RankOrder'
  steps: string[]
  correctOrder: number[]
}

export interface ConnectorQuestion extends BaseQuestion {
  type: 'Connector'
  components: string[]
  connections: Array<{
    from: string
    to: string
  }>
}

export type QuizQuestion = MCQQuestion | MAQQuestion | RankOrderQuestion | ConnectorQuestion

export interface QuizResult {
  moduleId: string
  score: number
  totalPoints: number
  percentage: number
  grade: string
  correctAnswers: number
  totalQuestions: number
  completedAt: Date
  answers: Array<{
    questionId: string
    correct: boolean
    pointsEarned: number
  }>
}

export interface UserProgress {
  completedModules: string[]
  totalPoints: number
  currentStreak: number
  lastActivityDate: string
  moduleResults: Record<string, QuizResult>
  moduleUnlockDates: Record<string, string>
  // Phase 2 gamification
  xp: number
  unlockedAchievements: AchievementId[]
  streakCalendar: StreakCalendar
  wrongAnswers: WrongAnswerRecord[]
  quizStartTime?: number
  // Progressive mini-games: which game types completed per module
  completedGameTypes: Record<string, GameStageId[]>
}

export interface Certificate {
  userName: string
  userId: string
  moduleName: string
  grade: string
  points: number
  percentile: number
  completionDate: Date
}

// ── Gamification types (Phase 2) ─────────────────────────────────────

export type XpLevelName = 'Novice' | 'Apprentice' | 'Technician' | 'Engineer' | 'Expert'

export interface XpLevel {
  name: XpLevelName
  minXp: number
  badge: string
}

export const XP_LEVELS: XpLevel[] = [
  { name: 'Novice',     minXp: 0,    badge: '🌱' },
  { name: 'Apprentice', minXp: 100,  badge: '🔧' },
  { name: 'Technician', minXp: 300,  badge: '⚡' },
  { name: 'Engineer',   minXp: 600,  badge: '🎓' },
  { name: 'Expert',     minXp: 1000, badge: '🏆' },
]

export type AchievementId =
  | 'first_quiz'
  | 'perfect_score'
  | 'three_day_streak'
  | 'five_day_streak'
  | 'speed_run'
  | 'all_components_viewed'
  | 'module_master'
  | 'first_retake'

export interface Achievement {
  id: AchievementId
  title: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_quiz',             title: 'First Steps',     description: 'Complete your first quiz',                    icon: '🎯' },
  { id: 'perfect_score',          title: 'Perfect Score',   description: 'Score 100% on any quiz',                      icon: '💯' },
  { id: 'three_day_streak',       title: 'On a Roll',       description: 'Maintain a 3-day streak',                     icon: '🔥' },
  { id: 'five_day_streak',        title: 'Unstoppable',     description: 'Maintain a 5-day streak',                     icon: '⚡' },
  { id: 'speed_run',              title: 'Speed Run',       description: 'Complete a quiz in under 3 minutes',           icon: '⏱️' },
  { id: 'all_components_viewed',  title: 'Explorer',        description: 'View all components in a module',             icon: '🗺️' },
  { id: 'module_master',          title: 'Module Master',   description: 'Score A or A+ on any module',                 icon: '🏅' },
  { id: 'first_retake',           title: 'Second Chance',   description: 'Retake a quiz for a better score',            icon: '🔄' },
]

export interface StreakCalendar {
  /** ISO date strings (YYYY-MM-DD) the user was active */
  activeDays: string[]
}

export interface WrongAnswerRecord {
  questionId: string
  moduleId: string
  lastSeen: string
  timesWrong: number
  timesCorrect: number
}
