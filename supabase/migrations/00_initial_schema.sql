-- PB3D E-Commerce Platform Phase 1 Database Schema

-- 1. Orders Table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, awaiting_verification, confirmed, printing, shipped, delivered, cancelled
  
  -- Customer Info
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  
  -- Print Details
  file_name TEXT NOT NULL,
  file_url TEXT, -- URL from Supabase Storage
  technology TEXT NOT NULL,
  material TEXT NOT NULL,
  color TEXT NOT NULL,
  infill INTEGER NOT NULL,
  layer_height NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  
  -- Pricing & Estimate
  volume_cm3 NUMERIC,
  weight_g NUMERIC,
  print_time_min INTEGER,
  base_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  
  -- Payment & Delivery
  payment_method TEXT,
  slip_url TEXT, -- URL from Supabase Storage
  tracking_number TEXT
);

-- 2. Consent Logs (PDPA)
CREATE TABLE consent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  necessary_accepted BOOLEAN DEFAULT true,
  analytics_accepted BOOLEAN DEFAULT false,
  marketing_accepted BOOLEAN DEFAULT false
);

-- 3. Pricing Configuration (For Admin)
CREATE TABLE pricing_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material TEXT UNIQUE NOT NULL,
  price_per_gram NUMERIC NOT NULL,
  setup_fee NUMERIC NOT NULL DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Pricing
INSERT INTO pricing_config (material, price_per_gram, setup_fee) VALUES
  ('PLA', 2.0, 50),
  ('PETG', 2.5, 50),
  ('ABS', 3.0, 60),
  ('TPU', 4.0, 60),
  ('CarbonFiber', 5.0, 100)
ON CONFLICT (material) DO NOTHING;

-- Row Level Security (RLS) Policies
-- (For local dev/initial setup, you can disable RLS or set basic policies)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert orders
CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT TO public WITH CHECK (true);
-- Allow anonymous users to view their own order by ID (implicit via knowlegde of ID)
CREATE POLICY "Allow public select on orders by id" ON orders FOR SELECT TO public USING (true);

-- Allow anonymous users to insert consent logs
CREATE POLICY "Allow public insert on consent logs" ON consent_logs FOR INSERT TO public WITH CHECK (true);

-- Pricing config is readable by everyone, but only modifiable by admins
CREATE POLICY "Allow public read pricing_config" ON pricing_config FOR SELECT TO public USING (true);
