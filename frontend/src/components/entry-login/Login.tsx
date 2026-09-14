import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, X, Eye, EyeOff, ExternalLink, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import { API_BASE } from '../../config/api';

import { RecaptchaModal } from '../ui/recaptcha-modal';

export const Login = () => {
  const navigate = useNavigate();

  // Government seal mula sa public/samples folder
  const governmentSealImage = '/samples/Government Service Integrity Seal.png';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    try {
      const storedUntil = localStorage.getItem('login_lockout_until');
      if (storedUntil) {
        const remaining = Math.ceil((parseInt(storedUntil, 10) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch {}
    return 0;
  });

  const [error, setError] = useState<string>(() => {
    try {
      const storedUntil = localStorage.getItem('login_lockout_until');
      if (storedUntil) {
        const remaining = Math.ceil((parseInt(storedUntil, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          return localStorage.getItem('login_lockout_message') || `Too many failed login attempts (3/3). Your login is locked for ${remaining}s for security.`;
        }
      }
    } catch {}
    return '';
  });

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [isRecaptchaChallengeOpen, setIsRecaptchaChallengeOpen] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [formStartTime] = useState(() => Date.now());

  // Check lockout status from server on mount
  useEffect(() => {
    const checkServerLockout = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/lockout-status`);
        const data = await res.json();
        if (data && data.isLocked && data.remainingSeconds > 0) {
          const lockExpiry = Date.now() + data.remainingSeconds * 1000;
          localStorage.setItem('login_lockout_until', lockExpiry.toString());
          const lockMsg = data.message || `Too many failed login attempts (3/3). Your login is locked for ${data.remainingSeconds}s for security.`;
          localStorage.setItem('login_lockout_message', lockMsg);
          setLockoutRemaining(data.remainingSeconds);
          setError(lockMsg);
        }
      } catch {}
    };
    checkServerLockout();
  }, []);

  // Real-time countdown timer that survives page reloads
  useEffect(() => {
    if (lockoutRemaining <= 0) {
      localStorage.removeItem('login_lockout_until');
      localStorage.removeItem('login_lockout_message');
      return;
    }

    const interval = setInterval(() => {
      const storedUntil = localStorage.getItem('login_lockout_until');
      let remaining = 0;
      if (storedUntil) {
        remaining = Math.max(0, Math.ceil((parseInt(storedUntil, 10) - Date.now()) / 1000));
      } else {
        remaining = Math.max(0, lockoutRemaining - 1);
      }

      setLockoutRemaining(remaining);

      if (remaining <= 0) {
        localStorage.removeItem('login_lockout_until');
        localStorage.removeItem('login_lockout_message');
        setError('');
      } else {
        setError((prev) => {
          if (prev && prev.includes('locked for')) {
            return `Too many failed login attempts (3/3). Your login is locked for ${remaining}s for security.`;
          }
          return prev;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  // Inactive Account Reactivation state
  const [inactiveUserPrompt, setInactiveUserPrompt] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  const handleReactivateAndLogin = async () => {
    if (!inactiveUserPrompt) return;
    setIsReactivating(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inactiveUserPrompt.email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const detectedRole = data.role || 'user';
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userRole', detectedRole);
        if (data.sessionToken) {
          sessionStorage.setItem('sessionToken', data.sessionToken);
        }
        if (data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          localStorage.setItem('user_profile', JSON.stringify(data.user));
        }
        window.location.href = '/portal/overview';
      } else {
        setError(data.message || 'Failed to reactivate account.');
        setInactiveUserPrompt(null);
      }
    } catch (err) {
      setError('Connection error while reactivating account.');
      setInactiveUserPrompt(null);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRegisterLoading(true);

    setTimeout(() => {
      navigate('/register');
    }, 1500);
  };

  const getClientDeviceInfo = () => {
    const ua = navigator.userAgent || '';
    const hasTouch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
    const isSmallScreen = window.innerWidth <= 820;

    let isMobile = /mobile|iphone|ipod|android/i.test(ua) || (hasTouch && isSmallScreen);
    let isTablet = /tablet|ipad/i.test(ua) || (hasTouch && !isSmallScreen && /android|ipad/i.test(ua));

    let os = 'Windows';
    if (/android/i.test(ua)) {
      os = 'Android';
      isMobile = !isTablet;
    } else if (/iphone|ipod/i.test(ua)) {
      os = 'iOS (iPhone)';
      isMobile = true;
    } else if (/ipad/i.test(ua)) {
      os = 'iPadOS';
      isTablet = true;
    } else if (/windows|win32|win64/i.test(ua)) {
      os = 'Windows';
      isMobile = false;
      isTablet = false;
    } else if (/macintosh|mac os/i.test(ua)) {
      os = 'macOS';
      isMobile = false;
    } else if (/cros/i.test(ua)) {
      os = 'ChromeOS';
      isMobile = false;
    } else if (/linux/i.test(ua)) {
      os = hasTouch ? 'Android' : 'Linux';
      if (hasTouch) isMobile = true;
    }

    let browser = 'Google Chrome';
    if (/edg/i.test(ua)) browser = 'Microsoft Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';
    else if (/firefox/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
    else if (/chrome/i.test(ua)) browser = 'Google Chrome';

    const deviceType = isTablet ? 'Tablet' : isMobile ? 'Mobile (Phone)' : 'Desktop (PC)';
    const deviceName = `${os} ${deviceType === 'Mobile (Phone)' ? 'Mobile' : deviceType === 'Tablet' ? 'Tablet' : 'PC'} • ${browser}`;

    return { os, browser, deviceType, deviceName };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      setIsLoginLoading(true);
      setError('');

      try {
        const clientDeviceInfo = getClientDeviceInfo();
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            clientDeviceInfo,
            website_url_hp: honeypot,
            interactionTimeMs: Date.now() - formStartTime,
          }),
        });
        const data = await res.json();

        if (res.status === 429 || data.isRateLimited) {
          setIsLoginLoading(false);
          if (data.remainingSeconds) {
            setLockoutRemaining(data.remainingSeconds);
          }
          setError(data.message || 'Too many failed login attempts. Please wait before trying again.');
          return;
        }

        if (res.ok && data.success) {
          setLockoutRemaining(0);
          const detectedRole = (data.role || (data.user?.role) || 'user').toLowerCase();
          const cleanEmail = (data.user?.email || email).trim().toLowerCase();
          sessionStorage.setItem('isAuthenticated', 'true');
          sessionStorage.setItem('userRole', detectedRole);
          sessionStorage.setItem('user_email', cleanEmail);
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('userRole', detectedRole);
          localStorage.setItem('user_email', cleanEmail);

          if (data.token) {
            sessionStorage.setItem('token', data.token);
            localStorage.setItem('token', data.token);
          }
          if (data.sessionToken) {
            sessionStorage.setItem('sessionToken', data.sessionToken);
            localStorage.setItem('sessionToken', data.sessionToken);
          }
          if (data.user) {
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('user_profile', JSON.stringify(data.user));
          }

          setTimeout(() => {
            if (detectedRole === 'super_admin' || detectedRole === 'admin' || detectedRole === 'staff') {
              window.location.href = '/aics';
            } else {
              window.location.href = '/portal/overview';
            }
          }, 1200);
        } else if (data.isInactive) {
          setIsLoginLoading(false);
          setInactiveUserPrompt({
            email: data.email || email,
            name: data.name || 'Resident',
          });
          return;
        } else {
          setIsLoginLoading(false);
          setError(data.message || 'Invalid credentials or account is not registered. Please register first.');
        }
      } catch (err) {
        setIsLoginLoading(false);
        setError('Network error connecting to backend. Please check your connection and try again.');
      }
    } else {
      setError('Please enter your email and password.');
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!resetEmail) {
      setResetError('Please enter your registered email address.');
      return;
    }

    if (!isNotRobot) {
      setResetError('Please verify that you are not a robot.');
      return;
    }

    // Buksan yung confirmation dialog (Image 3)
    setIsConfirmModalOpen(true);
  };

  const handleConfirmReset = async () => {
    setIsConfirmModalOpen(false);
    setIsResetLoading(true);
    setResetError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(true);
      } else {
        setResetError(data.message || 'Failed to send password reset email. Please try again.');
      }
    } catch (err) {
      console.error('Error in forgotPassword:', err);
      setResetError('Network error connecting to backend. Please check your connection.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setIsForgotPasswordOpen(false);
    setIsConfirmModalOpen(false);
    setResetEmail('');
    setIsNotRobot(false);
    setResetError('');
    setResetSuccess(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC] font-sans text-sm relative" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Left Hero Section */}
      <div
        className="w-full md:w-1/2 text-white p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-center items-center"
        style={{ backgroundColor: '#0B132B' }}
      >
        {/* Centered Government Seal Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden p-6">
          <div className="w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] lg:max-w-[480px] aspect-square flex items-center justify-center shrink-0 opacity-[0.22] md:opacity-[0.25]">
            <img
              src={governmentSealImage}
              alt="Government Seal"
              width={1080}
              height={1080}
              className="w-full h-full object-contain aspect-square shrink-0 select-none"
              style={{
                filter: 'brightness(1.8) contrast(1.4) saturate(0.8)',
                mixBlendMode: 'screen',
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between z-10 w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium transition-colors shrink-0"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="my-auto py-8 sm:py-12 z-10 max-w-lg text-center flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 sm:mb-4 leading-tight text-white text-center" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Social Services Management Portal
          </h1>
          <p className="text-slate-300/90 text-xs sm:text-sm md:text-base leading-relaxed font-normal text-center max-w-md">
            Streamlining community welfare, financial aid, and support programs for residents in need.
          </p>
        </div>

        <div className="text-[11px] text-slate-400 font-medium z-10 text-center w-full">
          © Social Services Management System • Community Care Portal
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 bg-[#F3F4F8]">
        <div className="w-full max-w-[440px] bg-white p-7 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200/80 border border-slate-100">

          <div className="text-left mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Sign in to access your social service dashboard
            </p>
          </div>

          {error && (
            <div className="p-3 mb-5 text-xs text-red-600 bg-red-50 rounded-xl border border-red-200 text-left font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left relative">
            {/* Invisible Honeypot Trap for Automated Bots */}
            <input
              type="text"
              name="website_url_hp"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              aria-hidden="true"
              className="opacity-0 absolute -z-50 pointer-events-none h-0 w-0"
            />
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase mb-2">
                EMAIL ADDRESS
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="w-full px-4 py-3 text-xs sm:text-sm bg-[#EEF2F6] hover:bg-[#E8EDF3] border border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordOpen(true);
                    setResetSuccess(false);
                    setResetEmail('');
                    setIsNotRobot(false);
                    setResetError('');
                    setIsConfirmModalOpen(false);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 pr-12 text-xs sm:text-sm bg-[#EEF2F6] hover:bg-[#E8EDF3] border border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer select-none p-1 rounded-lg hover:bg-slate-200/50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoginLoading || lockoutRemaining > 0}
                className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 cursor-pointer"
              >
                {lockoutRemaining > 0
                  ? `Locked (${lockoutRemaining}s)`
                  : isLoginLoading
                  ? 'Signing in...'
                  : 'Login'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-xs sm:text-[13px] text-slate-500 font-medium">
            Don't have an account?{' '}
            <a
              href="/register"
              onClick={handleRegisterClick}
              className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
            >
              Register here
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeForgotPasswordModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {resetSuccess ? (
              <div className="text-center py-2 animate-scale-up">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F3D5C] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Check your email
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                  We've dispatched a password reset link and 6-digit verification code to <span className="font-semibold text-slate-700">{resetEmail}</span>.
                </p>

                <div className="space-y-2.5">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" /> Open Gmail Inbox <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      closeForgotPasswordModal();
                      navigate(`/reset-password?email=${encodeURIComponent(resetEmail)}`);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" /> Enter Code / Set New Password
                  </button>

                  <button
                    type="button"
                    onClick={closeForgotPasswordModal}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs sm:text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F3D5C]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Forgot your password?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                    No worries! Simply provide your registered email to reset your password.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 sm:p-5">
                  <p className="text-center text-xs sm:text-sm font-semibold text-[#0F3D5C] mb-3">
                    Please enter your registered Email Address
                  </p>

                  {resetError && (
                    <div className="p-2.5 mb-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-200 text-center">
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handleResetSubmit} className="space-y-4 text-left">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Input your E-Mail Address"
                      className="w-full px-3 py-2.5 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-slate-700 text-left"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (isNotRobot) {
                          setIsNotRobot(false);
                          return;
                        }
                        setIsRecaptchaChallengeOpen(true);
                      }}
                      className="w-full flex items-center justify-between gap-3 border border-slate-300 rounded-lg bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isNotRobot ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-400'
                          }`}
                        >
                          {isNotRobot && (
                            <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
                              <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4L8.6 12l6.7-6.7a1 1 0 0 1 1.4 0z" />
                            </svg>
                          )}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-700 font-medium">
                          {isNotRobot ? 'Verified: I am not a robot' : "I'm not a robot"}
                        </span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium leading-tight text-right">
                        reCAPTCHA
                      </span>
                    </button>

                    <button
                      type="submit"
                      disabled={isResetLoading}
                      className="w-full py-2.5 px-4 bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] disabled:opacity-60 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-colors duration-200 cursor-pointer"
                    >
                      {isResetLoading ? 'Sending...' : 'Submit'}
                    </button>
                  </form>

                  <p className="text-center text-xs text-slate-500 mt-4">
                    Go back to{' '}
                    <button
                      type="button"
                      onClick={closeForgotPasswordModal}
                      className="text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer p-0"
                    >
                      Login page
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full border-2 border-sky-400 flex items-center justify-center text-sky-400">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="8" r="0.9" fill="currentColor" />
                  <rect x="11.1" y="10.5" width="1.8" height="6" rx="0.6" fill="currentColor" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-700 mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Password Reset Confirmation
            </h3>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 px-4 border border-amber-500 text-amber-600 hover:bg-amber-50 font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
          {isLoginLoading && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 sm:p-10 text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-700 mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Signing in
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 tracking-wide mb-6">
              PLEASE WAIT
            </p>
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      {isRegisterLoading && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 sm:p-10 text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-700 mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Loading
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 tracking-wide mb-6">
              PLEASE WAIT
            </p>
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* Interactive reCAPTCHA Modal Challenge */}
      <RecaptchaModal
        isOpen={isRecaptchaChallengeOpen}
        onClose={() => setIsRecaptchaChallengeOpen(false)}
        onVerifySuccess={() => {
          setIsNotRobot(true);
          setResetError('');
        }}
      />

      {/* Account Deactivated Reactivation Prompt Modal */}
      {inactiveUserPrompt && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Account is Deactivated
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Your account is currently deactivated. Would you like to reactivate it?
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Account Details:</div>
              <div className="font-bold text-slate-900">{inactiveUserPrompt.name}</div>
              <div className="font-mono text-slate-600 truncate">{inactiveUserPrompt.email}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInactiveUserPrompt(null)}
                disabled={isReactivating}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReactivateAndLogin}
                disabled={isReactivating}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isReactivating ? 'Reactivating...' : 'Reactivate & Sign In'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default Login;