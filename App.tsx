import * as React from 'react';
const { useState, useEffect, useMemo, useCallback, useRef } = React;
import { Download, RefreshCw, Trash2, Edit2, TrendingUp, TrendingDown, Briefcase, LayoutDashboard, FileText, ShieldCheck, CloudUpload, Upload, CheckCircle, RotateCcw, Clipboard, Save, X, AlertTriangle, Code, FileJson, Sparkles, Palette, Zap } from 'lucide-react';
import { Transaction, TradeLogEntry, DailyUpdate, PortfolioLot, DatabaseState, PurificationPayment, PortfolioRow } from './types';
import { geminiService } from './services/geminiService';
import { persistenceService } from './services/persistenceService';
import { PortfolioTable } from './components/PortfolioTable';
import { TransactionForm } from './components/TransactionForm';
import { DashboardStats } from './components/DashboardStats';
import { DocumentParser } from './components/DocumentParser';
import { PredictionView } from './components/PredictionView';
import { TransactionListModal } from './components/TransactionListModal';
import { PLCalculator } from './components/PLCalculator';
import { FuturisticPortfolioVisuals } from './components/FuturisticPortfolioVisuals';
import { HALAL_PURIFICATION_DATA as INITIAL_HALAL_DATA } from './constants/halalData';

const THEMES = {
  dawn: { id: 'dawn', name: 'Crystal Dawn', bg: '#f8fafc', card: 'rgba(255, 255, 255, 0.7)', text: '#0f172a', primary: '#4f46e5', secondary: '#10b981', accent: '#f43f5e' },
  azure: { id: 'azure', name: 'Azure Glass', bg: '#f0f9ff', card: 'rgba(255, 255, 255, 0.75)', text: '#0c4a6e', primary: '#0ea5e9', secondary: '#10b981', accent: '#f43f5e' },
  mint: { id: 'mint', name: 'Mint Frost', bg: '#f0fdf4', card: 'rgba(255, 255, 255, 0.7)', text: '#064e3b', primary: '#059669', secondary: '#10b981', accent: '#f43f5e' },
  rose: { id: 'rose', name: 'Quartz Pink', bg: '#fff1f2', card: 'rgba(255, 255, 255, 0.8)', text: '#881337', primary: '#e11d48', secondary: '#10b981', accent: '#4f46e5' },
  slate: { id: 'slate', name: 'Steel Minimal', bg: '#f1f5f9', card: 'rgba(255, 255, 255, 0.7)', text: '#334155', primary: '#64748b', secondary: '#10b981', accent: '#f43f5e' }
};

const normalizeTicker = (t: string): string => {
  if (!t) return '';
  let clean = t.toUpperCase().trim();
  if (clean && !clean.includes('.')) {
    clean += '.N0000';
  }
  return clean;
};

const round = (val: number) => {
  const n = Number(val);
  if (isNaN(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const robustParseDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return new Date(y, m - 1, d).getTime();
    }
  }
  const timestamp = new Date(dateStr).getTime();
  return isNaN(timestamp) ? 0 : timestamp;
};

