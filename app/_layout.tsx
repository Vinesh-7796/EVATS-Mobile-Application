import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as WebBrowser from 'expo-web-browser'
import { useProgressStore } from '../src/stores/useProgressStore'
import { useThemeStore } from '../src/stores/useThemeStore'
import { useUserStore } from '../src/stores/useUserStore'
import { supabase } from '../src/lib/supabase'
import { HeaderThemeToggle } from '../src/components/ui/ThemeToggleButton'

WebBrowser.maybeCompleteAuthSession()

export default function RootLayout() {
  const loadProgress = useProgressStore(state => state.loadProgress)
  const { theme, loadTheme } = useThemeStore()
  const { loadUserRole, checkSession, onAuthStateChanged } = useUserStore()

  useEffect(() => {
    loadProgress()
    loadTheme()
    loadUserRole()
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        onAuthStateChanged(
          session.user.id,
          session.user.email || undefined,
          session.user.user_metadata?.full_name as string | undefined,
        )
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const isDark = theme === 'dark'

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          },
          headerTintColor: isDark ? '#d4d4d4' : '#1A1A1A',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => <HeaderThemeToggle />,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="role-selection" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="learn/[moduleId]" options={{ title: 'Learn' }} />
        <Stack.Screen name="games/[moduleId]" options={{ title: 'Mini-Games' }} />
        <Stack.Screen name="quiz/[moduleId]" options={{ title: 'Quiz', headerBackVisible: false }} />
        <Stack.Screen name="results" options={{ title: 'Results', headerBackVisible: false }} />
        <Stack.Screen name="certificate" options={{ title: 'Certificate' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
