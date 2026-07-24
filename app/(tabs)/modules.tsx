import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { useThemeStore } from '../../src/stores/useThemeStore'
import { getAllModules, getModuleInfo, getModulePrerequisite } from '../../src/data/moduleRegistry'
import { getDaysUntilUnlock, isModuleUnlocked } from '../../src/utils/helpers'

export default function ModulesScreen() {
  const router = useRouter()
  const { moduleUnlockDates, completedModules, moduleResults, isLoaded } = useProgressStore()
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  const isModulePathUnlocked = (moduleId: string): boolean => {
    if (moduleId === 'hv-power') return true
    const prerequisite = getModulePrerequisite(moduleId)
    return prerequisite ? completedModules.includes(prerequisite) : false
  }

  if (!isLoaded) {
    return <View style={[styles.container, isDark && styles.containerDark]} />
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      <View style={[styles.intro, isDark && styles.introDark]}>
        <Text style={[styles.title, isDark && styles.textLightDark]}>Modules</Text>
        <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>
          Follow the eight-system EV training path. Complete a module to unlock the next system.
        </Text>
      </View>

      {getAllModules().map((module, index) => {
        const moduleId = module.id
        const unlockDate = moduleUnlockDates[moduleId]
        const isDateUnlocked = unlockDate ? isModuleUnlocked(unlockDate) : true
        const isFullyUnlocked = isModulePathUnlocked(moduleId) && isDateUnlocked
        const isCompleted = completedModules.includes(moduleId)
        const result = moduleResults[moduleId]
        const daysUntilUnlock = unlockDate ? getDaysUntilUnlock(unlockDate) : 0
        const prerequisite = getModulePrerequisite(moduleId)
        const prerequisiteName = prerequisite ? getModuleInfo(prerequisite)?.title ?? 'the previous module' : ''

        return (
          <TouchableOpacity
            key={moduleId}
            style={[
              styles.moduleCard,
              isDark && styles.moduleCardDark,
              !isFullyUnlocked && styles.moduleCardLocked,
              isCompleted && styles.moduleCardCompleted,
              isCompleted && isDark && styles.moduleCardCompletedDark,
            ]}
            onPress={() => isFullyUnlocked && router.push(`/learn/${moduleId}`)}
            disabled={!isFullyUnlocked}
            accessibilityRole="button"
            accessibilityLabel={`${module.title}, ${isCompleted ? 'completed' : isFullyUnlocked ? 'available' : 'locked'}`}
          >
            <View style={styles.moduleTopRow}>
              <View style={styles.moduleNumber}><Text style={styles.moduleNumberText}>{index + 1}</Text></View>
              <View style={styles.moduleHeading}>
                <Text style={[styles.moduleTitle, isDark && styles.textLightDark]}>{module.title}</Text>
                <Text style={[styles.moduleDescription, isDark && styles.textMutedDark]}>{module.shortDescription}</Text>
              </View>
              {isCompleted ? (
                <View style={styles.completedResult}>
                  <View style={styles.gradeBadge}><Text style={styles.gradeText}>{result?.grade ?? '—'}</Text></View>
                  <View style={styles.completedLabel}><Ionicons name="checkmark" size={12} color="#15803D" /><Text style={styles.completedLabelText}>Completed</Text></View>
                </View>
              ) : isFullyUnlocked ? (
                <Ionicons name="chevron-forward" size={22} color={isDark ? '#D4D4D4' : '#475569'} />
              ) : (
                <Ionicons name="lock-closed-outline" size={18} color={isDark ? '#A3A3A3' : '#64748B'} />
              )}
            </View>

            {!isFullyUnlocked && (
              <Text style={[styles.unlockInfo, isDark && styles.textSubtleDark]}>
                {unlockDate && !isDateUnlocked
                  ? `Unlocks in ${daysUntilUnlock} day${daysUntilUnlock === 1 ? '' : 's'}`
                  : `Available after ${prerequisiteName} completion`}
              </Text>
            )}
            {isCompleted && result && (
              <Text style={[styles.resultInfo, isDark && styles.textMutedDark]}>
                {result.score} points · {result.percentage.toFixed(0)}% evaluation score
              </Text>
            )}
            {isFullyUnlocked && !isCompleted && <Text style={styles.startText}>Tap to start learning</Text>}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  containerDark: { backgroundColor: '#1A1A1A' },
  content: { padding: 16, paddingBottom: 32 },
  intro: { margin: -16, marginBottom: 16, padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  introDark: { backgroundColor: '#111111', borderBottomColor: 'rgba(255,255,255,0.08)' },
  title: { color: '#1A1A1A', fontSize: 25, fontWeight: '700' },
  subtitle: { marginTop: 5, color: '#64748B', fontSize: 13, lineHeight: 19 },
  moduleCard: { marginBottom: 12, padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  moduleCardDark: { backgroundColor: '#252525', shadowOpacity: 0.25 },
  moduleCardLocked: { opacity: 0.64 },
  moduleCardCompleted: { borderWidth: 1, borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  moduleCardCompletedDark: { borderColor: '#22C55E', backgroundColor: '#153322' },
  moduleTopRow: { flexDirection: 'row', alignItems: 'center' },
  moduleNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 11, backgroundColor: '#E0F2FE' },
  moduleNumberText: { color: '#0369A1', fontSize: 13, fontWeight: '700' },
  moduleHeading: { flex: 1, paddingRight: 8 },
  moduleTitle: { color: '#1A1A1A', fontSize: 16, fontWeight: '700' },
  moduleDescription: { marginTop: 3, color: '#64748B', fontSize: 12, lineHeight: 17 },
  completedResult: { alignItems: 'center', gap: 4 },
  gradeBadge: { minWidth: 31, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: '#15803D' },
  gradeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  completedLabel: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  completedLabelText: { color: '#15803D', fontSize: 10, fontWeight: '700' },
  unlockInfo: { marginTop: 12, paddingLeft: 41, color: '#64748B', fontSize: 12, fontStyle: 'italic' },
  resultInfo: { marginTop: 12, paddingLeft: 41, color: '#475569', fontSize: 12, fontWeight: '600' },
  startText: { marginTop: 12, paddingLeft: 41, color: '#EA580C', fontSize: 12, fontWeight: '700' },
  textLightDark: { color: '#D4D4D4' },
  textMutedDark: { color: '#A3A3A3' },
  textSubtleDark: { color: '#737373' },
})
