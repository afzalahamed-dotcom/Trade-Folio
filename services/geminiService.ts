
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PredictionItem, DailyUpdate, TradeLogEntry } from "../types";

export interface PriceResponse {
  prices: Record<string, number>;
  sources: { title: string; uri: string }[];
}

export interface ChartAnalysisResult {
  ticker: string;
  date: string;
  timeframe: '1D' | '1W' | '1M' | 'UNKNOWN';
  price_data: {
    open?: number;
    high?: number;
    low?: number;
    close: number;
  };
  indicators: {
    rsi?: number;
    macd_hist?: number;
    sar?: number;
    macd_state?: string;
    sma_200?: number;
    ema_50?: number;
    bb_upper?: number;
    bb_lower?: number;
    bb_mid?: number;
  };
  detected_patterns: string[];
  recommendation: 'STRONG BUY' | 'BUY' | 'SELL' | 'STRONG SELL' | 'HOLD';
  confidence_score: number;
  trade_plan?: {
    entry: number;
    target: number;
    stop_loss: number;
  };
  explanation: string;
}

// Updated interface to use buyPrice instead of price to match Transaction type
export interface ExtractedTransaction {
  ticker: string;
  quantity: number;
  buyPrice: number;
  netAmount: number;
  date: string;
  type: 'BUY' | 'SELL';
  isStatementSnapshot?: boolean; 
}

function parseBase64(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/jpeg', data: dataUrl };
}

class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private cooldownUntil = 0;
  private readonly minDelay = 1000; 
  private readonly quotaCooldown = 90000; 

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
          throw err;
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      
      if (now < this.cooldownUntil) {
        const wait = this.cooldownUntil - now + 1000;
        await new Promise(r => setTimeout(r, wait));
      }

      const timeSinceLast = Date.now() - this.lastRequestTime;
      if (timeSinceLast < this.minDelay) {
        await new Promise(r => setTimeout(r, this.minDelay - timeSinceLast));
      }

      const task = this.queue.shift();
      if (task) {
        try {
          await task();
          this.lastRequestTime = Date.now();
        } catch (error: any) {
          const errorStr = JSON.stringify(error).toLowerCase();
          if (errorStr.includes('429') || errorStr.includes('quota')) {
            this.cooldownUntil = Date.now() + this.quotaCooldown;
          }
        }
      }
    }
    this.processing = false;
  }
}

const globalQueue = new RequestQueue();

