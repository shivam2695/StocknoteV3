import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, BarChart3 } from 'lucide-react';
import { stockApiService, StockData } from '../services/stockApi';

interface TrendingStocksProps {
  className?: string;
  limit?: number;
  onStockSelect?: (symbol: string) => void;
}

export default function TrendingStocks({ 
  className = '', 
  limit = 10,
  onStockSelect 
}: TrendingStocksProps) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTrendingStocks = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await stockApiService.getTrendingStocks();
      setStocks(data.slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingStocks();
  }, [limit]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStockLogo = (symbol: string) => {
    return symbol.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Trending Stocks</h3>
          <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Trending Stocks</h3>
          <button
            onClick={fetchTrendingStocks}
            className="text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchTrendingStocks}
            className="mt-2 text-blue-600 hover:text-blue-500 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-gray-900">Trending Stocks</h3>
        </div>
        <button
          onClick={fetchTrendingStocks}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        {stocks.map((stock, index) => (
          <div
            key={stock.symbol}
            onClick={() => onStockSelect && onStockSelect(stock.symbol)}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
              onStockSelect ? 'hover:bg-gray-50 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 w-4">
                  {index + 1}
                </span>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{getStockLogo(stock.symbol)}</span>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">{stock.symbol}</div>
                <div className="text-xs text-gray-500">{stock.exchange}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {formatCurrency(stock.price)}
              </div>
              <div className={`text-xs flex items-center ${
                stock.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stock.change >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {stocks.length === 0 && !loading && (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No trending stocks available</p>
        </div>
      )}
    </div>
  );
}