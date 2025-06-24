import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/expenses - Get all expenses with filters
router.get('/', async (req, res) => {
  const { sheetId, month, year, limit, offset } = req.query;
  let query = supabase.from('expenses').select('*');
  if (sheetId) query = query.eq('sheet_id', sheetId);
  if (month) {
    // month is 'YYYY-MM'
    const [yearStr, mStr] = month.split('-');
    const start = `${yearStr}-${mStr}-01`;
    // Get last day of month
    const end = new Date(Number(yearStr), Number(mStr), 0).toISOString().slice(0, 10);
    query = query.gte('date', start).lte('date', end);
  }
  if (year) query = query.ilike('date', `${year}-%`);
  if (limit) query = query.limit(Number(limit));
  if (offset) query = query.range(Number(offset), Number(offset) + Number(limit) - 1);
  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data: data || [], count: count || 0, filters: req.query });
});

// POST /api/expenses - Create new expense
router.post('/', async (req, res) => {
  try {
    // Set default user_id if not provided and normalize date format
    const expense = {
      ...req.body,
      user_id: req.body.user_id || '00000000-0000-0000-0000-000000000000',
      // Ensure date is in YYYY-MM-DD format without time component
      date: req.body.date ? req.body.date.split('T')[0] : req.body.date
    };
    
    console.log('Creating expense with data:', expense);
      // Check if expense with this date and category already exists
    // Add extra logging to debug the issue
    console.log('Checking for existing expense with date:', expense.date, 
                'category:', expense.category, 
                'sheet_id:', expense.sheet_id);
                
    const { data: existingExpenses, error: checkError } = await supabase
      .from('expenses')
      .select('id, date, category, amount')
      .eq('date', expense.date)
      .eq('category', expense.category)
      .eq('sheet_id', expense.sheet_id);
      
    if (checkError) {
      console.error('Error checking for existing expense:', checkError);
    }
    
    // More detailed logging to see what's being returned
    console.log('Found existing expenses:', existingExpenses);
    
    // If expense already exists, return an error to prevent duplication
    if (existingExpenses && existingExpenses.length > 0) {
      console.warn('Expense already exists for this date and category:', existingExpenses[0]);
      return res.status(409).json({ 
        error: 'Duplicate expense', 
        details: 'An expense already exists for this date and category',
        data: existingExpenses[0]
      });
    }
    
    const { data, error } = await supabase.from('expenses').insert(expense).select().single();
    
    if (error) {
      console.error('Error creating expense:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    
    console.log('Expense created:', data);
    res.status(201).json({ data });
  } catch (err) {
    console.error('Unexpected error in POST /expenses:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Normalize date format in updates
    const updates = {
      ...req.body,
      // Ensure date is in YYYY-MM-DD format without time component
      date: req.body.date ? req.body.date.split('T')[0] : req.body.date
    };
    
    console.log('Updating expense ID:', id, 'with data:', updates);
    
    // Check if this would create a duplicate (same date and category, different ID)
    if (updates.date && updates.category) {
      const { data: existingExpense, error: checkError } = await supabase
        .from('expenses')
        .select('id')
        .eq('date', updates.date)
        .eq('category', updates.category)
        .eq('sheet_id', updates.sheet_id)
        .neq('id', id) // Not the current expense
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking for existing expense:', checkError);
      }
      
      // If another expense already exists with the same date and category, return an error
      if (existingExpense) {
        console.warn('Update would create duplicate expense:', existingExpense);
        return res.status(409).json({ 
          error: 'Duplicate expense', 
          details: 'Another expense already exists for this date and category',
          data: existingExpense
        });
      }
    }
    
    const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
    
    if (error) {
      console.error('Error updating expense:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    
    console.log('Expense updated:', data);
    res.json({ data });
  } catch (err) {
    console.error('Unexpected error in PUT /expenses/:id:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ success: true });
});

// POST /api/expenses/batch - Batch create
router.post('/batch', async (req, res) => {
  const { expenses } = req.body;
  const { data, error } = await supabase.from('expenses').insert(expenses).select();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.status(201).json({ data });
});

// GET /api/expenses/categories - Get all unique categories for a sheet (from expenses table)
router.get('/categories', async (req, res) => {
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { sheetId } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'Missing sheetId' });
  const { data, error } = await supabase
    .from('expenses')
    .select('category')
    .eq('sheet_id', sheetId)
    .eq('user_id', user_id);
  if (error) return res.status(500).json({ error: 'Database error' });
  // Return unique categories only
  const categories = Array.from(new Set((data || []).map(e => e.category)));
  res.json({ data: categories });
});

export default router;
