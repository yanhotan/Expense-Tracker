// import { NextRequest, NextResponse } from 'next/server'
// import { supabase, getCurrentUserId } from '@/lib/supabase'

// // GET /api/sheets - Get all expense sheets
// export async function GET() {
//   try {
//     const user_id = await getCurrentUserId()
//     if (!user_id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const { data, error } = await supabase
//       .from('expense_sheets')
//       .select('*')
//       .eq('user_id', user_id)
//       .order('created_at', { ascending: false })

//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }

//     return NextResponse.json({ data: data || [] })

//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// // POST /api/sheets - Create new sheet
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { name, pin } = body

//     const user_id = await getCurrentUserId()
//     if (!user_id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const newSheet = {
//       name,
//       pin: pin || null,
//       has_pin: !!pin,
//       user_id
//     }

//     const { data, error } = await supabase
//       .from('expense_sheets')
//       .insert(newSheet)
//       .select()
//       .single()

//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }

//     return NextResponse.json({ data }, { status: 201 })

//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// // (No direct API_BASE usage, but ensure all API calls use the updated base from api.ts)
