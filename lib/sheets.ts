"use client"

import { supabase, getCurrentUserId } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export interface ExpenseSheet {
  id: string
  name: string
  pin: string | null
  has_pin: boolean
  created_at: string
  user_id?: string
}

// Helper function to determine if we're in a build/SSR context
const isServerRendering = () => {
  return typeof window === 'undefined' && process.env.NODE_ENV === 'production';
}

// Fallback to localStorage during build process or when Supabase fails
const getLocalSheets = (): ExpenseSheet[] => {
  if (typeof window === "undefined") return [];
  
  try {
    const sheets: ExpenseSheet[] = [];
    
    // Scan localStorage for sheet entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("expense-tracker-sheet-")) {
        try {
          const sheetData = JSON.parse(localStorage.getItem(key) || "{}");
          
          // Make sure we have a valid ID
          if (!sheetData.id) {
            console.warn("Sheet missing ID:", key);
            return;
          }
          
          sheets.push({ 
            id: sheetData.id,
            name: sheetData.name || key.replace("expense-tracker-sheet-", ""),
            pin: sheetData.pin || null,
            has_pin: sheetData.hasPin || false,
            created_at: sheetData.created || new Date().toISOString(),
            user_id: sheetData.user_id || 'local-user'
          });
          
          console.log(`Loaded sheet from localStorage: ${sheetData.name || key.replace("expense-tracker-sheet-", "")} (${sheetData.id})`);
        } catch (e) {
          console.error("Failed to parse sheet data", e);
        }
      }
    });
    
    return sheets;
  } catch (e) {
    console.warn("Failed to get sheets from localStorage:", e);
    return [];
  }
}

// Get a specific sheet by ID from localStorage
export function getLocalSheetById(sheetId: string): ExpenseSheet | null {
  if (typeof window === "undefined") return null;
  
  try {
    const key = `expense-tracker-sheet-${sheetId}`;
    const sheetDataStr = localStorage.getItem(key);
    
    if (!sheetDataStr) {
      // If no specific entry, try scanning all sheets
      const sheets = getLocalSheets();
      return sheets.find(sheet => sheet.id === sheetId) || null;
    }
    
    const sheetData = JSON.parse(sheetDataStr);
    return { 
      id: sheetData.id,
      name: sheetData.name || key.replace("expense-tracker-sheet-", ""),
      pin: sheetData.pin || null,
      has_pin: sheetData.hasPin || false,
      created_at: sheetData.created || new Date().toISOString(),
      user_id: sheetData.user_id || 'local-user'
    };
  } catch (e) {
    console.warn(`Failed to get sheet ${sheetId} from localStorage:`, e);
    return null;
  }
}

// Retrieve the last accessed sheet ID from localStorage
export function getLastAccessedSheet(): string | null {
  if (isServerRendering()) return null
  
  try {
    const lastSheetId = localStorage.getItem('expense-tracker-last-sheet')
    console.log('Retrieved last accessed sheet ID:', lastSheetId)
    return lastSheetId
  } catch (e) {
    console.error('Error getting last accessed sheet:', e)
    return null
  }
}

// Save the last accessed sheet ID to localStorage
export function setLastAccessedSheet(sheetId: string): void {
  if (isServerRendering()) return
  
  try {
    localStorage.setItem('expense-tracker-last-sheet', sheetId)
    console.log('Set last accessed sheet ID to:', sheetId)
  } catch (e) {
    console.error('Error setting last accessed sheet:', e)
  }
}

