// import { NextRequest, NextResponse } from 'next/server'
// import { supabase, getCurrentUserId } from '@/lib/supabase'

// // PUT /api/expenses/[id] - Update expense
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const body = await request.json()
//     const { date, amount, category, description } = body

//     const user_id = await getCurrentUserId()
//     if (!user_id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const updates = {
//       date,
//       amount: parseFloat(amount),
//       category,
//       description: description || null
//     }

//     const { data, error } = await supabase
//       .from('expenses')
//       .update(updates)
//       .eq('id', params.id)
//       .eq('user_id', user_id) // Security: only update own expenses
//       .select()
//       .single()

//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }

//     if (!data) {
//       return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
//     }

//     return NextResponse.json({ data })

//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// // DELETE /api/expenses/[id] - Delete expense
// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const user_id = await getCurrentUserId()
//     if (!user_id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     // First delete associated column descriptions
//     await supabase
//       .from('column_descriptions')
//       .delete()
//       .eq('expense_id', params.id)

//     // Then delete the expense
//     const { error } = await supabase
//       .from('expenses')
//       .delete()
//       .eq('id', params.id)
//       .eq('user_id', user_id) // Security: only delete own expenses

//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }

//     return NextResponse.json({ success: true })

//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }
