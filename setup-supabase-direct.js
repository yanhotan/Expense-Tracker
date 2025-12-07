#!/usr/bin/env node

/**
 * Direct Supabase database setup and data restoration
 * This script connects directly to Supabase and sets up the database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Your Supabase credentials
const SUPABASE_URL = 'https://xvotplyriidphmpxruna.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_P_E7KKbzmw9aL1HeW3aQpA_1TLyg4lH';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSQL(sql) {
  console.log('📡 Executing SQL...');
  try {
    // For complex operations, we'll need to use the REST API or RPC
    // For now, let's try a simpler approach - direct table operations

    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('CREATE EXTENSION'));

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE')) {
        // Handle CREATE TABLE statements
        console.log('🏗️  Creating table...');
        // Supabase doesn't allow direct DDL through the client
        // We'll need to do this through the dashboard
        console.log('⚠️  Table creation must be done through Supabase SQL Editor');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ SQL Error:', error);
    return false;
  }
}

async function setupTables() {
  console.log('🏗️  Setting up database tables...');
  console.log('⚠️  Please run the following SQL in your Supabase SQL Editor:');

  try {
    const setupSQL = fs.readFileSync('setup-database.sql', 'utf8');
    console.log('\n' + '='.repeat(50));
    console.log('COPY AND RUN THIS SQL IN SUPABASE SQL EDITOR:');
    console.log('='.repeat(50));
    console.log(setupSQL);
    console.log('='.repeat(50));
    console.log('');

    console.log('✅ After running the above SQL, run this script again with: node setup-supabase-direct.js --data-only');

    return false; // Return false to indicate tables need to be created first
  } catch (error) {
    console.error('❌ Error reading setup file:', error);
    return false;
  }
}

async function restoreData() {
  console.log('📦 Restoring your expense data...');

  try {
    // Read the data restoration script
    const dataSQL = fs.readFileSync('restore-data-complete.sql', 'utf8');

    // Parse INSERT statements
    const insertStatements = dataSQL
      .split('\n')
      .filter(line => line.trim().startsWith('INSERT INTO'))
      .map(line => line.trim());

    console.log(`Found ${insertStatements.length} INSERT statements`);

    // Process expense_sheets first
    const sheetInserts = insertStatements.filter(stmt => stmt.includes('expense_sheets'));
    console.log(`Creating ${sheetInserts.length} expense sheets...`);

    for (const insertSQL of sheetInserts) {
      // Parse the INSERT statement to extract values
      const match = insertSQL.match(/INSERT INTO public\.expense_sheets \(([^)]+)\) VALUES \(([^)]+)\)/);
      if (match) {
        const columns = match[1].split(',').map(col => col.trim());
        const values = match[2].split(',').map(val => {
          val = val.trim();
          if (val === 'NULL') return null;
          if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
          return val;
        });

        // Create object from columns and values
        const sheetData = {};
        columns.forEach((col, index) => {
          sheetData[col] = values[index];
        });

        console.log(`Creating sheet: ${sheetData.name}`);

        const { data, error } = await supabase
          .from('expense_sheets')
          .insert(sheetData)
          .select();

        if (error) {
          console.error('❌ Error creating sheet:', error);
        } else {
          console.log('✅ Created sheet:', data[0].id);
        }
      }
    }

    // Process expenses
    const expenseInserts = insertStatements.filter(stmt => stmt.includes('expenses'));
    console.log(`Creating ${expenseInserts.length} expenses...`);

    let successCount = 0;
    for (const insertSQL of expenseInserts) {
      const match = insertSQL.match(/INSERT INTO public\.expenses \(([^)]+)\) VALUES \(([^)]+)\)/);
      if (match) {
        const columns = match[1].split(',').map(col => col.trim());
        const values = match[2].split(',').map(val => {
          val = val.trim();
          if (val === 'NULL') return null;
          if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
          return val;
        });

        const expenseData = {};
        columns.forEach((col, index) => {
          expenseData[col] = values[index];
        });

        const { data, error } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select();

        if (error) {
          console.warn(`⚠️  Error creating expense: ${error.message}`);
        } else {
          successCount++;
          if (successCount % 50 === 0) {
            console.log(`✅ Created ${successCount} expenses...`);
          }
        }
      }
    }

    console.log(`✅ Successfully created ${successCount} expenses`);

    // Process other tables
    const otherInserts = insertStatements.filter(stmt =>
      !stmt.includes('expense_sheets') && !stmt.includes('expenses')
    );

    console.log(`Creating ${otherInserts.length} records for other tables...`);
    for (const insertSQL of otherInserts) {
      if (insertSQL.includes('sheet_categories')) {
        const match = insertSQL.match(/INSERT INTO public\.sheet_categories \(([^)]+)\) VALUES \(([^)]+)\)/);
        if (match) {
          const columns = match[1].split(',').map(col => col.trim());
          const values = match[2].split(',').map(val => {
            val = val.trim();
            if (val === 'NULL') return null;
            if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
            return val;
          });

          const categoryData = {};
          columns.forEach((col, index) => {
            categoryData[col] = values[index];
          });

          const { error } = await supabase
            .from('sheet_categories')
            .insert(categoryData);

          if (error) console.warn('⚠️  Error creating category:', error.message);
        }
      } else if (insertSQL.includes('column_descriptions')) {
        const match = insertSQL.match(/INSERT INTO public\.column_descriptions \(([^)]+)\) VALUES \(([^)]+)\)/);
        if (match) {
          const columns = match[1].split(',').map(col => col.trim());
          const values = match[2].split(',').map(val => {
            val = val.trim();
            if (val === 'NULL') return null;
            if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
            return val;
          });

          const descData = {};
          columns.forEach((col, index) => {
            descData[col] = values[index];
          });

          const { error } = await supabase
            .from('column_descriptions')
            .insert(descData);

          if (error) console.warn('⚠️  Error creating description:', error.message);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error restoring data:', error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dataOnly = args.includes('--data-only');

  console.log('🚀 Direct Supabase Database Setup');
  console.log('==================================\n');

  if (!dataOnly) {
    const tablesReady = await setupTables();
    if (!tablesReady) {
      console.log('📋 Please create the tables first, then run again with --data-only');
      return;
    }
  }

  const dataRestored = await restoreData();
  if (dataRestored) {
    console.log('\n🎉 Database setup and data restoration complete!');
    console.log('   Your Expense Tracker data is now available.');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start your frontend: cd frontend && npm run dev');
    console.log('   2. Visit http://localhost:3000');
    console.log('   3. You should see your expense sheets and data');
  } else {
    console.log('\n❌ Data restoration failed. Please check the errors above.');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
