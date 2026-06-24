import React from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';

export const MatchmakerModal = ({
  selectedJobForMatching,
  setSelectedJobForMatching,
  matchingWorkers,
  assignWorkerToJob
}) => {
  if (!selectedJobForMatching) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-800 bg-emerald-100/50 border border-emerald-100 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide select-none">
              Farming Matchmaker Engine
            </span>
            <h3 className="font-extrabold text-slate-900 text-base mt-1.5">
              Find Workers for: <span className="text-emerald-950 font-black">"{selectedJobForMatching.title}"</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Matches are queried from Dexie.js by required specialty: <strong className="text-slate-600 font-bold">"{selectedJobForMatching.required_skill}"</strong>
            </p>
          </div>
          <button
            onClick={() => setSelectedJobForMatching(null)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Match List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-grow">
          {matchingWorkers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <AlertCircle size={40} className="text-slate-200 mb-2" />
              <p className="text-xs font-extrabold">No workers found with matching agricultural skills in IndexedDB.</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Try registering a worker who specializes in "{selectedJobForMatching.required_skill}".</p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Retrieving matched profiles ({matchingWorkers.length}) sorted by calculated Match Score:
              </span>
              
              {matchingWorkers.map((worker) => (
                <div 
                  key={worker.id} 
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 ${
                    worker.match_score >= 100 
                      ? 'bg-emerald-50/10 border-emerald-100 hover:border-emerald-300' 
                      : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{worker.name}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        worker.match_score >= 100 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {worker.match_score}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Phone: {worker.phone} • Wage: ₹{worker.daily_rate}/day</p>
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {worker.skills.map((s, idx) => (
                        <span 
                          key={idx} 
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            s === selectedJobForMatching.required_skill 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => assignWorkerToJob(selectedJobForMatching.id, worker.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1 transition-all duration-300 shadow-md shadow-emerald-600/10 cursor-pointer"
                  >
                    <UserCheck size={12} />
                    <span>Hire & Assign</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>IndexedDB Matchmaker Query simulation active</span>
          <span>GET /api/jobs/{"{id}"}/match JSON mapped</span>
        </div>

      </div>
    </div>
  );
};
