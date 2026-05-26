import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ShieldQuestion, 
  Download, 
  RotateCw, 
  ExternalLink,
  ChevronRight,
  FileText,
  AlertTriangle,
  Loader
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const Results = () => {
  const { documentId } = useParams();
  const [documentInfo, setDocumentInfo] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [verifyingClaimId, setVerifyingClaimId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  const pollingRef = useRef(null);

  const fetchResults = async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      
      const res = await axios.get(`${API_URL}/results/${documentId}`);
      
      setDocumentInfo(res.data.document);
      setClaims(res.data.claims);
      setError('');
      
      // Stop polling if the document status is no longer 'processing'
      if (res.data.document.status !== 'processing') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch fact-checking results. Please try again.');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  // Poll results if status is processing
  useEffect(() => {
    fetchResults(true);

    pollingRef.current = setInterval(() => {
      fetchResults(false);
    }, 2500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [documentId]);

  const handleReVerify = async (claimId) => {
    try {
      setVerifyingClaimId(claimId);
      const geminiKey = localStorage.getItem('custom_gemini_key') || '';
      const tavilyKey = localStorage.getItem('custom_tavily_key') || '';

      await axios.post(`${API_URL}/verify`, { claimId }, {
        headers: { 
          'X-Gemini-Key': geminiKey,
          'X-Tavily-Key': tavilyKey,
        }
      });
      
      // Refresh claims list
      await fetchResults(false);
    } catch (err) {
      console.error(err);
      alert('Failed to re-verify claim: ' + (err.response?.data?.message || err.message));
    } finally {
      setVerifyingClaimId(null);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      
      const response = await axios.get(`${API_URL}/claims/report/${documentId}`, {
        responseType: 'blob'
      });
      
      const fileBlob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(fileBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.setAttribute('download', `FactCheck_Report_${documentInfo.fileName.replace(/\.pdf$/i, '')}.pdf`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.parentNode.removeChild(downloadLink);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download report PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] lg:min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-10 h-10 text-brand-indigo animate-spin" />
          <p className="text-dark-300 text-sm font-medium">Loading report dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !documentInfo) {
    return (
      <div className="min-h-[calc(100vh-73px)] lg:min-h-screen bg-dark-950 p-4 md:p-8 flex items-center justify-center">
        <div className="glass-card p-6 md:p-8 border-brand-rose/20 max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-brand-rose mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-sm text-dark-300 mb-6">{error || 'Document information not found.'}</p>
          <Link to="/upload" className="btn-primary inline-flex">Go to Upload</Link>
        </div>
      </div>
    );
  }

  // Calculate status statistics
  const totalClaimsCount = claims.length;
  const verifiedCount = claims.filter(c => c.status === 'Verified').length;
  const inaccurateCount = claims.filter(c => c.status === 'Inaccurate').length;
  const falseCount = claims.filter(c => c.status === 'False').length;
  const unverifiedCount = claims.filter(c => c.status === 'Unverified').length;
  const progressPercent = totalClaimsCount > 0 
    ? Math.round(((totalClaimsCount - unverifiedCount) / totalClaimsCount) * 100)
    : 0;

  // Filtered claims to render
  const filteredClaims = claims.filter(claim => {
    if (filter === 'all') return true;
    return claim.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="min-h-[calc(100vh-73px)] lg:min-h-screen bg-dark-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800 pb-6">
          <div className="flex items-start gap-3 md:gap-4 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-brand-indigo flex-shrink-0">
              <FileText className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white break-words max-w-full">{documentInfo.fileName}</h1>
                {documentInfo.status === 'processing' && (
                  <span className="flex items-center gap-1 text-[10px] bg-brand-indigo/15 text-brand-indigo px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-brand-indigo/30 animate-pulse-slow">
                    Processing
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-300 mt-1">
                Uploaded: {new Date(documentInfo.uploadedAt).toLocaleString()} • Size: {(documentInfo.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchResults(true)}
              className="btn-secondary p-2.5 flex items-center justify-center"
              title="Refresh Results"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={documentInfo.status === 'processing' || downloading}
              className="btn-primary flex items-center gap-2"
            >
              {downloading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Report
            </button>
          </div>
        </div>

        {/* Polling Progress Banner */}
        {documentInfo.status === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-brand-indigo/10 border border-brand-indigo/20 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Loader className="w-5 h-5 text-brand-cyan animate-spin" />
              <div>
                <p className="text-sm font-semibold text-white">Fact-checking in progress...</p>
                <p className="text-xs text-dark-300">Searching web evidence and comparing factual details using AI.</p>
              </div>
            </div>
            
            <div className="w-full md:w-64 space-y-1.5 text-right">
              <div className="flex justify-between text-xs font-bold text-brand-cyan">
                <span>VERIFICATION STAGE</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-brand-indigo transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-[10px] text-dark-300">
                Verified {totalClaimsCount - unverifiedCount} of {totalClaimsCount} claims
              </p>
            </div>
          </motion.div>
        )}

        {/* Summary & KPI Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-dark-300 mb-3">AI Executive Summary</h3>
              {documentInfo.summary ? (
                <p className="text-sm text-dark-100 leading-relaxed font-sans">{documentInfo.summary}</p>
              ) : (
                <div className="space-y-2.5 animate-pulse">
                  <div className="h-4 bg-dark-800 rounded w-full"></div>
                  <div className="h-4 bg-dark-800 rounded w-5/6"></div>
                  <div className="h-4 bg-dark-800 rounded w-4/5"></div>
                </div>
              )}
            </div>
            {totalClaimsCount > 0 && documentInfo.status === 'completed' && (
              <div className="mt-4 pt-4 border-t border-dark-800/60 flex items-center gap-2 text-xs text-brand-emerald font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Fact-checking completed. Overall accuracy: {Math.round((verifiedCount / totalClaimsCount) * 100)}%
              </div>
            )}
          </div>

          {/* Stats KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card p-4 flex flex-col justify-between border-brand-emerald/10 hover:border-brand-emerald/30">
              <div className="flex items-center justify-between text-brand-emerald">
                <span className="text-xs font-semibold uppercase tracking-wider">Verified</span>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white">{verifiedCount}</span>
                <p className="text-[10px] text-dark-300 mt-0.5">Claims verified accurate</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between border-brand-amber/10 hover:border-brand-amber/30">
              <div className="flex items-center justify-between text-brand-amber">
                <span className="text-xs font-semibold uppercase tracking-wider">Inaccurate</span>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white">{inaccurateCount}</span>
                <p className="text-[10px] text-dark-300 mt-0.5">Minor corrections found</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between border-brand-rose/10 hover:border-brand-rose/30">
              <div className="flex items-center justify-between text-brand-rose">
                <span className="text-xs font-semibold uppercase tracking-wider">False</span>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white">{falseCount}</span>
                <p className="text-[10px] text-dark-300 mt-0.5">Claims contradicted</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between border-dark-700/80 hover:border-brand-indigo/30">
              <div className="flex items-center justify-between text-brand-indigo">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Claims</span>
                <FileText className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white">{totalClaimsCount}</span>
                <p className="text-[10px] text-dark-300 mt-0.5">Identified in document</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Claims List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-800 pb-3">
            <div className="flex gap-2 flex-wrap">
              {['all', 'Verified', 'Inaccurate', 'False'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    filter === t
                      ? 'bg-brand-indigo/15 text-white border-brand-indigo/40'
                      : 'text-dark-300 bg-transparent border-transparent hover:text-white hover:bg-dark-800'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'all' && ` (${totalClaimsCount})`}
                  {t === 'Verified' && ` (${verifiedCount})`}
                  {t === 'Inaccurate' && ` (${inaccurateCount})`}
                  {t === 'False' && ` (${falseCount})`}
                </button>
              ))}
            </div>
            
            <span className="text-xs text-dark-300 font-medium">
              Showing {filteredClaims.length} statements
            </span>
          </div>

          {/* Claims Cards */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredClaims.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-8 text-center text-dark-300 text-sm"
                >
                  No claims found matching the filter "{filter}".
                </motion.div>
              ) : (
                filteredClaims.map((claim, index) => {
                  const isVerified = claim.status === 'Verified';
                  const isInaccurate = claim.status === 'Inaccurate';
                  const isFalse = claim.status === 'False';
                  const isUnverified = claim.status === 'Unverified';

                  const statusColorClass = 'border-dark-800 hover:border-dark-700 bg-dark-900/40 text-dark-100';

                  const statusIcon = 
                    isVerified ? <ShieldCheck className="w-5 h-5 text-brand-emerald" /> :
                    isInaccurate ? <AlertTriangle className="w-5 h-5 text-brand-amber" /> :
                    isFalse ? <ShieldAlert className="w-5 h-5 text-brand-rose" /> :
                    <ShieldQuestion className="w-5 h-5 text-dark-300 animate-pulse-slow" />;

                  return (
                    <motion.div
                      key={claim._id || index}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className={`glass-card p-6 border ${statusColorClass}`}
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2.5">
                          {statusIcon}
                          <span className={`text-xs font-bold uppercase tracking-widest ${
                            isVerified ? 'text-brand-emerald' :
                            isInaccurate ? 'text-brand-amber' :
                            isFalse ? 'text-brand-rose' : 'text-dark-300'
                          }`}>
                            {claim.status}
                          </span>
                          
                          <span className="text-[10px] font-bold bg-dark-800 text-dark-300 px-2 py-0.5 rounded-full border border-dark-700/60 uppercase">
                            {claim.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {!isUnverified && (
                            <div className="text-right">
                              <span className="text-xs text-dark-300 font-semibold block">Confidence</span>
                              <span className={`text-sm font-bold ${
                                claim.confidenceScore >= 80 ? 'text-brand-emerald' :
                                claim.confidenceScore >= 50 ? 'text-brand-amber' : 'text-brand-rose'
                              }`}>{claim.confidenceScore}%</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleReVerify(claim._id)}
                            disabled={verifyingClaimId === claim._id}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white border border-dark-700/60 transition-all"
                            title="Re-run fact check"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${verifyingClaimId === claim._id ? 'animate-spin text-brand-indigo' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Claim statement */}
                      <div className="mb-4">
                        <span className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-1">CLAIM STATEMENT</span>
                        <p className="text-sm text-white font-medium italic">"{claim.claimText}"</p>
                      </div>

                      {/* Display correction if false or inaccurate */}
                      {(isFalse || isInaccurate) && (
                        <div className="mb-4 p-3 rounded-lg bg-dark-950 border border-dark-800 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-brand-rose flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-brand-rose uppercase tracking-wider block mb-0.5">CORRECTED FACT</span>
                            <p className="text-sm text-white font-semibold">{claim.correctedFact || 'No correction statement available.'}</p>
                          </div>
                        </div>
                      )}

                      {/* Explanation and analysis */}
                      {!isUnverified && (
                        <div className="mb-4">
                          <span className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-1">AI ANALYSIS & VERIFICATION VERDICT</span>
                          <p className="text-xs text-dark-300 leading-relaxed font-sans">{claim.explanation}</p>
                        </div>
                      )}

                      {/* Sources links */}
                      {!isUnverified && claim.sources && claim.sources.length > 0 && (
                        <div className="pt-3 border-t border-dark-800/60">
                          <span className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-2">VERIFIED EVIDENCE SOURCES</span>
                          <div className="flex flex-wrap gap-2.5">
                            {claim.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-[10px] font-medium text-brand-cyan hover:text-white border border-dark-700/60 hover:border-brand-cyan/20 transition-all truncate max-w-xs"
                                title={src.title}
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{src.title || 'Supporting Web Link'}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Loading status (if claim is still unverified and document is processing) */}
                      {isUnverified && (
                        <div className="flex items-center gap-2 text-xs text-brand-indigo font-medium py-1 animate-pulse">
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          Analyzing and conducting search queries...
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Results;
