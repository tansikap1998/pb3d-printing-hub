-- ⚠️ SUPERSEDED by 03_orders_server_only.sql — always run 03 after this file.
-- Review found that this policy still let any visitor mark another customer's
-- order as paid / replace their slip, because order ids were publicly readable.
-- 03 removes all browser access to orders and slips instead.
--
-- UPDATE rules for `orders`.
--
-- Admins sign in with NextAuth, not Supabase Auth, so to Supabase every browser
-- request (customer or admin) is the `anon` role. A permissive UPDATE policy
-- would therefore let anyone edit any order. Instead:
--   * the browser (anon) may only submit a payment slip on its own pending order;
--   * admin status / tracking changes go through /api/admin/orders/[id], which
--     checks the NextAuth session and uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

-- 1) Column-level privileges: the browser can only ever touch these two columns.
REVOKE UPDATE ON orders FROM anon, authenticated;
GRANT UPDATE (status, slip_url) ON orders TO anon, authenticated;

-- 2) Row-level rule: only from pending (or re-sending a slip), only to awaiting_verification.
DROP POLICY IF EXISTS "Customer can submit payment slip" ON orders;
CREATE POLICY "Customer can submit payment slip" ON orders
  FOR UPDATE TO anon, authenticated
  USING (status IN ('pending', 'awaiting_verification'))
  WITH CHECK (status = 'awaiting_verification' AND slip_url IS NOT NULL);

-- 3) Storage: slip uploads use upsert (re-upload replaces the file), which needs
--    INSERT + UPDATE on storage.objects for the payment_slips bucket.
DROP POLICY IF EXISTS "Public upload payment slips" ON storage.objects;
CREATE POLICY "Public upload payment slips" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment_slips');

DROP POLICY IF EXISTS "Public replace payment slips" ON storage.objects;
CREATE POLICY "Public replace payment slips" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'payment_slips')
  WITH CHECK (bucket_id = 'payment_slips');

DROP POLICY IF EXISTS "Public read payment slips" ON storage.objects;
CREATE POLICY "Public read payment slips" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment_slips');
