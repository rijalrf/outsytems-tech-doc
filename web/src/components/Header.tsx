import React, { useEffect, useState } from 'react';
import { Layers, RefreshCw, FolderKanban, Sparkles } from 'lucide-react';
import { api } from '../services/api';


interface HeaderProps {
  currentView?: string;
  onGoHome: () => void;
  onGoToAgent: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onGoHome, onGoToAgent }) => {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState<boolean>(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      await api.checkHealth();
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline shadow-sm">
      <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          
          {/* Brand Logo & Name */}
          <button 
            onClick={onGoHome} 
            className="flex items-center gap-3 group text-left focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-on-background tracking-tight">OUTSYSTEMS</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-pill bg-primary-soft text-primary">INSPECTOR</span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">OAP & OML Architecture Inspector</p>
            </div>
          </button>

          {/* Center / Right Navigation & Status */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* View Switcher: Projects Explorer vs AI Assistant */}
            <div className="flex items-center bg-gray-100 p-1 rounded-pill border border-outline">
              <button
                onClick={onGoHome}
                className={`px-3 py-1.5 rounded-pill text-xs font-bold flex items-center gap-1.5 transition-all ${
                  currentView !== 'agent-chat'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Projects</span>
              </button>

              <button
                onClick={onGoToAgent}
                className={`px-3 py-1.5 rounded-pill text-xs font-bold flex items-center gap-1.5 transition-all ${
                  currentView === 'agent-chat'
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${currentView === 'agent-chat' ? 'text-yellow-300' : 'text-primary'}`} />
                <span>AI Assistant</span>
              </button>
            </div>

            {/* Backend Health Status Badge */}
            <div 
              onClick={checkStatus}
              title="Click to re-check Backend API Status"
              className={`cursor-pointer hidden md:flex items-center gap-2 px-3 py-1.5 rounded-pill border text-xs font-bold transition-all ${
                apiOnline === true 
                  ? 'bg-success-soft border-emerald-200 text-success' 
                  : apiOnline === false 
                  ? 'bg-rose-50 border-rose-200 text-rose-600' 
                  : 'bg-gray-100 border-gray-200 text-gray-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                apiOnline === true ? 'bg-success animate-pulse' : apiOnline === false ? 'bg-rose-500' : 'bg-gray-400'
              }`} />
              <span>{apiOnline === true ? 'API Online' : apiOnline === false ? 'API Offline' : 'Connecting...'}</span>
              <RefreshCw className={`w-3 h-3 ml-0.5 ${checking ? 'animate-spin' : ''}`} />
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

