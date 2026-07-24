import { useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, StatusBar, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useUserStore } from '../src/stores/useUserStore'

export default function SignInScreen() {
  const router = useRouter()
  const { userRole, authStep, authLoading, authError, signInWithGoogle, clearUserRole } = useUserStore()

  useEffect(() => {
    if (authStep === 'done' && userRole) {
      router.replace('/(tabs)/home')
    } else if (!userRole || authStep === 'role_select') {
      router.replace('/')
    }
  }, [authStep, router, userRole])

  const handleChooseDifferentRole = async () => {
    await clearUserRole()
    router.replace('/')
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>TECHNICAL TRAINING CONSOLE</Text>
        <Text style={styles.title}>Almost there</Text>
        <Text style={styles.description}>
          Sign in with your Google account to continue as {userRole}.
        </Text>

        {authError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
            authLoading && styles.googleButtonDisabled,
          ]}
          onPress={signInWithGoogle}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={handleChooseDifferentRole} disabled={authLoading}>
          <Text style={styles.changeRole}>Choose a different role</Text>
        </Pressable>
      </View>

      <Text style={styles.copyright}>
        © 2026 SWITCH Mobility Automotive Ltd.{'\n'}PROPRIETARY AND CONFIDENTIAL | INTERNAL USE ONLY.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  eyebrow: { fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '600', letterSpacing: 3, color: '#67e8f9', marginBottom: 20, textAlign: 'center' },
  title: { fontFamily: 'SpaceMono', fontSize: 30, fontWeight: '700', color: '#f8fafc', textAlign: 'center', marginBottom: 16 },
  description: { fontFamily: 'SpaceMono', fontSize: 13, color: '#9debf4', lineHeight: 21, textAlign: 'center', marginBottom: 32 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)', borderRadius: 10, padding: 12, marginBottom: 20, width: '100%' },
  errorText: { fontFamily: 'SpaceMono', fontSize: 12, color: '#fca5a5', textAlign: 'center' },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', borderRadius: 10, paddingVertical: 16, paddingHorizontal: 24, width: '100%', gap: 12 },
  googleButtonPressed: { opacity: 0.8 },
  googleButtonDisabled: { opacity: 0.5 },
  googleIcon: { fontSize: 20, fontWeight: '700', backgroundColor: '#fff', color: '#4285F4', width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, overflow: 'hidden' },
  googleButtonText: { fontFamily: 'SpaceMono', fontSize: 15, fontWeight: '700', color: '#fff' },
  changeRole: { fontFamily: 'SpaceMono', fontSize: 12, color: '#9debf4', marginTop: 24, textDecorationLine: 'underline' },
  copyright: { fontFamily: 'SpaceMono', fontSize: 10, color: 'rgba(248, 250, 252, 0.35)', textAlign: 'center', lineHeight: 15, paddingHorizontal: 24, paddingBottom: 28 },
})
