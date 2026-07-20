import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { useThemeStore } from '../../src/stores/useThemeStore'
import { getAllModules, isModuleAvailable, MODULE_ORDER } from '../../src/data/moduleRegistry'
import { isModuleUnlocked } from '../../src/utils/helpers'
import { ACHIEVEMENTS } from '../../src/types'

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9']

function ProgramTracker({
  completedModules,
  moduleResults,
  isDark,
}: {
  completedModules: string[]
  moduleResults: Record<string, any>
  isDark: boolean
}) {
  // Determine which day the user is on based on first activity date
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  return (
    <View style={styles.programGrid}>
      {MODULE_ORDER.map((moduleId, index) => {
        const isCompleted = completedModules.includes(moduleId)
        const result = moduleResults[moduleId]
        const grade = result ? result.grade : null
        const dayNum = index + 1

        return (
          <View
            key={moduleId}
            style={[
              styles.programDay,
              isDark && styles.programDayDark,
              isCompleted && styles.programDayCompleted,
            ]}
          >
            <View style={[
              styles.programDayHeader,
              isCompleted && styles.programDayHeaderCompleted,
            ]}>
              <Text style={[
                styles.programDayNum,
                isCompleted && styles.programDayNumCompleted,
              ]}>
                {isCompleted ? '✓' : dayNum}
              </Text>
            </View>
            <Text style={[styles.programDayLabel, isDark && styles.textMutedDark]} numberOfLines={1}>
              {DAY_LABELS[index]}
            </Text>
            {isCompleted ? (
              <Text style={[styles.programGrade, { color: grade === 'A+' || grade === 'A' ? '#4CAF50' : grade === 'B' ? '#8BC34A' : '#F97316' }]}>
                {grade}
              </Text>
            ) : (
              <Text style={[styles.programGrade, isDark && styles.textMutedDark]}>—</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

export default function ProgressScreen() {
  const { completedModules, totalPoints, currentStreak, moduleResults, moduleUnlockDates, xp, streakCalendar, unlockedAchievements } = useProgressStore()
  const { getCurrentLevel, getNextLevel, getXpProgress } = useProgressStore()
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  const currentLevel = getCurrentLevel()
  const nextLevel = getNextLevel()
  const xpProgress = getXpProgress()

  const getBestGrade = () => {
    if (completedModules.length === 0) return 'N/A'
    const grades = Object.values(moduleResults).map(r => r.grade)
    const gradePriority: Record<string, number> = { 'A+': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 }
    let best = 'F'
    for (const g of grades) {
      if (gradePriority[g] > (gradePriority[best] || 0)) best = g
    }
    return best
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.title, isDark && styles.titleDark]}>Your Progress</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
          <Text style={styles.statValue}>{completedModules.length}</Text>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Modules Done</Text>
        </View>
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Total Points</Text>
        </View>
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
          <Text style={styles.statValue}>{currentStreak}</Text>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Day Streak</Text>
        </View>
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
          <Text style={styles.statValue}>{getBestGrade()}</Text>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Best Grade</Text>
        </View>
      </View>

      {/* XP Level */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelBadge}>{currentLevel.badge}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.levelTitle, isDark && styles.textLightDark]}>
              {currentLevel.name}
            </Text>
            <Text style={[styles.levelSubtitle, isDark && styles.textMutedDark]}>
              {xp} XP{nextLevel ? ` — ${nextLevel.minXp - xp} XP to ${nextLevel.name}` : ' — Max Level!'}
            </Text>
          </View>
        </View>
        {/* XP Progress bar */}
        <View style={[styles.xpBarBg, isDark && styles.xpBarBgDark]}>
          <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
      </View>

      {/* Program Tracker — 9-day learning journey */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textLightDark]}>9-Day Program</Text>
        <ProgramTracker
          completedModules={completedModules}
          moduleResults={moduleResults}
          isDark={isDark}
        />
      </View>

      {/* Module Overview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.textLightDark]}>Modules</Text>
        {getAllModules().map((module) => {
          const modId = module.id
          const unlocked = isModuleAvailable(modId, completedModules, moduleUnlockDates, isModuleUnlocked)
          const isCompleted = completedModules.includes(modId)
          const result = moduleResults[modId]
          const percentage = result ? result.percentage : 0
          const grade = result ? result.grade : 'N/A'

          return (
            <View
              key={modId}
              style={[
                styles.moduleRow,
                isDark && styles.moduleRowDark,
                isCompleted && styles.moduleRowCompleted,
                (!unlocked && !isCompleted) && styles.moduleRowLocked,
              ]}
            >
              <View style={styles.moduleInfo}>
                <Text style={[styles.moduleName, isDark && styles.textLightDark]}>{module.title}</Text>
                <Text style={[styles.moduleStatus, isDark && styles.textMutedDark]}>
                  {isCompleted ? `Done — ${grade} (${percentage.toFixed(0)}%)` : unlocked ? 'Available' : 'Locked'}
                </Text>
              </View>
              {isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
          )
        })}
      </View>

      {/* Achievements */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textLightDark]}>Achievements</Text>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedAchievements.includes(ach.id)
            return (
              <View key={ach.id} style={[styles.achievementCard, isDark && styles.achievementCardDark, !unlocked && styles.achievementLocked]}>
                <Text style={[styles.achievementIcon, !unlocked && styles.achievementIconLocked]}>{ach.icon}</Text>
                <Text style={[styles.achievementTitle, isDark && styles.textLightDark, !unlocked && styles.achievementTitleLocked]} numberOfLines={1}>
                  {ach.title}
                </Text>
                <Text style={[styles.achievementDesc, isDark && styles.textMutedDark]} numberOfLines={2}>
                  {ach.description}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {currentStreak > 0 && (
        <View style={[styles.streakSection, isDark && styles.streakSectionDark]}>
          <Text style={styles.streakTitle}>🔥 {currentStreak} Day Streak!</Text>
          <Text style={[styles.streakDescription, isDark && styles.textMutedDark]}>
            Current bonus: +{(currentStreak * 5)}% points (max 50%)
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#1a1a1a' },
  header: { backgroundColor: '#ffffff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerDark: { backgroundColor: '#111111', borderBottomColor: 'rgba(255,255,255,0.08)' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  titleDark: { color: '#fff' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { width: '47%', backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statCardDark: { backgroundColor: '#252525', shadowOpacity: 0.4 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#FF6B35' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },

  // Card wrapper
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardDark: { backgroundColor: '#252525', shadowOpacity: 0.4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  // XP Level
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  levelBadge: { fontSize: 32 },
  levelTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  levelSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  xpBarBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  xpBarBgDark: { backgroundColor: '#333' },
  xpBarFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 4 },

  // 9-day program tracker
  programGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  programDay: {
    width: '30%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  programDayDark: {
    backgroundColor: '#1e1e1e',
  },
  programDayCompleted: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  programDayHeader: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  programDayHeaderCompleted: {
    backgroundColor: '#4CAF50',
  },
  programDayNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  programDayNumCompleted: {
    color: '#fff',
  },
  programDayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
    marginBottom: 2,
  },
  programGrade: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },

  // Modules
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#1a1a1a' },
  moduleRow: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  moduleRowDark: { backgroundColor: '#252525' },
  moduleRowCompleted: { borderColor: '#4CAF50', borderWidth: 2 },
  moduleRowLocked: { opacity: 0.5 },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  moduleStatus: { fontSize: 12, color: '#666' },
  checkmark: { fontSize: 20, color: '#4CAF50' },

  // Achievements
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementCard: { width: '47%', backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, alignItems: 'center' },
  achievementCardDark: { backgroundColor: '#1e1e1e' },
  achievementLocked: { opacity: 0.35 },
  achievementIcon: { fontSize: 28, marginBottom: 4 },
  achievementIconLocked: { opacity: 0.3 },
  achievementTitle: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 2 },
  achievementTitleLocked: { color: '#999' },
  achievementDesc: { fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 14 },

  // Streak
  streakSection: { margin: 16, backgroundColor: '#FFF3E0', padding: 20, borderRadius: 12, borderColor: '#FF6B35', borderWidth: 2 },
  streakSectionDark: { backgroundColor: '#252525', borderColor: '#F97316' },
  streakTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF6B35', marginBottom: 8 },
  streakDescription: { fontSize: 14, color: '#666' },

  textLightDark: { color: '#d4d4d4' },
  textMutedDark: { color: '#888888' },
})
