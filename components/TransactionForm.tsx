
import * as React from 'react';
const { useState } = React;
import { X, Check, Calculator } from 'lucide-react';

interface Props {
  initialTicker?: string;
  initialPrice?: number;
  initialNetAmount?: number;
  initialQuantity?: number;
  initialDate?: string;
  initialType?: 'BUY' | 'SELL';
  isEditing?: boolean;
  onSubmit: (tx: { ticker: string; quantity: number; buyPrice: number; netAmount: number; date: string; type: 'BUY' | 'SELL' }) => void;
  onClose: () => void;
}

export const TransactionForm: React.FC<Props> = ({ 
  initialTicker, 
  initialPrice, 
  initialNetAmount,
  initialQuantity,
  initialDate,
  initialType, 
  isEditing,
  onSubmit, 
  onClose 
}) => {
  const [ticker, setTicker] = useState(initialTicker || '');
  const [quantity, setQuantity] = useState(initialQuantity ? initialQuantity.toString() : '');
  const [price, setPrice] = useState(initialPrice ? initialPrice.toString() : '');
  const [netAmount, setNetAmount] = useState(initialNetAmount ? initialNetAmount.toString() : '');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'BUY' | 'SELL'>(initialType || 'BUY');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;

    let cleanTicker = ticker.toUpperCase().trim();
    if (cleanTicker && !cleanTicker.includes('.')) {
      cleanTicker += '.N0000';
    }

    const qtyVal = Number(quantity);
    const prcVal = Number(price);
    // If netAmount is not provided, fallback to standard calculation
    const netVal = netAmount ? Number(netAmount) : (qtyVal * prcVal);

    onSubmit({
      ticker: cleanTicker,
      quantity: qtyVal,
      buyPrice: prcVal,
      netAmount: netVal,
      date,
      type
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">{isEditing ? 'Correct Entry' : 'Record Transaction'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button type="button" onClick={() => setType('BUY')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'BUY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Buy</button>
            <button type="button" onClick={() => setType('SELL')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'SELL' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Sell</button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Ticker</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none font-mono" value={ticker} onChange={(e) => setTicker(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
              <input required type="number" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price per Share</label>
              <input required type="number" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Calculator className="w-3 h-3" /> Total Net Amount (Broker Document Total)
            </label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="Settlement amount..."
              className="w-full bg-transparent text-lg font-black text-indigo-700 placeholder:text-indigo-200 outline-none"
              value={netAmount}
              onChange={(e) => setNetAmount(e.target.value)}
            />
            <p className="mt-1 text-[9px] text-indigo-400">Captures exact value including fees & taxes.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
            <input required type="date" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <button type="submit" className={`w-full py-3 rounded-xl text-white font-bold text-lg shadow-lg ${type === 'BUY' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}`}>
            <span>{isEditing ? 'Save Changes' : `Record ${type}`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
