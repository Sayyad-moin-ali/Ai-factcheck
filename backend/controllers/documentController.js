const Document = require('../models/Document');
const Claim = require('../models/Claim');
const aiService = require('../services/aiService');
const searchService = require('../services/searchService');

/**
 * Run fact-checking verification in the background
 */
const runBackgroundVerification = async (documentId, pdfBuffer, fileName, keys) => {
  try {
    console.log(`Starting background verification for document: ${documentId}`);
    
    // 1. Extract claims and text using Gemini's native multimodal capabilities
    const extraction = await aiService.extractClaimsAndTextFromPDF(pdfBuffer, keys.geminiKey, fileName);
    let extractedClaims = extraction.claims || [];
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

    // 3. Process verification for ALL claims concurrently and use BATCH AI verification
    console.log(`Starting bulk web search for ${claimDocuments.length} claims...`);
    
    const claimsWithSources = await Promise.all(
      claimDocuments.map(async (claimDoc) => {
        try {
          const searchResults = await searchService.searchWeb(claimDoc.claimText, keys.tavilyKey);
          claimDoc.sources = searchResults; // Attach search results to DB doc immediately
          return { claimText: claimDoc.claimText, searchResults };
        } catch (searchError) {
          console.error(`Web search failed for claim "${claimDoc.claimText}":`, searchError);
          claimDoc.sources = [];
          return { claimText: claimDoc.claimText, searchResults: [] };
        }
      })
    );

    console.log(`Performing single BATCH AI verification for all claims...`);
    let verificationResults = [];
    try {
      if (claimsWithSources.length > 0) {
        verificationResults = await aiService.verifyAllClaimsBatch(claimsWithSources, keys.geminiKey);
      }
    } catch (batchError) {
      console.error(`Batch verification failed:`, batchError);
      // If batch fails entirely, fallback to unverified error states
      for (const claimDoc of claimDocuments) {
        claimDoc.status = 'Unverified';
        claimDoc.explanation = `Verification failed due to system error: ${batchError.message}`;
        await claimDoc.save();
      }
    }

    // If batch verification succeeded, parse and save to DB
    if (verificationResults && verificationResults.length > 0) {
      for (let i = 0; i < claimDocuments.length; i++) {
        const claimDoc = claimDocuments[i];
        const verification = verificationResults[i];
        
        if (verification) {
          claimDoc.status = verification.status || 'Verified';
          claimDoc.correctedFact = verification.correctedFact || '';
          claimDoc.explanation = verification.explanation || '';
          claimDoc.confidenceScore = verification.confidenceScore || 0;
          claimDoc.verifiedAt = new Date();
        } else {
          claimDoc.status = 'Unverified';
          claimDoc.explanation = `Verification skipped: Model did not return data for this specific claim.`;
        }
        
        await claimDoc.save();
      }
      console.log(`Successfully updated ${claimDocuments.length} claims in DB from BATCH verification.`);
    }

    // 4. Update document status to completed
    await Document.findByIdAndUpdate(documentId, {
      status: 'completed',
      summary: 'Summary generation skipped to preserve API rate limits.'
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
    runBackgroundVerification(document._id, req.file.buffer, req.file.originalname, keys);

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
