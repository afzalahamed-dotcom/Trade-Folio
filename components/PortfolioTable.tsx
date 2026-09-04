import * as React from 'react';
const { useState } = React;
import { PortfolioRow, Transaction } from '../types';
import { TrendingUp, TrendingDown, Edit3, ShieldCheck, ChevronDown, ChevronRight, Calculator, Trash2, Edit2, Check, X } from 'lucide-react';

interface Props {
  data: PortfolioRow[];
  onEditTicker: (ticker: string) => void;
  onDeleteTicker: (ticker: string) => void;
  onEditTransaction: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onUpdateBesPrice?: (idOrTicker: string, newBesPrice: number, context?: any) => void;
  onUpdatePrice: (ticker: string, newPrice: number) => void;
  halalList: Record<string, number>;
  compact?: boolean;
}

export const PortfolioTable: React.FC<Props> = ({ 
  data, 
  onEditTicker, 
  onDeleteTicker, 
  onEditTransaction, 
  onDeleteTransaction, 
  onUpdateTransaction,
  onUpdateBesPrice,
  onUpdatePrice,
  halalList 
}) => {
  const [expandedTickers, setExpandedTickers] = useState<Record<string, boolean>>({});
  const [editingCell, setEditingCell] = useState<{ idOrTicker: string; field: string; value: string; context?: any } | null>(null);

  const toggleExpand = (ticker: string) => {
    setExpandedTickers(prev => ({ ...prev, [ticker]: !prev[ticker] }));
  };

  const startEdit = (idOrTicker: string, field: string, value: any, context?: any) => {
    setEditingCell({ idOrTicker, field, value: value.toString(), context });
  };

  const handleSave = () => {
    if (!editingCell) return;
    const { idOrTicker, field, value, context } = editingCell;
    const numValue = parseFloat(value) || 0;

    if (field === 'currentPrice') {
      onUpdatePrice(idOrTicker, numValue);
    } else if (field === 'besPrice') {
      if (onUpdateBesPrice) {
        onUpdateBesPrice(idOrTicker, numValue, context);
      } else {
        onUpdateTransaction(idOrTicker, { besPrice: numValue });
      }
    } else {
      const updates: any = {};
      if (field === 'quantity') updates.quantity = numValue;
      if (field === 'purchasePrice') {
        updates.buyPrice = numValue;
        // Recalculate standard CSE BES Price: (buyPrice * 1.0112) / 0.9888
        updates.besPrice = Math.round(((numValue * 1.0112) / 0.9888) * 100) / 100;
        if (context?.quantity) {
          updates.netAmount = Math.round(context.quantity * numValue * 1.0112 * 100) / 100;
        }
      }
      if (field === 'totalPurchaseNet') {
        updates.netAmount = numValue;
        if (context?.quantity > 0) {
          updates.besPrice = Math.round((numValue / (context.quantity * (1 - 0.0112))) * 100) / 100;
        }
      }
      if (field === 'date') updates.date = value;
      onUpdateTransaction(idOrTicker, updates);
    }
    
    setEditingCell(null);
  };

  const renderEditableCell = (idOrTicker: string, field: string, value: any, displayValue: string, isNumeric = false, context?: any) => {
    const isEditing = editingCell?.idOrTicker === idOrTicker && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            type={field === 'date' ? 'date' : 'number'}
            step="any"
            className="w-24 px-2 py-1 bg-white border border-indigo-400 rounded text-slate-900 text-xs font-bold shadow-sm outline-none"
            value={editingCell.value}
            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value, context })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditingCell(null);
            }}
          />
          <button onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
          <button onClick={() => setEditingCell(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><X className="w-4 h-4" /></button>
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-indigo-50/50 px-2 py-1 rounded transition-colors flex items-center justify-end gap-2 group/edit"
        onClick={(e) => {
          e.stopPropagation();
          startEdit(idOrTicker, field, value, context);
        }}
      >
        <span className={isNumeric ? "font-mono-terminal font-bold text-slate-700" : "text-slate-600"}>{displayValue}</span>
        <Edit2 className="w-3 h-3 text-slate-300 group-hover/edit:text-indigo-400 transition-colors" />
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Vector</th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Units</th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest" title="Break Even Selling Price per share (includes CSE 1.12% buying and selling fees)">BES Price</th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cost</th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Point</th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Flux</th>
            <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row) => {
            const halalInfo = halalList[row.ticker];
            const isExpanded = expandedTickers[row.ticker];
            
            return (
              <React.Fragment key={row.ticker}>
                <tr className={`hover:bg-indigo-50/30 transition-all group cursor-pointer ${isExpanded ? 'bg-indigo-50/40' : 'bg-white'}`} onClick={() => toggleExpand(row.ticker)}>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{row.ticker}</span>
                          {halalInfo !== undefined && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                        {halalInfo !== undefined && (
                          <span className="text-[9px] font-black text-emerald-600 opacity-60 uppercase tracking-widest">PURIFY {halalInfo}%</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-right font-mono-terminal font-black text-slate-800">
                    {row.totalQty.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-right font-mono-terminal">
                    <div className="flex flex-col items-end">
                      {renderEditableCell(
                        row.ticker,
                        'besPrice',
                        Number((row.besPrice || 0).toFixed(2)),
                        (row.besPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        true,
                        { lots: row.lots, totalQty: row.totalQty, avgBuyPrice: row.avgBuyPrice }
                      )}
                      <span className="text-[9px] font-bold text-slate-400 tracking-tight" title={`Simple Average Buy Cost: LKR ${row.avgBuyPrice.toFixed(2)}`}>
                        AVG {row.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-right font-mono-terminal font-bold text-slate-900">
                    {row.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-right">
                    {renderEditableCell(row.ticker, 'currentPrice', row.currentPrice, row.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }), true)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-right">
                    {row.currentPrice > 0 ? (
                      <div className={`flex flex-col items-end ${row.profitOrLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div className="flex items-center gap-1 font-mono-terminal font-black">
                          {row.profitOrLoss >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{row.profitOrLoss.toLocaleString()}</span>
                        </div>
                        <span className="text-[10px] font-black tracking-widest mt-0.5 opacity-60">{row.profitPercentage.toFixed(2)}%</span>
                      </div>
                    ) : <span className="text-slate-300 font-mono-terminal uppercase text-[10px] font-black tracking-widest animate-pulse">Waiting Pulse...</span>}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditTicker(row.ticker); }} 
                        className="p-2 bg-slate-100 text-slate-600 hover:text-white hover:bg-indigo-600 rounded-xl transition-all shadow-sm"
                        title={`Edit transactions for ${row.ticker}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteTicker(row.ticker); }} 
                        className="p-2 bg-rose-50 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl transition-all shadow-sm"
                        title={`Delete all positions for ${row.ticker}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded && row.lots.map((lot, idx) => (
                  <tr key={lot.transactionId} className="bg-slate-50/80 animate-in slide-in-from-top-1 duration-200 group/lot border-l-2 border-indigo-200">
                    <td className="px-6 py-4 whitespace-nowrap pl-14">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">SNAPSHOT #{idx + 1}</span>
                          <div className="mt-1">
                            {renderEditableCell(lot.transactionId, 'date', lot.date, lot.date)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-right text-slate-500 font-mono-terminal">
                      {renderEditableCell(lot.transactionId, 'quantity', lot.quantity, lot.quantity.toLocaleString(), true)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono-terminal">
                      <div className="flex flex-col items-end">
                        {renderEditableCell(
                          lot.transactionId,
                          'besPrice',
                          Number((lot.besPrice || 0).toFixed(2)),
                          (lot.besPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                          true,
                          { quantity: lot.quantity, purchasePrice: lot.purchasePrice }
                        )}
                        <div className="text-[8px] text-slate-400">
                          {renderEditableCell(lot.transactionId, 'purchasePrice', lot.purchasePrice, `BUY ${lot.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, true, { quantity: lot.quantity })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-right text-slate-400 font-bold font-mono-terminal">
                      {lot.totalPurchaseNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-right text-slate-500">
                      <div className="flex flex-col items-end font-mono-terminal">
                        <span className="text-slate-900 font-black">{lot.currentValue > 0 ? lot.currentValue.toLocaleString() : '-'}</span>
                        <div className="flex items-center gap-1 mt-1 text-[8px] opacity-40">
                          <Calculator className="w-2.5 h-2.5" />
                          {renderEditableCell(lot.transactionId, 'totalPurchaseNet', lot.totalPurchaseNet, lot.totalPurchaseNet.toLocaleString())}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {lot.currentValue > 0 ? (
                        <div className={`flex flex-col items-end font-mono-terminal ${lot.profitOrLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          <span className="text-xs font-black">{lot.profitOrLoss >= 0 ? '+' : ''}{lot.profitOrLoss.toLocaleString()}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2 opacity-80 group-hover/lot:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEditTransaction(lot.transactionId); }} 
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit snapshot transaction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteTransaction(lot.transactionId); }} 
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete snapshot transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && <div className="py-20 text-center text-slate-300 font-mono-terminal text-sm uppercase tracking-widest">No active holdings synchronized.</div>}
    </div>
  );
};