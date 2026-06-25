import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Eye, Users, FileText, Trash2, Plus, Ban } from 'lucide-react';
import { api } from '../../services/api';

export const AdminConsole = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [usersList, setUsersList] = useState([]);
  const [blacklistList, setBlacklistList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState(null);

  // Blacklist form states
  const [blacklistEmail, setBlacklistEmail] = useState('');
  const [blacklistPhone, setBlacklistPhone] = useState('');
  const [blacklistReason, setBlacklistReason] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const usersData = await api.adminListUsers();
      // Keep all users in state, we will filter for the queue in render
      setUsersList(usersData.items || []);

      const blacklistData = await api.adminListBlacklist();
      setBlacklistList(blacklistData.items || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (userId) => {
    try {
      await api.adminVerifyUser(userId, "APPROVED", "Approved by administrator");
      alert("User onboarding verification approved!");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to approve user");
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt("Enter reason for declining verification:");
    if (reason === null) return;
    try {
      await api.adminVerifyUser(userId, "REJECTED", reason || "Rejected by administrator");
      alert("User verification request declined.");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to decline user");
    }
  };

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    if (!blacklistReason) return;
    if (!blacklistEmail && !blacklistPhone) {
      alert("Please provide either email or phone number for blacklist record.");
      return;
    }

    try {
      await api.adminAddBlacklist({
        email: blacklistEmail || null,
        phone: blacklistPhone || null,
        reason: blacklistReason
      });
      alert("Profile added to blacklist and restricted from platform access.");
      setBlacklistEmail('');
      setBlacklistPhone('');
      setBlacklistReason('');
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to add blacklist entry");
    }
  };

  const handleDeleteBlacklist = async (id) => {
    if (!confirm("Remove this entry from system blacklist?")) return;
    try {
      await api.adminDeleteBlacklist(id);
      alert("Blacklist entry deleted.");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to delete blacklist entry");
    }
  };

  // Determine if a user matches any entry in the system blacklist
  const getBlacklistStatus = (userItem) => {
    const matched = blacklistList.some(b => 
      (b.email && userItem.email && b.email.toLowerCase() === userItem.email.toLowerCase()) ||
      (b.phone && userItem.phone && b.phone.trim() === userItem.phone.trim())
    );
    return matched ? 'failed' : 'passed';
  };

  // Filter verification queue (users whose status is PENDING)
  const verificationQueue = usersList.filter(u => u.status === 'PENDING');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title section */}
      <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={24} />
            Moderation Portal: System Administrator
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Evaluate regional onboarding identity submissions and manage database compliance blacklists.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-white text-slate-850 shadow-sm'
                : 'text-slate-550 hover:text-slate-850'
            }`}
          >
            Verification Queue ({verificationQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'blacklist'
                ? 'bg-white text-slate-850 shadow-sm'
                : 'text-slate-555 hover:text-slate-850'
            }`}
          >
            Blacklist Manager ({blacklistList.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass p-12 rounded-3xl border border-emerald-100/50 text-center text-xs font-bold text-slate-400">
          Loading moderation records...
        </div>
      ) : activeTab === 'queue' ? (
        /* Verification Queue (Farmer and Labourer Onboarding requests) */
        <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="text-emerald-600" size={18} />
            Identity Verification Queue ({verificationQueue.length})
          </h3>

          {verificationQueue.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
              <Check className="mx-auto text-emerald-600 mb-2" size={32} />
              <p className="text-xs font-bold text-slate-700">Verification Queue Clear</p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">All newly onboarded profiles are processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {verificationQueue.map(req => {
                const blacklistStatus = getBlacklistStatus(req);
                return (
                  <div 
                    key={req.id} 
                    className={`border rounded-2xl p-5 bg-white space-y-4 transition-all hover:shadow-sm flex flex-col justify-between ${
                      blacklistStatus === 'failed' 
                        ? 'border-red-100 bg-red-50/5' 
                        : 'border-slate-100'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-800">{req.full_name}</h4>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              req.role === 'farmer' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                            }`}>
                              {req.role === 'laborer' ? 'labourer' : req.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold mt-1">
                            Phone: {req.phone} • Region: {req.state || 'Maharashtra'}
                          </p>
                        </div>

                        <span className="text-[9px] text-slate-400 font-semibold flex-shrink-0">
                          {req.created_at ? req.created_at.substring(0, 16).replace('T', ' ') : 'Just Now'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-700">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            {req.document_url ? (
                              <a href={req.document_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline truncate max-w-[150px] font-bold">
                                View Uploaded Document
                              </a>
                            ) : (
                              <span className="truncate max-w-[150px]">Identity_Proof_{req.role}.pdf</span>
                            )}
                          </div>
                          <button 
                            onClick={() => setPreviewDoc(req)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 transition cursor-pointer"
                            title="Preview document"
                          >
                            <Eye size={12} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Blacklist Status:</span>
                          {blacklistStatus === 'passed' ? (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              Passed Compliance
                            </span>
                          ) : (
                            <span className="bg-red-50 border border-red-200 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              Flagged Entry
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100/50 mt-4 font-bold">
                      {/* Decline request */}
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 bg-white border border-red-100 hover:bg-red-50 text-red-650 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <X size={11} />
                        <span>Decline</span>
                      </button>

                      {/* Approve request */}
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-600/5"
                      >
                        <Check size={11} />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Blacklist Manager Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add to Blacklist Form */}
          <div className="glass p-6 rounded-3xl border border-red-100/50 shadow-sm h-fit space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Ban className="text-red-650 text-red-600" size={18} />
              Add Blacklist Profile
            </h3>

            <form onSubmit={handleAddBlacklist} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. rogue@kissan.in"
                  value={blacklistEmail}
                  onChange={e => setBlacklistEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 99999 99999"
                  value={blacklistPhone}
                  onChange={e => setBlacklistPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Blacklist Reason</label>
                <textarea
                  placeholder="Reason for blocking and flagging this identity..."
                  value={blacklistReason}
                  onChange={e => setBlacklistReason(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold h-24 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-red-600/10 text-sm"
              >
                <Ban size={16} />
                <span>Blacklist Profile</span>
              </button>
            </form>
          </div>

          {/* Blacklisted Entries Table */}
          <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-800">
              System Blacklist Registry
            </h3>

            {blacklistList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                <ShieldCheck className="mx-auto text-emerald-600 mb-2" size={32} />
                <p className="text-xs font-bold text-slate-700">Registry Clear</p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">No profiles are currently restricted.</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Profile Info</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Listed At</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-105 bg-white font-semibold text-slate-700">
                    {blacklistList.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 space-y-1">
                          {entry.email && <div className="block font-bold">{entry.email}</div>}
                          {entry.phone && <div className="block font-mono text-[10px] text-slate-550">{entry.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 break-words max-w-[200px]">{entry.reason}</td>
                        <td className="px-4 py-3 text-[10px] text-slate-400">
                          {entry.created_at ? entry.created_at.substring(0, 10) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteBlacklist(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-650 hover:text-red-600 rounded transition cursor-pointer"
                            title="Remove from blacklist"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal Popup */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <FileText size={16} className="text-emerald-600" />
                <span>Document Proof Preview</span>
              </h3>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-xs cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Simulated ID Proof Layout */}
            <div className="border border-slate-200 rounded-3xl p-5 bg-gradient-to-br from-emerald-500/5 to-slate-500/5 space-y-4 shadow-inner">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[8px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest">
                    Government Registry ID
                  </span>
                  <h4 className="text-base font-extrabold text-slate-800">{previewDoc.full_name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold">{previewDoc.phone}</p>
                </div>
                
                <div className={`border-2 rounded-xl px-2 py-1 rotate-12 text-[10px] font-extrabold uppercase tracking-wide select-none ${
                  getBlacklistStatus(previewDoc) === 'passed' 
                    ? 'border-emerald-500 text-emerald-650 text-emerald-600 bg-emerald-50/20' 
                    : 'border-red-500 text-red-650 text-red-600 bg-red-50/20'
                }`}>
                  {getBlacklistStatus(previewDoc) === 'passed' ? 'PASSED SCAN' : 'FLAGGED BLACKLIST'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Region</span>
                  <span>{previewDoc.state || 'Maharashtra'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Registration Role</span>
                  <span className="capitalize">{previewDoc.role === 'laborer' ? 'labourer' : previewDoc.role}</span>
                </div>
                <div className="col-span-2 space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Verified Document Reference</span>
                  {previewDoc.document_url ? (
                    <a 
                      href={previewDoc.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-700 hover:underline font-bold bg-white px-2 py-1.5 rounded border border-slate-100 block truncate text-center"
                    >
                      Open identity document in new tab (Supabase Storage)
                    </a>
                  ) : (
                    <code className="text-[10px] text-emerald-800 font-bold bg-white px-2 py-1.5 rounded border border-slate-100 block truncate">
                      Identity_Proof_{previewDoc.role}.pdf
                    </code>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>SYSTEM ID Verification Service</span>
                <span className="font-mono text-slate-450 text-[9px]">#ID-{previewDoc.id}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  handleReject(previewDoc.id);
                  setPreviewDoc(null);
                }}
                className="flex-1 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={() => {
                  handleApprove(previewDoc.id);
                  setPreviewDoc(null);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/5"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
