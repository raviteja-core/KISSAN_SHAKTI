import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Mail, Lock, User, KeyRound, ArrowLeft, AlertCircle, CheckCircle2, Phone } from 'lucide-react';

export const AdminAuth = ({ onBack }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [terms, setTerms] = useState(false);

  // Validation / Message states
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let tempErrors = {};
    
    if (isRegister) {
      if (!name.trim()) {
        tempErrors.name = "Full Name is required";
      } else if (name.trim().length < 3) {
        tempErrors.name = "Name must be at least 3 letters";
      }

      if (!email.trim()) {
        tempErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        tempErrors.email = "Please enter a valid email address";
      }

      if (!confirmPassword) {
        tempErrors.confirmPassword = "Confirm password is required";
      } else if (password !== confirmPassword) {
        tempErrors.confirmPassword = "Passwords do not match";
      }

      if (!accessCode) {
        tempErrors.accessCode = "Admin registration access code is required";
      } else if (accessCode !== 'KISSAN_ADMIN_2026') {
        tempErrors.accessCode = "Invalid admin registry authorization code";
      }

      if (!terms) {
        tempErrors.terms = "You must agree to the moderator guidelines";
      }
    }

    if (!isRegister) {
      // Login identifier can be email or phone
      if (!email.trim()) {
        tempErrors.email = "Email or phone number is required";
      }
    } else {
      const cleanPhoneStr = phone.replace(/\D/g, '');
      if (!phone) {
        tempErrors.phone = "Phone number is required";
      } else if (cleanPhoneStr.length !== 10) {
        tempErrors.phone = "Phone number must be exactly 10 digits";
      }
    }

    if (!password) {
      tempErrors.password = "Password is required";
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');
    
    if (!validate()) return;

    setLoading(true);
    setTimeout(() => {
      if (isRegister) {
        const res = register({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          role: 'admin'
        });

        if (res.success) {
          setSuccessMsg("Administrator registered successfully! Redirecting...");
        } else {
          setServerError(res.error);
        }
      } else {
        const res = login('admin', email.trim(), password);
        if (res.success) {
          setSuccessMsg("Administrator authenticated successfully! Redirecting...");
        } else {
          setServerError(res.error);
        }
      }
      setLoading(false);
    }, 1200);
  };

  const handleFillDemo = () => {
    setEmail('admin@kissan.com');
    setPassword('adminpassword');
    setIsRegister(false);
    setErrors({});
    setServerError('');
  };

  return (
    <div className="w-full max-w-md bg-white/95 rounded-[2.5rem] border border-amber-100 shadow-2xl p-8 transition-all duration-300">
      {/* Header Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-amber-700 transition cursor-pointer mb-6"
      >
        <ArrowLeft size={14} />
        <span>Return to Portals</span>
      </button>

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="mx-auto h-14 w-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-800/20">
          <ShieldAlert size={30} className="text-amber-500 animate-pulse" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Admin Console
        </h2>
        <p className="text-xs text-slate-500 font-bold mt-1">
          {isRegister ? 'Register administrative account credentials' : 'Moderator authorization login'}
        </p>
      </div>
      {serverError && (
        <div className="mb-4 p-4 bg-red-50/90 border border-red-100 text-red-800 text-xs font-semibold rounded-2xl flex items-start gap-2 animate-in fade-in duration-200">
          <AlertCircle size={16} className="flex-shrink-0 text-red-600 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 bg-amber-50/90 border border-amber-100 text-amber-950 text-xs font-bold rounded-2xl flex items-start gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="flex-shrink-0 text-amber-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Enter administrator name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-amber-200 focus:border-slate-800'
                }`}
              />
            </div>
            {errors.name && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.name}</p>}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            {isRegister ? 'Email Address' : 'Email Address or Phone'}
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={isRegister ? "admin@kissan.com" : "e.g. admin@kissan.com or 9999999999"}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-amber-200 focus:border-slate-800'
              }`}
            />
          </div>
          {errors.email && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.email}</p>}
        </div>

        {isRegister && (
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="tel"
                placeholder="e.g. 9999999999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.phone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-amber-200 focus:border-slate-800'
                }`}
              />
            </div>
            {errors.phone && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.phone}</p>}
          </div>
        )}

        <div className={`grid gap-4 ${isRegister ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="password"
                placeholder="6+ characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.password ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-amber-200 focus:border-slate-800'
                }`}
              />
            </div>
            {errors.password && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.password}</p>}
          </div>

          {isRegister ? (
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    errors.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-amber-200 focus:border-slate-800'
                  }`}
                />
              </div>
              {errors.confirmPassword && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.confirmPassword}</p>}
            </div>
          ) : (
            <div>
            </div>
          )}
        </div>

        {isRegister && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Admin Registry Code</span>
                <span className="text-[9px] text-amber-700 font-bold capitalize">Sandbox: KISSAN_ADMIN_2026</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Enter secret registry code"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    errors.accessCode ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-amber-200 focus:border-slate-800'
                  }`}
                />
              </div>
              {errors.accessCode && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.accessCode}</p>}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-350 text-slate-800 focus:ring-slate-700 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-semibold leading-normal">
                I understand this account possesses full platform moderation capabilities, including profile verification approvals, suspension authority, and blacklist reviews.
              </span>
            </label>
            {errors.terms && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.terms}</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-3 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-slate-800/10 text-sm disabled:opacity-50 mt-2"
        >
          {loading ? 'Validating...' : isRegister ? 'Authorize Registry Admin' : 'Sign In Admin'}
        </button>
      </form>

      {/* Switch auth mode toggle */}
      <div className="mt-5 text-center text-xs font-bold text-slate-500">
        <span>{isRegister ? "Already moderator?" : "Need admin registration?"} </span>
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setErrors({});
            setServerError('');
          }}
          className="text-amber-700 hover:underline cursor-pointer font-extrabold"
        >
          {isRegister ? 'Sign In Here' : 'Register Here'}
        </button>
      </div>

      {/* Sandbox helper tool */}
      {!isRegister && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={handleFillDemo}
            className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 text-[10px] font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            type="button"
          >
            <span>Fill Demo Credentials (admin@kissan.com)</span>
          </button>
        </div>
      )}
    </div>
  );
};
