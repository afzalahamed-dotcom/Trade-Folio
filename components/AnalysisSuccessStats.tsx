
import * as React from 'react';
const { useMemo } = React;
import { TradeLogEntry } from '../types';
import { CheckCircle2, XCircle, TrendingUp, BarChart3, Target, Zap } from 'lucide-react';

interface Props {
  entries: TradeLogEntry[];
  currentPrices: Record<string, number>;
}

export const AnalysisSuccessStats: React.FC<Props> = ({ entries, currentPrices }) => {
  const stats = useMemo(() => {
    const buyRecs = entries.filter(e => e.recommendation === 'BUY' || e.recommendation === 'STRONG BUY');
    
    if (buyRecs.length === 0) return null;

    const successfulRecs = buyRecs.filter(e => {
      const currentPrice = currentPrices[e.ticker.toUpperCase()];
      return currentPrice && currentPrice > e.price;
    });

    const successRate = (successfulRecs.length / buyRecs.length) * 100;

    // Breakdown
    const strongBuyRecs = buyRecs.filter(e => e.recommendation === 'STRONG BUY');
    const successfulStrongBuys = strongBuyRecs.filter(e => {
      const currentPrice = currentPrices[e.ticker.toUpperCase()];
      return currentPrice && currentPrice > e.price;
    });
    const strongSuccessRate = strongBuyRecs.length > 0 ? (successfulStrongBuys.length / strongBuyRecs.length) * 100 : 0;

    // Average Gain
    const gains = buyRecs.map(e => {
      const currentPrice = currentPrices[e.ticker.toUpperCase()];
      if (!currentPrice) return 0;
      return ((currentPrice - e.price) / e.price) * 100;
    });
    const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;

    return {
      total: buyRecs.length,
      wins: successfulRecs.length,
      rate: successRate,
      strongRate: strongSuccessRate,
      avgGain,
      strongCount: strongBuyRecs.length
    };
  }, [entries, currentPrices]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-hidden relative group">
        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
          <Target className="w-24 h-24 text-indigo-600" />
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Signal Accuracy</p>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-gray-900">{stats.rate.toFixed(1)}%</h3>
          <span className="text-[10px] font-bold text-green-500 mb-1.5 flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" /> {stats.wins}/{stats.total} Hits
          </span>
        </div>
        <div className="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-600 h-full rounded-full transition-all duration-1000" 
            style={{ width: `${stats.rate}%` }} 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm group">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">High-Conviction Success</p>
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-black text-indigo-600">{stats.strongRate.toFixed(1)}%</h3>
          <span className="text-[10px] font-bold text-indigo-400 mb-1.5 uppercase">Strong Buy Rate</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">{stats.strongCount} High-priority signals tracked</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm group">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Recommendation ROI</p>
        <div className="flex items-end gap-2">
          <h3 className={`text-3xl font-black ${stats.avgGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.avgGain >= 0 ? '+' : ''}{stats.avgGain.toFixed(2)}%
          </h3>
          <TrendingUp className={`w-5 h-5 mb-1.5 ${stats.avgGain >= 0 ? 'text-green-500' : 'text-red-500'}`} />
        </div>
        <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Performance since analysis</p>
      </div>

      <div className="bg-indigo-600 rounded-2xl p-5 shadow-lg shadow-indigo-100 text-white flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-indigo-300" />
          <p className="text-[10px] font-black uppercase tracking-widest">Logic Insight</p>
        </div>
        <p className="text-xs font-medium leading-relaxed opacity-90">
          Your manual technical scans have a <span className="font-black underline">{(stats.wins/stats.total*100).toFixed(0)}% accuracy</span>. Focus on "Strong Buy" signals for maximum reliability.
        </p>
      </div>
    </div>
  );
};
