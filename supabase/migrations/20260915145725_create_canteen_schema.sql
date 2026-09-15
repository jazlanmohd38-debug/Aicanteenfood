/*
# Create Canteen Food Demand Predictor Schema

## Overview
Creates two tables for a single-tenant canteen management app (no auth/sign-in).
The app predicts daily food demand based on historical sales data.

## New Tables

### 1. food_items
- `id` (uuid, primary key)
- `name` (text, not null) — e.g. "Idli", "Dosa"
- `category` (text, not null) — e.g. "Breakfast", "Lunch", "Snacks", "Beverages"
- `price` (numeric, not null) — price per unit
- `available_quantity` (integer, default 0) — current available quantity
- `created_at` (timestamptz, default now())

### 2. sales_data
- `id` (uuid, primary key)
- `date` (date, not null) — the date of the sale
- `food_item_id` (uuid, FK to food_items.id ON DELETE CASCADE)
- `quantity_prepared` (integer, not null) — how many were prepared
- `quantity_sold` (integer, not null) — how many were sold
- `quantity_wasted` (integer, not null) — how many were wasted
- `day_of_week` (text, not null) — Monday, Tuesday, etc.
- `is_holiday` (boolean, default false)
- `is_college_event` (boolean, default false)
- `weather_condition` (text, default 'Sunny') — Sunny, Rainy, Cloudy, Cold
- `special_occasion` (text, default '') — e.g. "Annual Day", or empty
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on both tables.
- Anon + authenticated have full CRUD (single-tenant, no sign-in screen).
- `USING (true)` is acceptable because the data is intentionally shared/public.

## Notes
1. Indexes on sales_data.date and sales_data.food_item_id for query performance.
2. Unique constraint on (date, food_item_id) to prevent duplicate entries per day.
*/

CREATE TABLE IF NOT EXISTS food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  price numeric(10,2) NOT NULL DEFAULT 0,
  available_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_food_items" ON food_items;
CREATE POLICY "anon_select_food_items" ON food_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_food_items" ON food_items;
CREATE POLICY "anon_insert_food_items" ON food_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_food_items" ON food_items;
CREATE POLICY "anon_update_food_items" ON food_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_food_items" ON food_items;
CREATE POLICY "anon_delete_food_items" ON food_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS sales_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  food_item_id uuid NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  quantity_prepared integer NOT NULL DEFAULT 0,
  quantity_sold integer NOT NULL DEFAULT 0,
  quantity_wasted integer NOT NULL DEFAULT 0,
  day_of_week text NOT NULL,
  is_holiday boolean NOT NULL DEFAULT false,
  is_college_event boolean NOT NULL DEFAULT false,
  weather_condition text NOT NULL DEFAULT 'Sunny',
  special_occasion text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sales_data" ON sales_data;
CREATE POLICY "anon_select_sales_data" ON sales_data FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sales_data" ON sales_data;
CREATE POLICY "anon_insert_sales_data" ON sales_data FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sales_data" ON sales_data;
CREATE POLICY "anon_update_sales_data" ON sales_data FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sales_data" ON sales_data;
CREATE POLICY "anon_delete_sales_data" ON sales_data FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sales_data_date ON sales_data(date);
CREATE INDEX IF NOT EXISTS idx_sales_data_food_item_id ON sales_data(food_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_data_date_food_item ON sales_data(date, food_item_id);
