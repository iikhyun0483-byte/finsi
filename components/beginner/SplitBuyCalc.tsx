"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { formatKRW } from "@/lib/utils";

export function SplitBuyCalc() {
  const [totalAmount, setTotalAmount] = useState(1000000);
  const [splits, setSplits] = useState(3);

  const perSplit = Math.floor(totalAmount / splits);
  const schedule = Array.from({ length: splits }, (_, i) => ({
    week: i + 1,
    amount: perSplit,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 분할 매수 계산기</CardTitle>
        <p className="text-xs text-gray-400 mt-1">Split Purchase Calculator</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-2 block">총 투자 금액 (원)</label>
            <input
              type="text"
              value={totalAmount}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, '');
                setTotalAmount(parseInt(numericValue, 10) || 0);
              }}
              onFocus={(e) => e.target.select()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">분할 횟수</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={splits === n ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSplits(n)}
                >
                  {n}회
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-3">분할 매수 스케줄</div>
            <div className="space-y-2">
              {schedule.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{s.week}주차</span>
                  <span className="font-bold text-white">{formatKRW(s.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between">
              <span className="text-xs text-gray-500">총 투자액</span>
              <span className="text-sm font-bold text-blue-400">
                {formatKRW(totalAmount)}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 leading-relaxed">
            💡 분할 매수는 평균 단가를 낮추고 리스크를 분산하는 전략입니다.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
