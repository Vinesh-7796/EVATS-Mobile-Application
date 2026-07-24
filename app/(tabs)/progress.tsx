import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { useThemeStore } from '../../src/stores/useThemeStore'
import { MODULE_ORDER } from '../../src/data/moduleRegistry'
import { ACHIEVEMENTS } from '../../src/types'

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9']

function ProgramTracker({
  completedModules,
  moduleResults,
  isDark,
}: {
  completedModules: string[]
  moduleResults: Record<string, { grade: string }>
  isDark: boolean
}) {
  return (
    <View style={styles.programGrid}>
      {MODULE_ORDER.map((moduleId, index) => {
        const isCompleted = completedModules.includes(moduleId)
        const grade = moduleResults[moduleId]?.grade

        return (
          <View
            key={moduleId}
            style={[
              styles.programDay,
              isDark && styles.programDayDark,
              isCompleted && styles.programDayCompleted,
              isCompleted && isDark && styles.programDayCompletedDark,
            ]}
          >
            <View style={[styles.programDayHeader, isCompleted && styles.programDayHeaderCompleted]}>
              <Text style={[styles.programDayNum, isCompleted && styles.programDayNumCompleted]}>
                {isCompleted ? '✓' : index + 1}
              </Text>
            </View>
            <Text style={[styles.programDayLabel, isDark && styles.textMutedDark]} numberOfLines={1}>
              {DAY_LABELS[index]}
            </Text>
            <Text style={[
              styles.programGrade,
              isCompleted && { color: grade === 'A+' || grade === 'A' ? '#4CAF50' : grade === 'B' ? '#8BC34A' : '#F97316' },
              !isCompleted && isDark && styles.textMutedDark,
            ]}>
              {isCompleted ? grade : '—'}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function ProgressScreen() {
  const {
    completedModules,
    totalPoints,
    currentStreak,
    moduleResults,
    xp,
    unlockedAchievements,
  } = useProgressStore()
  const { getCurrentLevel, getNextLevel, getXpProgress } = useProgressStore()
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  const currentLevel = getCurrentLevel()
  const nextLevel = getNextLevel()
  const xpProgress = getXpProgress()

  const getBestGrade = () => {
    if (completedModules.length === 0) return 'N/A'
    const gradePriority: Record<string, number> = { 'A+': 6, A: 5, B: 4, C: 3, D: 2, F: 1 }
    let best = 'F'
    for (const moduleId of completedModules) {
      const grade = moduleResults[moduleId]?.grade
      if (grade && gradePriority[grade] > gradePriority[best]) best = grade
    }
    return best
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.title, isDark && styles.titleDark]}>Your Progress</Text>
        <Text style={[styles.headerSubtitle, isDark && styles.textMutedDark]}>Track your 9-day EV systems learning journey.</Text>
      </View>

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

      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelBadge}>{currentLevel.badge}</Text>
          <View style={styles.levelContent}>
            <Text style={[styles.levelTitle, isDark && styles.textLightDark]}>{currentLevel.name}</Text>
            <Text style={[styles.levelSubtitle, isDark && styles.textMutedDark]}>
              {xp} XP{nextLevel ? ` - ${nextLevel.minXp - xp} XP to ${nextLevel.name}` : ' - Max Level'}
            </Text>
          </View>
        </View>
        <View style={[styles.xpBarBg, isDark && styles.xpBarBgDark]}>
          <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textLightDark]}>9-Day Program</Text>
        <ProgramTracker
          completedModules={completedModules}
          moduleResults={moduleResults}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textLightDark]}>Achievements</Text>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map(achievement => {
            const unlocked = unlockedAchievements.includes(achievement.id)
            return (
              <View key={achievement.id} style={[styles.achievementCard, isDark && styles.achievementCardDark, !unlocked && styles.achievementLocked]}>
                <Text style={[styles.achievementIcon, !unlocked && styles.achievementIconLocked]}>{achievement.icon}</Text>
                <Text style={[styles.achievementTitle, isDark && styles.textLightDark, !unlocked && styles.achievementTitleLocked]} numberOfLines={1}>
                  {achievement.title}
                </Text>
                <Text style={[styles.achievementDesc, isDark && styles.textMutedDark]} numberOfLines={2}>
                  {achievement.description}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {currentStreak > 0 && (
        <View style={[styles.streakSection, isDark && styles.streakSectionDark]}>
          <Text style={styles.streakTitle}>Current streak: {currentStreak} day{currentStreak === 1 ? '' : 's'}</Text>
          <Text style={[styles.streakDescription, isDark && styles.textMutedDark]}>
            Current bonus: +{currentStreak * 5}% points (maximum 50%)
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  containerDark: { backgroundColor: '#1A1A1A' },
  content: { paddingBottom: 28 },
  header: { backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerDark: { backgroundColor: '#111111', borderBottomColor: 'rgba(255,255,255,0.08)' },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  titleDark: { color: '#FFFFFF' },
  headerSubtitle: { marginTop: 4, color: '#64748B', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { width: '47%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statCardDark: { backgroundColor: '#252525', shadowOpacity: 0.4 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#F97316' },
  statLabel: { marginTop: 4, color: '#64748B', fontSize: 11, textAlign: 'center' },
  card: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardDark: { backgroundColor: '#252525', shadowOpacity: 0.4 },
  cardTitle: { marginBottom: 12, color: '#1A1A1A', fontSize: 16, fontWeight: '700' },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  levelBadge: { fontSize: 32 },
  levelContent: { flex: 1 },
  levelTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '700' },
  levelSubtitle: { marginTop: 2, color: '#888888', fontSize: 12 },
  xpBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#E0E0E0' },
  xpBarBgDark: { backgroundColor: '#333333' },
  xpBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#F97316' },
  programGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  programDay: { width: '30%', padding: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F5F5F5' },
  programDayDark: { backgroundColor: '#1E1E1E' },
  programDayCompleted: { borderWidth: 1, borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  programDayCompletedDark: { borderColor: '#22C55E', backgroundColor: '#153322' },
  programDayHeader: { width: 32, height: 32, marginBottom: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#E0E0E0' },
  programDayHeaderCompleted: { backgroundColor: '#4CAF50' },
  programDayNum: { color: '#666666', fontSize: 13, fontWeight: '700' },
  programDayNumCompleted: { color: '#FFFFFF' },
  programDayLabel: { marginBottom: 2, color: '#888888', fontSize: 10, fontWeight: '600' },
  programGrade: { color: '#F97316', fontSize: 12, fontWeight: '700' },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementCard: { width: '47%', padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F9F9F9' },
  achievementCardDark: { backgroundColor: '#1E1E1E' },
  achievementLocked: { opacity: 0.35 },
  achievementIcon: { marginBottom: 4, fontSize: 28 },
  achievementIconLocked: { opacity: 0.3 },
  achievementTitle: { marginBottom: 2, color: '#1A1A1A', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  achievementTitleLocked: { color: '#999999' },
  achievementDesc: { color: '#888888', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  streakSection: { margin: 16, padding: 20, borderWidth: 2, borderColor: '#F97316', borderRadius: 12, backgroundColor: '#FFF3E0' },
  streakSectionDark: { borderColor: '#F97316', backgroundColor: '#252525' },
  streakTitle: { marginBottom: 8, color: '#F97316', fontSize: 20, fontWeight: '700' },
  streakDescription: { color: '#666666', fontSize: 14 },
  textLightDark: { color: '#D4D4D4' },
  textMutedDark: { color: '#888888' },
})
