import React, { useState, useEffect, useRef } from 'react';
import { FocusStock } from '../types/FocusStock';
import { X, Target, AlertCircle, RefreshCw, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';
import FocusStockTags, { FocusStockTag } from './FocusStockTags';
import { stockCsvService, StockData } from '../services/stockCsvService';

interface FocusStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stock: Omit<FocusStock, 'id'>) => Promise<void>;
  stock?: FocusStock;
}

export default function FocusStockModal({ isOpen, onClose, onSave, stock }: FocusStockModalProps) {
  const [formData, setFormData] = useState({
    symbol: '',
    targetPrice: '',
    currentPrice: '',
    reason: '',
    dateAdded: '',
    tradeTaken: false,
    tradeDate: '',
    notes: '',
    tag: '' as FocusStockTag | ''
  });

  // Stock search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [stocksError, setStocksError] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Load stock data on component mount
  useEffect(() => {
    loadStockData();
  }, []);

  useEffect(() => {
    if (stock) {
      setFormData({
        symbol: stock.symbol,
        targetPrice: stock.targetPrice.toString(),
        currentPrice: stock.currentPrice.toString(),
        reason: stock.reason || '',
        dateAdded: stock.dateAdded,
        tradeTaken: stock.tradeTaken,
        tradeDate: stock.tradeDate || '',
        notes: stock.notes || '',
        tag: stock.tag || ''
      });
      setSearchQuery(stock.symbol);
      
      // Try to find the stock in our data
      if (stockCsvService.isDataLoaded()) {
        const stockData = stockCsvService.getStockBySymbol(stock.symbol);
        if (stockData) {
          setSelectedStock(stockData);
        }
      }
    } else {
      setFormData({
        symbol: '',
        targetPrice: '',
        currentPrice: '',
        reason: '',
        dateAdded: new Date().toISOString().split('T')[0],
        tradeTaken: false,
        tradeDate: '',
        notes: '',
        tag: ''
      });
      setSearchQuery('');
      setSelectedStock(null);
    }
    setErrors({});
    setSearchResults([]);
    setShowDropdown(false);
  }, [stock, isOpen]);

  const loadStockData = async () => {
    if (stockCsvService.isDataLoaded()) {
      return;
    }

    setIsLoadingStocks(true);
    setStocksError('');

    try {
      await stockCsvService.loadStocks();
      if (stockCsvService.isUsingFallback()) {
        setStocksError('Using offline stock data. Live prices unavailable.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stock data';
      setStocksError(errorMessage);
    } finally {
      setIsLoadingStocks(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setStocksError('');

    if (!stockCsvService.isDataLoaded()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Ultra-fast fuzzy search using Fuse.js
    const results = stockCsvService.searchStocks(query, 8);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  };

  const handleStockSelect = (stock: StockData) => {
    setSelectedStock(stock);
    setSearchQuery(stock.symbol);
    setFormData(prev => ({ 
      ...prev, 
      symbol: stock.symbol,
      currentPrice: stock.cmp.toString()
    }));
    setSearchResults([]);
    setShowDropdown(false);
    setStocksError('');
    
    // Clear related errors
    if (errors.symbol) {
      setErrors(prev => ({ ...prev, symbol: '' }));
    }
    if (errors.currentPrice) {
      setErrors(prev => ({ ...prev, currentPrice: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Symbol validation
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    } else if (formData.symbol.trim().length > 20) {
      newErrors.symbol = 'Symbol cannot exceed 20 characters';
    }

    // Current price validation
    if (!formData.currentPrice) {
      newErrors.currentPrice = 'Entry price is required';
    } else {
      const price = parseFloat(formData.currentPrice);
      if (isNaN(price) || price <= 0) {
        newErrors.currentPrice = 'Entry price must be greater than 0';
      }
    }

    // Target price validation
    if (!formData.targetPrice) {
      newErrors.targetPrice = 'Target price is required';
    } else {
      const price = parseFloat(formData.targetPrice);
      if (isNaN(price) || price <= 0) {
        newErrors.targetPrice = 'Target price must be greater than 0';
      }
    }

    // Reason validation
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.trim().length > 200) {
      newErrors.reason = 'Reason cannot exceed 200 characters';
    }

    // Date added validation
    if (!formData.dateAdded) {
      newErrors.dateAdded = 'Date added is required';
    } else {
      const dateAdded = new Date(formData.dateAdded);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dateAdded > today) {
        newErrors.dateAdded = 'Date added cannot be in the future';
      }
    }

    // Trade taken validation
    if (formData.tradeTaken && !formData.tradeDate) {
      newErrors.tradeDate = 'Trade date is required when trade is taken';
    } else if (formData.tradeDate) {
      const tradeDate = new Date(formData.tradeDate);
      const dateAdded = new Date(formData.dateAdded);
      if (tradeDate < dateAdded) {
        newErrors.tradeDate = 'Trade date cannot be before date added';
      }
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (tradeDate > today) {
        newErrors.tradeDate = 'Trade date cannot be in the future';
      }
    }

    // Notes validation
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const stockData: Omit<FocusStock, 'id'> = {
        symbol: formData.symbol.toUpperCase().trim(),
        targetPrice: parseFloat(formData.targetPrice),
        currentPrice: parseFloat(formData.currentPrice),
        reason: formData.reason.trim(),
        dateAdded: formData.dateAdded,
        tradeTaken: formData.tradeTaken,
        tradeDate: formData.tradeDate || undefined,
        notes: formData.notes.trim() || undefined,
        tag: formData.tag || undefined
      };

      await onSave(stockData);
      onClose();
    } catch (error: any) {
      // Error is handled by parent component
      console.error('Focus stock save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTagChange = (tag: FocusStockTag) => {
    setFormData(prev => ({ ...prev, tag }));
  };

  const handleUseCMPAsEntryPrice = () => {
    if (selectedStock) {
      setFormData(prev => ({ ...prev, currentPrice: selectedStock.cmp.toString() }));
      if (errors.currentPrice) {
        setErrors(prev => ({ ...prev, currentPrice: '' }));
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {stock ? 'Edit Focus Stock' : 'Add Focus Stock'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Stock Loading Status */}
          {isLoadingStocks && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm text-blue-800">Loading stock data...</span>
              </div>
            </div>
          )}

          {/* Stock Error */}
          {stocksError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-800">{stocksError}</span>
                <button
                  type="button"
                  onClick={loadStockData}
                  className="ml-auto text-yellow-600 hover:text-yellow-500 text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Stock Search Input */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Symbol *
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.symbol ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Search stocks (e.g., RELIANCE, TCS, HDFC)"
              disabled={isSubmitting || isLoadingStocks}
              autoComplete="off"
              required
            />
            
            {/* Search Results Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((stock, index) => (
                  <button
                    key={`${stock.symbol}-${index}`}
                    type="button"
                    onClick={() => handleStockSelect(stock)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{stock.label}</div>
                        <div className="text-sm text-gray-600">NSE • Indian Stock</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-green-600">{formatCurrency(stock.cmp)}</div>
                        <div className="text-xs text-gray-500">Live CMP</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {errors.symbol && (
              <div className="mt-1 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600">{errors.symbol}</p>
              </div>
            )}
          </div>

          {/* Current Market Price (CMP) Display */}
          {selectedStock && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <IndianRupee className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Current Market Price (CMP)</div>
                    <div className="text-xs text-blue-700">NSE • {stockCsvService.isUsingFallback() ? 'Offline Data' : 'Live Price'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-900">
                    {formatCurrency(selectedStock.cmp)}
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleUseCMPAsEntryPrice}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                disabled={isSubmitting}
              >
                Use CMP as Entry Price ({formatCurrency(selectedStock.cmp)})
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Price (₹) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => handleInputChange('currentPrice', e.target.value)}
                  className={`w-full pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.currentPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="0"
                  placeholder="Your reference price"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {errors.currentPrice && (
                <div className="mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.currentPrice}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Price (₹) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetPrice}
                  onChange={(e) => handleInputChange('targetPrice', e.target.value)}
                  className={`w-full pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.targetPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="0"
                  placeholder="Your target price"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {errors.targetPrice && (
                <div className="mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.targetPrice}</p>
                </div>
              )}
            </div>
          </div>

          {/* Potential Return Preview */}
          {formData.currentPrice && formData.targetPrice && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Potential Return</div>
              {(() => {
                const currentPrice = parseFloat(formData.currentPrice);
                const targetPrice = parseFloat(formData.targetPrice);
                const returnAmount = targetPrice - currentPrice;
                const returnPercentage = (returnAmount / currentPrice) * 100;
                
                return (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      ₹{targetPrice} - ₹{currentPrice}
                    </span>
                    <span className={`text-sm font-semibold ${
                      returnAmount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{returnAmount.toFixed(2)} ({returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%)
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Focus *
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Technical breakout, earnings play, etc."
              maxLength={200}
              required
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.reason && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.reason}</p>
                </div>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {formData.reason.length}/200
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tag
            </label>
            <FocusStockTags
              selectedTag={formData.tag}
              onTagChange={handleTagChange}
              disabled={isSubmitting}
              displayMode="select"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Added *
            </label>
            <input
              type="date"
              value={formData.dateAdded}
              onChange={(e) => handleInputChange('dateAdded', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.dateAdded ? 'border-red-500' : 'border-gray-300'
              }`}
              max={new Date().toISOString().split('T')[0]}
              required
              disabled={isSubmitting}
            />
            {errors.dateAdded && (
              <div className="mt-1 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600">{errors.dateAdded}</p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="tradeTaken"
              type="checkbox"
              checked={formData.tradeTaken}
              onChange={(e) => handleInputChange('tradeTaken', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <label htmlFor="tradeTaken" className="text-sm font-medium text-gray-700">
              Trade Taken
            </label>
          </div>

          {formData.tradeTaken && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Date *
              </label>
              <input
                type="date"
                value={formData.tradeDate}
                onChange={(e) => handleInputChange('tradeDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.tradeDate ? 'border-red-500' : 'border-gray-300'
                }`}
                min={formData.dateAdded}
                max={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
              />
              {errors.tradeDate && (
                <div className="mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.tradeDate}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Additional notes about this stock..."
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.notes && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.notes}</p>
                </div>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {formData.notes.length}/500
              </p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : stock ? 'Update' : 'Add'} Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}