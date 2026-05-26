const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  claimText: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['statistic', 'date', 'financial', 'technical', 'company', 'general'],
    default: 'general',
  },
  status: {
    type: String,
    enum: ['Verified', 'Inaccurate', 'False', 'Unverified'],
    default: 'Unverified',
  },
  correctedFact: {
    type: String,
    default: '',
  },
  explanation: {
    type: String,
    default: '',
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  sources: [
    {
      title: { type: String, default: '' },
      url: { type: String, default: '' },
      snippet: { type: String, default: '' },
    },
  ],
  verifiedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Claim', ClaimSchema);
