import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Pill, Plus, Search, Menu, X, Bell, BellRing, LayoutDashboard, Stethoscope, Landmark, Utensils, Trash2, Loader2,
  Languages, Droplets, Eye, Sparkles, Clock, Flame, Zap, Activity, PlusCircle, ChevronDown, Edit2,
  Heart, Wallet, ShieldAlert, CreditCard, ChevronLeft, ChevronRight, ArrowRight, ArrowLeftRight,
  User as UserIcon, LogOut, CheckCircle2, Salad, Smartphone, Globe, Cloud, Moon, Sun, ShieldCheck,
  BarChart3, Settings, Info, HelpCircle, Apple, Pizza, Coffee
} from 'lucide-react';


import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

// --- System Configuration & Helpers ---
const CAIRO_COORDS = new Coordinates(30.0444, 31.2357);
const PRAYER_PARAMS = CalculationMethod.Egyptian();

/** 
 * Gets the "Effective Today" based on Fajr prayer time.
 * If current time is before Fajr, the effective date is yesterday.
 */
const getSystemToday = () => {
  const now = new Date();
  const prayerTimes = new PrayerTimes(CAIRO_COORDS, now, PRAYER_PARAMS);
  const fajr = prayerTimes.fajr;

  const effectiveDate = new Date(now);
  if (now < fajr) {
    effectiveDate.setDate(now.getDate() - 1);
  }

  const y = effectiveDate.getFullYear();
  const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
  const d = String(effectiveDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const GlobalStyles = () => (
  <style>{`
    /* Hide number input spinners globally */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none !important;
      margin: 0 !important; 
    }
    input[type=number] {
      -moz-appearance: textfield !important;
      appearance: none !important;
    }

    /* Custom Scrollbar for better UX */
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      display: block !important;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(var(--md-sys-color-surface-variant-rgb), 0.1);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(var(--md-sys-color-primary-rgb), 0.3);
      border-radius: 10px;
      border: 1px solid rgba(var(--md-sys-color-surface-rgb), 0.1);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(var(--md-sys-color-primary-rgb), 0.5);
    }
  `}</style>
);

import {
  auth,
  db,
  googleProvider,
  WHITELISTED_EMAIL
} from './lib/firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  collection, addDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, getDocs, setDoc, runTransaction, where, doc, serverTimestamp, type Timestamp
} from 'firebase/firestore';



// --- Types ---

type AppMode = 'AUTH' | 'LOADING' | 'DASHBOARD' | 'MEDICAL' | 'FINANCIAL' | 'NUTRITION';


// Medicine schedule definition
const MEDICINE_SCHEDULE = [
  {
    id: 'thyroid',
    nameLine1: 'علاج الغده',
    nameLine2: 'Thyroid Treatment',
    Icon: Pill,
    colorText: 'text-blue-400' as const,
    colorBg: 'bg-blue-400/10' as const,
    colorBorder: 'border-blue-400/30' as const,
    instruction: 'حبة واحدة قبل الفطار مباشرةً',
    frequency: 'daily' as const,
    weekDays: null as number[] | null,
    doses: [
      { idx: 0, time: '07:00', displayTime: '7:00 ص', note: 'قبل الإفطار' }
    ]
  },
  {
    id: 'fortymox',
    nameLine1: 'Fortymox',
    nameLine2: 'قطرة • ٤ مرات يومياً',
    Icon: Droplets,
    colorText: 'text-cyan-400' as const,
    colorBg: 'bg-cyan-400/10' as const,
    colorBorder: 'border-cyan-400/30' as const,
    instruction: '٤ قطرات — فجوة ٣٠ دقيقة عن العلاج الآخر',
    frequency: 'daily' as const,
    weekDays: null as number[] | null,
    doses: [
      { idx: 0, time: '09:00', displayTime: '9:00 ص', note: 'الجرعة الأولى' },
      { idx: 1, time: '13:00', displayTime: '1:00 م', note: 'الجرعة الثانية' },
      { idx: 2, time: '17:00', displayTime: '5:00 م', note: 'الجرعة الثالثة' },
      { idx: 3, time: '21:00', displayTime: '9:00 م', note: 'الجرعة الرابعة' },
    ]
  },
  {
    id: 'ojoalivato',
    nameLine1: 'Ojoalivato',
    nameLine2: 'قطرة • ٣ مرات يومياً',
    Icon: Eye,
    colorText: 'text-emerald-400' as const,
    colorBg: 'bg-emerald-400/10' as const,
    colorBorder: 'border-emerald-400/30' as const,
    instruction: '٣ قطرات — ٣٠ دقيقة بعد Fortymox',
    frequency: 'daily' as const,
    weekDays: null as number[] | null,
    doses: [
      { idx: 0, time: '09:30', displayTime: '9:30 ص', note: 'الجرعة الأولى' },
      { idx: 1, time: '13:30', displayTime: '1:30 م', note: 'الجرعة الثانية' },
      { idx: 2, time: '17:30', displayTime: '5:30 م', note: 'الجرعة الثالثة' },
    ]
  },
  {
    id: 'justin',
    nameLine1: 'شامبو Justin',
    nameLine2: 'Justin Shampoo',
    Icon: Sparkles,
    colorText: 'text-violet-400' as const,
    colorBg: 'bg-violet-400/10' as const,
    colorBorder: 'border-violet-400/30' as const,
    instruction: 'مرتين بالأسبوع — الأربعاء والسبت',
    frequency: 'weekly' as const,
    weekDays: [3, 6] as number[] | null, // Wednesday=3, Saturday=6
    doses: [
      { idx: 0, time: '22:00', displayTime: '10:00 م', note: 'وقت الاستحمام (مساءً)' }
    ]
  },
];

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

interface FinancialEntry {
  id: string;
  type: string;
  amount: number;
  currency: string;
  source: string;
  date: string;
  accountId: string;
  createdAt: Timestamp | null;
  status?: 'COMPLETED' | 'PENDING';
}

interface AccountSnapshot {
  id: string;
  nameAr: string;
  nameEn: string;
  balance: number;
}

interface NutritionEntry {
  id: string;
  name: string;
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Timestamp | null;
}

interface MedicalRecord {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  date: string;
  createdAt: any;
}

// --- Shared Components ---

const DateNavigator = ({ selectedDate, setSelectedDate, isArabic, todayStr }: {
  selectedDate: string,
  setSelectedDate: (d: string) => void,
  isArabic: boolean,
  todayStr: string
}) => {
  const isToday = selectedDate === todayStr;
  const isYesterday = selectedDate === formatDateLocal(new Date(Date.now() - 86400000));

  const adjustDate = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const next = formatDateLocal(d);
    if (next <= todayStr) setSelectedDate(next);
  };

  const getDateLabel = () => {
    if (isToday) return isArabic ? 'اليوم' : 'Today';
    if (isYesterday) return isArabic ? 'أمس' : 'Yesterday';
    return new Date(selectedDate + 'T12:00:00').toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => adjustDate(-1)}
            className="w-10 h-10 rounded-2xl bg-surface-variant/30 border border-outline-variant/10 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all text-on-surface-variant"
          >
            <ChevronRight size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-headline font-black text-on-surface">{getDateLabel()}</h1>
              {isToday && (
                <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  {isArabic ? 'الآن' : 'LIVE'}
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold tracking-[0.35em] text-primary/50 uppercase mt-1">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => adjustDate(1)}
            disabled={isToday}
            className="w-10 h-10 rounded-2xl bg-surface-variant/30 border border-outline-variant/10 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all text-on-surface-variant disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => { if (e.target.value <= todayStr) setSelectedDate(e.target.value); }}
            className="recessed-input text-xs py-2.5 px-4"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-5 py-2.5 rounded-2xl bg-primary text-surface font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              {isArabic ? '← اليوم' : 'Back to Today →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Components ---

// --- Reusable UI: Custom Select ---

const OSSelect = ({ options, value, onChange, isArabic, icon: Icon, className }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((o: any) => o.value === value);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Since the Portal container is 'fixed', we use viewport coordinates (no scroll offset needed)
      setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full recessed-input text-sm py-4 px-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={16} className="text-primary/60" />}
          <span className="font-bold">{isArabic ? selectedOption?.labelAr || selectedOption?.label : selectedOption?.label}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={14} className="opacity-40" />
        </motion.div>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" onClick={() => setIsOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            style={{ top: coords.top + 8, left: coords.left, width: coords.width }}
            className="absolute z-[101] bg-surface-container-high rounded-3xl border border-outline-variant shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar overscroll-contain pointer-events-auto"
          >
            {options.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={cn(
                  "w-full p-5 flex items-center gap-4 transition-all hover:bg-primary/5 text-on-surface group",
                  value === opt.value && "bg-primary/10"
                )}
                dir={isArabic ? 'rtl' : 'ltr'}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  value === opt.value ? "bg-primary scale-100" : "bg-transparent scale-0"
                )} />
                <div className="flex items-center gap-3 flex-1">
                  {opt.icon && <opt.icon size={16} className={cn("flex-shrink-0", value === opt.value ? "text-primary" : "text-on-surface-variant/40")} />}
                  <span className={cn(
                    "text-sm transition-colors whitespace-nowrap",
                    value === opt.value ? "font-black text-primary" : "font-bold text-on-surface-variant"
                  )}>
                    {isArabic ? opt.labelAr || opt.label : opt.label}
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-surface flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="text-primary animate-spin" size={48} />
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Verifying Identity...</p>
    </div>
  </div>
);

// --- Bottom Navigation ---

const BottomNav = ({ activeMode, setMode, isArabic }: {
  activeMode: AppMode,
  setMode: (m: AppMode) => void,
  isArabic: boolean
}) => {
  const items = [
    { id: 'DASHBOARD', icon: LayoutDashboard, labelAr: 'الرئيسية', labelEn: 'Dashboard', color: 'text-indigo-400', activeBg: 'bg-indigo-400/20' },
    { id: 'NUTRITION', icon: Utensils, labelAr: 'التغذية', labelEn: 'Nutrition', color: 'text-emerald-400', activeBg: 'bg-emerald-400/20' },
    { id: 'FINANCIAL', icon: Landmark, labelAr: 'المالية', labelEn: 'Financial', color: 'text-primary', activeBg: 'bg-primary/20' },
    { id: 'MEDICAL', icon: Pill, labelAr: 'الطبي', labelEn: 'Medical', color: 'text-blue-400', activeBg: 'bg-blue-400/20' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-surface-container/95 backdrop-blur-2xl border border-outline-variant/40 rounded-3xl flex shadow-2xl shadow-black/60 overflow-hidden">
        {items.map((item) => {
          const isActive = activeMode === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setMode(item.id as AppMode)}
              whileTap={{ scale: 0.90 }}
              className="flex-1 flex flex-col items-center justify-center py-3.5 gap-1 relative overflow-hidden"
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    key="bg"
                    layoutId="active-nav-bg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn('absolute inset-1 rounded-2xl', item.activeBg)}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </AnimatePresence>
              <item.icon
                size={22}
                className={cn('relative z-10 transition-all duration-300', isActive ? item.color : 'text-on-surface-variant/40')}
              />
              <span className={cn('relative z-10 text-[10px] font-bold tracking-wider transition-all duration-300', isActive ? item.color : 'text-on-surface-variant/40')}>
                {isArabic ? item.labelAr : item.labelEn}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

// --- Top Bar ---

const TopBar = ({ title, isArabic, toggleLanguage, user, onLogout }: {
  title: string,
  isArabic: boolean,
  toggleLanguage: () => void,
  user: FirebaseUser | null,
  onLogout: () => void
}) => (
  <header
    className="fixed top-0 left-0 right-0 h-16 z-40 bg-surface/90 backdrop-blur-xl flex items-center px-5 border-b border-outline-variant"
    dir={isArabic ? 'rtl' : 'ltr'}
  >
    {/* Brand */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="text-primary font-headline font-black text-sm tracking-widest uppercase">
        {isArabic ? 'نظامي' : 'Personal OS'}
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
    </div>

    {/* Centre title */}
    <div className="flex-1 text-center">
      <span className="text-[10px] font-black tracking-widest text-on-surface uppercase hidden sm:inline">
        {title}
      </span>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg border border-outline-variant hover:border-primary text-[10px] font-bold"
      >
        <Languages size={13} />
        <span>{isArabic ? 'EN' : 'عر'}</span>
      </button>
      <div className="relative group">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-8 h-8 rounded-full border-2 border-outline-variant object-cover cursor-pointer"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center">
            <UserIcon size={16} className="text-on-surface-variant" />
          </div>
        )}
        <button
          onClick={onLogout}
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface-container border border-red-500/40 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          title={isArabic ? 'تسجيل الخروج' : 'Sign Out'}
        >
          <LogOut size={9} />
        </button>
      </div>
    </div>
  </header>
);

// --- View: Auth ---

const AuthView = ({ onLogin, isLoading, error, isArabic }: { onLogin: () => void, isLoading: boolean, error: string | null, isArabic: boolean }) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-surface-bright/20 blur-[120px] rounded-full pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] glass-card p-10 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="font-headline font-bold text-4xl tracking-tight text-on-surface mb-3">
            {isArabic ? 'مرحباً بعودتك' : 'Welcome Back'}
          </h1>
          <p className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-bold">
            {isArabic ? 'ادخل إلى مساحتك الرقمية' : 'Access your digital sanctuary'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
          >
            <ShieldAlert size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400 font-bold">{error}</p>
          </motion.div>
        )}
        <button
          onClick={onLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-4 py-4 px-6 rounded-xl bg-surface-container-highest border border-outline-variant hover:bg-surface-bright transition-all group mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin text-primary" />
          ) : (
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-5 h-5"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-sm font-bold tracking-tight text-on-surface">
            {isLoading ? (isArabic ? 'جاري التحقق...' : 'Authenticating...') : (isArabic ? 'تسجيل الدخول بجوجل' : 'Sign in with Google')}
          </span>
        </button>

        <div className="flex items-center gap-4 opacity-30 justify-center">
          <div className="h-[1px] flex-1 bg-on-surface" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{isArabic ? 'بروتوكول آمن' : 'Secure Protocol'}</span>
          <div className="h-[1px] flex-1 bg-on-surface" />
        </div>
      </motion.div>
    </div>
  );
};


// --- View: Dashboard ---

const DashboardView = ({ userId, isArabic, setMode, selectedDate, setSelectedDate, viewMode, setViewMode }: { 
  userId: string, 
  isArabic: boolean, 
  setMode: (m: AppMode) => void,
  selectedDate: string,
  setSelectedDate: (d: string) => void,
  viewMode: 'DAILY' | 'WEEKLY',
  setViewMode: (v: 'DAILY' | 'WEEKLY') => void
}) => {
  const todayStr = getSystemToday();
  const dashDate = selectedDate; 
  const setDashDate = setSelectedDate;

  const [medData, setMedData] = useState<{ checked: number, total: number }>({ checked: 0, total: 0 });
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [nutLoading, setNutLoading] = useState(true);
  const [finLoading, setFinLoading] = useState(true);

  // Weekly Stats State
  const [weeklyMed, setWeeklyMed] = useState({ checked: 0, total: 0 });
  const [weeklyNut, setWeeklyNut] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
  const [weeklyFin, setWeeklyFin] = useState({ income: 0, expense: 0 });
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = isArabic
    ? hour < 12 ? 'صباح الخير ☀️' : hour < 17 ? 'مساء النور 🌤️' : 'مساء الخير 🌙'
    : hour < 12 ? 'Good Morning ☀️' : hour < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';

  const isToday = dashDate === todayStr;
  
  // Weekly aggregation logic
  useEffect(() => {
    if (viewMode !== 'WEEKLY') return;
    
    setWeeklyLoading(true);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(dashDate + 'T12:00:00');
      d.setDate(d.getDate() - i);
      return formatDateLocal(d);
    });

    const fetchWeekly = async () => {
      try {
        // 1. Weekly Medical
        let wChecked = 0;
        let wTotal = 0;
        for (const dStr of last7Days) {
          const mSnap = await getDoc(doc(db, `users/${userId}/medcheck`, dStr));
          if (mSnap.exists()) {
            wChecked += Object.values(mSnap.data()).filter(v => v === true).length;
          }
          wTotal += MEDICINE_SCHEDULE.reduce((sum, med) => {
            const isScheduled = med.frequency === 'daily' || (med.weekDays && med.weekDays.includes(new Date(dStr + 'T12:00:00').getDay()));
            return sum + (isScheduled ? med.doses.length : 0);
          }, 0);
        }
        setWeeklyMed({ checked: wChecked, total: wTotal });

        // 2. Weekly Nutrition
        const startOf7 = new Date(last7Days[6] + 'T00:00:00');
        const endOf7 = new Date(last7Days[0] + 'T23:59:59');
        const nQuery = query(collection(db, `users/${userId}/nutrition`), where('createdAt', '>=', startOf7), where('createdAt', '<=', endOf7));
        const nSnap = await getDocs(nQuery);
        const nData = nSnap.docs.reduce((acc, d) => {
          const entry = d.data();
          return {
            calories: acc.calories + (entry.calories || 0),
            protein: acc.protein + (entry.protein || 0),
            carbs: acc.carbs + (entry.carbs || 0),
            fat: acc.fat + (entry.fat || 0),
            count: acc.count + 1
          };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
        setWeeklyNut(nData);

        // 3. Weekly Financial
        const fQuery = query(collection(db, `users/${userId}/financial`), where('date', '>=', last7Days[6]), where('date', '<=', last7Days[0]));
        const fSnap = await getDocs(fQuery);
        const fData = fSnap.docs.reduce((acc, d) => {
          const entry = d.data();
          const isExp = entry.type === 'Expense' || entry.type === 'Debt (Owed To Someone)' || entry.type === 'Loan Given (Expense)';
          return {
            income: acc.income + (!isExp ? entry.amount : 0),
            expense: acc.expense + (isExp ? entry.amount : 0)
          };
        }, { income: 0, expense: 0 });
        setWeeklyFin(fData);

      } catch (err) {
        console.error("Weekly fetch error:", err);
      } finally {
        setWeeklyLoading(false);
      }
    };

    fetchWeekly();
  }, [viewMode, userId, dashDate]);

  // Accurate total doses
  const totalDoses = MEDICINE_SCHEDULE.reduce((sum, med) => {
    const isScheduled = med.frequency === 'daily' || (med.weekDays && med.weekDays.includes(new Date(dashDate + 'T12:00:00').getDay()));
    return sum + (isScheduled ? med.doses.length : 0);
  }, 0);

  useEffect(() => {
    setLoading(true);
    setNutLoading(true);
    setFinLoading(true);

    // 1. Medical data
    const medUnsub = onSnapshot(doc(db, `users/${userId}/medcheck`, dashDate), (snap) => {
      if (snap.exists()) {
        const checks = snap.data();
        const checkedCount = Object.values(checks).filter(v => v === true).length;
        setMedData({ checked: checkedCount, total: totalDoses });
      } else {
        setMedData({ checked: 0, total: totalDoses });
      }
    });

    // 2. Nutrition data
    const startOfTarget = new Date(dashDate + 'T00:00:00');
    const endOfTarget = new Date(dashDate + 'T23:59:59');
    const nutritionQ = query(
      collection(db, `users/${userId}/nutrition`),
      where('createdAt', '>=', startOfTarget),
      where('createdAt', '<=', endOfTarget),
      orderBy('createdAt', 'desc')
    );
    const nutUnsub = onSnapshot(nutritionQ, (snap) => {
      setNutritionEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as NutritionEntry)));
      setNutLoading(false);
    }, () => { setNutLoading(false); });

    // 3. Financial data - no orderBy to avoid composite index requirement
    const financialQ = query(
      collection(db, `users/${userId}/financial`),
      where('date', '==', dashDate)
    );
    const finUnsub = onSnapshot(financialQ, (snap) => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as FinancialEntry))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setFinancialEntries(sorted);
      setFinLoading(false);
    }, () => { setFinLoading(false); });

    // 4. Account balances
    const accUnsub = onSnapshot(collection(db, `users/${userId}/accounts`), snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccountSnapshot)));
    }, () => { });

    // Resolve main loading immediately — individual sections handle their own loading
    setLoading(false);

    return () => { medUnsub(); nutUnsub(); finUnsub(); accUnsub(); };
  }, [userId, dashDate]);


  // Derived stats
  const caloriesTotal = nutritionEntries.reduce((a, b) => a + b.calories, 0);
  const proteinTotal = nutritionEntries.reduce((a, b) => a + b.protein, 0);
  const carbsTotal = nutritionEntries.reduce((a, b) => a + b.carbs, 0);
  const fatTotal = nutritionEntries.reduce((a, b) => a + b.fat, 0);

  const calGoal = 1935;
  const proteinGoal = 196;
  const carbsGoal = 175;
  const fatGoal = 47;

  const finIncome = financialEntries.filter(e => e.type.startsWith('Income') || e.type === 'Debt (Owed To Me)').reduce((a, b) => a + b.amount, 0);
  const finExpense = financialEntries.filter(e => e.type === 'Expense' || e.type === 'Debt (Owed To Someone)' || e.type === 'Loan Given (Expense)').reduce((a, b) => a + b.amount, 0);
  const finNet = finIncome - finExpense;

  const medProgress = totalDoses > 0 ? Math.min(Math.round((medData.checked / totalDoses) * 100), 100) : 0;
  const calProgress = Math.min(Math.round((caloriesTotal / calGoal) * 100), 100);

  // Day Score: avg of medical (40%), nutrition (40%), financial active (20%)
  const dayScore = Math.round(medProgress * 0.4 + calProgress * 0.4 + (financialEntries.length > 0 ? 100 : 0) * 0.2);

  const PRESET_ACCOUNTS = [
    { id: 'CASH', nameAr: 'كاش', nameEn: 'Cash' },
    { id: 'VODAFONE', nameAr: 'فودافون كاش', nameEn: 'Vodafone Cash' },
    { id: 'NBE', nameAr: 'البنك الأهلي', nameEn: 'National Bank' },
    { id: 'ALEX', nameAr: 'بنك إسكندرية', nameEn: 'Alex Bank' },
  ];

  const totalWealth = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="space-y-6 pb-32" dir={isArabic ? 'rtl' : 'ltr'}>

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <header className="relative bg-surface-container rounded-3xl overflow-hidden border border-outline-variant/20 shadow-2xl">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-4 w-full">
              <DateNavigator selectedDate={dashDate} setSelectedDate={setDashDate} isArabic={isArabic} todayStr={todayStr} />
              
              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="flex bg-surface-container-high rounded-2xl p-1 border border-outline-variant/10 shadow-inner">
                  <button
                    onClick={() => setViewMode('DAILY')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all",
                      viewMode === 'DAILY' ? "bg-primary text-surface shadow-lg" : "text-on-surface-variant hover:text-primary"
                    )}
                  >
                    {isArabic ? 'اليومي' : 'DAILY'}
                  </button>
                  <button
                    onClick={() => setViewMode('WEEKLY')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all",
                      viewMode === 'WEEKLY' ? "bg-primary text-surface shadow-lg" : "text-on-surface-variant hover:text-primary"
                    )}
                  >
                    {isArabic ? 'الأسبوعي' : 'WEEKLY'}
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'WEEKLY' ? (
              /* Weekly Insights View */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 w-full">
                {weeklyLoading ? (
                  <div className="col-span-full py-10 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="bg-primary/5 border border-primary/10 rounded-3xl p-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Pill size={24} /></div>
                      <h4 className="text-[9px] font-black tracking-[0.3em] text-primary uppercase mb-4">{isArabic ? 'الالتزام بالعلاج' : 'ADHERENCE'}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black font-headline">{weeklyMed.total > 0 ? Math.round((weeklyMed.checked / weeklyMed.total) * 100) : 0}%</span>
                        <span className="text-[10px] font-bold opacity-30 uppercase">{weeklyMed.checked}/{weeklyMed.total}</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                      className="bg-amber-400/5 border border-amber-400/10 rounded-3xl p-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Salad size={24} /></div>
                      <h4 className="text-[9px] font-black tracking-[0.3em] text-amber-500 uppercase mb-4">{isArabic ? 'متوسط السعرات' : 'AVG_CALORIES'}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black font-headline">{Math.round(weeklyNut.calories / 7)}</span>
                        <span className="text-[10px] font-bold opacity-30 uppercase">kcal/day</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                      className="bg-emerald-400/5 border border-emerald-400/10 rounded-3xl p-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={24} /></div>
                      <h4 className="text-[9px] font-black tracking-[0.3em] text-emerald-500 uppercase mb-4">{isArabic ? 'صافي الميزانية' : 'NET_FLOW'}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className={cn("text-4xl font-black font-headline", (weeklyFin.income - weeklyFin.expense) >= 0 ? "text-primary" : "text-red-400")}>
                          {(weeklyFin.income - weeklyFin.expense).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold opacity-30 uppercase">EGP</span>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            ) : (
              /* Right: Day Score Meter (Existing) */
              <div className="flex items-center gap-6 p-6 rounded-3xl bg-surface-variant/10 border border-outline-variant/10">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-surface-container-highest" />
                    <motion.circle
                      key={dashDate}
                      initial={{ strokeDashoffset: 301.6 }}
                      animate={{ strokeDashoffset: 301.6 * (1 - dayScore / 100) }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      cx="56" cy="56" r="48" fill="transparent"
                      stroke="url(#scoreGrad)" strokeWidth="6"
                      strokeDasharray="301.6" strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-headline font-black text-on-surface">{dayScore}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">/ 100</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary">
                    {isArabic ? 'نقاط اليوم' : 'DAY_SCORE'}
                  </p>
                  <p className="text-sm font-bold text-on-surface/70 max-w-[140px]">
                    {dayScore >= 80
                      ? (isArabic ? 'يوم ممتاز! 🏆' : 'Excellent day! 🏆')
                      : dayScore >= 50
                        ? (isArabic ? 'يوم جيد 💪' : 'Good day 💪')
                        : (isArabic ? 'يمكنك أفضل 🎯' : 'You can do better 🎯')}
                  </p>
                  <div className="space-y-1 pt-1">
                    {[
                      { label: isArabic ? 'طبي' : 'Medical', val: medProgress, color: 'bg-primary' },
                      { label: isArabic ? 'تغذية' : 'Nutrition', val: calProgress, color: 'bg-amber-400' },
                      { label: isArabic ? 'مالية' : 'Finance', val: financialEntries.length > 0 ? 100 : 0, color: 'bg-emerald-400' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-[9px] w-14 font-bold opacity-40 uppercase">{item.label}</span>
                        <div className="flex-1 h-1 bg-surface-container-high rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.val}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full ${item.color}`}
                          />
                        </div>
                        <span className="text-[9px] font-mono opacity-40 w-8 text-right">{item.val}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
      ) : (
        <>
          {/* ── QUICK STATS ROW ─────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: isArabic ? 'الجرعات' : 'Doses',
                value: `${medData.checked}/${totalDoses}`,
                sub: isArabic ? 'مكتملة اليوم' : 'Completed',
                color: 'text-primary',
                bg: 'bg-primary/10',
                icon: Pill,
                bar: medProgress,
                barColor: 'bg-primary',
              },
              {
                label: isArabic ? 'السعرات' : 'Calories',
                value: caloriesTotal.toLocaleString(),
                sub: `/ ${calGoal.toLocaleString()} ${isArabic ? 'هدف' : 'goal'}`,
                color: 'text-amber-400',
                bg: 'bg-amber-400/10',
                icon: Flame,
                bar: calProgress,
                barColor: 'bg-amber-400',
              },
              {
                label: isArabic ? 'الدخل اليوم' : 'Today Income',
                value: `+${finIncome.toLocaleString()}`,
                sub: isArabic ? 'جنيه مصري' : 'EGP',
                color: 'text-emerald-400',
                bg: 'bg-emerald-400/10',
                icon: Zap,
                bar: finIncome > 0 ? 100 : 0,
                barColor: 'bg-emerald-400',
              },
              {
                label: isArabic ? 'إجمالي الثروة' : 'Total Wealth',
                value: totalWealth.toLocaleString(),
                sub: isArabic ? 'رصيد كل المحافظ' : 'All wallets',
                color: 'text-indigo-400',
                bg: 'bg-indigo-400/10',
                icon: Wallet,
                bar: 100,
                barColor: 'bg-indigo-400',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-surface-container rounded-3xl p-5 border border-outline-variant/10 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black tracking-[0.3em] uppercase text-on-surface-variant/50">{stat.label}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon size={16} />
                  </div>
                </div>
                <div>
                  <p className={`text-2xl font-headline font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] font-bold text-on-surface-variant/40 mt-0.5">{stat.sub}</p>
                </div>
                <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.bar}%` }}
                    transition={{ duration: 1, delay: i * 0.07, ease: 'easeOut' }}
                    className={`h-full ${stat.barColor}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── DEEP DIVE: 3 MODULE CARDS ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Medical Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-xl group cursor-pointer"
              onClick={() => setMode('MEDICAL')}
            >
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Heart size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-primary">{isArabic ? 'البروتوكول الطبي' : 'HEALTH_PROTOCOL'}</h3>
                    <p className="text-[9px] opacity-30 font-mono">{dashDate}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-50 transition-all text-primary" />
              </div>
              <div className="p-6 flex items-center gap-6">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="5" className="text-surface-container-highest" />
                    <motion.circle
                      key={`med-${dashDate}`}
                      initial={{ strokeDashoffset: 251 }}
                      animate={{ strokeDashoffset: 251 * (1 - medProgress / 100) }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      cx="48" cy="48" r="40" fill="transparent"
                      className="text-primary" strokeWidth="5"
                      strokeDasharray="251" strokeLinecap="round" stroke="currentColor"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-on-surface">{medProgress}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-3xl font-headline font-black text-on-surface">{medData.checked}<span className="text-base opacity-30 font-normal">/{totalDoses}</span></p>
                  <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
                    {isArabic ? 'جرعات مكتملة' : 'Doses Completed'}
                  </p>
                  {medData.checked === totalDoses && totalDoses > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase">
                      <CheckCircle2 size={10} /> {isArabic ? 'مكتمل 🎉' : 'All Done! 🎉'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Nutrition Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-xl group cursor-pointer"
              onClick={() => setMode('NUTRITION')}
            >
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                    <Flame size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-amber-400">{isArabic ? 'بروتوكول التغذية' : 'FUEL_METRICS'}</h3>
                    <p className="text-[9px] opacity-30 font-mono">{nutritionEntries.length} {isArabic ? 'وجبات' : 'meals'}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-50 transition-all text-amber-400" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-headline font-black text-on-surface">{caloriesTotal.toLocaleString()}</span>
                    <span className="text-sm text-on-surface-variant/30 ms-1">/{calGoal.toLocaleString()} kcal</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">{calProgress}%</span>
                    <p className="text-[8px] opacity-30">{isArabic ? 'من الهدف' : 'of goal'}</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div
                    key={`cal-${dashDate}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${calProgress}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: isArabic ? 'بروتين' : 'Protein', v: proteinTotal, goal: proteinGoal, color: 'bg-emerald-400', tc: 'text-emerald-400' },
                    { label: isArabic ? 'كربوهيدرات' : 'Carbs', v: carbsTotal, goal: carbsGoal, color: 'bg-primary', tc: 'text-primary' },
                    { label: isArabic ? 'دهون' : 'Fat', v: fatTotal, goal: fatGoal, color: 'bg-amber-400', tc: 'text-amber-400' },
                  ].map((m, i) => (
                    <div key={i} className="rounded-2xl bg-surface-variant/10 p-3 space-y-2 text-center">
                      <p className={`text-base font-headline font-black ${m.tc}`}>{m.v}g</p>
                      <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((m.v / m.goal) * 100, 100)}%` }}
                          className={`h-full ${m.color}`}
                        />
                      </div>
                      <p className="text-[8px] font-bold opacity-30 uppercase tracking-wider">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Finance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-xl group cursor-pointer"
              onClick={() => setMode('FINANCIAL')}
            >
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-emerald-400">{isArabic ? 'إدارة الثروة' : 'WEALTH_SUMMARY'}</h3>
                    <p className="text-[9px] opacity-30 font-mono">{financialEntries.length} {isArabic ? 'معاملات' : 'transactions'}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-50 transition-all text-emerald-400" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{isArabic ? 'دخل' : 'INCOME'}</p>
                    <p className="text-2xl font-headline font-black text-emerald-400">+{finIncome.toLocaleString()}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{isArabic ? 'مصروف' : 'EXPENSES'}</p>
                    <p className="text-2xl font-headline font-black text-red-400">-{finExpense.toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-surface-variant/10 border border-outline-variant/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{isArabic ? 'الصافي' : 'NET'}</span>
                  <span className={`text-xl font-headline font-black ${finNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {finNet >= 0 ? '+' : ''}{finNet.toLocaleString()} <span className="text-[10px] opacity-40">EGP</span>
                  </span>
                </div>
                {accounts.length > 0 && (
                  <div className="space-y-2">
                    {accounts.slice(0, 3).map(acc => {
                      const preset = PRESET_ACCOUNTS.find(p => p.id === acc.id);
                      return (
                        <div key={acc.id} className="flex items-center justify-between">
                          <span className="text-[9px] font-bold opacity-40">{isArabic ? preset?.nameAr : preset?.nameEn}</span>
                          <span className="text-[10px] font-black text-on-surface">{(acc.balance || 0).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── BOTTOM LOGS ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Financial Journal */}
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-xl"
            >
              <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-variant/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-emerald-400" />
                  <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant">{isArabic ? 'سجل المعاملات' : 'DAILY_JOURNAL'}</h3>
                </div>
                <span className="text-[9px] font-mono opacity-30">{financialEntries.length} {isArabic ? 'عملية' : 'ops'}</span>
              </div>
              {finLoading ? (
                <div className="p-8 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
              ) : financialEntries.length === 0 ? (
                <div className="p-10 text-center">
                  <Wallet size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{isArabic ? 'لا معاملات لهذا اليوم' : 'No transactions this day'}</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/5 max-h-72 overflow-y-auto custom-scrollbar">
                  {financialEntries.map(entry => {
                    const isExpense = entry.type === 'Expense' || entry.type === 'Debt (Owed To Someone)';
                    const isExpected = entry.type === 'Expected' || entry.status === 'PENDING';
                    const isDebtMe = entry.type === 'Debt (Owed To Me)';
                    return (
                      <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-surface-variant/20 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                            isExpected ? 'bg-amber-400/10 text-amber-400' :
                            isExpense ? 'bg-red-400/10 text-red-400' :
                                isDebtMe ? 'bg-indigo-400/10 text-indigo-400' :
                                  'bg-emerald-400/10 text-emerald-400'
                          )}>
                            {isExpected ? <Clock size={16} /> : isExpense ? <ShieldAlert size={16} /> : isDebtMe ? <UserIcon size={16} /> : <Zap size={16} />}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{entry.source}</p>
                            <p className="text-[8px] uppercase tracking-widest opacity-30 font-black">{isArabic ? (isExpected ? 'مُعلّق' : isExpense ? 'مصروف' : isDebtMe ? 'دين لي' : 'دخل') : (isExpected ? 'PENDING' : entry.type)}</p>
                          </div>
                        </div>
                        <span className={cn("text-base font-headline font-black flex-shrink-0",
                          isExpected ? 'text-amber-400' : isExpense ? 'text-red-400' : isDebtMe ? 'text-indigo-400' : 'text-emerald-400'
                        )}>
                          {isExpense ? '-' : '+'}{entry.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>

            {/* Nutrition Log */}
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
              className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden shadow-xl"
            >
              <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-variant/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Salad size={16} className="text-amber-400" />
                  <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant">{isArabic ? 'سجل التغذية' : 'NUTRITION_LOG'}</h3>
                </div>
                <span className="text-[9px] font-mono opacity-30">{nutritionEntries.length} {isArabic ? 'عنصر' : 'items'}</span>
              </div>
              {nutLoading ? (
                <div className="p-8 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
              ) : nutritionEntries.length === 0 ? (
                <div className="p-10 text-center">
                  <Salad size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{isArabic ? 'لا وجبات لهذا اليوم' : 'No meals logged this day'}</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/5 max-h-72 overflow-y-auto custom-scrollbar">
                  {nutritionEntries.map(n => {
                    const mealColors: Record<string, string> = {
                      BREAKFAST: 'bg-amber-400/10 text-amber-400',
                      LUNCH: 'bg-emerald-400/10 text-emerald-400',
                      DINNER: 'bg-indigo-400/10 text-indigo-400',
                      SNACK: 'bg-rose-400/10 text-rose-400',
                    };
                    const mealColor = mealColors[n.meal] || 'bg-primary/10 text-primary';
                    const mealIcons: Record<string, any> = { BREAKFAST: Coffee, LUNCH: Salad, DINNER: Pizza, SNACK: Apple };
                    const MealIcon = mealIcons[n.meal] || Salad;
                    return (
                      <div key={n.id} className="p-4 flex items-center justify-between hover:bg-surface-variant/20 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", mealColor)}>
                            <MealIcon size={16} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{n.name}</p>
                            <div className="flex items-center gap-2 text-[8px] font-mono opacity-30 uppercase tracking-wider mt-0.5">
                              <span>{n.protein}P</span>
                              <span>·</span>
                              <span>{n.carbs}C</span>
                              <span>·</span>
                              <span>{n.fat}F</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-base font-headline font-black text-amber-400 flex-shrink-0">
                          {n.calories} <span className="text-[9px] opacity-40">kcal</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          </div>
        </>
      )}
    </div>
  );
};

// --- View: Medical ---



const MedicalView = ({ userId, isArabic, selectedDate, setSelectedDate }: { 
  userId: string, 
  isArabic: boolean,
  selectedDate: string,
  setSelectedDate: (d: string) => void
}) => {

  const today = selectedDate;
  const todayStr = getSystemToday();
  const todayJS = new Date(today).getDay(); // 0=Sun … 6=Sat

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);


  const [expandedMedIds, setExpandedMedIds] = useState<string[]>([]);

  useEffect(() => {
    // Default: expand medications that have pending today doses
    const pendingIds = MEDICINE_SCHEDULE
      .filter(m => {
        const isToday = m.frequency === 'daily' || (m.weekDays && m.weekDays.includes(todayJS));
        const allDone = m.doses.every(d => checks[`${m.id}_${d.idx}`]);
        return isToday && !allDone;
      })
      .map(m => m.id);
    setExpandedMedIds(pendingIds);
  }, [checks, todayJS]);

  const toggleExpand = (id: string) => {
    setExpandedMedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };


  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, `users/${userId}/medcheck/${today}`),
      (snap) => {
        setChecks(snap.exists() ? (snap.data() as Record<string, boolean>) : {});
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId, today]);







  const toggleDose = async (medicineId: string, doseIdx: number) => {
    const key = `${medicineId}_${doseIdx}`;
    const current = checks[key] ?? false;
    setToggling(key);
    try {
      await setDoc(
        doc(db, `users/${userId}/medcheck/${today}`),
        { [key]: !current },
        { merge: true }
      );
    } catch (err) { console.error(err); }
    finally { setToggling(null); }
  };

  const applicableMeds = MEDICINE_SCHEDULE.filter(
    m => m.frequency === 'daily' || (m.weekDays && m.weekDays.includes(todayJS))
  );
  const totalDoses = applicableMeds.reduce((a, m) => a + m.doses.length, 0);
  const checkedDoses = applicableMeds.reduce(
    (a, m) => a + m.doses.filter(d => checks[`${m.id}_${d.idx}`]).length, 0
  );
  const progress = totalDoses > 0 ? Math.round((checkedDoses / totalDoses) * 100) : 0;

  const todayDateStr = new Date(today + 'T12:00:00').toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="space-y-8 pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* Main: Medication Cards (First in source = Right in RTL) */}
        <div className="xl:col-span-8 order-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-primary animate-spin" size={32} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant flex items-center gap-2">
                  <Pill size={14} className="text-primary" /> {isArabic ? 'جدول الأدوية والمكملات اليومي' : 'MEDICATION_SCHEDULE_ACTIVE'}
                </h3>
                <span className="text-[9px] font-mono opacity-30 uppercase">{applicableMeds.length} Items Today</span>
              </div>

              <div className="grid grid-cols-1 gap-6 pb-20">
                {applicableMeds.map((med, mIdx) => {
                  const completedCount = med.doses.filter(d => checks[`${med.id}_${d.idx}`]).length;
                  const allDone = completedCount === med.doses.length;


                  return (
                    <motion.div key={med.id}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: mIdx * 0.05 }}
                      className={cn(
                        'bg-surface-container rounded-3xl border overflow-hidden shadow-xl transition-all duration-500',
                        allDone ? 'border-primary/40 shadow-primary/10' : 'border-outline-variant/20'
                      )}>
                      <div
                        onClick={() => toggleExpand(med.id)}
                        className={cn(
                          'px-8 py-5 flex items-center justify-between border-b transition-colors duration-500 cursor-pointer hover:bg-on-surface/[0.02]',
                          allDone ? 'border-primary/20 bg-primary/5' : 'border-outline-variant/20'
                        )}>
                        <div className="flex items-center gap-4">
                          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', med.colorBg, med.colorText)}>
                            <med.Icon size={22} />
                          </div>
                          <div className={isArabic ? 'text-right' : 'text-left'}>
                            <h2 className="font-bold text-lg leading-tight">{isArabic ? med.nameLine1 : med.id.toUpperCase()}</h2>
                            <p className="text-[10px] text-on-surface-variant tracking-wide mt-0.5">{isArabic ? med.nameLine2 : med.nameLine2}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-bold', allDone ? 'text-primary' : 'text-on-surface-variant')}>{completedCount}/{med.doses.length}</span>
                            {allDone && <CheckCircle2 size={18} className="text-primary" />}
                          </div>
                          <motion.div animate={{ rotate: expandedMedIds.includes(med.id) ? 180 : 0 }}>
                            <ChevronDown size={18} className="opacity-40" />
                          </motion.div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {expandedMedIds.includes(med.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 space-y-3 pt-2">
                              {med.doses.map((dose) => {
                                const key = `${med.id}_${dose.idx}`;
                                const isChecked = checks[key] ?? false;
                                const isLoadingDose = toggling === key;
                                const enNotes: any = { 0: 'First Dose', 1: 'Second Dose', 2: 'Third Dose' };
                                return (
                                  <button key={dose.idx} onClick={() => toggleDose(med.id, dose.idx)} disabled={isLoadingDose}
                                    className={cn('w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all', isArabic ? 'flex-row-reverse' : 'flex-row', isChecked ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/30')}>
                                    <div className={cn('w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0', isChecked ? 'bg-primary border-primary' : 'border-outline-variant')}>
                                      {isLoadingDose ? <Loader2 size={12} className="animate-spin" /> : (isChecked && <CheckCircle2 size={14} className="text-white" />)}
                                    </div>
                                    <div className="flex flex-1 items-center justify-between gap-4">
                                      <span className="text-sm font-bold text-on-surface">{isArabic ? dose.note : enNotes[dose.idx] || dose.note}</span>
                                      {dose.time !== '—' && (
                                        <span className={cn("text-[10px] font-mono font-bold tracking-widest px-3 py-1 rounded-full", isChecked ? "bg-primary/20 text-primary" : "bg-on-surface/5 text-on-surface-variant")}>
                                          {isArabic ? dose.displayTime : dose.time}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Progress & Summary (Second in source = Left in RTL) */}
        <div className="xl:col-span-4 space-y-6 order-2">
          
          <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/10 mb-6">
            <DateNavigator selectedDate={selectedDate} setSelectedDate={setSelectedDate} isArabic={isArabic} todayStr={todayStr} />
          </div>

          <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-6">
                {isArabic ? 'البروتوكول اليومي' : 'DAILY PROTOCOL'}
              </p>

              <div className="flex items-center justify-center mb-8">
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-surface-container-highest" cx="80" cy="80" fill="transparent" r="72"
                      stroke="currentColor" strokeWidth="10" />
                    <motion.circle
                      initial={{ strokeDashoffset: 452.3 }}
                      animate={{ strokeDashoffset: 452.3 * (1 - progress / 100) }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className="text-primary" cx="80" cy="80" fill="transparent" r="72"
                      stroke="currentColor" strokeDasharray="452.3" strokeWidth="10" strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-headline font-black text-on-surface">{progress}%</span>
                    <span className="text-[10px] font-bold uppercase opacity-30 mt-1">{isArabic ? 'مكتمل' : 'DONE'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="font-headline text-2xl font-bold text-on-surface">{todayDateStr}</h1>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-variant/20 border border-outline-variant/10">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <CheckCircle2 size={18} />
                  </div>
                  <p className="text-on-surface-variant text-sm font-bold">
                    {isArabic
                      ? `${checkedDoses} من ${totalDoses} جرعات مكتملة`
                      : `${checkedDoses} / ${totalDoses} doses finished`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
            <h4 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-4">Medical Continuity</h4>
            <p className="text-xs leading-relaxed font-medium opacity-70">
              {isArabic
                ? "يتم تتبع الجرعات يومياً. يتم إعادة ضبط الجدول تلقائياً عند صلاة الفجر لبدء بروتوكول جديد."
                : "Doses are tracked daily. The schedule resets automatically at Fajr for the next protocol cycle."}
            </p>
          </section>
        </div>

      </div>
    </div>
  );
};




// --- View: Financial ---

const FinancialView = ({ userId, isArabic, selectedDate }: { 
  userId: string, 
  isArabic: boolean,
  selectedDate: string 
}) => {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('EGP');
  const [form, setForm] = useState({
    type: 'Expense',
    amount: '',
    source: '',
    date: selectedDate,
    accountId: 'CASH'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [tempBalance, setTempBalance] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);




  const PRESET_ACCOUNTS = [
    { id: 'CASH', nameAr: 'كاش', nameEn: 'Cash' },
    { id: 'VODAFONE', nameAr: 'فودافون كاش', nameEn: 'Vodafone Cash' },
    { id: 'NBE', nameAr: 'البنك الأهلي', nameEn: 'National Bank' },
    { id: 'ALEX', nameAr: 'بنك إسكندرية', nameEn: 'Alex Bank' },
  ];

  useEffect(() => {
    // Listen to Financial Entries
    const qEntries = query(collection(db, `users/${userId}/financial`), orderBy('createdAt', 'desc'));
    const unsubEntries = onSnapshot(qEntries, async (snap) => {
      const fetchedEntries = snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialEntry));
      setEntries(fetchedEntries);
      setLoading(false);

      // --- Auto-Settle Pending Transactions ---
      const todayStr = getSystemToday();
      const pendingToSettle = fetchedEntries.filter(e => e.status === 'PENDING' && e.date <= todayStr);
      
      if (pendingToSettle.length > 0) {
        try {
          // Process sequentially to safely resolve balances
          for (const pending of pendingToSettle) {
            await runTransaction(db, async (trans) => {
              const accRef = doc(db, `users/${userId}/accounts`, pending.accountId);
              const accDoc = await trans.get(accRef);
              if (!accDoc.exists()) return;
              
              const isDeduction = pending.type === 'Expense' || pending.type === 'Debt (Owed To Someone)' || pending.type === 'Loan Given (Expense)';
              const diff = isDeduction ? -pending.amount : pending.amount;
              
              trans.update(accRef, { balance: (accDoc.data().balance || 0) + diff });
              trans.update(doc(db, `users/${userId}/financial`, pending.id), { status: 'COMPLETED', lastSettled: serverTimestamp() });
            });
          }
        } catch (err) {
          console.error("Auto-settle error:", err);
        }
      }
    });

    // Listen to Accounts
    const qAccounts = query(collection(db, `users/${userId}/accounts`));
    const unsubAccounts = onSnapshot(qAccounts, async (snap) => {
      if (snap.empty) {
        // Seed initial accounts if they don't exist
        for (const p of PRESET_ACCOUNTS) {
          await setDoc(doc(db, `users/${userId}/accounts`, p.id), { ...p, balance: 0 });
        }
      } else {
        setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccountSnapshot)));
      }
    });

    return () => { unsubEntries(); unsubAccounts(); };
  }, [userId]);

  const handleManualBalanceUpdate = async (id: string) => {
    const val = parseFloat(tempBalance);
    if (isNaN(val)) return;
    try {
      await setDoc(doc(db, `users/${userId}/accounts`, id), { balance: val }, { merge: true });
      setEditingAccountId(null);
    } catch (err) {

      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.source) return;
    setSubmitting(true);
    try {
      const amountValue = parseFloat(form.amount);

      await runTransaction(db, async (transaction) => {
        // --- 1. READS (GROUND TRUTH) ---
        const logRef = editingId ? doc(db, `users/${userId}/financial`, editingId) : doc(collection(db, `users/${userId}/financial`));
        let oldEntryData: any = null;
        if (editingId) {
          const oldLogDoc = await transaction.get(logRef);
          if (oldLogDoc.exists()) oldEntryData = oldLogDoc.data();
        }

        const newAccountRef = doc(db, `users/${userId}/accounts`, form.accountId);
        const newAccountDoc = await transaction.get(newAccountRef);
        if (!newAccountDoc.exists()) throw new Error("Account does not exist!");

        let oldAccountDoc = null;
        if (oldEntryData && oldEntryData.accountId !== form.accountId) {
          const oldAccountRef = doc(db, `users/${userId}/accounts`, oldEntryData.accountId);
          oldAccountDoc = await transaction.get(oldAccountRef);
        }

        // --- 2. CALCULATIONS (IN-MEMORY) ---
        let newBalanceForNewAcc = newAccountDoc.data().balance || 0;
        let finalOldAccBalance = null;
        let oldAccId = oldEntryData?.accountId;

        const todayStr = new Date().toISOString().split('T')[0];
        const isFuture = form.date > todayStr;
        const newStatus = isFuture ? 'PENDING' : 'COMPLETED';

        // A. Reverse Old Impact on Old Account (Only if it was previously COMPLETED)
        if (oldEntryData && oldEntryData.type !== 'Expected' && oldEntryData.status !== 'PENDING') {
          const isOldDeduction = oldEntryData.type === 'Expense' || oldEntryData.type === 'Debt (Owed To Someone)' || oldEntryData.type === 'Loan Given (Expense)';
          const reversalAmount = isOldDeduction ? oldEntryData.amount : -oldEntryData.amount;

          if (oldAccId === form.accountId) {
            newBalanceForNewAcc += reversalAmount;
          } else if (oldAccountDoc && oldAccountDoc.exists()) {
            finalOldAccBalance = (oldAccountDoc.data().balance || 0) + reversalAmount;
          }
        }

        // B. Apply New Impact on New Account (Only if it's COMPLETED now)
        if (newStatus === 'COMPLETED') {
          const isNewDeduction = form.type === 'Expense' || form.type === 'Debt (Owed To Someone)' || form.type === 'Loan Given (Expense)';
          newBalanceForNewAcc = isNewDeduction ? newBalanceForNewAcc - amountValue : newBalanceForNewAcc + amountValue;
        }

        // --- 3. WRITES (ATOMIC) ---
        // Update New Account
        transaction.update(newAccountRef, { balance: newBalanceForNewAcc });

        // Update Old Account (if it was different)
        if (finalOldAccBalance !== null && oldAccId && oldAccId !== form.accountId) {
          transaction.update(doc(db, `users/${userId}/accounts`, oldAccId), { balance: finalOldAccBalance });
        }

        // Record/Update Log
        const logData = {
          type: form.type,
          amount: amountValue,
          currency: selectedCurrency,
          source: form.source,
          date: form.date,
          accountId: form.accountId,
          status: newStatus,
          lastModified: serverTimestamp(),
          ...(editingId ? {} : { createdAt: serverTimestamp() })
        };
        transaction.set(logRef, logData, { merge: true });
      });



      setForm({ ...form, amount: '', source: '', date: new Date().toISOString().split('T')[0] });
      setEditingId(null);
      setIsFormOpen(false);
    } catch (err) {

      console.error(err);
    }
    setSubmitting(false);
  };


  const handleDelete = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    // Captured local values to avoid stale closure issues
    const entryType = entry.type;
    const entryAmount = entry.amount;
    const entryAccountId = entry.accountId; // Might be undefined for old records

    try {
      await runTransaction(db, async (transaction) => {
        const isDeduction = entryType === 'Expense' || entryType === 'Debt (Owed To Someone)' || entryType === 'Loan Given (Expense)';

        // 1. Get the account (if it exists in the record AND is NOT Expected/PENDING)
        if (entryAccountId && entryType !== 'Expected' && entry.status !== 'PENDING') {
          const accountRef = doc(db, `users/${userId}/accounts`, entryAccountId);
          const accountDoc = await transaction.get(accountRef);

          // 2. Return the money to the account (Reverse Logic)
          if (accountDoc.exists()) {
            const currentBalance = accountDoc.data().balance || 0;
            const newBalance = isDeduction ? currentBalance + entryAmount : currentBalance - entryAmount;
            transaction.update(accountRef, { balance: newBalance });
          }
        }

        // 3. Delete the log (Always)
        transaction.delete(doc(db, `users/${userId}/financial`, id));
      });
    } catch (err) {
      console.error("Delete Error Trace:", err);
    }
  };

  const totalExpenses = entries.filter(e => e.type === 'Expense' || e.type === 'Debt (Owed To Someone)' || e.type === 'Loan Given (Expense)').reduce((acc, e) => acc + e.amount, 0);
  const totalIncome = entries.filter(e => e.type.startsWith('Income') || e.type === 'Debt (Owed To Me)').reduce((acc, e) => acc + e.amount, 0);
  const netWorth = accounts.reduce((acc, a) => acc + a.balance, 0);

  return (
    <div className="space-y-8 h-full overflow-y-auto no-scrollbar pb-20">
      {/* Account Snapshots */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" dir={isArabic ? 'rtl' : 'ltr'}>
        {PRESET_ACCOUNTS.map(p => {
          const acc = accounts.find(a => a.id === p.id);
          const isEditing = editingAccountId === p.id;
          return (
            <div key={p.id} className="bg-surface-container rounded-3xl p-8 border border-outline-variant/20 shadow-xl relative overflow-hidden group hover:border-primary/40 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                <Landmark size={18} className="text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant mb-6 group-hover:text-primary transition-colors">
                {isArabic ? p.nameAr : p.nameEn}
              </p>

              {isEditing ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <input
                    autoFocus
                    className="w-full recessed-input text-xl font-headline font-black py-2 px-3 bg-primary-container/10"
                    placeholder="0"
                    value={tempBalance}
                    onChange={e => setTempBalance(e.target.value)}
                    onBlur={() => handleManualBalanceUpdate(p.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualBalanceUpdate(p.id)}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between group/val cursor-pointer" onClick={() => { setEditingAccountId(p.id); setTempBalance(acc?.balance.toString() || '0'); }}>
                  <h3 className="text-3xl font-headline font-black text-on-surface">
                    {acc?.balance.toLocaleString() ?? '—'}
                    <span className="text-[10px] font-medium ml-2 opacity-30">EGP</span>
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover/val:opacity-100 transition-opacity">
                    <Sparkles size={14} className="text-primary" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          {/* New Transaction Ledger Entry */}
          <section ref={formRef} className="bg-surface-container rounded-3xl border border-outline-variant/20 overflow-hidden shadow-2xl transition-all">
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="w-full px-8 py-5 border-b border-outline-variant/20 bg-surface-variant/20 flex justify-between items-center hover:bg-surface-variant/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", isFormOpen ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                  {editingId ? <Edit2 size={18} /> : <PlusCircle size={20} />}
                </div>
                <h2 className={cn("text-[10px] font-bold uppercase tracking-[0.3em] transition-colors", isFormOpen ? "text-primary" : "text-on-surface-variant")}>
                  {editingId ? (isArabic ? 'تعديل المعاملة الجاري' : 'REFINING_TRANSACTION') : (isArabic ? 'بروتوكول إدخال جديد' : 'NEW_TRANSACTION_ENTRY')}
                </h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-primary/60 uppercase">Manual Override Ready</span>
                </div>
                <motion.div animate={{ rotate: isFormOpen ? 180 : 0 }}>
                  <ChevronDown size={18} className="opacity-40" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {isFormOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="p-10">
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">
                            {isArabic ? 'المحفظة' : 'WALLET / BANK'}
                          </label>
                          <OSSelect
                            value={form.accountId}
                            onChange={(val: string) => setForm(f => ({ ...f, accountId: val }))}
                            isArabic={isArabic}
                            options={PRESET_ACCOUNTS.map(p => ({ value: p.id, label: p.nameEn, labelAr: p.nameAr, icon: Landmark }))}
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">
                            {isArabic ? 'نوع المعاملة' : 'TRANSACTION_TYPE'}
                          </label>
                          <OSSelect
                            value={form.type}
                            onChange={(val: string) => setForm(f => ({ ...f, type: val }))}
                            isArabic={isArabic}
                            options={[
                              { value: 'Expense', label: 'Expense', labelAr: 'مصروف', icon: CreditCard },
                              { value: 'Income (Salary)', label: 'Salary', labelAr: 'دخل (راتب)', icon: ArrowLeftRight },
                              { value: 'Income (Freelance)', label: 'Freelance', labelAr: 'دخل (عمل حر)', icon: Zap },
                              { value: 'Income (General)', label: 'General Income', labelAr: 'دخل عام', icon: PlusCircle },
                              { value: 'Loan Given (Expense)', label: 'Loan Given', labelAr: 'سلفة (أديتها لحد)', icon: ArrowRight },
                              { value: 'Debt (Owed To Me)', label: 'Owed To Me', labelAr: 'سداد دين (لي)', icon: UserIcon },
                              { value: 'Debt (Owed To Someone)', label: 'Owed To Someone', labelAr: 'دين (علي)', icon: ShieldAlert },
                            ]}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">
                          {isArabic ? 'المصدر / الوجهة' : 'Description'}
                        </label>
                        <input
                          className="w-full recessed-input text-sm py-4 px-5"
                          placeholder={isArabic ? 'التفاصيل...' : 'Specify source...'}
                          value={form.source}
                          onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                          required
                          dir={isArabic ? 'rtl' : 'ltr'}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-surface-container-high rounded-2xl border border-outline-variant/10 shadow-inner">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">
                            {isArabic ? 'التاريخ الفعلي' : 'EFFECTIVE_DATE'}
                          </label>
                          <input
                            type="date"
                            className="w-full recessed-input text-xs py-4 px-5"
                            value={form.date}
                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">
                            {isArabic ? 'المبلغ الفعلي والعملة' : 'MONETARY_VALUE_&_CURRENCY'}
                          </label>
                          <div className="flex gap-4">
                            <OSSelect
                              className="min-w-[160px]"
                              value={selectedCurrency}
                              onChange={setSelectedCurrency}
                              isArabic={isArabic}
                              options={[
                                { value: 'EGP', label: 'EGP', labelAr: 'جنيه مصري' },
                                { value: 'SAR', label: 'SAR', labelAr: 'ريال سعودي' },
                                { value: 'USD', label: 'USD', labelAr: 'دولار أمريكي' },
                                { value: 'AED', label: 'AED', labelAr: 'درهم إماراتي' },
                              ]}
                            />
                            <input
                              type="number"
                              className="flex-1 recessed-input text-sm font-bold py-4 px-6 no-spinner"
                              placeholder="0.00"
                              value={form.amount}
                              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 py-6 rounded-2xl bg-primary text-surface font-black text-xs tracking-[0.4em] uppercase shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                        >
                          {submitting ? <Loader2 size={24} className="animate-spin" /> : (editingId ? <Edit2 size={20} /> : <ShieldAlert size={20} />)}
                          {submitting ? (isArabic ? 'جارٍ المزامنة...' : 'SYNCING...') : (editingId ? (isArabic ? 'حفظ التعديلات' : 'SAVE_CHANGES') : (isArabic ? 'تأكيد العملية' : 'EXECUTE_TRANSACTION'))}
                        </button>
                        {editingId && (
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setIsFormOpen(false); setForm({ ...form, amount: '', source: '', date: getSystemToday() }); }}
                            className="px-6 rounded-2xl bg-outline-variant/10 text-on-surface-variant font-bold text-[10px] tracking-widest uppercase hover:bg-outline-variant/20 transition-all font-mono"
                          >
                            {isArabic ? 'إلغاء' : 'CANCEL'}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>


          {/* New Professional Ledger List */}
          <section className="bg-surface-container rounded-3xl border border-outline-variant/20 overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-outline-variant/20 bg-surface-variant/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <BarChart3 size={16} className="text-primary" />
                <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase">{isArabic ? 'سجل العمليات المعاصر' : 'MODERN_TRANSACTION_LEDGER'}</h3>
              </div>
              <span className="text-[9px] font-mono text-on-surface-variant/40">LIMIT: 30 ENTRIES</span>
            </div>
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="text-primary animate-spin" size={32} /></div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Landmark size={48} className="text-primary mb-4" />
                  <p className="text-sm font-black tracking-widest">{isArabic ? 'لا توجد بيانات' : 'CLEAN_SLATE'}</p>
                </div>
              ) : entries.slice(0, 30).map((entry, idx) => {
                const acc = PRESET_ACCOUNTS.find(a => a.id === entry.accountId);
                const isExpense = entry.type === 'Expense' || entry.type === 'Debt (Owed To Someone)';
                const isExpected = entry.type === 'Expected' || entry.status === 'PENDING';
                const isDebtMe = entry.type === 'Debt (Owed To Me)';

                // Timeline Separator Logic
                const prevEntry = idx > 0 ? entries[idx - 1] : null;
                const showDateHeader = !prevEntry || prevEntry.date !== entry.date;

                let dateDisplay = entry.date;
                if (entry.date === getSystemToday()) dateDisplay = isArabic ? 'اليوم' : 'Today';
                else if (entry.date === formatDateLocal(new Date(Date.now() - 86400000))) dateDisplay = isArabic ? 'أمس' : 'Yesterday';

                return (
                  <div key={entry.id}>
                    {showDateHeader && (
                      <div className="flex items-center gap-4 px-2 py-4 mt-4">
                        <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase whitespace-nowrap">{dateDisplay}</span>
                        <div className="h-[1px] w-full bg-gradient-to-r from-primary/20 to-transparent" />
                      </div>
                    )}
                    <div className="group p-5 hover:bg-surface-bright/50 rounded-2xl transition-all flex items-center justify-between border border-transparent hover:border-outline-variant/10">
                      <div className="flex items-center gap-6 overflow-hidden">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-transform group-hover:scale-105",
                          isExpected ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          isExpense ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              isDebtMe ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        )}>
                          {isExpected ? <Clock size={22} /> : isExpense ? <ShieldAlert size={22} /> : isDebtMe ? <UserIcon size={22} /> : <ArrowLeftRight size={22} />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-base font-bold truncate group-hover:text-primary transition-colors">{entry.source}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{isArabic ? acc?.nameAr : acc?.nameEn}</span>
                            <span className="w-1 h-1 rounded-full bg-outline-variant" />
                            <span className="text-[9px] text-on-surface-variant/40 font-mono italic">{entry.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right hidden sm:block">
                          <div className={cn(
                            "text-xl font-headline font-black",
                            isExpected ? 'text-amber-500' : isExpense ? 'text-red-400' : isDebtMe ? 'text-indigo-400' : 'text-emerald-400'
                          )}>
                            {isExpense ? '-' : '+'}{entry.amount.toLocaleString()} <span className="text-[10px] opacity-40">{entry.currency}</span>
                          </div>
                          <p className="text-[8px] font-bold text-on-surface-variant/30 uppercase tracking-[0.3em] mt-0.5">
                            {isArabic
                              ? (isExpected ? 'مُعلّق' : entry.type === 'Debt (Owed To Me)' ? 'دين لي' : entry.type === 'Debt (Owed To Someone)' ? 'دين علي' : entry.type === 'Expense' ? 'مصروف' : 'دخل')
                              : (isExpected ? 'PENDING' : entry.type.replace('Debt (', '').replace(')', ''))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(entry.id);
                              setForm({
                                type: entry.type,
                                amount: entry.amount.toString(),
                                source: entry.source,
                                date: entry.date,
                                accountId: entry.accountId
                              });
                              setSelectedCurrency(entry.currency);
                              setIsFormOpen(true);
                              formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all hover:bg-primary hover:text-white active:scale-90 shadow-sm"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            className="w-10 h-10 rounded-xl bg-red-400/15 text-red-500 flex items-center justify-center transition-all hover:bg-red-500 hover:text-white active:scale-90 shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}


            </div>
          </section>
        </div>

        <div className="xl:col-span-4 space-y-8">
          <section className="bg-surface-container rounded-3xl p-10 border border-outline-variant/20 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 rounded-3xl bg-primary/10 text-primary shadow-xl shadow-primary/5">
                  <Wallet size={32} />
                </div>
                <div>
                  <h1 className="text-[10px] font-bold tracking-[0.4em] text-on-surface-variant uppercase mb-1">
                    {isArabic ? 'إجمالي الثروة الحالية' : 'NET_ASSET_VALUE'}
                  </h1>
                  <p className="text-[8px] font-bold text-emerald-400 tracking-[0.2em] uppercase">Liquidity Secured</p>
                </div>
              </div>

              <div className="text-6xl font-headline font-black tracking-tighter mb-10 overflow-hidden text-ellipsis">
                {netWorth.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                <span className="text-sm font-bold opacity-30 ml-3">EGP</span>
              </div>
            </div>

            <div className="space-y-4 relative z-10 pt-8 border-t border-outline-variant/10">
              <h4 className="text-[10px] font-black tracking-[0.3em] text-on-surface-variant/40 mb-2 uppercase">Financial Pulse HUD</h4>
              {[
                { l: isArabic ? 'التدفقات الداخلة' : 'TOTAL_INFLOW', v: totalIncome, c: 'text-emerald-400', i: ArrowLeftRight },
                { l: isArabic ? 'التدفقات الخارجة' : 'TOTAL_OUTFLOW', v: totalExpenses, c: 'text-red-400', i: CreditCard },
                { l: isArabic ? 'التوازن المتوقع (Net)' : 'PROJECTED_NET', v: totalIncome - totalExpenses, c: (totalIncome - totalExpenses) >= 0 ? 'text-primary' : 'text-red-400', i: Sparkles },
                { l: isArabic ? 'الديون النشطة (علي)' : 'ACTIVE_LIABILITIES', v: entries.filter(e => e.type === 'Debt (Owed To Someone)').reduce((acc, e) => acc + e.amount, 0), c: 'text-amber-500', i: ShieldAlert },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center p-5 rounded-2xl bg-surface-variant/20 hover:bg-surface-variant/30 transition-all border border-transparent hover:border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <s.i size={18} className={s.c} />
                    <span className="text-[10px] font-bold text-on-surface-variant/70 tracking-widest uppercase">{s.l}</span>
                  </div>
                  <span className={cn("text-xl font-headline font-black", s.c)}>{s.v.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Projected Outlook Card */}
            <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-amber-500" />
                  <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase">{isArabic ? 'التوقعات المستقبلية' : 'PROJECTED_OUTLOOK'}</span>
                </div>
                <span className="text-[9px] font-mono opacity-40">ALPHA_v1</span>
              </div>
              {(() => {
                const expectedIn = entries.filter(e => e.type === 'Expected' && (e.source.toLowerCase().includes('دخل') || e.source.toLowerCase().includes('salary') || e.source.toLowerCase().includes('freelance'))).reduce((a, e) => a + e.amount, 0);
                const expectedOut = entries.filter(e => e.type === 'Expected' && !(e.source.toLowerCase().includes('دخل') || e.source.toLowerCase().includes('salary') || e.source.toLowerCase().includes('freelance'))).reduce((a, e) => a + e.amount, 0);
                const projection = netWorth + expectedIn - expectedOut;
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] text-on-surface-variant font-bold uppercase">{isArabic ? 'الثروة المتوقعة بنهاية الفترة' : 'ESTIMATED_MONTH_END'}</span>
                      <span className={cn("text-2xl font-black font-headline", projection >= netWorth ? "text-primary" : "text-amber-500")}>
                        {projection.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-on-surface/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-full bg-gradient-to-r from-amber-500/40 to-primary"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>


          <section className="bg-primary/10 rounded-3xl p-8 border border-primary/20">
            <h4 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-4">Financial Insight</h4>
            <p className="text-sm leading-relaxed font-medium">
              {isArabic
                ? "يتم موازنة المحفظة تلقائياً عند تنفيذ معاملة. المس مبالغ البنوك أعلاه لتعديلها يدوياً إذا لزم الأمر."
                : "Balances update in real-time. Tap the account values above to manually override snapshots when needed."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

// --- View: Nutrition ---

const NutritionView = ({ userId, isArabic, selectedDate, setSelectedDate }: { 
  userId: string, 
  isArabic: boolean,
  selectedDate: string,
  setSelectedDate: (d: string) => void
}) => {
  const todayStr = getSystemToday();
  const nutriDate = selectedDate;
  const setNutriDate = setSelectedDate;
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: '', meal: 'BREAKFAST', calories: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    // Start and end of the SELECTED date
    const startOfTarget = new Date(nutriDate + 'T00:00:00');
    const endOfTarget = new Date(nutriDate + 'T23:59:59');

    const q = query(
      collection(db, `users/${userId}/nutrition`),
      where('createdAt', '>=', startOfTarget),
      where('createdAt', '<=', endOfTarget),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as NutritionEntry)));
      setLoading(false);
    });
    return () => unsub();
  }, [userId, nutriDate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, `users/${userId}/nutrition`), {
        name: form.name,
        meal: form.meal,
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
        createdAt: nutriDate === getSystemToday() ? serverTimestamp() : new Date(nutriDate + 'T' + new Date().toTimeString().split(' ')[0]),
      });
      setForm({ name: '', meal: 'BREAKFAST', calories: '', protein: '', carbs: '', fat: '' });
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, `users/${userId}/nutrition`, id));
  };

  const mealIconMap: Record<string, React.ElementType> = {
    BREAKFAST: Apple,
    LUNCH: Pizza,
    DINNER: Utensils,
    PRE_WORKOUT: Flame,
    INTRA_WORKOUT: Zap,
    POST_WORKOUT: CheckCircle2,
    SNACK: Coffee,
    GENERAL: Activity,
  };

  const MEAL_ORDER: Record<string, number> = {
    BREAKFAST: 1,
    LUNCH: 2,
    PRE_WORKOUT: 3,
    INTRA_WORKOUT: 4,
    POST_WORKOUT: 5,
    SNACK: 6,
    GENERAL: 7,
  };

  const sortedEntries = [...entries].sort((a, b) => {
    const orderA = MEAL_ORDER[a.meal] || 99;
    const orderB = MEAL_ORDER[b.meal] || 99;
    if (orderA !== orderB) return orderA - orderB;
    // Secondary sort by creation time (newest inside category)
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + e.calories,
    protein: acc.protein + e.protein,
    carbs: acc.carbs + e.carbs,
    fat: acc.fat + e.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const macros = [
    { label: isArabic ? 'سعرات' : 'Calories', val: `${totals.calories}`, total: '1935', percent: Math.min(Math.round(totals.calories / 19.35), 100), unit: 'kcal' },
    { label: isArabic ? 'بروتين' : 'Protein', val: `${totals.protein}g`, total: '196g', percent: Math.min(Math.round(totals.protein / 1.96), 100), unit: '' },
    { label: isArabic ? 'كارب' : 'Carbs', val: `${totals.carbs}g`, total: '175g', percent: Math.min(Math.round(totals.carbs / 1.75), 100), unit: '' },
    { label: isArabic ? 'دهون' : 'Fat', val: `${totals.fat}g`, total: '47g', percent: Math.min(Math.round(totals.fat / 0.47), 100), unit: '' },
  ];

  const mealEntries = Object.keys(MEAL_ORDER).map(mealKey => ({
    key: mealKey,
    label: isArabic ? (mealKey === 'BREAKFAST' ? 'الفطار' : mealKey === 'LUNCH' ? 'الغداء' : mealKey === 'PRE_WORKOUT' ? 'قبل التمرين' : mealKey === 'INTRA_WORKOUT' ? 'أثناء التمرين' : mealKey === 'POST_WORKOUT' ? 'بعد التمرين' : mealKey === 'SNACK' ? 'وجبة خفيفة' : 'عامة') : mealKey,
    entries: sortedEntries.filter(e => e.meal === mealKey),
    totalKcal: sortedEntries.filter(e => e.meal === mealKey).reduce((sum, e) => sum + e.calories, 0),
    Icon: mealIconMap[mealKey] || Utensils
  })).filter(group => group.entries.length > 0);

  return (
    <div className="space-y-10 h-full overflow-y-auto no-scrollbar pb-24" dir={isArabic ? 'rtl' : 'ltr'}>

      {/* Daily Protocol Header */}
      <section className="bg-surface-container rounded-3xl p-8 border border-outline-variant/20 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        <DateNavigator selectedDate={nutriDate} setSelectedDate={setNutriDate} isArabic={isArabic} todayStr={todayStr} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-on-surface-variant">
            {isArabic ? 'التغذية اليومية' : 'DAILY_NUTRITION_VITALS'}
          </h2>
          <span className="text-[9px] font-mono text-primary/60 tracking-tighter">
            {isArabic ? 'مزامنة فورية' : 'FIREBASE_REALTIME'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {macros.map((macro, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ backgroundColor: 'rgba(var(--md-sys-color-primary-rgb), 0.12)', scale: 1.02 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface-container rounded-3xl p-8 flex flex-col items-center justify-center space-y-6 border border-outline-variant/20 relative overflow-hidden group shadow-xl hover:bg-surface-container-high transition-all"
            >
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90">
                  <circle className="text-surface-container-highest" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8" />
                  <motion.circle
                    initial={{ strokeDashoffset: 301.6 }}
                    animate={{ strokeDashoffset: 301.6 * (1 - macro.percent / 100) }}
                    className="text-primary" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeDasharray="301.6" strokeWidth="8" strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-headline font-black">{macro.percent}%</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">{macro.label}</div>
                <div className="text-lg font-bold mt-1">{macro.val} <span className="text-on-surface-variant/40 text-sm font-medium">/ {macro.total}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <style>{`
          .no-spinner::-webkit-inner-spin-button, 
          .no-spinner::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
          }
          .no-spinner {
            -moz-appearance: textfield;
          }
        `}</style>
        <aside className={cn("xl:col-span-4 space-y-8", isArabic ? "xl:order-1" : "xl:order-2")}>
          <section className="bg-surface-container-high rounded-3xl p-8 border border-outline-variant/30 space-y-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <Plus size={16} className="text-primary" />
              <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase">
                {isArabic ? 'إدخال سريع' : 'QUICK_ENTRY_SYSTEM'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase px-1 tracking-widest">
                  {isArabic ? 'اسم الطعام' : 'Food_Name'}
                </label>
                <input
                  className="w-full recessed-input text-sm py-4 px-5"
                  placeholder={isArabic ? 'اختر اسم الطعام...' : 'Entry Label...'}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  dir={isArabic ? 'rtl' : 'ltr'}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase px-1 tracking-widest">
                  {isArabic ? 'فئة الوجبة' : 'Meal_Category'}
                </label>
                <OSSelect
                  value={form.meal}
                  onChange={(val: string) => setForm(f => ({ ...f, meal: val }))}
                  isArabic={isArabic}
                  options={Object.keys(MEAL_ORDER).map(k => ({
                    value: k,
                    label: k,
                    labelAr: k === 'BREAKFAST' ? 'الفطار' : k === 'LUNCH' ? 'الغداء' : k === 'PRE_WORKOUT' ? 'وجبة قبل التمرين' : k === 'INTRA_WORKOUT' ? 'أثناء التمرين' : k === 'POST_WORKOUT' ? 'وجبة بعد التمرين' : k === 'SNACK' ? 'وجبة خفيفة' : 'عامة',
                    icon: mealIconMap[k] || Utensils
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: isArabic ? 'طاقة (سعرة)' : 'Energy_kcal', key: 'calories', req: true, icon: Flame, color: 'text-orange-400' },
                  { label: isArabic ? 'بروتين (ج)' : 'Protein_g', key: 'protein', icon: Zap, color: 'text-blue-400' },
                  { label: isArabic ? 'كارب (ج)' : 'Carbs_g', key: 'carbs', icon: Activity, color: 'text-emerald-400' },
                  { label: isArabic ? 'دهون (ج)' : 'Fat_g', key: 'fat', icon: Droplets, color: 'text-amber-400' },
                ].map(f => (
                  <div key={f.key} className="space-y-3 p-4 bg-surface-container-high/50 rounded-2xl border border-outline-variant/10 shadow-inner">
                    <div className="flex items-center gap-2 px-1">
                      <f.icon size={12} className={f.color} />
                      <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em]">{f.label}</label>
                    </div>
                    <input
                      type="number"
                      className="w-full bg-transparent text-xl font-headline font-black focus:outline-none no-spinner"
                      placeholder="0"
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      required={f.req}
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-6 rounded-2xl bg-primary text-surface font-black text-xs tracking-[0.4em] uppercase shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={24} className="animate-spin" /> : <PlusCircle size={20} />}
                {submitting ? (isArabic ? 'جارٍ تسجيل البيانات...' : 'SYNCING...') : (isArabic ? 'إضافة الوجبة الآن' : 'LOG_MEAL_DATA')}
              </button>
            </form>
          </section>
        </aside>

        <section className={cn("xl:col-span-8 bg-surface-container rounded-3xl overflow-hidden border border-outline-variant/20 flex flex-col min-h-[500px] shadow-2xl", isArabic ? "xl:order-2" : "xl:order-1")}>
          <div className="p-8 border-b border-outline-variant/20 flex justify-between items-center bg-surface-variant/10">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase">
              {isArabic ? 'سجل الطعام اليومي' : 'CHRONOLOGICAL_FOOD_LOG'}
            </h3>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
              {entries.length} {isArabic ? 'سجل' : 'entries'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="text-primary animate-spin" size={32} /></div>
            ) : mealEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <Utensils size={48} className="text-primary mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">
                  {isArabic ? 'لا إدخالات بعد' : 'No food entries yet'}
                </p>
              </div>
            ) : mealEntries.map((group) => (
              <div key={group.key} className="space-y-4">
                <button
                  onClick={() => toggleCategory(group.key)}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-2xl hover:bg-surface-container-highest/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <group.Icon size={18} />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black tracking-widest uppercase">{group.label}</div>
                      <div className="text-[10px] text-on-surface-variant font-bold opacity-60">
                        {group.entries.length} {isArabic ? 'إصناف' : 'items'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-base font-black text-primary">{group.totalKcal} <small className="text-[10px] opacity-40">kcal</small></div>
                    </div>
                    <motion.div animate={{ rotate: openCategories[group.key] ? 0 : 180 }}>
                      <ChevronRight size={16} className="text-primary/40 rotate-90" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {openCategories[group.key] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3 pr-4"
                    >
                      {group.entries.map((entry) => (
                        <div key={entry.id} className="p-5 flex items-center justify-between bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all group">
                          <div className="flex-1">
                            <div className="text-base font-bold">{entry.name}</div>
                            <div className="text-[10px] text-on-surface-variant font-mono mt-1 flex gap-3 opacity-60">
                              <span>{entry.protein}p</span>
                              <span>{entry.carbs}c</span>
                              <span>{entry.fat}f</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-lg font-black text-primary">{entry.calories} <small className="text-[10px] font-medium opacity-40">kcal</small></div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                              className="w-10 h-10 rounded-xl bg-red-400/10 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<AppMode>(() => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      return (localStorage.getItem('activeMode') as AppMode) || 'DASHBOARD';
    }
    return 'LOADING';
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isArabic, setIsArabic] = useState(() => localStorage.getItem('isArabic') === 'true');

  const todayStr = getSystemToday();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState<'DAILY' | 'WEEKLY'>('DAILY');

  useEffect(() => {
    localStorage.setItem('isArabic', isArabic ? 'true' : 'false');
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
  }, [isArabic]);

  useEffect(() => {
    if (mode !== 'LOADING' && mode !== 'AUTH') {
      localStorage.setItem('activeMode', mode);
    }
  }, [mode]);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Check if the signed-in user is whitelisted
        if (firebaseUser.email === WHITELISTED_EMAIL) {
          setUser(firebaseUser);
          localStorage.setItem('isLoggedIn', 'true');
          const savedMode = localStorage.getItem('activeMode') as AppMode;
          setMode(savedMode && savedMode !== 'AUTH' ? savedMode : 'DASHBOARD');
        } else {
          // Sign out unauthorized users
          signOut(auth);
          setAuthError('This dashboard is private.');
          setUser(null);
          setMode('AUTH');
        }
      } else {
        setUser(null);
        localStorage.removeItem('isLoggedIn');
        setMode('AUTH');
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== WHITELISTED_EMAIL) {
        await signOut(auth);
        setAuthError('This dashboard is private.');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Authentication failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMode('AUTH');
  };

  if (mode === 'LOADING') {
    return <LoadingScreen />;
  }

  if (mode === 'AUTH') {
    return <AuthView onLogin={handleLogin} isLoading={authLoading} error={authError} isArabic={isArabic} />;
  }

  const getTitle = () => {
    if (isArabic) {
      switch (mode) {
        case 'DASHBOARD': return 'الرئيسية';
        case 'MEDICAL': return 'النظام الطبي / العلامات الحيوية';
        case 'FINANCIAL': return 'التقرير المالي / المالية';
        case 'NUTRITION': return 'نظام التغذية / الأيض';
        default: return 'النظام الشخصي';
      }
    }
    switch (mode) {
      case 'DASHBOARD': return 'DASHBOARD';
      case 'MEDICAL': return 'MEDICAL OS / VITAL SIGNS';
      case 'FINANCIAL': return 'FINANCIAL OS / WALLETS';
      case 'NUTRITION': return 'NUTRITION OS / METABOLICS';
      default: return 'PERSONAL OS';
    }
  };

  return (
    <div className="min-h-screen bg-surface" dir={isArabic ? 'rtl' : 'ltr'}>
      <GlobalStyles />
      <TopBar
        title={getTitle()}
        isArabic={isArabic}
        toggleLanguage={() => setIsArabic(v => !v)}
        user={user}
        onLogout={handleLogout}
      />

      <main className="pt-16 px-4 sm:px-6 lg:px-10 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {mode === 'DASHBOARD' && user && <DashboardView userId={user.uid} isArabic={isArabic} setMode={setMode} selectedDate={selectedDate} setSelectedDate={setSelectedDate} viewMode={viewMode} setViewMode={setViewMode} />}
            {mode === 'MEDICAL' && user && <MedicalView userId={user.uid} isArabic={isArabic} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
            {mode === 'FINANCIAL' && user && <FinancialView userId={user.uid} isArabic={isArabic} selectedDate={selectedDate} />}
            {mode === 'NUTRITION' && user && <NutritionView userId={user.uid} isArabic={isArabic} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}

          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeMode={mode} setMode={setMode} isArabic={isArabic} />

      {/* Global Medication Reminder Overlay */}
      {user && mode !== 'LOADING' && mode !== 'AUTH' && (
        <MedicationReminderOverlay userId={user.uid} isArabic={isArabic} setMode={setMode} />
      )}
    </div>
  );
}

interface ActiveReminder {
  medId: string;
  doseIdx: number;
  medName: string;
  doseTime: string;
}

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    // Play a friendly electronic chime (E5 -> C6)
    playNote(659.25, audioCtx.currentTime, 0.4);
    playNote(1046.50, audioCtx.currentTime + 0.15, 0.6);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const MedicationReminderOverlay = ({ userId, isArabic, setMode }: { userId: string, isArabic: boolean, setMode: (m: AppMode) => void }) => {
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [lastSoundPlayedAt, setLastSoundPlayedAt] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, `users/${userId}/medcheck`, today), (snap) => {
      setChecks(snap.exists() ? (snap.data() as Record<string, boolean>) : {});
    });
    return () => unsub();
  }, [userId, today]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHH = now.getHours().toString().padStart(2, '0');
      const currentMM = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${currentHH}:${currentMM}`;
      
      const newReminders: ActiveReminder[] = [];
      const dismissedKey = `dismissed_reminders_${today}`;
      const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');

      MEDICINE_SCHEDULE.forEach(med => {
        med.doses.forEach(dose => {
           if (dose.time !== '—' && dose.time <= timeStr) {
              const [dH, dM] = dose.time.split(':').map(Number);
              const [cH, cM] = timeStr.split(':').map(Number);
              const diffMins = (cH * 60 + cM) - (dH * 60 + dM);
              
              // Only show the reminder during its dedicated hour!
              if (diffMins >= 0 && diffMins <= 59) {
                 const checkKey = `${med.id}_${dose.idx}`;
                 
                 // Only trigger if it wasn't logged as done and not manually dismissed
                 if (!checks[checkKey] && !dismissed.includes(checkKey)) {
                    newReminders.push({
                      medId: med.id,
                      doseIdx: dose.idx,
                      medName: med.nameLine1,
                      doseTime: dose.displayTime
                    });
                 }
              }
           }
        });
      });

      if (newReminders.length > 0) {
        let playedSound = false;
        const notifiedNativeKey = `notified_native_${today}`;
        const notifiedLocally: string[] = JSON.parse(sessionStorage.getItem(notifiedNativeKey) || '[]');
        
        newReminders.forEach(r => {
           const checkKey = `${r.medId}_${r.doseIdx}`;
           if (!notifiedLocally.includes(checkKey)) {
              if ('Notification' in window && Notification.permission === 'granted') {
                 try {
                   const n = new Notification(isArabic ? 'تذكير العلاج' : 'MED_REMINDER', {
                      body: isArabic 
                        ? `حان وقت جرعة الموعد (${r.doseTime}) الخاصة بـ ${r.medName}.`
                        : `Time for your (${r.doseTime}) dose of ${r.medName}.`,
                   });
                   n.onclick = () => {
                     window.focus();
                     setMode('MEDICAL');
                     n.close();
                   };
                 } catch (e) {
                   console.error("Notification API error", e);
                 }
              }
              notifiedLocally.push(checkKey);
              playedSound = true;
           }
        });

        if (playedSound) {
           sessionStorage.setItem(notifiedNativeKey, JSON.stringify(notifiedLocally));
        }

        setActiveReminders(newReminders);

        if (playedSound && now.getTime() - lastSoundPlayedAt > 60000) {
           playNotificationSound();
           setLastSoundPlayedAt(now.getTime());
        }
      } else {
        setActiveReminders([]);
      }
    };

    // Run once immediately, then every 15 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [checks, today, lastSoundPlayedAt]);

  const dismissReminder = (medId: string, doseIdx: number) => {
     const checkKey = `${medId}_${doseIdx}`;
     const dismissedKey = `dismissed_reminders_${today}`;
     const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
     dismissed.push(checkKey);
     localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
     
     setActiveReminders(prev => prev.filter(r => !(r.medId === medId && r.doseIdx === doseIdx)));
  };

  if (activeReminders.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-24 sm:bottom-8 right-4 sm:right-8 z-[100] flex flex-col gap-4 max-w-sm w-[calc(100%-2rem)]">
      <AnimatePresence>
         {activeReminders.map(r => (
           <motion.div 
             key={`${r.medId}_${r.doseIdx}`}
             initial={{ opacity: 0, y: 50, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
             onClick={() => setMode('MEDICAL')}
             className="bg-surface-container-high/90 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative overflow-hidden group cursor-pointer hover:border-primary/40 hover:shadow-primary/10 transition-all"
             dir={isArabic ? 'rtl' : 'ltr'}
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 relative z-10">
                 <BellRing size={24} className="animate-pulse" />
              </div>
              
              <div className="flex-1 relative z-10">
                 <h4 className="text-[14px] font-black text-on-surface tracking-wide mb-1 flex items-center gap-2">
                   {isArabic ? 'تذكير العلاج' : 'MED_REMINDER'}
                   <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                 </h4>
                 <p className="text-xs text-on-surface-variant/80 font-medium leading-relaxed">
                   {isArabic 
                    ? `حان وقت جرعة الموعد (${r.doseTime}) الخاصة بـ `
                    : `Time for your (${r.doseTime}) dose of `}
                    <strong className="text-primary font-bold">{r.medName}</strong>.
                 </p>
                 <div className="mt-3 flex gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMode('MEDICAL'); }} 
                      className="text-[10px] font-bold tracking-[0.2em] bg-primary text-surface px-4 py-2 rounded-xl uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                       {isArabic ? 'اذهب للبروتوكول' : 'TAKE NOW'}
                    </button>
                 </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); dismissReminder(r.medId, r.doseIdx); }} 
                className="absolute top-4 left-4 p-2 text-on-surface-variant/40 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors z-10"
              >
                <X size={16} />
              </button>
           </motion.div>
         ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};
