const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: [true, 'Stock symbol is required'],
    uppercase: true,
    trim: true,
    maxlength: [10, 'Symbol cannot exceed 10 characters']
  },
  type: {
    type: String,
    required: [true, 'Trade type is required'],
    enum: {
      values: ['BUY', 'SELL'],
      message: 'Trade type must be either BUY or SELL'
    }
  },
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required'],
    min: [0, 'Entry price must be positive']
  },
  exitPrice: {
    type: Number,
    min: [0, 'Exit price must be positive'],
    validate: {
      validator: function(value) {
        return this.status === 'ACTIVE' || (this.status === 'CLOSED' && value != null);
      },
      message: 'Exit price is required for closed trades'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  entryDate: {
    type: Date,
    required: [true, 'Entry date is required'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Entry date cannot be in the future'
    }
  },
  exitDate: {
    type: Date,
    validate: {
      validator: function(value) {
        if (this.status === 'CLOSED' && !value) return false;
        if (value && this.entryDate && value < this.entryDate) return false;
        return true;
      },
      message: 'Exit date must be after entry date and is required for closed trades'
    }
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['ACTIVE', 'CLOSED'],
      message: 'Status must be either ACTIVE or CLOSED'
    },
    default: 'ACTIVE'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  },
  // Calculated fields
  totalInvestment: {
    type: Number
  },
  totalReturn: {
    type: Number
  },
  returnPercentage: {
    type: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ user: 1, symbol: 1 });
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ user: 1, entryDate: -1 });

// Calculate investment and returns before saving
tradeSchema.pre('save', function(next) {
  this.totalInvestment = this.entryPrice * this.quantity;
  
  if (this.status === 'CLOSED' && this.exitPrice) {
    this.totalReturn = (this.exitPrice - this.entryPrice) * this.quantity;
    this.returnPercentage = ((this.exitPrice - this.entryPrice) / this.entryPrice) * 100;
  } else {
    this.totalReturn = 0;
    this.returnPercentage = 0;
  }
  
  next();
});

// Virtual for formatted return
tradeSchema.virtual('formattedReturn').get(function() {
  if (this.status === 'CLOSED' && this.totalReturn !== undefined) {
    return {
      amount: this.totalReturn,
      percentage: this.returnPercentage,
      isProfit: this.totalReturn >= 0
    };
  }
  return null;
});

// Static method to get user statistics
tradeSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        activeTrades: {
          $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
        },
        closedTrades: {
          $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] }
        },
        totalInvestment: { $sum: '$totalInvestment' },
        totalReturn: {
          $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, '$totalReturn', 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalTrades: 0,
    activeTrades: 0,
    closedTrades: 0,
    totalInvestment: 0,
    totalReturn: 0
  };
};

module.exports = mongoose.model('Trade', tradeSchema);