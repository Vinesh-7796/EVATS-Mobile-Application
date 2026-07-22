import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Animated, StatusBar } from 'react-native'
import { useRouter } from 'expo-router'
import { useUserStore, type UserRole } from '../src/stores/useUserStore'

const ROLE_CONFIG: { role: UserRole; label: string; icon: string; color: string; colorRgb: string }[] = [
  { role: 'trainee', label: 'Trainees', icon: '👤', color: '#00E5FF', colorRgb: '0, 229, 255' },
  { role: 'intern', label: 'Interns', icon: '🎓', color: '#F97316', colorRgb: '249, 115, 22' },
  { role: 'admin', label: 'Admin', icon: '🔐', color: '#8B5CF6', colorRgb: '139, 92, 246' },
]

export default function LoginScreen() {
  const router = useRouter()
  const { userRole, setUserRole } = useUserStore()
  const flashAnim = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    if (userRole) {
      router.replace('/(tabs)/home')
    }
  }, [userRole])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 675, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0.45, duration: 675, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  const handleSelectRole = async (role: UserRole) => {
    await setUserRole(role)
    router.replace('/(tabs)/home')
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>TECHNICAL TRAINING CONSOLE</Text>
        <Text style={styles.title}>
          Electric Vehicle{'\n'}Architecture Training{'\n'}System
        </Text>
        <Animated.Text style={[styles.prompt, { opacity: flashAnim }]}>
          SELECT YOUR ROLE TO CONTINUE
        </Animated.Text>

        <View style={styles.buttonGroup}>
          {ROLE_CONFIG.map(({ role, label, icon, color, colorRgb }) => (
            <Pressable
              key={role}
              style={({ pressed }) => [
                styles.roleButton,
                {
                  borderColor: color,
                  backgroundColor: `rgba(${colorRgb}, 0.08)`,
                },
                pressed && styles.roleButtonPressed,
              ]}
              onPress={() => handleSelectRole(role)}
            >
              <Text style={styles.roleIcon}>{icon}</Text>
              <Text style={[styles.roleLabel, { color }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.copyright}>
        © 2026 SWITCH Mobility Automotive Ltd.{'\n'}PROPRIETARY AND CONFIDENTIAL | INTERNAL USE ONLY.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  eyebrow: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#67e8f9',
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontFamily: 'SpaceMono',
    fontSize: 30,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 28,
  },
  prompt: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#9debf4',
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: 14,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  roleButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  roleIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  roleLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  copyright: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: 'rgba(248, 250, 252, 0.35)',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
})