const normalizeTransactionData = (tx: any): Transaction => {
  const qty = Number(tx.quantity || tx.qty || tx.volume || 0);
  const prc = Number(tx.buyPrice || tx.price || tx.avgPrice || tx.avgCost || 0);
  const type = (tx.type || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  let net = Number(tx.netAmount || tx.totalAmount || tx.cost || 0);
  if (!net && qty > 0 && prc > 0) {
    net = type === 'BUY' ? round(qty * prc * 1.0112) : round(qty * prc * (1 - 0.0112));
  }
  return {
    id: tx.id || crypto.randomUUID(),
    ticker: normalizeTicker(tx.ticker || tx.symbol || tx.stock || ''),
    quantity: qty,
    buyPrice: prc,
    netAmount: net,
    besPrice: tx.besPrice ? Number(tx.besPrice) : undefined,
    sellPrice: tx.sellPrice ? Number(tx.sellPrice) : undefined,
    date: tx.date || new Date().toISOString().split('T')[0],
    type
  };
};

const App: React.FC = () => {
  // --- CORE STATE ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [tradeLog, setTradeLog] = useState<TradeLogEntry[]>([]);
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [halalList, setHalalList] = useState<Record<string, number>>({ ...INITIAL_HALAL_DATA });
  const [purificationPayments, setPurificationPayments] = useState<PurificationPayment[]>([]);
  const [theme, setTheme] = useState<string>(localStorage.getItem('folio_theme') || 'dawn');
  
  // --- UI STATE ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showJsonRecall, setShowJsonRecall] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [recallJsonInput, setRecallJsonInput] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prediction' | 'history' | 'calculator'>('dashboard');
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [selectedTickerForEdit, setSelectedTickerForEdit] = useState<string | null>(null);
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-app confirmation dialog state (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    subtitle?: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Non-blocking in-app notification toasts (replaces alert)
  const [toast, setToast] = useState<{ message: string; submessage?: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = useCallback((message: string, submessage?: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, submessage, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3800);
  }, []);

  // --- THEME ENGINE ---
  useEffect(() => {
    const root = document.documentElement;
    const colors = THEMES[theme as keyof typeof THEMES] || THEMES.dawn;
    root.style.setProperty('--theme-bg', colors.bg);
    root.style.setProperty('--theme-card-bg', colors.card);
    root.style.setProperty('--theme-text', colors.text);
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-accent', colors.accent);
    root.classList.remove('dark');
    localStorage.setItem('folio_theme', theme);
  }, [theme]);

  // --- PERSISTENCE ENGINE ---
  useEffect(() => {
    if (!hasLoadedInitially) return;
    const state: DatabaseState = {
      transactions,
      tradeLog,
      updates,
      halalList,
      purificationPayments,
      cachedPrices: prices,
      lastUpdated: new Date().toISOString()
    };
    persistenceService.saveData(state);
  }, [transactions, tradeLog, updates, halalList, purificationPayments, prices, hasLoadedInitially]);

  const loadStoredData = useCallback(async () => {
    try {
      const data = await persistenceService.loadData();
      setTransactions((data.transactions || []).map(normalizeTransactionData));
      setTradeLog(data.tradeLog || []);
      setUpdates(data.updates || []);
      setPurificationPayments(data.purificationPayments || []);
      if (data.halalList && Object.keys(data.halalList).length > 0) {
        setHalalList(prev => ({ ...prev, ...data.halalList }));
      }
      setPrices(data.cachedPrices || {});
      setHasLoadedInitially(true);
    } catch (e) { 
      console.error("Initialization error:", e);
      setHasLoadedInitially(true);
    }
  }, []);

  useEffect(() => { loadStoredData(); }, [loadStoredData]);

  // --- CALCULATION ENGINE ---
  const processedState = useMemo(() => {
    const chronological = [...transactions].sort((a, b) => {
      const dateA = robustParseDate(a.date);
      const dateB = robustParseDate(b.date);
      if (dateA !== dateB) return dateA - dateB;
      return a.type === 'BUY' ? -1 : 1;
    });

    const inventory: Record<string, { id: string, qty: number, net: number, date: string, unitCost: number, besPrice?: number }[]> = {};
    const ledger: (Transaction & { realizedPL: number | null, purification: number | null, unitCostBasis: number | null })[] = [];

    chronological.forEach(tx => {
      const ticker = normalizeTicker(tx.ticker);
      let realizedPL: number | null = null;
      let purification: number | null = null;
      let unitCostBasis: number | null = null;

      if (tx.type === 'BUY') {
        if (!inventory[ticker]) inventory[ticker] = [];
        const unitCost = tx.buyPrice > 0 ? tx.buyPrice : (tx.quantity > 0 ? tx.netAmount / tx.quantity : 0);
        inventory[ticker].push({
          id: tx.id,
          qty: tx.quantity,
          net: tx.netAmount,
          date: tx.date,
          unitCost,
          besPrice: tx.besPrice
        });
      } else {
        let sellQtyLeft = tx.quantity;
        let totalCostBasisOfSoldShares = 0;
        const tickerLots = inventory[ticker] || [];

        while (sellQtyLeft > 0 && tickerLots.length > 0) {
          const firstLot = tickerLots[0];
          const qtyToTake = Math.min(firstLot.qty, sellQtyLeft);
          const proportionalCost = (firstLot.net / firstLot.qty) * qtyToTake;
          totalCostBasisOfSoldShares += proportionalCost;
          firstLot.qty -= qtyToTake;
          firstLot.net -= proportionalCost;
          sellQtyLeft -= qtyToTake;
          if (firstLot.qty <= 0.0001) tickerLots.shift();
        }

        const grossProfit = tx.netAmount - totalCostBasisOfSoldShares;
        const purificationPct = halalList[ticker] ?? -1;
        purification = (grossProfit > 0 && purificationPct >= 0) ? round(grossProfit * (purificationPct / 100)) : 0;
        unitCostBasis = tx.quantity > 0 ? totalCostBasisOfSoldShares / tx.quantity : 0;
        realizedPL = round(grossProfit);
      }
      ledger.push({ ...tx, realizedPL, purification, unitCostBasis });
    });

    const dashboardRows: PortfolioRow[] = Object.entries(inventory).map(([ticker, lots]) => {
      const currentPrice = prices[ticker] || 0;
      const purificationPct = halalList[ticker] ?? 0;
      
      const activeLots: PortfolioLot[] = lots.map(l => {
        const value = round(l.qty * currentPrice);
        // Estimate selling fees/taxes (approx 1.12% for CSE retail)
        const sellingCosts = round(value * 0.0112);
        const rawPL = value - l.net - sellingCosts;
        const purification = (rawPL > 0 && purificationPct > 0) ? round(rawPL * (purificationPct / 100)) : 0;
        
        const pl = currentPrice > 0 ? round(rawPL - purification) : 0;
        const plPerc = l.net > 0 ? (pl / l.net) * 100 : 0;
        
        // Break Even Selling (BES) price for this lot:
        // CSE retail: 1.12% buy cost, 1.12% sell cost.
        // 1. If explicit besPrice is set by user or transaction, use it!
        let lotBesPrice = l.besPrice ? Number(l.besPrice) : 0;
        if (!lotBesPrice || lotBesPrice <= 0) {
          if (l.unitCost > 0) {
            const grossCost = l.qty * l.unitCost;
            if (l.net > grossCost * 1.005) {
              // l.net includes the buy-side transaction fees (contract net)
              lotBesPrice = l.net / (l.qty * (1 - 0.0112));
            } else {
              // l.net was entered as pure gross or without buy fees.
              // Account for BOTH buy fee (+1.12%) and sell fee (-1.12%):
              // Formula: (unitCost * 1.0112) / (1 - 0.0112)
              // For ATL @ 24.50: (24.50 * 1.0112) / 0.9888 = 25.0548 ≈ 25.05
              lotBesPrice = (l.unitCost * 1.0112) / (1 - 0.0112);
            }
          } else if (l.qty > 0 && l.net > 0) {
            lotBesPrice = l.net / (l.qty * (1 - 0.0112));
          } else {
            lotBesPrice = 0;
          }
        }

        return {
          transactionId: l.id,
          quantity: l.qty,
          purchasePrice: l.unitCost,
          besPrice: lotBesPrice,
          totalPurchaseNet: round(l.net),
          currentValue: value,
          profitOrLoss: pl,
          profitPercentage: plPerc,
          date: l.date
        };
      }).sort((a, b) => robustParseDate(b.date) - robustParseDate(a.date));

      const totalQty = activeLots.reduce((s, l) => s + l.quantity, 0);
      const totalInvestment = round(activeLots.reduce((s, l) => s + l.totalPurchaseNet, 0));
      const totalValue = round(totalQty * currentPrice);
      const profitOrLoss = round(activeLots.reduce((s, l) => s + l.profitOrLoss, 0));
      const profitPercentage = totalInvestment > 0 ? (profitOrLoss / totalInvestment) * 100 : 0;
      const avgBuyPrice = totalQty > 0 ? activeLots.reduce((s, l) => s + (l.quantity * l.purchasePrice), 0) / totalQty : 0;
      
      // Position-level BES Price:
      // Weighted average of each lot's BES price, ensuring selling all shares at besPrice breaks even after 1.12% CSE sell fee
      const besPrice = totalQty > 0 
        ? activeLots.reduce((s, l) => s + (l.quantity * (l.besPrice || 0)), 0) / totalQty
        : 0;

      return {
        ticker, totalQty, avgBuyPrice, besPrice, currentPrice, totalValue, totalInvestment, profitOrLoss, profitPercentage, lots: activeLots
      };
    }).filter(row => row.totalQty > 0.0001);

    const finalLedger = ledger.map((t, idx) => ({ ...t, _idx: idx }))
      .sort((a, b) => {
        const dateA = robustParseDate(a.date);
        const dateB = robustParseDate(b.date);
        if (dateB !== dateA) return dateB - dateA;
        return b._idx - a._idx;
      });

    return { ledger: finalLedger, dashboardRows };
  }, [transactions, prices, halalList]);

  const ledgerData = processedState.ledger;
  const portfolioData = processedState.dashboardRows;

  // --- HANDLERS ---
  const handleDelete = (id: string) => {
    if (!id) return;
    const tx = transactions.find(t => t.id === id);
    const label = tx ? `${tx.ticker} (${tx.type} ${tx.quantity.toLocaleString()} @ LKR ${tx.buyPrice})` : 'transaction record';
    setConfirmDialog({
      title: "Delete Transaction",
      subtitle: "Permanent Record Removal",
      message: `Are you sure you want to permanently delete this ${label}? This will remove it from all portfolio calculations.`,
      confirmLabel: "Delete Record",
      isDestructive: true,
      onConfirm: () => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        triggerToast("Transaction Deleted", "The record was permanently removed.");
      }
    });
  };

  const handleDeleteTicker = (ticker: string) => {
    if (!ticker) return;
    const norm = normalizeTicker(ticker);
    const count = transactions.filter(tr => normalizeTicker(tr.ticker) === norm).length;
    setConfirmDialog({
      title: `Delete Positions for ${ticker}`,
      subtitle: "Holdings Deletion",
      message: `Are you sure you want to delete all positions for ${ticker}? This will permanently wipe all ${count} transaction ${count === 1 ? 'record' : 'records'} associated with this ticker.`,
      confirmLabel: "Delete Positions",
      isDestructive: true,
      onConfirm: () => {
        setTransactions(prev => prev.filter(tr => normalizeTicker(tr.ticker) !== norm));
        triggerToast(`Deleted ${ticker}`, `Removed all ${count} position records.`);
      }
    });
  };

  const handleEditSubmit = (id: string, updatedFields: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
    setEditingTransaction(null);
    triggerToast("Changes Saved", "Transaction record updated.");
  };

  const handleUpdateBesPrice = (idOrTicker: string, newBesPrice: number, context?: any) => {
    if (newBesPrice <= 0) return;
    
    // Check if idOrTicker matches a transaction ID
    const isTx = transactions.some(t => t.id === idOrTicker);
    if (isTx) {
      setTransactions(prev => prev.map(t => {
        if (t.id !== idOrTicker) return t;
        // From BES price, derive execution price and net consideration
        // BES = (buyPrice * 1.0112) / 0.9888 => buyPrice = BES * 0.9888 / 1.0112
        const derivedBuyPrice = round((newBesPrice * 0.9888) / 1.0112 * 100) / 100;
        const derivedNet = round(t.quantity * newBesPrice * (1 - 0.0112));
        return {
          ...t,
          besPrice: newBesPrice,
          buyPrice: derivedBuyPrice,
          netAmount: derivedNet
        };
      }));
      triggerToast("BES Price Updated", `Lot BES price set to LKR ${newBesPrice.toFixed(2)}.`);
    } else {
      // It's a ticker symbol (e.g. 'ATL.N0000' or 'ATL')
      const targetTicker = normalizeTicker(idOrTicker);
      setTransactions(prev => {
        const matchingTxs = prev.filter(t => normalizeTicker(t.ticker) === targetTicker && t.type === 'BUY');
        if (matchingTxs.length === 0) return prev;
        
        return prev.map(t => {
          if (normalizeTicker(t.ticker) !== targetTicker || t.type !== 'BUY') return t;
          const derivedBuyPrice = round((newBesPrice * 0.9888) / 1.0112 * 100) / 100;
          const derivedNet = round(t.quantity * newBesPrice * (1 - 0.0112));
          return {
            ...t,
            besPrice: newBesPrice,
            buyPrice: derivedBuyPrice,
            netAmount: derivedNet
          };
        });
      });
      triggerToast("BES Price Updated", `${targetTicker} BES price set to LKR ${newBesPrice.toFixed(2)}.`);
    }
  };

  const handleResetPurificationDue = () => {
    const totalPurificationObligation = round(ledgerData.reduce((acc, t) => acc + (t.purification || 0), 0));
    const totalPaidSettlements = round(purificationPayments.reduce((acc, p) => acc + p.amount, 0));
    const totalPurificationDue = Math.max(0, round(totalPurificationObligation - totalPaidSettlements));

    if (totalPurificationDue <= 0.01) return;
    const currentDue = totalPurificationDue;
    setConfirmDialog({
      title: "Settle Due Balance",
      subtitle: "Purification Obligation",
      message: `Record a settlement payment of LKR ${currentDue.toLocaleString()} to clear your outstanding purification balance?`,
      confirmLabel: "Confirm Settlement",
      isDestructive: false,
      onConfirm: () => {
        const newPayment: PurificationPayment = { 
          id: crypto.randomUUID(), 
          amount: currentDue, 
          date: new Date().toISOString().split('T')[0], 
          notes: 'Manual Settlement' 
        };
        setPurificationPayments(prev => [...prev, newPayment]);
        triggerToast("Purification Settled", `LKR ${currentDue.toLocaleString()} logged as settled.`);
      }
    });
  };

  const handleResetPaymentHistory = () => {
    if (purificationPayments.length === 0) return;
    setConfirmDialog({
      title: "Clear Payment Records",
      subtitle: "Purification History",
      message: "Are you sure you want to clear all recorded purification payment history? This action cannot be undone.",
      confirmLabel: "Clear Payment Data",
      isDestructive: true,
      onConfirm: () => {
        setPurificationPayments([]);
        triggerToast("Payment Data Cleared", "Purification settlement history wiped.");
      }
    });
  };

  const handleClearAllTrades = () => {
    setConfirmDialog({
      title: "Wipe Trade History",
      subtitle: "Ledger Reset",
      message: "Are you sure you want to permanently wipe your entire transaction history stream?",
      confirmLabel: "Wipe History",
      isDestructive: true,
      onConfirm: () => {
        setTransactions([]);
        triggerToast("Trade History Wiped", "All transactions have been removed.");
      }
    });
  };

  const handleRestoreApp = async () => {
    await persistenceService.clearAllData();
    setTransactions([]);
    setTradeLog([]);
    setUpdates([]);
    setPurificationPayments([]);
    setPrices({});
    setRecallJsonInput('');
    setSelectedTickerForEdit(null);
    setEditingTransaction(null);
    setShowRestoreModal(false);
    setShowJsonRecall(false);
    triggerToast("App Restored", "All entries and local database instances wiped to factory state.");
  };

  const handleUpdatePrice = (ticker: string, newPrice: number) => {
    setPrices(prev => ({ ...prev, [ticker]: newPrice }));
    triggerToast("Price Updated", `${ticker} set to LKR ${newPrice}`);
  };

  const refreshPrices = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime < 10000 && lastRefreshTime !== 0) return;
    const tickers = Array.from(new Set(transactions.map(t => normalizeTicker(t.ticker)))).filter(Boolean) as string[];
    if (tickers.length === 0) return;
    setIsRefreshing(true);
    try {
      const { prices: newPrices } = await geminiService.fetchCurrentPrices(tickers);
      setPrices(prev => ({ ...prev, ...newPrices }));
      setLastRefreshTime(now);
      triggerToast("Prices Refreshed", `Updated live valuations for ${Object.keys(newPrices).length} tickers.`);
    } catch (err) { 
      console.error(err);
      triggerToast("Refresh Notice", "Could not fetch current prices at this time.", "error");
    } finally { 
      setIsRefreshing(false); 
    }
  }, [transactions, lastRefreshTime, triggerToast]);

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const cleanTicker = normalizeTicker(tx.ticker);
    setTransactions(prev => [...prev, normalizeTransactionData({ ...tx, ticker: cleanTicker })]);
    setShowAddForm(false);
    triggerToast("Position Recorded", `${tx.type} ${tx.quantity.toLocaleString()} shares of ${cleanTicker}.`);
  };

  const applySynchronizedData = useCallback((rawData: any) => {
    try {
      if (!rawData || typeof rawData !== 'object') throw new Error("Invalid format.");
      let incoming = Array.isArray(rawData) ? rawData : (rawData.transactions || []);
      setTransactions(incoming.map(normalizeTransactionData));
      if (rawData.halalList) setHalalList(prev => ({ ...prev, ...rawData.halalList }));
      setPrices(rawData.cachedPrices || rawData.prices || {});
      setPurificationPayments(rawData.purificationPayments || []);
      triggerToast("Data Synchronized", `Loaded ${incoming.length} transactions successfully.`);
      return true;
    } catch (err: any) {
      triggerToast("Sync Failed", err.message || "Invalid data format.", "error");
      return false;
    }
  }, [triggerToast]);

  const handleManualRecall = () => {
    try {
      const parsed = JSON.parse(recallJsonInput);
      if (applySynchronizedData(parsed)) {
        setShowJsonRecall(false);
        setRecallJsonInput('');
      }
    } catch (e: any) {
      triggerToast("Invalid JSON", "Could not parse JSON syntax. Check format and retry.", "error");
    }
  };

  const handleDownloadJSON = () => {
    const state: DatabaseState = {
      transactions,
      tradeLog,
      updates,
      halalList,
      purificationPayments,
      cachedPrices: prices,
      lastUpdated: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradefolio_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.dawn;
  const totalPurificationObligation = round(ledgerData.reduce((acc, t) => acc + (t.purification || 0), 0));
  const totalPaidSettlements = round(purificationPayments.reduce((acc, p) => acc + p.amount, 0));
  const totalPurificationDue = Math.max(0, round(totalPurificationObligation - totalPaidSettlements));

  return (
    <div className="min-h-screen theme-transition bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <nav className="bg-white/70 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl shadow-md theme-transition" style={{ backgroundColor: currentTheme.primary }}>
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">TradeFolio Master</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-0.5 font-mono-terminal theme-transition opacity-80" style={{ color: currentTheme.primary }}>Logic by AFZAL</p>
            </div>
          </div>
          
          <div className="hidden lg:flex space-x-1 bg-slate-100 p-1 rounded-2xl">
            {['dashboard', 'prediction', 'history', 'calculator'].map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab as any)} 
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all theme-transition ${activeTab === tab ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}`} 
                style={{ backgroundColor: activeTab === tab ? currentTheme.primary : 'transparent' }}>
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
             <div className="relative">
                <button type="button" onClick={() => setShowThemeSelector(!showThemeSelector)} className="p-2 text-slate-500 hover:text-slate-900 transition-all">
                  <Palette className="w-5 h-5" />
                </button>
                {showThemeSelector && (
                  <div className="absolute top-12 right-0 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xl z-[100] w-56 animate-in zoom-in-95 duration-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Visual Matrix Sync</p>
                    <div className="space-y-1">
                      {Object.values(THEMES).map(t => (
                        <button key={t.id} onClick={() => { setTheme(t.id); setShowThemeSelector(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${theme === t.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.primary }} />
                            {t.name}
                          </div>
                          {theme === t.id && <CheckCircle className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </div>
             <button type="button" onClick={() => setShowRestoreModal(true)} className="flex items-center space-x-1 px-3 py-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all" title="Restore App & Delete All Entries">
                <RotateCcw className="w-4 h-4" />
                <span className="font-mono-terminal hidden sm:inline text-[10px] uppercase">Restore</span>
             </button>
             <button type="button" onClick={() => setShowJsonRecall(true)} className="flex items-center space-x-1 px-3 py-2 text-slate-400 hover:text-slate-900 font-bold text-xs rounded-lg transition-all" title="Recall Data Matrix">
                <Upload className="w-4 h-4" />
                <span className="font-mono-terminal hidden sm:inline text-[10px]">RECALL</span>
             </button>
             <button type="button" onClick={() => setShowImporter(true)} className="hidden sm:flex items-center space-x-1 px-3 py-2 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 shadow-md theme-transition" style={{ backgroundColor: currentTheme.primary }}><FileText className="w-4 h-4" /><span>Importer</span></button>
             <button type="button" onClick={refreshPrices} disabled={isRefreshing} className="p-2 text-slate-400 hover:text-slate-900 transition-all" title="Refresh Live Prices"><RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
             <button type="button" onClick={() => setShowAddForm(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg">Add Position</button>
          </div>
        </div>

        {/* Mobile Tab Navigation for small screens */}
        <div className="lg:hidden flex overflow-x-auto px-4 py-2 bg-slate-100/90 border-t border-slate-200 gap-1.5 scrollbar-hide">
          {(['dashboard', 'prediction', 'history', 'calculator'] as const).map(tab => (
            <button 
              key={tab} 
              type="button" 
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all theme-transition text-center ${activeTab === tab ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 bg-white/60'}`} 
              style={{ backgroundColor: activeTab === tab ? currentTheme.primary : undefined }}>
              {tab === 'dashboard' ? 'Holdings' : tab === 'prediction' ? 'Intelligence' : tab === 'history' ? 'Ledger' : 'Calculator'}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {activeTab === 'dashboard' && (
          <>
            <DashboardStats data={portfolioData} />
            
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 theme-transition" style={{ color: currentTheme.primary }} />
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Market Strategy Terminal</h2>
              </div>
              <FuturisticPortfolioVisuals data={portfolioData} halalList={halalList} />
            </section>

            <div className="glass-morphism rounded-[2.5rem] p-10 theme-transition relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <LayoutDashboard className="w-64 h-64" style={{ color: currentTheme.primary }} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tighter relative z-10">
                <LayoutDashboard className="w-6 h-6" style={{ color: currentTheme.primary }} /> Current Holdings
              </h2>
              <div className="relative z-10">
                <PortfolioTable 
                  data={portfolioData} 
                  onEditTicker={setSelectedTickerForEdit} 
                  onDeleteTicker={handleDeleteTicker} 
                  onEditTransaction={(id) => setEditingTransaction(transactions.find(t => t.id === id) || null)} 
                  onDeleteTransaction={handleDelete} 
                  onUpdateTransaction={handleEditSubmit} 
                  onUpdateBesPrice={handleUpdateBesPrice}
                  onUpdatePrice={handleUpdatePrice} 
                  halalList={halalList} 
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'prediction' && <PredictionView currentHoldings={portfolioData} updates={updates} setUpdates={setUpdates} halalList={halalList} setHalalList={setHalalList} />}
        {activeTab === 'calculator' && <PLCalculator portfolioData={portfolioData} />}
        
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono-terminal">
              <div className="glass-morphism rounded-[2rem] p-8 flex items-center gap-6 group hover:border-emerald-500/30 transition-all">
                <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600"><TrendingUp className="w-8 h-8" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL PERFORMANCE</p>
                  <h3 className="text-3xl font-black text-emerald-600 text-glow-green">LKR {round(ledgerData.reduce((acc, t) => acc + (t.realizedPL || 0), 0)).toLocaleString()}</h3>
                </div>
              </div>

              <div className="glass-morphism rounded-[2rem] p-8 border border-amber-100 group hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-6 mb-4">
                  <div className="bg-amber-50 p-4 rounded-2xl text-amber-600"><ShieldCheck className="w-8 h-8" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PURIFICATION DUE</p>
                    <h3 className="text-3xl font-black text-amber-600">LKR {totalPurificationDue.toLocaleString()}</h3>
                  </div>
                </div>
                <button type="button" onClick={handleResetPurificationDue} disabled={totalPurificationDue <= 0.01}
                  className="w-full py-3 bg-white border border-amber-200 text-amber-600 rounded-xl text-[10px] font-black uppercase hover:bg-amber-50 transition-all disabled:opacity-30 shadow-sm">
                  Settle Due Balance
                </button>
              </div>

              <div className="glass-morphism rounded-[2rem] p-8 border border-sky-100 group hover:border-sky-500/30 transition-all">
                <div className="flex items-center gap-6 mb-4">
                  <div className="bg-sky-50 p-4 rounded-2xl text-sky-600"><CheckCircle className="w-8 h-8" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL PURIFIED</p>
                    <h3 className="text-3xl font-black text-sky-600">LKR {totalPaidSettlements.toLocaleString()}</h3>
                  </div>
                </div>
                <button type="button" onClick={handleResetPaymentHistory} className="w-full py-3 text-slate-400 hover:text-rose-600 rounded-xl text-[10px] font-black uppercase transition-colors">
                  Clear Payment Data
                </button>
              </div>
            </div>

            <div className="glass-morphism rounded-[2.5rem] p-10 theme-transition overflow-hidden">
               <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Asset Vector Ledger</h2>
                    <p className="text-[10px] text-slate-400 font-bold font-mono-terminal uppercase tracking-[0.2em] mt-1">Transaction History Stream</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowRestoreModal(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black border border-rose-100 hover:bg-rose-600 hover:text-white transition-all uppercase font-mono-terminal">
                      <RotateCcw className="w-4 h-4" /> Restore & Wipe All
                    </button>
                    <button type="button" onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-500 rounded-xl text-[10px] font-black border border-slate-200 hover:bg-slate-50 transition-all uppercase shadow-sm">
                      <Download className="w-4 h-4" /> Export Report
                    </button>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-100">
                   <thead>
                     <tr className="font-mono-terminal">
                       <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                       <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                       <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                       <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Flux</th>
                       <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Purification</th>
                       <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Command</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {ledgerData.map(t => (
                       <tr key={t.id} className="hover:bg-slate-50/50 group transition-all font-mono-terminal">
                         <td className="px-4 py-6 text-xs font-bold text-slate-400">{t.date}</td>
                         <td className="px-4 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black theme-transition leading-none tracking-tighter" style={{ color: currentTheme.primary }}>{t.ticker}</span>
                              <span className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase">{(t.quantity || 0).toLocaleString()} SHARES</span>
                            </div>
                         </td>
                         <td className="px-4 py-6 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${t.type === 'BUY' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{t.type}</span>
                         </td>
                         <td className={`px-4 py-6 text-sm text-right font-black ${t.realizedPL !== null ? (t.realizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-300'}`}>
                           {t.realizedPL !== null ? `LKR ${t.realizedPL.toLocaleString()}` : '-'}
                         </td>
                         <td className="px-4 py-6 text-sm text-right font-black text-amber-600">
                           {t.purification !== null && t.purification > 0 ? `LKR ${t.purification.toLocaleString()}` : '-'}
                         </td>
                         <td className="px-4 py-6">
                           <div className="flex items-center justify-center gap-2">
                             <button 
                               type="button" 
                               onClick={() => setEditingTransaction(t)} 
                               className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                               title="Edit transaction"
                             >
                               <Edit2 className="w-4 h-4" />
                             </button>
                             <button 
                               type="button" 
                               onClick={() => handleDelete(t.id)} 
                               className="p-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl transition-all"
                               title="Delete transaction"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {ledgerData.length === 0 && <div className="py-20 text-center text-slate-300 uppercase font-mono-terminal text-xs tracking-widest">No transaction data synchronized.</div>}
               </div>
            </div>
          </div>
        )}
      </main>

      <input type="file" ref={fileInputRef} hidden accept=".json" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const data = await persistenceService.parseImportFile(file);
            if (applySynchronizedData(data)) setShowJsonRecall(false);
          } catch (err) { 
            triggerToast("Matrix Read Error", "Failed to parse file. Make sure it is valid JSON.", "error"); 
          }
        }
      }} />

      {showJsonRecall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white"><FileJson className="w-5 h-5" /></div>
                <div><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Logical Matrix Recall</h3></div>
              </div>
              <button type="button" onClick={() => setShowJsonRecall(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-6">
              <button type="button" onClick={handleFileUpload}
                className="w-full py-10 bg-slate-50 text-indigo-600 rounded-[2rem] font-black uppercase text-xs border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-4 font-mono-terminal">
                <Upload className="w-10 h-10" />
                <span>Inject Logical Snapshot (.json)</span>
              </button>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Manual Logic Import</p>
                  {recallJsonInput && (
                    <button 
                      type="button" 
                      onClick={() => setRecallJsonInput('')} 
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 font-mono-terminal uppercase"
                    >
                      Clear Input
                    </button>
                  )}
                </div>
                <textarea value={recallJsonInput} onChange={(e) => setRecallJsonInput(e.target.value)} 
                  className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-mono-terminal text-xs outline-none text-slate-800 focus:border-indigo-300" 
                  placeholder='{"transactions": [...]}' />
                <button type="button" onClick={handleManualRecall} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs hover:bg-black transition-all shadow-lg">Commit to Local Instance</button>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono-terminal">Need to start fresh?</span>
                  <button 
                    type="button" 
                    onClick={() => { setShowJsonRecall(false); setShowRestoreModal(true); }} 
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 font-mono-terminal uppercase flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore & Wipe All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRestoreModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-rose-100 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-950 uppercase tracking-tight">Restore App</h3>
                  <p className="text-[10px] font-bold text-rose-600 font-mono-terminal uppercase tracking-wider">Factory Data Reset</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowRestoreModal(false)} className="p-2 hover:bg-rose-100 rounded-full transition-colors text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3 text-xs text-slate-700">
                <p className="font-black text-rose-900 text-sm">Are you sure you want to restore the app and delete all entries?</p>
                <p className="text-slate-600">This action cannot be undone and will permanently wipe:</p>
                <ul className="list-disc pl-5 space-y-1 font-mono-terminal text-[11px] text-slate-600">
                  <li>All buy and sell stock transaction entries</li>
                  <li>Portfolio inventory, lots & realized P/L</li>
                  <li>Recorded purification payment history</li>
                  <li>Market prediction notes & AI summaries</li>
                  <li>Live cached prices & browser local storage</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="flex-1 py-4 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-xs rounded-2xl transition-all font-mono-terminal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreApp}
                  className="flex-1 py-4 px-5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs rounded-2xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 font-mono-terminal"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Restore & Delete All</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className={`px-8 py-6 border-b flex items-center justify-between ${confirmDialog.isDestructive ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl shadow-md text-white ${confirmDialog.isDestructive ? 'bg-rose-600 shadow-rose-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
                  {confirmDialog.isDestructive ? <Trash2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-tight ${confirmDialog.isDestructive ? 'text-rose-950' : 'text-indigo-950'}`}>{confirmDialog.title}</h3>
                  {confirmDialog.subtitle && (
                    <p className={`text-[10px] font-bold font-mono-terminal uppercase tracking-wider ${confirmDialog.isDestructive ? 'text-rose-600' : 'text-indigo-600'}`}>{confirmDialog.subtitle}</p>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setConfirmDialog(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-sm font-medium text-slate-700 leading-relaxed font-mono-terminal">
                {confirmDialog.message}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-xs rounded-2xl transition-all font-mono-terminal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    action();
                  }}
                  className={`flex-1 py-3.5 px-4 text-white font-black uppercase text-xs rounded-2xl transition-all shadow-lg font-mono-terminal flex items-center justify-center gap-2 ${
                    confirmDialog.isDestructive 
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' 
                      : 'bg-slate-900 hover:bg-black shadow-slate-200'
                  }`}
                >
                  {confirmDialog.isDestructive && <Trash2 className="w-4 h-4" />}
                  <span>{confirmDialog.confirmLabel || 'Confirm'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[120] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5 duration-300 font-mono-terminal text-xs max-w-sm">
          <div className={`p-2 rounded-xl font-black ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-white uppercase text-[11px]">{toast.message}</p>
            {toast.submessage && <p className="text-slate-400 text-[10px] mt-0.5">{toast.submessage}</p>}
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showImporter && <DocumentParser onClose={() => setShowImporter(false)} onConfirm={(txs) => { txs.forEach(tx => addTransaction(tx)); setShowImporter(false); }} onDownloadJSON={handleDownloadJSON} />}
      {showAddForm && <TransactionForm onSubmit={addTransaction} onClose={() => setShowAddForm(false)} />}
      {selectedTickerForEdit && <TransactionListModal ticker={selectedTickerForEdit} transactions={transactions.filter(t => normalizeTicker(t.ticker) === normalizeTicker(selectedTickerForEdit))} onClose={() => setSelectedTickerForEdit(null)} onEdit={(tx) => { setEditingTransaction(tx); setSelectedTickerForEdit(null); }} onDelete={handleDelete} />}
      {editingTransaction && (
        <TransactionForm 
          initialTicker={editingTransaction.ticker} 
          initialPrice={editingTransaction.buyPrice} 
          initialNetAmount={editingTransaction.netAmount} 
          initialQuantity={editingTransaction.quantity} 
          initialBesPrice={editingTransaction.besPrice}
          initialDate={editingTransaction.date} 
          initialType={editingTransaction.type} 
          isEditing={true} 
          onSubmit={(fields) => handleEditSubmit(editingTransaction.id, fields)} 
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};

export default App;