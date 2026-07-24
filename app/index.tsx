import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Animated, StatusBar } from 'react-native'
import { useRouter } from 'expo-router'
import { useUserStore } from '../src/stores/useUserStore'

export default function WelcomeScreen() {
  const router = useRouter()
  const { userRole, authStep } = useUserStore()
  const flashAnim = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    if (userRole && authStep === 'done') {
      router.replace('/(tabs)/home')
    }
  }, [authStep, router, userRole])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 675, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0.45, duration: 675, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [flashAnim])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>EVATS</Text>
        <Text style={styles.title}>EVATS Technical Training Module</Text>
        <Text style={styles.description}>
          Electric vehicle architecture, systems, and safety training.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
          onPress={() => router.push('/role-selection')}
        >
          <Animated.Text style={[styles.continueLabel, { opacity: flashAnim }]}>
            CLICK TO CONTINUE
          </Animated.Text>
        </Pressable>
      </View>

      <Text style={styles.copyright}>© 2026 SWITCH Mobility Automotive Ltd.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  eyebrow: { fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '600', letterSpacing: 4, color: '#67e8f9', marginBottom: 20, textAlign: 'center' },
  title: { fontFamily: 'SpaceMono', fontSize: 30, fontWeight: '700', color: '#f8fafc', textAlign: 'center', lineHeight: 39, marginBottom: 16 },
  description: { fontFamily: 'SpaceMono', fontSize: 13, color: '#9debf4', lineHeight: 21, textAlign: 'center', marginBottom: 42 },
  continueButton: { borderWidth: 1, borderColor: '#00E5FF', borderRadius: 10, paddingVertical: 17, paddingHorizontal: 26, backgroundColor: 'rgba(0, 229, 255, 0.08)' },
  continueButtonPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  continueLabel: { fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '700', letterSpacing: 1.6, color: '#67e8f9' },
  copyright: { fontFamily: 'SpaceMono', fontSize: 10, color: 'rgba(248, 250, 252, 0.35)', textAlign: 'center', paddingHorizontal: 24, paddingBottom: 28 },
})
