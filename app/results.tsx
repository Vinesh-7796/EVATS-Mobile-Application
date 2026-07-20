import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getModuleInfo } from '../src/data/moduleRegistry'
import { useProgressStore } from '../src/stores/useProgressStore'
import { useThemeStore } from '../src/stores/useThemeStore'
import { GAME_STAGES } from '../src/types'
import type { GameStageId } from '../src/types'

const STAGE_META: Record<GameStageId, { title: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  mcq:       { title: 'MCQ Quiz',      icon: 'checkmark-circle', color: '#4CAF50' },
  connector: { title: 'Connector Game', icon: 'git-branch',       color: '#8B5CF6' },
  maq:       { title: 'MAQ Quiz',      icon: 'checkbox',         color: '#2563EB' },
  rank:      { title: 'Rank Order',     icon: 'reorder-two',      color: '#F97316' },
}

const GAME_TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ Quiz',
  connector: 'Connector Game',
  maq: 'MAQ Quiz',
  rank: 'Rank Order',
}

export default function ResultsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const currentStreak = useProgressStore(state => state.currentStreak)
  const getCompletedGameCount = useProgressStore(state => state.getCompletedGameCount)
  const isModuleFullyCompleted = useProgressStore(state => state.isModuleFullyCompleted)
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  const moduleId = params.moduleId as string
  const gameType = params.gameType as string
  const flowchart = getModuleInfo(moduleId)
  const moduleTitle = flowchart ? flowchart.title : 'Module'

  const score = parseInt(params.score as string)
  const percentage = parseFloat(params.percentage as string)
  const grade = params.grade as string
  const correctAnswers = parseInt(params.correctAnswers as string)
  const totalQuestions = parseInt(params.totalQuestions as string)

  const isReview = gameType === 'review'
  const completedCount = getCompletedGameCount(moduleId)
  const allDone = isModuleFullyCompleted(moduleId)
  const nextStageIdx = GAME_STAGES.indexOf(gameType as GameStageId)
  const nextStage = !allDone && nextStageIdx >= 0 && nextStageIdx < GAME_STAGES.length - 1
    ? GAME_STAGES[nextStageIdx + 1]
    : null

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':  return '#4CAF50'
      case 'B':  return '#8BC34A'
      case 'C':  return '#FFC107'
      case 'D':  return '#FF9800'
      default:   return '#F44336'
    }
  }

  const handleNextGame = () => {
    router.dismiss(1)
  }

  const handleViewCertificate = () => {
    router.push('/certificate')
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={styles.emoji}>{isReview ? '📚' : allDone ? '🎉' : '✅'}</Text>
          <Text style={styles.title}>{isReview ? 'Review Complete!' : allDone ? 'Module Complete!' : 'Game Complete!'}</Text>
          <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>
            {isReview ? `${moduleTitle} — Wrong Answers Reviewed` : allDone ? moduleTitle : `${GAME_TYPE_LABELS[gameType] || gameType} — ${moduleTitle}`}
          </Text>
        </View>

        {/* Grade */}
        <View style={[styles.gradeContainer, { backgroundColor: getGradeColor(grade) + '20' }]}>
          <Text style={[styles.gradeText, { color: getGradeColor(grade) }]}>{grade}</Text>
          <Text style={[styles.percentageText, isDark && styles.textLightDark]}>{percentage.toFixed(1)}%</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <Text style={styles.statValue}>{score}</Text>
            <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Points</Text>
          </View>
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <Text style={styles.statValue}>{correctAnswers}/{totalQuestions}</Text>
            <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Correct</Text>
          </View>
        </View>

        {!isReview && currentStreak > 0 && (
          <View style={[styles.streakBox, isDark && styles.streakBoxDark]}>
            <Text style={styles.streakText}>🔥 {currentStreak} Day Streak!</Text>
            <Text style={[styles.streakSubtext, isDark && styles.textMutedDark]}>
              +{(currentStreak * 5)}% bonus points
            </Text>
          </View>
        )}

        {/* Progress tracker — 4 stages */}
        {!isReview && (
        <View style={[styles.progressSection, isDark && styles.progressSectionDark]}>
          <Text style={[styles.progressTitle, isDark && styles.textLightDark]}>Mini-Games Progress</Text>
          <View style={styles.progressRow}>
            {GAME_STAGES.map((stageId, idx) => {
              const meta = STAGE_META[stageId]
              const done = (useProgressStore.getState().completedGameTypes[moduleId] || []).includes(stageId)
              const isCurrent = stageId === gameType
              return (
                <View key={stageId} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    done && { backgroundColor: meta.color },
                    isCurrent && !done && { borderColor: meta.color, borderWidth: 2 },
                    !done && !isCurrent && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#e0e0e0' }),
                  ]}>
                    {done ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text style={[styles.progressDotNum, isDark && styles.textMutedDark]}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text style={[
                    styles.progressStepLabel,
                    done && { color: meta.color },
                    isDark && styles.textMutedDark,
                  ]} numberOfLines={1}>
                    {meta.title}
                  </Text>
                  {idx < GAME_STAGES.length - 1 && (
                    <View style={[
                      styles.progressConnector,
                      done && { backgroundColor: meta.color },
                      isDark && !done && { backgroundColor: '#333' },
                    ]} />
                  )}
                </View>
              )
            })}
          </View>
          <Text style={[styles.progressCount, isDark && styles.textMutedDark]}>
            {completedCount} / {GAME_STAGES.length} completed
          </Text>
        </View>
        )}
      </ScrollView>

      {/* Footer buttons */}
      <View style={[styles.footer, isDark && styles.footerDark]}>
        {isReview ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNextGame}>
            <Text style={styles.primaryButtonText}>Back to Games</Text>
          </TouchableOpacity>
        ) : allDone ? (
          <>
            <TouchableOpacity style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]} onPress={handleViewCertificate}>
              <Text style={[styles.secondaryButtonText, isDark && styles.textLightDark]}>📜 View Certificate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNextGame}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]} onPress={handleNextGame}>
              <Text style={[styles.secondaryButtonText, isDark && styles.textLightDark]}>
                {nextStage ? `Next: ${STAGE_META[nextStage].title}` : 'Back to Games'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNextGame}>
              <Text style={styles.primaryButtonText}>
                {nextStage ? 'Start Next Game →' : 'View Progress'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#1a1a1a' },
  content: { flex: 1 },
  header: { backgroundColor: '#1a1a1a', padding: 32, alignItems: 'center' },
  headerDark: { backgroundColor: '#111111' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888' },
  gradeContainer: { margin: 24, padding: 32, borderRadius: 16, alignItems: 'center' },
  gradeText: { fontSize: 72, fontWeight: 'bold' },
  percentageText: { fontSize: 24, color: '#666', marginTop: 8 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 16, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statCardDark: { backgroundColor: '#252525', shadowOpacity: 0.4 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#FF6B35' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  streakBox: { backgroundColor: '#FFF3E0', margin: 16, padding: 16, borderRadius: 12, borderColor: '#FF6B35', borderWidth: 2, alignItems: 'center' },
  streakBoxDark: { backgroundColor: '#252525', borderColor: '#F97316' },
  streakText: { fontSize: 18, fontWeight: 'bold', color: '#FF6B35' },
  streakSubtext: { fontSize: 14, color: '#666', marginTop: 4 },

  // Progress tracker
  progressSection: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  progressSectionDark: { backgroundColor: '#252525', shadowOpacity: 0.4 },
  progressTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 16, textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  progressStep: { alignItems: 'center', flex: 1, position: 'relative' },
  progressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  progressDotNum: { fontSize: 13, fontWeight: '700', color: '#999' },
  progressStepLabel: { fontSize: 10, fontWeight: '600', color: '#888', marginTop: 6, textAlign: 'center' },
  progressConnector: { position: 'absolute', top: 15, left: '60%', width: '80%', height: 2, backgroundColor: '#e0e0e0', zIndex: 0 },
  progressCount: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 12 },

  // Footer
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', flexDirection: 'row', gap: 12 },
  footerDark: { backgroundColor: '#1a1a1a', borderTopColor: 'rgba(255,255,255,0.08)' },
  primaryButton: { flex: 1, backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { flex: 1, backgroundColor: '#f0f0f0', padding: 16, borderRadius: 8, alignItems: 'center' },
  secondaryButtonDark: { backgroundColor: '#333333' },
  secondaryButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  textLightDark: { color: '#d4d4d4' },
  textMutedDark: { color: '#888888' },
})
