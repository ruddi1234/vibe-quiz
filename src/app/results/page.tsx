'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

interface MatchWithUser {
  matched_user: User
}

export default function Results() {
  const [user, setUser] = useState<User | null>(null)
  const [matches, setMatches] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        if (!authUser) {
          router.push('/')
          return
        }

        // Fetch user profile
        const { data: userData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError) throw profileError
        setUser(userData)

        // Fetch matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            matched_user:users!matches_matched_user_id_fkey (
              id,
              name,
              email,
              score,
              created_at
            )
          `)
          .eq('user_id', authUser.id)
          .eq('status', 'pending')

        if (matchesError) throw matchesError

        // Type assertion to handle the nested structure
        const typedMatches = matchesData as unknown as MatchWithUser[]
        const matchedUsers = typedMatches
          ?.map(match => match.matched_user)
          .filter((user): user is User => user !== null)

        setMatches(matchedUsers || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleConnect = async (matchedUserId: string) => {
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (authUser) {
        // Update match status
        const { error: updateError } = await supabase
          .from('matches')
          .update({ status: 'connected' })
          .eq('user_id', authUser.id)
          .eq('matched_user_id', matchedUserId)

        if (updateError) throw updateError

        // Remove the connected match from the list
        setMatches(matches.filter(match => match.id !== matchedUserId))
      }
    } catch (error) {
      console.error('Error connecting with match:', error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4">
        <div className="text-white text-xl">Loading...</div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl"
      >
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          Your Results
        </h1>

        <div className="mb-8 text-center">
          <p className="text-xl text-gray-700 mb-2">
            Congratulations, {user.name}!
          </p>
          <p className="text-2xl font-bold text-purple-600">
            Your Score: {user.score} out of 5
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Your Matches</h2>
          {matches.length === 0 ? (
            <p className="text-gray-500 text-center">No matches found yet. Check back later!</p>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-gray-200 hover:border-purple-500 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{match.name}</h3>
                      <p className="text-sm text-gray-500">Score: {match.score}/5</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleConnect(match.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Connect
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Take Quiz Again
          </motion.button>
        </div>
      </motion.div>
    </main>
  )
} 