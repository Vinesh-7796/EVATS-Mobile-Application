import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import type { RankOrderQuestion } from '../../types'
import { useThemeStore } from '../../stores/useThemeStore'

interface RankOrderGameProps {
  question: RankOrderQuestion
  onComplete: (isCorrect: boolean) => void
  showFeedback: boolean
}

export default function RankOrderGame({ question, onComplete, showFeedback }: RankOrderGameProps) {
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<{ key: string; label: string; index: number }[]>(() => {
    const base = question.steps.map((step, index) => ({
      key: `item-${index}`,
      label: step,
      index,
    }))

    const shuffle = (arr: typeof base) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
    }

    // Keep shuffling until at least half the positions differ from the correct answer
    const minDiff = Math.ceil(base.length / 2)
    let attempts = 0
    do {
      shuffle(base)
      const currentOrder = base.map(item => item.index)
      const diffCount = currentOrder.filter((v, i) => v !== question.correctOrder[i]).length
      if (diffCount >= minDiff) break
      attempts++
    } while (attempts < 50)

    return base
  })
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleSubmit = () => {
    const currentOrder = items.map(item => item.index)
    const correct = JSON.stringify(currentOrder) === JSON.stringify(question.correctOrder)
    setIsCorrect(correct)
    setSubmitted(true)
    onComplete(correct)
  }

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<{ key: string; label: string; index: number }>) => {
    const itemPosition = items.findIndex(i => i.key === item.key)
    const isWrongPosition = submitted && question.correctOrder[itemPosition] !== item.index

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={250}
          disabled={isActive || showFeedback || submitted}
          style={[
            styles.item,
            isDark && styles.itemDark,
            isActive && styles.itemActive,
            isDark && isActive && styles.itemActiveDark,
            submitted && isWrongPosition && styles.itemWrong,
            isDark && submitted && isWrongPosition && styles.itemWrongDark,
            submitted && !isWrongPosition && styles.itemCorrect,
            isDark && submitted && !isWrongPosition && styles.itemCorrectDark,
          ]}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemNumber}>{itemPosition + 1}</Text>
            <Text style={[
              styles.itemText,
              isDark && styles.itemTextDark,
              isActive && styles.itemTextActive,
              isDark && isActive && styles.itemTextActiveDark
            ]}>
              {item.label}
            </Text>
            {!showFeedback && !submitted && (
              <Text style={styles.dragHandle}>⠿</Text>
            )}
            {submitted && (
              <Text style={[styles.statusIcon, isWrongPosition ? styles.wrongIcon : styles.correctIcon]}>
                {isWrongPosition ? '✗' : '✓'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    )
  }, [items, submitted, showFeedback, question.correctOrder, isDark])

  return (
    <View style={styles.container}>
      <View style={[
        styles.instructions,
        isDark && styles.instructionsDark,
        submitted && isCorrect && styles.instructionsCorrectDark,
        submitted && !isCorrect && styles.instructionsWrongDark,
      ]}>
        <Text style={[
          styles.instructionText,
          isDark && styles.instructionTextDark,
          submitted && isCorrect && { color: '#4CAF50' },
          submitted && !isCorrect && { color: '#EF4444' }
        ]}>
          {submitted 
            ? (isCorrect ? '✓ Correct order!' : '✗ Incorrect order')
            : 'Long press and drag to reorder the steps'}
        </Text>
      </View>

      <DraggableFlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        onDragEnd={({ data }) => {
          if (!showFeedback && !submitted) {
            setItems(data)
          }
        }}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
        nestedScrollEnabled={false}
      />

      {submitted && !isCorrect && (
        <View style={[styles.correctAnswer, isDark && styles.correctAnswerDark]}>
          <Text style={styles.correctAnswerTitle}>Correct Order:</Text>
          {question.correctOrder.map((originalIndex, position) => (
            <Text key={position} style={[styles.correctAnswerItem, isDark && styles.correctAnswerItemDark]}>
              {position + 1}. {question.steps[originalIndex]}
            </Text>
          ))}
        </View>
      )}

      {!submitted && !showFeedback && (
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Check Order</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },
  instructions: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#FF6B35',
    textAlign: 'center',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 16,
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  itemCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  itemWrong: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  itemTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  dragHandle: {
    fontSize: 20,
    color: '#999',
    marginLeft: 8,
  },
  statusIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  correctIcon: {
    color: '#4CAF50',
  },
  wrongIcon: {
    color: '#F44336',
  },
  correctAnswer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  correctAnswerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  correctAnswerItem: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ── Dark Mode Style Overrides (Windows Palette) ──
  instructionsDark: {
    backgroundColor: '#252525',
    borderColor: '#F97316',
    borderWidth: 1,
  },
  instructionsCorrectDark: {
    borderColor: '#4CAF50',
    backgroundColor: '#1b3a24',
  },
  instructionsWrongDark: {
    borderColor: '#F44336',
    backgroundColor: '#4a1515',
  },
  instructionTextDark: {
    color: '#F97316',
  },
  itemDark: {
    backgroundColor: '#252525',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemActiveDark: {
    backgroundColor: '#252525',
    borderColor: '#F97316',
  },
  itemTextDark: {
    color: '#d4d4d4',
  },
  itemTextActiveDark: {
    color: '#F97316',
  },
  itemCorrectDark: {
    borderColor: '#4CAF50',
    backgroundColor: '#1b3a24',
  },
  itemWrongDark: {
    borderColor: '#F44336',
    backgroundColor: '#4a1515',
  },
  correctAnswerDark: {
    backgroundColor: '#1b3a24',
    borderColor: '#4CAF50',
  },
  correctAnswerItemDark: {
    color: '#d4d4d4',
  },
})
