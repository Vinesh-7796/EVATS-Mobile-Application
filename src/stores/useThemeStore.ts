import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const THEME_STORAGE_KEY = '@evats_theme'

interface ThemeState {
  theme: 'light' | 'dark'
  isThemeLoaded: boolean
  loadTheme: () => Promise<void>
  toggleTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark', // default to dark theme as requested by dark mode version match
  isThemeLoaded: false,

  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') {
        set({ theme: stored, isThemeLoaded: true })
      } else {
        set({ theme: 'dark', isThemeLoaded: true })
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
      set({ theme: 'dark', isThemeLoaded: true })
    }
  },

  toggleTheme: async () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light'
    set({ theme: nextTheme })
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  },
}))
