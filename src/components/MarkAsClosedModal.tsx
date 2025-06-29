import React, { useState } from 'react';
import { X, TrendingUp, AlertCircle, IndianRupee } from 'lucide-react';

interface MarkAsClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exitPrice: number, exitDate: string) => Promise<void>;
  stockSymbol: string;
  entryPrice: number;
  entryDate: string;
  quantity: number;
}

export default function MarkAsClosedModal({
  isOpen,
  onClose,
  onSave,
  stockSymbol,
  entryPrice,
  entryDate,
  quantity
}: MarkAsClosedModalProps) {
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exitPrice || parseFloat(exitPrice) <= 0) {
      setError('Exit price must be greater than 0');
      return;
    }
    
    if (!exitDate) {
      setError('Exit date is required');
      return;
    }
    
    if (new Date(exitDate) < new Date(entryDate)) {
      setError('Exit date must be after entry date');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await onSave(parseFloat(exitPrice), exitDate);
      onClose();
      setExitPrice('');
      setExitDate(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      setError(error.message || 'Failed to close trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePnL = () => {
    if (!exitPrice || parseFloat(exitPrice) <= 0) return null;
    
    const pnl = (parseFloat(exitPrice) - entryPrice) * quantity;
    const pnlPercentage = ((parseFloat(exitPrice) - entryPrice) / entryPrice) * 100;
    
    return { pnl, pnlPercentage };
  };

  const pnlData = calculatePnL();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Mark as Closed</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Trade Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{stockSymbol}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Entry Price:</span>
                <span className="ml-2 font-semibold">₹{entryPrice}</span>
              </div>
              <div>
                <span className="text-gray-500">Quantity:</span>
                <span className="ml-2 font-semibold">{quantity}</span>
              </div>
              <div>
                <span className="text-gray-500">Entry Date:</span>
                <span className="ml-2 font-semibold">
                  {new Date(entryDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Exit Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exit Price (₹) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <IndianRupee className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="number"
                step="0.01"
                value={exitPrice}
                onChange={(e) => {
                  setExitPrice(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter exit price"
                min="0"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Exit Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exit Date *
            </label>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => {
                setExitDate(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={entryDate}
              max={new Date().toISOString().split('T')[0]}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* P&L Preview */}
          {pnlData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">P&L Preview</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {quantity} × (₹{exitPrice} - ₹{entryPrice})
                </span>
                <span className={`text-sm font-semibold ${
                  pnlData.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₹{pnlData.pnl.toFixed(2)} ({pnlData.pnlPercentage >= 0 ? '+' : ''}{pnlData.pnlPercentage.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !exitPrice || !exitDate}
            >
              {isSubmitting ? 'Closing...' : 'Close Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}