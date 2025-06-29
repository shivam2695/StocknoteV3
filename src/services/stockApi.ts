// Indian Stock Market API service
const STOCK_API_KEY = import.meta.env.VITE_STOCK_API_KEY || 'sk-live-JkP8ooGRFbCdtnoGXJvzZOgQgwbMEQXLyP09XNbU';
const STOCK_API_URL = import.meta.env.VITE_STOCK_API_URL || 'https://api.stockdata.org/v1';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  marketCap?: number;
  volume?: number;
  lastUpdated: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  type: string;
}

class StockApiService {
  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    try {
      const url = new URL(`${STOCK_API_URL}${endpoint}`);
      
      // Add API key and default parameters
      url.searchParams.append('api_token', STOCK_API_KEY);
      
      // Add additional parameters
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      console.log('🌐 Stock API Request:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Stock API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📈 Stock API Response:', data);
      
      return data;
    } catch (error) {
      console.error('💥 Stock API Request failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Stock API request timed out. Please try again.');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Unable to connect to Stock API. Please check your internet connection.');
        }
      }
      
      throw error;
    }
  }

  // Search for stocks by symbol or name
  async searchStocks(query: string): Promise<StockSearchResult[]> {
    try {
      const data = await this.makeRequest('/entity/search', {
        search: query.toUpperCase(),
        limit: '10',
        exchange: 'NSE,BSE' // Focus on Indian exchanges
      });

      if (data && data.data) {
        return data.data.map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name,
          exchange: stock.exchange,
          currency: stock.currency || 'INR',
          type: stock.type || 'stock'
        }));
      }

      return [];
    } catch (error) {
      console.error('Search stocks error:', error);
      throw new Error('Failed to search stocks. Please try again.');
    }
  }

  // Get real-time stock price
  async getStockPrice(symbol: string): Promise<StockData | null> {
    try {
      // First, try to get the stock data
      const data = await this.makeRequest('/data/quote', {
        symbols: symbol.toUpperCase(),
        exchange: 'NSE,BSE'
      });

      if (data && data.data && data.data.length > 0) {
        const stock = data.data[0];
        
        return {
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: parseFloat(stock.price) || 0,
          change: parseFloat(stock.day_change) || 0,
          changePercent: parseFloat(stock.day_change_percent) || 0,
          currency: stock.currency || 'INR',
          exchange: stock.exchange || 'NSE',
          marketCap: stock.market_cap ? parseFloat(stock.market_cap) : undefined,
          volume: stock.volume ? parseFloat(stock.volume) : undefined,
          lastUpdated: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('Get stock price error:', error);
      throw new Error(`Failed to fetch price for ${symbol}. Please verify the symbol is correct.`);
    }
  }

  // Validate if a stock symbol exists
  async validateStock(symbol: string): Promise<{ isValid: boolean; stockData?: StockData; error?: string }> {
    try {
      const stockData = await this.getStockPrice(symbol);
      
      if (stockData) {
        return {
          isValid: true,
          stockData
        };
      }

      return {
        isValid: false,
        error: `Stock symbol "${symbol}" not found in Indian markets. Please check the symbol.`
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate stock symbol'
      };
    }
  }

  // Get multiple stock prices
  async getMultipleStockPrices(symbols: string[]): Promise<StockData[]> {
    try {
      if (symbols.length === 0) return [];

      const symbolsString = symbols.map(s => s.toUpperCase()).join(',');
      const data = await this.makeRequest('/data/quote', {
        symbols: symbolsString,
        exchange: 'NSE,BSE'
      });

      if (data && data.data) {
        return data.data.map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: parseFloat(stock.price) || 0,
          change: parseFloat(stock.day_change) || 0,
          changePercent: parseFloat(stock.day_change_percent) || 0,
          currency: stock.currency || 'INR',
          exchange: stock.exchange || 'NSE',
          marketCap: stock.market_cap ? parseFloat(stock.market_cap) : undefined,
          volume: stock.volume ? parseFloat(stock.volume) : undefined,
          lastUpdated: new Date().toISOString()
        }));
      }

      return [];
    } catch (error) {
      console.error('Get multiple stock prices error:', error);
      throw new Error('Failed to fetch stock prices. Please try again.');
    }
  }

  // Get trending stocks
  async getTrendingStocks(): Promise<StockData[]> {
    try {
      const data = await this.makeRequest('/data/quote', {
        symbols: 'RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK,KOTAKBANK,LT,ITC,HINDUNILVR,BAJFINANCE',
        exchange: 'NSE'
      });

      if (data && data.data) {
        return data.data.map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: parseFloat(stock.price) || 0,
          change: parseFloat(stock.day_change) || 0,
          changePercent: parseFloat(stock.day_change_percent) || 0,
          currency: stock.currency || 'INR',
          exchange: stock.exchange || 'NSE',
          marketCap: stock.market_cap ? parseFloat(stock.market_cap) : undefined,
          volume: stock.volume ? parseFloat(stock.volume) : undefined,
          lastUpdated: new Date().toISOString()
        }));
      }

      return [];
    } catch (error) {
      console.error('Get trending stocks error:', error);
      return []; // Return empty array instead of throwing error
    }
  }
}

export const stockApiService = new StockApiService();
export default stockApiService;