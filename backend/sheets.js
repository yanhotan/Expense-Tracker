import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/sheets - Get all expense sheets for a user (user_id is fixed for demo)
router.get('/', async (req, res) => {
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase
    .from('expense_sheets')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data: data || [] });
});

// GET /api/sheets/:id - Get a single sheet by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase
    .from('expense_sheets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user_id)
    .single();
  if (error) return res.status(404).json({ error: 'Sheet not found' });
  res.json(data);
});

// POST /api/sheets - Create a new sheet
router.post('/', async (req, res) => {
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { id, name, pin, has_pin, created_at } = req.body;
  const newSheet = {
    id: id || undefined, // allow client to provide id for sync
    name,
    pin: pin || null,
    has_pin: !!pin || has_pin,
    created_at: created_at || new Date().toISOString(),
    user_id
  };
  const { data, error } = await supabase
    .from('expense_sheets')
    .insert(newSheet)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.status(201).json(data);
});

// PUT /api/sheets/:id - Update a sheet (e.g., rename)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase
    .from('expense_sheets')
    .update({ name })
    .eq('id', id)
    .eq('user_id', user_id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json(data);
});

// POST /api/sheets/:id/verify-pin - Verify PIN for a sheet
router.post('/:id/verify-pin', async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase
    .from('expense_sheets')
    .select('pin')
    .eq('id', id)
    .eq('user_id', user_id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Sheet not found' });
  const valid = data.pin === pin;
  res.json({ valid });
});

export default router;
