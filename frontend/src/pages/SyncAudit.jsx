import React from 'react';
import { Database, Clock } from 'lucide-react';

export const SyncAudit = ({
  syncLogs,
  handleClearLogs
}) => {
  return (
    <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Database className="text-emerald-600 animate-pulse" size={20} />
            Background Sync Audit Trail
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Chronological history of automatic & manual synchronizations compiled from browser local DB table: <code className="bg-emerald-50 text-emerald-800 font-bold px-1 py-0.2 rounded">sync_logs</code>
          </p>
        </div>
        <button 
          onClick={handleClearLogs}
          disabled={syncLogs.length === 0}
          className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Clear History
        </button>
      </div>

      {syncLogs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Database size={36} className="mx-auto mb-2 text-slate-200" />
          <p className="text-xs font-bold">No sync operations logged yet.</p>
          <p className="text-[10px] text-slate-400 font-medium">Create and modify data while offline, then trigger sync to log actions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {syncLogs.map((log) => (
            <div 
              key={log.id} 
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                log.status === 'SUCCESS' 
                  ? 'bg-emerald-50/10 border-emerald-100' 
                  : 'bg-red-50/10 border-red-100'
              }`}
            >
              <div>
                <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full mb-1 sm:mb-0 mr-2 ${
                  log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {log.status}
                </span>
                <strong className="text-slate-800 font-extrabold">{log.message}</strong>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Records affected: {log.records_count}</p>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <Clock size={11} /> {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
