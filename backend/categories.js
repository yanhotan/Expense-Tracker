import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/categories - Get all categories for a sheet
router.get('/', async (req, res) => {
  const { sheetId } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'Missing sheetId' });
  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .eq('sheet_id', sheetId);
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data: (data || []).map(c => c.name) });
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  const { sheetId, category } = req.body;
  if (!sheetId || !category) return res.status(400).json({ error: 'Missing sheetId or category' });
  const { data, error } = await supabase
    .from('categories')
    .insert({ sheet_id: sheetId, name: category })
    .select('name')
    .single();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.status(201).json({ data: data.name });
});

// PUT /api/categories - Update category name
router.put('/', async (req, res) => {
  const { sheetId, oldName, newName } = req.body;
  if (!sheetId || !oldName || !newName) return res.status(400).json({ error: 'Missing params' });
  const { data, error } = await supabase
    .from('categories')
    .update({ name: newName })
    .eq('sheet_id', sheetId)
    .eq('name', oldName)
    .select('name')
    .single();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data: data.name });
});

// DELETE /api/categories - Delete category
router.delete('/', async (req, res) => {
  const { sheetId, category } = req.body;
  if (!sheetId || !category) return res.status(400).json({ error: 'Missing params' });
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('sheet_id', sheetId)
    .eq('name', category);
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ success: true });
});

export default router;
