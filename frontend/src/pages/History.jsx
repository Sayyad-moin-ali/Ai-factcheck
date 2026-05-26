import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History as HistoryIcon, 
  Trash2, 
  Eye, 
  Calendar, 
  HardDrive, 
  Loader, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const History = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents`);
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve history. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (docId, fileName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${fileName}" and all its verified claims?`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/documents/${docId}`);
      // Remove from state list
      setDocuments(prev => prev.filter(doc => doc._id !== docId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete document: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] lg:min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-10 h-10 text-brand-indigo animate-spin" />
          <p className="text-dark-300 text-sm font-medium">Loading history logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] lg:min-h-screen bg-dark-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-dark-800 pb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-8 h-8 text-brand-indigo" />
            Verification History
          </h1>
          <p className="text-dark-300">
            Review and manage all your previously processed documents.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-brand-rose/10 border border-brand-rose/20 text-brand-rose text-sm font-semibold">
            {error}
          </div>
        )}

        {/* History List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {documents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-12 text-center text-dark-300 text-sm border border-dashed border-dark-800"
              >
                <HistoryIcon className="w-12 h-12 text-dark-300 mx-auto mb-4 opacity-50" />
                <p className="font-semibold text-white mb-1">No uploads found</p>
                <p className="text-xs mb-6">You haven't uploaded any PDF documents yet.</p>
                <Link to="/upload" className="btn-primary inline-flex">Upload PDF</Link>
              </motion.div>
            ) : (
              documents.map((doc) => {
                const isCompleted = doc.status === 'completed';
                const isFailed = doc.status === 'failed';
                const isProcessing = doc.status === 'processing';

                return (
                  <motion.div
                    key={doc._id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="glass-card p-6 border border-dark-800/80 hover:border-dark-750 flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card-hover"
                  >
                    {/* Left: Info */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-white truncate max-w-md">
                          {doc.fileName}
                        </h3>
                        
                        {/* Status tag */}
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20 uppercase tracking-wider">
                            Verified
                          </span>
                        )}
                        {isProcessing && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/35 uppercase tracking-wider animate-pulse-slow">
                            Verifying...
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-rose/10 text-brand-rose border border-brand-rose/25 uppercase tracking-wider">
                            Failed
                          </span>
                        )}
                      </div>

                      {/* Metadata info */}
                      <div className="flex items-center gap-4 text-xs text-dark-300">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-indigo" />
                          {new Date(doc.uploadedAt).toLocaleDateString()} at {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-brand-cyan" />
                          {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/results/${doc._id}`}
                        className="btn-secondary px-4 py-2 flex items-center gap-2 text-xs"
                      >
                        <Eye className="w-4 h-4" />
                        View Report
                      </Link>
                      
                      <button
                        onClick={() => handleDelete(doc._id, doc.fileName)}
                        className="p-2 bg-dark-850 hover:bg-brand-rose/10 hover:text-brand-rose border border-dark-800 hover:border-brand-rose/20 text-dark-300 rounded-xl transition-all"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default History;
