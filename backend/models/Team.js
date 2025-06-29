const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    }
  },
  // Team statistics
  stats: {
    totalTrades: {
      type: Number,
      default: 0
    },
    totalPnL: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
teamSchema.index({ name: 1 });
teamSchema.index({ createdBy: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ isActive: 1 });

// Virtual for active members count
teamSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for admin members
teamSchema.virtual('admins').get(function() {
  return this.members.filter(member => member.role === 'admin' && member.isActive);
});

// Method to check if user is member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Method to check if user is admin
teamSchema.methods.isAdmin = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && 
    member.role === 'admin' && 
    member.isActive
  );
};

// Method to add member
teamSchema.methods.addMember = function(userId, role = 'member') {
  // Check if user is already a member
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    if (!existingMember.isActive) {
      existingMember.isActive = true;
      existingMember.role = role;
      existingMember.joinedAt = new Date();
    }
    return existingMember;
  }
  
  const newMember = {
    user: userId,
    role: role,
    joinedAt: new Date(),
    isActive: true
  };
  
  this.members.push(newMember);
  return newMember;
};

// Method to remove member
teamSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
    return true;
  }
  
  return false;
};

// Static method to get user teams
teamSchema.statics.getUserTeams = async function(userId) {
  return await this.find({
    'members.user': userId,
    'members.isActive': true,
    isActive: true
  }).populate('members.user', 'name email')
    .populate('createdBy', 'name email');
};

// Static method to update team stats
teamSchema.statics.updateTeamStats = async function(teamId) {
  const TeamTrade = mongoose.model('TeamTrade');
  
  const stats = await TeamTrade.aggregate([
    { $match: { team: mongoose.Types.ObjectId(teamId) } },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        totalPnL: { $sum: '$pnl' },
        winningTrades: {
          $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] }
        }
      }
    }
  ]);
  
  const result = stats[0] || { totalTrades: 0, totalPnL: 0, winningTrades: 0 };
  const winRate = result.totalTrades > 0 ? (result.winningTrades / result.totalTrades) * 100 : 0;
  
  await this.findByIdAndUpdate(teamId, {
    'stats.totalTrades': result.totalTrades,
    'stats.totalPnL': result.totalPnL,
    'stats.winRate': winRate
  });
  
  return { ...result, winRate };
};

module.exports = mongoose.model('Team', teamSchema);