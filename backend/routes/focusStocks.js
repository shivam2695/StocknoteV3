const express = require('express');
const FocusStock = require('../models/FocusStock');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateFocusStock = [
  body('stockName')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Stock name must be between 1 and 20 characters'),
  body('entryPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Entry price must be greater than 0'),
  body('targetPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Target price must be greater than 0'),
  body('stopLossPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Stop loss price must be greater than 0'),
  body('currentPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Current price must be greater than 0'),
  body('reason')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Reason must be between 1 and 200 characters'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('tradeTaken')
    .optional()
    .isBoolean()
    .withMessage('Trade taken must be a boolean'),
  body('tradeDate')
    .optional()
    .isISO8601()
    .withMessage('Trade date must be a valid date')
    .custom((value, { req }) => {
      if (req.body.tradeTaken && !value) {
        throw new Error('Trade date is required when trade is taken');
      }
      if (value) {
        const tradeDate = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (tradeDate > today) {
          throw new Error('Trade date cannot be in the future');
        }
      }
      return true;
    })
];

// @route   GET /api/focus-stocks
// @desc    Get all focus stocks for authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, stockName, tradeTaken, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (stockName) filter.stockName = stockName.toUpperCase();
    if (tradeTaken !== undefined) filter.tradeTaken = tradeTaken === 'true';
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const stocks = await FocusStock.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await FocusStock.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        stocks,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get focus stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching focus stocks'
    });
  }
});

// @route   GET /api/focus-stocks/stats
// @desc    Get focus stock statistics for authenticated user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await FocusStock.getUserFocusStats(req.user._id);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get focus stock stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching focus stock statistics'
    });
  }
});

// @route   GET /api/focus-stocks/pending
// @desc    Get pending focus stocks (not taken as trades)
// @access  Private
router.get('/pending', auth, async (req, res) => {
  try {
    const stocks = await FocusStock.find({
      user: req.user._id,
      tradeTaken: false
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { stocks }
    });
  } catch (error) {
    console.error('Get pending focus stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending focus stocks'
    });
  }
});

// @route   GET /api/focus-stocks/:id
// @desc    Get single focus stock
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const stock = await FocusStock.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Focus stock not found'
      });
    }
    
    res.json({
      success: true,
      data: { stock }
    });
  } catch (error) {
    console.error('Get focus stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching focus stock'
    });
  }
});

// @route   POST /api/focus-stocks
// @desc    Create new focus stock
// @access  Private
router.post('/', auth, validateFocusStock, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    // Create stock data without month/year - they will be auto-generated
    const stockData = {
      user: req.user._id,
      stockName: req.body.stockName.toUpperCase().trim(),
      entryPrice: req.body.entryPrice,
      targetPrice: req.body.targetPrice,
      stopLossPrice: req.body.stopLossPrice,
      currentPrice: req.body.currentPrice,
      reason: req.body.reason.trim(),
      notes: req.body.notes ? req.body.notes.trim() : '',
      tradeTaken: req.body.tradeTaken || false,
      tradeDate: req.body.tradeDate || undefined
    };
    
    console.log('Creating focus stock with data:', stockData);
    
    const stock = new FocusStock(stockData);
    await stock.save();
    
    console.log('Focus stock saved with auto-generated month/year:', stock.month, stock.year);
    
    res.status(201).json({
      success: true,
      message: 'Focus stock created successfully',
      data: { stock }
    });
  } catch (error) {
    console.error('Create focus stock error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating focus stock'
    });
  }
});

// @route   PUT /api/focus-stocks/:id
// @desc    Update focus stock
// @access  Private
router.put('/:id', auth, validateFocusStock, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    // Create update data without month/year - they will be auto-generated
    const updateData = {
      stockName: req.body.stockName.toUpperCase().trim(),
      entryPrice: req.body.entryPrice,
      targetPrice: req.body.targetPrice,
      stopLossPrice: req.body.stopLossPrice,
      currentPrice: req.body.currentPrice,
      reason: req.body.reason.trim(),
      notes: req.body.notes ? req.body.notes.trim() : '',
      tradeTaken: req.body.tradeTaken || false,
      tradeDate: req.body.tradeDate || undefined
    };
    
    const stock = await FocusStock.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Focus stock not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Focus stock updated successfully',
      data: { stock }
    });
  } catch (error) {
    console.error('Update focus stock error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating focus stock'
    });
  }
});

// @route   PATCH /api/focus-stocks/:id/mark-taken
// @desc    Mark focus stock as trade taken
// @access  Private
router.patch('/:id/mark-taken', auth, async (req, res) => {
  try {
    const { tradeTaken, tradeDate } = req.body;
    
    // Validate trade date if trade is taken
    if (tradeTaken && !tradeDate) {
      return res.status(400).json({
        success: false,
        message: 'Trade date is required when marking trade as taken'
      });
    }
    
    const stock = await FocusStock.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { 
        tradeTaken: tradeTaken !== undefined ? tradeTaken : true,
        tradeDate: tradeTaken ? (tradeDate || new Date()) : undefined
      },
      { new: true, runValidators: true }
    );
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Focus stock not found'
      });
    }
    
    res.json({
      success: true,
      message: `Focus stock marked as ${tradeTaken ? 'taken' : 'pending'}`,
      data: { stock }
    });
  } catch (error) {
    console.error('Mark focus stock taken error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating focus stock status'
    });
  }
});

// @route   DELETE /api/focus-stocks/:id
// @desc    Delete focus stock
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const stock = await FocusStock.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Focus stock not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Focus stock deleted successfully'
    });
  } catch (error) {
    console.error('Delete focus stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting focus stock'
    });
  }
});

module.exports = router;