import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../lib/supabase'
import { setSyncUserId, syncUserProfile } from '../lib/syncService'

const ROLE_STORAGE_KEY = '@evats_user_role'

function getOAuthCallbackParams(callbackUrl: string): URLSearchParams {
  // Supabase's default implicit OAuth flow returns tokens in the URL fragment.
  // Fall back to the query string so provider errors can be reported too.
  const fragment = callbackUrl.split('#')[1]
  const query = callbackUrl.split('?')[1]
  return new URLSearchParams(fragment ?? query ?? '')
}

export type UserRole = 'trainee' | 'intern' | 'admin'

type AuthStep = 'role_select' | 'sign_in' | 'done'

interface UserState {
  userName: string
  userId: string
  userRole: UserRole | null
  isRoleLoaded: boolean
  email: string
  authStep: AuthStep
  authLoading: boolean
  authError: string | null
  supabaseUserId: string | null
  setUser: (name: string, id: string) => void
  loadUserRole: () => Promise<void>
  setUserRole: (role: UserRole) => Promise<void>
  clearUserRole: () => Promise<void>
  signInWithGoogle: () => Promise<boolean>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
  onAuthStateChanged: (uid: string, email: string | undefined, fullName: string | undefined) => void
}

export const useUserStore = create<UserState>((set, get) => ({
  userName: 'Test User',
  userId: 'EV-001',
  userRole: null,
  isRoleLoaded: false,
  email: '',
  authStep: 'role_select',
  authLoading: false,
  authError: null,
  supabaseUserId: null,

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
    set({ userRole: role, authStep: 'sign_in' })
    try {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role)
      const state = get()
      if (state.supabaseUserId) {
        void syncUserProfile(state.userName, role)
      }
    } catch (error) {
      console.error('Failed to save user role:', error)
    }
  },

  clearUserRole: async () => {
    set({ userRole: null, authStep: 'role_select', email: '', supabaseUserId: null })
    try {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY)
      await supabase.auth.signOut()
      setSyncUserId(null)
    } catch (error) {
      console.error('Failed to clear user role:', error)
    }
  },

  onAuthStateChanged: (uid, email, fullName) => {
    const userName = fullName || email?.split('@')[0] || 'User'
    const userId = uid.slice(0, 8).toUpperCase()
    console.log('[Auth] State changed — user:', userName)
    setSyncUserId(uid)
    set({
      authStep: 'done',
      authLoading: false,
      authError: null,
      supabaseUserId: uid,
      userName,
      userId,
      email: email || '',
    })
    void syncUserProfile(userName, get().userRole ?? 'trainee')
  },

  signInWithGoogle: async () => {
    set({ authLoading: true, authError: null })
    try {
      console.log('[Auth] Starting Google OAuth...')

      const redirectUri = makeRedirectUri({
        scheme: 'evats',
        path: 'auth',
      })
      console.log('[Auth] OAuth redirect URI:', redirectUri)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
        },
      })

      if (error) {
        console.error('[Auth] OAuth error:', error)
        set({ authLoading: false, authError: error.message })
        return false
      }

      if (!data?.url) {
        set({ authLoading: false, authError: 'No auth URL returned' })
        return false
      }

      console.log('[Auth] Opening browser...')
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)

      console.log('[Auth] Browser result:', result.type)
      if (result.type === 'success') {
        const callbackParams = getOAuthCallbackParams(result.url)
        const callbackError = callbackParams.get('error_description') || callbackParams.get('error')
        if (callbackError) {
          set({ authLoading: false, authError: callbackError })
          return false
        }

        const accessToken = callbackParams.get('access_token')
        const refreshToken = callbackParams.get('refresh_token')
        if (!accessToken || !refreshToken) {
          set({ authLoading: false, authError: 'OAuth callback did not contain a session' })
          return false
        }

        // React Native does not process the callback URL automatically because
        // detectSessionInUrl is deliberately false outside the browser.
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) {
          set({ authLoading: false, authError: sessionError.message })
          return false
        }

        if (session?.user) {
          get().onAuthStateChanged(
            session.user.id,
            session.user.email || undefined,
            session.user.user_metadata?.full_name as string | undefined,
          )
          return true
        }
      } else if (result.type !== 'dismiss' && result.type !== 'cancel') {
        set({ authLoading: false, authError: 'Sign-in did not complete' })
        return false
      }

      set({ authLoading: false })
      return false
    } catch (e: any) {
      console.error('[Auth] Exception:', e)
      set({ authLoading: false, authError: e.message || 'Google sign-in failed' })
      return false
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
      setSyncUserId(null)
      set({
        userRole: null,
        authStep: 'role_select',
        email: '',
        supabaseUserId: null,
        userName: 'Test User',
        userId: 'EV-001',
      })
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY)
    } catch (e) {
      console.error('Sign out failed:', e)
    }
  },

  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const uid = session.user.id
        setSyncUserId(uid)
        set({
          supabaseUserId: uid,
          userName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          userId: uid.slice(0, 8).toUpperCase(),
          email: session.user.email || '',
        })
        const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY)
        if (stored === 'trainee' || stored === 'intern' || stored === 'admin') {
          set({ userRole: stored, authStep: 'done' })
        } else {
          set({ authStep: 'role_select' })
        }
      }
    } catch (e) {
      console.warn('Session check failed:', e)
    }
  },
}))
