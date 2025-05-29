'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { questions } from '@/data/questions'
import { QuizState } from '@/types'
import { supabase } from '@/lib/supabase'

// Animated Background Component
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-500" />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 2 + 1,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}

// Floating Card Component
function FloatingCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-white/20"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

// Progress Bar Component
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200/30 rounded-full h-3 overflow-hidden">
      <motion.div
        className="bg-gradient-to-r from-purple-600 to-blue-500 h-3 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
    </div>
  )
}

// Option Button Component
function OptionButton({ option, index, onClick }: { option: string; index: number; onClick: () => void }) {
  const controls = useAnimation()

  const handleHover = async () => {
    await controls.start({
      scale: 1.05,
      transition: { duration: 0.2 }
    })
  }

  const handleHoverEnd = async () => {
    await controls.start({
      scale: 1,
      transition: { duration: 0.2 }
    })
  }

  return (
    <motion.button
      animate={controls}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={handleHover}
      onHoverEnd={handleHoverEnd}
      onClick={onClick}
      className="p-6 text-left text-black rounded-xl border border-gray-200/50 
                hover:border-purple-500/50 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 
                transition-all duration-300 backdrop-blur-sm bg-white/50"
    >
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="text-lg font-medium"
      >
        {option}
      </motion.span>
    </motion.button>
  )
}

export default function Quiz() {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    score: 0,
    answers: [],
    isComplete: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (!session) {
          router.push('/')
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Session check error:', error)
        router.push('/')
      }
    }

    checkSession()
  }, [router])

  const handleAnswer = async (answerIndex: number) => {
    const newAnswers = [...quizState.answers, answerIndex]
    const newScore = quizState.score + (answerIndex === questions[quizState.currentQuestion].correctAnswer ? 1 : 0)
    
    if (quizState.currentQuestion === questions.length - 1) {
      setQuizState({
        ...quizState,
        answers: newAnswers,
        score: newScore,
        isComplete: true
      })

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        if (user) {
          const response = await fetch(`/api/users/${user.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score: newScore })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update score');
          }

          const updatedUser = await response.json();

          const { data: potentialMatches, error: matchesError } = await supabase
            .from('users')
            .select('*')
            .neq('id', user.id)
            .order('score', { ascending: false })
            .limit(5)

          if (matchesError) throw matchesError

          const matchPromises = potentialMatches?.map(match => 
            supabase
              .from('matches')
              .insert([
                {
                  user_id: user.id,
                  matched_user_id: match.id,
                  status: 'pending'
                }
              ])
          )

          await Promise.all(matchPromises || [])
        }

        router.push('/results')
      } catch (error) {
        console.error('Error saving results:', error)
      }
    } else {
      setQuizState({
        ...quizState,
        currentQuestion: quizState.currentQuestion + 1,
        answers: newAnswers,
        score: newScore
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-2xl font-semibold"
        >
          Loading...
        </motion.div>
      </main>
    )
  }

  const currentQuestion = questions[quizState.currentQuestion]
  const progress = ((quizState.currentQuestion + 1) / questions.length) * 100

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 z-10 bg-white/80 hover:bg-white text-purple-600 font-semibold px-5 py-2 rounded-lg shadow transition-colors border border-purple-200"
      >
        Logout
      </button>
      <FloatingCard>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-semibold text-gray-700"
            >
              Question {quizState.currentQuestion + 1} of {questions.length}
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 rounded-full"
            >
              Score: {quizState.score}
            </motion.div>
          </div>
          <ProgressBar progress={progress} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={quizState.currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="space-y-8"
          >
            <motion.h3 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-gray-800 leading-tight"
            >
              {currentQuestion.question}
            </motion.h3>
            <div className="grid gap-4">
              {currentQuestion.options.map((option, index) => (
                <OptionButton
                  key={index}
                  option={option}
                  index={index}
                  onClick={() => handleAnswer(index)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </FloatingCard>
    </main>
  )
} 