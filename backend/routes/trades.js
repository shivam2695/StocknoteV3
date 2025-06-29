const express = require('express');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');
const { validateTrade } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/trades
// @desc    Get all trades for authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, symbol, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (symbol) filter.symbol = symbol.toUpperCase();
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const trades = await Trade.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Trade.countDocuments(filter);
    
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
    console.error('Get trades error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trades'
    });
  }
});

// @route   GET /api/trades/stats
// @desc    Get trading statistics for authenticated user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Trade.getUserStats(req.user._id);
    
    // Get monthly stats
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyStats = await Trade.aggregate([
      {
        $match: {
          user: req.user._id,
          status: 'CLOSED',
          exitDate: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          monthlyReturn: { $sum: '$totalReturn' },
          monthlyTrades: { $sum: 1 }
        }
      }
    ]);
    
    const monthlyData = monthlyStats[0] || { monthlyReturn: 0, monthlyTrades: 0 };
    
    res.json({
      success: true,
      data: {
        ...stats,
        monthlyReturn: monthlyData.monthlyReturn,
        monthlyTrades: monthlyData.monthlyTrades
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// @route   GET /api/trades/monthly/:year/:month
// @desc    Get trades for specific month
// @access  Private
router.get('/monthly/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    
    const trades = await Trade.find({
      user: req.user._id,
      entryDate: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ entryDate: -1 });
    
    res.json({
      success: true,
      data: { trades }
    });
  } catch (error) {
    console.error('Get monthly trades error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly trades'
    });
  }
});

// @route   GET /api/trades/:id
// @desc    Get single trade
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }
    
    res.json({
      success: true,
      data: { trade }
    });
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trade'
    });
  }
});

// @route   POST /api/trades
// @desc    Create new trade
// @access  Private
router.post('/', auth, validateTrade, async (req, res) => {
  try {
    const tradeData = {
      ...req.body,
      user: req.user._id,
      symbol: req.body.symbol.toUpperCase()
    };
    
    const trade = new Trade(tradeData);
    await trade.save();
    
    res.status(201).json({
      success: true,
      message: 'Trade created successfully',
      data: { trade }
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating trade'
    });
  }
});

// @route   PUT /api/trades/:id
// @desc    Update trade
// @access  Private
router.put('/:id', auth, validateTrade, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      symbol: req.body.symbol.toUpperCase()
    };
    
    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Trade updated successfully',
      data: { trade }
    });
  } catch (error) {
    console.error('Update trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating trade'
    });
  }
});

// @route   DELETE /api/trades/:id
// @desc    Delete trade
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Trade deleted successfully'
    });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting trade'
    });
  }
});

module.exports = router;