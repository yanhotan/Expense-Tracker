import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!)

// GET /api/expenses - Fetch expenses with optimizations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sheetId = searchParams.get('sheetId')
    const month = searchParams.get('month') // YYYY-MM format
    const year = searchParams.get('year')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // For demo/testing, use a hardcoded user_id
    const user_id = '00000000-0000-0000-0000-000000000000'

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user_id)

    // Apply filters
    if (sheetId) {
      query = query.eq('sheet_id', sheetId)
    }

    // Date filtering for performance
    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31` // Simplified, works for all months
      query = query.gte('date', startDate).lte('date', endDate)
    } else if (year) {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    // Pagination
    if (limit) {
      query = query.limit(parseInt(limit))
      if (offset) {
        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
      }
    }

    // Order by created_at for consistent pagination
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
      count: count || data?.length || 0,
      filters: { sheetId, month, year, limit, offset }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, date, amount, category, description, sheet_id, created_at } = body

    // For demo/testing, use a hardcoded user_id
    const user_id = '00000000-0000-0000-0000-000000000000'

    const newExpense = {
      id: id || undefined, // allow client to provide id for sync
      date: date ? date.split('T')[0] : date, // Ensure YYYY-MM-DD format
      amount: parseFloat(amount),
      category,
      description: description || null,
      user_id,
      sheet_id,
      created_at: created_at || new Date().toISOString()
    }

    // Check for duplicate expense (same date and category)
    if (newExpense.date && newExpense.category && newExpense.sheet_id) {
      const { data: existingExpenses, error: checkError } = await supabase
        .from('expenses')
        .select('id, date, category, amount')
        .eq('date', newExpense.date)
        .eq('category', newExpense.category)
        .eq('sheet_id', newExpense.sheet_id)

      if (checkError) {
        console.error('Error checking for existing expense:', checkError)
      } else if (existingExpenses && existingExpenses.length > 0) {
        console.warn('Duplicate expense found:', existingExpenses[0])
        return NextResponse.json({
          error: 'Duplicate expense',
          details: 'An expense already exists for this date and category',
          data: existingExpenses[0]
        }, { status: 409 })
      }
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert(newExpense)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
