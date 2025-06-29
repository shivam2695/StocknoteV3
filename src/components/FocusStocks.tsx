import React, { useState, useEffect } from 'react';
import { FocusStock } from '../types/FocusStock';
import FocusStocksTable from './FocusStocksTable';
import FocusStockModal from './FocusStockModal';
import { FocusStockTag } from './FocusStockTags';
import { Target, PlusCircle, TrendingUp, Eye, AlertCircle, Filter, SortAsc, RefreshCw } from 'lucide-react';
import { stockCsvService } from '../services/stockCsvService';

interface FocusStocksProps {
  stocks: FocusStock[];
  onAddStock: (stock: Omit<FocusStock, 'id'>) => void;
  onEditStock: (stockId: string, stock: Omit<FocusStock, 'id'>) => void;
  onDeleteStock: (stockId: string) => void;
  onMarkTradeTaken: (stockId: string, tradeTaken: boolean, tradeDate?: string) => void;
  onUpdateStockTag?: (stockId: string, tag: FocusStockTag) => void;
}

export default function FocusStocks({ 
  stocks, 
  onAddStock, 
  onEditStock, 
  onDeleteStock, 
  onMarkTradeTaken,
  onUpdateStockTag
}: FocusStocksProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<FocusStock | undefined>();
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'taken'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'symbol' | 'return'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate tag statistics - FIXED
  const getTagStats = () => {
    const tagCounts = {
      monitor: stocks.filter(s => s.tag === 'monitor').length,
      watch: stocks.filter(s => s.tag === 'watch').length,
      worked: stocks.filter(s => s.tag === 'worked').length,
      failed: stocks.filter(s => s.tag === 'failed').length,
      missed: stocks.filter(s => s.tag === 'missed').length
    };
    return tagCounts;
  };

  const tagStats = getTagStats();

  const handleEditStock = (stock: FocusStock) => {
    setEditingStock(stock);
    setIsModalOpen(true);
  };

  const handleSaveStock = async (stockData: Omit<FocusStock, 'id'>) => {
    try {
      setError('');
      if (editingStock) {
        await onEditStock(editingStock.id, stockData);
      } else {
        await onAddStock(stockData);
      }
      setEditingStock(undefined);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Save focus stock error:', error);
      setError(error.message || 'Failed to save focus stock');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStock(undefined);
    setError('');
  };

  const handleRefreshCMP = async () => {
    setIsRefreshing(true);
    try {
      // Use the cache-busting refresh method
      await stockCsvService.refreshData();
      // Force a re-render
      setSortBy(prev => prev);
    } catch (error) {
      console.error('Failed to refresh CMP data:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh stock data');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // Filter and sort stocks
  const getFilteredAndSortedStocks = () => {
    let filtered = stocks;

    // Apply status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter(stock => !stock.tradeTaken);
    } else if (statusFilter === 'taken') {
      filtered = filtered.filter(stock => stock.tradeTaken);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'return':
          const returnA = ((a.targetPrice - a.currentPrice) / a.currentPrice) * 100;
          const returnB = ((b.targetPrice - b.currentPrice) / b.currentPrice) * 100;
          comparison = returnA - returnB;
          break;
        case 'date':
        default:
          comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const filteredStocks = getFilteredAndSortedStocks();
  const pendingStocks = stocks.filter(stock => !stock.tradeTaken);
  const takenStocks = stocks.filter(stock => stock.tradeTaken);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateAveragePotentialReturn = (stockList: FocusStock[]) => {
    if (stockList.length === 0) return 0;
    const totalReturn = stockList.reduce((sum, stock) => {
      return sum + ((stock.targetPrice - stock.currentPrice) / stock.currentPrice) * 100;
    }, 0);
    return totalReturn / stockList.length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Focus Stocks</h1>
          <p className="text-gray-600 mt-1">Track potential trading opportunities and monitor your watchlist</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshCMP}
            className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 text-green-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-green-700 font-medium">Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 text-sm font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Total Focus Stocks</h3>
            <Eye className="w-6 h-6" />
          </div>
          <div className="text-3xl font-bold mb-2">{stocks.length}</div>
          <p className="text-sm opacity-80">{pendingStocks.length} pending, {takenStocks.length} taken</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Pending Opportunities</h3>
            <Target className="w-6 h-6" />
          </div>
          <div className="text-3xl font-bold mb-2">{pendingStocks.length}</div>
          <p className="text-sm opacity-80">
            Avg. potential: {calculateAveragePotentialReturn(pendingStocks).toFixed(1)}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Trades Taken</h3>
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="text-3xl font-bold mb-2">{takenStocks.length}</div>
          <p className="text-sm opacity-80">
            {stocks.length > 0 ? ((takenStocks.length / stocks.length) * 100).toFixed(0) : 0}% conversion rate
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Performance Tags</h3>
            <Target className="w-6 h-6" />
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>🟣 Monitor:</span>
              <span className="font-semibold">{tagStats.monitor}</span>
            </div>
            <div className="flex justify-between">
              <span>⏳ Setup Waiting:</span>
              <span className="font-semibold">{tagStats.watch}</span>
            </div>
            <div className="flex justify-between">
              <span>✅ Entered:</span>
              <span className="font-semibold">{tagStats.worked}</span>
            </div>
            <div className="flex justify-between">
              <span>🔴 Failed:</span>
              <span className="font-semibold">{tagStats.failed}</span>
            </div>
            <div className="flex justify-between">
              <span>🟡 Missed Entry:</span>
              <span className="font-semibold">{tagStats.missed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">All Focus Stocks</h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'taken')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="taken">Taken</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <SortAsc className="w-4 h-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'symbol' | 'return')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="symbol">Sort by Symbol</option>
                <option value="return">Sort by Return</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {filteredStocks.length > 0 ? (
          <FocusStocksTable
            stocks={filteredStocks}
            onEditStock={handleEditStock}
            onDeleteStock={onDeleteStock}
            onMarkTradeTaken={onMarkTradeTaken}
            onUpdateStockTag={onUpdateStockTag}
          />
        ) : stocks.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No focus stocks yet</h3>
            <p className="text-gray-600 mb-4">Start building your watchlist by adding stocks you're interested in trading</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Stock
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No stocks match the current filters</p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setSortBy('date');
                setSortOrder('desc');
              }}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium mt-2"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Focus Stock Modal */}
      <FocusStockModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveStock}
        stock={editingStock}
      />
    </div>
  );
}