import { Users, Trash2 } from 'lucide-react';

export const WorkersRegistry = ({
  workers,
  handleDeleteItem
}) => {


  return (
    <div>
      {/* List and persistent details */}
      <div className="space-y-6">
        {/* Workers Registry */}
        <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center justify-between">
            <span>Persistent Labourers: <code className="text-xs text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">workers</code></span>
          </h2>

          {workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users size={48} className="text-slate-200 mb-2" />
              <p className="text-xs font-extrabold">No workers registered in local IndexedDB memory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workers.map((worker) => (
                <div key={worker.id} className="bg-emerald-50/10 border border-emerald-100/30 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-100 hover:bg-emerald-50/20 transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-base">{worker.name}</span>
                      <div className="flex items-center gap-2">
                        {worker.sync_status === 'synced' ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-100 font-extrabold" title="Synced to PostgreSQL">Synced</span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-100 font-extrabold animate-pulse" title="Saved locally in Dexie.js">Pending</span>
                        )}
                        <button
                          onClick={() => handleDeleteItem('workers', worker.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-slate-500 text-xs font-semibold">{worker.phone}</p>
                      {worker.state && (
                        <span className="bg-emerald-50 text-emerald-800 text-[9px] px-2 py-0.5 rounded font-extrabold border border-emerald-100/30">
                          {worker.state}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {worker.skills.map((skill, sIdx) => (
                        <span key={sIdx} className="bg-white/80 border border-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-bold">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Daily Wage</span>
                    <strong className="text-emerald-800 font-extrabold">₹{worker.daily_rate} / Day</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
};
