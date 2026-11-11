-- Shopee product links shown on the home page with a "สั่งซื้อ" button.
-- Writes go through /api/shopee-products using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS),
-- so the public role only gets read access to active products.

CREATE TABLE IF NOT EXISTS shopee_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  price NUMERIC,
  image_url TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS shopee_products_active_sort_idx ON shopee_products (active, sort_order);

ALTER TABLE shopee_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active shopee_products" ON shopee_products;
CREATE POLICY "Public read active shopee_products" ON shopee_products
  FOR SELECT TO public USING (active = true);
