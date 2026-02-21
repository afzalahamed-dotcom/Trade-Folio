import * as React from 'react';
const { useState, useEffect } = React;
import { Sparkles, MessageSquare, ListTodo, ShieldCheck, TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp, CheckCircle, XCircle, RefreshCw, Send, Trash2, Clock, Eraser, Plus, X } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { PredictionItem, PortfolioRow, DailyUpdate } from '../types';

interface Props {
  currentHoldings: PortfolioRow[];
  updates: DailyUpdate[];
  setUpdates: React.Dispatch<React.SetStateAction<DailyUpdate[]>>;
  halalList: Record<string, number>;
  setHalalList: (list: Record<string, number>) => void;
}

export const PredictionView: React.FC<Props> = ({ currentHoldings, updates, setUpdates, halalList, setHalalList }) => {
  const [activeTab, setActiveTab] = useState<'input' | 'table'>('table');
  const [newNote, setNewNote] = useState('');
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showHalalModal, setShowHalalModal] = useState(false);

  const [newHalalTicker, setNewHalalTicker] = useState('');
  const [newHalalPct, setNewHalalPct] = useState('');

  useEffect(() => {
    const savedPreds = localStorage.getItem('ai_predictions');
    if (savedPreds) {
      try { setPredictions(JSON.parse(savedPreds)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleAddNote = () => {
    const cleanNote = newNote.trim();
    if (!cleanNote) return;
    const update: DailyUpdate = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: cleanNote
    };
    setUpdates([...updates, update]);
    setNewNote('');
  };

  const handleAddHalal = () => {
    if (!newHalalTicker || newHalalPct === '') return;
    const ticker = newHalalTicker.toUpperCase().trim();
    const finalTicker = ticker.includes('.') ? ticker : `${ticker}.N0000`;
    setHalalList({ ...halalList, [finalTicker]: Number(newHalalPct) });
    setNewHalalTicker('');
    setNewHalalPct('');
  };

  const removeHalal = (ticker: string) => {
    const newList = { ...halalList };
    delete newList[ticker];
    setHalalList(newList);
  };

  const handleAnalyzeToday = async () => {
    if (updates.length === 0) return;
    setIsProcessing(true);
    const cumulativeText = updates.map(u => `[${u.timestamp}]: ${u.text}`).join('\n\n');
    const tickers = currentHoldings.map(h => h.ticker);
    const halalTickers = Object.keys(halalList);
    
    try {
      const result = await geminiService.generatePredictionTable(cumulativeText, tickers, halalTickers);
      const uniqueResults = result.reduce((acc: PredictionItem[], curr) => {
        if (!acc.find(item => item.ticker === curr.ticker)) acc.push(curr);
        return acc;
      }, []);
      setPredictions(uniqueResults);
      localStorage.setItem('ai_predictions', JSON.stringify(uniqueResults));
      setActiveTab('table');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const normalizeTicker = (t: string) => {
    let clean = t.toUpperCase().trim();
    if (!clean.includes('.')) clean += '.N0000';
    return clean;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-morphism p-8 rounded-[2.5rem]">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100"><Sparkles className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Intelligence Hub</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1 font-mono-terminal">Sentiment Confluence Grid</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowHalalModal(true)} className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm">
            <ShieldCheck className="w-4 h-4" /> Compliance
          </button>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setActiveTab('table')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'table' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
              Grid
            </button>
            <button onClick={() => setActiveTab('input')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'input' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>
              Telemetry
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'input' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 glass-morphism rounded-[3rem] p-10 space-y-8">
            <div className="flex items-center gap-3">
               <Send className="w-5 h-5 text-indigo-500" />
               <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Input Buffer</h3>
            </div>
            <textarea 
              className="w-full h-48 p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] outline-none focus:border-indigo-400 transition-all font-mono-terminal text-slate-700 text-xs shadow-inner"
              placeholder="Inject market telemetry... (e.g., 'AEL.N0000 showing strong buy-side support at LKR 24.50')"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button onClick={handleAddNote} disabled={!newNote.trim()} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-widest">
              Commit Telemetry
            </button>

            <div className="pt-8 border-t border-slate-100">
              <button onClick={handleAnalyzeToday} disabled={isProcessing || updates.length === 0} className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-2xl font-black shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50">
                {isProcessing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                <span className="text-sm font-black uppercase tracking-[0.2em]">Run Neural Synthesis</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 glass-morphism rounded-[3rem] p-12 min-h-[500px]">
             <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500 shadow-inner"><Clock className="w-5 h-5" /></div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Telemetry Stream</h3>
                </div>
                <button onClick={() => setUpdates([])} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100 transition-all shadow-sm">
                  <Eraser className="w-4 h-4" /> Flush Buffer
                </button>
             </div>
             <div className="space-y-6">
               {updates.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-28 text-center space-y-6 opacity-30">
                    <MessageSquare className="w-16 h-16 text-slate-300" />
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Stream Offline</p>
                 </div>
               ) : (
                 updates.map((update) => (
                   <div key={update.id} className="group flex gap-6 p-6 bg-slate-50/50 hover:bg-white rounded-[2rem] border border-slate-100 hover:shadow-lg transition-all animate-in slide-in-from-right-4">
                      <div className="flex-shrink-0 text-[10px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm self-start">{update.timestamp}</div>
                      <div className="flex-1"><p className="text-sm text-slate-700 font-bold leading-relaxed">{update.text}</p></div>
                      <button onClick={() => setUpdates(updates.filter(u => u.id !== update.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-600 transition-all self-start"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {predictions.length > 0 ? (
            <div className="glass-morphism rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/50 font-mono-terminal">
                      <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Security</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Direction</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Yield Target</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy</th>
                      <th className="px-8 py-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {predictions.map((item) => {
                      const norm = normalizeTicker(item.ticker);
                      const isHalal = halalList[norm] !== undefined;
                      return (
                        <React.Fragment key={item.ticker}>
                          <tr className={`hover:bg-indigo-50/20 transition-all group cursor-pointer ${expandedRow === item.ticker ? 'bg-indigo-50/30' : ''}`} onClick={() => setExpandedRow(expandedRow === item.ticker ? null : item.ticker)}>
                            <td className="px-8 py-8 whitespace-nowrap"><span className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-lg">{item.rank}</span></td>
                            <td className="px-8 py-8 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-black text-indigo-600">{item.ticker}</span>
                                  {isHalal && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-8 whitespace-nowrap">
                              <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${item.action === 'BUY' ? 'bg-emerald-500 text-white' : item.action === 'SELL' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{item.action}</span>
                            </td>
                            <td className="px-8 py-8 whitespace-nowrap text-base font-black text-slate-900 font-mono-terminal">LKR {item.price.toLocaleString()}</td>
                            <td className="px-8 py-8 whitespace-nowrap">
                              <div className="flex flex-col gap-2 w-32">
                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-tighter"><span>SYNC {item.confidence}%</span></div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                  <div className={`h-full transition-all duration-1000 ${ item.confidence > 80 ? 'bg-emerald-500' : 'bg-indigo-500' }`} style={{ width: `${item.confidence}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-8 text-right">{expandedRow === item.ticker ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" />}</td>
                          </tr>
                          {expandedRow === item.ticker && (
                            <tr className="bg-slate-50/50 animate-in slide-in-from-top-4 duration-500">
                              <td colSpan={6} className="px-12 py-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                  <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-3"><Target className="w-5 h-5" /> Vector Analysis</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Trend Logic</p><p className="text-sm font-black text-slate-900 uppercase">{item.indicators.trend || 'NEURAL'}</p></div>
                                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">RSI COEFF</p><p className="text-sm font-black text-slate-900 font-mono-terminal">{item.indicators.rsi || 'SYNCED'}</p></div>
                                    </div>
                                  </div>
                                  <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-3"><Sparkles className="w-5 h-5" /> Synthesis Narrative</h4>
                                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                      <p className="text-sm text-slate-600 leading-relaxed font-bold italic">{item.justification}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-40 text-center glass-morphism rounded-[4rem] border-2 border-dashed border-slate-200 space-y-8 bg-white/40">
              <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner"><Target className="w-12 h-12 text-slate-200" /></div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Strategic Snapshot Empty</h3>
                <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto leading-relaxed mt-4 uppercase tracking-[0.2em] font-mono-terminal">Sync telemetry data in Input Buffer to initialize synthesis.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showHalalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100">
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Compliance Matrix</h3>
              </div>
              <button onClick={() => setShowHalalModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-10">
              <div className="flex gap-4 mb-10 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-2">Ticker Code</label>
                  <input type="text" placeholder="DOCK.N0000" className="w-full px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-900 text-sm font-mono-terminal outline-none focus:border-indigo-400 shadow-sm" value={newHalalTicker} onChange={e => setNewHalalTicker(e.target.value)} />
                </div>
                <div className="w-36">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-2">Pure %</label>
                  <input type="number" step="0.01" className="w-full px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-900 text-sm font-mono-terminal outline-none focus:border-indigo-400 shadow-sm" value={newHalalPct} onChange={e => setNewHalalPct(e.target.value)} />
                </div>
                <button onClick={handleAddHalal} className="mt-auto p-4 bg-slate-900 text-white rounded-2xl hover:bg-black shadow-lg transition-all active:scale-95"><Plus className="w-6 h-6" /></button>
              </div>
              <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-4 scrollbar-hide">
                {Object.entries(halalList).sort().map(([ticker, pct]) => (
                  <div key={ticker} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-black text-slate-900 font-mono-terminal tracking-tighter">{ticker}</span>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">{pct}% Pure Coefficient</span>
                    </div>
                    <button onClick={() => removeHalal(ticker)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
