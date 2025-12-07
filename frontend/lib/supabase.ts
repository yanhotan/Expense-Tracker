// import { createClient } from '@supabase/supabase-js';

// // These environment variables need to be set in your .env.local file
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

// // Create a single supabase client for interacting with your database
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // Function to execute the database setup script
// export const executeSetupScript = async (supabaseClient: typeof supabase) => {
//   try {
//     const { error } = await supabaseClient.rpc('exec_sql', { sql: setupSchema });
//     if (error) throw error;
//     return { success: true };
//   } catch (error) {
//     console.error('Error executing setup script:', error);
//     return { success: false, error };
//   }
// };

// // Function to get the current user ID
// export const getCurrentUserId = async (): Promise<string> => {
//   try {
//     const { data: { user } } = await supabase.auth.getUser()
//     // Return a valid UUID for anonymous users instead of a string
//     return user?.id || '00000000-0000-0000-0000-000000000000'
//   } catch (error) {
//     console.error('Error getting user:', error)
//     // Return a fixed UUID for anonymous users
//     return '00000000-0000-0000-0000-000000000000'
//   }
// }

// // Function to check if user is authenticated
// export const isAuthenticated = async (): Promise<boolean> => {
//   try {
//     const { data: { user } } = await supabase.auth.getUser()
//     return !!user
//   } catch (error) {
//     console.error('Error checking authentication:', error)
//     return false
//   }
// }

// export type Tables = {
//   expenses: {
//     Row: {
//       id: string
//       date: string
//       amount: number
//       category: string
//       description: string | null
//       user_id: string
//       sheet_id: string  // Adding sheet_id to associate expenses with sheets
//       created_at: string
//     }
//     Insert: {
//       id?: string
//       date: string
//       amount: number
//       category: string
//       description?: string | null
//       user_id: string
//       sheet_id: string  // Required when inserting
//       created_at?: string
//     }
//     Update: {
//       id?: string
//       date?: string
//       amount?: number
//       category?: string
//       description?: string | null
//       user_id?: string
//       sheet_id?: string  // Optional when updating
//       created_at?: string
//     }
//   },
//   expense_sheets: {
//     Row: {
//       id: string
//       name: string
//       pin: string | null
//       has_pin: boolean
//       user_id: string
//       created_at: string
//     }
//     Insert: {
//       id?: string
//       name: string
//       pin?: string | null
//       has_pin?: boolean
//       user_id?: string
//       created_at?: string
//     }
//     Update: {
//       id?: string
//       name?: string
//       pin?: string | null
//       has_pin?: boolean
//       user_id?: string
//       created_at?: string
//     }
//   }
// }

// // SQL schema for database setup

// const setupSchema = `
// -- Create the UUID extension if not already installed
// CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

// -- Create expense_sheets table first
// CREATE TABLE IF NOT EXISTS public.expense_sheets (
//     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     name TEXT NOT NULL,
//     pin TEXT,
//     has_pin BOOLEAN DEFAULT false,
//     user_id UUID NOT NULL,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
// );

// -- Create expenses table with foreign key reference
// CREATE TABLE IF NOT EXISTS public.expenses (
//     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     date DATE NOT NULL,
//     amount NUMERIC NOT NULL,
//     category TEXT NOT NULL,
//     description TEXT,
//     user_id UUID NOT NULL,
//     sheet_id UUID REFERENCES public.expense_sheets(id) ON DELETE CASCADE,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
// );

// -- Create indexes after tables exist
// CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
// CREATE INDEX IF NOT EXISTS expense_sheets_user_id_idx ON public.expense_sheets(user_id);
// CREATE INDEX IF NOT EXISTS expenses_sheet_id_idx ON public.expenses(sheet_id);

// -- Enable RLS after tables exist
// ALTER TABLE public.expense_sheets ENABLE ROW LEVEL SECURITY;
// ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

// -- Create RLS policies for expense_sheets
// CREATE POLICY select_own_sheets
//     ON public.expense_sheets
//     FOR SELECT
//     USING (auth.uid() = user_id);

// CREATE POLICY insert_own_sheets
//     ON public.expense_sheets
//     FOR INSERT
//     WITH CHECK (auth.uid() = user_id);

// CREATE POLICY update_own_sheets
//     ON public.expense_sheets
//     FOR UPDATE
//     USING (auth.uid() = user_id);

// CREATE POLICY delete_own_sheets
//     ON public.expense_sheets
//     FOR DELETE
//     USING (auth.uid() = user_id);

// -- Create RLS policies for expenses
// CREATE POLICY select_own_expenses
//     ON public.expenses
//     FOR SELECT
//     USING (auth.uid() = user_id);

// CREATE POLICY insert_own_expenses
//     ON public.expenses
//     FOR INSERT
//     WITH CHECK (auth.uid() = user_id);

// CREATE POLICY update_own_expenses
//     ON public.expenses
//     FOR UPDATE
//     USING (auth.uid() = user_id);

// CREATE POLICY delete_own_expenses
//     ON public.expenses
//     FOR DELETE
//     USING (auth.uid() = user_id);

