const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadDocument, getDocuments, getDocumentById, deleteDocument } = require('../controllers/documentController');

// Multer in-memory configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed!'), false);
    }
  }
});

router.route('/')
  .post(upload.single('pdf'), uploadDocument)
  .get(getDocuments);

router.route('/:id')
  .get(getDocumentById)
  .delete(deleteDocument);

module.exports = router;
