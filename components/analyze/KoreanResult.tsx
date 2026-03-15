import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPercent } from "@/lib/design-system";

interface KoreanResultProps {
  result: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    per?: number;
    pbr?: number;
    market: string;
    category: string;
  };
}

export function KoreanResult({ result }: KoreanResultProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-[#00d4ff]" />
        <h2 className="font-orbitron text-xl font-bold text-[#00d4ff]">
          {result.name} ({result.symbol})
        </h2>
        <span className="font-mono text-sm text-[rgba(255,255,255,0.4)]">
          {result.market}
        </span>
      </div>

      {/* 가격 정보 */}
      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="label-display mb-2">PRICE</div>
              <div className="number-display text-2xl">
                ₩{result.price?.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="label-display mb-2">CHANGE</div>
              <div className={`font-orbitron text-2xl font-bold flex items-center gap-1 ${
                result.changePercent > 0 ? 'status-profit' :
                result.changePercent < 0 ? 'status-loss' :
                'text-[rgba(255,255,255,0.4)]'
              }`}>
                {result.changePercent > 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : result.changePercent < 0 ? (
                  <TrendingDown className="w-5 h-5" />
                ) : null}
                {Math.abs(result.change)?.toLocaleString()}
                <span className="text-sm">
                  ({formatPercent(Math.abs(result.changePercent))})
                </span>
              </div>
            </div>
            <div>
              <div className="label-display mb-2">VOLUME</div>
              <div className="font-orbitron text-xl font-semibold text-white">
                {result.volume?.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="label-display mb-2">CATEGORY</div>
              <div className="font-orbitron text-xl font-semibold status-cyan">
                {result.category}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 펀더멘털 (ETF 제외) */}
      {result.category !== 'ETF' && (
        <Card>
          <CardHeader>
            <CardTitle>💎 펀더멘털</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">PER (배)</div>
                <div className="text-xl font-bold">
                  {result.per && result.per > 0 ? result.per.toFixed(2) : 'N/A'}
                </div>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">PBR (배)</div>
                <div className="text-xl font-bold">
                  {result.pbr && result.pbr > 0 ? result.pbr.toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-gray-300">
              💡 네이버 금융 기준 펀더멘털 데이터 (실시간)
            </div>
          </CardContent>
        </Card>
      )}

      {result.category === 'ETF' && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent>
            <div className="text-center py-6">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-lg font-semibold text-blue-400 mb-2">
                ETF (상장지수펀드)
              </div>
              <div className="text-sm text-gray-400">
                ETF는 여러 종목의 포트폴리오이므로 개별 재무제표가 없습니다
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
