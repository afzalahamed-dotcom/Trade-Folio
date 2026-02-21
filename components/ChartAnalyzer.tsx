
import * as React from 'react';
const { useState, useRef } = React;
import { X, Upload, ScanLine, CandlestickChart, Zap, CheckCircle2, AlertCircle, Info, Activity, TrendingUp, Target, ShieldAlert, BarChart3, Binary, RefreshCw, Plus, Copy, Check, Calendar } from 'lucide-react';
import { geminiService, ChartAnalysisResult } from '../services/geminiService';

interface Props {
  onClose: () => void;
  onAddPosition: (ticker: string, price: number, type: 'BUY' | 'SELL') => void;
  onSaveToLog: (result: any, imageData: string) => void;
}

export const ChartAnalyzer: React.FC<Props> = ({ onClose, onAddPosition, onSaveToLog }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ChartAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const performAnalysis = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);
    try {
      const analysis = await geminiService.analyzeChart(image);
      setResult(analysis);
      
      const logResult = {
        ...analysis,
        patternFound: analysis.detected_patterns.join(', '),
        price: analysis.price_data.close,
        rsi: analysis.indicators.rsi,
        macd: analysis.indicators.macd_state || analysis.indicators.macd_hist?.toString(),
        timeframe: analysis.timeframe
      };
      onSaveToLog(logResult, image);
    } catch (err) {
      setError("Failed to analyze chart. Ensure it's a clear TradingView screenshot.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 my-8">
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <ScanLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 leading-tight">SMC Technical Intelligence</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logic by AFZAL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-[3px] border-dashed border-gray-100 rounded-[2rem] p-20 flex flex-col items-center justify-center space-y-6 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all group"
            >
              <div className="bg-indigo-50 p-6 rounded-full text-indigo-600 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <Upload className="w-12 h-12" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">Import TradingView Chart</p>
                <p className="text-sm text-gray-400 mt-1">Multi-Timeframe Detection Engine</p>
              </div>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 space-y-6">
                <div className="relative rounded-3xl overflow-hidden border-4 border-gray-50 bg-gray-100 shadow-xl aspect-[4/3]">
                  <img src={image} alt="Chart" className="w-full h-full object-contain" />
                  {result && (
                    <div className="absolute top-4 left-4 flex gap-2">
                       <span className="bg-gray-900/90 backdrop-blur text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-xl">
                         <Calendar className="w-3.5 h-3.5" /> {result.timeframe} Periodicity
                       </span>
                    </div>
                  )}
                </div>

                {result && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Binary className="w-3 h-3" /> Indicator Snapshot
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">RSI (14)</p>
                          <p className="text-lg font-black text-gray-900">{result.indicators.rsi?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">MACD Hist</p>
                          <p className={`text-lg font-black ${Number(result.indicators.macd_hist) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {result.indicators.macd_hist || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7">
                {!result && !analyzing && (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-indigo-50/20 rounded-[2.5rem] border-2 border-dashed border-indigo-100">
                    <CandlestickChart className="w-16 h-16 text-indigo-200 mb-6" />
                    <h3 className="text-xl font-black text-gray-900 mb-2">Ready for Multi-Timeframe Scan</h3>
                    <p className="text-sm text-gray-500 max-w-xs mb-8">System will automatically detect chart periodicity and pattern confluence.</p>
                    <button 
                      onClick={performAnalysis}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 flex items-center justify-center space-x-3 transition-all transform active:scale-[0.97]"
                    >
                      <Zap className="w-6 h-6" />
                      <span>Execute SMC Scan</span>
                    </button>
                  </div>
                )}

                {analyzing && (
                  <div className="h-full flex flex-col items-center justify-center py-20">
                    <div className="relative w-24 h-24 mb-8">
                      <div className="absolute inset-0 border-8 border-indigo-50 rounded-full"></div>
                      <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                      <ScanLine className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 animate-pulse">Analyzing Timeframes...</h3>
                  </div>
                )}

                {result && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                    <div className={`p-8 rounded-[2rem] border-2 shadow-sm ${
                      result.recommendation.includes('BUY') ? 'bg-green-50/50 border-green-200' :
                      result.recommendation.includes('SELL') ? 'bg-red-50/50 border-red-200' :
                      'bg-amber-50/50 border-amber-200'
                    }`}>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Binary className="w-4 h-4 text-indigo-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{result.ticker} • {result.date}</span>
                          </div>
                          <h2 className={`text-5xl font-black leading-none ${
                            result.recommendation.includes('BUY') ? 'text-green-600' :
                            result.recommendation.includes('SELL') ? 'text-red-600' :
                            'text-amber-600'
                          }`}>{result.recommendation}</h2>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-400 uppercase">Confidence</p>
                          <p className="text-4xl font-black text-gray-900">{result.confidence_score}%</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-8">
                        {result.detected_patterns.map((p, i) => (
                          <span key={i} className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-gray-100 shadow-sm text-indigo-600">
                            {p}
                          </span>
                        ))}
                      </div>

                      <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-gray-100/50">
                         <div className="flex items-center gap-2 mb-3">
                           <Info className="w-4 h-4 text-indigo-400" />
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SMC Analysis ({result.timeframe})</h4>
                         </div>
                         <p className="text-sm text-gray-700 leading-relaxed font-medium">
                           {result.explanation}
                         </p>
                      </div>

                      <div className="flex gap-4 mt-8">
                        <button 
                          onClick={() => onAddPosition(result.ticker, result.price_data.close, result.recommendation.includes('SELL') ? 'SELL' : 'BUY')}
                          className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all transform active:scale-[0.98] shadow-xl flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          <span>Record Position</span>
                        </button>
                        <button onClick={onClose} className="px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl font-black">Dismiss</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
