import React from 'react';
import { CheckCircle, Database, Wifi, WifiOff, Clock, RefreshCw, Sparkles } from 'lucide-react';

export const StatusWidgets = ({
  cropsCount,
  workersCount,
  jobsCount,
  syncQueueCount,
  isOnline,
  blockNetwork,
  lastSyncTime,
  syncing,
  triggerSync
}) => {
  const isConnected = isOnline && !blockNetwork;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      {/* Active SW indicator */}
      <div className="glass p-5 rounded-2xl flex items-center justify-between border border-emerald-100/50">
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">IndexedDB Engine</span>
          <p className="text-sm font-extrabold text-emerald-800 mt-1 flex items-center gap-1.5">
            <CheckCircle size={15} />
            Dexie.js Live Memory
          </p>
        </div>
        <Database size={24} className="text-emerald-600 opacity-60" />
      </div>

      {/* Sync status */}
      <div className="glass p-5 rounded-2xl flex items-center justify-between border border-emerald-100/50">
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">REST Syncer Mode</span>
          <p className="text-sm font-extrabold text-slate-800 mt-1 flex items-center gap-1.5">
            {isConnected ? (
              <><Wifi size={15} className="text-emerald-600" /> API Connected</>
            ) : (
              <><WifiOff size={15} className="text-amber-600 animate-pulse" /> Offline Buffers</>
            )}
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">Last Sync: {lastSyncTime}</p>
        </div>
        <span className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-amber-500 shadow-md shadow-amber-500/30'}`}></span>
      </div>

      {/* Queue Count */}
      <div className="glass p-5 rounded-2xl flex items-center justify-between border border-emerald-100/50">
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Queue: sync_queue</span>
          <p className="text-sm font-extrabold text-slate-800 mt-1 flex items-center gap-1.5">
            <Clock size={15} className={syncQueueCount > 0 ? 'text-amber-500 animate-spin' : 'text-slate-400'} />
            {syncQueueCount} Logs Queued
          </p>
        </div>
        <button
          onClick={triggerSync}
          disabled={!isConnected || syncing || syncQueueCount === 0}
          className={`p-2 rounded-xl border transition-all duration-300 ${
            !isConnected || syncQueueCount === 0 
              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-100 cursor-pointer'
          }`}
          title="Sync Pending Modifications"
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Seeding Indicator */}
      <div className="glass p-5 rounded-2xl flex items-center justify-between border border-emerald-100/50">
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Local Persistence</span>
          <p className="text-xs font-bold text-slate-600 mt-1">
            IndexedDB: <strong className="text-slate-900">{cropsCount + workersCount + jobsCount} objects</strong>
          </p>
        </div>
        <Sparkles size={18} className="text-emerald-500" />
      </div>
    </div>
  );
};
