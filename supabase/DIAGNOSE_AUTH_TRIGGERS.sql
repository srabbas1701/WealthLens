-- =============================================================================
-- Run this in Supabase SQL Editor to see what triggers exist on auth.users
-- =============================================================================

-- 1. List ALL triggers on auth.users (with the function each one calls)
SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  CASE t.tgtype::integer & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  CASE t.tgtype::integer & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
  END AS event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 2. If the query above returns any rows, run 014_fix_handle_new_user_trigger.sql
--    to drop all of them. Then run this again; result should be 0 rows.
