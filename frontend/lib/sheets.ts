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
  
  let databaseSuccess = false;
  
  // First, try to retrieve sheets from Supabase if user is authenticated
  if (user_id !== '00000000-0000-0000-0000-000000000000' && !isServerRendering()) {
    try {
      console.log('Attempting to fetch sheets from Supabase database...');
      const { data, error } = await supabase
        .from('expense_sheets')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Error fetching sheets from Supabase:', error);
      } else if (data) {
        console.log('Successfully fetched sheets from Supabase:', data.length);
        
        // Clear any stale sheet data in localStorage to avoid conflicts
        if (data.length > 0) {
          try {
            const existingLocalSheetKeys = Object.keys(localStorage)
              .filter(key => key.startsWith('expense-tracker-sheet-'));
            
            existingLocalSheetKeys.forEach(key => localStorage.removeItem(key));
            console.log(`Cleared ${existingLocalSheetKeys.length} stale sheet entries from localStorage`);
          } catch (e) {
            console.warn('Error clearing localStorage sheets:', e);
          }
        }
        
        // Store sheets in localStorage as backup
        data.forEach(sheet => {
          try {
            localStorage.setItem(`expense-tracker-sheet-${sheet.id}`, JSON.stringify({
              id: sheet.id,
              name: sheet.name,
              pin: sheet.pin || null,
              hasPin: sheet.has_pin,
              created: sheet.created_at,
              user_id: sheet.user_id
            }));
            console.log(`Synced sheet ${sheet.name} (${sheet.id}) to localStorage`);
          } catch (e) {
            console.warn(`Failed to sync sheet ${sheet.id} to localStorage:`, e);
          }
        });
        
        // Add all database sheets to our result array
        allSheets.push(...data);
        databaseSuccess = true;
      }
    } catch (e) {
      console.error('Exception while fetching sheets from Supabase:', e)
    }
  } else {
    console.log('Skipping database fetch - no authenticated user or server rendering');
  }
  
  // If database fetch failed or we're in server rendering, try localStorage
  if (!databaseSuccess || isServerRendering()) {
    try {
      console.log('Falling back to localStorage for sheets data');
      const localSheets: ExpenseSheet[] = []
      const localStorage_keys = Object.keys(localStorage)
      
      // Filter keys that match our pattern for expense sheets
      const sheetKeys = localStorage_keys.filter(key => key.startsWith('expense-tracker-sheet-'));
      console.log('Found sheet keys in localStorage:', sheetKeys.length);
      
      // Process all found sheet keys
      for (const key of sheetKeys) {
        try {
          const sheetData = localStorage.getItem(key);
          if (sheetData) {
            const parsedData = JSON.parse(sheetData);
            // Convert the localStorage format to ExpenseSheet format
            const sheet: ExpenseSheet = {
              id: parsedData.id,
              name: parsedData.name,
              pin: parsedData.pin,
              has_pin: !!parsedData.pin || parsedData.hasPin,
              created_at: parsedData.created || new Date().toISOString(),
              user_id: parsedData.user_id || '00000000-0000-0000-0000-000000000000'
            };
            
            // Only include sheets for the current user
            if (sheet.user_id === user_id || sheet.user_id === '00000000-0000-0000-0000-000000000000') {
              console.log('Adding sheet from localStorage:', sheet.name);
              localSheets.push(sheet);
              
              // If database fetch failed, try to sync this local sheet to the database
              if (!databaseSuccess && user_id !== '00000000-0000-0000-0000-000000000000') {
                (async () => {
                  try {
                    const { data, error } = await supabase
                      .from('expense_sheets')
                      .select('id')
                      .eq('id', sheet.id)
                      .maybeSingle();
                    
                    if (error) {
                      console.warn(`Error checking if sheet ${sheet.id} exists in database:`, error);
                      return;
                    }
                    
                    // If sheet doesn't exist in the database, sync it
                    if (!data) {
                      console.log(`Sheet ${sheet.id} not found in database, syncing...`);
                      const { error: insertError } = await supabase
                        .from('expense_sheets')
                        .insert({
                          id: sheet.id,
                          name: sheet.name,
                          pin: sheet.pin,
                          has_pin: sheet.has_pin,
                          created_at: sheet.created_at,
                          user_id: user_id
                        });
                        
                      if (insertError) {
                        console.warn(`Error syncing local sheet ${sheet.id} to database:`, insertError);
                      } else {
                        console.log(`Successfully synced local sheet ${sheet.name} to database`);
                      }
                    }
                  } catch (e) {
                    console.error(`Exception syncing sheet ${sheet.id} to database:`, e);
                  }
                })();
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing sheet data from localStorage key', key, parseError);
        }
      }
      
      // Merge with database data, avoiding duplicates
      for (const localSheet of localSheets) {
        if (!allSheets.some(s => s.id === localSheet.id)) {
          allSheets.push(localSheet);
        }
      }
    } catch (localError) {
      console.error('Error fetching sheets from localStorage:', localError);
    }
  }
  
  console.log('Total sheets found:', allSheets.length);
  return allSheets;
}

// Update an existing expense sheet's name
export async function updateSheetName(sheetId: string, newName: string): Promise<boolean> {
  // During SSR or build, don't try to update
  if (isServerRendering()) {
    return false;
  }

  // Get the current authenticated user ID
  const user_id = await getCurrentUserId();
  console.log(`Updating sheet ${sheetId} name to "${newName}", user: ${user_id}`);
  
  let dbSuccess = false;
  let localSuccess = false;

  // Update in Supabase with retry mechanism
  if (user_id !== '00000000-0000-0000-0000-000000000000') {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !dbSuccess) {
      try {
        console.log(`Attempt ${retryCount + 1} to update sheet name in database`);
        
        // First check if the sheet exists and belongs to the user
        const { data: sheetData, error: checkError } = await supabase
          .from('expense_sheets')
          .select('*')
          .eq('id', sheetId)
          .single();
        
        if (checkError) {
          console.warn(`Error checking sheet existence (attempt ${retryCount + 1}):`, checkError);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        console.log('Found sheet in database:', sheetData ? 'yes' : 'no');
        
        // If sheet exists, update it
        if (sheetData) {
          const { error: updateError } = await supabase
            .from('expense_sheets')
            .update({ name: newName })
            .eq('id', sheetId);

          if (updateError) {
            console.warn(`Error updating sheet name (attempt ${retryCount + 1}):`, updateError);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.log('Sheet name updated successfully in database');
            dbSuccess = true;
            break;
          }
        } else {
          // Sheet not found in database, try to insert it
          console.log('Sheet not found in database, creating it');
          
          // Get sheet data from localStorage
          const key = `expense-tracker-sheet-${sheetId}`;
          const sheetDataStr = localStorage.getItem(key);
          
          if (sheetDataStr) {
            const localSheetData = JSON.parse(sheetDataStr);
            
            // Create the sheet in the database
            const { error: insertError } = await supabase
              .from('expense_sheets')
              .insert({
                id: sheetId,
                name: newName, // Use the new name
                pin: localSheetData.pin || null,
                has_pin: !!localSheetData.pin || localSheetData.hasPin || false,
                created_at: localSheetData.created || new Date().toISOString(),
                user_id: user_id
              });
              
            if (insertError) {
              console.warn(`Error inserting sheet into database (attempt ${retryCount + 1}):`, insertError);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.log('Sheet created successfully in database');
              dbSuccess = true;
              break;
            }
          } else {
            console.warn('Sheet not found in localStorage either');
            retryCount++;
          }
        }
      } catch (error) {
        console.error(`Exception while updating sheet name (attempt ${retryCount + 1}):`, error);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } else {
    console.warn('Cannot update database: no authenticated user');
  }

  // Always update localStorage regardless of database result
  try {
    const key = `expense-tracker-sheet-${sheetId}`;
    const sheetDataStr = localStorage.getItem(key);
    
    if (sheetDataStr) {
      const sheetData = JSON.parse(sheetDataStr);
      sheetData.name = newName;
      localStorage.setItem(key, JSON.stringify(sheetData));
      console.log('Sheet name updated in localStorage');
      localSuccess = true;
    } else {
      console.warn('Sheet not found in localStorage');
    }
  } catch (localError) {
    console.error('Error updating sheet name in localStorage:', localError);
  }

  // If at least one update method succeeded
  return dbSuccess || localSuccess;
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

  // Always save to localStorage first as a backup
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
    
    // Initialize default categories for this sheet in localStorage
    const defaultCategories = ["food", "accessories", "transport", "investment", "others"];
    localStorage.setItem(`expense-tracker-categories-${newSheet.id}`, JSON.stringify(defaultCategories));
    console.log('Default categories saved for new sheet');
    
  } catch (localError) {
    console.error('Failed to save to localStorage:', localError);
  }

  // Then try saving to Supabase with retry logic
  let savedSheet = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1} to insert into Supabase expense_sheets table`);
      const { data, error } = await supabase
        .from('expense_sheets')
        .insert(newSheet)
        .select();

      if (error) {
        console.warn(`Supabase error creating sheet (attempt ${retryCount + 1}):`, error);
        retryCount++;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      console.log('Sheet created successfully in Supabase:', data?.[0]?.id);
      savedSheet = data?.[0];
      break;
    } catch (error) {
      console.error(`Exception while creating sheet (attempt ${retryCount + 1}):`, error);
      retryCount++;
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // If saved to Supabase successfully, try to store the default categories in the sheet_categories table
  if (savedSheet) {
    try {
      const defaultCategories = [
        { sheet_id: savedSheet.id, category: "food", display_order: 1 },
        { sheet_id: savedSheet.id, category: "accessories", display_order: 2 },
        { sheet_id: savedSheet.id, category: "transport", display_order: 3 },
        { sheet_id: savedSheet.id, category: "investment", display_order: 4 },
        { sheet_id: savedSheet.id, category: "others", display_order: 5 }
      ];
      
      const { error } = await supabase
        .from('sheet_categories')
        .insert(defaultCategories);
        
      if (error) {
        console.warn('Error adding default categories to database:', error);
        // Categories will still be available from localStorage
      } else {
        console.log('Default categories saved to database');
      }
    } catch (catError) {
      console.error('Exception while saving categories:', catError);
    }
    
    return savedSheet;
  }
  
  return newSheet;  // Return the localStorage version if database save failed
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