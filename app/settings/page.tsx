"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";

interface Settings {
  signalThreshold: number;
  autoRefresh: boolean;
  notifications: boolean;
  refreshInterval: number; // 분 단위
}

const DEFAULT_SETTINGS: Settings = {
  signalThreshold: 75,
  autoRefresh: false,
  notifications: false,
  refreshInterval: 5,
};

export default function SettingsPage() {
  const [signalThreshold, setSignalThreshold] = useState(75);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [saved, setSaved] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    const savedSettings = localStorage.getItem("finsi_settings");
    if (savedSettings) {
      try {
        const settings: Settings = JSON.parse(savedSettings);
        setSignalThreshold(settings.signalThreshold);
        setAutoRefresh(settings.autoRefresh);
        setNotifications(settings.notifications);
        setRefreshInterval(settings.refreshInterval || 5);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  // 설정 저장
  const saveSettings = () => {
    const settings: Settings = {
      signalThreshold,
      autoRefresh,
      notifications,
      refreshInterval,
    };

    localStorage.setItem("finsi_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // 데이터 내보내기
  const exportData = () => {
    const portfolio = localStorage.getItem("finsi_portfolio") || "[]";
    const watchlist = localStorage.getItem("finsi_watchlist") || "[]";
    const settings = localStorage.getItem("finsi_settings") || "{}";

    const exportData = {
      portfolio: JSON.parse(portfolio),
      watchlist: JSON.parse(watchlist),
      settings: JSON.parse(settings),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finsi-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 데이터 가져오기
  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);

          if (data.portfolio) {
            localStorage.setItem("finsi_portfolio", JSON.stringify(data.portfolio));
          }
          if (data.watchlist) {
            localStorage.setItem("finsi_watchlist", JSON.stringify(data.watchlist));
          }
          if (data.settings) {
            localStorage.setItem("finsi_settings", JSON.stringify(data.settings));
          }

          alert("데이터를 성공적으로 가져왔습니다. 페이지를 새로고침하세요.");
          window.location.reload();
        } catch (error) {
          alert("데이터 가져오기 실패: 올바른 JSON 파일이 아닙니다.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // 모든 데이터 삭제
  const deleteAllData = () => {
    if (
      confirm(
        "⚠️ 모든 데이터를 삭제하시겠습니까?\n\n포트폴리오, 관심 종목, 설정이 모두 삭제됩니다.\n이 작업은 되돌릴 수 없습니다."
      )
    ) {
      localStorage.removeItem("finsi_portfolio");
      localStorage.removeItem("finsi_watchlist");
      localStorage.removeItem("finsi_settings");
      alert("모든 데이터가 삭제되었습니다. 페이지를 새로고침하세요.");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">SYSTEM SETTINGS</div>
          <h1 className="text-2xl font-bold">⚙️ 설정</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* 신호 설정 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📊 투자 신호 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  매수 신호 기준 점수 (현재: {signalThreshold}점)
                </label>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={signalThreshold}
                  onChange={(e) => setSignalThreshold(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50점 (공격적)</span>
                  <span>75점 (권장)</span>
                  <span>90점 (보수적)</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  자동 새로고침 주기 (현재: {refreshInterval}분)
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full accent-blue-500"
                  disabled={!autoRefresh}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1분 (매우 빠름)</span>
                  <span>5분 (권장)</span>
                  <span>30분 (느림)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🔔 알림 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold mb-1">자동 새로고침</div>
                  <div className="text-xs text-gray-400">
                    5분마다 자동으로 신호 업데이트
                  </div>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-14 h-8 rounded-full transition-colors ${
                    autoRefresh ? "bg-blue-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full transition-transform ${
                      autoRefresh ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold mb-1">푸시 알림</div>
                  <div className="text-xs text-gray-400">
                    중요 신호 발생 시 알림
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-14 h-8 rounded-full transition-colors ${
                    notifications ? "bg-blue-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full transition-transform ${
                      notifications ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 표시 설정 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🎨 표시 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">테마</label>
                <div className="text-xs text-gray-500">
                  현재: 다크모드 (라이트모드는 추후 지원 예정)
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">언어</label>
                <div className="text-xs text-gray-500">
                  현재: 한국어 (영어는 추후 지원 예정)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 데이터 관리 */}
        <Card>
          <CardHeader>
            <CardTitle>💾 데이터 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="secondary" onClick={exportData} className="w-full">
                📥 데이터 내보내기 (JSON)
              </Button>
              <div className="text-xs text-gray-500 -mt-2 ml-1">
                포트폴리오, 관심 종목, 설정을 JSON 파일로 다운로드
              </div>

              <Button variant="secondary" onClick={importData} className="w-full">
                📤 데이터 가져오기 (JSON)
              </Button>
              <div className="text-xs text-gray-500 -mt-2 ml-1">
                이전에 내보낸 JSON 파일을 업로드
              </div>

              <Button variant="danger" onClick={deleteAllData} className="w-full">
                🗑️ 모든 데이터 삭제
              </Button>
              <div className="text-xs text-red-400 -mt-2 ml-1">
                ⚠️ 되돌릴 수 없습니다. 신중하게 선택하세요.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 저장 */}
        <div className="mt-6 space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={saveSettings}
            disabled={saved}
          >
            {saved ? "✅ 저장 완료!" : "💾 설정 저장"}
          </Button>

          {saved && (
            <div className="text-center text-sm text-green-400">
              설정이 성공적으로 저장되었습니다!
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
            <span className="text-sm text-green-400">
              ✅ 모든 설정 기능이 정상 작동합니다
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
