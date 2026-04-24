import * as React from 'react';
import { PortfolioRow } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Briefcase, Activity } from 'lucide-react';

interface Props {
  data: PortfolioRow[];
}

export const DashboardStats: React.FC<Props> = ({ data }) => {
  const totalValue = data.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalInvestment = data.reduce((acc, curr) => acc + curr.totalInvestment, 0);
  const totalPL = data.reduce((acc, curr) => acc + curr.profitOrLoss, 0);
  const plPercentage = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-morphism rounded-[2.5rem] p-8 transition-all hover:translate-y-[-4px] group relative overflow-hidden bg-white/80">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
          <Wallet className="w-32 h-32" />
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 shadow-inner">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">AGGREGATED VALUE</p>
            <h3 className="text-3xl font-black text-slate-900 font-mono-terminal tracking-tighter">
              LKR {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h3>
            <div className="flex items-center text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest opacity-80">
              <Activity className="w-3 h-3 mr-1.5" /> Invested Capital: {totalInvestment.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className={`glass-morphism rounded-[2.5rem] p-8 transition-all hover:translate-y-[-4px] group relative overflow-hidden ${totalPL >= 0 ? 'bg-emerald-50/40' : 'bg-rose-50/40'}`}>
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
          {totalPL >= 0 ? <TrendingUp className="w-32 h-32" /> : <TrendingDown className="w-32 h-32" />}
        </div>
        <div className="flex items-center space-x-4">
          <div className={`p-4 rounded-2xl shadow-inner ${totalPL >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {totalPL >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TOTAL PERFORMANCE</p>
            <h3 className={`text-3xl font-black font-mono-terminal tracking-tighter ${totalPL >= 0 ? 'text-emerald-600 text-glow-green' : 'text-rose-600 text-glow-coral'}`}>
              {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h3>
            <div className={`flex items-center text-[10px] font-black mt-2 uppercase tracking-[0.1em] ${totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              {plPercentage.toFixed(2)}% ROI COEFFICIENT
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 relative overflow-hidden group transition-all hover:translate-y-[-4px]">
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none group-hover:rotate-12 transition-transform">
          <Briefcase className="w-32 h-32 text-white" />
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white/10 p-4 rounded-2xl text-white backdrop-blur-sm shadow-inner">
            <DollarSign className="w-8 h-8" />
          </div>
          <div className="z-10 text-white">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">ACTIVE VECTORS</p>
            <h3 className="text-3xl font-black font-mono-terminal tracking-tighter">
              {data.length} Positions
            </h3>
            <div className="flex items-center text-[10px] font-bold mt-2 uppercase tracking-widest opacity-60">
              <Activity className="w-3 h-3 mr-1.5" /> CSE SYNCED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};