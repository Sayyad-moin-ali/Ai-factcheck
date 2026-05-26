const express = require('express');
const router = express.Router();
const { getResults, verifyClaimManual, downloadReport, getAnalytics } = require('../controllers/claimController');

router.get('/analytics', getAnalytics);
router.get('/results/:documentId', getResults);
router.post('/verify', verifyClaimManual);
router.get('/report/:documentId', downloadReport);

module.exports = router;
