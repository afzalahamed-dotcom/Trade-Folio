
export interface Transaction {
  id: string;
  ticker: string;
  quantity: number;
  buyPrice: number; // Price per share
  netAmount: number; // Total net amount from broker document (includes fees)
  sellPrice?: number;
  date: string;
  type: 'BUY' | 'SELL';
}

export interface PurificationPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface StockInfo {
  ticker: string;
  currentPrice: number;
  lastUpdated: string;
}

// Added HistoricalDataPoint type for market performance history
export interface HistoricalDataPoint {
  date: string;
  price: number;
}

// Added OHLCDataPoint type for candlestick charts
export interface OHLCDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  rsi?: number;
}

export interface PortfolioLot {
  transactionId: string;
  quantity: number;
  purchasePrice: number;
  totalPurchaseNet: number; // The actual money paid out
  currentValue: number;
  profitOrLoss: number;
  profitPercentage: number;
  date: string;
}

export interface PortfolioRow {
  ticker: string;
  totalQty: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  totalInvestment: number; // Sum of Net Amounts of remaining lots
  profitOrLoss: number;
  profitPercentage: number;
  lots: PortfolioLot[];
}

export interface TradeLogEntry {
  id: string;
  date: string;
  ticker: string;
  price: number;
  pattern: string;
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  explanation: string;
  timeframe: '1D' | '1W' | '1M' | 'UNKNOWN';
  rsi?: number;
  macd?: string;
  imageData: string;
}

export interface DailyUpdate {
  id: string;
  timestamp: string;
  text: string;
  ticker?: string; 
}

// Added TodaysPlanEntry type for AI daily strategy
export interface TodaysPlanEntry {
  ticker: string;
  companyName?: string;
  recommendation: string;
  confidence: number;
  justification: string;
  nextMove: string;
  bestBuyPrice: number;
  bestSellPrice: number;
  indicators: {
    rsi?: number;
    macd?: string;
  };
  lastUpdated: string;
  waitTimeframe?: string;
}

export interface PredictionItem {
  rank: number;
  ticker: string;
  name: string;
  isHalal: boolean;
  action: 'BUY' | 'HOLD' | 'SELL';
  price: number;
  confidence: number;
  justification: string;
  indicators: {
    pattern?: string;
    rsi?: number;
    trend?: string;
  };
}

export interface DatabaseState {
  transactions: Transaction[];
  tradeLog: TradeLogEntry[];
  updates: DailyUpdate[];
  halalList: Record<string, number>;
  cachedPrices: Record<string, number>;
  purificationPayments?: PurificationPayment[];
  lastUpdated: string;
}
