import { Card, CardContent } from "@/components/common/Card";

interface ErrorDisplayProps {
  error: string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <Card className="mb-8 border-red-500/30 bg-red-500/10">
      <CardContent>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-red-400 font-semibold">{error}</div>
          <div className="text-sm text-gray-400 mt-2">
            종목 코드를 확인하거나 다른 종목을 시도해보세요
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
