import React, { useState, useEffect } from 'react';
import { Trade } from '../types/Trade';
import { TrendingUp, TrendingDown, Circle, CheckCircle2, Edit, Trash2, Target, Filter, SortAsc, Calendar, IndianRupee, RefreshCw, Briefcase } from 'lucide-react';
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
        {/* Filters and Sorting - Kept intact */}
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
                    <span className="text-green-700 text-sm font-medium">Refresh</span>
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

        {/* New Card-Based Layout */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTrades.map((trade) => {
            const returnValue = calculateReturn(trade);
            const aging = calculateAging(trade.entryDate, trade.exitDate);
            
            return (
              <div key={trade.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Card Header with Symbol and Status */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{getStockLogo(trade.symbol)}</span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{trade.symbol}</div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Briefcase className="w-3 h-3 text-gray-500 mr-1" />
                          <span className="text-xs text-gray-600">{trade.quantity}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 text-gray-500 mr-1" />
                          <span className="text-xs text-gray-600">{aging} days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      trade.status === 'ACTIVE' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {trade.status === 'ACTIVE' ? 'Active' : 'Closed'}
                    </div>
                    
                    {/* Trade Type */}
                    <div className={`mt-1 flex items-center ${
                      trade.type === 'BUY' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.type === 'BUY' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Card Body with Price Information */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Entry Price */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Entry Price</div>
                      <div className="flex items-center">
                        <IndianRupee className="w-3 h-3 text-gray-600 mr-1" />
                        <span className="font-semibold">{trade.entryPrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{formatDate(trade.entryDate)}</div>
                    </div>
                    
                    {/* Exit Price or CMP */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        {trade.status === 'CLOSED' ? 'Exit Price' : 'Current Price'}
                      </div>
                      <div className="flex items-center">
                        <IndianRupee className="w-3 h-3 text-gray-600 mr-1" />
                        <span className="font-semibold">
                          {trade.status === 'CLOSED' && trade.exitPrice 
                            ? trade.exitPrice.toLocaleString('en-IN')
                            : stockPrices[trade.symbol] 
                              ? stockPrices[trade.symbol].toLocaleString('en-IN')
                              : '—'
                          }
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {trade.status === 'CLOSED' && trade.exitDate 
                          ? formatDate(trade.exitDate)
                          : 'Live'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Return Information */}
                  {trade.status === 'CLOSED' && (
                    <div className={`mt-4 p-2 rounded-lg ${
                      returnValue >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">Return</span>
                        <div className={`font-bold ${getReturnColor(returnValue)}`}>
                          <div className="flex items-center">
                            <IndianRupee className="w-3 h-3 mr-1" />
                            <span>{returnValue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-xs text-right">
                            {((returnValue / (trade.entryPrice * trade.quantity)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Card Footer with Actions */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
                  {trade.status === 'ACTIVE' && onUpdateTrade && (
                    <button
                      onClick={() => handleMarkAsClosedClick(trade)}
                      className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      title="Mark as Closed"
                    >
                      <Target className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditTrade(trade)}
                    className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    title="Edit Trade"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(trade)}
                    className="p-2 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    title="Delete Trade"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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