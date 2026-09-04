
import * as React from 'react';
const { useState, useEffect } = React;
import { X, Calculator, ShieldCheck } from 'lucide-react';

interface Props {
  initialTicker?: string;
  initialPrice?: number;
  initialNetAmount?: number;
  initialQuantity?: number;
  initialBesPrice?: number;
  initialDate?: string;
  initialType?: 'BUY' | 'SELL';
  isEditing?: boolean;
  onSubmit: (tx: { ticker: string; quantity: number; buyPrice: number; netAmount: number; besPrice?: number; date: string; type: 'BUY' | 'SELL' }) => void;
  onClose: () => void;
}

export const TransactionForm: React.FC<Props> = ({ 
  initialTicker, 
  initialPrice, 
  initialNetAmount,
  initialQuantity,
  initialBesPrice,
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
  
  // Calculate initial default BES price if not provided
  const calculateDefaultBes = (prc: number) => {
    if (!prc || prc <= 0) return '';
    return ((prc * 1.0112) / 0.9888).toFixed(2);
  };

  const [besPrice, setBesPrice] = useState<string>(
    initialBesPrice ? initialBesPrice.toString() : (initialPrice ? calculateDefaultBes(initialPrice) : '')
  );
  
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'BUY' | 'SELL'>(initialType || 'BUY');

  // When Price per Share changes, update BES price and default net amount if type is BUY
  const handlePriceChange = (newPriceStr: string) => {
    setPrice(newPriceStr);
    const prc = parseFloat(newPriceStr);
    const qty = parseFloat(quantity) || 0;
    if (prc > 0) {
      const calculatedBes = ((prc * 1.0112) / 0.9888).toFixed(2);
      setBesPrice(calculatedBes);
      if (qty > 0 && (!netAmount || !isEditing)) {
        setNetAmount((qty * prc * 1.0112).toFixed(2));
      }
    }
  };

  // When BES Price is manually edited, derive Price per Share and Net Amount
  const handleBesPriceChange = (newBesStr: string) => {
    setBesPrice(newBesStr);
    const bes = parseFloat(newBesStr);
    const qty = parseFloat(quantity) || 0;
    if (bes > 0) {
      const derivedPrice = ((bes * 0.9888) / 1.0112).toFixed(2);
      setPrice(derivedPrice);
      if (qty > 0) {
        setNetAmount((qty * bes * (1 - 0.0112)).toFixed(2));
      }
    }
  };

  // When Quantity changes, adjust net amount if available
  const handleQuantityChange = (newQtyStr: string) => {
    setQuantity(newQtyStr);
    const qty = parseFloat(newQtyStr);
    const prc = parseFloat(price) || 0;
    if (qty > 0 && prc > 0 && (!netAmount || !isEditing)) {
      setNetAmount((qty * prc * 1.0112).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;

    let cleanTicker = ticker.toUpperCase().trim();
    if (cleanTicker && !cleanTicker.includes('.')) {
      cleanTicker += '.N0000';
    }

    const qtyVal = Number(quantity);
    const prcVal = Number(price);
    const besVal = besPrice ? Number(besPrice) : Number(((prcVal * 1.0112) / 0.9888).toFixed(2));
    // If netAmount is not provided, fallback to standard CSE net calculation
    const netVal = netAmount ? Number(netAmount) : (type === 'BUY' ? Number((qtyVal * prcVal * 1.0112).toFixed(2)) : (qtyVal * prcVal));

    onSubmit({
      ticker: cleanTicker,
      quantity: qtyVal,
      buyPrice: prcVal,
      netAmount: netVal,
      besPrice: besVal,
      date,
      type
    });
  };

  const handleClearInputs = () => {
    setTicker('');
    setQuantity('');
    setPrice('');
    setBesPrice('');
    setNetAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setType('BUY');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">{isEditing ? 'Correct Entry' : 'Record Transaction'}</h3>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={handleClearInputs} 
              className="text-xs font-bold text-gray-400 hover:text-rose-600 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors uppercase tracking-wider font-mono-terminal"
            >
              Clear Inputs
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
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
              <input required type="number" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none" value={quantity} onChange={(e) => handleQuantityChange(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price per Share</label>
              <input required type="number" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none" value={price} onChange={(e) => handlePriceChange(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> BES Price (Break Even Selling)
                </label>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  CSE Fee: 1.12%
                </span>
              </div>
              <input 
                type="number" 
                step="0.01" 
                placeholder="Break even exit price..."
                className="w-full bg-transparent text-lg font-black text-emerald-700 placeholder:text-emerald-300 outline-none"
                value={besPrice}
                onChange={(e) => handleBesPriceChange(e.target.value)}
              />
              <p className="mt-1 text-[9px] text-emerald-600">
                Editable target selling price to recover full investment after CSE transaction costs.
              </p>
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
              <p className="mt-1 text-[9px] text-indigo-400">Captures exact contract value including brokerage fees & taxes.</p>
            </div>
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
