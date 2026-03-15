import { Card, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { ChevronRight } from "lucide-react";
import { CATEGORIES, getStocksByCategory } from "@/lib/korean-stocks";

type MarketType = 'global' | 'crypto' | 'korean';

interface SearchInputProps {
  marketType: MarketType;
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  koreanCategory: string;
  koreanCode: string;
  onKoreanCategoryChange: (category: string) => void;
  onKoreanCodeChange: (code: string) => void;
  loading: boolean;
  onAnalyze: () => void;
}

export function SearchInput({
  marketType,
  symbol,
  onSymbolChange,
  koreanCategory,
  koreanCode,
  onKoreanCategoryChange,
  onKoreanCodeChange,
  loading,
  onAnalyze,
}: SearchInputProps) {
  return (
    <Card className="mb-8">
      <CardContent>
        {marketType === 'korean' ? (
          <>
            <div className="flex gap-3 mb-3">
              <select
                value={koreanCategory}
                onChange={(e) => {
                  onKoreanCategoryChange(e.target.value);
                  onKoreanCodeChange("");
                }}
                className="jarvis-input px-4 py-3 font-orbitron"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={koreanCode}
                onChange={(e) => onKoreanCodeChange(e.target.value)}
                className="flex-1 jarvis-input px-4 py-3 font-orbitron"
              >
                <option value="">종목 선택</option>
                {getStocksByCategory(koreanCategory).map(stock => (
                  <option key={stock.code} value={stock.code}>
                    {stock.name} ({stock.code})
                  </option>
                ))}
              </select>
              <Button onClick={onAnalyze} disabled={loading || !koreanCode}>
                {loading ? "⚙️ 분석 중..." : "🔍 분석하기"}
              </Button>
            </div>
            <div className="mt-3 font-mono text-xs text-[rgba(0,212,255,0.5)] tracking-wide">
              <ChevronRight className="w-3 h-3 inline mr-1" />
              NAVER FINANCE REAL-TIME (5MIN CACHE)
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-3">
              <input
                type="text"
                value={symbol}
                onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && onAnalyze()}
                onFocus={(e) => e.target.select()}
                placeholder={
                  marketType === 'crypto'
                    ? "CRYPTO CODE (BTC, ETH, SOL...)"
                    : "SYMBOL (SPY, QQQ, AAPL...)"
                }
                className="flex-1 jarvis-input px-4 py-3 font-orbitron"
              />
              <Button onClick={onAnalyze} disabled={loading || !symbol}>
                {loading ? "⚙️ 분석 중..." : "🔍 분석하기"}
              </Button>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              {marketType === 'crypto'
                ? "💡 지원: BTC, ETH, SOL, XRP, BNB (실시간 데이터)"
                : "💡 지원: SPY, QQQ, AAPL, TSLA, GLD, SLV, USO, TLT (실시간 데이터)"}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
