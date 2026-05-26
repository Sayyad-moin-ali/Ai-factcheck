import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Upload from './pages/Upload';
import Results from './pages/Results';
import History from './pages/History';
import { Menu, ShieldCheck } from 'lucide-react';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col lg:flex-row">
      {}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-800 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-indigo flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-white text-base block leading-none">Ai-factcheck</span>
            <span className="text-[9px] text-brand-indigo font-bold tracking-wider uppercase">AI Fact-Check</span>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-dark-300 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {}
      <main className="flex-1 w-full min-h-[calc(100vh-73px)] lg:min-h-screen lg:pl-64">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {}
        <Route element={<Layout />}>
          <Route path="/upload" element={<Upload />} />
          <Route path="/results/:documentId" element={<Results />} />
          <Route path="/history" element={<History />} />
        </Route>
        
        {}
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
