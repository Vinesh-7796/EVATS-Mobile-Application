import { useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { useThemeStore } from '../../src/stores/useThemeStore'
import { useUserStore } from '../../src/stores/useUserStore'
import { getAllModules, getModulePrerequisite } from '../../src/data/moduleRegistry'
import { isModuleUnlocked } from '../../src/utils/helpers'
import { LearningMap3D } from '../../src/components/ui/LearningMap3D'
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary'

const ROLE_LABEL: Record<string, string> = {
  trainee: 'Trainee',
  intern: 'Intern',
  admin: 'Admin',
}

const CAPABILITIES = [
  {
    icon: 'book-outline' as const,
    title: 'Learn',
    description: 'Explore how eight EV systems work together.',
    color: '#0EA5E9',
  },
  {
    icon: 'game-controller-outline' as const,
    title: 'Practice',
    description: 'Complete four interactive challenges in each module.',
    color: '#F97316',
  },
  {
    icon: 'trophy-outline' as const,
    title: 'Achieve',
    description: 'Build your streak, earn points, and complete the journey.',
    color: '#8B5CF6',
  },
]

export default function HomeScreen() {
  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)
  const [learningMapOffset, setLearningMapOffset] = useState(0)
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const {
    totalPoints,
    currentStreak,
    moduleUnlockDates,
    completedModules,
    isLoaded,
  } = useProgressStore()
  const theme = useThemeStore(state => state.theme)
  const { userName, userRole } = useUserStore()
  const isDark = theme === 'dark'

  const isModulePathUnlocked = (moduleId: string): boolean => {
    if (moduleId === 'hv-power') return true
    const prerequisite = getModulePrerequisite(moduleId)
    return prerequisite ? completedModules.includes(prerequisite) : false
  }

  const isAvailable = (moduleId: string): boolean => {
    const unlockDate = moduleUnlockDates[moduleId]
    return isModulePathUnlocked(moduleId) && (!unlockDate || isModuleUnlocked(unlockDate))
  }

  const modules = getAllModules()
  const unlockedFlowchartIds = modules.filter(module => isAvailable(module.id)).map(module => module.id)
  const nextModule = modules.find(module => isAvailable(module.id) && !completedModules.includes(module.id))
  const modulesCompleted = completedModules.length

  if (!isLoaded) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={isDark ? styles.textDark : undefined}>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}
      scrollEnabled={scrollEnabled}
    >
      <View style={[styles.welcomeSection, isDark && styles.welcomeSectionDark]}>
        <Text style={[styles.eyebrow, isDark && styles.eyebrowDark]}>EVATS TRAINING CONSOLE</Text>
        <Text style={[styles.welcomeTitle, isDark && styles.titleDark]}>Welcome back, {userName}</Text>
        {userRole && <Text style={styles.roleTag}>{ROLE_LABEL[userRole]}</Text>}
      </View>

      <View style={[styles.missionCard, isDark && styles.missionCardDark]}>
        <View style={styles.missionIcon}>
          <Ionicons name="flag-outline" size={24} color="#67E8F9" />
        </View>
        <Text style={styles.missionTitle}>Your EV systems training mission</Text>
        <Text style={styles.missionDescription}>
          Understand the eight connected EV systems, practise through interactive challenges, and complete the learning journey with confidence.
        </Text>
        <View style={styles.goalRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#67E8F9" />
          <Text style={styles.goalText}>Goal: complete all 8 system modules</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
          <Ionicons name="layers-outline" size={20} color="#F97316" />
          <Text style={[styles.statValue, isDark && styles.titleDark]}>{modulesCompleted} / 8</Text>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Modules complete</Text>
        </View>
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
          <Ionicons name="flame-outline" size={20} color="#F97316" />
          <Text style={[styles.statValue, isDark && styles.titleDark]}>{currentStreak}</Text>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Day streak</Text>
        </View>
        <View style={[styles.statCard, isDark && styles.statCardDark]}>
          <Ionicons name="star-outline" size={20} color="#F97316" />
          <Text style={[styles.statValue, isDark && styles.titleDark]}>{totalPoints}</Text>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Points earned</Text>
        </View>
      </View>

      {nextModule ? (
        <TouchableOpacity
          style={[styles.continueCard, isDark && styles.continueCardDark]}
          onPress={() => router.push(`/learn/${nextModule.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Continue with ${nextModule.title}`}
        >
          <View style={styles.continueIcon}>
            <Ionicons name="play" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.continueContent}>
            <Text style={[styles.continueEyebrow, isDark && styles.textMutedDark]}>CONTINUE LEARNING</Text>
            <Text style={[styles.continueTitle, isDark && styles.titleDark]}>{nextModule.title}</Text>
            <Text style={[styles.continueDescription, isDark && styles.textMutedDark]}>{nextModule.shortDescription}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={isDark ? '#D4D4D4' : '#1A1A1A'} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.programmeCompleteCard, isDark && styles.programmeCompleteCardDark]}>
          <Ionicons name="ribbon-outline" size={24} color="#16A34A" />
          <Text style={[styles.programmeCompleteText, isDark && styles.titleDark]}>All available modules are complete.</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.exploreCard}
        onPress={() => scrollViewRef.current?.scrollTo({ y: Math.max(learningMapOffset - 12, 0), animated: true })}
        accessibilityRole="button"
        accessibilityLabel="Explore the bus learning map"
      >
        <View style={styles.exploreIcon}>
          <Ionicons name="bus-outline" size={28} color="#67E8F9" />
        </View>
        <View style={styles.exploreContent}>
          <Text style={styles.exploreTitle}>Explore the bus</Text>
          <Text style={styles.exploreDescription}>Use the interactive 3D map to see how each EV system connects.</Text>
        </View>
        <Ionicons name="arrow-down-circle-outline" size={25} color="#67E8F9" />
      </TouchableOpacity>

      <View style={styles.capabilitySection}>
        <Text style={[styles.sectionTitle, isDark && styles.titleDark]}>What you will do</Text>
        <View style={styles.capabilityList}>
          {CAPABILITIES.map(capability => (
            <View key={capability.title} style={[styles.capabilityCard, isDark && styles.capabilityCardDark]}>
              <View style={[styles.capabilityIcon, { backgroundColor: `${capability.color}1F` }]}>
                <Ionicons name={capability.icon} size={22} color={capability.color} />
              </View>
              <View style={styles.capabilityContent}>
                <Text style={[styles.capabilityTitle, isDark && styles.titleDark]}>{capability.title}</Text>
                <Text style={[styles.capabilityDescription, isDark && styles.textMutedDark]}>{capability.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View
        style={styles.learningMapSection}
        onLayout={event => setLearningMapOffset(event.nativeEvent.layout.y)}
      >
        <Text style={[styles.sectionTitle, isDark && styles.titleDark]}>Learning map</Text>
        <Text style={[styles.mapDescription, isDark && styles.textMutedDark]}>Select an available system in the model to begin learning.</Text>
        <View
          onTouchStart={() => setScrollEnabled(false)}
          onTouchEnd={() => setScrollEnabled(true)}
          onTouchCancel={() => setScrollEnabled(true)}
        >
          <ErrorBoundary fallbackTitle="Learning map failed to load">
            <LearningMap3D
              unlockedModuleIds={unlockedFlowchartIds}
              onSubsystemSelect={flowchartId => router.push(`/learn/${flowchartId}`)}
            />
          </ErrorBoundary>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  containerDark: { backgroundColor: '#1A1A1A' },
  content: { paddingBottom: 32 },
  welcomeSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  welcomeSectionDark: { backgroundColor: '#111111', borderBottomColor: 'rgba(255,255,255,0.08)' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: '#0E7490' },
  eyebrowDark: { color: '#67E8F9' },
  welcomeTitle: { marginTop: 4, fontSize: 25, fontWeight: '700', color: '#1A1A1A' },
  titleDark: { color: '#F8FAFC' },
  roleTag: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(249,115,22,0.12)', color: '#EA580C', fontSize: 11, fontWeight: '700' },
  missionCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: '#0F3B4D' },
  missionCardDark: { backgroundColor: '#0B303E', borderWidth: 1, borderColor: 'rgba(103,232,249,0.2)' },
  missionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(103,232,249,0.15)', marginBottom: 14 },
  missionTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  missionDescription: { color: '#CFFAFE', fontSize: 14, lineHeight: 21 },
  goalRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalText: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, minHeight: 112, padding: 12, borderRadius: 12, justifyContent: 'space-between', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  statCardDark: { backgroundColor: '#252525', shadowOpacity: 0.25 },
  statValue: { marginTop: 8, fontSize: 19, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { marginTop: 3, fontSize: 11, color: '#64748B', lineHeight: 14 },
  continueCard: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FED7AA' },
  continueCardDark: { backgroundColor: '#252525', borderColor: 'rgba(249,115,22,0.35)' },
  continueIcon: { width: 42, height: 42, marginRight: 12, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316' },
  continueContent: { flex: 1 },
  continueEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#64748B' },
  continueTitle: { marginTop: 2, fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  continueDescription: { marginTop: 2, fontSize: 12, color: '#64748B' },
  programmeCompleteCard: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 14, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#F0FDF4' },
  programmeCompleteCardDark: { backgroundColor: '#153322' },
  programmeCompleteText: { flex: 1, color: '#166534', fontSize: 14, fontWeight: '600' },
  exploreCard: { marginHorizontal: 16, padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A' },
  exploreIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(103,232,249,0.12)', marginRight: 12 },
  exploreContent: { flex: 1 },
  exploreTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700' },
  exploreDescription: { marginTop: 3, color: '#BAE6FD', fontSize: 12, lineHeight: 18 },
  capabilitySection: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  capabilityList: { gap: 10 },
  capabilityCard: { minHeight: 78, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  capabilityCardDark: { backgroundColor: '#252525', shadowOpacity: 0.2 },
  capabilityIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  capabilityContent: { flex: 1 },
  capabilityTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  capabilityDescription: { marginTop: 2, fontSize: 12, lineHeight: 17, color: '#64748B' },
  learningMapSection: { paddingHorizontal: 16, paddingTop: 28 },
  mapDescription: { marginTop: -4, marginBottom: 12, fontSize: 13, color: '#64748B' },
  textMutedDark: { color: '#A3A3A3' },
  textDark: { color: '#D4D4D4' },
})