export class GeminiService {
  private async callWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    try {
      return await globalQueue.add(fn);
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toLowerCase();
      const isQuotaError = errorStr.includes('429') || errorStr.includes('quota');
      
      if (isQuotaError && retries > 0) {
        await new Promise(r => setTimeout(r, 10000));
        return this.callWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  async fetchCurrentPrices(tickers: string[]): Promise<PriceResponse> {
    if (tickers.length === 0) return { prices: {}, sources: [] };
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Clean tickers for searching
    const searchTickers = tickers.map(t => t.split('.')[0]);

    try {
      const searchResponse = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Find the absolute latest market prices for these Colombo Stock Exchange (CSE) stocks: ${searchTickers.join(", ")}. Use reliable sources like CSE.lk or financial news.`,
        config: { tools: [{ googleSearch: {} }] },
      }));

      const sources: any[] = [];
      searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
        if (c.web) sources.push({ title: c.web.title, uri: c.web.uri });
      });

      const formatResponse = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on this text, extract the current price for each ticker: "${searchResponse.text}". Return as JSON object { "prices": [{ "ticker": "SYMBOL", "price": 0.00 }] }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ticker: { type: Type.STRING },
                    price: { type: Type.NUMBER }
                  },
                  required: ["ticker", "price"]
                }
              }
            },
            required: ["prices"]
          }
        }
      }));

      const data = JSON.parse(formatResponse.text || '{"prices":[]}');
      const priceMap: Record<string, number> = {};
      data.prices.forEach((item: any) => {
        if (item.ticker) {
          const key = item.ticker.toUpperCase().trim();
          priceMap[key] = item.price;
          // Also map the standard CSE format if symbol matches
          if (!key.includes('.')) {
            priceMap[`${key}.N0000`] = item.price;
          }
        }
      });
      
      return { prices: priceMap, sources };
    } catch (error: any) {
      console.error("Price fetch error:", error);
      return { prices: {}, sources: [] };
    }
  }

  // Updated parsing to use buyPrice in response schema to match Transaction type
  async parseTradeConfirmation(base64Image: string): Promise<ExtractedTransaction[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { mimeType, data } = parseBase64(base64Image);
    const prompt = `Extract trades from CSE Broker Trade Confirmation. Focus on 'Total Amount' or 'Net Amount'. Output JSON array.`;

    try {
      const response = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ticker: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                buyPrice: { type: Type.NUMBER },
                netAmount: { type: Type.NUMBER },
                date: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["BUY", "SELL"] }
              },
              required: ["ticker", "quantity", "buyPrice", "netAmount", "date", "type"]
            }
          }
        }
      }));
      return JSON.parse(response.text || '[]') as ExtractedTransaction[];
    } catch (error) { throw error; }
  }

  // Updated parsing to use buyPrice in response schema to match Transaction type
  async parseTabularText(rawText: string): Promise<ExtractedTransaction[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Extract holdings data from this text into JSON array: ${rawText}`;

    try {
      const response = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ticker: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                buyPrice: { type: Type.NUMBER },
                netAmount: { type: Type.NUMBER },
                date: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["BUY"] }
              },
              required: ["ticker", "quantity", "buyPrice", "netAmount", "date", "type"]
            }
          }
        }
      }));
      const results = JSON.parse(response.text || '[]') as ExtractedTransaction[];
      return results.map(r => ({ ...r, isStatementSnapshot: true }));
    } catch (error) { throw error; }
  }

  // Updated parsing to use buyPrice in response schema to match Transaction type
  async parsePortfolioStatement(base64Image: string): Promise<ExtractedTransaction[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { mimeType, data } = parseBase64(base64Image);
    const prompt = `Extract portfolio holdings into JSON array. Map columns to: ticker, quantity, buyPrice (avg), netAmount (total cost).`;

    try {
      const response = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ticker: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                buyPrice: { type: Type.NUMBER },
                netAmount: { type: Type.NUMBER },
                date: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["BUY"] }
              },
              required: ["ticker", "quantity", "buyPrice", "netAmount", "date", "type"]
            }
          }
        }
      }));
      const results = JSON.parse(response.text || '[]') as ExtractedTransaction[];
      return results.map(r => ({ ...r, isStatementSnapshot: true }));
    } catch (error) { throw error; }
  }

  async generatePredictionTable(analysisText: string, currentHoldings: string[], halalTickers: string[]): Promise<PredictionItem[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `CSE Market Analysis: "${analysisText}". Portfolio: [${currentHoldings.join(", ")}]. Halal: [${halalTickers.join(", ")}]. JSON Array.`;
    try {
      const response = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                rank: { type: Type.NUMBER }, ticker: { type: Type.STRING }, name: { type: Type.STRING }, isHalal: { type: Type.BOOLEAN }, action: { type: Type.STRING, enum: ["BUY", "HOLD", "SELL"] }, price: { type: Type.NUMBER }, confidence: { type: Type.NUMBER }, justification: { type: Type.STRING }, indicators: { type: Type.OBJECT, properties: { pattern: { type: Type.STRING }, rsi: { type: Type.NUMBER }, trend: { type: Type.STRING } } }
              }
            }
          }
        }
      }));
      return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
  }

  async analyzeChart(base64Image: string): Promise<ChartAnalysisResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { mimeType, data } = parseBase64(base64Image);
    try {
      const response = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: "Analyze TradingView chart. JSON." }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING }, date: { type: Type.STRING }, timeframe: { type: Type.STRING }, price_data: { type: Type.OBJECT, properties: { close: { type: Type.NUMBER } } }, indicators: { type: Type.OBJECT, properties: { rsi: { type: Type.NUMBER } } }, detected_patterns: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendation: { type: Type.STRING }, confidence_score: { type: Type.NUMBER }, explanation: { type: Type.STRING }
            }
          }
        }
      }));
      return JSON.parse(response.text || '{}') as ChartAnalysisResult;
    } catch (error) { throw error; }
  }

  async generateDailyPlan(ticker: string, dailyUpdates: DailyUpdate[], todayLogs: TradeLogEntry[], historicalLogs: TradeLogEntry[]): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Daily plan for ${ticker}. JSON.`;
    try {
      const response = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING }, recommendation: { type: Type.STRING }, confidence: { type: Type.NUMBER }, justification: { type: Type.STRING }, nextMove: { type: Type.STRING }, bestBuyPrice: { type: Type.NUMBER }, bestSellPrice: { type: Type.NUMBER }, waitTimeframe: { type: Type.STRING }, indicators: { type: Type.OBJECT, properties: { rsi: { type: Type.NUMBER }, macd: { type: Type.STRING } } }
            }
          }
        }
      }));
      return JSON.parse(response.text || "{}");
    } catch (error) { return null; }
  }

  async generateConsolidatedOutlook(ticker: string, analyses: TradeLogEntry[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Consolidate technical analyses for "${ticker}".`,
      });
      return response.text || "Unable to generate outlook.";
    } catch (error) { return "Error."; }
  }

  async fetchOHLCData(ticker: string): Promise<any[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const searchResponse = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Daily OHLC prices for last 30 days for "${ticker}" on CSE.`,
        config: { tools: [{ googleSearch: {} }] },
      }));
      const formatResponse = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Format to JSON array "history": {date, open, high, low, close}. Text: "${searchResponse.text}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { history: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, open: { type: Type.NUMBER }, high: { type: Type.NUMBER }, low: { type: Type.NUMBER }, close: { type: Type.NUMBER }, rsi: { type: Type.NUMBER } } } } }
          }
        }
      }));
      return JSON.parse(formatResponse.text || '{"history":[]}').history;
    } catch (error) { return []; }
  }

  async fetchHistoricalData(ticker: string): Promise<any[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const searchResponse = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Daily closing prices for "${ticker}" on CSE for the last 30 days.`,
        config: { tools: [{ googleSearch: {} }] },
      }));
      const formatResponse = await this.callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract to JSON array "history": {date, price}. Text: "${searchResponse.text}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { history: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, price: { type: Type.NUMBER } } } } }
          }
        }
      }));
      return JSON.parse(formatResponse.text || '{"history":[]}').history;
    } catch (error) { return []; }
  }
}

export const geminiService = new GeminiService();
