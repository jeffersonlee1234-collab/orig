import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, User, Check, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '../../config/api';
import { applyTheme, getThemePreference, getEffectiveTheme } from '../../utils/theme';

type Step = 0 | 1 | 2;

const QC_BARANGAYS = [
  'Alicia', 'Amihan', 'Apolonio Samson', 'Baesa', 'Bagbag', 'Bagong Pag-Asa',
  'Bagong Silangan', 'Bagumbayan', 'Bagumbuhay', 'Bahay Toro', 'Balingasa',
  'Balong Bato', 'Batasan Hills', 'Bayanihan', 'Bagong Lipunan Ng Crame',
  'Blue Ridge A', 'Blue Ridge B', 'Botocan', 'Bungad', 'Camp Aguinaldo',
  'Capri', 'Central', 'Commonwealth', 'Culiat', 'Damar', 'Damayan',
  'Damayang Lagi', 'Del Monte', 'Dioquino Zobel', 'Don Manuel', 'Aurora',
  'Doña Imelda', 'Doña Josefa', 'Duyan-Duyan', 'E. Rodriguez', 'East Kamias',
  'Escopa I', 'Escopa II', 'Escopa III', 'Escopa IV', 'Fairview',
  'Greater Lagro', 'Gulod', 'Holy Spirit', 'Horseshoe',
  'Immaculate Concepcion', 'Kaligayahan', 'Kalusugan', 'Kamuning',
  'Katipunan', 'Kaunlaran', 'Kristong Hari', 'Krus Na Ligas', 'Laging Handa',
  'Libis', 'Lourdes', 'Loyola Heights', 'Maharlika', 'Malaya', 'Mangga',
  'Manresa', 'Mariana', 'Mariblo', 'Marilag', 'Masagana', 'Masambong',
  'Matandang Balara', 'Milagrosa', 'Nagkaisang Nayon', 'Nayong Kanluran',
  'New Era (Constitution Hills)', 'North Fairview', 'Novaliches Proper',
  'N.S. Amoranto (Gintong Silahis)', 'Obrero', 'Old Capitol Site',
  'Paang Bundok', 'Pag-Ibig Sa Nayon', 'Paligsahan', 'Paltok', 'Pansol',
  'Paraiso', 'Pasong Putik Proper', 'Pasong Tamo', 'Payatas', 'Phil-Am',
  'Pinagkaisahan', 'Pinyahan', 'Project 6', 'Quirino 2-A', 'Quirino 2-B',
  'Quirino 2-C', 'Quirino 3-A', 'Ramon Magsaysay', 'Roxas', 'Sacred Heart',
  'Saint Peter', 'Salvacion', 'San Agustin', 'San Antonio', 'San Bartolome',
  'San Isidro Labrador', 'San Jose', 'San Martin De Porres', 'San Roque',
  'San Vicente', 'Sangandaan', 'Santa Cruz', 'Santa Lucia', 'Santa Monica',
  'Santa Teresita', 'Santo Cristo', 'Santo Domingo', 'Santo Niño', 'Santol',
  'Sauyo', 'Sienna', 'Sikatuna Village', 'Silangan', 'Socorro',
  'South Triangle', 'Tagumpay', 'Talayan', 'Talipapa', 'Tandang Sora',
  'Tatalon', 'Teachers Village East', 'Teachers Village West', 'U.P. Campus',
  'U.P. Village', 'Ugong Norte', 'Unang Sigaw', 'Valencia', 'Vasra',
  'Veterans Village', 'Villa Maria Clara', 'West Kamias', 'West Triangle',
  'White Plains',
];


const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const REG_DRAFT_KEY = 'govserve_register_draft';

