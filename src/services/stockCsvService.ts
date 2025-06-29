import Fuse from 'fuse.js';

export interface StockData {
  name: string;
  symbol: string;
  cmp: number;
  label: string;
}

class StockCsvService {
  private allStocks: StockData[] = [];
  private fuse: Fuse<StockData> | null = null;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private lastRefreshTime = 0;
  private usingFallback = false;

  // Direct link to the Google Sheet CSV
  private readonly CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS3cKGO_dFfNhEC09M0M7VoeDSXmNOxC51VTOj4Aty6SYJ6TNZ9Faoo20bT8dgQpJ6q1Zcpx0Zx7jER/pub?output=csv';

  private readonly fuseOptions = {
    keys: [
      { name: 'symbol', weight: 0.7 },
      { name: 'name', weight: 0.3 }
    ],
    threshold: 0.3, // Lower = more strict matching
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
    findAllMatches: false
  };

  // Parse CSV text into array of objects
  private parseCSV(csvText: string): StockData[] {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        console.error('CSV data has insufficient lines:', lines.length);
        throw new Error('Invalid CSV format: insufficient data');
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      console.log('📊 CSV Headers found:', headers);
      
      // Find column indices - more flexible matching
      const nameIndex = headers.findIndex(h => 
        h.includes('name') || 
        h.includes('company') || 
        h.includes('stock')
      );
      
      const symbolIndex = headers.findIndex(h => 
        h.includes('symbol') || 
        h.includes('ticker') || 
        h.includes('code')
      );
      
      const cmpIndex = headers.findIndex(h => 
        h.includes('cmp') || 
        h.includes('price') || 
        h.includes('ltp') || 
        h.includes('value')
      );
      
      if (nameIndex === -1 || symbolIndex === -1 || cmpIndex === -1) {
        console.error('❌ Required columns not found in CSV');
        console.log('Available headers:', headers);
        throw new Error('CSV format invalid: Missing required columns (name, symbol, cmp)');
      }
      
      console.log(`📍 Column mapping: name=${nameIndex}, symbol=${symbolIndex}, cmp=${cmpIndex}`);
      
      const stocks: StockData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        // Handle quoted CSV values properly
        let row: string[] = [];
        let inQuotes = false;
        let currentValue = '';
        let currentChar = '';
        
        for (let j = 0; j < lines[i].length; j++) {
          currentChar = lines[i][j];
          
          if (currentChar === '"' && (j === 0 || lines[i][j-1] !== '\\')) {
            inQuotes = !inQuotes;
          } else if (currentChar === ',' && !inQuotes) {
            row.push(currentValue);
            currentValue = '';
          } else {
            currentValue += currentChar;
          }
        }
        
        // Add the last value
        row.push(currentValue);
        
        // Clean up values
        row = row.map(val => val.trim().replace(/^"|"$/g, ''));
        
        if (row.length < Math.max(nameIndex, symbolIndex, cmpIndex) + 1) {
          continue; // Skip incomplete rows
        }
        
        const name = row[nameIndex]?.trim();
        const symbol = row[symbolIndex]?.trim().toUpperCase();
        const cmpStr = row[cmpIndex]?.trim().replace(/"/g, ''); // Only remove quotes, keep all other characters
        
        if (!name || !symbol || !cmpStr) {
          continue; // Skip rows with missing data
        }
        
        // Parse CMP value - handle different number formats
        let cmp: number;
        try {
          // Remove any non-numeric characters except decimal point and negative sign
          const cleanedCmpStr = cmpStr.replace(/[^\d.-]/g, '');
          cmp = parseFloat(cleanedCmpStr);
          
          if (isNaN(cmp) || cmp <= 0) {
            console.warn(`Invalid CMP value for ${symbol}: ${cmpStr}`);
            continue; // Skip invalid prices
          }
        } catch (e) {
          console.warn(`Error parsing CMP for ${symbol}: ${cmpStr}`, e);
          continue; // Skip on parsing error
        }
        
        stocks.push({
          name,
          symbol,
          cmp,
          label: `${symbol} - ${name}`
        });
      }
      
      console.log(`✅ Parsed ${stocks.length} stocks from CSV`);
      // Log the first few stocks for debugging
      console.log('Sample stocks:', stocks.slice(0, 5));
      return stocks;
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw error;
    }
  }

  // Fetch and parse CSV data
  async loadStocks(): Promise<void> {
    // If data is already loaded and it's been less than 5 minutes, use cached data
    const now = Date.now();
    if (this.isLoaded && (now - this.lastRefreshTime < 5 * 60 * 1000)) {
      return;
    }
    
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }
    
    this.isLoading = true;
    this.loadPromise = this.fetchAndParseCSV(false);
    
    try {
      await this.loadPromise;
      this.lastRefreshTime = now;
      this.usingFallback = false;
    } catch (error) {
      console.error('Failed to load stocks from CSV:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async fetchAndParseCSV(forceRefresh: boolean = false): Promise<void> {
    try {
      console.log('🌐 Fetching stock data from Google Sheet...');
      
      // Add a cache-busting parameter to avoid browser caching
      const cacheBuster = forceRefresh ? `&nocache=${Date.now()}` : '';
      const url = `${this.CSV_URL}${cacheBuster}`;
      
      console.log('📍 CSV URL:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv,text/plain,*/*',
            'Cache-Control': forceRefresh ? 'no-cache, no-store, must-revalidate' : 'default'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log(`📄 CSV data received: ${csvText.length} characters`);
        console.log('First 200 characters of CSV:', csvText.substring(0, 200));
        
        if (!csvText.trim()) {
          throw new Error('CSV data is empty');
        }
        
        // Parse CSV into stock objects
        this.allStocks = this.parseCSV(csvText);
        
        if (this.allStocks.length === 0) {
          throw new Error('No valid stock data found in CSV');
        }
        
        // Initialize Fuse.js for fuzzy search
        this.fuse = new Fuse(this.allStocks, this.fuseOptions);
        this.isLoaded = true;
        
        console.log(`🚀 Stock data loaded successfully: ${this.allStocks.length} stocks`);
        console.log('📊 Sample stocks:', this.allStocks.slice(0, 3));
        
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error('💥 Failed to load stock data:', error);
      this.allStocks = [];
      this.fuse = null;
      this.isLoaded = false;
      throw error;
    }
  }

  // Search stocks using Fuse.js fuzzy search
  searchStocks(query: string, limit: number = 10): StockData[] {
    if (!this.fuse || !query.trim()) {
      return [];
    }
    
    const results = this.fuse.search(query.trim(), { limit });
    return results.map(result => result.item);
  }

  // Get stock by exact symbol match
  getStockBySymbol(symbol: string): StockData | null {
    const upperSymbol = symbol.toUpperCase().trim();
    return this.allStocks.find(stock => stock.symbol === upperSymbol) || null;
  }

  // Get all stocks (for debugging)
  getAllStocks(): StockData[] {
    return [...this.allStocks];
  }

  // Check if data is loaded
  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  // Check if currently loading
  isDataLoading(): boolean {
    return this.isLoading;
  }

  // Check if using fallback data
  isUsingFallback(): boolean {
    return this.usingFallback;
  }

  // Get total stock count
  getStockCount(): number {
    return this.allStocks.length;
  }

  // Refresh data (re-fetch CSV with cache busting)
  async refreshData(): Promise<void> {
    console.log('🔄 Refreshing stock data with cache busting...');
    this.isLoaded = false;
    this.isLoading = true;
    this.loadPromise = null;
    
    try {
      // Use cache busting for refresh
      await this.fetchAndParseCSV(true);
      this.lastRefreshTime = Date.now();
      this.usingFallback = false;
      console.log('✅ Stock data refreshed successfully with latest prices');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
}

// Export singleton instance
export const stockCsvService = new StockCsvService();
export default stockCsvService;