// import { NextRequest, NextResponse } from 'next/server'
// import { supabase, getCurrentUserId } from '@/lib/supabase'

// // GET /api/categories - Get categories for a sheet
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const sheetId = searchParams.get('sheetId')

//     const user_id = await getCurrentUserId()
//     if (!user_id || !sheetId) {
//       return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
//     }

//     // Get unique categories from expenses in this sheet
//     const { data, error } = await supabase
//       .from('expenses')
//       .select('category')
//       .eq('user_id', user_id)
//       .eq('sheet_id', sheetId)

//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }

//     // Extract unique categories
//     const uniqueCategories = [...new Set(data?.map(item => item.category) || [])]
//       .filter(Boolean)
//       .sort()

//     return NextResponse.json({ data: uniqueCategories })

//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// // POST /api/categories - Add a new category to a sheet
// export async function POST(request: NextRequest) {
//   try {
//     const { sheetId, category } = await request.json()
//     const user_id = await getCurrentUserId()
//     if (!user_id || !sheetId || !category) {
//       return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
//     }
//     // Insert new category into sheet_categories
//     const { error } = await supabase
//       .from('sheet_categories')
//       .insert({ sheet_id: sheetId, category, display_order: 999 })
//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }
//     return NextResponse.json({ data: category }, { status: 201 })
//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// // PUT /api/categories - Rename a category in a sheet
// export async function PUT(request: NextRequest) {
//   try {
//     const { sheetId, oldName, newName } = await request.json()
//     const user_id = await getCurrentUserId()
//     if (!user_id || !sheetId || !oldName || !newName) {
//       return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
//     }
//     // Update the category name in sheet_categories
//     const { error } = await supabase
//       .from('sheet_categories')
//       .update({ category: newName })
//       .eq('sheet_id', sheetId)
//       .eq('category', oldName)
//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }
//     // Update all expenses in this sheet with the old category name
//     await supabase
//       .from('expenses')
//       .update({ category: newName })
//       .eq('sheet_id', sheetId)
//       .eq('category', oldName)
//     return NextResponse.json({ data: newName })
//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// // DELETE /api/categories - Delete a category from a sheet
// export async function DELETE(request: NextRequest) {
//   try {
//     const { sheetId, category } = await request.json()
//     const user_id = await getCurrentUserId()
//     if (!user_id || !sheetId || !category) {
//       return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
//     }
//     // Delete the category from sheet_categories
//     const { error } = await supabase
//       .from('sheet_categories')
//       .delete()
//       .eq('sheet_id', sheetId)
//       .eq('category', category)
//     if (error) {
//       console.error('Database error:', error)
//       return NextResponse.json({ error: 'Database error' }, { status: 500 })
//     }
//     // Update all expenses in this sheet with the deleted category to 'uncategorized'
//     await supabase
//       .from('expenses')
//       .update({ category: 'uncategorized' })
//       .eq('sheet_id', sheetId)
//       .eq('category', category)
//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error('API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }
