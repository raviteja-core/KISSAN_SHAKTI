import React, { useState } from 'react';
import { ShieldCheck, Check, X, Eye, Users, FileText } from 'lucide-react';

export const AdminConsole = () => {
  // Verification requests queue state
  const [verificationQueue, setVerificationQueue] = useState([
    {
      id: 201,
      name: "Suresh Pawar",
      role: "laborer",
      phone: "+91 99887 76655",
      region: "Maharashtra (Nashik)",
      documentName: "Aadhaar_Suresh.pdf",
      blacklistStatus: "passed", // 'passed' | 'failed' | 'pending'
      submittedAt: "2026-06-14 10:30"
    },
    {
      id: 202,
      name: "Harpreet Singh",
      role: "farmer",
      phone: "+91 98765 12345",
      region: "Punjab (Amritsar)",
      documentName: "Land_Record_Verification.jpg",
      blacklistStatus: "pending",
      submittedAt: "2026-06-14 12:15"
    },
    {
      id: 203,
      name: "Manish Shah",
      role: "laborer",
      phone: "+91 91234 98765",
      region: "Gujarat (Mehsana)",
      documentName: "VoterID_Manish.pdf",
      blacklistStatus: "failed", // Flagged!
      submittedAt: "2026-06-13 18:45"
    }
  ]);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState(null);

  const handleApprove = (userId) => {
    setVerificationQueue(prev => prev.filter(user => user.id !== userId));
  };

  const handleReject = (userId) => {
    setVerificationQueue(prev => prev.filter(user => user.id !== userId));
  };

  const handleManualScan = (userId) => {
    setVerificationQueue(prev => prev.map(user => {
      if (user.id === userId) {
        return { ...user, blacklistStatus: "passed" };
      }
      return user;
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title section */}
      <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={24} />
            Moderation Portal: System Administrator
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Evaluate regional onboarding identity submissions and mandatory blacklist scan reviews.
          </p>
        </div>
      </div>

      {/* Verification Queue (Farmer and Labourer Onboarding requests) */}
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
            {verificationQueue.map(req => (
              <div 
                key={req.id} 
                className={`border rounded-2xl p-5 bg-white space-y-4 transition-all hover:shadow-sm flex flex-col justify-between ${
                  req.blacklistStatus === 'failed' 
                    ? 'border-red-100 bg-red-50/5' 
                    : req.blacklistStatus === 'passed' 
                      ? 'border-emerald-100' 
                      : 'border-slate-100'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-800">{req.name}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          req.role === 'farmer' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                        }`}>
                          {req.role === 'laborer' ? 'labourer' : req.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        Phone: {req.phone} • Region: {req.region}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-500 font-semibold flex-shrink-0">
                      {req.submittedAt}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <span className="truncate max-w-[150px]">{req.documentName}</span>
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
                      {req.blacklistStatus === 'passed' && (
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          Passed Compliance
                        </span>
                      )}
                      {req.blacklistStatus === 'pending' && (
                        <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                          Scanning...
                        </span>
                      )}
                      {req.blacklistStatus === 'failed' && (
                        <span className="bg-red-50 border border-red-200 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          Flagged
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100/50 mt-4">
                  {req.blacklistStatus === 'pending' && (
                    <button
                      onClick={() => handleManualScan(req.id)}
                      className="mr-auto px-3 py-1.5 border border-amber-200 hover:bg-amber-50 text-amber-700 rounded-xl text-[11px] font-bold transition cursor-pointer"
                    >
                      Scan ID
                    </button>
                  )}
                  
                  {/* Decline request */}
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-3 py-1.5 bg-white border border-red-100 hover:bg-red-50 text-red-600 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
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
            ))}
          </div>
        )}
      </div>

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
                  <h4 className="text-base font-extrabold text-slate-800">{previewDoc.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold">{previewDoc.phone}</p>
                </div>
                
                {/* Mock Stamp */}
                <div className={`border-2 rounded-xl px-2 py-1 rotate-12 text-[10px] font-extrabold uppercase tracking-wide select-none ${
                  previewDoc.blacklistStatus === 'passed' 
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' 
                    : previewDoc.blacklistStatus === 'failed'
                      ? 'border-red-500 text-red-600 bg-red-50/20'
                      : 'border-amber-500 text-amber-600 bg-amber-50/20'
                }`}>
                  {previewDoc.blacklistStatus === 'passed' ? 'PASSED SCAN' : previewDoc.blacklistStatus === 'failed' ? 'FAILED SCAN' : 'SCAN PENDING'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Region</span>
                  <span>{previewDoc.region}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Registration Role</span>
                  <span className="capitalize">{previewDoc.role === 'laborer' ? 'labourer' : previewDoc.role}</span>
                </div>
                <div className="col-span-2 space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Verified Document Reference</span>
                  <code className="text-[10px] text-emerald-800 font-bold bg-white px-2 py-1.5 rounded border border-slate-155 block truncate">
                    {previewDoc.documentName}
                  </code>
                </div>
              </div>

              {/* Mock Fingerprint/Watermark Image info */}
              <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>SYSTEM ID Verification Service</span>
                <span className="font-mono text-slate-400">#ID-{previewDoc.id}</span>
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
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md cursor-pointer"
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
