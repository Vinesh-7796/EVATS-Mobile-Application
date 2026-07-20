export const calculateGrade = (percentage: number): string => {
  if (percentage >= 95) return 'A+'
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

export const calculatePercentile = (score: number, totalPoints: number): number => {
  const percentage = (score / totalPoints) * 100
  
  if (percentage >= 95) return 95
  if (percentage >= 90) return 85
  if (percentage >= 80) return 70
  if (percentage >= 70) return 55
  if (percentage >= 60) return 40
  return 25
}

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const getDaysUntilUnlock = (unlockDate: string): number => {
  const unlock = new Date(unlockDate)
  const now = new Date()
  const diffTime = unlock.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

export const isModuleUnlocked = (unlockDate: string): boolean => {
  const unlock = new Date(unlockDate)
  const now = new Date()
  return now >= unlock
}
