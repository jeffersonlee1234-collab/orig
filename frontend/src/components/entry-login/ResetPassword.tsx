import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Mail, KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft, Check, X } from 'lucide-react';
import { API_BASE } from '../../config/api';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const governmentSealImage = '/samples/Government Service Integrity Seal.png';

  const [email, setEmail] = useState('');
  const [isEmailFromUrl, setIsEmailFromUrl] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const otpParam = searchParams.get('otp');
    if (emailParam) {
      setEmail(emailParam);
      setIsEmailFromUrl(true);
    }
    if (otpParam) setOtpCode(otpParam);
  }, [searchParams]);

  // Live password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isAllValid = hasMinLength && hasNumber && hasSpecialChar && hasUpper && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !otpCode || !newPassword || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!hasNumber) {
      setError('Password must include at least one number (0-9).');
      return;
    }

    if (!hasSpecialChar) {
      setError('Password must include at least one special character (e.g. !@#$%^&*).');
      return;
    }

    if (!hasUpper) {
      setError('Password must include at least one uppercase letter (A-Z).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-check your password confirmation.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otpCode: otpCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2200);
      } else {
        setError(data.message || 'Failed to reset password. Please check your verification code.');
      }
    } catch (err: any) {
      console.error('Error in resetPassword:', err);
      setError('Network error connecting to backend. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC] font-sans text-sm relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Hero Section */}
      <div
        className="w-full md:w-1/2 text-white p-4 sm:p-6 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-center items-center"
        style={{ backgroundColor: '#0F172A' }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden p-4">
          <div className="w-full max-w-[480px] sm:max-w-[560px] lg:max-w-[640px] aspect-square flex items-center justify-center shrink-0 opacity-[0.12]">
            <img
              src={governmentSealImage}
              alt="Government Seal"
              width={1080}
              height={1080}
              className="w-full h-full object-contain aspect-square shrink-0 select-none"
              style={{ filter: 'brightness(2.2) contrast(1.8) saturate(0.9)', mixBlendMode: 'overlay' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between z-10 w-full">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>

        <div className="my-auto py-6 sm:py-8 z-10 max-w-lg text-center flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 leading-tight text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Account Security & Password Reset
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base mb-6 leading-relaxed font-medium">
            Set a new secure password for your GovServe Resident or Staff account.
          </p>
        </div>

        <div className="text-[11px] text-slate-400 font-medium z-10 text-center w-full">
          © Social Services Management System • Security Verification
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-[#F8FAFC]">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-white shadow-xl border border-slate-200">
          {success ? (
            <div className="text-center py-6 animate-scale-up">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Password Updated!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                Your password has been successfully reset. Redirecting you to the sign in page...
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Set New Password
                </h2>
                <p className="text-xs text-slate-500 mt-1.5">
                  Enter your verification code and choose your new password
                </p>
              </div>

              {error && (
                <div className="p-3 mb-4 text-xs text-red-600 bg-red-50 rounded-lg border border-red-200 text-center animate-fade-in font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={isEmailFromUrl}
                      placeholder="name@example.com"
                      className={`w-full pl-9 pr-3 py-2.5 text-xs md:text-sm border rounded-lg focus:outline-none transition-colors ${
                        isEmailFromUrl
                          ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed font-medium'
                          : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-700'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* 6-digit OTP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Verification Code (OTP from Email)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      maxLength={10}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full pl-9 pr-3 py-2.5 text-xs md:text-sm font-mono tracking-wider bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-700"
                      required
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="e.g. Password@123"
                      className="w-full pl-9 pr-9 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-700"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Live Password Requirements Checklist */}
                {newPassword.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1.5 animate-fade-in">
                    <div className="font-semibold text-slate-600 mb-1">Password Requirements:</div>
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasMinLength ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      <span>At least 8 characters long</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasNumber ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      <span>At least 1 number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasSpecialChar ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      <span>At least 1 special character (e.g. @, #, $, !, %)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasUpper ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      <span>At least 1 uppercase letter (A-Z)</span>
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-9 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-700"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="mt-1 text-[11px]">
                      {passwordsMatch ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Passwords match
                        </span>
                      ) : (
                        <span className="text-red-500 font-medium flex items-center gap-1">
                          <X className="w-3 h-3" /> Passwords do not match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || (newPassword.length > 0 && !isAllValid)}
                  className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:opacity-50 text-white font-semibold text-xs md:text-sm rounded-lg shadow-sm transition-colors cursor-pointer mt-2"
                >
                  {isLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Remembered your password? Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
