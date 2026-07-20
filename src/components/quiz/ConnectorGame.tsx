import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native'
import type { ConnectorQuestion } from '../../types'
import { useThemeStore } from '../../stores/useThemeStore'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface ConnectorGameProps {
  question: ConnectorQuestion
  onComplete: (isCorrect: boolean) => void
  showFeedback: boolean
}

/**
 * PathFlowConnector — refactored ConnectorGame
 *
 * The question's `components` represent the correct linear sequence.
 * We display N empty slots connected by arrows (the "path-flow"), and a
 * shuffled bank of chip labels at the bottom.
 *
 * Interaction:
 *   1. Tap a chip in the bank to select it (highlights orange).
 *   2. Tap an empty slot to place the selected chip there.
 *   3. Tapping an occupied slot removes the chip back to the bank.
 *   4. Tapping a selected chip in the bank deselects it.
 *
 * Scoring: all slots must match the correct sequence for a full pass.
 */
export default function ConnectorGame({ question, onComplete, showFeedback }: ConnectorGameProps) {
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  // The correct answer order derived directly from `connections`
  // connections is [{from: A, to: B}, {from: B, to: C}, ...]
  // so the ordered list is [A, B, C, D, ...]
  const correctSequence: string[] = React.useMemo(() => {
    if (!question.connections || question.connections.length === 0) return question.components
    const seq = [question.connections[0].from]
    for (const conn of question.connections) {
      seq.push(conn.to)
    }
    return seq
  }, [question])

  const slotCount = correctSequence.length

  // Slot state: array of (component name | null)
  const [slots, setSlots] = useState<(string | null)[]>(Array(slotCount).fill(null))

  // Currently selected chip from the bank (name)
  const [selectedChip, setSelectedChip] = useState<string | null>(null)

  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  // Shuffled bank (all components, minus those placed in slots)
  const [shuffledBank] = useState<string[]>(() => {
    const arr = [...question.components]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    if (arr.every((v, i) => v === question.components[i]) && arr.length > 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]]
    }
    return arr
  })

  // Which chips are currently placed in a slot
  const placedChips = slots.filter(Boolean) as string[]
  const availableChips = shuffledBank.filter(c => !placedChips.includes(c))

  // ─── Interaction handlers ──────────────────────────────────────────────────

  const handleChipPress = (chip: string) => {
    if (submitted || showFeedback) return
    setSelectedChip(prev => (prev === chip ? null : chip))
  }

  const handleSlotPress = (slotIndex: number) => {
    if (submitted || showFeedback) return

    const currentOccupant = slots[slotIndex]

    if (currentOccupant) {
      // Slot is occupied — remove chip back to bank and deselect
      setSlots(prev => {
        const next = [...prev]
        next[slotIndex] = null
        return next
      })
      setSelectedChip(null)
      return
    }

    if (!selectedChip) return // nothing selected and slot is empty — ignore

    // Place the selected chip into this slot
    setSlots(prev => {
      const next = [...prev]
      next[slotIndex] = selectedChip
      return next
    })
    setSelectedChip(null)
  }

  const handleSubmit = () => {
    const correct = slots.every((chip, i) => chip === correctSequence[i])
    setIsCorrect(correct)
    setSubmitted(true)
    onComplete(correct)
  }

  const allFilled = slots.every(s => s !== null)
  const filledCount = slots.filter(Boolean).length

  // ─── Slot feedback helpers ─────────────────────────────────────────────────

  const slotStatus = (slotIndex: number): 'correct' | 'wrong' | 'filled' | 'empty' => {
    const chip = slots[slotIndex]
    if (!chip) return 'empty'
    if (!submitted) return 'filled'
    return chip === correctSequence[slotIndex] ? 'correct' : 'wrong'
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Instruction bar ── */}
      <View style={[
        styles.instructionBar,
        isDark && styles.instructionBarDark,
        submitted && isCorrect && styles.instructionBarSuccess,
        submitted && !isCorrect && styles.instructionBarError,
        isDark && submitted && isCorrect && styles.instructionBarSuccessDark,
        isDark && submitted && !isCorrect && styles.instructionBarErrorDark,
      ]}>
        <Text style={[
          styles.instructionText,
          isDark && styles.instructionTextDark,
          submitted && isCorrect && { color: '#10B981' },
          submitted && !isCorrect && { color: '#EF4444' },
        ]}>
          {submitted
            ? isCorrect
              ? '✓ Correct sequence!'
              : '✗ Some positions are wrong. See the correct answer below.'
            : selectedChip
            ? `"${selectedChip}" selected — tap a slot to place it`
            : `Fill the path in order  (${filledCount}/${slotCount} placed)`}
        </Text>
      </View>

      {/* ── Path flow ── */}
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flowContainer}
      >
        {correctSequence.map((_, index) => {
          const status = slotStatus(index)
          const chip = slots[index]
          const isLast = index === slotCount - 1

          return (
            <View key={index} style={styles.flowStep}>
              {/* Step number badge */}
              <View style={[styles.stepBadge, isDark && styles.stepBadgeDark]}>
                <Text style={[styles.stepBadgeText, isDark && styles.stepBadgeTextDark]}>
                  {index + 1}
                </Text>
              </View>

              {/* Slot box */}
              <TouchableOpacity
                activeOpacity={submitted ? 1 : 0.7}
                onPress={() => handleSlotPress(index)}
                disabled={submitted || showFeedback}
                style={[
                  styles.slot,
                  isDark && styles.slotDark,
                  chip && styles.slotFilled,
                  isDark && chip && styles.slotFilledDark,
                  status === 'correct' && styles.slotCorrect,
                  isDark && status === 'correct' && styles.slotCorrectDark,
                  status === 'wrong' && styles.slotWrong,
                  isDark && status === 'wrong' && styles.slotWrongDark,
                  // Highlight if a chip is selected and this slot is empty
                  !submitted && selectedChip && !chip && styles.slotHighlight,
                  isDark && !submitted && selectedChip && !chip && styles.slotHighlightDark,
                ]}
              >
                {chip ? (
                  <View style={styles.slotChipRow}>
                    <Text
                      style={[
                        styles.slotChipText,
                        isDark && styles.slotChipTextDark,
                        status === 'correct' && styles.slotCorrectText,
                        status === 'wrong' && styles.slotWrongText,
                      ]}
                      numberOfLines={2}
                    >
                      {chip}
                    </Text>
                    {submitted && (
                      <Text style={[
                        styles.slotStatusIcon,
                        status === 'correct' ? styles.iconCorrect : styles.iconWrong
                      ]}>
                        {status === 'correct' ? '✓' : '✗'}
                      </Text>
                    )}
                    {!submitted && (
                      <Text style={styles.removeDot}>✕</Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.emptySlotLabel, isDark && styles.emptySlotLabelDark]}>
                    {selectedChip ? 'Tap to place' : `Step ${index + 1}`}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Arrow connector (not after last) */}
              {!isLast && (
                <View style={styles.arrowContainer}>
                  <View style={[styles.arrowLine, isDark && styles.arrowLineDark]} />
                  <Text style={[styles.arrowHead, isDark && styles.arrowHeadDark]}>▼</Text>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* ── Correct answer panel (shown on wrong submission) ── */}
      {submitted && !isCorrect && (
        <View style={[styles.correctAnswerPanel, isDark && styles.correctAnswerPanelDark]}>
          <Text style={styles.correctAnswerTitle}>✓ Correct Order:</Text>
          {correctSequence.map((name, i) => (
            <Text key={i} style={[styles.correctAnswerItem, isDark && styles.correctAnswerItemDark]}>
              {i + 1}. {name}
            </Text>
          ))}
        </View>
      )}

      {/* ── Chip bank ── */}
      {!submitted && !showFeedback && (
        <View style={[styles.chipBank, isDark && styles.chipBankDark]}>
          <Text style={[styles.chipBankLabel, isDark && styles.chipBankLabelDark]}>
            Component Bank
          </Text>
          <View style={styles.chipRow}>
            {availableChips.length === 0 ? (
              <Text style={[styles.bankEmpty, isDark && styles.bankEmptyDark]}>
                All components placed ✓
              </Text>
            ) : (
              availableChips.map(chip => {
                const isSelected = selectedChip === chip
                return (
                  <TouchableOpacity
                    key={chip}
                    activeOpacity={0.75}
                    onPress={() => handleChipPress(chip)}
                    style={[
                      styles.chip,
                      isDark && styles.chipDark,
                      isSelected && styles.chipSelected,
                      isDark && isSelected && styles.chipSelectedDark,
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      isDark && styles.chipTextDark,
                      isSelected && styles.chipTextSelected,
                    ]}
                      numberOfLines={2}
                    >
                      {chip}
                    </Text>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </View>
      )}

      {/* ── Submit / result button ── */}
      {!submitted && !showFeedback && (
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!allFilled) && styles.submitBtnDisabled,
            isDark && styles.submitBtnDark,
            isDark && !allFilled && styles.submitBtnDisabledDark,
          ]}
          onPress={handleSubmit}
          disabled={!allFilled}
        >
          <Text style={[styles.submitBtnText, !allFilled && styles.submitBtnTextDisabled]}>
            {allFilled ? 'Check Answer' : `Fill all slots  (${filledCount}/${slotCount})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const SLOT_WIDTH = Math.min(SCREEN_WIDTH - 80, 300)

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Instruction bar ──
  instructionBar: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  instructionBarDark: {
    backgroundColor: '#1a2a3a',
    borderColor: '#38BDF8',
  },
  instructionBarSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  instructionBarSuccessDark: {
    backgroundColor: '#1b3a24',
    borderColor: '#10B981',
  },
  instructionBarError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  instructionBarErrorDark: {
    backgroundColor: '#3a1b1b',
    borderColor: '#EF4444',
  },
  instructionText: {
    fontSize: 13,
    color: '#1D4ED8',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  instructionTextDark: {
    color: '#7DD3FC',
  },

  // ── Flow path ──
  flowContainer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  flowStep: {
    alignItems: 'center',
    width: SLOT_WIDTH,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  stepBadgeDark: {
    backgroundColor: '#F97316',
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepBadgeTextDark: {
    color: '#fff',
  },

  slot: {
    width: SLOT_WIDTH,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotDark: {
    backgroundColor: '#252525',
    borderColor: '#475569',
  },
  slotFilled: {
    borderStyle: 'solid',
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  slotFilledDark: {
    borderStyle: 'solid',
    borderColor: '#F97316',
    backgroundColor: '#2a1f0d',
  },
  slotHighlight: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    borderStyle: 'solid',
  },
  slotHighlightDark: {
    borderColor: '#38BDF8',
    backgroundColor: '#1a2a3a',
    borderStyle: 'solid',
  },
  slotCorrect: {
    borderStyle: 'solid',
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  slotCorrectDark: {
    borderColor: '#10B981',
    backgroundColor: '#1b3a24',
  },
  slotWrong: {
    borderStyle: 'solid',
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  slotWrongDark: {
    borderColor: '#EF4444',
    backgroundColor: '#3a1b1b',
  },
  slotChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  slotChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#C2410C',
    textAlign: 'center',
  },
  slotChipTextDark: {
    color: '#FB923C',
  },
  slotCorrectText: {
    color: '#059669',
  },
  slotWrongText: {
    color: '#DC2626',
  },
  slotStatusIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  iconCorrect: { color: '#10B981' },
  iconWrong: { color: '#EF4444' },
  removeDot: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6,
  },
  emptySlotLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emptySlotLabelDark: {
    color: '#6B7280',
  },

  // ── Arrow connector ──
  arrowContainer: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
  },
  arrowLine: {
    width: 2,
    height: 14,
    backgroundColor: '#F97316',
  },
  arrowLineDark: {
    backgroundColor: '#F97316',
  },
  arrowHead: {
    fontSize: 14,
    color: '#F97316',
    lineHeight: 16,
  },
  arrowHeadDark: {
    color: '#F97316',
  },

  // ── Correct answer panel ──
  correctAnswerPanel: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  correctAnswerPanelDark: {
    backgroundColor: '#1b3a24',
    borderColor: '#10B981',
  },
  correctAnswerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 6,
  },
  correctAnswerItem: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 20,
  },
  correctAnswerItemDark: {
    color: '#6EE7B7',
  },

  // ── Chip bank ──
  chipBank: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBankDark: {
    backgroundColor: '#1e1e1e',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipBankLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  chipBankLabelDark: {
    color: '#888888',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    maxWidth: (SCREEN_WIDTH - 80) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  chipDark: {
    backgroundColor: '#252525',
    borderColor: '#475569',
  },
  chipSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOpacity: 0.3,
    elevation: 4,
  },
  chipSelectedDark: {
    backgroundColor: '#2a1f0d',
    borderColor: '#F97316',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  chipTextDark: {
    color: '#d4d4d4',
  },
  chipTextSelected: {
    color: '#EA580C',
  },
  bankEmpty: {
    fontSize: 13,
    color: '#10B981',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 4,
  },
  bankEmptyDark: {
    color: '#6EE7B7',
  },

  // ── Submit button ──
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDark: {
    backgroundColor: '#F97316',
  },
  submitBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  submitBtnDisabledDark: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  submitBtnTextDisabled: {
    color: '#94A3B8',
  },
})
