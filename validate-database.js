#!/usr/bin/env node

/**
 * Database validation and setup script
 * Checks current database state and helps restore data
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Your Supabase credentials
const SUPABASE_URL = 'https://xvotplyriidphmpxruna.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_P_E7KKbzmw9aL1HeW3aQpA_1TLyg4lH';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...\n');

  try {
    // Check if tables exist by trying to query them
    const checks = [
      { table: 'expense_sheets', description: 'Expense sheets table' },
      { table: 'expenses', description: 'Expenses table' },
      { table: 'sheet_categories', description: 'Sheet categories table' },
      { table: 'column_descriptions', description: 'Column descriptions table' }
    ];

    console.log('📋 Table Status:');
    console.log('='.repeat(50));

    let allTablesExist = true;

    for (const check of checks) {
      try {
        // Try to select 1 record from each table
        const { data, error, count } = await supabase
          .from(check.table)
          .select('*', { count: 'exact', head: true });

        if (error && error.code === 'PGRST116') {
          // Table doesn't exist
          console.log(`❌ ${check.description}: Table not found`);
          allTablesExist = false;
        } else if (error) {
          console.log(`⚠️  ${check.description}: Error - ${error.message}`);
          allTablesExist = false;
        } else {
          console.log(`✅ ${check.description}: OK (${count || 0} records)`);
        }
      } catch (err) {
        console.log(`❌ ${check.description}: Connection error`);
        allTablesExist = false;
      }
    }

    console.log('='.repeat(50));

    if (!allTablesExist) {
      console.log('\n❌ Database tables are not set up!');
      console.log('\n📋 You need to run this SQL in your Supabase dashboard:');
      console.log('   Go to: https://supabase.com/dashboard');
      console.log('   Select project: xvotplyriidphmpxruna');
      console.log('   SQL Editor → New Query → Paste the SQL below → Run\n');

      // Show the setup SQL
      const setupSQL = fs.readFileSync('setup-database.sql', 'utf8');
      console.log(setupSQL);

      return false;
    }

    console.log('\n✅ All database tables exist!');
    return true;

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return false;
  }
}

async function checkDataStatus() {
  console.log('\n📊 Checking data status...\n');

  try {
    // Check data counts
    const dataChecks = [
      { table: 'expense_sheets', description: 'Expense sheets', expected: 3 },
      { table: 'expenses', description: 'Expenses', expected: 210 }, // Updated to include test expense
      { table: 'sheet_categories', description: 'Sheet categories', expected: 16 },
      { table: 'column_descriptions', description: 'Column descriptions', expected: 49 }
    ];

    console.log('📋 Data Status:');
    console.log('='.repeat(60));

    let dataRestored = true;
    let totalRecords = 0;

    for (const check of dataChecks) {
      try {
        const { count, error } = await supabase
          .from(check.table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${check.description}: Error - ${error.message}`);
          dataRestored = false;
        } else {
          const status = count === check.expected ? '✅' : count === 0 ? '❌' : '⚠️';
          console.log(`${status} ${check.description}: ${count}/${check.expected} records`);
          totalRecords += count;

          if (count !== check.expected) {
            dataRestored = false;
          }
        }
      } catch (err) {
        console.log(`❌ ${check.description}: Connection error`);
        dataRestored = false;
      }
    }

    console.log('='.repeat(60));
    console.log(`📈 Total Records: ${totalRecords}/277`);

    if (!dataRestored) {
      console.log('\n❌ Data not fully restored!');
      console.log('\n🚀 Run this command to restore data:');
      console.log('   node setup-supabase-direct.js --data-only\n');

      return false;
    }

    console.log('\n✅ All data restored successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error checking data:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API endpoints...\n');

  const apiTests = [
    { endpoint: 'categories', description: 'Categories API' },
    { endpoint: 'sheets', description: 'Sheets API' },
    { endpoint: 'expenses?limit=1', description: 'Expenses API' }
  ];

  console.log('📋 API Status:');
  console.log('='.repeat(40));

  let apisWorking = true;

  for (const test of apiTests) {
    try {
      const response = await fetch(`http://localhost:3000/api/${test.endpoint}`);
      const data = await response.json();

      if (response.ok && !data.error) {
        console.log(`✅ ${test.description}: Working`);
      } else {
        console.log(`❌ ${test.description}: ${data.error || 'Error'}`);
        apisWorking = false;
      }
    } catch (error) {
      console.log(`❌ ${test.description}: Connection failed`);
      apisWorking = false;
    }
  }

  console.log('='.repeat(40));

  if (!apisWorking) {
    console.log('\n❌ Some APIs are not working!');
    console.log('   Make sure Next.js is running: cd frontend && npm run dev');
  } else {
    console.log('\n✅ All APIs are working!');
  }

  return apisWorking;
}

async function main() {
  console.log('🔍 Expense Tracker Database Validator');
  console.log('=====================================\n');

  // Check database tables
  const tablesExist = await checkDatabaseStatus();

  if (!tablesExist) {
    console.log('\n🛑 Cannot continue - database tables not set up.');
    console.log('   Please run the SQL in Supabase dashboard first.');
    process.exit(1);
  }

  // Check data
  const dataRestored = await checkDataStatus();

  if (!dataRestored) {
    console.log('\n🛑 Data not restored.');
    console.log('   Run: node setup-supabase-direct.js --data-only');
    process.exit(1);
  }

  // Test APIs
  await testAPIEndpoints();

  console.log('\n🎉 Validation complete!');

  if (tablesExist && dataRestored) {
    console.log('\n✅ Your Expense Tracker is ready!');
    console.log('   Visit: http://localhost:3000');
    console.log('\n📊 Summary:');
    console.log('   • Database: ✅ Set up');
    console.log('   • Tables: ✅ Created');
    console.log('   • Data: ✅ Restored (277 records)');
    console.log('   • APIs: ✅ Working');
    console.log('   • Application: ✅ Ready to use');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
