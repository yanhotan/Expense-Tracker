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
  if (month) query = query.ilike('date', `${month}-%`); // YYYY-MM
  if (year) query = query.ilike('date', `${year}-%`);
  if (limit) query = query.limit(Number(limit));
  if (offset) query = query.range(Number(offset), Number(offset) + Number(limit) - 1);
  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data: data || [], count: count || 0, filters: req.query });
});

// POST /api/expenses - Create new expense
router.post('/', async (req, res) => {
  const expense = req.body;
  const { data, error } = await supabase.from('expenses').insert(expense).select().single();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.status(201).json({ data });
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data });
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

export default router;
