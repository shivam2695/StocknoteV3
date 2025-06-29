const express = require('express');
const TeamTrade = require('../models/TeamTrade');
const Team = require('../models/Team');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateTeamTrade = [
  body('team')
    .isMongoId()
    .withMessage('Valid team ID is required'),
  body('stockName')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Stock name must be between 1 and 20 characters'),
  body('entryPrice')
    .isFloat({ min: 0 })
    .withMessage('Entry price must be a positive number'),
  body('entryDate')
    .isISO8601()
    .withMessage('Entry date must be a valid date'),
  body('remarks')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('strategy')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Strategy cannot exceed 100 characters'),
  body('riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk level must be low, medium, or high')
];

// @route   GET /api/team-trades/team/:teamId
// @desc    Get all trades for a specific team
// @access  Private
router.get('/team/:teamId', auth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 50, status, stockName, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Check if user is team member
    const team = await Team.findById(teamId);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    // Build filter
    const filter = { team: teamId };
    if (status) filter.status = status;
    if (stockName) filter.stockName = stockName.toUpperCase();
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const trades = await TeamTrade.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .populate('votes.user', 'name email')
      .exec();
    
    const total = await TeamTrade.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        trades,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get team trades error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team trades'
    });
  }
});

// @route   GET /api/team-trades/team/:teamId/stats
// @desc    Get team trade statistics
// @access  Private
router.get('/team/:teamId/stats', auth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Check if user is team member
    const team = await Team.findById(teamId);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    const stats = await TeamTrade.getTeamStats(teamId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get team trade stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team trade statistics'
    });
  }
});

// @route   GET /api/team-trades/team/:teamId/monthly/:year
// @desc    Get monthly performance for team
// @access  Private
router.get('/team/:teamId/monthly/:year', auth, async (req, res) => {
  try {
    const { teamId, year } = req.params;
    
    // Check if user is team member
    const team = await Team.findById(teamId);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    const monthlyData = await TeamTrade.getTeamMonthlyPerformance(teamId, parseInt(year));
    
    res.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('Get team monthly performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team monthly performance'
    });
  }
});

// @route   GET /api/team-trades/:id
// @desc    Get single team trade
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const trade = await TeamTrade.findById(req.params.id)
      .populate('team', 'name')
      .populate('createdBy', 'name email')
      .populate('votes.user', 'name email');
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Team trade not found'
      });
    }
    
    // Check if user is team member
    const team = await Team.findById(trade.team._id);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    res.json({
      success: true,
      data: { trade }
    });
  } catch (error) {
    console.error('Get team trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team trade'
    });
  }
});

// @route   POST /api/team-trades
// @desc    Create new team trade
// @access  Private
router.post('/', auth, validateTeamTrade, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user is team member
    const team = await Team.findById(req.body.team);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }

    const tradeData = {
      ...req.body,
      stockName: req.body.stockName.toUpperCase(),
      createdBy: req.user._id
    };
    
    const trade = new TeamTrade(tradeData);
    await trade.save();
    
    await trade.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Team trade created successfully',
      data: { trade }
    });
  } catch (error) {
    console.error('Create team trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team trade'
    });
  }
});

// @route   PUT /api/team-trades/:id
// @desc    Update team trade
// @access  Private
router.put('/:id', auth, validateTeamTrade, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const trade = await TeamTrade.findById(req.params.id);
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Team trade not found'
      });
    }
    
    // Check if user is team member and either created the trade or is admin
    const team = await Team.findById(trade.team);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    if (trade.createdBy.toString() !== req.user._id.toString() && !team.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit your own trades or be a team admin.'
      });
    }

    const updateData = {
      ...req.body,
      stockName: req.body.stockName.toUpperCase()
    };
    
    Object.assign(trade, updateData);
    await trade.save();
    
    await trade.populate('createdBy', 'name email');
    
    res.json({
      success: true,
      message: 'Team trade updated successfully',
      data: { trade }
    });
  } catch (error) {
    console.error('Update team trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team trade'
    });
  }
});

// @route   POST /api/team-trades/:id/vote
// @desc    Vote on team trade
// @access  Private
router.post('/:id/vote', auth, [
  body('vote')
    .isIn(['buy', 'sell', 'hold'])
    .withMessage('Vote must be buy, sell, or hold'),
  body('comment')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Comment cannot exceed 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { vote, comment } = req.body;
    
    const trade = await TeamTrade.findById(req.params.id);
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Team trade not found'
      });
    }
    
    // Check if user is team member
    const team = await Team.findById(trade.team);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    await trade.addVote(req.user._id, vote, comment);
    await trade.populate('votes.user', 'name email');
    
    res.json({
      success: true,
      message: 'Vote added successfully',
      data: { trade }
    });
  } catch (error) {
    console.error('Vote on team trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error voting on team trade'
    });
  }
});

// @route   DELETE /api/team-trades/:id
// @desc    Delete team trade
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const trade = await TeamTrade.findById(req.params.id);
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Team trade not found'
      });
    }
    
    // Check if user is team member and either created the trade or is admin
    const team = await Team.findById(trade.team);
    if (!team || !team.isActive || !team.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }
    
    if (trade.createdBy.toString() !== req.user._id.toString() && !team.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own trades or be a team admin.'
      });
    }
    
    await TeamTrade.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Team trade deleted successfully'
    });
  } catch (error) {
    console.error('Delete team trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team trade'
    });
  }
});

module.exports = router;