// -- Create a function to get category totals for a user
// CREATE OR REPLACE FUNCTION public.get_category_totals(user_uuid UUID, sheet_uuid UUID DEFAULT NULL)
// RETURNS TABLE (category TEXT, total NUMERIC) AS $$
// BEGIN
//     IF sheet_uuid IS NULL THEN
//         RETURN QUERY
//         SELECT e.category, SUM(e.amount) as total
//         FROM public.expenses e
//         WHERE e.user_id = user_uuid
//         GROUP BY e.category
//         ORDER BY total DESC;
//     ELSE
//         RETURN QUERY
//         SELECT e.category, SUM(e.amount) as total
//         FROM public.expenses e
//         WHERE e.user_id = user_uuid AND e.sheet_id = sheet_uuid
//         GROUP BY e.category
//         ORDER BY total DESC;
//     END IF;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;

// -- Create a function to get monthly totals for a user
// CREATE OR REPLACE FUNCTION public.get_monthly_totals(user_uuid UUID, sheet_uuid UUID DEFAULT NULL)
// RETURNS TABLE (month TEXT, total NUMERIC) AS $$
// BEGIN
//     IF sheet_uuid IS NULL THEN
//         RETURN QUERY
//         SELECT 
//             TO_CHAR(e.date, 'Mon YYYY') as month,
//             SUM(e.amount) as total
//         FROM public.expenses e
//         WHERE e.user_id = user_uuid
//         GROUP BY TO_CHAR(e.date, 'Mon YYYY'), EXTRACT(YEAR FROM e.date), EXTRACT(MONTH FROM e.date)
//         ORDER BY MIN(e.date) DESC;
//     ELSE
//         RETURN QUERY
//         SELECT 
//             TO_CHAR(e.date, 'Mon YYYY') as month,
//             SUM(e.amount) as total
//         FROM public.expenses e
//         WHERE e.user_id = user_uuid AND e.sheet_id = sheet_uuid
//         GROUP BY TO_CHAR(e.date, 'Mon YYYY'), EXTRACT(YEAR FROM e.date), EXTRACT(MONTH FROM e.date)
//         ORDER BY MIN(e.date) DESC;
//     END IF;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;

// -- Create a function to get the current month's total for a user
// CREATE OR REPLACE FUNCTION public.get_current_month_total(user_uuid UUID, sheet_uuid UUID DEFAULT NULL)
// RETURNS NUMERIC AS $$
// DECLARE
//     total_amount NUMERIC;
//     current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
//     current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
// BEGIN
//     IF sheet_uuid IS NULL THEN
//         SELECT COALESCE(SUM(amount), 0) INTO total_amount
//         FROM public.expenses
//         WHERE user_id = user_uuid
//         AND EXTRACT(MONTH FROM date) = current_month
//         AND EXTRACT(YEAR FROM date) = current_year;
//     ELSE
//         SELECT COALESCE(SUM(amount), 0) INTO total_amount
//         FROM public.expenses
//         WHERE user_id = user_uuid
//         AND sheet_id = sheet_uuid
//         AND EXTRACT(MONTH FROM date) = current_month
//         AND EXTRACT(YEAR FROM date) = current_year;
//     END IF;
    
//     RETURN total_amount;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;

// -- Create a function to get the previous month's total for a user
// CREATE OR REPLACE FUNCTION public.get_previous_month_total(user_uuid UUID, sheet_uuid UUID DEFAULT NULL)
// RETURNS NUMERIC AS $$
// DECLARE
//     total_amount NUMERIC;
//     prev_month INTEGER;
//     prev_year INTEGER;
// BEGIN
//     -- Calculate previous month and year
//     IF EXTRACT(MONTH FROM CURRENT_DATE) = 1 THEN
//         prev_month := 12;
//         prev_year := EXTRACT(YEAR FROM CURRENT_DATE) - 1;
//     ELSE
//         prev_month := EXTRACT(MONTH FROM CURRENT_DATE) - 1;
//         prev_year := EXTRACT(YEAR FROM CURRENT_DATE);
//     END IF;
    
//     IF sheet_uuid IS NULL THEN
//         SELECT COALESCE(SUM(amount), 0) INTO total_amount
//         FROM public.expenses
//         WHERE user_id = user_uuid
//         AND EXTRACT(MONTH FROM date) = prev_month
//         AND EXTRACT(YEAR FROM date) = prev_year;
//     ELSE
//         SELECT COALESCE(SUM(amount), 0) INTO total_amount
//         FROM public.expenses
//         WHERE user_id = user_uuid
//         AND sheet_id = sheet_uuid
//         AND EXTRACT(MONTH FROM date) = prev_month
//         AND EXTRACT(YEAR FROM date) = prev_year;
//     END IF;
    
//     RETURN total_amount;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;

// -- Create a function to get user's top expense categories
// CREATE OR REPLACE FUNCTION public.get_top_categories(user_uuid UUID, limit_count INTEGER DEFAULT 5, sheet_uuid UUID DEFAULT NULL)
// RETURNS TABLE (category TEXT, total NUMERIC) AS $$
// BEGIN
//     IF sheet_uuid IS NULL THEN
//         RETURN QUERY
//         SELECT e.category, SUM(e.amount) as total
//         FROM public.expenses e
//         WHERE e.user_id = user_uuid
//         GROUP BY e.category
//         ORDER BY total DESC
//         LIMIT limit_count;
//     ELSE
//         RETURN QUERY
//         SELECT e.category, SUM(e.amount) as total
//         FROM public.expenses e
//         WHERE e.user_id = user_uuid AND e.sheet_id = sheet_uuid
//         GROUP BY e.category
//         ORDER BY total DESC
//         LIMIT limit_count;
//     END IF;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;
// `;