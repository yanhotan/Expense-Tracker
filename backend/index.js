import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import expensesRouter from './expenses.js';
import categoriesRouter from './categories.js';
import analyticsRouter from './analytics.js';
import sheetsRouter from './sheets.js';
import descriptionsRouter from './descriptions.js';

const app = express();
const corsOptions = {
  origin: true, // Reflect request origin
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Sheet routes are now handled by sheetsRouter (mounted below)
// Removed duplicate route handlers to avoid conflicts

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Debug endpoint to check database tables
app.get('/api/debug/tables', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      console.error('Error fetching tables:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Log environment variables for debugging
    console.log('ENV VARS:', {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Set (hidden)' : 'Not set',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set'
    });
    
    res.json({ tables: data, env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Set (hidden)' : 'Not set',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set'
    }});
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/sheets', sheetsRouter);
app.use('/api/descriptions', descriptionsRouter);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}/api`);
});
