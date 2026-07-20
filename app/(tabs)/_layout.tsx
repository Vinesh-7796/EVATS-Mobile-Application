import { Tabs } from 'expo-router'
import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeStore } from '../../src/stores/useThemeStore'
import { useProgressStore } from '../../src/stores/useProgressStore'

export default function TabLayout() {
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'
  const { totalPoints, currentStreak } = useProgressStore()

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
        },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: isDark ? '#888888' : '#64748B',
        headerStyle: {
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        },
        headerTintColor: isDark ? '#d4d4d4' : '#1A1A1A',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Home tab',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={16} color="#F97316" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#ffffff' : '#1A1A1A' }}>
                  {totalPoints}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="flame" size={16} color="#F97316" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#ffffff' : '#1A1A1A' }}>
                  {currentStreak}
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Progress tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
    </Tabs>
  )
}
