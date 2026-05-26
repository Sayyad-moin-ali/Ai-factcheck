const Document = require('../models/Document');
const Claim = require('../models/Claim');
const aiService = require('../services/aiService');
const searchService = require('../services/searchService');

/**
 * Run fact-checking verification in the background
 */
const runBackgroundVerification = async (documentId, pdfBuffer, keys) => {
  try {
    console.log(`Starting background verification for document: ${documentId}`);
    
    // 1. Extract claims and text using Gemini's native multimodal capabilities
    const extraction = await aiService.extractClaimsAndTextFromPDF(pdfBuffer, keys.geminiKey);
    const extractedClaims = extraction.claims || [];
    const text = extraction.extractedText || '';

    console.log(`Extracted text length: ${text.length}. Extracted ${extractedClaims.length} claims for document ${documentId}`);

    // Update document record in DB with the actual extracted text
    await Document.findByIdAndUpdate(documentId, {
      extractedText: text
    });

    if (extractedClaims.length === 0) {
      // Create a default claim if none extracted to avoid empty dashboard
      extractedClaims.push({
        claimText: "This document contains general descriptive statements.",
        category: "general"
      });
    }

    // 2. Save claims to DB with 'Unverified' status so user sees them immediately
    const claimDocuments = await Promise.all(
      extractedClaims.map(claim => 
        Claim.create({
          documentId,
          claimText: claim.claimText,
          category: claim.category || 'general',
          status: 'Unverified',
          confidenceScore: 0,
        })
      )
    );

    // 3. Process verification for each claim
    for (let i = 0; i < claimDocuments.length; i++) {
      const claimDoc = claimDocuments[i];
      try {
        console.log(`Verifying claim [${i + 1}/${claimDocuments.length}]: "${claimDoc.claimText}"`);
        
        // Search the live web
        const searchResults = await searchService.searchWeb(claimDoc.claimText, keys.tavilyKey);
        
        // AI Verification
        const verification = await aiService.verifyClaim(claimDoc.claimText, searchResults, keys.geminiKey);
        
        // Update claim record in DB
        claimDoc.status = verification.status || 'Verified';
        claimDoc.correctedFact = verification.correctedFact || '';
        claimDoc.explanation = verification.explanation || '';
        claimDoc.confidenceScore = verification.confidenceScore || 0;
        claimDoc.sources = searchResults; // Attach search results as sources
        claimDoc.verifiedAt = new Date();
        
        await claimDoc.save();
        console.log(`Verified claim [${i + 1}/${claimDocuments.length}] successfully: status is ${claimDoc.status}`);
      } catch (claimError) {
        console.error(`Error verifying claim "${claimDoc.claimText}":`, claimError);
        // Fail gracefully for single claim to continue verification of others
        claimDoc.status = 'Unverified';
        claimDoc.explanation = `Verification failed due to system error: ${claimError.message}`;
        await claimDoc.save();
      }
    }

    // 4. Generate summary
    const summary = await aiService.generateSummary(text, keys.geminiKey);

    // 5. Update document status to completed
    await Document.findByIdAndUpdate(documentId, {
      status: 'completed',
      summary: summary
    });
    console.log(`Completed verification pipeline for document: ${documentId}`);

  } catch (error) {
    console.error(`Error in background verification for document ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, {
      status: 'failed'
    });
  }
};

// @desc    Upload PDF and start verification pipeline
// @route   POST /api/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file' });
    }

    console.log(`Received PDF upload request. Filename: ${req.file.originalname}`);

    // Save document details with 'processing' status
    const document = await Document.create({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      extractedText: 'Pending AI extraction...',
      status: 'processing'
    });

    // Capture custom keys from headers if present
    const keys = {
      geminiKey: req.headers['x-gemini-key'] || null,
      tavilyKey: req.headers['x-tavily-key'] || null
    };

    // Run verification process in background
    runBackgroundVerification(document._id, req.file.buffer, keys);

    // Respond immediately to the frontend
    res.status(201).json({
      message: 'PDF uploaded and verification started in background',
      document: {
        id: document._id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        uploadedAt: document.uploadedAt
      }
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ message: 'Server error during upload', error: error.message });
  }
};

// @desc    Get all documents
// @route   GET /api/documents
// @access  Public
const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find()
      .select('-extractedText') // Don't return full text for listing
      .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error fetching documents', error: error.message });
  }
};

// @desc    Get a single document metadata
// @route   GET /api/documents/:id
// @access  Public
const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error fetching document', error: error.message });
  }
};

// @desc    Delete a document and all associated claims
// @route   DELETE /api/documents/:id
// @access  Public
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete claims associated with document
    await Claim.deleteMany({ documentId: req.params.id });

    // Delete document itself
    await Document.deleteOne({ _id: req.params.id });

    res.json({ message: 'Document and verified claims deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error deleting document', error: error.message });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument
};
