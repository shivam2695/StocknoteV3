const express = require('express');
const JournalEntry = require('../models/JournalEntry');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// COMPREHENSIVE validation middleware with detailed logging
const validateJournalEntry = [
  body('stockName')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Stock name must be between 1 and 20 characters'),
  body('entryPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Entry price must be greater than 0'),
  body('entryDate')
    .isISO8601()
    .withMessage('Entry date must be a valid date')
    .custom((value) => {
      const entryDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (entryDate > today) {
        throw new Error('Entry date cannot be in the future');
      }
      return true;
    }),
  body('currentPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Current price must be greater than 0'),
  body('status')
    .isIn(['open', 'closed'])
    .withMessage('Status must be either open or closed'),
  body('remarks')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  // CRITICAL: Custom validation for closed trades with comprehensive logging
  body('exitPrice')
    .custom((value, { req }) => {
      console.log('🔍 BACKEND VALIDATION - exitPrice custom validator');
      console.log('Request body status:', req.body.status);
      console.log('Request body status type:', typeof req.body.status);
      console.log('Request body status normalized:', String(req.body.status).toLowerCase());
      console.log('exitPrice value:', value);
      console.log('exitPrice type:', typeof value);
      console.log('exitPrice checks:', {
        isUndefined: value === undefined,
        isNull: value === null,
        isEmpty: value === '',
        isZero: value === 0,
        isNaN: isNaN(value)
      });
      
      const status = String(req.body.status).toLowerCase();
      
      if (status === 'closed') {
        console.log('🔒 Status is CLOSED - validating exitPrice');
        
        if (value === undefined || value === null || value === '' || value === 0) {
          console.log('❌ exitPrice validation failed - value is missing or zero');
          throw new Error('Exit price is required for closed trades');
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          console.log('❌ exitPrice validation failed - invalid number:', numValue);
          throw new Error('Exit price must be greater than 0');
        }
        
        console.log('✅ exitPrice validation passed:', numValue);
      } else {
        console.log('🔓 Status is OPEN - skipping exitPrice validation');
      }
      
      return true;
    }),
  body('exitDate')
    .custom((value, { req }) => {
      console.log('🔍 BACKEND VALIDATION - exitDate custom validator');
      console.log('Request body status:', req.body.status);
      console.log('exitDate value:', value);
      console.log('exitDate type:', typeof value);
      console.log('exitDate checks:', {
        isUndefined: value === undefined,
        isNull: value === null,
        isEmpty: value === '',
        hasValue: value !== undefined && value !== null && value !== ''
      });
      
      const status = String(req.body.status).toLowerCase();
      
      if (status === 'closed') {
        console.log('🔒 Status is CLOSED - validating exitDate');
        
        if (!value || value === '') {
          console.log('❌ exitDate validation failed - value is missing');
          throw new Error('Exit date is required for closed trades');
        }
        
        if (req.body.entryDate) {
          const entryDate = new Date(req.body.entryDate);
          const exitDate = new Date(value);
          if (exitDate < entryDate) {
            console.log('❌ exitDate validation failed - before entry date');
            throw new Error('Exit date must be after entry date');
          }
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          if (exitDate > today) {
            console.log('❌ exitDate validation failed - in the future');
            throw new Error('Exit date cannot be in the future');
          }
        }
        
        console.log('✅ exitDate validation passed:', value);
      } else {
        console.log('🔓 Status is OPEN - skipping exitDate validation');
      }
      
      return true;
    }),
  body('isTeamTrade')
    .optional()
    .isBoolean()
    .withMessage('isTeamTrade must be a boolean')
];

// @route   GET /api/journal-entries
// @desc    Get all journal entries for authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, stockName, month, year, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (stockName) filter.stockName = stockName.toUpperCase();
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year);
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const entries = await JournalEntry.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await JournalEntry.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get journal entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching journal entries'
    });
  }
});

