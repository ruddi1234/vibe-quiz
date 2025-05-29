'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function createUserProfile(userId: string, name: string, email: string) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          name,
          email,
          score: 0
        }
      ])

    if (error) {
      console.error('Profile creation error:', error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    return { success: false, error }
  }
} 