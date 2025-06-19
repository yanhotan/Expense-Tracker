// import { NextRequest, NextResponse } from 'next/server'
// // import { supabase, getCurrentUserId } from '@/lib/supabase'

// // GET /api/analytics - Get aggregated analytics data
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const sheetId = searchParams.get('sheetId')
//     const month = searchParams.get('month') // YYYY-MM format
//     const year = searchParams.get('year')

//     const user_id = await getCurrentUserId()
//     if (!user_id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     // Build base conditions for all queries
//     let conditions = [`user_id = '${user_id}'`]
//     if (sheetId) conditions.push(`sheet_id = '${sheetId}'`)
//     if (month) {
//       conditions.push(`date >= '${month}-01'`)
//       conditions.push(`date <= '${month}-31'`)
//     } else if (year) {
//       conditions.push(`date >= '${year}-01-01'`)
//       conditions.push(`date <= '${year}-12-31'`)
//     }

//     const whereClause = conditions.join(' AND ')

//     // Run multiple queries in parallel for performance
//     const [categoryTotalsResult, monthlyTotalsResult, dailyTotalsResult] = await Promise.all([
//       // Category totals
//       supabase.rpc('get_category_totals', { 
//         user_uuid: user_id, 
//         sheet_uuid: sheetId || null 
//       }),
      
//       // Monthly totals
//       supabase.rpc('get_monthly_totals', { 
//         user_uuid: user_id, 
//         sheet_uuid: sheetId || null 
//       }),
      
//       // Daily totals for current month (if month filter provided)
//       month ? supabase
//         .from('expenses')
//         .select('date, amount')
//         .eq('user_id', user_id)
//         .eq('sheet_id', sheetId || '')
//         .gte('date', `${month}-01`)
//         .lte('date', `${month}-31`)
//         : Promise.resolve({ data: [], error: null })
//     ])

//     // Process daily totals
//     let dailyTotals = {}
//     if (dailyTotalsResult.data) {
//       dailyTotals = dailyTotalsResult.data.reduce((acc: any, expense: any) => {
//         const date = new Date(expense.date)
//         const day = `${date.getDate()} ${date.toLocaleDateString('en', { month: 'short' })}`
//         acc[day] = (acc[day] || 0) + Number(expense.amount)
//         return acc
//       }, {})
//     }

//     // Calculate current and previous month totals
//     const now = new Date()
//     const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
//     const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1)
//     const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

//     const [currentMonthResult, prevMonthResult] = await Promise.all([
//       supabase.rpc('get_current_month_total', { 
//         user_uuid: user_id, 
//         sheet_uuid: sheetId || null 
//       }),
//       supabase.rpc('get_previous_month_total', { 
//         user_uuid: user_id, 
//         sheet_uuid: sheetId || null 
//       })
//     ])

//     return NextResponse.json({
//       categoryTotals: categoryTotalsResult.data?.reduce((acc: any, item: any) => {
//         acc[item.category] = Number(item.total)
//         return acc
//       }, {}) || {},
      
//       monthlyTotals: monthlyTotalsResult.data?.reduce((acc: any, item: any) => {
//         acc[item.month] = Number(item.total)
//         return acc
//       }, {}) || {},
      
//       dailyTotals,
      
//       currentMonthTotal: Number(currentMonthResult.data || 0),
//       previousMonthTotal: Number(prevMonthResult.data || 0),
      
//       filters: { sheetId, month, year }
//     })

//   } catch (error) {
//     console.error('Analytics API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }
