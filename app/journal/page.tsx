'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface JournalEntry {
  id: string;
  ticker: string;
  action: '매수' | '매도';
  price: number;
  quantity: number;
  total_amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ticker: '',
    action: '매수' as '매수' | '매도',
    price: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    const { data } = await supabase
      .from('trade_journal')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);

    if (data) {
      setEntries(data as JournalEntry[]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from('trade_journal').insert({
      ticker: formData.ticker.toUpperCase(),
      action: formData.action,
      price: parseFloat(formData.price),
      quantity: parseFloat(formData.quantity),
      date: formData.date,
      note: formData.note || null,
    });

    if (!error) {
      setIsModalOpen(false);
      setFormData({
        ticker: '',
        action: '매수',
        price: '',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
      });
      loadEntries();
    } else {
      alert('저장 실패: ' + error.message);
    }
  }

  // 수익률 계산 (단순화: 같은 종목 매수/매도 비교)
  function calculateReturns() {
    const byTicker: Record<string, { totalBuy: number; totalSell: number; qtyBuy: number; qtySell: number }> = {};

    entries.forEach((entry) => {
      if (!byTicker[entry.ticker]) {
        byTicker[entry.ticker] = { totalBuy: 0, totalSell: 0, qtyBuy: 0, qtySell: 0 };
      }

      if (entry.action === '매수') {
        byTicker[entry.ticker].totalBuy += entry.total_amount;
        byTicker[entry.ticker].qtyBuy += entry.quantity;
      } else {
        byTicker[entry.ticker].totalSell += entry.total_amount;
        byTicker[entry.ticker].qtySell += entry.quantity;
      }
    });

    let totalProfit = 0;

    Object.values(byTicker).forEach((ticker) => {
      totalProfit += ticker.totalSell - ticker.totalBuy;
    });

    const totalInvested = Object.values(byTicker).reduce((sum, t) => sum + t.totalBuy, 0);
    const returnRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return { totalProfit, returnRate };
  }

  const { totalProfit, returnRate } = calculateReturns();

  return (
    <div className="min-h-screen bg-[#000a06] text-white p-6 relative">
      {/* 배경 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,180,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,180,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-radial-gradient opacity-50" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 헤더 */}
        <div className="jarvis-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-orbitron font-bold nexus-gradient-text mb-2">투자 일지</h1>
              <p className="text-sm text-gray-400 font-mono">매수/매도 기록 & 수익률 자동 계산</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="jarvis-button px-6 py-3 rounded font-orbitron"
            >
              + 거래 추가
            </button>
          </div>

          {/* 수익률 요약 */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-[rgba(0,10,8,0.6)] border border-[rgba(0,255,180,0.1)] rounded p-4">
              <div className="text-xs text-gray-400 mb-1 font-mono">총 손익</div>
              <div className={`text-2xl font-orbitron font-bold ${totalProfit >= 0 ? 'text-[#00FF88]' : 'text-[#FF4466]'}`}>
                ${totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
              </div>
            </div>
            <div className="bg-[rgba(0,10,8,0.6)] border border-[rgba(0,255,180,0.1)] rounded p-4">
              <div className="text-xs text-gray-400 mb-1 font-mono">총 수익률</div>
              <div className={`text-2xl font-orbitron font-bold ${returnRate >= 0 ? 'text-[#00FF88]' : 'text-[#FF4466]'}`}>
                {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* 거래 목록 */}
        <div className="jarvis-card p-6">
          <h2 className="text-xl font-orbitron mb-4 nexus-gradient-text">거래 내역</h2>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>아직 거래 기록이 없습니다.</p>
                <p className="text-sm mt-2">첫 거래를 추가해보세요!</p>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-[rgba(0,10,8,0.5)] border border-[rgba(0,255,180,0.08)] rounded p-4 hover:border-[rgba(0,255,180,0.2)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded text-xs font-orbitron ${
                        entry.action === '매수'
                          ? 'bg-[rgba(0,255,136,0.1)] text-[#00FF88] border border-[rgba(0,255,136,0.3)]'
                          : 'bg-[rgba(255,68,102,0.1)] text-[#FF4466] border border-[rgba(255,68,102,0.3)]'
                      }`}>
                        {entry.action}
                      </div>
                      <div>
                        <div className="font-orbitron text-lg text-[#00FFD1]">{entry.ticker}</div>
                        <div className="text-xs text-gray-500 font-mono">{entry.date}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm text-gray-400">
                        ${entry.price.toFixed(2)} × {entry.quantity}
                      </div>
                      <div className="font-orbitron text-lg text-white">
                        ${entry.total_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {entry.note && (
                    <div className="mt-3 pt-3 border-t border-[rgba(0,255,180,0.05)]">
                      <p className="text-sm text-gray-400 font-mono">{entry.note}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
            <div className="jarvis-card p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-orbitron mb-6 nexus-gradient-text">거래 추가</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">종목 코드</label>
                  <input
                    type="text"
                    value={formData.ticker}
                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                    className="jarvis-input w-full px-4 py-2"
                    placeholder="SPY, BTC 등"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">행동</label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value as '매수' | '매도' })}
                    className="jarvis-input w-full px-4 py-2"
                  >
                    <option value="매수">매수</option>
                    <option value="매도">매도</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-2">가격 ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="jarvis-input w-full px-4 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-2">수량</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="jarvis-input w-full px-4 py-2"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">날짜</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="jarvis-input w-full px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">메모 (선택)</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="jarvis-input w-full px-4 py-2 h-24 resize-none"
                    placeholder="거래 이유, 전략 등"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="jarvis-button flex-1 py-3 rounded font-orbitron"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded border border-[rgba(0,255,180,0.3)] text-gray-400 hover:text-white transition-all"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
