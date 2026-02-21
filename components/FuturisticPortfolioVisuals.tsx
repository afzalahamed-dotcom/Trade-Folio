import * as React from 'react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import { motion } from 'framer-motion';
import { Droplets, Activity, Cpu, Zap } from 'lucide-react';
import { PortfolioRow } from '../types';

interface Props {
  data: PortfolioRow[];
  halalList: Record<string, number>;
}

const HolographicTooltip = ({ active, payload, halalList }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const ticker = data.fullTicker || data.ticker;
    const plValue = data.profitOrLoss;
    const plPerc = data.profitPercentage;
    const isHalal = halalList[ticker] !== undefined;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-morphism p-5 rounded-2xl shadow-2xl font-mono-terminal z-50 min-w-[220px] bg-white/95"
      >
        <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
          <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Active Matrix Trace</span>
          {isHalal && (
            <div className="flex items-center gap-1 text-emerald-500">
              <Droplets className="w-3 h-3 fill-current" />
              <span className="text-[9px] font-black uppercase tracking-tighter">PURE</span>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Entity</span>
            <p className="text-xl font-black text-slate-900 leading-none">{ticker}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Yield</span>
              <span className={`text-sm font-black ${plValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {plValue >= 0 ? '+' : ''}{plValue.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Flux</span>
              <span className={`text-sm font-black ${plPerc >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {plPerc.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-indigo-500/30" />
      </motion.div>
    );
  }
  return null;
};

export const FuturisticPortfolioVisuals: React.FC<Props> = ({ data, halalList }) => {
  const [themeColors, setThemeColors] = React.useState({ primary: '#4f46e5', secondary: '#10b981', accent: '#f43f5e', text: '#0f172a' });
  
  React.useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setThemeColors({
      primary: style.getPropertyValue('--theme-primary').trim() || '#4f46e5',
      secondary: style.getPropertyValue('--theme-secondary').trim() || '#10b981',
      accent: style.getPropertyValue('--theme-accent').trim() || '#f43f5e',
      text: style.getPropertyValue('--theme-text').trim() || '#0f172a'
    });
  }, [data]);

  const chartData = React.useMemo(() => {
    return data.map(item => ({
      ticker: item.ticker.split('.')[0],
      fullTicker: item.ticker,
      profitOrLoss: item.profitOrLoss,
      profitPercentage: item.profitPercentage,
      weight: item.totalValue,
      normWeight: Math.log10(item.totalValue + 1) * 20 
    })).sort((a, b) => b.profitPercentage - a.profitPercentage);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/40 shadow-inner">
        <Activity className="w-12 h-12 text-slate-200 mb-4 animate-pulse" />
        <p className="font-mono-terminal text-slate-400 text-xs uppercase tracking-[0.3em]">Awaiting Vector Sync...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-4">
      {/* PERFORMANCE RADAR */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="lg:col-span-5 glass-morphism rounded-[2.5rem] p-8 relative overflow-hidden scanline-container theme-transition group"
      >
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-slate-900 font-mono-terminal font-black text-sm uppercase tracking-tighter">Neural Vector Grid</h3>
            <p className="text-slate-400 text-[9px] font-mono-terminal uppercase tracking-[0.2em] mt-0.5">Yield Efficiency Map</p>
          </div>
        </div>

        <div className="h-72 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="rgba(0,0,0,0.05)" />
              <PolarAngleAxis dataKey="ticker" tick={{ fill: themeColors.text, fontSize: 10, fontWeight: 'bold', fontFamily: 'JetBrains Mono' }} />
              <Radar
                name="Yield"
                dataKey="profitPercentage"
                stroke={themeColors.secondary}
                fill={themeColors.secondary}
                fillOpacity={0.15}
                animationDuration={2000}
              />
              <Radar
                name="Weight"
                dataKey="normWeight"
                stroke={themeColors.primary}
                fill={themeColors.primary}
                fillOpacity={0.1}
                animationDuration={3000}
              />
              <Tooltip content={<HolographicTooltip halalList={halalList} />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* DIVERGING FLUX BARS */}
      <motion.div 
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-7 glass-morphism rounded-[2.5rem] p-8 relative overflow-hidden scanline-container theme-transition group"
      >
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-900 font-mono-terminal font-black text-sm uppercase tracking-tighter">Yield Divergence Flux</h3>
              <p className="text-slate-400 text-[9px] font-mono-terminal uppercase tracking-[0.2em] mt-0.5">ROI Coefficient Matrix</p>
            </div>
          </div>
          
          <div className="flex gap-4 font-mono-terminal">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alpha</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Omega</span>
             </div>
          </div>
        </div>

        <div className="h-72 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ left: 20, right: 20 }} stackOffset="sign">
              <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="rgba(0,0,0,0.03)" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="ticker" type="category" axisLine={false} tickLine={false}
                tick={{ fill: themeColors.text, fontSize: 10, fontWeight: 800, fontFamily: 'JetBrains Mono' }}
              />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={<HolographicTooltip halalList={halalList} />} />
              <Bar dataKey="profitPercentage" radius={[4, 4, 4, 4]} barSize={16} animationDuration={1500}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.profitPercentage >= 0 ? themeColors.secondary : themeColors.accent} 
                    className={entry.profitPercentage >= 0 ? 'animate-pulse' : 'animate-[breathing_4s_ease-in-out_infinite]'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <style>{`
          @keyframes breathing {
            0%, 100% { opacity: 1; transform: scaleX(1); }
            50% { opacity: 0.8; transform: scaleX(0.98); }
          }
        `}</style>
      </motion.div>

      {/* LIGHT SWEEP OVERLAY */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
        <motion.div 
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 skew-x-[-20deg]"
        />
      </div>
    </div>
  );
};