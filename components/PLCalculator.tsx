
import * as React from 'react';
const { useMemo } = React;
import { PortfolioRow } from '../types';
import { Calculator, TrendingUp, TrendingDown, Info, ShieldCheck, Wallet, ArrowRight } from 'lucide-react';

interface Props {
  portfolioData: PortfolioRow[];
}

const SELL_FEE_RATE = 0.0112; // 1.12%

export const PLCalculator: React.FC<Props> = ({ portfolioData }) => {
  const calculatedData = useMemo(() => {
    return portfolioData.map(row => {
      const grossValue = row.totalQty * row.currentPrice;
      const estimatedFees = grossValue * SELL_FEE_RATE;
      
      const brokerage = grossValue * 0.0064;
      const statutory = estimatedFees - brokerage; 

      const netProceeds = grossValue - estimatedFees;
      const projectedPL = netProceeds - row.totalInvestment;
      const projectedPLPerc = row.totalInvestment > 0 ? (projectedPL / row.totalInvestment) * 100 : 0;

      return {
        ...row,
        grossValue,
        estimatedFees,
        brokerage,
        statutory,
        netProceeds,
        projectedPL,
        projectedPLPerc
      };
    });
  }, [portfolioData]);

  const totalLiquidationValue = calculatedData.reduce((acc, curr) => acc + curr.netProceeds, 0);
  const totalNetPL = calculatedData.reduce((acc, curr) => acc + curr.projectedPL, 0);
  const totalGrossValue = calculatedData.reduce((acc, curr) => acc + curr.grossValue, 0);
  const totalFees = calculatedData.reduce((acc, curr) => acc + curr.estimatedFees, 0);

  if (portfolioData.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 space-y-6">
        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Calculator className="w-10 h-10 text-gray-300" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-900">Liquidation Terminal Offline</h3>
          <p className="text-gray-400 font-medium max-w-xs mx-auto">Add holdings to calculate real-time net liquidation value including brokerage and statutory fees.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] opacity-5 group-hover:rotate-12 transition-transform">
             <Wallet className="w-32 h-32 text-indigo-600" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimated Net Proceeds</p>
          <h3 className="text-3xl font-black text-gray-900 leading-none">
            LKR {totalLiquidationValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400">Gross: {totalGrossValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className={`rounded-[2rem] p-8 border shadow-sm relative overflow-hidden group ${totalNetPL >= 0 ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
          <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:scale-110 transition-transform">
             {totalNetPL >= 0 ? <TrendingUp className="w-32 h-32 text-green-600" /> : <TrendingDown className="w-32 h-32 text-red-600" />}
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Projected Net P/L</p>
          <h3 className={`text-3xl font-black leading-none ${totalNetPL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {totalNetPL >= 0 ? '+' : ''}LKR {totalNetPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${totalNetPL >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {((totalNetPL / (totalGrossValue - totalNetPL)) * 100).toFixed(2)}% Net ROI
            </span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:translate-x-2 transition-transform">
             <Info className="w-32 h-32 text-white" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Transaction Costs</p>
          <h3 className="text-3xl font-black leading-none">
            LKR {totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
               <ShieldCheck className="w-3 h-3" /> CSE Standard ~1.12%
             </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Calculator className="w-5 h-5" /></div>
             <div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Liquidation Breakdown</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real-Time Deduction Synthesis</p>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Security</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Holding Qty</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Value</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Brokerage (0.64%)</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Gov/Stat Fees</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Proceeds</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Projected P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {calculatedData.map((row) => (
                <tr key={row.ticker} className="hover:bg-indigo-50/20 transition-all group">
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{row.ticker}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">@ LKR {row.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-gray-700">{row.totalQty.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-400">LKR {row.grossValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-slate-400">-{row.brokerage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-slate-400">-{row.statutory.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-gray-900">LKR {row.netProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span className="text-[9px] font-black text-indigo-400 uppercase">Settlement Amt</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-black ${row.projectedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.projectedPL >= 0 ? '+' : ''}{row.projectedPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className={`text-[10px] font-black uppercase ${row.projectedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.projectedPLPerc.toFixed(2)}% ROI
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-900 text-white">
               <tr>
                 <td className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Total Aggregated</td>
                 <td className="px-6 py-4"></td>
                 <td className="px-6 py-4 text-right font-bold opacity-60">LKR {totalGrossValue.toLocaleString()}</td>
                 <td colSpan={2} className="px-6 py-4 text-right text-rose-400 font-black">-{totalFees.toLocaleString()}</td>
                 <td className="px-6 py-4 text-right font-black text-indigo-400">LKR {totalLiquidationValue.toLocaleString()}</td>
                 <td className={`px-6 py-4 text-right font-black ${totalNetPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>LKR {totalNetPL.toLocaleString()}</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
