import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { useThemeStore } from '../../src/stores/useThemeStore'
import { getAllModules, getModulePrerequisite, getModuleInfo } from '../../src/data/moduleRegistry'
import { isModuleUnlocked, getDaysUntilUnlock } from '../../src/utils/helpers'
import { LearningMap3D } from '../../src/components/ui/LearningMap3D'
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary'

export default function HomeScreen() {
  const router = useRouter()
  const { totalPoints, currentStreak, moduleUnlockDates, completedModules, isLoaded } = useProgressStore()
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'
  const [scrollEnabled, setScrollEnabled] = useState(true)

  const isModulePathUnlocked = (moduleId: string): boolean => {
    if (moduleId === 'hv-power') return true
    const prereq = getModulePrerequisite(moduleId)
    if (!prereq) return false
    return completedModules.includes(prereq)
  }

  const unlockedFlowchartIds = getAllModules()
    .filter(m => {
      const isPathUnlocked = isModulePathUnlocked(m.id)
      const unlockDate = moduleUnlockDates[m.id]
      const isDateUnlocked = unlockDate ? isModuleUnlocked(unlockDate) : true
      return isPathUnlocked && isDateUnlocked
    })
    .map(m => m.id)

  if (!isLoaded) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={isDark ? styles.textDark : undefined}>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} scrollEnabled={scrollEnabled}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.title, isDark && styles.titleDark]}>EVATS</Text>
        <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Electric Vehicle Advanced Training System</Text>
      </View>

      <View style={styles.learningMapSection}>
        <Text style={[styles.sectionTitle, isDark && styles.textLightDark]}>Learning Map</Text>
        <View
          onTouchStart={() => setScrollEnabled(false)}
          onTouchEnd={() => setScrollEnabled(true)}
          onTouchCancel={() => setScrollEnabled(true)}
        >
          <ErrorBoundary fallbackTitle="Learning map failed to load">
            <LearningMap3D
              unlockedModuleIds={unlockedFlowchartIds}
              onSubsystemSelect={(flowchartId) => {
                router.push(`/learn/${flowchartId}`)
              }}
            />
          </ErrorBoundary>
        </View>
      </View>

      <View style={styles.modulesSection}>
        <Text style={[styles.sectionTitle, isDark && styles.textLightDark]}>Available Modules</Text>
        
        {getAllModules().map((module) => {
          const modId = module.id
          const isPathUnlocked = isModulePathUnlocked(modId)
          const unlockDate = moduleUnlockDates[modId]
          const isDateUnlocked = unlockDate ? isModuleUnlocked(unlockDate) : true
          const isFullyUnlocked = isPathUnlocked && isDateUnlocked
          const isCompleted = completedModules.includes(modId)
          const daysUntilUnlock = unlockDate ? getDaysUntilUnlock(unlockDate) : 0
          const prereq = getModulePrerequisite(modId)
          const prereqName = prereq ? getModuleInfo(prereq)?.title ?? '' : ''

          return (
            <TouchableOpacity
              key={modId}
              style={[
                styles.moduleCard,
                isDark && styles.moduleCardDark,
                !isFullyUnlocked && styles.moduleCardLocked,
                isCompleted && styles.moduleCardCompleted,
              ]}
              onPress={() => isFullyUnlocked && router.push(`/learn/${modId}`)}
              disabled={!isFullyUnlocked}
            >
              <View style={styles.moduleHeader}>
                <Text style={[styles.moduleTitle, isDark && styles.textLightDark]}>{module.title}</Text>
                {isCompleted && <Text style={styles.badge}>✓ Completed</Text>}
                {!isFullyUnlocked && <Text style={styles.badgeLocked}>🔒 Locked</Text>}
              </View>
              <Text style={[styles.moduleDescription, isDark && styles.textMutedDark]}>
                {module.shortDescription}
              </Text>
              {!isFullyUnlocked && (
                <Text style={[styles.unlockInfo, isDark && styles.textSubtleDark]}>
                  {unlockDate && !isDateUnlocked 
                    ? `Unlocks in ${daysUntilUnlock} day${daysUntilUnlock !== 1 ? 's' : ''}`
                    : `Available after ${prereqName} completion`}
                </Text>
              )}
              {isFullyUnlocked && !isCompleted && (
                <Text style={styles.actionText}>Tap to start learning</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerDark: {
    backgroundColor: '#111111',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  subtitleDark: {
    color: '#888',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBoxDark: {
    backgroundColor: '#252525',
    shadowColor: '#000',
    shadowOpacity: 0.4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  learningMapSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modulesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  moduleCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moduleCardDark: {
    backgroundColor: '#252525',
    shadowColor: '#000',
    shadowOpacity: 0.4,
  },
  moduleCardLocked: {
    opacity: 0.6,
  },
  moduleCardCompleted: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  badge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeLocked: {
    backgroundColor: '#999',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  unlockInfo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  textLightDark: {
    color: '#d4d4d4',
  },
  textMutedDark: {
    color: '#888888',
  },
  textSubtleDark: {
    color: '#666666',
  },
  textDark: {
    color: '#d4d4d4',
  },
})
