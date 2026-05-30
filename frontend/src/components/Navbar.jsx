import React from 'react';
import { Sprout, Wifi, WifiOff, Layers, Users, Briefcase } from 'lucide-react';

export const Navbar = ({
  activeTab,
  setActiveTab,
  blockNetwork,
  setBlockNetwork,
  isOnline,
  setToast
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

          {/* Offline simulation togglers */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setBlockNetwork(false);
                setToast({ type: 'online', message: "🟢 You are back online! Syncing your local changes back to the server..." });
                setTimeout(() => setToast(null), 5000);
              }}
              className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                (!blockNetwork && isOnline) ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Wifi size={13} />
              <span className="hidden sm:inline">Online</span>
            </button>
            <button
              onClick={() => {
                setBlockNetwork(true);
                setToast({ type: 'offline', message: "⚠️ Connection lost. You are now offline. Changes will save to IndexedDB." });
                setTimeout(() => setToast(null), 5000);
              }}
              className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                (blockNetwork || !isOnline) ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <WifiOff size={13} />
              <span className="hidden sm:inline">Offline</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
