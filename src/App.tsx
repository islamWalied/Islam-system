import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Pill,
  Plus,
  Search,
  Bell,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Bolt,
  Wallet,
  ArrowLeftRight,
  Landmark,
  Repeat,
  LogOut,
  CreditCard,
  User as UserIcon,
  Utensils,
  BarChart3,
  Coffee,
  Pizza,
  Apple,
  Menu,
  Trash2,
  Loader2,
  Languages,
  Droplets,
  Eye,
  Sparkles,
  Clock,
  Flame,
  Zap,
  Activity,
  PlusCircle,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

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
  collection, addDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, setDoc, runTransaction, where, doc, serverTimestamp, type Timestamp 
} from 'firebase/firestore';



// --- Types ---

type AppMode = 'AUTH' | 'LOADING' | 'MEDICAL' | 'FINANCIAL' | 'NUTRITION';

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
      { idx: 0, time: '—', displayTime: '—', note: 'استخدم الشامبو' }
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
    { id: 'NUTRITION', icon: Utensils, labelAr: 'التغذية', labelEn: 'Nutrition', color: 'text-emerald-400', activeBg: 'bg-emerald-400/20' },
    { id: 'FINANCIAL', icon: Landmark, labelAr: 'المالية', labelEn: 'Financial', color: 'text-primary', activeBg: 'bg-primary/20' },
    { id: 'MEDICAL', icon: Pill, labelAr: 'الطبي', labelEn: 'Medical', color: 'text-blue-400', activeBg: 'bg-blue-400/20' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xs bg-surface-container/95 backdrop-blur-2xl border border-outline-variant/40 rounded-3xl flex shadow-2xl shadow-black/60 overflow-hidden">
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

// --- View: Medical ---

const MedicalView = ({ userId, isArabic }: { userId: string, isArabic: boolean }) => {

  const today = new Date().toISOString().split('T')[0];
  const todayJS = new Date().getDay(); // 0=Sun … 6=Sat

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

  const todayDateStr = new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
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
                {MEDICINE_SCHEDULE.map((med, mIdx) => {
                  const isToday = med.frequency === 'daily' ||
                    (med.weekDays && med.weekDays.includes(todayJS));

                  if (!isToday && med.weekDays) return null;

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
                                    <div className={cn('w-6 h-6 rounded-lg border-2 flex items-center justify-center', isChecked ? 'bg-primary border-primary' : 'border-outline-variant')}>
                                      {isLoadingDose ? <Loader2 size={12} className="animate-spin" /> : (isChecked && <CheckCircle2 size={14} className="text-white" />)}
                                    </div>
                                    <div className="flex-1 text-sm font-bold">{isArabic ? dose.note : enNotes[dose.idx] || dose.note}</div>
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
                ? "يتم تتبع الجرعات يومياً. يتم إعادة ضبط الجدول تلقائياً عند منتصف الليل لبدء بروتوكول جديد." 
                : "Doses are tracked daily. The schedule resets automatically at midnight for the next protocol cycle."}
            </p>
          </section>
        </div>

      </div>
    </div>
  );
};




// --- View: Financial ---

const FinancialView = ({ userId, isArabic }: { userId: string, isArabic: boolean }) => {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('EGP');
  const [form, setForm] = useState({ 
    type: 'Expense', 
    amount: '', 
    source: '', 
    date: new Date().toISOString().split('T')[0],
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
    const unsubEntries = onSnapshot(qEntries, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialEntry)));
      setLoading(false);
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

        // A. Reverse Old Impact on Old Account
        if (oldEntryData && oldEntryData.type !== 'Expected') {
          const isOldDeduction = oldEntryData.type === 'Expense' || oldEntryData.type === 'Debt (Owed To Someone)';
          const reversalAmount = isOldDeduction ? oldEntryData.amount : -oldEntryData.amount;
          
          if (oldAccId === form.accountId) {
            newBalanceForNewAcc += reversalAmount;
          } else if (oldAccountDoc && oldAccountDoc.exists()) {
            finalOldAccBalance = (oldAccountDoc.data().balance || 0) + reversalAmount;
          }
        }

        // B. Apply New Impact on New Account
        if (form.type !== 'Expected') {
          const isNewDeduction = form.type === 'Expense' || form.type === 'Debt (Owed To Someone)';
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
        const isDeduction = entryType === 'Expense' || entryType === 'Debt (Owed To Someone)';
        
        // 1. Get the account (if it exists in the record AND is NOT Expected)
        if (entryAccountId && entryType !== 'Expected') {
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

  const totalExpenses = entries.filter(e => e.type === 'Expense' || e.type === 'Debt (Owed To Someone)').reduce((acc, e) => acc + e.amount, 0);
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
                              { value: 'Debt (Owed To Me)', label: 'Owed To Me', labelAr: 'دين (لي)', icon: UserIcon },
                              { value: 'Debt (Owed To Someone)', label: 'Owed To Someone', labelAr: 'دين (علي)', icon: ShieldAlert },
                              { value: 'Expected', label: 'Expected', labelAr: 'متوقع', icon: Clock },
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
                            onClick={() => { setEditingId(null); setIsFormOpen(false); setForm({ ...form, amount: '', source: '', date: new Date().toISOString().split('T')[0] }); }}
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
                const isExpected = entry.type === 'Expected';
                const isDebtMe = entry.type === 'Debt (Owed To Me)';
                
                // Timeline Separator Logic
                const prevEntry = idx > 0 ? entries[idx - 1] : null;
                const showDateHeader = !prevEntry || prevEntry.date !== entry.date;
                
                let dateDisplay = entry.date;
                if (entry.date === new Date().toISOString().split('T')[0]) dateDisplay = isArabic ? 'اليوم' : 'Today';
                else if (entry.date === new Date(Date.now() - 86400000).toISOString().split('T')[0]) dateDisplay = isArabic ? 'أمس' : 'Yesterday';

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
                          isExpense ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          isExpected ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          isDebtMe ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        )}>
                          {isExpense ? <ShieldAlert size={22} /> : isExpected ? <Clock size={22} /> : isDebtMe ? <UserIcon size={22} /> : <ArrowLeftRight size={22} />}
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
                            isExpense ? 'text-red-400' : isExpected ? 'text-amber-500' : isDebtMe ? 'text-indigo-400' : 'text-emerald-400'
                          )}>
                            {isExpense ? '-' : '+'}{entry.amount.toLocaleString()} <span className="text-[10px] opacity-40">{entry.currency}</span>
                          </div>
                          <p className="text-[8px] font-bold text-on-surface-variant/30 uppercase tracking-[0.3em] mt-0.5">
                            {isArabic 
                              ? (entry.type === 'Debt (Owed To Me)' ? 'دين لي' : entry.type === 'Debt (Owed To Someone)' ? 'دين علي' : entry.type === 'Expense' ? 'مصروف' : entry.type === 'Expected' ? 'متوقع' : 'دخل')
                              : entry.type.replace('Debt (', '').replace(')', '')}
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

const NutritionView = ({ userId, isArabic }: { userId: string, isArabic: boolean }) => {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  const [form, setForm] = useState({ name: '', meal: 'BREAKFAST', calories: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, `users/${userId}/nutrition`),
      where('createdAt', '>=', startOfToday),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as NutritionEntry)));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);


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
        createdAt: serverTimestamp(),
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

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    BREAKFAST: true,
    LUNCH: true,
    PRE_WORKOUT: true,
    INTRA_WORKOUT: true,
    POST_WORKOUT: true,
    SNACK: true,
    GENERAL: true
  });

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
        <div className="relative z-10 flex items-center justify-between">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-1">
                    {isArabic ? 'البروتوكول الغذائي اليومي' : 'DAILY_NUTRITION_PROTOCOL'}
                </p>
                <h1 className="text-3xl font-headline font-black text-on-surface">
                    {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h1>
            </div>
            <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono text-primary/60 uppercase">Real-Time Tracker</span>
            </div>
        </div>
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
      return (localStorage.getItem('activeMode') as AppMode) || 'LOADING';
    }
    return 'LOADING';
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isArabic, setIsArabic] = useState(() => localStorage.getItem('isArabic') === 'true');

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
          setMode(savedMode && savedMode !== 'AUTH' ? savedMode : 'MEDICAL');
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
        case 'MEDICAL': return 'النظام الطبي / العلامات الحيوية';
        case 'FINANCIAL': return 'التقرير المالي / المالية';
        case 'NUTRITION': return 'نظام التغذية / الأيض';
        default: return 'النظام الشخصي';
      }
    }
    switch (mode) {
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
            {mode === 'MEDICAL' && user && <MedicalView userId={user.uid} isArabic={isArabic} />}
            {mode === 'FINANCIAL' && user && <FinancialView userId={user.uid} isArabic={isArabic} />}
            {mode === 'NUTRITION' && user && <NutritionView userId={user.uid} isArabic={isArabic} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeMode={mode} setMode={setMode} isArabic={isArabic} />
    </div>
  );
}

