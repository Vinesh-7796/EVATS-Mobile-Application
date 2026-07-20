import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useEffect, useRef } from 'react'
import { getModuleQuestions } from '../../src/data/moduleRegistry'
import { useProgressStore } from '../../src/stores/useProgressStore'
import { shuffleArray, calculateGrade } from '../../src/utils/helpers'
import RankOrderGame from '../../src/components/quiz/RankOrderGame'
import ConnectorGame from '../../src/components/quiz/ConnectorGame'
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary'
import { useThemeStore } from '../../src/stores/useThemeStore'
import type { QuizQuestion, QuizResult } from '../../src/types'

export default function QuizScreen() {
  const router = useRouter()
  const { moduleId, type } = useLocalSearchParams()
  const modId = String(moduleId)
  const completeGameType = useProgressStore(state => state.completeGameType)
  const getStreakMultiplier = useProgressStore(state => state.getStreakMultiplier)
  const recordQuizStart = useProgressStore(state => state.recordQuizStart)
  const recordWrongAnswer = useProgressStore(state => state.recordWrongAnswer)
  const recordCorrectAnswer = useProgressStore(state => state.recordCorrectAnswer)
  const getWrongAnswersForModule = useProgressStore(state => state.getWrongAnswersForModule)
  const theme = useThemeStore(state => state.theme)
  const isDark = theme === 'dark'
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const originalReviewQuestions = useRef<QuizQuestion[]>([])

  useEffect(() => {
    const rawQuestions = getModuleQuestions(modId)
    if (rawQuestions.length === 0) return

    let filtered = rawQuestions

    // Filter by game type
    if (type === 'mcq') {
      filtered = rawQuestions.filter(q => q.type === 'MCQ')
    } else if (type === 'maq') {
      filtered = rawQuestions.filter(q => q.type === 'MAQ')
    } else if (type === 'rank') {
      filtered = rawQuestions.filter(q => q.type === 'RankOrder')
    } else if (type === 'connector') {
      filtered = rawQuestions.filter(q => q.type === 'Connector')
    } else if (type === 'review') {
      const wrongRecords = getWrongAnswersForModule(modId)
      const wrongIds = new Set(wrongRecords.map(w => w.questionId))
      filtered = rawQuestions.filter(q => wrongIds.has(q.id))
    }
    // type === 'all' or undefined: no filter

    if (filtered.length === 0) return

    const shuffled = shuffleArray(filtered)
    const withShuffledOptions = shuffled.map(q => {
      if (q.type === 'MCQ') return { ...q, options: shuffleArray([...q.options]) }
      if (q.type === 'MAQ') return { ...q, options: shuffleArray([...q.options]) }
      return q
    })

    setQuestions(withShuffledOptions)
    if (type === 'review') {
      originalReviewQuestions.current = withShuffledOptions
    }
    recordQuizStart()
  }, [moduleId, type])

  const rawQuestions = getModuleQuestions(modId)
  if (rawQuestions.length === 0) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { justifyContent: 'center', alignItems: 'center', flex: 1, padding: 24 }]}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
          No quiz questions available for this module yet.
        </Text>
        <TouchableOpacity style={styles.devSkipButton} onPress={() => router.back()}>
          <Text style={styles.devSkipText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <Text style={{ color: isDark ? '#fff' : '#000' }}>Loading quiz...</Text>
      </View>
    )
  }

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentQuestion.id]

  const handleMCQAnswer = (answer: string) => {
    if (showFeedback) return
    setAnswers({ ...answers, [currentQuestion.id]: answer })
  }

  const handleMAQToggle = (option: string) => {
    if (showFeedback) return
    const current = answers[currentQuestion.id] || []
    const updated = current.includes(option)
      ? current.filter((o: string) => o !== option)
      : [...current, option]
    setAnswers({ ...answers, [currentQuestion.id]: updated })
  }

  const handleGameComplete = (correct: boolean) => {
    setIsCorrect(correct)
    setShowFeedback(true)

    // Spaced repetition tracking for game types
    if (correct) {
      recordCorrectAnswer(currentQuestion.id, modId)
    } else {
      recordWrongAnswer(currentQuestion.id, modId)
    }
  }

  const handleSubmit = () => {
    let correct = false

    if (currentQuestion.type === 'MCQ') {
      correct = currentAnswer === currentQuestion.correctAnswer
    } else if (currentQuestion.type === 'MAQ') {
      const selected = currentAnswer || []
      const correctAnswers = currentQuestion.correctAnswers
      correct = selected.length === correctAnswers.length &&
        selected.every((a: string) => correctAnswers.includes(a))
    } else {
      return
    }

    setIsCorrect(correct)
    setShowFeedback(true)

    // Spaced repetition tracking
    if (correct) {
      recordCorrectAnswer(currentQuestion.id, modId)
    } else {
      recordWrongAnswer(currentQuestion.id, modId)
    }
  }

  const handleNext = () => {
    if (type === 'review') {
      if (isCorrect) {
        const remaining = questions.filter(q => q.id !== currentQuestion.id)
        setQuestions(remaining)
        setShowFeedback(false)
        setIsCorrect(false)
        if (remaining.length === 0) {
          calculateResults(originalReviewQuestions.current)
        }
        return
      }
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowFeedback(false)
        setIsCorrect(false)
      } else {
        calculateResults(originalReviewQuestions.current)
      }
      return
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowFeedback(false)
      setIsCorrect(false)
    } else {
      calculateResults()
    }
  }

  const calculateResults = async (overrideQuestions?: QuizQuestion[]) => {
    const qs = overrideQuestions || questions
    let correctCount = 0
    let totalPoints = 0
    let earnedPoints = 0
    const answerDetails: { questionId: string; correct: boolean; pointsEarned: number }[] = []

    for (const question of qs) {
      const answer = answers[question.id]
      let correct = false

      if (question.type === 'MCQ') {
        correct = answer === question.correctAnswer
      } else if (question.type === 'MAQ') {
        const selected = answer || []
        const correctAnswers = question.correctAnswers
        correct = selected.length === correctAnswers.length &&
          selected.every((a: string) => correctAnswers.includes(a))
      } else if (question.type === 'RankOrder') {
        correct = answers[`${question.id}_correct`] === true
      } else if (question.type === 'Connector') {
        correct = answers[`${question.id}_correct`] === true
      }

      if (correct) {
        correctCount++
        earnedPoints += question.points
      }
      totalPoints += question.points

      answerDetails.push({
        questionId: question.id,
        correct,
        pointsEarned: correct ? question.points : 0,
      })
    }

    const streakMultiplier = getStreakMultiplier()
    const finalPoints = Math.round(earnedPoints * streakMultiplier)
    const percentage = (correctCount / qs.length) * 100
    const grade = calculateGrade(percentage)

    const result: QuizResult = {
      moduleId: modId,
      score: finalPoints,
      totalPoints,
      percentage,
      grade,
      correctAnswers: correctCount,
      totalQuestions: qs.length,
      completedAt: new Date(),
      answers: answerDetails,
    }

    await useProgressStore.getState().saveProgress()

    if (type === 'review') {
      router.replace({
        pathname: '/results',
        params: {
          moduleId,
          gameType: 'review',
          score: finalPoints.toString(),
          totalPoints: totalPoints.toString(),
          percentage: percentage.toFixed(1),
          grade,
          correctAnswers: correctCount.toString(),
          totalQuestions: qs.length.toString(),
        },
      })
      return
    }

    await completeGameType(modId, type as any, result)
    router.replace({
      pathname: '/results',
      params: {
        moduleId,
        gameType: type as string,
        score: finalPoints.toString(),
        totalPoints: totalPoints.toString(),
        percentage: percentage.toFixed(1),
        grade,
        correctAnswers: correctCount.toString(),
        totalQuestions: qs.length.toString(),
      },
    })
  }

  const handleDevSkip = async () => {
    // Generate a 75% score
    const totalQuestions = questions.length
    const correctCount = Math.round(totalQuestions * 0.75)
    
    let earnedPoints = 0
    let totalPoints = 0
    const answerDetails: { questionId: string; correct: boolean; pointsEarned: number }[] = []

    questions.forEach((question, index) => {
      const isCorrect = index < correctCount
      totalPoints += question.points
      if (isCorrect) {
        earnedPoints += question.points
      }
      answerDetails.push({
        questionId: question.id,
        correct: isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
      })
    })

    const streakMultiplier = getStreakMultiplier()
    const finalPoints = Math.round(earnedPoints * streakMultiplier)
    const percentage = (correctCount / totalQuestions) * 100
    const grade = calculateGrade(percentage)

    const result: QuizResult = {
      moduleId: modId,
      score: finalPoints,
      totalPoints,
      percentage,
      grade,
      correctAnswers: correctCount,
      totalQuestions,
      completedAt: new Date(),
      answers: answerDetails,
    }

    await useProgressStore.getState().saveProgress()

    if (type === 'review') {
      router.replace({
        pathname: '/results',
        params: {
          moduleId,
          gameType: 'review',
          score: finalPoints.toString(),
          totalPoints: totalPoints.toString(),
          percentage: percentage.toFixed(1),
          grade,
          correctAnswers: correctCount.toString(),
          totalQuestions: totalQuestions.toString(),
        },
      })
      return
    }

    await completeGameType(modId, type as any, result)
    router.replace({
      pathname: '/results',
      params: {
        moduleId,
        gameType: type as string,
        score: finalPoints.toString(),
        totalPoints: totalPoints.toString(),
        percentage: percentage.toFixed(1),
        grade,
        correctAnswers: correctCount.toString(),
        totalQuestions: totalQuestions.toString(),
      },
    })
  }

  const canSubmit = () => {
    if (currentQuestion.type === 'MCQ') {
      return currentAnswer !== undefined
    } else if (currentQuestion.type === 'MAQ') {
      return currentAnswer && currentAnswer.length > 0
    }
    return false
  }

  const modeLabel = type === 'all' || !type ? 'Full Quiz' :
    type === 'mcq' ? 'MCQ' :
    type === 'maq' ? 'MAQ' :
    type === 'rank' ? 'Rank Order' :
    type === 'connector' ? 'Connector' :
    type === 'review' ? 'Review' : 'Quiz'

  // Always use ScrollView so content never gets clipped behind the footer
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Fixed header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View>
            <Text style={styles.progress}>
              {type === 'review'
                ? `${modeLabel} — ${questions.length} remaining`
                : `${modeLabel} — Question ${currentIndex + 1} / ${questions.length}`}
            </Text>
            <Text style={[
              styles.difficulty,
              currentQuestion.difficulty === 'hard' && styles.difficultyHard,
              currentQuestion.difficulty === 'medium' && styles.difficultyMedium,
              isDark && currentQuestion.difficulty === 'easy' && { color: '#F97316' }
            ]}>
              {currentQuestion.difficulty.toUpperCase()} • {currentQuestion.points} pts
            </Text>
          </View>
          {__DEV__ && (
            <TouchableOpacity style={styles.devSkipButton} onPress={handleDevSkip}>
              <Text style={styles.devSkipText}>⚡ Skip Quiz</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Scrollable content — always scrollable so nothing is cut off */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.question, isDark && styles.questionDark]}>{currentQuestion.question}</Text>

        {currentQuestion.type === 'MCQ' && (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  isDark && styles.optionDark,
                  currentAnswer === option && styles.optionSelected,
                  isDark && currentAnswer === option && styles.optionSelectedDark,
                  showFeedback && option === currentQuestion.correctAnswer && styles.optionCorrect,
                  isDark && showFeedback && option === currentQuestion.correctAnswer && styles.optionCorrectDark,
                  showFeedback && currentAnswer === option && !isCorrect && styles.optionWrong,
                  isDark && showFeedback && currentAnswer === option && !isCorrect && styles.optionWrongDark,
                ]}
                onPress={() => handleMCQAnswer(option)}
                disabled={showFeedback}
              >
                <Text style={[
                  styles.optionText,
                  isDark && styles.optionTextDark,
                  currentAnswer === option && styles.optionTextSelected,
                  isDark && currentAnswer === option && { color: '#F97316' },
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {currentQuestion.type === 'MAQ' && (
          <View style={styles.optionsContainer}>
            <Text style={[styles.instruction, isDark && styles.instructionDark]}>Select all that apply</Text>
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer?.includes(option)
              const isCorrectOption = currentQuestion.correctAnswers.includes(option)
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    isDark && styles.optionDark,
                    isSelected && styles.optionSelected,
                    isDark && isSelected && styles.optionSelectedDark,
                    showFeedback && isCorrectOption && styles.optionCorrect,
                    isDark && showFeedback && isCorrectOption && styles.optionCorrectDark,
                    showFeedback && isSelected && !isCorrectOption && styles.optionWrong,
                    isDark && showFeedback && isSelected && !isCorrectOption && styles.optionWrongDark,
                  ]}
                  onPress={() => handleMAQToggle(option)}
                  disabled={showFeedback}
                >
                  <Text style={[
                    styles.optionText,
                    isDark && styles.optionTextDark,
                    isSelected && styles.optionTextSelected,
                    isDark && isSelected && { color: '#F97316' },
                  ]}>
                    {isSelected ? '☑' : '☐'} {option}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {currentQuestion.type === 'RankOrder' && (
          <ErrorBoundary fallbackTitle="Question failed to load">
            <RankOrderGame
              key={currentQuestion.id}
              question={currentQuestion}
              onComplete={(correct) => {
                setAnswers({ ...answers, [`${currentQuestion.id}_correct`]: correct })
                handleGameComplete(correct)
              }}
              showFeedback={showFeedback}
            />
          </ErrorBoundary>
        )}

        {currentQuestion.type === 'Connector' && (
          <ErrorBoundary fallbackTitle="Question failed to load">
            <ConnectorGame
              key={currentQuestion.id}
              question={currentQuestion}
              onComplete={(correct) => {
                setAnswers({ ...answers, [`${currentQuestion.id}_correct`]: correct })
                handleGameComplete(correct)
              }}
              showFeedback={showFeedback}
            />
          </ErrorBoundary>
        )}

        {showFeedback && (currentQuestion.type === 'MCQ' || currentQuestion.type === 'MAQ') && (
          <View style={[
            styles.feedback, 
            isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
            isDark && isCorrect && styles.feedbackCorrectDark,
            isDark && !isCorrect && styles.feedbackWrongDark
          ]}>
            <Text style={[styles.feedbackText, isDark && styles.feedbackTextDark]}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </Text>
            {!isCorrect && currentQuestion.type === 'MCQ' && (
              <Text style={[styles.feedbackAnswer, isDark && styles.feedbackAnswerDark]}>
                Correct answer: {currentQuestion.correctAnswer}
              </Text>
            )}
          </View>
        )}

        {/* Extra bottom padding so content clears the sticky footer */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Sticky footer — always visible at bottom, never scrolls away */}
      <View style={[styles.footer, isDark && styles.footerDark]}>
        {showFeedback ? (
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {currentIndex < questions.length - 1
                ? 'Next Question'
                : type === 'review' ? 'Finish Review' : 'Finish Quiz'}
            </Text>
          </TouchableOpacity>
        ) : (
          (currentQuestion.type === 'MCQ' || currentQuestion.type === 'MAQ') && (
            <TouchableOpacity
              style={[styles.button, !canSubmit() && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit()}
            >
              <Text style={styles.buttonText}>Submit Answer</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  devSkipButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  devSkipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  difficulty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  difficultyHard: {
    color: '#EF4444',
  },
  difficultyMedium: {
    color: '#F59E0B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24,
    lineHeight: 26,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF3E0',
  },
  optionCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionWrong: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  feedback: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
  },
  feedbackCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  feedbackWrong: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  feedbackAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ── Dark Theme Overrides (palette matches Windows) ──
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  headerDark: {
    backgroundColor: '#111111',
  },
  questionDark: {
    color: '#d4d4d4',
  },
  instructionDark: {
    color: '#888888',
  },
  optionDark: {
    backgroundColor: '#252525',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionSelectedDark: {
    borderColor: '#F97316',
    backgroundColor: '#F9731618',
  },
  optionCorrectDark: {
    borderColor: '#4CAF50',
    backgroundColor: '#1b3a24',
  },
  optionWrongDark: {
    borderColor: '#F44336',
    backgroundColor: '#4a1515',
  },
  optionTextDark: {
    color: '#d4d4d4',
  },
  feedbackCorrectDark: {
    backgroundColor: '#1b3a24',
    borderColor: '#4CAF50',
  },
  feedbackWrongDark: {
    backgroundColor: '#4a1515',
    borderColor: '#F44336',
  },
  feedbackTextDark: {
    color: '#d4d4d4',
  },
  feedbackAnswerDark: {
    color: '#888888',
  },
  footerDark: {
    backgroundColor: '#1a1a1a',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
})
