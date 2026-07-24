import { supabase } from './supabase'

let currentUserId: string | null = null

export const setSyncUserId = (userId: string | null) => {
  currentUserId = userId
}

const getUserId = (): string | null => currentUserId

const reportSyncError = (operation: string, error: Error | null): boolean => {
  if (error) {
    console.warn(`Supabase ${operation} failed:`, error.message)
    return false
  }
  return true
}

export const syncModuleProgress = async (
  moduleId: string,
  status: 'unlocked' | 'completed',
  unlockedAt: string,
  completedAt: string | null,
): Promise<boolean> => {
  const userId = getUserId()
  if (!userId) return false

  const { error } = await supabase.from('module_progress').upsert({
    user_id: userId,
    module_id: moduleId,
    status,
    unlocked_at: unlockedAt,
    completed_at: completedAt,
  }, { onConflict: 'user_id,module_id' })

  return reportSyncError('module progress write', error)
}

export const syncQuizAttempt = async (attempt: {
  module_id: string
  score: number
  total_points: number
  percentage: number
  grade: string
  correct_answers: number
  total_questions: number
}): Promise<boolean> => {
  const userId = getUserId()
  if (!userId) return false

  const { error } = await supabase.from('quiz_attempts').insert({
    user_id: userId,
    ...attempt,
  })

  return reportSyncError('quiz attempt write', error)
}

export const syncGameAttempt = async (attempt: {
  module_id: string
  game_type: string
  score: number
  percentage: number
  grade: string
}): Promise<boolean> => {
  const userId = getUserId()
  if (!userId) return false

  const { error } = await supabase.from('game_attempts').insert({
    user_id: userId,
    ...attempt,
  })

  return reportSyncError('game attempt write', error)
}

export const syncStreak = async (
  currentStreak: number,
  longestStreak: number,
  lastActiveDate: string,
): Promise<boolean> => {
  const userId = getUserId()
  if (!userId) return false

  const { error } = await supabase.from('streaks').upsert({
    user_id: userId,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_active_date: lastActiveDate,
  }, { onConflict: 'user_id' })

  return reportSyncError('streak write', error)
}

// This role is for reporting/display only. It must never be used as an
// authorization signal for the manager reporting layer.
export const syncUserProfile = async (
  displayName: string,
  role: 'trainee' | 'intern' | 'admin',
): Promise<boolean> => {
  const userId = getUserId()
  if (!userId) return false

  const { error } = await supabase
    .from('users')
    .update({ display_name: displayName, role })
    .eq('id', userId)

  return reportSyncError('user profile write', error)
}

/**
 * The RPC executes the cohort aggregation server-side. Direct client reads are
 * intentionally limited by RLS to a trainee's own attempts.
 */
export const fetchPercentile = async (
  moduleId: string,
  percentage: number,
): Promise<number | null> => {
  const { data, error } = await supabase.rpc('get_module_percentile', {
    p_module_id: moduleId,
    p_percentage: percentage,
  })

  if (error || typeof data !== 'number') {
    reportSyncError('percentile query', error)
    return null
  }

  return data
}
