import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getModuleInfo, getModuleQuestions } from '../../src/data/moduleRegistry'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { useThemeStore } from '../../src/stores/useThemeStore'
import { GAME_STAGES } from '../../src/types'
import type { GameStageId } from '../../src/types'

const STAGE_META: Record<GameStageId, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; color: string; filter: string[] }> = {
  mcq:       { title: 'MCQ Quiz',      subtitle: 'Multiple choice questions',  icon: 'checkmark-circle', color: '#4CAF50', filter: ['MCQ'] },
  connector: { title: 'Connector Game', subtitle: 'Connect the power flow',    icon: 'git-branch',       color: '#8B5CF6', filter: ['Connector'] },
  maq:       { title: 'MAQ Quiz',      subtitle: 'Select all that apply',     icon: 'checkbox',         color: '#2563EB', filter: ['MAQ'] },
  rank:      { title: 'Rank Order',     subtitle: 'Drag to reorder steps',     icon: 'reorder-two',      color: '#F97316', filter: ['RankOrder'] },
}

export default function GamesScreen() {
  const router = useRouter()
  const { moduleId } = useLocalSearchParams()
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'
  const isGameTypeCompleted = useProgressStore(state => state.isGameTypeCompleted)
  const getCompletedGameCount = useProgressStore(state => state.getCompletedGameCount)
  const isModuleFullyCompleted = useProgressStore(state => state.isModuleFullyCompleted)
  const completedGameTypes = useProgressStore(state => state.completedGameTypes)
  const moduleResults = useProgressStore(state => state.moduleResults)
  const modId = String(moduleId)
  const allWrongAnswers = useProgressStore(state => state.wrongAnswers)
  const wrongAnswers = allWrongAnswers.filter(w => w.moduleId === modId && w.timesCorrect < 1)

  const moduleInfo = getModuleInfo(modId)
  const allQuestions = getModuleQuestions(modId)

  if (!moduleInfo) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>Module Not Found</Text>
      </View>
    )
  }

  if (allQuestions.length === 0) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centered]}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16, textAlign: 'center', padding: 24 }}>
          No questions available for this module yet.
        </Text>
      </View>
    )
  }

  const completedCount = getCompletedGameCount(modId)
  const allDone = isModuleFullyCompleted(modId)

  const handleSelectStage = (stageId: GameStageId) => {
    if (isGameTypeCompleted(modId, stageId)) return
    // Check prerequisite: previous stage must be completed (unless first)
    const stageIdx = GAME_STAGES.indexOf(stageId)
    if (stageIdx > 0) {
      const prevStage = GAME_STAGES[stageIdx - 1]
      if (!isGameTypeCompleted(modId, prevStage)) return
    }
    router.push({
      pathname: `/quiz/${moduleId}`,
      params: { type: stageId },
    })
  }

  const handleViewCertificate = () => {
    router.push('/certificate')
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.moduleTitle, isDark && styles.textLight]}>{moduleInfo.title}</Text>
        <Text style={[styles.headerSubtitle, isDark && styles.textMuted]}>
          {allDone ? 'All mini-games completed!' : `Complete all ${GAME_STAGES.length} mini-games in order`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBarContainer, isDark && styles.cardDark]}>
        <View style={styles.progressBarHeader}>
          <Text style={[styles.progressLabel, isDark && styles.textLightDark]}>Progress</Text>
          <Text style={[styles.progressCount, isDark && styles.textMutedDark]}>
            {completedCount} / {GAME_STAGES.length}
          </Text>
        </View>
        <View style={[styles.progressBarBg, isDark && styles.progressBarBgDark]}>
          <View style={[styles.progressBarFill, { width: `${(completedCount / GAME_STAGES.length) * 100}%` }]} />
        </View>
      </View>

      {/* Review Mistakes section — prominent placement above stages */}
      {wrongAnswers.length > 0 && (
        <View style={styles.reviewSection}>
          <TouchableOpacity
            style={[styles.reviewCard, isDark && styles.reviewCardDark]}
            onPress={() => router.push({ pathname: `/quiz/${moduleId}`, params: { type: 'review' } })}
            activeOpacity={0.72}
          >
            <View style={[styles.reviewIconContainer]}>
              <Ionicons name="refresh" size={24} color="#EF4444" />
            </View>
            <View style={styles.reviewBody}>
              <Text style={[styles.reviewCardTitle, isDark && styles.textLightDark]}>
                Re-attempt Wrong Answers
              </Text>
              <Text style={[styles.reviewCardSubtitle, isDark && styles.textMutedDark]}>
                {wrongAnswers.length} question{wrongAnswers.length !== 1 ? 's' : ''} answered incorrectly
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#555' : '#CBD5E1'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stage cards */}
      <View style={styles.stagesContainer}>
        {GAME_STAGES.map((stageId, idx) => {
          const meta = STAGE_META[stageId]
          const done = isGameTypeCompleted(modId, stageId)
          const prevDone = idx === 0 || isGameTypeCompleted(modId, GAME_STAGES[idx - 1])
          const locked = !done && !prevDone
          const questionCount = allQuestions.filter(q => meta.filter.includes(q.type)).length
          const gameResult = done ? (moduleResults as any)[`${modId}:${stageId}`] as { correctAnswers: number; totalQuestions: number } | undefined : undefined

          return (
            <View key={stageId} style={styles.stageWrapper}>
              {/* Connector line between stages */}
              {idx > 0 && (
                <View style={[
                  styles.stageConnector,
                  !locked && !done && { backgroundColor: meta.color + '40' },
                  done && { backgroundColor: meta.color },
                  isDark && styles.stageConnectorDark,
                ]} />
              )}

              <TouchableOpacity
                style={[
                  styles.stageCard,
                  isDark && styles.stageCardDark,
                  done && styles.stageCardDone,
                  done && { borderColor: meta.color },
                  locked && styles.stageCardLocked,
                ]}
                onPress={() => handleSelectStage(stageId)}
                disabled={locked || done}
                activeOpacity={0.72}
              >
                {/* Left accent */}
                <View style={[styles.stageAccent, { backgroundColor: done ? meta.color : locked ? '#ccc' : meta.color + '60' }]} />

                {/* Step number / check */}
                <View style={[
                  styles.stageStepBadge,
                  done && { backgroundColor: meta.color },
                  locked && (isDark ? { backgroundColor: '#333' } : { backgroundColor: '#e0e0e0' }),
                ]}>
                  {done ? (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  ) : (
                    <Text style={[styles.stageStepNum, locked && isDark && { color: '#666' }]}>{idx + 1}</Text>
                  )}
                </View>

                {/* Icon */}
                <View style={[styles.stageIconContainer, { backgroundColor: meta.color + '18' }]}>
                  <Ionicons name={meta.icon} size={24} color={locked ? '#ccc' : meta.color} />
                </View>

                {/* Text */}
                <View style={styles.stageBody}>
                  <Text style={[styles.stageTitle, isDark && styles.textLightDark, locked && styles.textLocked]}>
                    {meta.title}
                  </Text>
                  <Text style={[styles.stageSubtitle, isDark && styles.textMutedDark, locked && styles.textLocked]}>
                    {meta.subtitle}
                  </Text>
                </View>

                {/* Question count / score */}
                <View style={[styles.countBadge, { backgroundColor: meta.color + '20' }]}>
                  <Text style={[styles.countText, { color: locked ? '#ccc' : meta.color }]}>
                    {done && gameResult ? `${gameResult.correctAnswers} / ${gameResult.totalQuestions}` : questionCount}
                  </Text>
                </View>

                {/* Status icon */}
                {done && <Ionicons name="checkmark-circle" size={22} color={meta.color} />}
                {locked && <Ionicons name="lock-closed" size={18} color="#ccc" />}
                {!done && !locked && (
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#555' : '#CBD5E1'} />
                )}
              </TouchableOpacity>
            </View>
          )
        })}
      </View>

      {/* Certificate button when all done */}
      {allDone && (
        <View style={styles.certSection}>
          <TouchableOpacity style={[styles.certButton, isDark && styles.certButtonDark]} onPress={handleViewCertificate}>
            <Ionicons name="ribbon" size={24} color="#F97316" />
            <View style={styles.certBody}>
              <Text style={[styles.certTitle, isDark && styles.textLightDark]}>Generate Certificate</Text>
              <Text style={[styles.certSubtitle, isDark && styles.textMutedDark]}>All mini-games completed for this module</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#555' : '#CBD5E1'} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#1a1a1a' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerDark: { backgroundColor: '#111111', borderBottomColor: 'rgba(255,255,255,0.08)' },
  moduleTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#888' },

  // Progress bar
  progressBarContainer: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardDark: { backgroundColor: '#252525' },
  progressBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  progressCount: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  progressBarBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  progressBarBgDark: { backgroundColor: '#333' },
  progressBarFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 4 },

  // Stages
  stagesContainer: { padding: 16, gap: 0 },
  stageWrapper: { position: 'relative' },
  stageConnector: { position: 'absolute', top: -6, left: 38, width: 2, height: 12, backgroundColor: '#e0e0e0', zIndex: 0 },
  stageConnectorDark: { backgroundColor: '#333' },
  stageCard: { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginBottom: 12 },
  stageCardDark: { backgroundColor: '#252525' },
  stageCardDone: { borderWidth: 1.5 },
  stageCardLocked: { opacity: 0.45 },
  stageAccent: { width: 4, alignSelf: 'stretch' },
  stageStepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', margin: 12, marginLeft: 14, flexShrink: 0 },
  stageStepNum: { fontSize: 13, fontWeight: '700', color: '#fff' },
  stageIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0 },
  stageBody: { flex: 1, gap: 2 },
  stageTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  stageSubtitle: { fontSize: 11, color: '#888' },
  textLocked: { color: '#bbb' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
  countText: { fontSize: 13, fontWeight: '700' },

  // Certificate section
  certSection: { padding: 16 },
  certButton: { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', padding: 16, shadowColor: '#F97316', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: '#F9731630' },
  certButtonDark: { backgroundColor: '#252525' },
  certBody: { flex: 1, marginHorizontal: 12 },
  certTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  certSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },

  // Review section
  reviewSection: { paddingHorizontal: 16, marginTop: 16 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', padding: 16, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, borderWidth: 1.5, borderColor: '#EF444430' },
  reviewCardDark: { backgroundColor: '#252525' },
  reviewIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEE2E2', marginRight: 12 },
  reviewBody: { flex: 1, gap: 2 },
  reviewCardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  reviewCardSubtitle: { fontSize: 11, color: '#888' },

  textLight: { color: '#d4d4d4' },
  textMuted: { color: '#888' },
  textLightDark: { color: '#d4d4d4' },
  textMutedDark: { color: '#888888' },
})
