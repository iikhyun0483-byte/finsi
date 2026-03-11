import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 타입 정의
export interface Signal {
  id: string;
  symbol: string;
  name: string;
  asset_type: "stock" | "crypto" | "commodity" | "bond" | "reit";
  score: number;
  action: string;
  price: number;
  price_krw: number;
  layer1_score: number;
  layer2_score: number;
  layer3_score: number;
  rsi: number;
  macd: number;
  fear_greed: number;
  created_at: string;
  high_risk?: boolean;
}

export interface PriceHistory {
  id: string;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  created_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  created_at: string;
  updated_at: string;
}

export interface BacktestResult {
  id: string;
  strategy: string;
  symbol: string;
  period_years: number;
  initial_capital: number;
  final_value: number;
  total_return: number;
  cagr: number;
  mdd: number;
  sharpe_ratio: number;
  total_trades: number;
  win_rate: number;
  created_at: string;
}
