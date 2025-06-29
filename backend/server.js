const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { testEmailConfig } = require('./utils/email');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const journalEntryRoutes = require('./routes/journalEntries');
const focusStockRoutes = require('./routes/focusStocks');
const bookRoutes = require('./routes/books');
const teamRoutes = require('./routes/teams');
const teamTradeRoutes = require('./routes/teamTrades');
const userRoutes = require('./routes/users');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration - Updated to include mystocknote.in domain
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://mystocknote.in',
        'https://www.mystocknote.in',
        'https://mystocknote.netlify.app', 
        'https://your-custom-domain.com',
        process.env.FRONTEND_URL
      ].filter(Boolean)
    : [
        'http://localhost:3000', 
        'http://localhost:5173',
        'https://mystocknote.in',
        'https://www.mystocknote.in',
        'https://mystocknote.netlify.app',
        process.env.FRONTEND_URL || 'http://localhost:5173'
      ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
};

// Log CORS configuration for debugging
console.log('🌐 CORS Configuration:');
console.log('- Environment:', process.env.NODE_ENV || 'development');
console.log('- Allowed Origins:', corsOptions.origin);
console.log('- Allowed Methods:', corsOptions.methods);
console.log('- Credentials Enabled:', corsOptions.credentials);

app.use(cors(corsOptions));

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mystocknote', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Test email configuration on startup
testEmailConfig().then(isValid => {
  if (isValid) {
    console.log('✅ Email service is ready');
  } else {
    console.log('⚠️  Email service configuration needs attention');
    console.log('Required environment variables:');
    console.log('- EMAIL_HOST (default: smtp.gmail.com)');
    console.log('- EMAIL_PORT (default: 587)');
    console.log('- EMAIL_USER (your Gmail address)');
    console.log('- EMAIL_PASS (your Gmail app password)');
  }
});

// Health check endpoint with enhanced CORS debugging
app.get('/health', (req, res) => {
  const origin = req.get('Origin');
  console.log('🏥 Health check request from origin:', origin);
  
  res.status(200).json({
    status: 'OK',
    message: 'MyStockNote Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    cors: {
      requestOrigin: origin,
      allowedOrigins: corsOptions.origin,
      corsEnabled: true
    },
    email: {
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/journal-entries', journalEntryRoutes);
app.use('/api/focus-stocks', focusStockRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/team-trades', teamTradeRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use('*', (req, res) => {
  const origin = req.get('Origin');
  console.log('🔍 404 request from origin:', origin, 'for path:', req.originalUrl);
  
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    origin: origin
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const origin = req.get('Origin');
  console.error('💥 Error from origin:', origin, 'Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 MyStockNote Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🌐 CORS enabled for origins:`, corsOptions.origin);
});

module.exports = app;