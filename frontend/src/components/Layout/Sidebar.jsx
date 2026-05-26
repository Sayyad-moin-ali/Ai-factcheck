import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FileUp, 
  History as HistoryIcon, 
  ShieldCheck,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Upload PDF', path: '/upload', icon: FileUp },
    { name: 'History', path: '/history', icon: HistoryIcon },
  ];

  return (
    <>
      {/* Backdrop for mobile screens */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 lg:translate-x-0 lg:z-25 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-indigo flex items-center justify-center">
              <ShieldCheck className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">VeriFacts</h1>
              <span className="text-[9px] text-brand-indigo font-bold tracking-widest uppercase">AI Fact-Check</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-dark-300 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5" onClick={onClose}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/upload' && location.pathname.startsWith('/results'));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                  isActive
                    ? 'bg-brand-indigo/10 text-white border border-brand-indigo/20'
                    : 'text-dark-300 hover:text-white hover:bg-dark-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-brand-indigo' : 'text-dark-300 group-hover:text-brand-indigo'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Branding Accent */}
        <div className="p-4 border-t border-dark-800 bg-dark-950/40 text-center text-[10px] text-dark-300">
          VeriFacts AI Fact Checker
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
