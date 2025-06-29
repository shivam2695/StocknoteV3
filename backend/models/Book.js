const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  summary: {
    type: String,
    required: [true, 'Book summary is required'],
    trim: true,
    maxlength: [2000, 'Summary cannot exceed 2000 characters']
  },
  coverImage: {
    type: String, // URL or file path
    required: [true, 'Cover image is required']
  },
  author: {
    type: String,
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  isbn: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allow multiple documents without ISBN
  },
  publishedDate: {
    type: Date
  },
  genre: {
    type: String,
    trim: true,
    maxlength: [50, 'Genre cannot exceed 50 characters']
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  // For tracking which users have read this book
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dateRead: {
      type: Date,
      default: Date.now
    },
    userRating: {
      type: Number,
      min: 0,
      max: 5
    },
    userReview: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
bookSchema.index({ title: 'text', author: 'text', summary: 'text' });
bookSchema.index({ genre: 1 });
bookSchema.index({ rating: -1 });
bookSchema.index({ createdAt: -1 });
bookSchema.index({ tags: 1 });

// Virtual for average rating calculation
bookSchema.virtual('averageRating').get(function() {
  if (this.readBy && this.readBy.length > 0) {
    const validRatings = this.readBy.filter(r => r.userRating != null);
    if (validRatings.length > 0) {
      const sum = validRatings.reduce((acc, r) => acc + r.userRating, 0);
      return (sum / validRatings.length).toFixed(1);
    }
  }
  return this.rating || 0;
});

// Static method to get popular books
bookSchema.statics.getPopularBooks = async function(limit = 10) {
  return await this.find({ isActive: true })
    .sort({ rating: -1, totalRatings: -1 })
    .limit(limit)
    .populate('readBy.user', 'name email');
};

// Static method to search books
bookSchema.statics.searchBooks = async function(query, options = {}) {
  const { genre, minRating = 0, limit = 20, skip = 0 } = options;
  
  const searchCriteria = {
    isActive: true,
    rating: { $gte: minRating },
    $text: { $search: query }
  };
  
  if (genre) {
    searchCriteria.genre = genre;
  }
  
  return await this.find(searchCriteria)
    .sort({ score: { $meta: 'textScore' }, rating: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Book', bookSchema);