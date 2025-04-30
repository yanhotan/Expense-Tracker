import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to get the current user ID
export const getCurrentUserId = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || 'anonymous'
  } catch (error) {
    console.error('Error getting user:', error)
    return 'anonymous'
  }
}

// Function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

export type Tables = {
  expenses: {
    Row: {
      id: string
      date: string
      amount: number
      category: string
      description: string | null
      user_id: string
      sheet_id: string  // Adding sheet_id to associate expenses with sheets
      created_at: string
    }
    Insert: {
      id?: string
      date: string
      amount: number
      category: string
      description?: string | null
      user_id: string
      sheet_id: string  // Required when inserting
      created_at?: string
    }
    Update: {
      id?: string
      date?: string
      amount?: number
      category?: string
      description?: string | null
      user_id?: string
      sheet_id?: string  // Optional when updating
      created_at?: string
    }
  },
  expense_sheets: {
    Row: {
      id: string
      name: string
      pin: string | null
      has_pin: boolean
      user_id: string
      created_at: string
    }
    Insert: {
      id?: string
      name: string
      pin?: string | null
      has_pin?: boolean
      user_id: string
      created_at?: string
    }
    Update: {
      id?: string
      name?: string
      pin?: string | null
      has_pin?: boolean
      user_id?: string
      created_at?: string
    }
  }
}