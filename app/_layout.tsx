import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useProgressStore } from '../src/stores/useProgressStore'
import { useThemeStore } from '../src/stores/useThemeStore'

export default function RootLayout() {
  const loadProgress = useProgressStore(state => state.loadProgress)
  const { theme, loadTheme, isThemeLoaded } = useThemeStore()

  useEffect(() => {
    loadProgress()
    loadTheme()
  }, [])

  if (!isThemeLoaded) {
    return null // Wait for theme settings to load
  }

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
        }}
      >
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
