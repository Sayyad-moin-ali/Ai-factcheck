import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, File, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const navigate = useNavigate();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF documents are supported.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB.');
      return false;
    }
    setError('');
    return true;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      setUploading(true);
      setProgress(10);
      setStatusText('Uploading PDF to verification server...');

      // Load keys if configured in user local preferences
      const geminiKey = localStorage.getItem('custom_gemini_key') || '';
      const tavilyKey = localStorage.getItem('custom_tavily_key') || '';

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Gemini-Key': geminiKey,
          'X-Tavily-Key': tavilyKey,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Standard upload takes up first 70% of loading animation
          setProgress(Math.round(percentCompleted * 0.7));
          if (percentCompleted === 100) {
            setStatusText('Parsing text and initializing claim extraction...');
            setProgress(80);
          }
        }
      });

      setProgress(100);
      setStatusText('Verification pipeline launched successfully!');
      
      // Short delay for visual completion
      setTimeout(() => {
        navigate(`/results/${response.data.document.id}`);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Server error occurred during file parsing and claims extraction.'
      );
      setUploading(false);
      setFile(null);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] lg:min-h-screen bg-dark-950 p-4 md:p-8 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header Title */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Analyze Claims</h1>
          <p className="text-sm md:text-base text-dark-300">
            Upload any marketing flyer, technical sheet, or product spec PDF. Our system will extract claims, execute live web searches, and verify accuracy.
          </p>
        </div>

        {/* Outer upload card */}
        <div className="glass-card p-4 md:p-8 border border-dark-800 relative overflow-hidden">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 rounded-xl bg-brand-rose/10 border border-brand-rose/20 text-brand-rose flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Upload Failed</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          {!uploading ? (
            <div className="space-y-6">
              {/* Drag Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 md:p-12 text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
                  dragActive 
                    ? 'border-brand-indigo bg-brand-indigo/5 scale-99' 
                    : 'border-dark-800 hover:border-dark-700 hover:bg-dark-900/40'
                }`}
                onClick={() => document.getElementById('file-upload-input').click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleChange}
                />
                
                <div className="w-14 h-14 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-center mb-4 text-brand-indigo transition-transform duration-200">
                  <FileUp className="w-6 h-6" />
                </div>
                
                <h3 className="text-base font-semibold text-white mb-1">
                  Drag and drop your PDF here
                </h3>
                <p className="text-xs text-dark-300 mb-3">
                  or click to browse from files
                </p>
                <span className="text-[10px] text-dark-300 bg-dark-950/80 px-2.5 py-1 rounded-full border border-dark-800">
                  Maximum file size: 10 MB
                </span>
              </div>

              {/* Show Selected File details */}
              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-brand-indigo flex-shrink-0">
                        <File className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                        <p className="text-xs text-dark-300">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleUpload}
                      className="btn-primary flex items-center gap-2"
                    >
                      Process PDF
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Upload Progress state */
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo animate-bounce mb-6">
                <FileUp className="w-8 h-8" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                Processing Document
              </h3>
              <p className="text-sm text-dark-300 mb-6 text-center max-w-sm">
                {statusText}
              </p>

              {/* Progress bar container */}
              <div className="w-full max-w-md bg-dark-800 h-2.5 rounded-full overflow-hidden border border-dark-700/50">
                <motion.div 
                  className="h-full bg-brand-indigo"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <span className="text-xs text-brand-indigo font-bold mt-2 tracking-wider">
                {progress}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
