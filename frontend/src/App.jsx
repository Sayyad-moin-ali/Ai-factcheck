import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Upload from './pages/Upload';
import Results from './pages/Results';
import History from './pages/History';

// Layout wrapper that nests the Sidebar alongside dashboard pages
const Layout = () => {
  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <Outlet />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Dashboard Area */}
        <Route element={<Layout />}>
          <Route path="/upload" element={<Upload />} />
          <Route path="/results/:documentId" element={<Results />} />
          <Route path="/history" element={<History />} />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
