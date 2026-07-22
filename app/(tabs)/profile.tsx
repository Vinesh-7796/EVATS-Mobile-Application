import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useUserStore } from '../../src/stores/useUserStore'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { useThemeStore } from '../../src/stores/useThemeStore'

const ROLE_DISPLAY: Record<string, { label: string; icon: string }> = {
  trainee: { label: 'Trainee', icon: '👤' },
  intern: { label: 'Intern', icon: '🎓' },
  admin: { label: 'Admin', icon: '🔐' },
}

export default function ProfileScreen() {
  const router = useRouter()
  const { userName, userId, userRole, clearUserRole } = useUserStore()
  const { totalPoints, completedModules, moduleResults, resetProgress, xp, getCurrentLevel, getNextLevel, getXpProgress } = useProgressStore()
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  const currentLevel = getCurrentLevel()
  const nextLevel = getNextLevel()
  const xpProgress = getXpProgress()
  const roleInfo = userRole ? ROLE_DISPLAY[userRole] : null

  const handleResetProgress = () => {
    Alert.alert(
      'Reset Progress',
      'Are you sure you want to reset all progress and return to login? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetProgress()
            await clearUserRole()
            router.replace('/')
          },
        },
      ]
    )
  }

  const handleGenerateCertificate = () => {
    if (completedModules.length === 0) {
      Alert.alert('No Modules Completed', 'Complete at least one module to generate a certificate.')
      return
    }
    router.push('/certificate')
  }

  const hvResult = moduleResults['hv-power']
  const grade = hvResult ? hvResult.grade : 'N/A'
  const percentile = hvResult ? hvResult.percentage : 0

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.userId}>ID: {userId}</Text>
        {roleInfo && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleInfo.icon} {roleInfo.label}</Text>
          </View>
        )}
        <View style={styles.levelRow}>
          <Text style={styles.levelBadge}>{currentLevel.badge}</Text>
          <Text style={styles.levelText}>{currentLevel.name} — {xp} XP</Text>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
        {nextLevel && (
          <Text style={styles.xpSubtext}>{nextLevel.minXp - xp} XP to {nextLevel.name}</Text>
        )}
      </View>

      <View style={[styles.section, isDark && styles.sectionDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLightDark]}>Statistics</Text>
        
        <View style={[styles.statRow, isDark && styles.statRowDark]}>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Total Points</Text>
          <Text style={[styles.statValue, isDark && styles.textLightDark]}>{totalPoints}</Text>
        </View>

        <View style={[styles.statRow, isDark && styles.statRowDark]}>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Modules Completed</Text>
          <Text style={[styles.statValue, isDark && styles.textLightDark]}>{completedModules.length} / 8</Text>
        </View>

        <View style={[styles.statRow, isDark && styles.statRowDark]}>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Best Grade</Text>
          <Text style={[styles.statValue, isDark && styles.textLightDark]}>{grade}</Text>
        </View>

        <View style={[styles.statRow, isDark && styles.statRowDark]}>
          <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>Best Score</Text>
          <Text style={[styles.statValue, isDark && styles.textLightDark]}>{percentile.toFixed(0)}%</Text>
        </View>
      </View>

      <View style={[styles.section, isDark && styles.sectionDark]}>
        <Text style={[styles.sectionTitle, isDark && styles.textLightDark]}>Actions</Text>
        
        <TouchableOpacity
          style={[styles.button, !completedModules.length && styles.buttonDisabled]}
          onPress={handleGenerateCertificate}
          disabled={!completedModules.length}
        >
          <Text style={styles.buttonText}>📜 Generate Certificate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.buttonSecondary, isDark && styles.buttonSecondaryDark]} onPress={toggleTheme}>
          <Text style={[styles.buttonSecondaryText, isDark && styles.textLightDark]}>
            {isDark ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.buttonSecondary, isDark && styles.buttonSecondaryDark, { marginTop: 12 }]} onPress={handleResetProgress}>
          <Text style={[styles.buttonSecondaryText, isDark && styles.textLightDark, { color: isDark ? '#EF4444' : '#C2410C' }]}>
            🔄 Reset Progress & Re-Login
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, isDark && styles.textMutedDark]}>EVATS Mobile v1.0.0</Text>
        <Text style={[styles.footerText, isDark && styles.textMutedDark]}>Electric Vehicle Advanced Training System</Text>
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
    backgroundColor: '#1a1a1a',
    padding: 32,
    alignItems: 'center',
  },
  headerDark: {
    backgroundColor: '#111111',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#888',
  },
  roleBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  levelBadge: {
    fontSize: 20,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F97316',
  },
  xpBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    width: 160,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 3,
  },
  xpSubtext: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionDark: {
    backgroundColor: '#252525',
    shadowColor: '#000',
    shadowOpacity: 0.4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statRowDark: {
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryDark: {
    backgroundColor: '#333333',
  },
  buttonSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  textLightDark: {
    color: '#d4d4d4',
  },
  textMutedDark: {
    color: '#888888',
  },
})
