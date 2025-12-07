// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Try to load environment variables with absolute path
const envPath = resolve(process.cwd(), '.env.local');
console.log(`Looking for .env.local at: ${envPath}`);
if (existsSync(envPath)) {
  console.log('.env.local file found');
  dotenv.config({ path: envPath });
} else {
  console.log('.env.local file not found at the specified path');
  // Try relative path as fallback
  dotenv.config({ path: '.env.local' });
}

import { supabase, executeSetupScript } from './supabase';

async function main() {
  console.log('Starting database setup...');
  
  // Debug environment variables (redacting sensitive info)
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'is set' : 'is not set');
  console.log('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ? 'is set' : 'is not set');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
    console.error('Error: Required environment variables are missing.');
    console.log('Make sure your .env.local file has these variables set correctly:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.log('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key');
    process.exit(1);
  }
  
  const result = await executeSetupScript(supabase);
  
  if (result.success) {
    console.log('Database setup completed successfully!');
  } else {
    console.error('Database setup failed:', result.error);
  }
}

main().catch(console.error);