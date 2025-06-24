import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Log that descriptions.js loaded
console.log('Descriptions router initialized, SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set (hidden)' : 'Not set');

// GET /api/descriptions - Get descriptions from column_descriptions table
router.get('/', async (req, res) => {
  try {
    const { sheetId, expenseId, columnName } = req.query;
    const user_id = '00000000-0000-0000-0000-000000000000'; // Default user for demo
    
    console.log(`Fetching column descriptions for sheetId=${sheetId}, expenseId=${expenseId}, columnName=${columnName}`);
    
    // Query the column_descriptions table
    let query = supabase
      .from('column_descriptions')
      .select('id, expense_id, column_name, description');
      // Apply filters if specified
    if (expenseId) {
      query = query.eq('expense_id', expenseId);
    }
    
    if (columnName) {
      query = query.eq('column_name', columnName);
    }
    
    // If sheet ID is provided, we need to join with expenses table
    if (sheetId) {
      // First get all expense IDs for this sheet
      const { data: expenseIds, error: expenseError } = await supabase
        .from('expenses')
        .select('id')
        .eq('sheet_id', sheetId);
      
      if (expenseError) {
        console.error('Error fetching expense IDs:', expenseError);
        return res.status(500).json({ error: 'Database error fetching expenses' });
      }
      
      // Then filter descriptions by these expense IDs
      if (expenseIds && expenseIds.length > 0) {
        const ids = expenseIds.map(e => e.id);
        query = query.in('expense_id', ids);
      } else {
        // No expenses for this sheet, return empty array
        return res.json({ data: [] });
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching descriptions:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log(`Found ${data?.length || 0} column descriptions`);
      // Format the response to match the expected structure
    const formattedData = data?.map(desc => ({
      id: desc.id,
      expense_id: desc.expense_id,
      column_name: desc.column_name,
      description: desc.description
    })) || [];
    
    res.json({ data: formattedData });
  } catch (err) {
    console.error('Unexpected error in GET /descriptions:', err);
    res.status(500).json({ error: 'Unexpected error' });
  }
});

// POST /api/descriptions - Save description to column_descriptions table
router.post('/', async (req, res) => {
  try {
    const { expense_id, description, column_name = 'notes' } = req.body;
    const user_id = '00000000-0000-0000-0000-000000000000'; // Default user for demo
    
    if (!expense_id) {
      return res.status(400).json({ error: 'Missing expense_id' });
    }
    
    console.log(`Saving description for expense ${expense_id}: "${description}", column: ${column_name}`);
    
    // First check if this expense exists
    const { data: existingExpense, error: expenseError } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', expense_id)
      .single();
      
    if (expenseError || !existingExpense) {
      console.error('Error finding expense:', expenseError);
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    // Check if a description already exists for this expense and column
    const { data: existingDesc, error: descError } = await supabase
      .from('column_descriptions')
      .select('id')
      .eq('expense_id', expense_id)
      .eq('column_name', column_name)
      .maybeSingle();
    
    let result;
    
    if (existingDesc) {
      // Update existing description
      result = await supabase
        .from('column_descriptions')
        .update({ 
          description,
          user_id
        })
        .eq('id', existingDesc.id)
        .select('id, expense_id, column_name, description')
        .single();
    } else {
      // Insert new description
      result = await supabase
        .from('column_descriptions')
        .insert({ 
          expense_id,
          column_name,
          description, 
          user_id
        })
        .select('id, expense_id, column_name, description')
        .single();
    }
    
    if (result.error) {
      console.error('Error saving description:', result.error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ data: result.data });
  } catch (err) {
    console.error('Unexpected error in POST /descriptions:', err);
    res.status(500).json({ error: 'Unexpected error' });
  }
});

// DELETE /api/descriptions/expense/:expenseId - Delete description by expense ID
router.delete('/expense/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    
    console.log(`Deleting description for expense ${expenseId}`);
    
    // Option to filter by column_name as well
    const columnName = req.query.columnName;
    let query = supabase
      .from('column_descriptions')
      .delete()
      .eq('expense_id', expenseId);
      
    // Apply column name filter if provided
    if (columnName) {
      query = query.eq('column_name', columnName);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting description:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /descriptions/expense/:expenseId:', err);
    res.status(500).json({ error: 'Unexpected error' });
  }
});

// DELETE /api/descriptions/:id - Delete description by description ID
// This must come after the more specific route above
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Make sure this isn't trying to match the 'expense' route pattern
    if (id === 'expense') {
      return res.status(400).json({ error: 'Invalid description ID' });
    }
    
    console.log(`Deleting description with ID ${id}`);
    
    const { error } = await supabase
      .from('column_descriptions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting description:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /descriptions/:id:', err);
    res.status(500).json({ error: 'Unexpected error' });
  }
});

export default router;
