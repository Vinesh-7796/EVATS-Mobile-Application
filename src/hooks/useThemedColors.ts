import { useThemeStore } from '../stores/useThemeStore'

/**
 * Centralized color tokens resolved by current theme.
 * Replace scattered `isDark ? '#...' : '#...'` ternaries across screens.
 *
 * Usage:
 *   const colors = useThemedColors()
 *   <View style={{ backgroundColor: colors.bg }}>
 */
export function useThemedColors() {
  const theme = useThemeStore(s => s.theme)
  const isDark = theme === 'dark'

  return {
    isDark,

    // ── Backgrounds ──────────────────────────────────────────
    bg: isDark ? '#1a1a1a' : '#f5f5f5',
    surface: isDark ? '#252525' : '#ffffff',
    surfaceElevated: isDark ? '#2a2a2a' : '#ffffff',
    header: isDark ? '#111111' : '#ffffff',
    headerHero: isDark ? '#111111' : '#1a1a1a',

    // ── Text ─────────────────────────────────────────────────
    textPrimary: isDark ? '#d4d4d4' : '#1a1a1a',
    textSecondary: isDark ? '#888888' : '#666',
    textMuted: isDark ? '#666666' : '#999',
    textOnDark: '#ffffff',
    textOnAccent: '#ffffff',

    // ── Brand / Accent ───────────────────────────────────────
    accent: '#FF6B35',
    accentLight: isDark ? '#F9731618' : '#FFF3E0',
    success: '#4CAF50',
    successBg: isDark ? '#1b3a24' : '#E8F5E9',
    danger: '#F44336',
    dangerBg: isDark ? '#4a1515' : '#FFEBEE',
    warning: '#FFC107',
    warningBg: isDark ? '#252525' : '#FFF3E0',

    // ── Borders ──────────────────────────────────────────────
    border: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    borderSubtle: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0',
    borderStrong: isDark ? 'rgba(255,255,255,0.15)' : '#d0d0d0',

    // ── Shadows ──────────────────────────────────────────────
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.4 : 0.1,
  } as const
}

export type ThemedColors = ReturnType<typeof useThemedColors>
