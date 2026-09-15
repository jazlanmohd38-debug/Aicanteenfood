import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available_quantity: number;
  created_at: string;
}

export interface SalesRecord {
  id: string;
  date: string;
  food_item_id: string;
  quantity_prepared: number;
  quantity_sold: number;
  quantity_wasted: number;
  day_of_week: string;
  is_holiday: boolean;
  is_college_event: boolean;
  weather_condition: string;
  special_occasion: string;
  created_at: string;
}

export interface SalesWithItem extends SalesRecord {
  food_items?: { name: string; category: string };
}
