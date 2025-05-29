export interface User {
  id: string
  name: string
  email: string
  score: number
  created_at: string
}

export interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}

export interface QuizState {
  currentQuestion: number
  score: number
  answers: number[]
  isComplete: boolean
} 