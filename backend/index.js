import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import expensesRouter from './expenses.js';
import categoriesRouter from './categories.js';
import analyticsRouter from './analytics.js';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/sheets - Get all expense sheets for a user (user_id from query for demo)
app.get('/api/sheets', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabase
    .from('expense_sheets')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Database error' });
  res.json({ data: data || [] });
});

// POST /api/sheets - Create new sheet
app.post('/api/sheets', async (req, res) => {
  const { name, pin, user_id } = req.body;
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' });
  const newSheet = {
    name,
    pin: pin || null,
    has_pin: !!pin,
    user_id
  };
  const { data, error } = await supabase
    .from('expense_sheets')
    .insert(newSheet)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Database error' });
  res.status(201).json({ data });
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/analytics', analyticsRouter);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}/api`);
});
