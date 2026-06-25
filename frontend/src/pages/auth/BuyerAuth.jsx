import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Phone, Lock, User, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export const BuyerAuth = ({ onBack }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP
  
  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [terms, setTerms] = useState(false);

  // Validation / Message states
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const validateDetails = () => {
    let tempErrors = {};
    
    if (isRegister) {
      if (!name.trim()) {
        tempErrors.name = "Full Name is required";
      }
      if (!terms) {
        tempErrors.terms = "You must agree to the platform guidelines";
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

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');
    
    if (!validateDetails()) return;

    setLoading(true);
    try {
      await api.sendOtp(phone.trim());
      setSuccessMsg(`OTP sent to ${phone}. Check uvicorn logs for the generated code.`);
      setStep(2);
    } catch (err) {
      setServerError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    // Focus next input
    if (element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setServerError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      // Real OTP validation via backend API
      await api.verifyOtp(phone.trim(), enteredOtp);
      
      if (isRegister) {
        const res = await register({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          role: 'buyer'
        });

        if (res.success) {
          setSuccessMsg("Registration successful! Redirecting...");
        } else {
          setServerError(res.error || "Registration failed");
          setStep(1); // Go back if error
        }
      } else {
        const res = await login('buyer', phone.trim(), password);
        if (res.success) {
          setSuccessMsg("Welcome back! Redirecting...");
        } else {
          setServerError(res.error || "Login failed");
          setStep(1);
        }
      }
    } catch (err) {
      setServerError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setPhone('9876543210');
    setPassword('buyer123');
    setIsRegister(false);
    setErrors({});
    setServerError('');
  };

  return (
    <div className="w-full max-w-md bg-white/95 rounded-[2.5rem] border border-blue-100 shadow-2xl p-8 transition-all duration-300">
      {/* Header Navigation */}
      <button
        onClick={step === 2 ? () => setStep(1) : onBack}
        className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-blue-700 transition cursor-pointer mb-6"
      >
        <ArrowLeft size={14} />
        <span>{step === 2 ? 'Back to Details' : 'Return to Portals'}</span>
      </button>

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="mx-auto h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
          <ShoppingCart size={30} className="animate-bounce" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Buyer Portal
        </h2>
        <p className="text-xs text-slate-500 font-bold mt-1">
          {isRegister ? 'Register to buy fresh produce directly' : 'Sign in to access marketplace'}
        </p>
      </div>

      {/* Banner Notifications */}
      {serverError && (
        <div className="mb-4 p-4 bg-red-50/90 border border-red-100 text-red-800 text-xs font-semibold rounded-2xl flex items-start gap-2 animate-in fade-in duration-200">
          <AlertCircle size={16} className="flex-shrink-0 text-red-600 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-50/90 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl flex items-start gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Business / Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Enter business or full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
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
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.phone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.phone && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.phone}</p>}
          </div>

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
                  errors.password ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.password && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.password}</p>}
          </div>

          {isRegister && (
            <div className="space-y-4">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={e => setTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 font-semibold leading-normal">
                  I agree to the KissanShakthi Marketplace Terms and KYC requirements for buyers.
                </span>
              </label>
              {errors.terms && <p className="text-[10px] font-bold text-red-600 ml-1">{errors.terms}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/10 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Sending OTP...' : isRegister ? 'Send Registration OTP' : 'Login with OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600">Enter the 6-digit code sent to</p>
            <p className="text-sm font-black text-slate-900">{phone}</p>
          </div>
          
          <div className="flex justify-center gap-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                name="otp"
                maxLength="1"
                value={data}
                onChange={e => handleOtpChange(e.target, index)}
                onFocus={e => e.target.select()}
                className="w-12 h-14 border border-slate-300 rounded-xl text-center text-xl font-black bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/10 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Verifying...' : 'Verify OTP & Access Portal'}
          </button>
          
          <div className="text-center">
            <button type="button" className="text-xs font-bold text-blue-600 hover:underline">
              Resend OTP
            </button>
          </div>
        </form>
      )}

      {/* Switch auth mode toggle */}
      {step === 1 && (
        <div className="mt-5 text-center text-xs font-bold text-slate-500">
          <span>{isRegister ? "Already a buyer?" : "New to KissanShakthi?"} </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrors({});
              setServerError('');
            }}
            className="text-blue-700 hover:underline cursor-pointer font-extrabold"
          >
            {isRegister ? 'Sign In Here' : 'Register as Buyer'}
          </button>
        </div>
      )}

      {/* Sandbox helper tool */}
      {step === 1 && !isRegister && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={handleFillDemo}
            className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 text-[10px] font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            type="button"
          >
            <span>Fill Demo Credentials (Buyer)</span>
          </button>
        </div>
      )}
    </div>
  );
};
