const mongoose = require('mongoose');

const teamTradeSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
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
  remarks: {
    type: String,
    maxlength: [500, 'Remarks cannot exceed 500 characters'],
    trim: true
  },
  // Additional fields for comprehensive tracking
  currentPrice: {
    type: Number,
    min: [0, 'Current price must be positive']
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  exitPrice: {
    type: Number,
    min: [0, 'Exit price must be positive']
  },
  exitDate: {
    type: Date,
    validate: {
      validator: function(value) {
        if (this.status === 'closed' && !value) return false;
        if (value && this.entryDate && value < this.entryDate) return false;
        return true;
      },
      message: 'Exit date must be after entry date and is required for closed trades'
    }
  },
  pnl: {
    type: Number,
    default: 0
  },
  pnlPercentage: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Team trade specific fields
  strategy: {
    type: String,
    trim: true,
    maxlength: [100, 'Strategy cannot exceed 100 characters']
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  targetPrice: {
    type: Number,
    min: [0, 'Target price must be positive']
  },
  stopLoss: {
    type: Number,
    min: [0, 'Stop loss must be positive']
  },
  // Voting/consensus system
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['buy', 'sell', 'hold'],
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    },
    comment: {
      type: String,
      maxlength: [200, 'Comment cannot exceed 200 characters']
    }
  }],
  // Auto-generated fields
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
teamTradeSchema.index({ team: 1, createdAt: -1 });
teamTradeSchema.index({ team: 1, stockName: 1 });
teamTradeSchema.index({ team: 1, status: 1 });
teamTradeSchema.index({ team: 1, month: 1, year: 1 });
teamTradeSchema.index({ createdBy: 1 });

// Calculate P&L and auto-generate fields before saving
teamTradeSchema.pre('save', function(next) {
  // Auto-generate month and year from entryDate
  const entryDate = new Date(this.entryDate);
  this.month = entryDate.toLocaleDateString('en-US', { month: 'long' });
  this.year = entryDate.getFullYear();
  
  // Calculate P&L if current price is available
  if (this.currentPrice) {
    this.pnlPercentage = ((this.currentPrice - this.entryPrice) * 100) / this.entryPrice;
    this.pnl = (this.currentPrice - this.entryPrice) * (this.quantity || 1);
  }
  
  // Calculate P&L for closed trades
  if (this.status === 'closed' && this.exitPrice) {
    this.pnlPercentage = ((this.exitPrice - this.entryPrice) * 100) / this.entryPrice;
    this.pnl = (this.exitPrice - this.entryPrice) * (this.quantity || 1);
    this.currentPrice = this.exitPrice;
  }
  
  next();
});

// Post-save hook to update team statistics
teamTradeSchema.post('save', async function() {
  const Team = mongoose.model('Team');
  await Team.updateTeamStats(this.team);
});

// Virtual for vote summary
teamTradeSchema.virtual('voteSummary').get(function() {
  const summary = { buy: 0, sell: 0, hold: 0, total: 0 };
  
  this.votes.forEach(vote => {
    summary[vote.vote]++;
    summary.total++;
  });
  
  return summary;
});

// Method to add vote
teamTradeSchema.methods.addVote = function(userId, vote, comment = '') {
  // Remove existing vote from this user
  this.votes = this.votes.filter(v => v.user.toString() !== userId.toString());
  
  // Add new vote
  this.votes.push({
    user: userId,
    vote: vote,
    comment: comment,
    votedAt: new Date()
  });
  
  return this.save();
};

// Static method to get team trade statistics
teamTradeSchema.statics.getTeamStats = async function(teamId) {
  const stats = await this.aggregate([
    { $match: { team: mongoose.Types.ObjectId(teamId) } },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        openTrades: {
          $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
        },
        closedTrades: {
          $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
        },
        totalPnL: { $sum: '$pnl' },
        avgPnLPercentage: { $avg: '$pnlPercentage' },
        winningTrades: {
          $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] }
        }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalTrades: 0,
    openTrades: 0,
    closedTrades: 0,
    totalPnL: 0,
    avgPnLPercentage: 0,
    winningTrades: 0
  };
  
  // Calculate win rate
  result.winRate = result.closedTrades > 0 ? (result.winningTrades / result.closedTrades) * 100 : 0;
  
  return result;
};

// Static method to get monthly performance for team
teamTradeSchema.statics.getTeamMonthlyPerformance = async function(teamId, year) {
  return await this.aggregate([
    { 
      $match: { 
        team: mongoose.Types.ObjectId(teamId),
        year: year || new Date().getFullYear()
      } 
    },
    {
      $group: {
        _id: '$month',
        totalPnL: { $sum: '$pnl' },
        totalTrades: { $sum: 1 },
        avgPnLPercentage: { $avg: '$pnlPercentage' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
};

module.exports = mongoose.model('TeamTrade', teamTradeSchema);