const getSavedDraft = () => {
  try {
    const raw = sessionStorage.getItem(REG_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const googleProfile = (location.state as { googleProfile?: { email: string; firstName: string; lastName: string } } | null)?.googleProfile;

  useEffect(() => {
    const syncTheme = () => {
      const mode = getThemePreference();
      const effectiveDark = getEffectiveTheme(mode);
      applyTheme(effectiveDark, false);
    };

    syncTheme();

    const interval = setInterval(syncTheme, 15000);
    window.addEventListener('theme_changed', syncTheme);
    window.addEventListener('storage', syncTheme);

    return () => {
      clearInterval(interval);
      window.removeEventListener('theme_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const [savedDraft] = useState(() => getSavedDraft());

  const [step, setStep] = useState<Step>(() => (savedDraft?.step === 1 ? 1 : 0));
  const [email, setEmail] = useState(() => savedDraft?.email || googleProfile?.email || '');
  const [otpSent, setOtpSent] = useState(() => savedDraft?.otpSent ?? false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resendMessage, setResendMessage] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const [firstName, setFirstName] = useState(() => savedDraft?.firstName ?? '');
  const [lastName, setLastName] = useState(() => savedDraft?.lastName ?? '');
  const [middleName, setMiddleName] = useState(() => savedDraft?.middleName ?? '');
  const [suffix, setSuffix] = useState(() => savedDraft?.suffix ?? '');
  const [birthMonth, setBirthMonth] = useState(() => savedDraft?.birthMonth ?? '');
  const [birthDay, setBirthDay] = useState(() => savedDraft?.birthDay ?? '');
  const [birthYear, setBirthYear] = useState(() => savedDraft?.birthYear ?? '');

  // Step 2 - Address
  const [city, setCity] = useState(() => savedDraft?.city ?? '');
  const [specifyCity, setSpecifyCity] = useState(() => savedDraft?.specifyCity ?? '');
  const [houseNo, setHouseNo] = useState(() => savedDraft?.houseNo ?? '');
  const [street, setStreet] = useState(() => savedDraft?.street ?? '');
  const [barangay, setBarangay] = useState(() => savedDraft?.barangay ?? '');

  // Step 2 - Employment Details
  const [workingInQC, setWorkingInQC] = useState<'Yes' | 'No' | ''>(() => savedDraft?.workingInQC ?? '');
  const [occupation, setOccupation] = useState(() => savedDraft?.occupation ?? '');
  const [sex, setSex] = useState(() => savedDraft?.sex ?? '');
  const [bloodType, setBloodType] = useState(() => savedDraft?.bloodType ?? '');
  const [mobileNumber, setMobileNumber] = useState(() => savedDraft?.mobileNumber ?? '09');

  // Step 2 - Login Credentials
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigatingToLogin, setIsNavigatingToLogin] = useState(false);

  const currentYear = new Date().getFullYear();
  const minBirthYear = currentYear - 110;
  const maxBirthYear = currentYear;

  const handleBirthDayChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 2);
    if (!cleaned) {
      setBirthDay('');
      return;
    }
    const val = parseInt(cleaned, 10);
    if (val > 31) {
      setBirthDay('31');
    } else {
      setBirthDay(cleaned);
    }
  };

  const handleBirthDayBlur = () => {
    if (birthDay) {
      const val = parseInt(birthDay, 10);
      if (isNaN(val) || val < 1) {
        setBirthDay('1');
      } else if (val > 31) {
        setBirthDay('31');
      }
    }
  };

  const handleBirthYearChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 4);
    setBirthYear(cleaned);
  };

  const handleBirthYearBlur = () => {
    if (birthYear && birthYear.length === 4) {
      const val = parseInt(birthYear, 10);
      if (val < minBirthYear) {
        setError(`Birth year cannot be earlier than ${minBirthYear} (maximum age limit of 110 years).`);
      } else if (val > maxBirthYear) {
        setError(`Birth year cannot be in the future (maximum year is ${maxBirthYear}).`);
      }
    }
  };

  // Sync draft state to sessionStorage whenever form changes so reload preserves step 1
  useEffect(() => {
    if (step === 2) {
      try {
        sessionStorage.removeItem(REG_DRAFT_KEY);
      } catch {}
      return;
    }
    try {
      sessionStorage.setItem(
        REG_DRAFT_KEY,
        JSON.stringify({
          step,
          email,
          otpSent,
          firstName,
          lastName,
          middleName,
          suffix,
          birthMonth,
          birthDay,
          birthYear,
          city,
          specifyCity,
          houseNo,
          street,
          barangay,
          workingInQC,
          occupation,
          sex,
          bloodType,
          mobileNumber,
        })
      );
    } catch {}
  }, [
    step,
    email,
    otpSent,
    firstName,
    lastName,
    middleName,
    suffix,
    birthMonth,
    birthDay,
    birthYear,
    city,
    specifyCity,
    houseNo,
    street,
    barangay,
    workingInQC,
    occupation,
    sex,
    bloodType,
    mobileNumber,
  ]);

  // Warn user before accidental page reload / navigation when on Step 1
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === 1) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  // Reset dependent fields when city changes.
  useEffect(() => {
    if (!city) {
      setSpecifyCity('');
      setHouseNo('');
      setStreet('');
      setBarangay('');
    }
  }, [city]);

  // Clear occupation whenever the person says they don't work in QC.
  useEffect(() => {
    if (workingInQC !== 'Yes') {
      setOccupation('');
    }
  }, [workingInQC]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. yourname@gmail.com).');
      return;
    }

    // Gmail specific rules
    if (trimmedEmail.toLowerCase().endsWith('@gmail.com')) {
      const username = trimmedEmail.toLowerCase().split('@')[0];
      if (username.length < 6 || username.length > 30) {
        setError('Invalid Gmail address. Gmail usernames must be between 6 and 30 characters.');
        return;
      }
      if (!/^[a-z0-9.]+$/.test(username) || username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
        setError('Invalid Gmail address format.');
        return;
      }
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          recipientName: googleProfile ? `${googleProfile.firstName} ${googleProfile.lastName}`.trim() : 'Resident',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        setOtpDigits(['', '', '', '', '', '']);
      } else {
        setError(data.message || 'Failed to send OTP. Please check your email address.');
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError('Failed to connect to backend server. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const maskEmail = (value: string) => {
    const [local, domain] = value.split('@');
    if (!local || !domain) return value;
    if (local.length <= 2) return `${local[0] ?? ''}*****@${domain}`;
    return `${local[0]}*****${local[local.length - 1]}@${domain}`;
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] ?? next[i] ?? '';
    }
    setOtpDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleResendCode = async () => {
    if (isResendingOtp) return;
    setError('');
    setOtpDigits(['', '', '', '', '', '']);
    setResendMessage('Sending a new code to your email...');
    setIsResendingOtp(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          recipientName: googleProfile ? `${googleProfile.firstName} ${googleProfile.lastName}`.trim() : 'Resident',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendMessage(`A new 6-digit code has been sent to ${email.trim()}.`);
        otpInputRefs.current[0]?.focus();
      } else {
        setError(data.message || 'Failed to resend OTP.');
      }
    } catch (err) {
      setError('Network error while resending OTP.');
    } finally {
      setIsResendingOtp(false);
    }
    setTimeout(() => setResendMessage(''), 5000);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otpCode: otp,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep(1);
      } else {
        setError(data.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Failed to verify OTP with server. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Password strength checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const hasMinLen = password.length >= 8;
  const passwordValid = hasLower && hasUpper && hasNumber && hasSpecial && hasMinLen;
  const confirmMismatch = confirmTouched && confirmPassword.length > 0 && confirmPassword !== password;

  const handleAccountInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConfirmTouched(true);

    if (!firstName || !lastName) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!middleName) {
      setError('Please enter your middle name.');
      return;
    }
    if (!birthMonth || !birthDay || !birthYear) {
      setError('Please complete your birth date.');
      return;
    }
    const dayNum = parseInt(birthDay, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError('Please enter a valid birth day between 1 and 31.');
      return;
    }
    const yearNum = parseInt(birthYear, 10);
    if (isNaN(yearNum) || birthYear.length < 4 || yearNum < minBirthYear || yearNum > maxBirthYear) {
      setError(`Please enter a valid birth year between ${minBirthYear} and ${maxBirthYear} (maximum age limit of 110 years).`);
      return;
    }
    if (!city) {
      setError('Please select your city.');
      return;
    }
    if (city === 'Others' && !specifyCity) {
      setError('Please specify your city.');
      return;
    }
    if (city === 'Quezon City' && !houseNo) {
      setError('Please enter your house number.');
      return;
    }
    if (!street || !barangay) {
      setError('Please complete your address.');
      return;
    }
    if (!workingInQC) {
      setError('Please indicate if you work in Quezon City.');
      return;
    }
    if (workingInQC === 'Yes' && !occupation) {
      setError('Please enter your occupation.');
      return;
    }
    if (!sex) {
      setError('Please select your sex.');
      return;
    }
    if (!mobileNumber || mobileNumber.length < 11) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (!passwordValid) {
      setError('Password does not meet the requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName,
          lastName,
          middleName,
          suffix,
          birthMonth,
          birthDay,
          birthYear,
          city,
          specifyCity,
          houseNo,
          street,
          barangay,
          workingInQC,
          occupation,
          sex,
          bloodType,
          mobileNumber,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Clear any old auth state so user must explicitly log in
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
        localStorage.removeItem('currentUser');
        setStep(2);
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error during registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    try {
      sessionStorage.removeItem(REG_DRAFT_KEY);
    } catch {}
    setIsNavigatingToLogin(true);
    setTimeout(() => {
      navigate('/login');
    }, 1200);
  };

  const inputClass =
    'w-full px-3 py-2.5 text-xs md:text-sm bg-white dark:bg-[#1B254B] border border-slate-300 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:bg-slate-100 dark:disabled:bg-[#141C3A] disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed';
  const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5';
  const requiredMark = <span className="text-red-500">*</span>;

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#070D1E] font-sans text-sm transition-colors duration-200" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* Header */}
        <div className="mb-10">
          <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium transition-colors shrink-0 pt-1"
            >
              ← Back
            </Link>

            <div className="text-center">
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white mb-3 leading-tight"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Create Your Account &amp; Start Using GovServe
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-1.5">
                Sign up today and enjoy secure, hassle-free access to GovServe
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                  Login Here
                </Link>
              </p>
            </div>

            <span
              aria-hidden="true"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium opacity-0 pointer-events-none shrink-0 pt-1"
            >
              ← Back
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">
            <span className={step >= 0 ? 'text-[#0F172A] dark:text-blue-400' : ''}>Email Verification</span>
            <span className={step >= 1 ? 'text-[#0F172A] dark:text-blue-400' : ''}>Account Information</span>
            <span className={step >= 2 ? 'text-[#0F172A] dark:text-blue-400' : ''}>Successful Registration</span>
          </div>
          <div className="flex items-center">
            {[0, 1, 2].map((s, idx) => (
              <React.Fragment key={s}>
                <div
                  className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-white transition-colors ${
                    step >= s ? 'bg-[#0F172A] dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
                {idx < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-colors ${
                      step > s ? 'bg-[#0F172A] dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-[#111C44] p-6 sm:p-10 min-h-105 flex flex-col items-center justify-center relative shadow-xl shadow-slate-200/50 dark:shadow-black/50 transition-colors duration-200">
          {error && (
            <div className="w-full max-w-sm p-3 mb-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 text-center space-y-1">
              <p>{error}</p>
              {error.toLowerCase().includes('already registered') && (
                <div className="pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Go to Sign In →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* STEP 0: Email Verification */}
          {step === 0 && (
            <div className="w-full max-w-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border-2 border-[#0F172A] dark:border-blue-500 bg-transparent dark:bg-blue-950/40 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-[#0F172A] dark:text-blue-400" />
              </div>
              <h2 className="text-base sm:text-lg text-slate-700 dark:text-slate-200 mb-6">
                Enter your <span className="font-bold text-[#0F172A] dark:text-white">Email Address</span>
              </h2>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="w-full space-y-4 text-left">
                  <div>
                    <label className={labelClass}>Email Address:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter Email Address"
                      className={inputClass}
                      required
                    />
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
                    Click the <span className="font-semibold text-slate-700 dark:text-slate-200">Send OTP</span> button below to receive the verification code in your email.
                  </p>
                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs md:text-sm rounded-lg shadow-sm transition-colors duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                    >
                      {isSendingOtp ? 'Sending…' : 'Send OTP'}
                    </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="w-full space-y-5 text-left">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center">
                    Please enter the <span className="font-bold text-slate-700 dark:text-slate-200">six-digit code</span> sent to{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{maskEmail(email)}</span>.
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="w-10 h-12 sm:w-11 sm:h-12 text-center text-base font-semibold bg-white dark:bg-[#1B254B] border border-slate-300 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all text-slate-800 dark:text-white"
                        aria-label={`Digit ${index + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs md:text-sm rounded-lg shadow-sm transition-colors duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-wait">
                    {isVerifyingOtp ? 'Verifying…' : 'Verify Code'}
                  </button>

                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Didn't receive a code?{' '}
                    <button
                      type="button"
                      disabled={isResendingOtp}
                      onClick={handleResendCode}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold bg-transparent border-none cursor-pointer p-0 disabled:opacity-50"
                    >
                      {isResendingOtp ? 'Sending...' : 'Resend Code'}
                    </button>
                  </p>

                  {resendMessage && (
                    <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">{resendMessage}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      try {
                        sessionStorage.removeItem(REG_DRAFT_KEY);
                      } catch {}
                    }}
                    className="w-full text-center text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:underline font-medium bg-transparent border-none cursor-pointer p-0"
                  >
                    Use a different email
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 1: Account Information */}
          {step === 1 && (
            <div className="w-full max-w-2xl">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-[#0F172A] dark:border-blue-500 bg-transparent dark:bg-blue-950/40 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-[#0F172A] dark:text-blue-400" />
                </div>
                <h2 className="text-base sm:text-lg text-slate-700 dark:text-slate-200">
                  Complete your <span className="font-bold text-[#0F172A] dark:text-white">Account Information</span>
                </h2>
              </div>

              <form onSubmit={handleAccountInfoSubmit} className="w-full space-y-6 text-left">

                {/* Personal Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white border-b border-slate-200 dark:border-slate-700/80 pb-2">
                    Personal Details
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className={labelClass}>{requiredMark} First name:</label>
                      <input
                        type="text"
                        value={firstName}
                        maxLength={50}
                        onChange={(e) => setFirstName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, '').slice(0, 50))}
                        placeholder="Enter first name"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{requiredMark} Last name:</label>
                      <input
                        type="text"
                        value={lastName}
                        maxLength={50}
                        onChange={(e) => setLastName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, '').slice(0, 50))}
                        placeholder="Enter last name"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{requiredMark} Middle name:</label>
                      <input
                        type="text"
                        value={middleName}
                        maxLength={30}
                        onChange={(e) => setMiddleName(e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, '').slice(0, 30))}
                        placeholder="Enter middle name"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Suffix:</label>
                      <input
                        type="text"
                        value={suffix}
                        maxLength={20}
                        onChange={(e) => setSuffix(e.target.value.replace(/[^a-zA-Z0-9.\s-]/g, '').slice(0, 20))}
                        placeholder="Enter suffix (e.g. Jr., III)"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{requiredMark} Birth Date</label>
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="">Month</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={birthDay}
                        onChange={(e) => handleBirthDayChange(e.target.value)}
                        onBlur={handleBirthDayBlur}
                        placeholder="Day (1-31)"
                        className={inputClass}
                        required
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={birthYear}
                        onChange={(e) => handleBirthYearChange(e.target.value)}
                        onBlur={handleBirthYearBlur}
                        placeholder={`Year (${minBirthYear}-${maxBirthYear})`}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white border-b border-slate-200 dark:border-slate-700/80 pb-2">
                    Address
                  </h3>

                  <div className={`grid gap-4 ${city === 'Others' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                      <label className={labelClass}>{requiredMark} City:</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="">- Select City -</option>
                        <option value="Quezon City">Quezon City</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    {city === 'Others' && (
                      <div>
                        <label className={labelClass}>{requiredMark} Specify your city:</label>
                        <input
                          type="text"
                          value={specifyCity}
                          onChange={(e) => setSpecifyCity(e.target.value)}
                          placeholder="Specify here"
                          className={inputClass}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className={`grid gap-4 ${city === 'Quezon City' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {city === 'Quezon City' && (
                      <div>
                        <label className={labelClass}>{requiredMark} House No.:</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={houseNo}
                          onChange={(e) => setHouseNo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Enter House No."
                          className={inputClass}
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className={labelClass}>{requiredMark} Street:</label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Enter Street"
                        disabled={!city}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>{requiredMark} Barangay:</label>
                      {city === 'Quezon City' ? (
                        <select
                          value={barangay}
                          onChange={(e) => setBarangay(e.target.value)}
                          className={inputClass}
                          required
                        >
                          <option value="">- Select Barangay -</option>
                          {QC_BARANGAYS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={barangay}
                          onChange={(e) => setBarangay(e.target.value)}
                          placeholder="Input barangay"
                          disabled={!city}
                          className={inputClass}
                          required
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white border-b border-slate-200 dark:border-slate-700/80 pb-2">
                    Employment Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>{requiredMark} Are you working in Quezon City?</label>
                      <div className="flex items-center gap-5 mt-1">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="workingInQC"
                            checked={workingInQC === 'Yes'}
                            onChange={() => setWorkingInQC('Yes')}
                            className="accent-blue-600"
                          />
                          Yes
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="workingInQC"
                            checked={workingInQC === 'No'}
                            onChange={() => setWorkingInQC('No')}
                            className="accent-blue-600"
                          />
                          No
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Occupation</label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="Enter occupation"
                        disabled={workingInQC !== 'Yes'}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>{requiredMark} Sex</label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="">Select Sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Blood Type</label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select Blood Type</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="Unknown">Unknown / Not Sure</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{requiredMark} Mobile Number:</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="09XXXXXXXXX"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white pt-4">
                    Login Credentials
                  </h3>

                  <div>
                    <label className={labelClass}>Email Address:</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>{requiredMark} Password:</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          placeholder="Enter password"
                          className={`${inputClass} pr-10`}
                          required
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>{requiredMark} Confirm Password:</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setConfirmTouched(true)}
                          placeholder="Enter password confirmation"
                          className={`${inputClass} pr-10 ${confirmMismatch ? 'border-red-400 focus:ring-red-500' : ''}`}
                          required
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmMismatch && (
                        <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">Invalid.</p>
                      )}
                    </div>
                  </div>

                  {(passwordFocused || password.length > 0) && (
                    <div className="bg-slate-50 dark:bg-[#141C3A] border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Password must contain the following:</p>
                      <PasswordRule met={hasLower} label="A lowercase letter" />
                      <PasswordRule met={hasUpper} label="A capital (uppercase) letter" />
                      <PasswordRule met={hasNumber} label="A number" />
                      <PasswordRule met={hasSpecial} label="A special character (e.g. !@#$%^&*)" />
                      <PasswordRule met={hasMinLen} label="Minimum 8 characters" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs md:text-sm rounded-lg shadow-sm transition-colors duration-200 cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-wait"
                >
                  {isSubmitting ? 'Submitting…' : 'Next'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Successful Registration */}
          {step === 2 && (
            <div className="w-full max-w-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-white mb-2">
                Registration Successful
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Your resident account has been created. You can now log in and access QC eServices.
              </p>

              <div className="w-full bg-slate-50 dark:bg-[#141C3A] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-left mb-6">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">Registered email</p>
                <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{email}</p>
              </div>

              <button
                onClick={handleBackToLogin}
                disabled={isNavigatingToLogin}
                className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs md:text-sm rounded-lg shadow-sm transition-colors duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
              >
                {isNavigatingToLogin ? 'Redirecting…' : 'Back to Login'}
              </button>
            </div>
          )}

        </div>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs px-4">
          <div className="bg-white dark:bg-[#111C44] border border-transparent dark:border-slate-800 rounded-xl shadow-2xl px-10 py-8 flex flex-col items-center text-center w-full max-w-xs">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white mb-1">Loading</h3>
            <p className="text-xs font-medium text-slate-400 tracking-widest mb-5">PLEASE WAIT</p>
            <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
};

const PasswordRule = ({ met, label }: { met: boolean; label: string }) => (
  <p className={`text-[11px] flex items-center gap-1.5 ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
    <Check className={`w-3 h-3 ${met ? 'opacity-100' : 'opacity-40'}`} />
    <span>{label}</span>
  </p>
);

export default Register;