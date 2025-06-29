import { FocusStockTag } from '../components/FocusStockTags';

export interface FocusStock {
  id: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  reason: string;
  dateAdded: string;
  tradeTaken: boolean;
  tradeDate?: string;
  notes?: string;
  tag?: FocusStockTag;
  // New fields to track trade details
  tradedQuantity?: number;
  tradedEntryPrice?: number;
}