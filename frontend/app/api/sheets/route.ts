import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!)

// GET /api/sheets - Get all expense sheets
export async function GET() {
  try {
    // For demo/testing, use a hardcoded user_id
    const user_id = '00000000-0000-0000-0000-000000000000'

    const { data, error } = await supabase
      .from('expense_sheets')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sheets - Create new sheet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, pin, has_pin, created_at } = body

    // For demo/testing, use a hardcoded user_id
    const user_id = '00000000-0000-0000-0000-000000000000'

    const newSheet = {
      id: id || undefined, // allow client to provide id for sync
      name,
      pin: pin || null,
      has_pin: has_pin || !!pin,
      created_at: created_at || new Date().toISOString(),
      user_id
    }

    const { data, error } = await supabase
      .from('expense_sheets')
      .insert(newSheet)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