// Get all available expense sheets
export async function getExpenseSheets(): Promise<ExpenseSheet[]> {
  const allSheets: ExpenseSheet[] = []
  const user_id = await getCurrentUserId()
  console.log('Getting expense sheets for user_id:', user_id)
  
  // First, try to retrieve sheets from Supabase if user is authenticated
  if (user_id !== 'anonymous' && !isServerRendering()) {
    try {
      const { data, error } = await supabase
        .from('expense_sheets')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        console.log('Found sheets in Supabase:', data.length)
        allSheets.push(...data)
      } else if (error) {
        console.warn('Error fetching sheets from Supabase:', error)
      }
    } catch (e) {
      console.error('Exception while fetching sheets from Supabase:', e)
    }
  }
  
  // Then get any sheets from localStorage (both for anonymous users and as backup)
  if (!isServerRendering()) {
    try {
      const localSheets: ExpenseSheet[] = []
      const localStorage_keys = Object.keys(localStorage)
      
      // Filter keys that match our pattern for expense sheets
      const sheetKeys = localStorage_keys.filter(key => key.startsWith('expense-tracker-sheet-'))
      console.log('Found sheet keys in localStorage:', sheetKeys.length)
      
      // Process all found sheet keys
      for (const key of sheetKeys) {
        try {
          const sheetData = localStorage.getItem(key)
          if (sheetData) {
            const parsedData = JSON.parse(sheetData)
            // Convert the localStorage format to ExpenseSheet format
            const sheet: ExpenseSheet = {
              id: parsedData.id,
              name: parsedData.name,
              pin: parsedData.pin,
              has_pin: !!parsedData.pin || parsedData.hasPin,
              created_at: parsedData.created || new Date().toISOString(),
              user_id: parsedData.user_id || 'anonymous'
            }
            
            // Only include sheets for the current user
            if (sheet.user_id === user_id || sheet.user_id === 'anonymous') {
              console.log('Adding sheet from localStorage:', sheet.name)
              localSheets.push(sheet)
            }
          }
        } catch (parseError) {
          console.error('Error parsing sheet data from localStorage key', key, parseError)
        }
      }
      
      // Merge with Supabase data, avoiding duplicates
      for (const localSheet of localSheets) {
        if (!allSheets.some(s => s.id === localSheet.id)) {
          allSheets.push(localSheet)
        }
      }
    } catch (localError) {
      console.error('Error fetching sheets from localStorage:', localError)
    }
  }
  
  console.log('Total sheets found:', allSheets.length)
  return allSheets
}

// Save a consistent format in localStorage to fix sheet detection
export async function createExpenseSheet(sheet: { name: string; pin?: string }): Promise<ExpenseSheet | null> {
  // Get the current authenticated user ID
  const user_id = await getCurrentUserId();
  console.log('Creating sheet with user_id:', user_id);
  
  // During SSR or build, don't try to save
  if (isServerRendering()) {
    return null;
  }

  const newSheet = {
    id: uuidv4(),
    name: sheet.name,
    pin: sheet.pin || null,
    has_pin: !!sheet.pin,
    created_at: new Date().toISOString(),
    user_id
  };
  
  console.log('New sheet data prepared:', {...newSheet, pin: newSheet.pin ? '****' : null});

  // Always save to localStorage first as a backup - use consistent format with what getLocalSheets reads
  try {
    localStorage.setItem(`expense-tracker-sheet-${newSheet.id}`, JSON.stringify({
      id: newSheet.id,
      name: sheet.name,
      pin: sheet.pin || null,
      hasPin: !!sheet.pin,
      created: newSheet.created_at,
      user_id
    }));
    
    // Also save this as the last accessed sheet
    setLastAccessedSheet(newSheet.id);
    console.log('Sheet saved to localStorage and set as last accessed');
  } catch (localError) {
    console.error('Failed to save to localStorage:', localError);
  }

  // Then try saving to Supabase if configured
  if (user_id !== 'anonymous') {
    try {
      console.log('Attempting to insert into Supabase expense_sheets table');
      const { data, error } = await supabase
        .from('expense_sheets')
        .insert(newSheet)
        .select()
        .single();

      if (error) {
        console.warn('Supabase error creating sheet:', error);
        return newSheet;  // Return the localStorage version
      }

      console.log('Sheet created successfully in Supabase:', data);
      return data;
    } catch (error) {
      console.error('Exception while creating sheet:', error);
      return newSheet;  // Return the localStorage version
    }
  }
  
  return newSheet;  // Return the localStorage version for anonymous users
}

// Verify PIN for an expense sheet
export async function verifySheetPin(sheetId: string, pin: string): Promise<boolean> {
  // During SSR or build, don't try to verify
  if (isServerRendering()) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('expense_sheets')
      .select('pin')
      .eq('id', sheetId)
      .single();

    if (error) {
      console.warn('Supabase error, falling back to localStorage:', error);
      // Try localStorage
      const sheets = getLocalSheets();
      const sheet = sheets.find(s => s.id === sheetId);
      return sheet?.pin === pin;
    }

    return data?.pin === pin;
  } catch (error) {
    console.warn('Failed to verify PIN in Supabase, using localStorage fallback:', error);
    // Try localStorage
    const sheets = getLocalSheets();
    const sheet = sheets.find(s => s.id === sheetId);
    return sheet?.pin === pin;
  }
}