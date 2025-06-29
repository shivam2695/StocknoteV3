const express = require('express');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateBook = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('summary')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Summary must be between 1 and 2000 characters'),
  body('coverImage')
    .notEmpty()
    .withMessage('Cover image is required'),
  body('author')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Author name cannot exceed 100 characters'),
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre cannot exceed 50 characters'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5')
];

// @route   GET /api/books
// @desc    Get all books with optional filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      genre, 
      minRating = 0, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = { isActive: true };
    
    // Add filters
    if (genre) query.genre = genre;
    if (minRating) query.rating = { $gte: parseFloat(minRating) };
    if (search) {
      query.$text = { $search: search };
    }
    
    // Build sort
    const sort = {};
    if (search) {
      sort.score = { $meta: 'textScore' };
    }
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const books = await Book.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('readBy.user', 'name email')
      .exec();
    
    const total = await Book.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        books,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching books'
    });
  }
});

// @route   GET /api/books/popular
// @desc    Get popular books
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const books = await Book.getPopularBooks(parseInt(limit));
    
    res.json({
      success: true,
      data: { books }
    });
  } catch (error) {
    console.error('Get popular books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular books'
    });
  }
});

// @route   GET /api/books/search
// @desc    Search books
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, genre, minRating, limit = 20, skip = 0 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const books = await Book.searchBooks(q, {
      genre,
      minRating: parseFloat(minRating) || 0,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    
    res.json({
      success: true,
      data: { books }
    });
  } catch (error) {
    console.error('Search books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching books'
    });
  }
});

// @route   GET /api/books/:id
// @desc    Get single book
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('readBy.user', 'name email');
    
    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    res.json({
      success: true,
      data: { book }
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book'
    });
  }
});

// @route   POST /api/books
// @desc    Create new book (Admin only)
// @access  Private
router.post('/', auth, validateBook, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const book = new Book(req.body);
    await book.save();
    
    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: { book }
    });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating book'
    });
  }
});

// @route   PUT /api/books/:id
// @desc    Update book (Admin only)
// @access  Private
router.put('/:id', auth, validateBook, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Book updated successfully',
      data: { book }
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating book'
    });
  }
});

// @route   POST /api/books/:id/rate
// @desc    Rate a book
// @access  Private
router.post('/:id/rate', auth, [
  body('rating')
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('review')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters')
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

    const { rating, review } = req.body;
    const book = await Book.findById(req.params.id);
    
    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    // Remove existing rating from this user
    book.readBy = book.readBy.filter(r => r.user.toString() !== req.user._id.toString());
    
    // Add new rating
    book.readBy.push({
      user: req.user._id,
      userRating: rating,
      userReview: review,
      dateRead: new Date()
    });
    
    // Update book's overall rating
    const validRatings = book.readBy.filter(r => r.userRating != null);
    if (validRatings.length > 0) {
      const sum = validRatings.reduce((acc, r) => acc + r.userRating, 0);
      book.rating = sum / validRatings.length;
      book.totalRatings = validRatings.length;
    }
    
    await book.save();
    
    res.json({
      success: true,
      message: 'Book rated successfully',
      data: { book }
    });
  } catch (error) {
    console.error('Rate book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating book'
    });
  }
});

// @route   DELETE /api/books/:id
// @desc    Delete book (Admin only)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting book'
    });
  }
});

module.exports = router;