const mongoose = require('mongoose');

const focusStockSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stockName: {
    type: String,
    required: [true, 'Stock name is required'],
    uppercase: true,
    trim: true,
    maxlength: [20, 'Stock name cannot exceed 20 characters']
  },
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required'],
    min: [0, 'Entry price must be positive']
  },
  targetPrice: {
    type: Number,
    required: [true, 'Target price is required'],
    min: [0, 'Target price must be positive']
  },
  stopLossPrice: {
    type: Number,
    required: [true, 'Stop loss price is required'],
    min: [0, 'Stop loss price must be positive']
  },
  currentPrice: {
    type: Number,
    required: [true, 'Current price is required'],
    min: [0, 'Current price must be positive']
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['green', 'red', 'neutral'],
      message: 'Status must be green, red, or neutral'
    },
    default: 'neutral'
  },
  month: {
    type: String,
    required: false // Make optional since we auto-generate it
  },
  year: {
    type: Number,
    required: false // Make optional since we auto-generate it
  },
  // Additional fields for better tracking
  reason: {
    type: String,
    maxlength: [200, 'Reason cannot exceed 200 characters'],
    trim: true,
    default: ''
  },
  tradeTaken: {
    type: Boolean,
    default: false
  },
  tradeDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true,
    default: ''
  },
  // Calculated fields
  potentialReturn: {
    type: Number
  },
  potentialReturnPercentage: {
    type: Number
  },
  riskRewardRatio: {
    type: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
focusStockSchema.index({ user: 1, createdAt: -1 });
focusStockSchema.index({ user: 1, stockName: 1 });
focusStockSchema.index({ user: 1, status: 1 });
focusStockSchema.index({ user: 1, month: 1, year: 1 });
focusStockSchema.index({ user: 1, tradeTaken: 1 });

// Calculate derived fields before saving
focusStockSchema.pre('save', function(next) {
  // ALWAYS auto-generate month and year from current date
  const currentDate = new Date();
  this.month = currentDate.toLocaleDateString('en-US', { month: 'long' });
  this.year = currentDate.getFullYear();
  
  // Calculate potential return
  this.potentialReturn = this.targetPrice - this.entryPrice;
  this.potentialReturnPercentage = ((this.targetPrice - this.entryPrice) / this.entryPrice) * 100;
  
  // Calculate risk-reward ratio
  const risk = this.entryPrice - this.stopLossPrice;
  const reward = this.targetPrice - this.entryPrice;
  this.riskRewardRatio = risk > 0 ? reward / risk : 0;
  
  // Auto-determine status based on current price
  if (this.currentPrice >= this.targetPrice) {
    this.status = 'green';
  } else if (this.currentPrice <= this.stopLossPrice) {
    this.status = 'red';
  } else {
    this.status = 'neutral';
  }
  
  next();
});

// Virtual for formatted potential return
focusStockSchema.virtual('formattedPotentialReturn').get(function() {
  return {
    amount: this.potentialReturn,
    percentage: this.potentialReturnPercentage,
    isPositive: this.potentialReturn >= 0
  };
});

// Static method to get user focus stock statistics
focusStockSchema.statics.getUserFocusStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalFocusStocks: { $sum: 1 },
        pendingStocks: {
          $sum: { $cond: [{ $eq: ['$tradeTaken', false] }, 1, 0] }
        },
        takenStocks: {
          $sum: { $cond: [{ $eq: ['$tradeTaken', true] }, 1, 0] }
        },
        greenStocks: {
          $sum: { $cond: [{ $eq: ['$status', 'green'] }, 1, 0] }
        },
        redStocks: {
          $sum: { $cond: [{ $eq: ['$status', 'red'] }, 1, 0] }
        },
        neutralStocks: {
          $sum: { $cond: [{ $eq: ['$status', 'neutral'] }, 1, 0] }
        },
        averagePotentialReturn: {
          $avg: { $cond: [{ $eq: ['$tradeTaken', false] }, '$potentialReturnPercentage', null] }
        },
        averageRiskReward: { $avg: '$riskRewardRatio' }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalFocusStocks: 0,
    pendingStocks: 0,
    takenStocks: 0,
    greenStocks: 0,
    redStocks: 0,
    neutralStocks: 0,
    averagePotentialReturn: 0,
    averageRiskReward: 0
  };
  
  // Calculate conversion rate
  result.conversionRate = result.totalFocusStocks > 0 
    ? (result.takenStocks / result.totalFocusStocks) * 100 
    : 0;
  
  return result;
};

module.exports = mongoose.model('FocusStock', focusStockSchema);