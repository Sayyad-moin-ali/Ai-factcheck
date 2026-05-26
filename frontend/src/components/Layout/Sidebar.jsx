import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileUp, 
  History as HistoryIcon, 
  ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Upload PDF', path: '/upload', icon: FileUp },
    { name: 'History', path: '/history', icon: HistoryIcon },
  ];

  return (
    <aside className="w-64 bg-dark-900/90 border-r border-dark-800 flex flex-col h-screen fixed left-0 top-0 z-20 backdrop-blur-lg">
      {/* Brand Logo Header */}
      <div className="p-6 border-b border-dark-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-cyan flex items-center justify-center shadow-glow-indigo">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">VeriFacts</h1>
          <span className="text-xs text-brand-cyan font-medium tracking-widest uppercase">AI Fact-Check</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/upload' && location.pathname.startsWith('/results'));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                isActive
                  ? 'bg-brand-indigo/10 text-white border border-brand-indigo/30 shadow-glow-indigo'
                  : 'text-dark-300 hover:text-white hover:bg-dark-800/50 border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? 'text-brand-cyan' : 'text-dark-300 group-hover:text-brand-indigo'
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
  );
};

export default Sidebar;
