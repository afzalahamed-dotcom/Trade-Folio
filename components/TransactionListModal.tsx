
import * as React from 'react';
import { Transaction } from '../types';
import { X, Trash2, Edit2, History, List } from 'lucide-react';

interface Props {
  ticker: string;
  transactions: Transaction[];
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionListModal: React.FC<Props> = ({ ticker, transactions, onClose, onEdit, onDelete }) => {
  const sortedTransactions = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <List className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">{ticker} History</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transaction Records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
          {sortedTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-lg transition-all group">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl font-black text-xs ${tx.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {tx.type}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">
                    {tx.quantity.toLocaleString()} Shares @ LKR {tx.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{tx.date}</span>
                    {tx.type === 'BUY' && (
                      <span className="text-[10px] font-mono-terminal font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        BES LKR {(tx.besPrice || ((tx.buyPrice * 1.0112) / 0.9888)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => onEdit(tx)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit transaction"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => onDelete(tx.id)}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete transaction record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <History className="w-12 h-12 text-gray-200 mx-auto" />
              <p className="text-gray-400 font-medium">No transaction records found for this stock.</p>
            </div>
          )}
        </div>
        
        <div className="p-8 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase">End of records</p>
        </div>
      </div>
    </div>
  );
};
