import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ROLE_STORAGE_KEY = '@evats_user_role'

export type UserRole = 'trainee' | 'intern' | 'admin'

interface UserState {
  userName: string
  userId: string
  userRole: UserRole | null
  isRoleLoaded: boolean
  setUser: (name: string, id: string) => void
  loadUserRole: () => Promise<void>
  setUserRole: (role: UserRole) => Promise<void>
  clearUserRole: () => Promise<void>
}

export const useUserStore = create<UserState>((set, get) => ({
  userName: 'Test User',
  userId: 'EV-001',
  userRole: null,
  isRoleLoaded: false,

  setUser: (name: string, id: string) => set({ userName: name, userId: id }),

  loadUserRole: async () => {
    try {
      const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY)
      if (stored === 'trainee' || stored === 'intern' || stored === 'admin') {
        set({ userRole: stored, isRoleLoaded: true })
      } else {
        set({ userRole: null, isRoleLoaded: true })
      }
    } catch (error) {
      console.error('Failed to load user role:', error)
      set({ userRole: null, isRoleLoaded: true })
    }
  },

  setUserRole: async (role: UserRole) => {
    set({ userRole: role })
    try {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role)
    } catch (error) {
      console.error('Failed to save user role:', error)
    }
  },

  clearUserRole: async () => {
    set({ userRole: null })
    try {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear user role:', error)
    }
  },
}))
