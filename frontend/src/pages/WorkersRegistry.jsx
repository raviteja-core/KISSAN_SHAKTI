import React from 'react';
import { Plus, Phone, AlertCircle, Users, Trash2, Sparkles, MapPin } from 'lucide-react';
import { SKILL_OPTIONS, STATE_OPTIONS } from '../db/constants';

export const WorkersRegistry = ({
  workers,
  syncQueue,
  workerName,
  setWorkerName,
  workerPhone,
  setWorkerPhone,
  workerRate,
  setWorkerRate,
  workerState,
  setWorkerState,
  selectedSkills,
  setSelectedSkills,
  workerErrors,
  setWorkerErrors,
  workerFilledStatus,
  setWorkerFilledStatus,
  handleAddWorker,
  handleDeleteItem,
  logSystem
}) => {
  const toggleSkillSelection = (skill) => {
    setWorkerFilledStatus(prev => ({ ...prev, skills: false }));
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const displayPhone = React.useMemo(() => {
    let clean = (workerPhone || '').replace(/\D/g, '');
    if (clean.startsWith('91') && clean.length > 10) {
      clean = clean.slice(2);
    }
    return clean.slice(0, 10);
  }, [workerPhone]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!workerName || workerName.trim().length < 3) {
      errors.name = "Full name must be at least 3 characters long.";
    }

    let cleanPhone = (workerPhone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(2);
    }

    if (!cleanPhone) {
      errors.phone = "Mobile phone number is required.";
    } else if (cleanPhone.length !== 10 || !/^[6789]\d{9}$/.test(cleanPhone)) {
      errors.phone = "Invalid format. Enforce a 10-digit mobile number (e.g. 9876543210).";
    }

    const rate = parseFloat(workerRate);
    if (isNaN(rate) || rate <= 0) {
      errors.rate = "Daily rate must be a valid positive number.";
    }

    if (selectedSkills.length === 0) {
      errors.skills = "Select at least one specialty skill chip for this laborer.";
    }

    if (Object.keys(errors).length > 0) {
      setWorkerErrors(errors);
      logSystem('error', `Form submission blocked: ${Object.keys(errors).length} validation failures detected.`);
      return;
    }

    const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;

    setWorkerErrors({});
    handleAddWorker({
      name: workerName,
      phone: formattedPhone,
      rate: workerRate,
      skills: selectedSkills,
      state: workerState
    });

    // Reset parent form states
    setWorkerName('');
    setWorkerPhone('');
    setWorkerRate('');
    setSelectedSkills([]);
    setWorkerState('Maharashtra');
    setWorkerFilledStatus({ name: false, phone: false, rate: false, skills: false });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Validated Form */}
      <div className="glass p-6 rounded-3xl shadow-sm border border-emerald-100/50 h-fit">
        <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="text-emerald-600" size={18} />
          Register Farm Laborer
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Worker Name</span>
              {workerFilledStatus.name && <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-0.5 animate-pulse"><Sparkles size={10} /> Auto-filled</span>}
            </label>
            <input
              type="text"
              placeholder="e.g. Suresh Patil"
              value={workerName}
              onChange={e => {
                setWorkerName(e.target.value);
                setWorkerFilledStatus(prev => ({ ...prev, name: false }));
              }}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold bg-white/50 transition-all focus:ring-2 focus:ring-emerald-500 ${
                workerFilledStatus.name ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10' : ''
              } ${
                workerErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'
              }`}
            />
            {workerErrors.name && (
              <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle size={10} /> {workerErrors.name}
              </p>
            )}
          </div>

          {/* Contact and daily rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-0.5"><Phone size={10} /> Phone</span>
                {workerFilledStatus.phone && <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5"><Sparkles size={8} /> Sync</span>}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 text-sm font-extrabold border-r border-slate-200 pr-2 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={displayPhone}
                  onChange={e => {
                    const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setWorkerPhone(sanitized);
                    setWorkerFilledStatus(prev => ({ ...prev, phone: false }));
                  }}
                  className={`w-full pl-12 pr-4 py-2.5 rounded-xl border text-sm font-semibold bg-white/50 transition-all focus:ring-2 focus:ring-emerald-500 ${
                    workerFilledStatus.phone ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10' : ''
                  } ${
                    workerErrors.phone ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Daily Rate (₹)</span>
                {workerFilledStatus.rate && <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5"><Sparkles size={8} /> Sync</span>}
              </label>
              <input
                type="number"
                placeholder="₹450"
                value={workerRate}
                onChange={e => {
                  setWorkerRate(e.target.value);
                  setWorkerFilledStatus(prev => ({ ...prev, rate: false }));
                }}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold bg-white/50 transition-all focus:ring-2 focus:ring-emerald-500 ${
                  workerFilledStatus.rate ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10' : ''
                } ${
                  workerErrors.rate ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'
                }`}
              />
            </div>
          </div>
          
          {/* Inline Errors for phone and daily rate */}
          {(workerErrors.phone || workerErrors.rate) && (
            <div className="space-y-1 mt-1">
              {workerErrors.phone && (
                <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                  <AlertCircle size={10} /> {workerErrors.phone}
                </p>
              )}
              {workerErrors.rate && (
                <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                  <AlertCircle size={10} /> {workerErrors.rate}
                </p>
              )}
            </div>
          )}

          {/* State / Region Selector */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin size={10} className="text-emerald-600" />
              <span>State / Region</span>
            </label>
            <select
              value={workerState}
              onChange={e => setWorkerState(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50 transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {STATE_OPTIONS.map((state, idx) => (
                <option key={idx} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Specialty Skills</span>
              {workerFilledStatus.skills && <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-0.5 animate-pulse"><Sparkles size={10} /> Auto-filled</span>}
            </label>
            <div className={`grid grid-cols-2 gap-2 p-2 rounded-xl transition-all ${
              workerFilledStatus.skills ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10' : ''
            }`}>
              {SKILL_OPTIONS.map((skill, idx) => (
                <label key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/50 border border-slate-100 hover:bg-slate-100 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill)}
                    onChange={() => toggleSkillSelection(skill)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>{skill}</span>
                </label>
              ))}
            </div>
            {workerErrors.skills && (
              <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1">
                <AlertCircle size={10} /> {workerErrors.skills}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10"
          >
            <Plus size={16} />
            <span>Register Farm Laborer</span>
          </button>
        </form>
      </div>

      {/* List and persistent details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Workers Registry */}
        <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center justify-between">
            <span>Persistent Laborers: <code className="text-xs text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">workers</code></span>
            <span className="text-xs text-slate-400 font-medium">Dexie Local Storage</span>
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

        {/* Sync queue display */}
        {syncQueue && (
          <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm bg-slate-950/5">
            <details className="group">
              <summary className="text-xs font-bold text-slate-600 flex items-center justify-between cursor-pointer select-none">
                <span className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-500" />
                  View sync_queue Local Store Content ({syncQueue.length} records pending)
                </span>
                <span className="transition-transform group-open:rotate-90">▶</span>
              </summary>
              <div className="mt-3 bg-slate-900 text-emerald-400 p-4 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed max-h-48 shadow-inner">
                {syncQueue.length === 0 ? (
                  <span className="text-slate-400 font-medium font-sans">Queue is empty. Everything synced with PostgreSQL database!</span>
                ) : (
                  JSON.stringify(syncQueue, null, 2)
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};
