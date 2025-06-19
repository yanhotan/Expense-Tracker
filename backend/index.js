import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import expensesRouter from './expenses.js';
import categoriesRouter from './categories.js';
import analyticsRouter from './analytics.js';
import sheetsRouter from './sheets.js';

const app = express();
const corsOptions = {
  origin: true, // Reflect request origin
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/sheets - Get all expense sheets for a user (user_id from query for demo)
app.get('/api/sheets', async (req, res) => {
  // Hardcode user_id for demo/testing
  const user_id = '00000000-0000-0000-0000-000000000000';
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
  // Hardcode user_id for demo/testing
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { name, pin } = req.body;
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
app.use('/api/sheets', sheetsRouter);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}/api`);
});
