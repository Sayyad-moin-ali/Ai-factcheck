const PDFDocument = require('pdfkit');
const Claim = require('../models/Claim');
const Document = require('../models/Document');
const searchService = require('../services/searchService');
const aiService = require('../services/aiService');

// @desc    Get results (claims and document info) for a specific document
// @route   GET /api/results/:documentId
// @access  Public
const getResults = async (req, res) => {
  try {
    const { documentId } = req.params;

    // Check if document exists
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Get all claims associated with the document
    const claims = await Claim.find({ documentId }).sort({ verifiedAt: 1 });

    res.json({
      document,
      claims
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Server error fetching results', error: error.message });
  }
};

// @desc    Manually trigger re-verification for a claim
// @route   POST /api/verify
// @access  Private
const verifyClaimManual = async (req, res) => {
  try {
    const { claimId } = req.body;

    if (!claimId) {
      return res.status(400).json({ message: 'Please provide claimId' });
    }

    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    // Validate that document exists
    const document = await Document.findById(claim.documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const keys = {
      geminiKey: req.headers['x-gemini-key'] || null,
      tavilyKey: req.headers['x-tavily-key'] || null
    };

    console.log(`Manually re-verifying claim: "${claim.claimText}"`);

    // Search and verify
    const searchResults = await searchService.searchWeb(claim.claimText, keys.tavilyKey);
    const verification = await aiService.verifyClaim(claim.claimText, searchResults, keys.geminiKey);

    // Save update
    claim.status = verification.status || 'Verified';
    claim.correctedFact = verification.correctedFact || '';
    claim.explanation = verification.explanation || '';
    claim.confidenceScore = verification.confidenceScore || 0;
    claim.sources = searchResults;
    claim.verifiedAt = new Date();

    await claim.save();

    res.json({
      message: 'Claim verified successfully',
      claim
    });
  } catch (error) {
    console.error('Manual verification error:', error);
    res.status(500).json({ message: 'Server error during manual verification', error: error.message });
  }
};

// @desc    Download PDF Report for a document
// @route   GET /api/claims/report/:documentId
// @access  Public
const downloadReport = async (req, res) => {
  try {
    const { documentId } = req.params;

    // Check if document exists
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Get all claims
    const claims = await Claim.find({ documentId }).sort({ status: 1 });

    // Set up PDF doc
    const pdfDoc = new PDFDocument({ margin: 50, size: 'A4' });

    // Stream PDF directly to client response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FactCheck_Report_${document.fileName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    pdfDoc.pipe(res);

    // Color definitions
    const primaryColor = '#1e293b'; // Slate 800
    const secondaryColor = '#475569'; // Slate 600
    const accentColor = '#6366f1'; // Indigo 500
    const greenColor = '#10b981'; // Emerald 500 (Verified)
    const amberColor = '#f59e0b'; // Amber 500 (Inaccurate)
    const redColor = '#ef4444'; // Red 500 (False)
    const grayColor = '#94a3b8'; // Slate 400

    // Header Title
    pdfDoc
      .fillColor(accentColor)
      .fontSize(22)
      .text('VERIFACTS - AI FACT CHECK REPORT', { align: 'center', bold: true })
      .moveDown(0.2);

    // Decorative line
    pdfDoc
      .strokeColor(accentColor)
      .lineWidth(2)
      .moveTo(50, 80)
      .lineTo(545, 80)
      .stroke()
      .moveDown(1.5);

    // Metadata Block
    pdfDoc
      .fillColor(primaryColor)
      .fontSize(12)
      .text(`Document Name: `, { continued: true, bold: true })
      .fillColor(secondaryColor)
      .text(document.fileName)
      .fillColor(primaryColor)
      .text(`Uploaded On: `, { continued: true, bold: true })
      .fillColor(secondaryColor)
      .text(new Date(document.uploadedAt).toLocaleString())
      .fillColor(primaryColor)
      .text(`Total Claims Evaluated: `, { continued: true, bold: true })
      .fillColor(secondaryColor)
      .text(claims.length)
      .moveDown(1);

    // Status Counter calculations
    const verifiedCount = claims.filter(c => c.status === 'Verified').length;
    const inaccurateCount = claims.filter(c => c.status === 'Inaccurate').length;
    const falseCount = claims.filter(c => c.status === 'False').length;
    const unverifiedCount = claims.filter(c => c.status === 'Unverified').length;

    // Status Summary Table
    pdfDoc
      .fillColor(primaryColor)
      .fontSize(14)
      .text('Executive Summary', { bold: true })
      .fontSize(10)
      .fillColor(secondaryColor)
      .text(document.summary || 'Claims verification is complete. Below is a detailed breakdown of all factual claims analyzed.')
      .moveDown(1);

    // Small status counter cards layout
    pdfDoc
      .fontSize(11)
      .fillColor(greenColor).text(`Verified: ${verifiedCount}  |  `, { continued: true, bold: true })
      .fillColor(amberColor).text(`Inaccurate: ${inaccurateCount}  |  `, { continued: true, bold: true })
      .fillColor(redColor).text(`False: ${falseCount}  |  `, { continued: true, bold: true })
      .fillColor(grayColor).text(`Unverified/Pending: ${unverifiedCount}`, { bold: true })
      .moveDown(1.5);

    // Claims section title
    pdfDoc
      .fillColor(primaryColor)
      .fontSize(14)
      .text('Detailed Claims Assessment', { bold: true })
      .moveDown(0.5);

    // Draw claim items
    claims.forEach((claim, idx) => {
      // Keep claim card grouped to avoid page break mid-card if possible
      // Let's add simple visual box structure
      pdfDoc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .rect(50, pdfDoc.y, 495, 1)
        .stroke()
        .moveDown(0.5);

      const statusColor = 
        claim.status === 'Verified' ? greenColor :
        claim.status === 'Inaccurate' ? amberColor :
        claim.status === 'False' ? redColor : grayColor;

      // Index and Status Row
      pdfDoc
        .fontSize(11)
        .fillColor(accentColor)
        .text(`Claim #${idx + 1} `, { continued: true, bold: true })
        .fillColor(statusColor)
        .text(`[${claim.status.toUpperCase()}]  (Confidence: ${claim.confidenceScore}%)`, { bold: true })
        .moveDown(0.3);

      // Claim Text
      pdfDoc
        .fontSize(10.5)
        .fillColor(primaryColor)
        .text('Statement: ', { continued: true, bold: true })
        .fillColor(secondaryColor)
        .text(`"${claim.claimText}"`)
        .moveDown(0.3);

      // Corrected facts if inaccurate or false
      if (claim.status === 'False' || claim.status === 'Inaccurate') {
        pdfDoc
          .fillColor(redColor)
          .text('Correction: ', { continued: true, bold: true })
          .fillColor(primaryColor)
          .text(claim.correctedFact || 'No correction statement supplied.')
          .moveDown(0.3);
      }

      // Explanation
      pdfDoc
        .fillColor(primaryColor)
        .text('AI Analysis & Findings: ', { continued: true, bold: true })
        .fillColor(secondaryColor)
        .text(claim.explanation || 'No detail provided.')
        .moveDown(0.3);

      // Sources
      if (claim.sources && claim.sources.length > 0) {
        pdfDoc
          .fillColor(primaryColor)
          .text('Key Supporting Sources:', { bold: true })
          .fontSize(9.5);

        claim.sources.slice(0, 2).forEach(src => {
          pdfDoc
            .fillColor(accentColor)
            .text(`  • ${src.title || 'Source'} `, { continued: true })
            .fillColor(grayColor)
            .text(`(${src.url || '#'})`);
        });
      }

      pdfDoc.moveDown(1.5);
    });

    // Page numbers footer
    const range = pdfDoc.bufferedPageRange();
    for (let i = range.start; i < (range.start + range.count); i++) {
      pdfDoc.switchToPage(i);
      pdfDoc
        .fontSize(8)
        .fillColor(grayColor)
        .text(`Page ${i + 1} of ${range.count}`, 50, 780, { align: 'center' });
    }

    pdfDoc.end();

  } catch (error) {
    console.error('Error generating PDF Report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error generating PDF report', error: error.message });
    }
  }
};

// @desc    Get aggregated analytics for dashboard
// @route   GET /api/claims/analytics
// @access  Public
const getAnalytics = async (req, res) => {
  try {
    const documents = await Document.find();
    const documentIds = documents.map(d => d._id);

    const claims = await Claim.find({ documentId: { $in: documentIds } });

    const totalDocs = documents.length;
    const totalClaims = claims.length;

    const verified = claims.filter(c => c.status === 'Verified').length;
    const inaccurate = claims.filter(c => c.status === 'Inaccurate').length;
    const falseCount = claims.filter(c => c.status === 'False').length;
    const unverified = claims.filter(c => c.status === 'Unverified').length;

    const verifiedClaims = claims.filter(c => c.status !== 'Unverified');
    const avgConfidence = verifiedClaims.length > 0
      ? Math.round(verifiedClaims.reduce((acc, c) => acc + c.confidenceScore, 0) / verifiedClaims.length)
      : 0;

    const categories = {
      statistic: claims.filter(c => c.category === 'statistic').length,
      date: claims.filter(c => c.category === 'date').length,
      financial: claims.filter(c => c.category === 'financial').length,
      technical: claims.filter(c => c.category === 'technical').length,
      company: claims.filter(c => c.category === 'company').length,
      general: claims.filter(c => c.category === 'general').length,
    };

    res.json({
      totalDocs,
      totalClaims,
      statusDistribution: { verified, inaccurate, falseCount, unverified },
      categoryDistribution: categories,
      avgConfidence,
      documents: documents.map(d => {
        const docClaims = claims.filter(c => String(c.documentId) === String(d._id));
        return {
          id: d._id,
          fileName: d.fileName,
          status: d.status,
          uploadedAt: d.uploadedAt,
          claimsCount: docClaims.length,
          verifiedCount: docClaims.filter(c => c.status === 'Verified').length,
          inaccurateCount: docClaims.filter(c => c.status === 'Inaccurate').length,
          falseCount: docClaims.filter(c => c.status === 'False').length,
        };
      })
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error fetching analytics', error: error.message });
  }
};

module.exports = {
  getResults,
  verifyClaimManual,
  downloadReport,
  getAnalytics
};
