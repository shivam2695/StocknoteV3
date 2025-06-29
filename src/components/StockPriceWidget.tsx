import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { stockApiService, StockData } from '../services/stockApi';

interface StockPriceWidgetProps {
  symbol: string;
  className?: string;
  showRefresh?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

export default function StockPriceWidget({
  symbol,
  className = '',
  showRefresh = true,
  autoRefresh = false,
  refreshInterval = 30
}: StockPriceWidgetProps) {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStockPrice = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    setError('');

    try {
      const data = await stockApiService.getStockPrice(symbol);
      if (data) {
        setStockData(data);
        setLastUpdated(new Date());
      } else {
        setError('Stock not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchStockPrice();
    }
  }, [symbol]);

  useEffect(() => {
    if (autoRefresh && symbol && refreshInterval > 0) {
      const interval = setInterval(fetchStockPrice, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [symbol, autoRefresh, refreshInterval]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!symbol) return null;

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
        {showRefresh && (
          <button
            onClick={fetchStockPrice}
            className="text-red-600 hover:text-red-500"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  if (loading && !stockData) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading price...</span>
      </div>
    );
  }

  if (!stockData) return null;

  return (
    <div className={`bg-white border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900">{stockData.symbol}</div>
          <div className="text-sm text-gray-500">{stockData.exchange}</div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(stockData.price)}
          </div>
          <div className={`text-sm flex items-center justify-end ${
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

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {lastUpdated && `Updated: ${formatTime(lastUpdated)}`}
        </div>
        
        {showRefresh && (
          <button
            onClick={fetchStockPrice}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
            title="Refresh price"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}