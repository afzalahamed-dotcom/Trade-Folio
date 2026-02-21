
import * as React from 'react';
const { useState, useMemo, useEffect } = React;
import { TradeLogEntry, PortfolioRow } from '../types';
import { History, TrendingUp, TrendingDown, Trash2, Maximize2, X, Activity, CheckCircle2, AlertCircle, BarChart3, Binary, LayoutGrid, Search, ChevronRight, Zap, RefreshCw, Layers } from 'lucide-react';
import { AnalysisSuccessStats } from './AnalysisSuccessStats';
import { StockCandleChart } from './StockCandleChart';
import { geminiService } from '../services/geminiService';

interface Props {
  entries: TradeLogEntry[];
  onDelete: (id: string) => void;
  currentPrices: Record<string, number>;
  portfolioData?: PortfolioRow[];
}

export const TradeLog: React.FC<Props> = ({ entries, onDelete, currentPrices, portfolioData = [] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [consolidatedOutlooks, setConsolidatedOutlooks] = useState<Record<string, { text: string; loading: boolean }>>({});

  const groupedEntries = useMemo(() => {
    const groups: Record<string, TradeLogEntry[]> = {};
    entries.forEach(entry => {
      const ticker = entry.ticker.toUpperCase();
      if (!groups[ticker]) groups[ticker] = [];
      groups[ticker].push(entry);
    });
    return groups;
  }, [entries]);

  const tickers = Object.keys(groupedEntries).filter(t => 
    t.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPerformanceSummary = (ticker: string) => {
    const tickerEntries = groupedEntries[ticker];
    const buyRecs = tickerEntries.filter(e => e.recommendation === 'BUY' || e.recommendation === 'STRONG BUY');
    if (buyRecs.length === 0) return null;

    const currentPrice = currentPrices[ticker];
    if (!currentPrice) return null;

    const successful = buyRecs.filter(e => currentPrice > e.price);
    const rate = (successful.length / buyRecs.length) * 100;
    const holding = portfolioData.find(p => p.ticker === ticker);
    
    // Timeframe Confluence Detection
    const timeframes = new Set(tickerEntries.map(e => e.timeframe));
    const hasConfluence = timeframes.has('1D') && timeframes.has('1M');

    return { rate, count: buyRecs.length, successful: successful.length, holding, hasConfluence, timeframes: Array.from(timeframes) };
  };

  const handleConsolidate = async (ticker: string) => {
    setConsolidatedOutlooks(prev => ({ ...prev, [ticker]: { text: '', loading: true } }));
    try {
      const tickerAnalyses = groupedEntries[ticker];
      const result = await geminiService.generateConsolidatedOutlook(ticker, tickerAnalyses);
      setConsolidatedOutlooks(prev => ({ ...prev, [ticker]: { text: result, loading: false } }));
    } catch (err) {
      setConsolidatedOutlooks(prev => ({ ...prev, [ticker]: { text: 'Error combining periodicities.', loading: false } }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Binary className="w-8 h-8 text-indigo-600" />
            SMC Intelligence Matrix
          </h2>
          <p className="text-sm text-gray-500">Auto-correlated Multi-Timeframe Analysis</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Intelligence Matrix..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium w-full md:w-64"
          />
        </div>
      </div>

      <AnalysisSuccessStats entries={entries} currentPrices={currentPrices} />

      <div className="space-y-12">
        {tickers.map(ticker => {
          const summary = getPerformanceSummary(ticker);
          const tickerEntries = groupedEntries[ticker].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const outlook = consolidatedOutlooks[ticker];
          
          return (
            <div key={ticker} className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-2xl font-black text-lg tracking-tighter">
                    {ticker}
                  </div>
                  {summary?.hasConfluence && (
                    <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-100 animate-bounce-subtle">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase">Multi-Timeframe Detected</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Timeframes</p>
                  <div className="flex gap-1 justify-end mt-1">
                    {summary?.timeframes.map(tf => (
                      <span key={tf} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[9px] font-black">{tf}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Consolidated Insights Section */}
              {summary?.hasConfluence && (
                <div className="bg-gradient-to-r from-indigo-50 to-white rounded-[2rem] border border-indigo-100 p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
                    <Zap className="w-32 h-32 text-indigo-600" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Top-Down Consolidated Forecast
                      </h4>
                      {!outlook && (
                        <button 
                          onClick={() => handleConsolidate(ticker)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Run Confluence Analysis
                        </button>
                      )}
                    </div>
                    
                    {outlook?.loading ? (
                      <div className="flex items-center gap-3 py-4">
                        <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                        <p className="text-sm font-black text-indigo-900 animate-pulse uppercase tracking-widest">Synthesizing Monthly & Daily Trends...</p>
                      </div>
                    ) : outlook?.text ? (
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-medium bg-white/60 p-6 rounded-2xl border border-white/80 backdrop-blur shadow-inner">
                        {outlook.text}
                      </div>
                    ) : (
                      <p className="text-xs text-indigo-400 italic">Combine data from multiple chart periodicities for high-probability signals.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 overflow-hidden">
                    <StockCandleChart ticker={ticker} />
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                  {tickerEntries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex gap-6 relative group overflow-hidden">
                      <div className={`absolute top-0 right-0 w-1.5 h-full ${
                        entry.timeframe === '1M' ? 'bg-indigo-600' : 
                        entry.timeframe === '1W' ? 'bg-indigo-400' : 'bg-indigo-200'
                      }`} />
                      
                      <div className="w-32 h-20 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 cursor-zoom-in" onClick={() => setSelectedImage(entry.imageData)}>
                        <img src={entry.imageData} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-gray-900 text-white px-2 py-0.5 rounded text-[8px] font-black">{entry.timeframe}</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                entry.recommendation.includes('BUY') ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                              }`}>
                                {entry.recommendation}
                              </span>
                            </div>
                            <h5 className="text-sm font-black text-gray-900">{entry.pattern}</h5>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-gray-900">LKR {entry.price.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{entry.date}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed italic line-clamp-2">"{entry.explanation}"</p>
                      </div>

                      <button onClick={() => onDelete(entry.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors self-start"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-8 right-8 p-4 text-white hover:bg-white/10 rounded-full"><X className="w-10 h-10" /></button>
          <img src={selectedImage} alt="Analysis Fullscreen" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};
