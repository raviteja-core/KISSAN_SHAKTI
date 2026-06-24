import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { STATE_OPTIONS, SKILL_OPTIONS } from '../../db/constants';
import { Users, Phone, Lock, User, MapPin, ArrowLeft, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';

export const WorkerAuth = ({ onBack }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('Maharashtra');
  const [dailyRate, setDailyRate] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [terms, setTerms] = useState(false);

  // Validation / Message states
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else {
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  const validate = () => {
    let tempErrors = {};
    
    if (isRegister) {
      if (!name.trim()) {
        tempErrors.name = "Full Name is required";
      } else if (name.trim().length < 3) {
        tempErrors.name = "Name must be at least 3 letters";
      } else if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
        tempErrors.name = "Name can only contain alphabets and spaces";
      }

      if (!confirmPassword) {
        tempErrors.confirmPassword = "Confirm password is required";
      } else if (password !== confirmPassword) {
        tempErrors.confirmPassword = "Passwords do not match";
      }

      const rateNum = Number(dailyRate);
      if (!dailyRate) {
        tempErrors.dailyRate = "Daily wage rate is required";
      } else if (isNaN(rateNum) || rateNum < 100 || rateNum > 5000) {
        tempErrors.dailyRate = "Daily rate must be between ₹100 and ₹5,000";
      }

      if (selectedSkills.length === 0) {
        tempErrors.skills = "Select at least 1 agricultural skill";
      }

      if (!terms) {
        tempErrors.terms = "You must agree to the registry guidelines";
      }
    }

    const cleanPhoneStr = phone.replace(/\D/g, '');
    if (!phone) {
      tempErrors.phone = "Phone number is required";
    } else if (cleanPhoneStr.length !== 10) {
      tempErrors.phone = "Phone number must be exactly 10 digits";
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
          password,
          role: 'laborer',
          region,
          daily_rate: Number(dailyRate),
          skills: selectedSkills
        });

        if (res.success) {
          setSuccessMsg("Worker Registration successful! Proceeding to Verification Gate...");
        } else {
          setServerError(res.error);
        }
      } else {
        const res = login('laborer', phone.trim(), password);
        if (res.success) {
          setSuccessMsg("Logged in successfully! Loading Labourer Dashboard...");
        } else {
          setServerError(res.error);
        }
      }
      setLoading(false);
    }, 1200);
  };

  const handleFillDemo = () => {
    setPhone('9988776655');
    setPassword('password123');
    setIsRegister(false);
    setErrors({});
    setServerError('');
  };

  return (
    <div className="w-full max-w-md bg-white/95 rounded-[2.5rem] border border-indigo-100 shadow-2xl p-8 transition-all duration-300">
      {/* Header Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-indigo-700 transition cursor-pointer mb-6"
      >
        <ArrowLeft size={14} />
        <span>Return to Portals</span>
      </button>

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="mx-auto h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
          <Users size={30} className="animate-pulse" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Labourer Registry
        </h2>
        <p className="text-xs text-slate-500 font-bold mt-1">
          {isRegister ? 'List your profile to find local tasks' : 'Sign in to access your working log'}
        </p>
      </div>

      {/* Banner Notifications */}
      {serverError && (
        <div className="mb-4 p-4 bg-red-50/90 border border-red-100 text-red-800 text-xs font-semibold rounded-2xl flex items-start gap-2 animate-in fade-in duration-200">
          <AlertCircle size={16} className="flex-shrink-0 text-red-650 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 bg-indigo-50/90 border border-indigo-100 text-indigo-900 text-xs font-bold rounded-2xl flex items-start gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="flex-shrink-0 text-indigo-600 mt-0.5" />
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
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.name && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.name}</p>}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <input
              type="tel"
              placeholder="e.g. 9988776655"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.phone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200 focus:border-indigo-500'
              }`}
            />
          </div>
          {errors.phone && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.phone}</p>}
        </div>

        {/* Dynamic Grid Layout for Password Fields */}
        <div className={isRegister ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "space-y-1"}>
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
                  errors.password ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.password && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.password}</p>}
          </div>

          {isRegister && (
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
                    errors.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.confirmPassword && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.confirmPassword}</p>}
            </div>
          )}
        </div>

        {isRegister && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  State Region
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-slate-400" size={16} />
                  <select
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="w-full pl-9 pr-2 py-3 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all appearance-none animate-none"
                  >
                    {STATE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Daily Payout (₹/Day)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={dailyRate}
                    onChange={e => setDailyRate(e.target.value)}
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.dailyRate ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {errors.dailyRate && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.dailyRate}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Select Your Skills (At least 1)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SKILL_OPTIONS.map(skill => (
                  <label
                    key={skill}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition select-none ${
                      selectedSkills.includes(skill)
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-extrabold'
                        : 'border-slate-200 bg-slate-50/30 text-slate-600 font-medium hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => handleToggleSkill(skill)}
                      className="hidden"
                    />
                    <span className="text-[11px]">{skill}</span>
                  </label>
                ))}
              </div>
              {errors.skills && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.skills}</p>}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-semibold leading-normal">
                I understand that I am registering on the regional registry and can only work under 1 farmer contract at any time. Security and blacklist validation checks apply.
              </span>
            </label>
            {errors.terms && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.terms}</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 text-sm disabled:opacity-50 mt-2"
        >
          {loading ? 'Processing...' : isRegister ? 'Register Labourer Profile' : 'Sign In as Labourer'}
        </button>
      </form>

      {/* Switch auth mode toggle */}
      <div className="mt-5 text-center text-xs font-bold text-slate-500">
        <span>{isRegister ? "Already registered?" : "New to KissanShakthi?"} </span>
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setErrors({});
            setServerError('');
          }}
          className="text-indigo-700 hover:underline cursor-pointer font-extrabold"
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
            <span>Fill Demo Credentials (Suresh Pawar)</span>
          </button>
        </div>
      )}
    </div>
  );
};