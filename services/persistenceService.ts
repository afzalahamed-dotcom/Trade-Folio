
import { DatabaseState, Transaction } from '../types';

const STORAGE_KEY = 'foliomaster_local_db';
const DB_FILE_PATH = './database.json';

const normalizeTicker = (t: string): string => {
  if (!t) return '';
  let clean = t.toUpperCase().trim();
  if (clean && !clean.includes('.')) clean += '.N0000';
  return clean;
};

// Ensure all transaction fields are mapped correctly upon loading
const normalizeLoadedTransaction = (tx: any): Transaction => ({
  id: tx.id || crypto.randomUUID(),
  ticker: normalizeTicker(tx.ticker || tx.symbol || tx.stock || ''),
  quantity: Number(tx.quantity || tx.qty || tx.volume || 0),
  buyPrice: Number(tx.buyPrice || tx.price || tx.avgPrice || tx.avgCost || 0),
  netAmount: Number(tx.netAmount || tx.totalAmount || tx.cost || ((tx.quantity || tx.qty || 0) * (tx.buyPrice || tx.price || 0)) || 0),
  date: tx.date || new Date().toISOString().split('T')[0],
  type: (tx.type || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY'
});

export class PersistenceService {
  private static instance: PersistenceService;

  private constructor() {}

  static getInstance(): PersistenceService {
    if (!PersistenceService.instance) {
      PersistenceService.instance = new PersistenceService();
    }
    return PersistenceService.instance;
  }

  async loadData(): Promise<DatabaseState> {
    const defaultState: DatabaseState = {
      transactions: [],
      tradeLog: [],
      updates: [],
      halalList: {},
      cachedPrices: {},
      lastUpdated: new Date(0).toISOString()
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const localData = JSON.parse(saved);
        if (localData) {
          return {
            ...localData,
            transactions: (localData.transactions || []).map(normalizeLoadedTransaction)
          };
        }
      } catch (e) {
        console.error('Local storage corruption detected.');
      }
    }

    try {
      const response = await fetch(`${DB_FILE_PATH}?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const driveData = await response.json();
        return {
          ...driveData,
          transactions: (driveData.transactions || []).map(normalizeLoadedTransaction)
        };
      }
    } catch (e) {
      console.warn('Connected database.json not reachable.');
    }

    return defaultState;
  }

  async saveData(state: DatabaseState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  exportToDrive(state: DatabaseState) {
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'database.json';
    link.click();
    URL.revokeObjectURL(url);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async parseImportFile(file: File): Promise<DatabaseState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data && data.transactions) {
            data.transactions = data.transactions.map(normalizeLoadedTransaction);
          }
          resolve(data);
        } catch (err) {
          reject(new Error("Invalid JSON format"));
        }
      };
      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsText(file);
    });
  }
}

export const persistenceService = PersistenceService.getInstance();
