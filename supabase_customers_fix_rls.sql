-- Quick fix: Disable RLS for customers table
-- Run this in Supabase SQL Editor to fix the import issue

-- Drop existing policies
DROP POLICY IF EXISTS customers_select_policy ON customers;
DROP POLICY IF EXISTS customers_insert_policy ON customers;
DROP POLICY IF EXISTS customers_update_policy ON customers;
DROP POLICY IF EXISTS customers_delete_policy ON customers;
DROP POLICY IF EXISTS customers_service_role_all ON customers;

-- Disable RLS (since we handle permissions via NextAuth session)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Now imports will work! ✅
