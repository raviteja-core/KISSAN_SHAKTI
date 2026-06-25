import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ShieldCheck, Upload, AlertCircle, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export const VerificationGate = () => {
  const { user, updateVerification, logout, refreshUser } = useAuth();
  const [docFile, setDocFile] = useState(null);
  const [region, setRegion] = useState('Maharashtra');
  const [uploadError, setUploadError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Document exceeds 5MB size limit.");
        return;
      }
      setDocFile(file);
      setUploadError(null);
    }
  };

  const handleStartVerification = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setUploadError("Please upload an identity document to proceed.");
      return;
    }

    setLoading(true);
    try {
      const uploadRes = await api.uploadDocument(user.id, docFile);
      updateVerification({ 
        verificationStep: 'blacklist_scan',
        region: region,
        document_url: uploadRes.url
      });
    } catch (err) {
      setUploadError(err.message || "Failed to upload identity document.");
    } finally {
      setLoading(false);
    }
  };

  const simulateBlacklistCheck = async (shouldPass) => {
    setLoading(true);
    try {
      if (shouldPass) {
        await api.adminVerifyUser(user.id, "APPROVED", "Automated compliance scan passed.");
        updateVerification({
          verificationStep: 'completed',
          isVerified: true,
          isBlacklisted: false
        });
      } else {
        await api.adminVerifyUser(user.id, "BLACKLISTED", "Flagged in automated blacklist scan.");
        updateVerification({
          verificationStep: 'blacklist_scan',
          isVerified: false,
          isBlacklisted: true
        });
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      // Fallback
      if (shouldPass) {
        updateVerification({
          verificationStep: 'completed',
          isVerified: true,
          isBlacklisted: false
        });
      } else {
        updateVerification({
          verificationStep: 'blacklist_scan',
          isVerified: false,
          isBlacklisted: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <UserCheck size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-800">
            Onboarding & Verification
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Required for all platform users to ensure regional compliance
          </p>
        </div>

        {/* Stepper Status Indicators */}
        <div className="flex justify-between items-center gap-2 border-y border-slate-100 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
          <div className={`flex items-center gap-1 ${user?.verificationStep === 'onboarding' ? 'text-emerald-700' : 'text-slate-400'}`}>
            <span>1. Documents</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200"></div>
          <div className={`flex items-center gap-1 ${user?.verificationStep === 'blacklist_scan' && !user.isBlacklisted ? 'text-emerald-700' : 'text-slate-400'}`}>
            <span>2. Blacklist Scan</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200"></div>
          <div className={`flex items-center gap-1 ${user?.isBlacklisted ? 'text-red-600' : user?.isVerified ? 'text-emerald-700' : 'text-slate-400'}`}>
            <span>3. Status</span>
          </div>
        </div>

        {/* Stage 1: Document Upload */}
        {user?.verificationStep === 'onboarding' && (
          <form onSubmit={handleStartVerification} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Onboarding Regional Location
              </label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50"
              >
                <option value="Maharashtra">Maharashtra (Nashik, Sinnar, Pimplad)</option>
                <option value="Punjab">Punjab (Ludhiana, Amritsar)</option>
                <option value="Gujarat">Gujarat (Anand, Mehsana)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Upload Identity Document (Aadhaar / Voter ID / Driver License)
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition duration-200">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <Upload className="text-slate-400 mb-1.5" size={24} />
                  <p className="text-xs font-bold text-slate-700">
                    {docFile ? docFile.name : 'Click to Upload Document'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Max size: 5MB • PNG, JPG, or PDF format
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10 text-sm disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : 'Submit Documents'}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* Stage 2: Blacklist Scanning Simulator */}
        {user?.verificationStep === 'blacklist_scan' && !user.isBlacklisted && (
          <div className="text-center space-y-6">
            <div className="py-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Scanning Verification Records</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Checking regional registries and database blacklists. This is a mandatory screening step before granting app entry.
              </p>
            </div>

            {/* Simulation Options for testing UI states */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                [Developer Sandbox Simulator]
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => simulateBlacklistCheck(true)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-100 transition cursor-pointer disabled:opacity-50"
                >
                  Simulate Verified Check
                </button>
                <button
                  onClick={() => simulateBlacklistCheck(false)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold rounded-xl border border-red-100 transition cursor-pointer disabled:opacity-50"
                >
                  Simulate Blacklisted Check
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-150 flex flex-col gap-2">
              <p className="text-[10px] text-slate-500 font-semibold">Or wait for the administrator to approve your onboarding request.</p>
              <button
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
                <span>{isRefreshing ? "Checking..." : "Refresh Approval Status"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Stage 3: Blacklist Blocked state */}
        {user?.isBlacklisted && (
          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center shadow-lg shadow-red-600/10">
              <ShieldAlert size={36} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-red-700">Access Denied</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Your ID has been flagged during the blacklist verification scan. Regional platform guidelines prevent onboarding this account.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 text-left rounded-xl text-[10px] font-semibold text-slate-500 uppercase leading-relaxed tracking-wider">
              Verification Scan Outcome: <strong className="text-red-600 font-bold block">Status: BLACKLISTED</strong>
            </div>

            <button
              onClick={logout}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-3 px-4 rounded-xl transition duration-200 text-xs cursor-pointer"
            >
              Sign out / Re-register
            </button>
          </div>
        )}

        {/* Cancel button */}
        {!user?.isBlacklisted && (
          <button
            onClick={logout}
            className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs cursor-pointer transition"
          >
            Cancel Onboarding
          </button>
        )}
      </div>
    </div>
  );
};
