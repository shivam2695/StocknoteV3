export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryDate: string;
  exitDate?: string;
  status: 'ACTIVE' | 'CLOSED';
  notes?: string;
}

export interface TradeStats {
  totalInvestment: number;
  totalReturn: number;
  monthlyReturn: number;
  totalTrades: number;
  activeTrades: number;
  closedTrades: number;
}