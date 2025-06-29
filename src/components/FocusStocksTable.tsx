import React, { useState, useEffect } from 'react';
import { FocusStock } from '../types/FocusStock';
import { Target, TrendingUp, CheckCircle, Circle, Edit, Trash2, Calendar, IndianRupee } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import FocusStockTags, { FocusStockTag } from './FocusStockTags';
import { stockCsvService } from '../services/stockCsvService';
import TradeTakenModal from './TradeTakenModal';

interface FocusStocksTableProps {
  stocks: FocusStock[];
  onEditStock: (stock: FocusStock) => void;
  onDeleteStock: (stockId: string) => void;
  onMarkTradeTaken: (stockId: string, tradeTaken: boolean, tradeDate?: string, entryPrice?: number, quantity?: number) => void;
  onUpdateStockTag?: (stockId: string, tag: FocusStockTag) => void;
}

export default function FocusStocksTable({ 
  stocks, 
  onEditStock, 
  onDeleteStock, 
  onMarkTradeTaken,
  onUpdateStockTag
}: FocusStocksTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; stock?: FocusStock }>({ isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});
  const [tradeTakenModal, setTradeTakenModal] = useState<{ 
    isOpen: boolean; 
    stock?: FocusStock; 
    action: 'take' | 'revert';
  }>({ isOpen: false, action: 'take' });

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
  }, [stocks]);

  // Update stock prices from CSV service
  const updateStockPrices = () => {
    const prices: Record<string, number> = {};
    
    stocks.forEach(stock => {
      const stockData = stockCsvService.getStockBySymbol(stock.symbol);
      if (stockData) {
        prices[stock.symbol] = stockData.cmp;
      }
    });
    
    setStockPrices(prices);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateReturn = (stock: FocusStock) => {
    // Get current market price if available, otherwise use stored current price
    const currentCMP = stockPrices[stock.symbol] || stock.currentPrice;
    // Calculate return based on CMP - Entry Price
    return ((currentCMP - stock.currentPrice) / stock.currentPrice) * 100;
  };

  const calculateAging = (dateString: string) => {
    const entryDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getReturnColor = (returnPercentage: number) => {
    if (returnPercentage > 0) return 'text-green-600';
    if (returnPercentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStockLogo = (symbol: string) => {
    return symbol.charAt(0).toUpperCase();
  };

  const handleTradeTakenToggle = (stock: FocusStock) => {
    if (!stock.tradeTaken) {
      // Show modal to mark as taken with inputs
      setTradeTakenModal({ 
        isOpen: true, 
        stock, 
        action: 'take' 
      });
    } else {
      // Show confirmation to revert to In Focus
      setTradeTakenModal({ 
        isOpen: true, 
        stock, 
        action: 'revert' 
      });
    }
  };

  const handleTradeTakenConfirm = (entryPrice?: number, quantity?: number) => {
    if (!tradeTakenModal.stock) return;
    
    if (tradeTakenModal.action === 'take') {
      const tradeDate = new Date().toISOString().split('T')[0];
      onMarkTradeTaken(
        tradeTakenModal.stock.id, 
        true, 
        tradeDate, 
        entryPrice, 
        quantity
      );
    } else {
      onMarkTradeTaken(tradeTakenModal.stock.id, false);
    }
    
    setTradeTakenModal({ isOpen: false, action: 'take' });
  };

  const handleDeleteClick = (stock: FocusStock) => {
    setDeleteConfirm({ isOpen: true, stock });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.stock) return;
    
    setIsDeleting(true);
    try {
      await onDeleteStock(deleteConfirm.stock.id);
      setDeleteConfirm({ isOpen: false });
    } catch (error) {
      console.error('Delete focus stock error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTagChange = (stockId: string, tag: FocusStockTag) => {
    if (onUpdateStockTag) {
      onUpdateStockTag(stockId, tag);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-20">Status</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-32">Symbol</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700 w-24">CMP</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700 w-24">Entry Price</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700 w-24">Target</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700 w-20">Return</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-36">Reason</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 w-28">Tag</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700 w-24">Aging</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-700 w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stocks.map((stock) => {
                const aging = calculateAging(stock.dateAdded);
                // Get CMP from Google Sheet
                const currentCMP = stockPrices[stock.symbol];
                // Calculate current return using CMP - Entry Price
                const currentReturn = calculateReturn(stock);
                
                return (
                  <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleTradeTakenToggle(stock)}
                          className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                        >
                          {stock.tradeTaken ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <Circle className="w-3 h-3 text-blue-500" />
                          )}
                          <span className={`text-xs font-bold ${
                            stock.tradeTaken ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {stock.tradeTaken ? 'Trade Taken' : 'In Focus'}
                          </span>
                        </button>
                      </div>
                      {stock.tradeTaken && stock.tradeDate && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatDate(stock.tradeDate)}
                          </span>
                        </div>
                      )}
                      {stock.tradeTaken && stock.tradedQuantity && (
                        <div className="text-xs text-gray-500 mt-1">
                          Qty: {stock.tradedQuantity}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{getStockLogo(stock.symbol)}</span>
                        </div>
                        <span className="font-semibold text-gray-900 truncate">{stock.symbol}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {stockPrices[stock.symbol] ? (
                        <div className="flex items-center justify-center space-x-1">
                          <IndianRupee className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-900">{stockPrices[stock.symbol].toLocaleString('en-IN')}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <IndianRupee className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-900">{stock.currentPrice.toLocaleString('en-IN')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {stock.targetPrice ? (
                        <div className="flex items-center justify-center space-x-1">
                          <IndianRupee className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-900">{stock.targetPrice.toLocaleString('en-IN')}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <TrendingUp className={`w-3 h-3 ${getReturnColor(currentReturn)}`} />
                        <span className={`font-semibold text-xs ${getReturnColor(currentReturn)}`}>
                          {currentReturn.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="max-w-full overflow-hidden">
                        <span className="text-gray-700 text-xs line-clamp-1">{stock.reason}</span>
                        {stock.notes && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">{stock.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <FocusStockTags
                        selectedTag={stock.tag}
                        onTagChange={(tag) => handleTagChange(stock.id, tag)}
                        displayMode="display"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">{aging}</span> days
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(stock.dateAdded)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onEditStock(stock)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                          title="Edit Focus Stock"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(stock)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                          title="Delete Focus Stock"
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
        title="Delete Focus Stock"
        message={`Are you sure you want to delete ${deleteConfirm.stock?.symbol} from your focus stocks? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Trade Taken Modal */}
      <TradeTakenModal
        isOpen={tradeTakenModal.isOpen}
        onClose={() => setTradeTakenModal({ isOpen: false, action: 'take' })}
        onConfirm={handleTradeTakenConfirm}
        stock={tradeTakenModal.stock}
        action={tradeTakenModal.action}
      />
    </>
  );
}