// @route   GET /api/journal-entries/stats
// @desc    Get journal entry statistics for authenticated user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await JournalEntry.getUserStats(req.user._id);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get journal stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching journal statistics'
    });
  }
});

// @route   GET /api/journal-entries/monthly/:year
// @desc    Get monthly performance for authenticated user
// @access  Private
router.get('/monthly/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const monthlyData = await JournalEntry.getMonthlyPerformance(req.user._id, parseInt(year));
    
    res.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('Get monthly performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly performance'
    });
  }
});

// @route   GET /api/journal-entries/:id
// @desc    Get single journal entry
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Journal entry not found'
      });
    }
    
    res.json({
      success: true,
      data: { entry }
    });
  } catch (error) {
    console.error('Get journal entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching journal entry'
    });
  }
});

// @route   POST /api/journal-entries
// @desc    Create new journal entry
// @access  Private
router.post('/', auth, validateJournalEntry, async (req, res) => {
  try {
    console.log('🚀 BACKEND CREATE JOURNAL ENTRY - COMPREHENSIVE DEBUG');
    console.log('📥 Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Request headers:', req.headers);
    console.log('👤 User ID:', req.user._id);
    
    // Check validation errors first
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Express-validator errors found:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }

    console.log('✅ Express-validator passed, processing data...');

    // CRITICAL: Additional manual validation for closed trades with comprehensive logging
    if (req.body.status === 'closed') {
      console.log('🔒 Manual validation for CLOSED trade...');
      
      // Check exitPrice with detailed logging
      console.log('exitPrice validation:', {
        value: req.body.exitPrice,
        type: typeof req.body.exitPrice,
        isUndefined: req.body.exitPrice === undefined,
        isNull: req.body.exitPrice === null,
        isEmpty: req.body.exitPrice === '',
        isZero: req.body.exitPrice === 0
      });
      
      if (req.body.exitPrice === undefined || req.body.exitPrice === null || req.body.exitPrice === '' || req.body.exitPrice === 0) {
        console.log('❌ Manual validation failed: exitPrice missing for closed trade');
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'exitPrice', message: 'Exit price is required for closed trades', value: req.body.exitPrice }]
        });
      }
      
      const exitPriceNum = parseFloat(req.body.exitPrice);
      if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
        console.log('❌ Manual validation failed: exitPrice invalid:', req.body.exitPrice, 'parsed:', exitPriceNum);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'exitPrice', message: 'Exit price must be greater than 0', value: req.body.exitPrice }]
        });
      }
      
      // Check exitDate
      console.log('exitDate validation:', {
        value: req.body.exitDate,
        type: typeof req.body.exitDate,
        isEmpty: !req.body.exitDate || req.body.exitDate === ''
      });
      
      if (!req.body.exitDate || req.body.exitDate === '') {
        console.log('❌ Manual validation failed: exitDate missing for closed trade');
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'exitDate', message: 'Exit date is required for closed trades', value: req.body.exitDate }]
        });
      }
      
      console.log('✅ Manual validation passed for closed trade');
    }

    // CRITICAL: Create entry data with proper normalization
    const entryData = {
      user: req.user._id,
      stockName: String(req.body.stockName).toUpperCase().trim(),
      entryPrice: parseFloat(req.body.entryPrice),
      entryDate: req.body.entryDate,
      currentPrice: parseFloat(req.body.currentPrice),
      status: String(req.body.status).toLowerCase(), // Normalize to lowercase
      quantity: parseInt(req.body.quantity) || 1,
      isTeamTrade: Boolean(req.body.isTeamTrade),
      remarks: req.body.remarks || '',
      // CRITICAL: Only include exit fields if status is closed and values exist
      ...(req.body.status === 'closed' && req.body.exitPrice && req.body.exitDate && {
        exitPrice: parseFloat(req.body.exitPrice),
        exitDate: req.body.exitDate
      })
    };
    
    console.log('📦 Final entry data (before save):', JSON.stringify(entryData, null, 2));
    console.log('🔍 Entry data validation check:');
    console.log('- stockName:', entryData.stockName, typeof entryData.stockName);
    console.log('- entryPrice:', entryData.entryPrice, typeof entryData.entryPrice);
    console.log('- status:', entryData.status, typeof entryData.status);
    if (entryData.exitPrice !== undefined) {
      console.log('- exitPrice:', entryData.exitPrice, typeof entryData.exitPrice);
      console.log('- exitDate:', entryData.exitDate, typeof entryData.exitDate);
    }
    
    const entry = new JournalEntry(entryData);
    await entry.save();
    
    console.log('✅ Entry saved successfully:', entry._id);
    console.log('📊 Auto-generated month/year:', entry.month, entry.year);
    console.log('💰 Calculated P&L:', entry.pnl, entry.pnlPercentage);
    
    res.status(201).json({
      success: true,
      message: 'Journal entry created successfully',
      data: { entry }
    });
  } catch (error) {
    console.error('💥 Create journal entry error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
      console.log('❌ Mongoose validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Database validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating journal entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/journal-entries/:id
// @desc    Update journal entry
// @access  Private
router.put('/:id', auth, validateJournalEntry, async (req, res) => {
  try {
    console.log('🔄 BACKEND UPDATE JOURNAL ENTRY - COMPREHENSIVE DEBUG');
    console.log('🆔 Entry ID:', req.params.id);
    console.log('📥 Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User ID:', req.user._id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Express-validator errors found:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }

    // CRITICAL: Additional manual validation for closed trades
    if (req.body.status === 'closed') {
      console.log('🔒 Manual validation for CLOSED trade update...');
      
      if (req.body.exitPrice === undefined || req.body.exitPrice === null || req.body.exitPrice === '' || req.body.exitPrice === 0) {
        console.log('❌ Manual validation failed: exitPrice missing for closed trade');
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'exitPrice', message: 'Exit price is required for closed trades', value: req.body.exitPrice }]
        });
      }
      
      const exitPriceNum = parseFloat(req.body.exitPrice);
      if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
        console.log('❌ Manual validation failed: exitPrice invalid:', req.body.exitPrice, 'parsed:', exitPriceNum);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'exitPrice', message: 'Exit price must be greater than 0', value: req.body.exitPrice }]
        });
      }
      
      if (!req.body.exitDate || req.body.exitDate === '') {
        console.log('❌ Manual validation failed: exitDate missing for closed trade');
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'exitDate', message: 'Exit date is required for closed trades', value: req.body.exitDate }]
        });
      }
      
      console.log('✅ Manual validation passed for closed trade update');
    }

    // CRITICAL: Create update data with proper normalization
    const updateData = {
      stockName: String(req.body.stockName).toUpperCase().trim(),
      entryPrice: parseFloat(req.body.entryPrice),
      entryDate: req.body.entryDate,
      currentPrice: parseFloat(req.body.currentPrice),
      status: String(req.body.status).toLowerCase(), // Normalize to lowercase
      quantity: parseInt(req.body.quantity) || 1,
      isTeamTrade: Boolean(req.body.isTeamTrade),
      remarks: req.body.remarks || '',
      // CRITICAL: Only include exit fields if status is closed and values exist
      ...(req.body.status === 'closed' && req.body.exitPrice && req.body.exitDate && {
        exitPrice: parseFloat(req.body.exitPrice),
        exitDate: req.body.exitDate
      })
    };
    
    console.log('📦 Update data:', JSON.stringify(updateData, null, 2));
    
    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Journal entry not found'
      });
    }
    
    console.log('✅ Entry updated successfully:', entry._id);
    
    res.json({
      success: true,
      message: 'Journal entry updated successfully',
      data: { entry }
    });
  } catch (error) {
    console.error('💥 Update journal entry error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
      return res.status(400).json({
        success: false,
        message: 'Database validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating journal entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/journal-entries/:id
// @desc    Delete journal entry
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await JournalEntry.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Journal entry not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete journal entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting journal entry'
    });
  }
});

module.exports = router;