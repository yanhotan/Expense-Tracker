import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!)

// GET /api/descriptions - Get descriptions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sheetId = searchParams.get('sheetId')
    const expenseId = searchParams.get('expenseId')
    const columnName = searchParams.get('columnName')

    // For demo/testing, use a hardcoded user_id
    const user_id = '00000000-0000-0000-0000-000000000000'

    console.log(`Fetching descriptions for sheetId=${sheetId}, expenseId=${expenseId}, columnName=${columnName}`)

    let query = supabase
      .from('column_descriptions')
      .select('id, expense_id, column_name, description')
      .eq('user_id', user_id)

    // Apply filters if specified
    if (expenseId) {
      query = query.eq('expense_id', expenseId)
    }

    if (columnName) {
      query = query.eq('column_name', columnName)
    }

    // If sheet ID is provided, we need to join with expenses table
    if (sheetId) {
      // First get all expense IDs for this sheet
      const { data: expenseIds, error: expenseError } = await supabase
        .from('expenses')
        .select('id')
        .eq('sheet_id', sheetId)
        .eq('user_id', user_id)

      if (expenseError) {
        console.error('Error fetching expense IDs:', expenseError)
        return NextResponse.json({ error: 'Database error fetching expenses' }, { status: 500 })
      }

      // Then filter descriptions by these expense IDs
      if (expenseIds && expenseIds.length > 0) {
        const ids = expenseIds.map(e => e.id)
        query = query.in('expense_id', ids)
      } else {
        // No expenses for this sheet, return empty array
        return NextResponse.json({ data: [] })
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching descriptions:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`Found ${data?.length || 0} descriptions`)

    const formattedData = data?.map(desc => ({
      id: desc.id,
      expense_id: desc.expense_id,
      column_name: desc.column_name,
      description: desc.description
    })) || []

    return NextResponse.json({ data: formattedData })
  } catch (err) {
    console.error('Unexpected error in GET /descriptions:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/descriptions - Save description
export async function POST(request: NextRequest) {
  try {
    const { expense_id, description, column_name = 'notes' } = await request.json()

    // For demo/testing, use a hardcoded user_id
    const user_id = '00000000-0000-0000-0000-000000000000'

    if (!expense_id) {
      return NextResponse.json({ error: 'Missing expense_id' }, { status: 400 })
    }

    console.log(`Saving description for expense ${expense_id}: "${description}", column: ${column_name}`)

    // First check if this expense exists
    const { data: existingExpense, error: expenseError } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', expense_id)
      .single()

    if (expenseError || !existingExpense) {
      console.error('Error finding expense:', expenseError)
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Check if a description already exists for this expense and column
    const { data: existingDesc, error: descError } = await supabase
      .from('column_descriptions')
      .select('id')
      .eq('expense_id', expense_id)
      .eq('column_name', column_name)
      .maybeSingle()

    let result

    if (existingDesc) {
      // Update existing description
      result = await supabase
        .from('column_descriptions')
        .update({
          description,
          user_id
        })
        .eq('id', existingDesc.id)
        .select('id, expense_id, column_name, description')
        .single()
    } else {
      // Insert new description
      result = await supabase
        .from('column_descriptions')
        .insert({
          expense_id,
          column_name,
          description,
          user_id
        })
        .select('id, expense_id, column_name, description')
        .single()
    }

    if (result.error) {
      console.error('Error saving description:', result.error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (err) {
    console.error('Unexpected error in POST /descriptions:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
