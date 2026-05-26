require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const { uploadDocument } = require('./controllers/documentController');
const { getResults, verifyClaimManual } = require('./controllers/claimController');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ai-factcheckk.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {

    if (!origin) return callback(null, true);

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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/factchecker';
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => {
    console.error('MongoDB Connection Error:', err.message);
    console.log('Ensure MongoDB service is running locally or specify MONGODB_URI in .env');
  });

app.use('/api/documents', require('./routes/documents'));
app.use('/api/claims', require('./routes/claims'));

app.post('/api/upload', upload.single('pdf'), uploadDocument);
app.post('/api/verify', verifyClaimManual);
app.get('/api/results/:documentId', getResults);

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
