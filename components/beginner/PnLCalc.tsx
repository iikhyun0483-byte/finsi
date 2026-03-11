"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { formatKRW, formatPercent } from "@/lib/utils";

export function PnLCalc() {
  const [buyPrice, setBuyPrice] = useState(10000);
  const [quantity, setQuantity] = useState(10);
  const [currentPrice, setCurrentPrice] = useState(11000);

  const totalCost = buyPrice * quantity;
  const currentValue = currentPrice * quantity;
  const profit = currentValue - totalCost;
  const profitPercent = ((currentPrice - buyPrice) / buyPrice) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 수익률 계산기</CardTitle>
        <p className="text-xs text-gray-400 mt-1">Profit & Loss Calculator</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">매수가 (원)</label>
              <input
                type="text"
                value={buyPrice}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, '');
                  setBuyPrice(parseInt(numericValue, 10) || 0);
                }}
                onFocus={(e) => e.target.select()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">수량</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, '');
                  setQuantity(parseInt(numericValue, 10) || 0);
                }}
                onFocus={(e) => e.target.select()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">현재가 (원)</label>
            <input
              type="text"
              value={currentPrice}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, '');
                setCurrentPrice(parseInt(numericValue, 10) || 0);
              }}
              onFocus={(e) => e.target.select()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">총 매수금액</span>
              <span className="text-white">{formatKRW(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">현재 평가액</span>
              <span className="text-white">{formatKRW(currentValue)}</span>
            </div>
            <div className="h-px bg-gray-800 my-2" />
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">손익</span>
              <div className="text-right">
                <div
                  className={`text-lg font-bold ${
                    profit >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatKRW(profit)}
                </div>
                <div
                  className={`text-sm ${
                    profit >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatPercent(profitPercent)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
