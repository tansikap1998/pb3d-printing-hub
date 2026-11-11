-- Orders are now created, read and updated only by the Next.js server
-- (/api/orders, /api/orders/[id], /api/orders/[id]/slip, /api/admin/orders*)
-- using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
--
-- The browser (anon key) therefore needs no access to `orders` or to the
-- payment slips at all. Closing it:
--   * stops anyone listing every order (customer names, phones, addresses);
--   * makes the order UUID something only its customer knows;
--   * stops anyone marking another customer's order as paid or replacing their slip
--     (the two issues found in review of 02_orders_update_policy.sql).

-- ── orders ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public insert on orders"          ON orders;
DROP POLICY IF EXISTS "Allow public select on orders by id"    ON orders;
DROP POLICY IF EXISTS "Customer can submit payment slip"       ON orders;

REVOKE ALL ON orders FROM anon, authenticated;
-- RLS stays enabled with no policies for anon/authenticated → no rows visible.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ── payment slips: private bucket, no public policies ───────────────────────
DROP POLICY IF EXISTS "Public upload payment slips"  ON storage.objects;
DROP POLICY IF EXISTS "Public replace payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Public read payment slips"    ON storage.objects;

-- Create the bucket if it does not exist yet, and make sure it is private.
-- Admins see slips through short-lived signed URLs from /api/admin/orders.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_slips', 'payment_slips', false)
ON CONFLICT (id) DO UPDATE SET public = false;
