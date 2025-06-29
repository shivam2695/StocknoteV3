import React, { useState, useEffect } from 'react';
import { Trade, TradeStats } from '../types/Trade';
import { FocusStock } from '../types/FocusStock';
import StatsCard from './StatsCard';
import TradeTable from './TradeTable';
import TradeModal from './TradeModal';
import MonthFilter from './MonthFilter';
import MarkAsClosedModal from './MarkAsClosedModal';
import TrendingStocks from './TrendingStocks';
import { 
  DollarSign, 
  TrendingUp, 
  Activity, 
  PlusCircle, 
  Calendar,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  IndianRupee
} from 'lucide-react';
import { stockCsvService } from '../services/stockCsvService';

interface DashboardProps {
  trades: Trade[];
  stats: TradeStats;
  focusStocks?: FocusStock[];
  onAddTrade: (trade: Omit<Trade, 'id'>) => void;
  onEditTrade: (tradeId: string, trade: Omit<Trade, 'id'>) => void;
  onDeleteTrade: (tradeId: string) => void;
  getTradesByMonth: (month: number, year: number) => Trade[];
}

export default function Dashboard({ 
  trades, 
  stats, 
  focusStocks = [],
  onAddTrade, 
  onEditTrade, 
  onDeleteTrade,
  getTradesByMonth 
}: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [error, setError] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [markAsClosed, setMarkAsClosed] = useState<{ isOpen: boolean; trade?: Trade }>({ isOpen: false });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsModalOpen(true);
  };

  const handleSaveTrade = async (tradeData: Omit<Trade, 'id'>) => {
    try {
      setError('');
      if (editingTrade) {
        await onEditTrade(editingTrade.id, tradeData);
      } else {
        await onAddTrade(tradeData);
      }
      setEditingTrade(undefined);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Save trade error:', error);
      setError(error.message || 'Failed to save trade');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTrade(undefined);
    setError('');
  };

  const handleMarkAsClosedClick = (trade: Trade) => {
    setMarkAsClosed({ isOpen: true, trade });
  };

  const handleMarkAsClosedSave = async (exitPrice: number, exitDate: string) => {
    if (!markAsClosed.trade) return;

    const updatedTrade: Omit<Trade, 'id'> = {
      ...markAsClosed.trade,
      status: 'CLOSED',
      exitPrice,
      exitDate
    };

    await onEditTrade(markAsClosed.trade.id, updatedTrade);
    setMarkAsClosed({ isOpen: false });
  };

  const handleTrendingStockSelect = (symbol: string) => {
    // Auto-fill the trade modal with the selected stock
    setEditingTrade(undefined);
    setIsModalOpen(true);
    // The TradeModal will handle the stock selection through StockSearchInput
  };

  const handleRefreshCMP = async () => {
    setIsRefreshing(true);
    try {
      // Use the cache-busting refresh method
      await stockCsvService.refreshData();
      // Force a re-render
      setSelectedPeriod(prev => prev);
    } catch (error) {
      console.error('Failed to refresh CMP data:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh stock data');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getStockLogo = (symbol: string) => {
    return symbol.charAt(0).toUpperCase();
  };

  // Calculate filtered monthly return based on selected month/year
  const getFilteredMonthlyReturn = () => {
    if (selectedMonth) {
      const monthTrades = trades.filter(trade => {
        if (trade.status !== 'CLOSED' || !trade.exitDate) return false;
        const exitDate = new Date(trade.exitDate);
        const tradeMonth = exitDate.toLocaleDateString('en-US', { month: 'long' });
        return tradeMonth === selectedMonth && exitDate.getFullYear() === selectedYear;
      });
      
      return monthTrades.reduce((sum, trade) => {
        return sum + ((trade.exitPrice! - trade.entryPrice) * trade.quantity);
      }, 0);
    }
    
    // If no specific month selected, show current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthTrades = trades.filter(trade => {
      if (trade.status !== 'CLOSED' || !trade.exitDate) return false;
      const exitDate = new Date(trade.exitDate);
      return exitDate.getMonth() === currentMonth && exitDate.getFullYear() === currentYear;
    });
    
    return monthTrades.reduce((sum, trade) => {
      return sum + ((trade.exitPrice! - trade.entryPrice) * trade.quantity);
    }, 0);
  };

  const filteredMonthlyReturn = getFilteredMonthlyReturn();

  // Calculate additional metrics
  const winRate = stats.closedTrades > 0 
    ? (trades.filter(t => t.status === 'CLOSED' && t.exitPrice && (t.exitPrice - t.entryPrice) * t.quantity > 0).length / stats.closedTrades) * 100 
    : 0;

  const avgReturn = stats.closedTrades > 0 ? stats.totalReturn / stats.closedTrades : 0;
  const returnPercentage = stats.totalInvestment > 0 ? (stats.totalReturn / stats.totalInvestment) * 100 : 0;

  // Recent trades (last 5)
  const recentTrades = trades.slice(-5).reverse();

  // Top performing stocks
  const topStocks = trades
    .filter(t => t.status === 'CLOSED' && t.exitPrice)
    .map(t => ({
      symbol: t.symbol,
      return: ((t.exitPrice! - t.entryPrice) / t.entryPrice) * 100
    }))
    .sort((a, b) => b.return - a.return)
    .slice(0, 5);

  // Monthly performance data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthTrades = getTradesByMonth(date.getMonth(), date.getFullYear());
    const monthReturn = monthTrades
      .filter(t => t.status === 'CLOSED' && t.exitPrice)
      .reduce((sum, t) => sum + ((t.exitPrice! - t.entryPrice) * t.quantity), 0);
    
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      return: monthReturn,
      trades: monthTrades.length
    };
  }).reverse();

  const maxReturn = Math.max(...monthlyData.map(d => Math.abs(d.return)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your trading overview</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <MonthFilter
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Add Trade</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatsCard
            title="Portfolio Value"
            value={formatCurrency(stats.totalInvestment + stats.totalReturn)}
            subtitle={`${formatPercentage(returnPercentage)} overall`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            trend={returnPercentage >= 0 ? 'up' : 'down'}
            trendValue={formatPercentage(returnPercentage)}
          />
          <StatsCard
            title="Total P&L"
            value={formatCurrency(stats.totalReturn)}
            subtitle={`${stats.closedTrades} closed trades`}
            icon={TrendingUp}
            gradient={stats.totalReturn >= 0 ? "bg-gradient-to-br from-green-500 to-green-600" : "bg-gradient-to-br from-red-500 to-red-600"}
            trend={stats.totalReturn >= 0 ? 'up' : 'down'}
            trendValue={formatCurrency(Math.abs(stats.totalReturn))}
          />
          <StatsCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            subtitle={`${stats.activeTrades} active trades`}
            icon={Target}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            trend={winRate >= 50 ? 'up' : 'down'}
            trendValue={`${winRate.toFixed(1)}%`}
          />
          <StatsCard
            title={selectedMonth ? `${selectedMonth} P&L` : "Monthly P&L"}
            value={formatCurrency(filteredMonthlyReturn)}
            subtitle={selectedMonth ? `${selectedMonth} ${selectedYear}` : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            icon={Activity}
            gradient={filteredMonthlyReturn >= 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-orange-500 to-orange-600"}
            trend={filteredMonthlyReturn >= 0 ? 'up' : 'down'}
            trendValue={formatCurrency(Math.abs(filteredMonthlyReturn))}
          />
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-12 text-sm font-medium text-gray-600">{data.month}</div>
                  <div className="flex-1 flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          data.return >= 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{
                          width: `${maxReturn > 0 ? (Math.abs(data.return) / maxReturn) * 100 : 0}%`,
                          minWidth: data.return !== 0 ? '4px' : '0'
                        }}
                      />
                    </div>
                    <div className="w-20 text-right">
                      <span className={`text-sm font-semibold ${
                        data.return >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(data.return)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Stocks */}
          <TrendingStocks
            onStockSelect={handleTrendingStockSelect}
            limit={8}
          />
        </div>

        {/* Focus Stocks & Recent Trades */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Focus Stocks */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Focus Stocks</h2>
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">{focusStocks.length} stocks</span>
              </div>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {focusStocks.slice(0, 5).map((stock) => {
                const potentialReturn = ((stock.targetPrice - stock.currentPrice) / stock.currentPrice) * 100;
                return (
                  <div key={stock.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{getStockLogo(stock.symbol)}</span>
                        </div>
                        {stock.tradeTaken ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Target className="w-5 h-5 text-orange-500" />
                        )}
                        <span className="font-semibold text-gray-900">{stock.symbol}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(stock.currentPrice)} → {formatCurrency(stock.targetPrice)}
                      </div>
                      <div className={`text-xs font-semibold ${
                        potentialReturn >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(potentialReturn)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {focusStocks.length === 0 && (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No focus stocks added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Trades</h2>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">{trades.length} total</span>
              </div>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentTrades.map((trade) => {
                const returnValue = trade.status === 'CLOSED' && trade.exitPrice 
                  ? (trade.exitPrice - trade.entryPrice) * trade.quantity 
                  : 0;
                return (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{getStockLogo(trade.symbol)}</span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        trade.type === 'BUY' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {trade.type === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{trade.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {trade.quantity} @ {formatCurrency(trade.entryPrice)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        trade.status === 'ACTIVE' ? 'text-blue-600' : 
                        returnValue >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.status === 'ACTIVE' ? 'Active' : 'Realised'}
                      </div>
                      {trade.status === 'CLOSED' && (
                        <div className={`text-xs font-medium ${
                          returnValue >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(returnValue)}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {new Date(trade.entryDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              {trades.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No trades recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Trades Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-900">All Trades</h2>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">
                {trades.length} trades • {stats.activeTrades} active
              </span>
            </div>
          </div>
          {trades.length > 0 ? (
            <div className="overflow-hidden">
              <TradeTable
                trades={trades.slice(-10)}
                onEditTrade={handleEditTrade}
                onDeleteTrade={onDeleteTrade}
                onUpdateTrade={onEditTrade}
                onRefreshCMP={handleRefreshCMP}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trades yet</h3>
              <p className="text-gray-600 mb-4">Start by adding your first trade to see your portfolio analytics</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Trade
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trade Modal */}
      <TradeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTrade}
        trade={editingTrade}
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
    </div>
  );
}