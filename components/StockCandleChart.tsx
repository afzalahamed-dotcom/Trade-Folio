
import * as React from 'react';
const { useState, useEffect } = React;
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Line,
  ReferenceArea
} from 'recharts';
import { geminiService } from '../services/geminiService';
import { OHLCDataPoint } from '../types';
import { Loader2, Activity } from 'lucide-react';

interface Props {
  ticker: string;
}

export const StockCandleChart: React.FC<Props> = ({ ticker }) => {
  const [data, setData] = useState<OHLCDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const history = await geminiService.fetchOHLCData(ticker);
        setData(history);
      } catch (e) {
        console.error("Chart error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest">Generating SMC Visuals...</p>
      </div>
    );
  }

  if (data.length === 0) return null;

  // Transform data for candlestick representation in Recharts
  const chartData = data.map(d => ({
    ...d,
    wickBottom: Math.min(d.open, d.close, d.low),
    wickTop: Math.max(d.open, d.close, d.high),
    bodyBottom: Math.min(d.open, d.close),
    bodyTop: Math.max(d.open, d.close),
    bodyHeight: Math.abs(d.open - d.close),
    isBullish: d.close >= d.open,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">{d.date}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <p className="text-[11px] font-bold text-gray-500">O: <span className="text-gray-900">{d.open}</span></p>
            <p className="text-[11px] font-bold text-gray-500">H: <span className="text-gray-900">{d.high}</span></p>
            <p className="text-[11px] font-bold text-gray-500">L: <span className="text-gray-900">{d.low}</span></p>
            <p className="text-[11px] font-bold text-gray-500">C: <span className="text-gray-900 font-black">{d.close}</span></p>
          </div>
          {d.rsi && (
            <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-400 uppercase">RSI (14)</span>
              <span className="text-xs font-black text-indigo-600">{d.rsi.toFixed(2)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              minTickGap={30}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              domain={['auto', 'auto']}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Bar dataKey="wickTop" fill="#cbd5e1" barSize={1} />
            <Bar dataKey="low" fill="#cbd5e1" barSize={1} />

            <Bar dataKey="bodyHeight" barSize={8}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isBullish ? '#10b981' : '#ef4444'} 
                  y={entry.isBullish ? entry.close : entry.open}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-20 w-full border-t border-gray-50 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceArea y1={30} y2={70} fill="#f1f5f9" fillOpacity={0.5} />
            <Line 
              type="monotone" 
              dataKey="rsi" 
              stroke="#6366f1" 
              strokeWidth={2} 
              dot={false}
              animationDuration={2000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
