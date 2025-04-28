import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a dummy client during build if credentials are missing
const isBrowser = typeof window !== 'undefined';
const hasCredentials = supabaseUrl && supabaseAnonKey;

// Create a single supabase client for interacting with your database
export const supabase = hasCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createDummyClient();

// Create a dummy client that returns empty results to avoid build errors
function createDummyClient() {
  if (isBrowser && !hasCredentials) {
    console.error('Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }
  
  return {
    from: () => ({
      select: () => ({ data: [], error: null, count: null, eq: () => ({ data: [], error: null, order: () => ({ data: [], error: null }) }) }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      eq: () => ({ data: [], error: null })
    }),
    auth: {
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    // Add other methods as needed for your application
  } as any;
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