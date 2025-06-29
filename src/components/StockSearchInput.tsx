import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, TrendingDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { stockApiService, StockSearchResult, StockData } from '../services/stockApi';

interface StockSearchInputProps {
  value: string;
  onChange: (symbol: string, stockData?: StockData) => void;
  onPriceUpdate?: (price: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showPrice?: boolean;
  autoFetchPrice?: boolean;
}

export default function StockSearchInput({
  value,
  onChange,
  onPriceUpdate,
  placeholder = "Search stocks (e.g., RELIANCE, TCS)",
  className = "",
  disabled = false,
  required = false,
  showPrice = true,
  autoFetchPrice = true
}: StockSearchInputProps) {
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [error, setError] = useState('');
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search stocks as user types
  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await stockApiService.searchStocks(query);
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      console.error('Stock search error:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Validate stock symbol and fetch price
  const validateAndFetchPrice = async (symbol: string) => {
    if (!symbol.trim()) {
      setValidationStatus('idle');
      setStockData(null);
      setError('');
      return;
    }

    setIsValidating(true);
    setValidationStatus('idle');
    setError('');

    try {
      const validation = await stockApiService.validateStock(symbol);
      
      if (validation.isValid && validation.stockData) {
        setValidationStatus('valid');
        setStockData(validation.stockData);
        setError('');
        
        if (onPriceUpdate && autoFetchPrice) {
          onPriceUpdate(validation.stockData.price);
        }
      } else {
        setValidationStatus('invalid');
        setStockData(null);
        setError(validation.error || 'Invalid stock symbol');
      }
    } catch (error) {
      setValidationStatus('invalid');
      setStockData(null);
      setError(error instanceof Error ? error.message : 'Failed to validate stock');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);

    // Clear previous timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Reset states
    setValidationStatus('idle');
    setError('');

    // Debounced search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(newValue);
    }, 300);

    // Debounced validation (only if it looks like a complete symbol)
    if (newValue.length >= 3) {
      validationTimeoutRef.current = setTimeout(() => {
        validateAndFetchPrice(newValue);
      }, 800);
    }
  };

  const handleSelectStock = (stock: StockSearchResult) => {
    onChange(stock.symbol);
    setShowDropdown(false);
    setSearchResults([]);
    
    // Immediately validate and fetch price for selected stock
    validateAndFetchPrice(stock.symbol);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    
    switch (validationStatus) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {getValidationIcon()}
        </div>
        
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            validationStatus === 'valid' ? 'border-green-500' :
            validationStatus === 'invalid' ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
        />
        
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Stock Price Display */}
      {showPrice && stockData && validationStatus === 'valid' && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">{stockData.name}</div>
              <div className="text-sm text-gray-500">{stockData.exchange}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(stockData.price)}
              </div>
              <div className={`text-sm flex items-center ${
                stockData.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stockData.change >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-1 flex items-center space-x-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((stock, index) => (
            <button
              key={`${stock.symbol}-${index}`}
              type="button"
              onClick={() => handleSelectStock(stock)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{stock.symbol}</div>
                  <div className="text-sm text-gray-600 truncate">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{stock.exchange}</div>
                  <div className="text-xs text-gray-400">{stock.currency}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}