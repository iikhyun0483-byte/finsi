// lib/cashflow-storage.ts
import { createClient } from '@supabase/supabase-js'
import type { CashflowInput, CashflowResult } from './cashflow-engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface CashflowSnapshot {
  id: string
  snapshot_date: string
  net_cash: number
  liquidity_months: number
  net_worth: number
  input_data: CashflowInput
  result_data: Partial<CashflowResult>
}

export async function saveSnapshot(
  userId: string,
  input: CashflowInput,
  result: CashflowResult
): Promise<{ error: string | null }> {
  // result에서 함수 제거 (JSON 직렬화 불가)
  const { extraRepaymentEffect, ...resultData } = result

  const { error } = await supabase
    .from('cashflow_snapshots')
    .upsert({
      user_id: userId,
      snapshot_date: new Date().toISOString().split('T')[0],
      input_data: input,
      result_data: resultData,
      net_cash: result.monthly.netCash,
      liquidity_months: result.liquidity,
      net_worth: result.future[0]?.nominalNetWorth ?? 0,
    }, { onConflict: 'user_id,snapshot_date' })

  return { error: error?.message ?? null }
}

export async function loadHistory(userId: string): Promise<CashflowSnapshot[]> {
  const { data, error } = await supabase
    .from('cashflow_snapshots')
    .select('id, snapshot_date, net_cash, liquidity_months, net_worth, input_data, result_data')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(12)

  if (error || !data) return []
  return data as CashflowSnapshot[]
}

export async function loadLatest(userId: string): Promise<CashflowSnapshot | null> {
  const { data } = await supabase
    .from('cashflow_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  return data ?? null
}
