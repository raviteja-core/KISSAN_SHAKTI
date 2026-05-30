import React from 'react';
import { Sprout, Wifi, WifiOff, Layers, Users, Briefcase } from 'lucide-react';

export const Navbar = ({
  activeTab,
  setActiveTab,
  isOnline
}) => {
  return (
    <header className="glass sticky top-0 z-40 border-b border-emerald-100 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center">
            <Sprout size={28} className="animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-extrabold text-emerald-950 tracking-tight flex items-center gap-1.5">
              KissanShakthi
            </span>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-4">
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} />
              <span>Crops</span>
            </button>
            
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'workers' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              <span>Workers</span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'jobs' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase size={14} />
              <span>Jobs Board</span>
            </button>
          </nav>

          {/* Hardware Connection Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200/50 text-xs font-bold select-none transition-all duration-300">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse"></span>
                <Wifi size={14} className="text-emerald-600" />
                <span className="text-emerald-800 hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-md shadow-amber-500/50 animate-pulse"></span>
                <WifiOff size={14} className="text-amber-600 animate-bounce" />
                <span className="text-amber-800 hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
