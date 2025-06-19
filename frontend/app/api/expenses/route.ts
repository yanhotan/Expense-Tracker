import { NextRequest, NextResponse } from 'next/server'
import { supabase, getCurrentUserId } from '@/lib/supabase'

// GET /api/expenses - Fetch expenses with optimizations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sheetId = searchParams.get('sheetId')
    const month = searchParams.get('month') // YYYY-MM format
    const year = searchParams.get('year')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const user_id = await getCurrentUserId()
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: data || [],
      count: data?.length || 0,
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
    const { date, amount, category, description, sheet_id } = body

    const user_id = await getCurrentUserId()
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const newExpense = {
      date,
      amount: parseFloat(amount),
      category,
      description: description || null,
      user_id,
      sheet_id
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

// (No direct API_BASE usage, but ensure all API calls use the updated base from api.ts)
