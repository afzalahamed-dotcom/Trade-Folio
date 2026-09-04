
import * as React from 'react';
const { useState, useEffect } = React;
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { geminiService } from '../services/geminiService';
import { PortfolioRow, HistoricalDataPoint } from '../types';
import { Activity, ArrowUpRight, ArrowDownRight, Calendar, BarChart2, Loader2 } from 'lucide-react';

interface Props {
  portfolio: PortfolioRow[];
}

export const StockPerformanceView: React.FC<Props> = ({ portfolio }) => {
  const [selectedTicker, setSelectedTicker] = useState<string>(portfolio[0]?.ticker || '');
  const [history, setHistory] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTicker) {
      loadHistory(selectedTicker);
    }
  }, [selectedTicker]);

  const loadHistory = async (ticker: string) => {
    setLoading(true);
    const data = await geminiService.fetchHistoricalData(ticker);
    setHistory(data);
    setLoading(false);
  };

  const currentStock = portfolio.find(s => s.ticker === selectedTicker);
  
  const calculateChange = () => {
    if (history.length < 2) return null;
    const first = history[0].price;
    const last = history[history.length - 1].price;
    const diff = last - first;
    const percentage = (diff / first) * 100;
    return { diff, percentage };
  };

  const performance = calculateChange();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Market Performance
          </h2>
          <p className="text-sm text-gray-500">Historical price trends for your holdings</p>
        </div>

        <div className="relative w-full md:w-64">
          <select 
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl shadow-sm appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-700"
          >
            {portfolio.map(stock => (
              <option key={stock.ticker} value={stock.ticker}>{stock.ticker}</option>
            ))}
            {portfolio.length === 0 && <option disabled>No stocks in portfolio</option>}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <BarChart2 className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {selectedTicker ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="text-sm font-black text-indigo-900 uppercase tracking-widest">Retrieving Market History...</p>
              </div>
            )}
            
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Trend</p>
                <h3 className="text-3xl font-black text-gray-900">{selectedTicker}</h3>
              </div>
              {performance && (
                <div className={`text-right ${performance.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <div className="flex items-center justify-end font-black text-xl">
                    {performance.diff >= 0 ? <ArrowUpRight className="w-5 h-5 mr-1" /> : <ArrowDownRight className="w-5 h-5 mr-1" />}
                    <span>LKR {Math.abs(performance.diff).toFixed(2)}</span>
                  </div>
                  <p className="text-sm font-bold">({performance.percentage.toFixed(2)}% Over Period)</p>
                </div>
              )}
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    minTickGap={30}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `LKR ${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#1e293b' }}
                    itemStyle={{ fontWeight: 700, color: '#4f46e5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#4f46e5" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-4">Position Summary</p>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Holding Value</p>
                  <p className="text-2xl font-black">LKR {(currentStock?.totalValue || 0).toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-70" title="Break Even Selling Price">BES Price</p>
                    <p className="text-lg font-bold">{(currentStock?.besPrice || (currentStock?.avgBuyPrice ? currentStock.avgBuyPrice / (1 - 0.0112) : 0)).toFixed(2)}</p>
                    {currentStock?.avgBuyPrice && (
                      <p className="text-[9px] opacity-60 font-mono-terminal">AVG {currentStock.avgBuyPrice.toFixed(2)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-70">Current</p>
                    <p className="text-lg font-bold">{(currentStock?.currentPrice || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Historical Records</h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                {history.map((point, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-600">{point.date}</span>
                    </div>
                    <span className="text-[11px] font-black text-gray-900">LKR {(point.price || 0).toFixed(2)}</span>
                  </div>
                ))}
                {history.length === 0 && !loading && (
                  <p className="text-xs text-gray-400 text-center py-8 italic">No data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-20 flex flex-col items-center justify-center text-center">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <Activity className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No active positions selected</h3>
          <p className="text-gray-500 max-w-xs mt-2">Select a stock from your portfolio to view its performance history.</p>
        </div>
      )}
    </div>
  );
};
