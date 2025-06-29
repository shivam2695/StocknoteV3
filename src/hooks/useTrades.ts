import { useState, useEffect } from 'react';
import { Trade, TradeStats } from '../types/Trade';
import { apiService } from '../services/api';

export function useTrades(userEmail?: string) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load trades from localStorage
  const loadTrades = () => {
    if (!userEmail) return;
    
    try {
      const stored = localStorage.getItem(`trades_${userEmail}`);
      if (stored) {
        setTrades(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading trades:', error);
      setError('Failed to load trades');
    }
  };

  // Save trades to localStorage
  const saveTrades = (newTrades: Trade[]) => {
    if (!userEmail) return;
    
    try {
      localStorage.setItem(`trades_${userEmail}`, JSON.stringify(newTrades));
    } catch (error) {
      console.error('Error saving trades:', error);
      setError('Failed to save trades');
    }
  };

  useEffect(() => {
    loadTrades();
  }, [userEmail]);

  const addTrade = async (tradeData: Omit<Trade, 'id'>) => {
    try {
      console.log('🚀 FRONTEND HOOK - ADD TRADE - COMPREHENSIVE DEBUG');
      console.log('📥 Raw trade data received:', JSON.stringify(tradeData, null, 2));
      
      // CRITICAL: Validate required fields for closed trades
      if (tradeData.status === 'CLOSED') {
        console.log('🔒 Validating CLOSED trade requirements in hook...');
        
        if (!tradeData.exitPrice || tradeData.exitPrice <= 0) {
          console.log('❌ Hook validation failed: exitPrice invalid');
          throw new Error('Exit price is required and must be greater than 0 for closed trades');
        }
        if (!tradeData.exitDate) {
          console.log('❌ Hook validation failed: exitDate missing');
          throw new Error('Exit date is required for closed trades');
        }
        // Validate exit date is after entry date
        if (new Date(tradeData.exitDate) < new Date(tradeData.entryDate)) {
          console.log('❌ Hook validation failed: exitDate before entryDate');
          throw new Error('Exit date must be after entry date');
        }
        
        console.log('✅ Hook validation passed for CLOSED trade');
      }

      // Ensure symbol is standardized
      const standardizedTradeData = {
        ...tradeData,
        symbol: tradeData.symbol.trim().toUpperCase()
      };

      const newTrade: Trade = {
        ...standardizedTradeData,
        id: Date.now().toString()
      };

      const updatedTrades = [...trades, newTrade];
      setTrades(updatedTrades);
      saveTrades(updatedTrades);
      
      return newTrade;
    } catch (error) {
      console.error('Add trade error:', error);
      throw error;
    }
  };

  const updateTrade = async (tradeId: string, tradeData: Omit<Trade, 'id'>) => {
    try {
      console.log('🔄 FRONTEND HOOK - UPDATE TRADE - COMPREHENSIVE DEBUG');
      console.log('🆔 Trade ID:', tradeId);
      console.log('📥 Raw trade data received:', JSON.stringify(tradeData, null, 2));
      
      // CRITICAL: Validate required fields for closed trades
      if (tradeData.status === 'CLOSED') {
        console.log('🔒 Validating CLOSED trade requirements in hook...');
        
        if (!tradeData.exitPrice || tradeData.exitPrice <= 0) {
          console.log('❌ Hook validation failed: exitPrice invalid');
          throw new Error('Exit price is required and must be greater than 0 for closed trades');
        }
        if (!tradeData.exitDate) {
          console.log('❌ Hook validation failed: exitDate missing');
          throw new Error('Exit date is required for closed trades');
        }
        // Validate exit date is after entry date
        if (new Date(tradeData.exitDate) < new Date(tradeData.entryDate)) {
          console.log('❌ Hook validation failed: exitDate before entryDate');
          throw new Error('Exit date must be after entry date');
        }
        
        console.log('✅ Hook validation passed for CLOSED trade update');
      }

      // Ensure symbol is standardized
      const standardizedTradeData = {
        ...tradeData,
        symbol: tradeData.symbol.trim().toUpperCase()
      };

      const updatedTrades = trades.map(trade => 
        trade.id === tradeId ? { ...standardizedTradeData, id: tradeId } : trade
      );
      
      setTrades(updatedTrades);
      saveTrades(updatedTrades);
      
      return updatedTrades.find(trade => trade.id === tradeId);
    } catch (error) {
      console.error('Update trade error:', error);
      throw error;
    }
  };

  const deleteTrade = async (tradeId: string) => {
    try {
      const updatedTrades = trades.filter(trade => trade.id !== tradeId);
      setTrades(updatedTrades);
      saveTrades(updatedTrades);
    } catch (error) {
      console.error('Delete trade error:', error);
      throw error;
    }
  };

  const calculateStats = (): TradeStats => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const totalInvestment = trades.reduce((sum, trade) => {
      return sum + (trade.entryPrice * trade.quantity);
    }, 0);

    const totalReturn = trades
      .filter(trade => trade.status === 'CLOSED' && trade.exitPrice)
      .reduce((sum, trade) => {
        return sum + ((trade.exitPrice! - trade.entryPrice) * trade.quantity);
      }, 0);

    const monthlyReturn = trades
      .filter(trade => {
        if (trade.status !== 'CLOSED' || !trade.exitDate) return false;
        const exitDate = new Date(trade.exitDate);
        return exitDate.getMonth() === currentMonth && exitDate.getFullYear() === currentYear;
      })
      .reduce((sum, trade) => {
        return sum + ((trade.exitPrice! - trade.entryPrice) * trade.quantity);
      }, 0);

    return {
      totalInvestment,
      totalReturn,
      monthlyReturn,
      totalTrades: trades.length,
      activeTrades: trades.filter(t => t.status === 'ACTIVE').length,
      closedTrades: trades.filter(t => t.status === 'CLOSED').length
    };
  };

  const getTradesByMonth = (month: number, year: number) => {
    return trades.filter(trade => {
      const tradeDate = new Date(trade.entryDate);
      return tradeDate.getMonth() === month && tradeDate.getFullYear() === year;
    });
  };

  return {
    trades,
    loading,
    error,
    addTrade,
    updateTrade,
    deleteTrade,
    calculateStats,
    getTradesByMonth,
    refetch: loadTrades
  };
}