import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/analytics - Example: return totals by category, month, day
router.get('/', async (req, res) => {
  // Hardcode user_id for demo/testing
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { sheetId, month, year } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'Missing sheetId' });
  // Get all expenses for the sheet and month/year
  let query = supabase.from('expenses').select('*').eq('sheet_id', sheetId).eq('user_id', user_id);
  if (month) query = query.ilike('date', `${month}-%`);
  if (year) query = query.ilike('date', `${year}-%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Database error' });
  // Calculate analytics
  const categoryTotals = {};
  const monthlyTotals = {};
  const dailyTotals = {};
  let currentMonthTotal = 0;
  let previousMonthTotal = 0;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  (data || []).forEach(exp => {
    // Category totals
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    // Monthly totals
    const ym = exp.date.slice(0, 7);
    monthlyTotals[ym] = (monthlyTotals[ym] || 0) + exp.amount;
    // Daily totals
    dailyTotals[exp.date] = (dailyTotals[exp.date] || 0) + exp.amount;
    // Current/previous month
    if (ym === thisMonth) currentMonthTotal += exp.amount;
    if (ym === prevMonth) previousMonthTotal += exp.amount;
  });
  // Also return unique categories for the sheet (from expenses)
  const categories = Array.from(new Set((data || []).map(exp => exp.category)));
  res.json({ categoryTotals, monthlyTotals, dailyTotals, currentMonthTotal, previousMonthTotal, categories, filters: req.query });
});

export default router;
