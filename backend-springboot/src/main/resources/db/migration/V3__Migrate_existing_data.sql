-- Migration script to assign existing data to authenticated users
-- This script runs automatically during application startup
-- It assigns existing demo data to the first user who signs in with Google OAuth

-- This migration is handled by the application code, not raw SQL
-- See: com.expensetracker.service.DataMigrationService

-- Note: This migration only runs once when the first user signs in

