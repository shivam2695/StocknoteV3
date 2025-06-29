import React, { useState, useEffect } from 'react';
import { Trade } from '../types/Trade';
import { TrendingUp, TrendingDown, Circle, CheckCircle2, Edit, Trash2, Target, Filter, SortAsc, Calendar, IndianRupee, RefreshCw } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import MarkAsClosedModal from './MarkAsClosedModal';
import { stockCsvService } from '../services/stockCsvService';

interface TradeTableProps {
  trades: Trade[];
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onUpdateTrade?: (tradeId: string, tradeData: Omit<Trade, 'id'>) => Promise<void>;
  showFilters?: boolean;
  onRefreshCMP?: () => void;
}

export default function TradeTable({ 
  trades, 
  onEditTrade, 
  onDeleteTrade, 
  onUpdateTrade,
  showFilters = false,
  onRefreshCMP
}: TradeTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; trade?: Trade }>({ isOpen: false });
  const [markAsClosed, setMarkAsClosed] = useState<{ isOpen: boolean; trade?: Trade }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'symbol' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});

  // Load current market prices for all symbols in the table
  useEffect(() => {
    const loadStockPrices = async () => {
      if (!stockCsvService.isDataLoaded()) {
        try {
          await stockCsvService.loadStocks();
        } catch (error) {
          console.error('Failed to load stock data:', error);
        }
      }
      
      updateStockPrices();
    };
    
    loadStockPrices();
  }, [trades]);

  // Update stock prices from CSV service
  const updateStockPrices = () => {
    const prices: Record<string, number> = {};
    
    trades.forEach(trade => {
      const stockData = stockCsvService.getStockBySymbol(trade.symbol);
      if (stockData) {
        prices[trade.symbol] = stockData.cmp;
      }
    });
    
    setStockPrices(prices);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateAging = (entryDate: string, exitDate?: string) => {
    const startDate = new Date(entryDate);
    const endDate = exitDate ? new Date(exitDate) : new Date();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateReturn = (trade: Trade) => {
    if (trade.status === 'ACTIVE' || !trade.exitPrice) return 0;
    return (trade.exitPrice - trade.entryPrice) * trade.quantity;
  };

  const getReturnColor = (returnValue: number) => {
    if (returnValue > 0) return 'text-green-600';
    if (returnValue < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStockLogo = (symbol: string) => {
    return symbol.charAt(0).toUpperCase();
  };

  // Filter and sort trades
  const getFilteredAndSortedTrades = () => {
    let filtered = trades;

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(trade => trade.status === 'ACTIVE');
    } else if (statusFilter === 'closed') {
      filtered = filtered.filter(trade => trade.status === 'CLOSED');
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'date':
        default:
          comparison = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const displayTrades = showFilters ? getFilteredAndSortedTrades() : trades;

  const handleDeleteClick = (trade: Trade) => {
    setDeleteConfirm({ isOpen: true, trade });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.trade) return;
    
    setIsDeleting(true);
    try {
      await onDeleteTrade(deleteConfirm.trade.id);
      setDeleteConfirm({ isOpen: false });
    } catch (error) {
      console.error('Delete trade error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsClosedClick = (trade: Trade) => {
    setMarkAsClosed({ isOpen: true, trade });
  };

  const handleMarkAsClosedSave = async (exitPrice: number, exitDate: string) => {
    if (!markAsClosed.trade || !onUpdateTrade) return;

    const updatedTrade: Omit<Trade, 'id'> = {
      ...markAsClosed.trade,
      status: 'CLOSED',
      exitPrice,
      exitDate
    };

    await onUpdateTrade(markAsClosed.trade.id, updatedTrade);
    setMarkAsClosed({ isOpen: false });
  };

  const handleRefreshCMP = async () => {
    if (onRefreshCMP) {
      setIsRefreshing(true);
      try {
        await onRefreshCMP();
        // Update stock prices after refresh
        updateStockPrices();
      } finally {
        // Add a small delay to make the animation visible
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Filters and Sorting */}
        {showFilters && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Trading Journal</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Refresh Button */}
                {onRefreshCMP && (
                  <button
                    onClick={handleRefreshCMP}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-4 h-4 text-green-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-green-700 text-sm font-medium">Refresh CMP</span>
                  </button>
                )}
                
                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'closed')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div className="flex items-center space-x-2">
                  <SortAsc className="w-4 h-4 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'symbol' | 'status')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="symbol">Sort by Symbol</option>
                    <option value="status">Sort by Status</option>
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
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-20">Status</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-24">Symbol</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-24">CMP</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-16">Type</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-12">Qty</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-28">Entry</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-28">Exit</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-16">Aging</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-24">Return</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayTrades.map((trade) => {
                const returnValue = calculateReturn(trade);
                const aging = calculateAging(trade.entryDate, trade.exitDate);
                
                return (
                  <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        {trade.status === 'ACTIVE' ? (
                          <div className="flex items-center space-x-1">
                            <Circle className="w-3 h-3 text-blue-500 fill-current" />
                            <span className="text-xs font-medium text-blue-600">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">Closed</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{getStockLogo(trade.symbol)}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{trade.symbol}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {stockPrices[trade.symbol] ? (
                        <div className="flex items-center space-x-1">
                          <IndianRupee className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-900">{stockPrices[trade.symbol].toLocaleString('en-IN')}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        {trade.type === 'BUY' ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${
                          trade.type === 'BUY' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-900">{trade.quantity}</td>
                    <td className="py-3 px-3">
                      <div>
                        <div className="flex items-center space-x-1">
                          <IndianRupee className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-900">{trade.entryPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(trade.entryDate)}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {trade.exitPrice ? (
                        <div>
                          <div className="flex items-center space-x-1">
                            <IndianRupee className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-900">{trade.exitPrice.toLocaleString('en-IN')}</span>
                          </div>
                          {trade.exitDate && (
                            <div className="text-xs text-gray-500">{formatDate(trade.exitDate)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          <span className="font-medium">{aging}</span> days
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {trade.status === 'CLOSED' ? (
                        <div className={`font-semibold text-xs ${getReturnColor(returnValue)}`}>
                          <div className="flex items-center space-x-1">
                            <IndianRupee className="w-3 h-3" />
                            <span>{returnValue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-xs">
                            {((returnValue / (trade.entryPrice * trade.quantity)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        {trade.status === 'ACTIVE' && onUpdateTrade && (
                          <button
                            onClick={() => handleMarkAsClosedClick(trade)}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                            title="Mark as Closed"
                          >
                            <Target className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => onEditTrade(trade)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                          title="Edit Trade"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(trade)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                          title="Delete Trade"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Trade"
        message={`Are you sure you want to delete the ${deleteConfirm.trade?.symbol} trade? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Mark as Closed Modal */}
      {markAsClosed.trade && (
        <MarkAsClosedModal
          isOpen={markAsClosed.isOpen}
          onClose={() => setMarkAsClosed({ isOpen: false })}
          onSave={handleMarkAsClosedSave}
          stockSymbol={markAsClosed.trade.symbol}
          entryPrice={markAsClosed.trade.entryPrice}
          entryDate={markAsClosed.trade.entryDate}
          quantity={markAsClosed.trade.quantity}
        />
      )}
    </>
  );
}