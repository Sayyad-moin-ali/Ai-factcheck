require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Import controllers for alias routes
const { uploadDocument } = require('./controllers/documentController');
const { getResults, verifyClaimManual } = require('./controllers/claimController');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ai-factcheckk.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list or is a Vercel preview/production domain
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/factchecker';
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => {
    console.error('MongoDB Connection Error:', err.message);
    console.log('Ensure MongoDB service is running locally or specify MONGODB_URI in .env');
  });

// API Routes
app.use('/api/documents', require('./routes/documents'));
app.use('/api/claims', require('./routes/claims'));

// Direct API Route Aliases (conforming exactly to the API specifications)
app.post('/api/upload', upload.single('pdf'), uploadDocument);
app.post('/api/verify', verifyClaimManual);
app.get('/api/results/:documentId', getResults);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Port settings
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints:`);
    console.log(` - Auth: POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me`);
    console.log(` - Upload: POST /api/upload`);
    console.log(` - Documents: GET /api/documents, GET /api/documents/:id, DELETE /api/documents/:id`);
    console.log(` - Verification: POST /api/verify, GET /api/results/:documentId`);
    console.log(` - Reports: GET /api/claims/report/:documentId`);
  });
}

module.exports = app;


