import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeStore } from '../../stores/useThemeStore'

/** A shared header action for screens rendered outside the tab navigator. */
export function ThemeToggleButton() {
  const theme = useThemeStore(state => state.theme)
  const toggleTheme = useThemeStore(state => state.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <Pressable
      onPress={() => void toggleTheme()}
      style={({ pressed }) => [
        styles.button,
        isDark ? styles.buttonDark : styles.buttonLight,
        pressed && styles.buttonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      hitSlop={8}
    >
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={isDark ? '#FCD34D' : '#334155'} />
    </Pressable>
  )
}

/** Applies the shared right inset used by navigator headers. */
export function HeaderThemeToggle() {
  return (
    <View style={styles.headerInset}>
      <ThemeToggleButton />
    </View>
  )
}

const styles = StyleSheet.create({
  // This element stays margin-free. HeaderThemeToggle owns navigator spacing,
  // while custom headers can place it in their own action group.
  button: {
    width: 42,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderColor: 'rgba(148, 163, 184, 0.42)',
    shadowColor: '#64748B',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonDark: {
    backgroundColor: 'rgba(71, 85, 105, 0.46)',
    borderColor: 'rgba(226, 232, 240, 0.34)',
    shadowColor: '#000000',
    shadowOpacity: 0.38,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  buttonPressed: { opacity: 0.76, transform: [{ scale: 0.94 }] },
  headerInset: { marginRight: 16 },
})
