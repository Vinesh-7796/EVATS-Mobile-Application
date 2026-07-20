import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useRef } from 'react'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { getModuleInfo, getModuleComponents } from '../../src/data/moduleRegistry'
import FlowchartViewer, { FlowchartViewerHandle } from '../../src/components/flowchart/FlowchartViewer'
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary'
import { useThemeStore } from '../../src/stores/useThemeStore'
import type { ComponentDetail } from '../../src/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const DOMAIN_ACCENT_COLORS: Record<string, string> = {
  HV: '#F97316',
  LV: '#2563EB',
  CAN: '#16A34A',
  Thermal: '#0891B2',
  Safety: '#DC2626',
  Control: '#8B5CF6',
  Ground: '#64748B',
  'Hydraulic / Mechanical': '#8B5CF6',
  'Powertrain / Drivetrain': '#F97316',
}

const getAccentColor = (domain?: string) =>
  DOMAIN_ACCENT_COLORS[domain ?? ''] ?? '#F97316'

export default function LearnScreen() {
  const router = useRouter()
  const { moduleId } = useLocalSearchParams()
  const [showVideo, setShowVideo] = useState(false)
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [flowchartHeight, setFlowchartHeight] = useState(380)
  const videoRef = useRef<Video>(null)
  const flowchartRef = useRef<FlowchartViewerHandle>(null)
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  const flowchart = getModuleInfo(moduleId as string)
  const components = getModuleComponents(moduleId as string)

  if (!flowchart) {
    return (
      <View style={[styles.outerContainer, isDark && styles.outerContainerDark, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>Module Not Found</Text>
      </View>
    )
  }

  const handleStartQuiz = () => {
    router.push(`/games/${moduleId}`)
  }

  const handleWatchVideo = () => {
    setShowVideo(true)
  }

  const handleCloseVideo = async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync()
    }
    setShowVideo(false)
  }

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      setShowVideo(false)
    }
  }

  const handleComponentListPress = (component: ComponentDetail) => {
    // Scroll back up to flowchart then trigger highlight + detail modal
    flowchartRef.current?.selectComponent(component.id)
  }

  return (
    <View style={[styles.outerContainer, isDark && styles.outerContainerDark]}>
      {/* Scrollable content: header + flowchart + component list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>{flowchart.title}</Text>
          <Text style={[styles.description, isDark && styles.descriptionDark]}>{flowchart.shortDescription}</Text>
        </View>

        {/* ── Flowchart Viewer (touch handlers lock parent scroll) ─── */}
        <View
          style={[styles.flowchartWrapper, { height: flowchartHeight }]}
          onTouchStart={() => setScrollEnabled(false)}
          onTouchEnd={() => setScrollEnabled(true)}
          onTouchCancel={() => setScrollEnabled(true)}
        >
          <ErrorBoundary fallbackTitle="Flowchart failed to load">
            <FlowchartViewer
              ref={flowchartRef}
              components={components}
              onContentHeight={(h) => setFlowchartHeight(Math.min(h, 500))}
            />
          </ErrorBoundary>
        </View>

        {/* ── Component list ───────────────────────────────────────────── */}
        <View style={[styles.componentListSection, isDark && styles.componentListSectionDark]}>
          <View style={styles.componentListHeader}>
            <View style={[styles.componentListHeaderAccent, isDark && styles.componentListHeaderAccentDark]} />
            <Text style={[styles.componentListTitle, isDark && styles.textLight]}>
              Components
            </Text>
            <Text style={[styles.componentListSubtitle, isDark && styles.textMuted]}>
              Tap to highlight on diagram
            </Text>
          </View>

          {components.map((component, index) => {
            const accent = getAccentColor(component.domain)
            return (
              <TouchableOpacity
                key={component.id}
                style={[
                  styles.componentRow,
                  isDark && styles.componentRowDark,
                  index === 0 && styles.componentRowFirst,
                  index === components.length - 1 && styles.componentRowLast,
                ]}
                onPress={() => handleComponentListPress(component)}
                activeOpacity={0.72}
              >
                {/* Color accent left bar */}
                <View style={[styles.componentRowAccentBar, { backgroundColor: accent }]} />

                {/* Index badge */}
                <View style={[styles.componentIndexBadge, { borderColor: accent, backgroundColor: accent + '18' }]}>
                  <Text style={[styles.componentIndexText, { color: accent }]}>{index + 1}</Text>
                </View>

                {/* Name + domain */}
                <View style={styles.componentRowBody}>
                  <Text style={[styles.componentRowName, isDark && styles.textLight]} numberOfLines={1}>
                    {component.name}
                  </Text>
                  <View style={[styles.domainChip, { backgroundColor: accent + '18' }]}>
                    <Text style={[styles.domainChipText, { color: accent }]}>{component.domain}</Text>
                  </View>
                </View>

                {/* Chevron */}
                <Text style={[styles.componentRowChevron, isDark && styles.textMuted]}>›</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Bottom padding so last item isn't hidden behind the fixed footer */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Fixed footer: legend bar + action buttons ─────────────────── */}
      <View style={[styles.footer, isDark && styles.footerDark]}>
        {/* Wire colour legend */}
        <View style={[styles.legendBar, isDark && styles.legendBarDark]}>
          <View style={styles.legendRow}>
            <View style={[styles.legendLine, { backgroundColor: '#F97316' }]} />
            <Text style={[styles.legendLabel, isDark && styles.textMuted]}>HV DC Cable</Text>
            <View style={[styles.legendLine, { backgroundColor: '#2563EB', marginLeft: 16 }]} />
            <Text style={[styles.legendLabel, isDark && styles.textMuted]}>HV AC Cable</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.videoButton} onPress={handleWatchVideo}>
            <Text style={styles.videoButtonText}>▶ Watch Training Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quizButton} onPress={handleStartQuiz}>
            <Text style={styles.quizButtonText}>Mini-Games →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Video Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={showVideo}
        animationType="slide"
        onRequestClose={handleCloseVideo}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.videoModal}>
          <View style={styles.videoHeader}>
            <Text style={styles.videoTitle}>{flowchart.title} — Training</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseVideo}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.videoContainer}>
            {flowchart.id === 'hv-power' ? (
              <Video
                ref={videoRef}
                source={require('../../assets/videos/HV.mp4')}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              />
            ) : (
              <View style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
                  Video training for this module is currently in development.
                </Text>
              </View>
            )}
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoDescription}>
              Watch this training video to understand the HV Power System architecture, components, and their functions.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────────
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  outerContainerDark: {
    backgroundColor: '#141414',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 4,
  },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerDark: {
    backgroundColor: '#0f0f0f',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  titleDark: {
    color: '#fff',
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  descriptionDark: {
    color: '#888',
  },

  // ── Flowchart wrapper ────────────────────────────────────────────────
  flowchartWrapper: {
    // height is set dynamically via inline style; this is just a layout placeholder
    height: 380,
    overflow: 'hidden',
  },

  // ── Component list section ───────────────────────────────────────────
  componentListSection: {
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8ECF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  componentListSectionDark: {
    backgroundColor: '#1e1e1e',
    borderColor: 'rgba(255,255,255,0.07)',
  },
  componentListHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  componentListHeaderAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  componentListHeaderAccentDark: {
    backgroundColor: '#F97316',
  },
  componentListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    flex: 1,
  },
  componentListSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // ── Each component row ───────────────────────────────────────────────
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF0F5',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  componentRowDark: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  componentRowFirst: {
    // no top border needed, header provides separation
  },
  componentRowLast: {
    borderBottomWidth: 0,
  },
  componentRowAccentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    minHeight: 36,
    marginLeft: 0,
  },
  componentIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  componentIndexText: {
    fontSize: 11,
    fontWeight: '800',
  },
  componentRowBody: {
    flex: 1,
    gap: 3,
  },
  componentRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: -0.1,
  },
  domainChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  domainChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  componentRowChevron: {
    fontSize: 22,
    color: '#CBD5E1',
    fontWeight: '300',
    marginTop: -2,
  },

  // ── Fixed footer ─────────────────────────────────────────────────────
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerDark: {
    backgroundColor: '#1e1e1e',
    borderTopColor: 'rgba(255,255,255,0.08)',
  },

  // ── Legend bar ───────────────────────────────────────────────────────
  legendBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF0F5',
  },
  legendBarDark: {
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLine: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // ── Action buttons ───────────────────────────────────────────────────
  actionsBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  videoButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  quizButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  quizButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Shared text tokens ───────────────────────────────────────────────
  textLight: { color: '#E2E8F0' },
  textMuted: { color: '#888' },

  // ── Video modal ──────────────────────────────────────────────────────
  videoModal: { flex: 1, backgroundColor: '#000' },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1a1a1a',
  },
  videoTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  closeButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeButtonText: { fontSize: 20, color: '#fff' },
  videoContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000',
  },
  video: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * (9 / 16) },
  videoInfo: { padding: 16, backgroundColor: '#1a1a1a' },
  videoDescription: { fontSize: 14, color: '#aaa', lineHeight: 20 },
})
