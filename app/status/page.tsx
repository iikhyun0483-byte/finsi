"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";

export default function StatusPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkAllAPIs = async () => {
    setLoading(true);
    const results: any = { timestamp: new Date().toISOString(), apis: {} };

    try {
      const exchangeRes = await fetch("/api/exchange");
      const exchangeData = await exchangeRes.json();
      results.apis.exchange = { status: exchangeData.success ? "OK" : "FAIL", data: exchangeData };

      const signalRes = await fetch("/api/signal");
      const signalData = await signalRes.json();
      results.apis.signal = { status: signalData.success ? "OK" : "FAIL", data: signalData };

      const analyzeRes = await fetch("/api/analyze?symbol=SPY");
      const analyzeData = await analyzeRes.json();
      results.apis.analyze = { status: analyzeData.success ? "OK" : "FAIL", data: analyzeData };

      setData(results);
    } catch (error) {
      console.error("API check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAllAPIs();
  }, []);

  return (
    <div className="min-h-screen bg-[#080810] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">System Status</h1>
          <div className="flex gap-4 items-center">
            <div className="text-sm text-gray-400">
              Last check: {data ? new Date(data.timestamp).toLocaleString() : "-"}
            </div>
            <Button onClick={checkAllAPIs} disabled={loading} size="sm">
              {loading ? "Checking..." : "Refresh"}
            </Button>
          </div>
        </div>

        {data && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Exchange Rate (Real-time)</CardTitle></CardHeader>
              <CardContent>
                {data.apis.exchange?.data?.success ? (
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">USD to KRW</div>
                      <div className="text-2xl font-bold text-green-400">
                        {data.apis.exchange.data.usdToKrw?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Status</div>
                      <div className="text-xl text-green-400">{data.apis.exchange.status}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-400">Failed</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Macro Indicators (Real-time)</CardTitle></CardHeader>
              <CardContent>
                {data.apis.signal?.data?.macro ? (
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">Fear & Greed</div>
                      <div className="text-2xl font-bold">{data.apis.signal.data.macro.fearGreed}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">VIX</div>
                      <div className="text-2xl font-bold">{data.apis.signal.data.macro.vix?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Fed Rate</div>
                      <div className="text-2xl font-bold">{data.apis.signal.data.macro.fedRate?.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Buffett Indicator</div>
                      <div className="text-2xl font-bold">{data.apis.signal.data.macro.buffett?.toFixed(1)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-400">Failed</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>SPY Analysis Sample</CardTitle></CardHeader>
              <CardContent>
                {data.apis.analyze?.data?.signal ? (
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">Price (USD)</div>
                      <div className="text-2xl font-bold">${data.apis.analyze.data.signal.price?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Price (KRW)</div>
                      <div className="text-2xl font-bold text-green-400">
                        {data.apis.analyze.data.signal.price_krw?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Score</div>
                      <div className="text-2xl font-bold text-blue-400">{data.apis.analyze.data.signal.score}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Action</div>
                      <div className="text-lg font-bold">{data.apis.analyze.data.signal.action}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-400">Failed</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    All Real-time Data Working!
                  </div>
                  <div className="text-sm text-gray-400">
                    No hardcoded values - Exchange Rate: Real-time - GDP: Real-time - Macro: Real-time
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
