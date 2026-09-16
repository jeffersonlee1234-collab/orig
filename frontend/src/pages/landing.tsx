import { useState, useEffect } from 'react';
import {
  ArrowRight,
  MapPin,
  Home,
  FileCheck,
  ClipboardCheck,
  Construction,
  Sun,
  Moon,
} from 'lucide-react';
import { getInitialTheme, applyTheme, getThemePreference, getEffectiveTheme, setThemeMode } from '../utils/theme';

// 5 capability cards — matches docx §8 "Landing Page Feature Cards".
// Layout: row 1 = 3 cards, row 2 = 2 cards (centered), each card offset
// vertically to create a zigzag rhythm down the grid (docx §7 "Feature grid").
const features = [
  { icon: MapPin, title: 'AICS', description: 'Crisis assistance for medical, burial, and educational needs', tint: 'violet' },
  { icon: Home, title: 'PWD & Senior Citizen', description: 'ID issuance and social pension enrollment', tint: 'emerald' },
  { icon: FileCheck, title: 'Solo Parent & Child Welfare', description: 'Solo parent and child welfare monitoring', tint: 'rose' },
  { icon: ClipboardCheck, title: 'Livelihood & Training', description: 'Skills training and starter kit assistance', tint: 'amber' },
  { icon: Construction, title: 'Financial Aid Disbursement', description: 'Release tracking across all assistance programs', tint: 'sky' },
] as const;

const TINT: Record<string, string> = {
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

const stats = [
  { value: '100%', label: 'Digital Process', desc: 'Paperless & Seamless' },
  { value: '24/7', label: 'System Access', desc: 'Available Anytime' },
  { value: '5 Core', label: 'Welfare Programs', desc: 'Integrated Services' },
  { value: 'Real-Time', label: 'Status Updates', desc: 'Instant Tracking' },
];

const TYPEWRITER_WORDS = ['AICS', 'PWD & Senior Citizen', 'Solo Parent & Child Welfare', 'Livelihood', 'Financial Aid'];

function useTypewriter(words: string[], typingMs = 90, pauseMs = 1400, deletingMs = 45) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');

  useEffect(() => {
    const current = words[wordIndex];
    if (phase === 'typing') {
      if (text.length < current.length) {
        const t = setTimeout(() => setText(current.slice(0, text.length + 1)), typingMs);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('pausing'), pauseMs);
      return () => clearTimeout(t);
    }
    if (phase === 'pausing') {
      const t = setTimeout(() => setPhase('deleting'), pauseMs);
      return () => clearTimeout(t);
    }
    if (text.length > 0) {
      const t = setTimeout(() => setText(current.slice(0, text.length - 1)), deletingMs);
      return () => clearTimeout(t);
    }
    setWordIndex((i) => (i + 1) % words.length);
    setPhase('typing');
  }, [text, phase, wordIndex, words, typingMs, pauseMs, deletingMs]);

  return text;
}

// Scattered decorative icons — purely atmospheric, low-opacity.
const FLOATING = [
  { Icon: Home, top: '10%', left: '5%', color: 'text-emerald-500/20', size: 26, delay: '0s' },
  { Icon: MapPin, top: '78%', left: '92%', color: 'text-sky-500/20', size: 20, delay: '-2s' },
  { Icon: ClipboardCheck, top: '58%', left: '4%', color: 'text-primary/10', size: 18, delay: '-3s' },
];

export function LandingPage() {
  const typewriterText = useTypewriter(TYPEWRITER_WORDS);
  const [dark, setDark] = useState(() => getInitialTheme());

  useEffect(() => {
    const syncTheme = () => {
      const mode = getThemePreference();
      const effectiveDark = getEffectiveTheme(mode);
      setDark(effectiveDark);
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

  const handleToggleDark = () => {
    const nextDark = !dark;
    setThemeMode(nextDark ? 'dark' : 'light');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Grid pattern overlay — docx §7 "grid pattern overlay" */}
      <div
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      {/* Floating decorative icons */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {FLOATING.map(({ Icon, top, left, color, size, delay }, i) => (
          <div key={i} className={`absolute ${color} animate-float`} style={{ top, left, animationDelay: delay }}>
            <Icon size={size} />
          </div>
        ))}
      </div>

      {/* Top navigation — docx §7 "logo mark, wordmark, theme toggle", centered max-w-6xl */}
      <header className="max-w-6xl mx-auto px-4 py-4">
        <nav className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/samples/Government Service Integrity Seal.png"
              alt="Government Seal"
              className="h-8 w-8 md:h-9 md:w-9 object-contain shrink-0"
            />
            <span className="font-heading text-xs md:text-base font-bold whitespace-nowrap">
              Social Services <br className="md:hidden" /> Management
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-16 text-center">
        <div className="mx-auto max-w-4xl">

          {/* H1 — responsive 30/36/48/60px (text-3xl -> sm:4xl -> md:5xl -> lg:6xl) */}
          <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl tracking-tight">
            <span className="block">Social Services</span>
            <div className="h-[1.35em] flex items-center justify-center my-1.5 overflow-hidden">
              <span className="inline-flex items-center justify-center whitespace-nowrap bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent px-2">
                <span>{typewriterText || '\u00A0'}</span>
                <span className="inline-block h-[0.82em] w-0.75 sm:w-1 bg-primary/70 animate-pulse ml-1 shrink-0" aria-hidden="true" />
              </span>
            </div>
            <span className="block">Made Simple</span>
          </h1>

          {/* Description — 16-20px muted centered */}
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            A comprehensive digital platform for crisis assistance, PWD and senior citizen
            services, solo parent support, livelihood training, and financial aid disbursement.
          </p>

          {/* Primary CTA — 48-56px height, rounded-2xl, blue shadow */}
          <button
            onClick={() => {
              const isAuth = sessionStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
              const role = (sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || '').toLowerCase();
              if (isAuth) {
                const isStaff = role === 'staff' || role === 'admin' || role === 'super_admin';
                window.location.href = isStaff ? '/aics' : '/portal/overview';
              } else {
                window.location.href = '/login';
              }
            }}
            className="mt-8 inline-flex items-center gap-2 h-13 px-7 rounded-2xl cursor-pointer bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
          >
            Access the Portal
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Feature grid — single flex-wrap row; cards match a 1/2/3-col width so the
            last row's 2 cards wrap naturally and center themselves (no manual offsets). */}
        <div className="mt-14 flex flex-wrap justify-center gap-4 max-w-4xl mx-auto text-left">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:-translate-y-1 hover:shadow-medium sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6667rem)]"
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${TINT[f.tint]}`}>
                <f.icon size={20} />
              </div>
              <h3 className="relative text-sm font-semibold sm:text-base">{f.title}</h3>
              <p className="relative mt-1 text-xs text-muted-foreground sm:text-sm">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Stats — Premium Glassmorphic Metric Strip */}
        <div className="mt-16 max-w-4xl mx-auto rounded-3xl border border-border/70 bg-card/75 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-black/5 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative flex flex-col items-center justify-center py-6 px-4 transition-all duration-300 hover:bg-primary/5 text-center"
              >
                <div className="flex items-center justify-center">
                  <span className="whitespace-nowrap text-2xl sm:text-3xl font-extrabold tracking-tight bg-linear-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                    {stat.value}
                  </span>
                </div>
                <p className="mt-2 text-xs sm:text-sm font-semibold text-foreground tracking-tight leading-tight">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground font-normal">
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer — thin top border, muted text */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 Social Services Management System. Secure Government Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;