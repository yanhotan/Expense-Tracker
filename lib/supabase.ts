import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  expenses: {
    Row: {
      id: string
      date: string
      amount: number
      category: string
      description: string | null
      user_id: string
      created_at: string
    }
    Insert: {
      id?: string
      date: string
      amount: number
      category: string
      description?: string | null
      user_id: string
      created_at?: string
    }
    Update: {
      id?: string
      date?: string
      amount?: number
      category?: string
      description?: string | null
      user_id?: string
      created_at?: string
    }
  }
}