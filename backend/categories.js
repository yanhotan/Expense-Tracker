import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/categories - Get all unique categories for a sheet (from expenses table)
router.get('/', async (req, res) => {
  const user_id = '00000000-0000-0000-0000-000000000000';
  const { sheetId } = req.query;
  let query = supabase.from('expenses').select('category').eq('user_id', user_id);
  if (sheetId) query = query.eq('sheet_id', sheetId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Database error' });
  // Return unique categories only, sorted (matching Next.js behavior)
  const categories = Array.from(new Set((data || []).map(e => e.category))).filter(Boolean).sort();
  res.json({ data: categories });
});

export default router;
