const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const errorHandler = require('./middlewares/errorHandler');
const ApiError = require('./utils/apiError');

// Route imports
const authRoutes = require('./routes/authRoutes');
const clubRoutes = require('./routes/clubRoutes');
const eventRoutes = require('./routes/eventRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const registrationRoutes = require('./routes/registrationRoutes');

const app = express();

// Security HTTP headers with CSP configured for Google Fonts and inline scripts/styles
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"]
      }
    }
  })
);

// CORS configuration (never wildcard with credentials)
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Recursive request sanitization against NoSQL query injection ($ and . keys)
app.use(mongoSanitize());

// Logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve static frontend assets from public/
app.use(express.static(path.join(__dirname, '../public')));

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next) => {
    next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many requests, please try again later'));
  }
});

// Tighter rate limiter on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next) => {
    next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many authentication attempts, please try again later'));
  }
});

app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authLimiter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// Mount versioned API routes (/api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clubs', clubRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/opportunities', opportunityRoutes);
app.use('/api/v1/registrations', registrationRoutes);

// Support additive route alias for admin volunteer export: /api/v1/admin/opportunities/:id/volunteers/export
app.get(
  '/api/v1/admin/opportunities/:id/volunteers/export',
  require('./middlewares/auth').protect,
  require('./middlewares/auth').authorize('ADMIN'),
  require('./middlewares/validateObjectId')('id'),
  require('./controllers/opportunityController').exportVolunteersExcel
);

// Serve SPA index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Unhandled API route handler (404)
app.use((req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
});

// Centralized error handling envelope
app.use(errorHandler);

module.exports = app;
