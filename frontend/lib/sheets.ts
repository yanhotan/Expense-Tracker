"use client"

import { sheetsApi } from './api'
import type { ExpenseSheet } from './types'

// Helper function to determine if we're in a build/SSR context
const isServerRendering = () => {
  return typeof window === 'undefined' && process.env.NODE_ENV === 'production';
}

// Get all available expense sheets from Spring Boot backend
export async function getExpenseSheets(): Promise<ExpenseSheet[]> {
  if (isServerRendering()) {
    return [];
  }

  try {
    console.log('Fetching sheets from Spring Boot backend...');
    const response = await sheetsApi.getAll();
    
    const sheets = (response.data || []).map((sheet: any) => ({
      id: sheet.id,
      name: sheet.name,
      pin: sheet.pin || null,
      has_pin: sheet.hasPin || false,
      created_at: sheet.createdAt || sheet.created_at,
      user_id: sheet.userId || sheet.user_id || '00000000-0000-0000-0000-000000000000'
    }));

    console.log(`✅ Fetched ${sheets.length} sheets from Spring Boot backend`);
    return sheets;
  } catch (error) {
    console.error('❌ Error fetching sheets from Spring Boot backend:', error);
    return [];
  }
}

// Update an existing expense sheet's name
export async function updateSheetName(sheetId: string, newName: string): Promise<boolean> {
  if (isServerRendering()) {
    return false;
  }

  try {
    console.log(`Updating sheet ${sheetId} name to "${newName}"`);
    await sheetsApi.update(sheetId, { name: newName });
    console.log('✅ Sheet name updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating sheet name:', error);
    return false;
  }
}

// Create a new expense sheet
export async function createExpenseSheet(sheet: { name: string; pin?: string }): Promise<ExpenseSheet | null> {
  if (isServerRendering()) {
    return null;
  }

  try {
    console.log('Creating new sheet:', sheet.name);
    const response = await sheetsApi.create(sheet);
    
    if (response.data) {
      const newSheet: ExpenseSheet = {
        id: response.data.id,
        name: response.data.name,
        pin: response.data.pin || null,
        has_pin: response.data.hasPin || response.data.has_pin || false,
        created_at: response.data.createdAt || response.data.created_at,
        user_id: response.data.userId || response.data.user_id || '00000000-0000-0000-0000-000000000000'
      };
      
      console.log('✅ Sheet created successfully:', newSheet.id);
      return newSheet;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error creating sheet:', error);
    return null;
  }
}

// Verify PIN for an expense sheet
export async function verifySheetPin(sheetId: string, pin: string): Promise<boolean> {
  if (isServerRendering()) {
    return false;
  }

  try {
    // Get the sheet and verify PIN locally
    const sheets = await getExpenseSheets();
    const sheet = sheets.find(s => s.id === sheetId);
    
    if (!sheet) {
      console.warn('Sheet not found:', sheetId);
      return false;
    }
    
    return sheet.pin === pin;
  } catch (error) {
    console.error('❌ Error verifying PIN:', error);
    return false;
  }
}

// Retrieve the last accessed sheet ID from localStorage
export function getLastAccessedSheet(): string | null {
  if (isServerRendering()) return null;
  
  try {
    const lastSheetId = localStorage.getItem('expense-tracker-last-sheet');
    return lastSheetId;
  } catch (e) {
    console.error('Error getting last accessed sheet:', e);
    return null;
  }
}

// Save the last accessed sheet ID to localStorage
export function setLastAccessedSheet(sheetId: string): void {
  if (isServerRendering()) return;
  
  try {
    localStorage.setItem('expense-tracker-last-sheet', sheetId);
  } catch (e) {
    console.error('Error setting last accessed sheet:', e);
  }
}

// Get a specific sheet by ID from localStorage (for backward compatibility)
export function getLocalSheetById(sheetId: string): ExpenseSheet | null {
  // This is a legacy function - prefer using getExpenseSheets() and filtering
  console.warn('getLocalSheetById is deprecated. Use getExpenseSheets() instead.');
  return null;
}
