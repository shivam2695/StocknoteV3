import React, { useState, useEffect } from 'react';
import { X, TrendingUp, CheckCircle, AlertCircle, IndianRupee, AlertTriangle } from 'lucide-react';
import { FocusStock } from '../types/FocusStock';

interface TradeTakenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (entryPrice?: number, quantity?: number) => void;
  stock?: FocusStock;
  action: 'take' | 'revert';
}

export default function TradeTakenModal({
  isOpen,
  onClose,
  onConfirm,
  stock,
  action
}: TradeTakenModalProps) {
  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (stock && isOpen) {
      // Pre-fill with the stock's current price
      setEntryPrice(stock.currentPrice.toString());
      setQuantity('1');
      setErrors({});
    }
  }, [stock, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (action === 'take') {
      // Only validate for 'take' action
      if (!entryPrice) {
        newErrors.entryPrice = 'Entry price is required';
      } else {
        const price = parseFloat(entryPrice);
        if (isNaN(price) || price <= 0) {
          newErrors.entryPrice = 'Entry price must be greater than 0';
        }
      }

      if (!quantity) {
        newErrors.quantity = 'Quantity is required';
      } else {
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
          newErrors.quantity = 'Quantity must be greater than 0';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (action === 'take') {
        onConfirm(parseFloat(entryPrice), parseInt(quantity));
      } else {
        onConfirm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            {action === 'take' ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingUp className="w-6 h-6 text-blue-500" />
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {action === 'take' ? 'Mark as Trade Taken' : 'Revert to In Focus'}
            </h2>
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
          {/* Stock Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{stock.symbol}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Current Price:</span>
                <span className="ml-2 font-semibold">₹{stock.currentPrice.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-gray-500">Target Price:</span>
                <span className="ml-2 font-semibold">₹{stock.targetPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Reason:</span>
                <span className="ml-2 font-semibold">{stock.reason}</span>
              </div>
            </div>
          </div>

          {/* Confirmation Message */}
          {action === 'take' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                Mark this trade as taken and move it to the Trading Journal?
              </p>
              <p className="text-blue-700 text-xs mt-2">
                If this stock already exists in your journal, the quantity will be increased and the entry price will be recalculated as a weighted average.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 text-sm font-medium">
                    Are you sure you want to revert this trade to "In Focus"?
                  </p>
                  <p className="text-amber-700 text-sm mt-1">
                    This will remove the journal entry added for {stock.symbol} and reduce the quantity by {stock.tradedQuantity || 1} shares.
                  </p>
                  {stock.tradedEntryPrice && (
                    <p className="text-amber-700 text-sm mt-2">
                      Original entry price: ₹{stock.tradedEntryPrice.toLocaleString('en-IN')}
                    </p>
                  )}
                  <p className="text-amber-700 text-sm mt-2 font-medium">
                    This action is irreversible unless re-added manually.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Entry Price and Quantity Inputs (only for 'take' action) */}
          {action === 'take' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Price (₹) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={entryPrice}
                    onChange={(e) => {
                      setEntryPrice(e.target.value);
                      if (errors.entryPrice) setErrors({...errors, entryPrice: ''});
                    }}
                    className={`w-full pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.entryPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min="0"
                    placeholder="Your actual entry price"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                {errors.entryPrice && (
                  <div className="mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-600">{errors.entryPrice}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    if (errors.quantity) setErrors({...errors, quantity: ''});
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="1"
                  placeholder="Number of shares"
                  required
                  disabled={isSubmitting}
                />
                {errors.quantity && (
                  <div className="mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-600">{errors.quantity}</p>
                  </div>
                )}
              </div>
            </>
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
              className={`flex-1 py-2 px-4 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'take' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Processing...' 
                : action === 'take' 
                  ? 'Mark as Taken' 
                  : 'Revert to In Focus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}