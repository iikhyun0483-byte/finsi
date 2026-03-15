import { Globe, Coins, DollarSign } from "lucide-react";

type MarketType = 'global' | 'crypto' | 'korean';

interface MarketTypeTabsProps {
  marketType: MarketType;
  onMarketChange: (type: MarketType) => void;
}

export function MarketTypeTabs({ marketType, onMarketChange }: MarketTypeTabsProps) {
  return (
    <div className="mb-8 flex gap-3 border-b border-[rgba(0,212,255,0.12)] pb-2">
      <button
        onClick={() => onMarketChange('global')}
        className={`px-6 py-3 font-orbitron font-semibold transition-all flex items-center gap-2 ${
          marketType === 'global'
            ? 'border-b-2 border-[#00d4ff] text-[#00d4ff]'
            : 'border-b-2 border-transparent text-[rgba(255,255,255,0.4)] hover:text-[#00d4ff]'
        }`}
      >
        <Globe className="w-4 h-4" />
        <span>GLOBAL</span>
      </button>
      <button
        onClick={() => onMarketChange('crypto')}
        className={`px-6 py-3 font-orbitron font-semibold transition-all flex items-center gap-2 ${
          marketType === 'crypto'
            ? 'border-b-2 border-[#00d4ff] text-[#00d4ff]'
            : 'border-b-2 border-transparent text-[rgba(255,255,255,0.4)] hover:text-[#00d4ff]'
        }`}
      >
        <Coins className="w-4 h-4" />
        <span>CRYPTO</span>
      </button>
      <button
        onClick={() => onMarketChange('korean')}
        className={`px-6 py-3 font-orbitron font-semibold transition-all flex items-center gap-2 ${
          marketType === 'korean'
            ? 'border-b-2 border-[#00d4ff] text-[#00d4ff]'
            : 'border-b-2 border-transparent text-[rgba(255,255,255,0.4)] hover:text-[#00d4ff]'
        }`}
      >
        <DollarSign className="w-4 h-4" />
        <span>KOREAN</span>
      </button>
    </div>
  );
}
