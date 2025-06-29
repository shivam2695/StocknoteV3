import { useState, useEffect } from 'react';
import { FocusStock } from '../types/FocusStock';
import { apiService } from '../services/api';
import { FocusStockTag } from '../components/FocusStockTags';

export function useFocusStocks(userEmail?: string) {
  const [focusStocks, setFocusStocks] = useState<FocusStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load focus stocks from localStorage
  const loadFocusStocks = () => {
    if (!userEmail) return;
    
    try {
      const stored = localStorage.getItem(`focusStocks_${userEmail}`);
      if (stored) {
        setFocusStocks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading focus stocks:', error);
      setError('Failed to load focus stocks');
    }
  };

  // Save focus stocks to localStorage
  const saveFocusStocks = (stocks: FocusStock[]) => {
    if (!userEmail) return;
    
    try {
      localStorage.setItem(`focusStocks_${userEmail}`, JSON.stringify(stocks));
    } catch (error) {
      console.error('Error saving focus stocks:', error);
      setError('Failed to save focus stocks');
    }
  };

  useEffect(() => {
    loadFocusStocks();
  }, [userEmail]);

  const addFocusStock = async (stockData: Omit<FocusStock, 'id'>) => {
    try {
      // Validate required fields
      if (!stockData.symbol || !stockData.symbol.trim()) {
        throw new Error('Stock symbol is required');
      }
      if (!stockData.currentPrice || stockData.currentPrice <= 0) {
        throw new Error('Current price must be greater than 0');
      }
      if (!stockData.targetPrice || stockData.targetPrice <= 0) {
        throw new Error('Target price must be greater than 0');
      }
      if (!stockData.reason || !stockData.reason.trim()) {
        throw new Error('Reason is required');
      }
      if (!stockData.dateAdded) {
        throw new Error('Date added is required');
      }

      const newStock: FocusStock = {
        ...stockData,
        id: Date.now().toString(),
        // Ensure symbol is standardized
        symbol: stockData.symbol.trim().toUpperCase()
      };

      const updatedStocks = [...focusStocks, newStock];
      setFocusStocks(updatedStocks);
      saveFocusStocks(updatedStocks);
      
      return newStock;
    } catch (error) {
      console.error('Add focus stock error:', error);
      throw error;
    }
  };

  const updateFocusStock = async (stockId: string, stockData: Omit<FocusStock, 'id'>) => {
    try {
      // Validate required fields
      if (!stockData.symbol || !stockData.symbol.trim()) {
        throw new Error('Stock symbol is required');
      }
      if (!stockData.currentPrice || stockData.currentPrice <= 0) {
        throw new Error('Current price must be greater than 0');
      }
      if (!stockData.targetPrice || stockData.targetPrice <= 0) {
        throw new Error('Target price must be greater than 0');
      }
      if (!stockData.reason || !stockData.reason.trim()) {
        throw new Error('Reason is required');
      }
      if (!stockData.dateAdded) {
        throw new Error('Date added is required');
      }

      const updatedStocks = focusStocks.map(stock => 
        stock.id === stockId ? { 
          ...stockData, 
          id: stockId,
          // Ensure symbol is standardized
          symbol: stockData.symbol.trim().toUpperCase()
        } : stock
      );
      
      setFocusStocks(updatedStocks);
      saveFocusStocks(updatedStocks);
      
      return updatedStocks.find(stock => stock.id === stockId);
    } catch (error) {
      console.error('Update focus stock error:', error);
      throw error;
    }
  };

  const deleteFocusStock = async (stockId: string) => {
    try {
      const updatedStocks = focusStocks.filter(stock => stock.id !== stockId);
      setFocusStocks(updatedStocks);
      saveFocusStocks(updatedStocks);
    } catch (error) {
      console.error('Delete focus stock error:', error);
      throw error;
    }
  };

  const markTradeTaken = async (stockId: string, tradeTaken: boolean, tradeDate?: string, entryPrice?: number, quantity?: number) => {
    try {
      // Find the stock to update
      const stockToUpdate = focusStocks.find(stock => stock.id === stockId);
      if (!stockToUpdate) {
        throw new Error('Stock not found');
      }
      
      // Update the stock with new values
      const updatedStock = {
        ...stockToUpdate,
        tradeTaken,
        tradeDate: tradeTaken ? (tradeDate || new Date().toISOString().split('T')[0]) : undefined,
        // Store trade details when marking as taken
        tradedQuantity: tradeTaken ? (quantity || 1) : stockToUpdate.tradedQuantity,
        tradedEntryPrice: tradeTaken ? (entryPrice || stockToUpdate.currentPrice) : stockToUpdate.tradedEntryPrice
      };
      
      console.log('Updating focus stock with trade details:', {
        tradeTaken,
        tradedQuantity: updatedStock.tradedQuantity,
        tradedEntryPrice: updatedStock.tradedEntryPrice
      });
      
      // Update the stocks array
      const updatedStocks = focusStocks.map(stock => 
        stock.id === stockId ? updatedStock : stock
      );
      
      setFocusStocks(updatedStocks);
      saveFocusStocks(updatedStocks);
      
      return {
        stock: updatedStock,
        quantity: quantity || 1
      };
    } catch (error) {
      console.error('Mark trade taken error:', error);
      throw error;
    }
  };

  const updateStockTag = async (stockId: string, tag: FocusStockTag) => {
    try {
      const updatedStocks = focusStocks.map(stock => 
        stock.id === stockId ? { ...stock, tag } : stock
      );
      
      setFocusStocks(updatedStocks);
      saveFocusStocks(updatedStocks);
      
      return updatedStocks.find(stock => stock.id === stockId);
    } catch (error) {
      console.error('Update stock tag error:', error);
      throw error;
    }
  };

  return {
    focusStocks,
    loading,
    error,
    addFocusStock,
    updateFocusStock,
    deleteFocusStock,
    markTradeTaken,
    updateStockTag,
    refetch: loadFocusStocks
  };
}