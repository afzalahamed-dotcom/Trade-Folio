import * as React from 'react';
const { useState, useMemo, useEffect, useRef } = React;
import { TradeLogEntry, TodaysPlanEntry, DailyUpdate, PortfolioRow } from '../types';
import { geminiService } from '../services/geminiService';
import { 
  Zap, Activity, RefreshCw, Target, ShieldCheck, Info, 
  Sparkles, Clock, Calendar, MoveRight, Coins, Hourglass,
  ArrowRight, Globe, BarChart, AlertCircle
} from 'lucide-react';

interface ExtendedPlanEntry extends TodaysPlanEntry {
  companyName?: string;
}

interface Props {
  tradeLog: TradeLogEntry[];
  dailyUpdates: DailyUpdate[];
  portfolioData: PortfolioRow[];
  autoTrigger?: boolean;
  onSynthesized?: () => void;
}

export const TodaysPlan: React.FC<Props> = ({ tradeLog, dailyUpdates, portfolioData, autoTrigger, onSynthesized }) => {
  const [plans, setPlans] = useState<Record<string, ExtendedPlanEntry>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const autoTriggeredRef = useRef(false);
  const todayStr = new Date().toLocaleDateString();

  const activeTickers = useMemo(() => {
    const portfolioTickers = portfolioData.map(h => h.ticker);
    const logTickers = tradeLog.map(e => e.ticker);
    const noteTickers: string[] = [];
    
    dailyUpdates.forEach(u => {
      const matches = u.text.match(/\b[A-Z]{3,}(\.[A-Z]{1,}[0-9]*)?\b/g);
      if (matches) {
        matches.forEach(m => noteTickers.push(m.toUpperCase()));
      }
    });

    const rawCombined = [...portfolioTickers, ...logTickers, ...noteTickers];
    
    const normalizedMap = new Map<string, string>();
    rawCombined.forEach(t => {
      if (!t) return;
      const base = t.split('.')[0].trim().toUpperCase();
      if (base.length < 2) return;
      
      const suffix = t.includes('.X') ? '.X0000' : '.N0000';
      const standard = base + suffix;
      
      if (!normalizedMap.has(base)) {
        normalizedMap.set(base, standard);
      }
    });

    return Array.from(normalizedMap.values()).sort();
  }, [tradeLog, portfolioData, dailyUpdates]);

  const generatePlan = async (ticker: string) => {
    if (loading[ticker]) return;

    setLoading(prev => ({ ...prev, [ticker]: true }));
    setGlobalError(null);
    try {
      const baseSymbol = ticker.split('.')[0];
      const allTickerLogs = tradeLog.filter(e => e.ticker.toUpperCase().startsWith(baseSymbol));
      const todayLogs = allTickerLogs.filter(e => new Date(e.date).toLocaleDateString() === todayStr);
      const historicalLogs = allTickerLogs.filter(e => !todayLogs.includes(e));

      const planData = await geminiService.generateDailyPlan(ticker, dailyUpdates, todayLogs, historicalLogs);
      
      if (planData) {
        setPlans(prev => ({
          ...prev,
          [ticker]: {
            ...planData,
            ticker,
            lastUpdated: new Date().toISOString()
          }
        }));
      }
    } catch (error: any) {
      console.error(`Plan Error for ${ticker}:`, error);
      if (error.message === 'RESOURCE_EXHAUSTED') {
        setGlobalError("AI Rate limit reached. Existing strategies will be maintained.");
      }
    } finally {
      setLoading(prev => ({ ...prev, [ticker]: false }));
    }
  };

  const regenerateAll = async (force = false) => {
    if (activeTickers.length === 0) return;
    setLoading({});
    
    for (const ticker of activeTickers) {
      if (force) {
        setPlans(prev => {
          const next = { ...prev };
          delete next[ticker];
          return next;
        });
      }
      
      if (force || !plans[ticker]) {
        await generatePlan(ticker);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    onSynthesized?.();
  };

  useEffect(() => {
    const cached = localStorage.getItem('daily_plans_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setPlans(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('daily_plans_cache', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    if (autoTrigger && !autoTriggeredRef.current && activeTickers.length > 0) {
      autoTriggeredRef.current = true;
      regenerateAll(true);
    }
  }, [autoTrigger, activeTickers.length]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">AI Intelligence Terminal</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 border-r border-slate-100 pr-3">
                {activeTickers.length} Active Entities
              </span>
              <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Logical Synthesis Active
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => regenerateAll(true)}
          disabled={activeTickers.length === 0 || Object.values(loading).some(v => v)}
          className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 group"
        >
          <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${Object.values(loading).some(v => v) ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          <span>Synthesize All Matrices</span>
        </button>
      </div>

      {globalError && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 text-sm font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{globalError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {activeTickers.map(ticker => {
          const plan = plans[ticker];
          const isLoading = loading[ticker];
          const recColor = plan?.recommendation.includes('BUY') ? 'bg-emerald-600' : plan?.recommendation.includes('SELL') ? 'bg-rose-600' : 'bg-amber-500';

          return (
            <div key={ticker} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:translate-y-[-4px] border-l-8" style={{ borderLeftColor: plan ? (plan.recommendation.includes('BUY') ? '#10b981' : plan.recommendation.includes('SELL') ? '#e11d48' : '#f59e0b') : '#e2e8f0' }}>
              <div className="p-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black text-white bg-slate-900 px-3 py-1 rounded-full uppercase tracking-widest">{ticker}</span>
                      {plan && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">Confluence: {plan.confidence}%</span>}
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                      {plan?.companyName || ticker.split('.')[0] + ' PLC'}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
                      {plan ? plan.justification.split('.')[0] + '.' : `Strategic outlook for ${ticker} is currently buffering.`}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {plan ? (
                      <div className={`px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest text-white shadow-lg ${recColor} animate-in zoom-in-50`}>
                        {plan.recommendation}
                      </div>
                    ) : (
                      <button 
                        onClick={() => generatePlan(ticker)}
                        disabled={isLoading}
                        className="p-4 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-inner"
                      >
                        {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                      </button>
                    )}
                  </div>
                </div>

                {isLoading && (
                  <div className="mt-10 flex items-center justify-center py-16 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synthesizing {ticker}...</p>
                    </div>
                  </div>
                )}

                {plan && !isLoading && (
                  <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="lg:col-span-8 space-y-6">
                       <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 h-full shadow-inner">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <MoveRight className="w-4 h-4 text-indigo-500" /> Synthesized Strategy
                          </h4>
                          <p className="text-lg font-bold text-slate-800 leading-relaxed mb-6">
                            {plan.nextMove}
                          </p>
                          <div className="prose prose-sm max-w-none text-slate-500 font-medium border-t border-slate-200 pt-6 italic">
                            {plan.justification.split('.').slice(1).join('.')}
                          </div>
                       </div>
                    </div>

                    <div className="lg:col-span-4 grid grid-cols-1 gap-5">
                       <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between shadow-sm">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                             <Coins className="w-4 h-4" /> Vector Entry
                          </p>
                          <p className="text-2xl font-black text-emerald-800 font-mono-terminal mt-2">
                             {plan.bestBuyPrice ? `LKR ${plan.bestBuyPrice.toLocaleString()}` : 'MARKET'}
                          </p>
                       </div>
                       <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col justify-between shadow-sm">
                          <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                             <ArrowRight className="w-4 h-4" /> Vector Exit
                          </p>
                          <p className="text-2xl font-black text-rose-800 font-mono-terminal mt-2">
                             {plan.bestSellPrice ? `LKR ${plan.bestSellPrice.toLocaleString()}` : 'N/A'}
                          </p>
                       </div>
                       <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-between shadow-sm">
                          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                             <Hourglass className="w-4 h-4" /> Logical Drift
                          </p>
                          <p className="text-xl font-black text-indigo-800 mt-2">
                             {plan.waitTimeframe || 'PERSISTENT'}
                          </p>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {plan && (
                <div className="px-10 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">EPOCH: {new Date(plan.lastUpdated).toLocaleString()}</span>
                  </div>
                  <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">AFZAL CORE • VERIFIED</div>
                </div>
              )}
            </div>
          );
        })}

        {activeTickers.length === 0 && (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 space-y-8">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <BarChart className="w-12 h-12 text-slate-200" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Strategy Matrix Offline</h3>
              <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-3 leading-relaxed">
                Add holdings or market observation telemetry to begin top-down logical synthesis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};