import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/descriptions - Get all descriptions for a sheet or expense
router.get('/', async (req, res) => {
  const { sheetId, expenseId } = req.query;
  let query = supabase.from('column_descriptions').select('*');
  
  if (sheetId) {
    // Join with expenses to filter by sheet_id
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('id')
      .eq('sheet_id', sheetId);
    
    if (expError) return res.status(500).json({ error: 'Database error' });
    if (!expenses || !expenses.length) return res.json({ data: [] });
    
    const expenseIds = expenses.map(e => e.id);
    query = query.in('expense_id', expenseIds);
  }
  
  if (expenseId) {
    query = query.eq('expense_id', expenseId);
  }
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data: data || [] });
});

// POST /api/descriptions - Create or update description
router.post('/', async (req, res) => {
  const { expense_id, description } = req.body;
  if (!expense_id) return res.status(400).json({ error: 'Missing expense_id' });
  
  // Check if a description already exists
  const { data: existing, error: checkError } = await supabase
    .from('column_descriptions')
    .select('id')
    .eq('expense_id', expense_id)
    .maybeSingle();
  
  if (checkError) return res.status(500).json({ error: 'Database error' });
  
  let result;
  if (existing) {
    // Update existing
    result = await supabase
      .from('column_descriptions')
      .update({ description })
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    // Create new
    result = await supabase
      .from('column_descriptions')
      .insert({ expense_id, description })
      .select()
      .single();
  }
  
  if (result.error) return res.status(500).json({ error: 'Database error' });
  res.status(existing ? 200 : 201).json({ data: result.data });
});

// DELETE /api/descriptions/:id - Delete description
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('column_descriptions')
    .delete()
    .eq('id', id);
  
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ success: true });
});

// DELETE by expense ID
router.delete('/expense/:expenseId', async (req, res) => {
  const { expenseId } = req.params;
  const { error } = await supabase
    .from('column_descriptions')
    .delete()
    .eq('expense_id', expenseId);
  
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ success: true });
});

export default router;
