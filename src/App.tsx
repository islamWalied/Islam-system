import React, { useState, useEffect } from 'react';
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
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
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
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  type Timestamp
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
      { idx: 0, time: '09:00', displayTime: '9:00 ص',  note: 'الجرعة الأولى' },
      { idx: 1, time: '13:00', displayTime: '1:00 م',  note: 'الجرعة الثانية' },
      { idx: 2, time: '17:00', displayTime: '5:00 م',  note: 'الجرعة الثالثة' },
      { idx: 3, time: '21:00', displayTime: '9:00 م',  note: 'الجرعة الرابعة' },
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
      { idx: 0, time: '09:30', displayTime: '9:30 ص',  note: 'الجرعة الأولى' },
      { idx: 1, time: '13:30', displayTime: '1:30 م',  note: 'الجرعة الثانية' },
      { idx: 2, time: '17:30', displayTime: '5:30 م',  note: 'الجرعة الثالثة' },
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
  createdAt: Timestamp | null;
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

// --- Components ---

const LoadingScreen = () => (
  <div className="min-h-screen bg-surface flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="text-primary animate-spin" size={48} />
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Verifying Identity...</p>
    </div>
  </div>
);

const Sidebar = ({ user, activeMode, setMode, isOpen, toggle, onLogout, isArabic }: {
  user: FirebaseUser | null,
  activeMode: AppMode,
  setMode: (m: AppMode) => void,
  isOpen: boolean,
  toggle: () => void,
  onLogout: () => void,
  isArabic: boolean
}) => {
  const menuItems = [
    { id: 'MEDICAL', label: isArabic ? 'النظام الطبي' : 'Medical OS', icon: Pill, sub: isArabic ? 'العلامات الحيوية مستقرة' : 'Vitals Stable' },
    { id: 'FINANCIAL', label: isArabic ? 'نظام إسلام' : 'Islam OS', icon: Landmark, sub: isArabic ? 'تتبع دقيق' : 'Precision Tracking' },
    { id: 'NUTRITION', label: isArabic ? 'نظام التغذية' : 'Nutrition OS', icon: Utensils, sub: isArabic ? 'الأيض مثالي' : 'Metabolism Optimal' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed top-0 h-screen w-64 bg-surface-container border-r border-outline-variant flex flex-col py-6 z-50 transition-transform duration-300 lg:translate-x-0",
        isArabic ? "right-0 border-l border-r-0" : "left-0",
        isOpen ? "translate-x-0" : (isArabic ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className="px-6 mb-10">
          <div className="text-xl font-bold tracking-tighter text-primary font-headline">{isArabic ? 'النظام الشخصي' : 'PERSONAL OS'}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{isArabic ? 'النواة الأساسية v4.2' : 'System Core v4.2'}</div>
        </div>

        <div className="px-4 mb-6 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 px-2">{isArabic ? 'اختيار الوحدة' : 'Module Select'}</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setMode(item.id as AppMode); if (window.innerWidth < 1024) toggle(); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                isArabic ? "flex-row-reverse text-right" : "",
                activeMode === item.id
                  ? cn("bg-surface-container-highest text-primary shadow-lg shadow-primary/5", isArabic ? "border-r-4 border-primary" : "border-l-4 border-primary")
                  : "text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface"
              )}
            >
              <item.icon size={20} />
              <div className={isArabic ? "text-right" : "text-left"}>
                <div className="text-xs font-bold uppercase tracking-wider">{item.label}</div>
                <div className="text-[9px] opacity-60">{item.sub}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 mt-auto space-y-6">
          <div className={cn("flex items-center gap-3 px-2 py-2 border-t border-outline-variant", isArabic && "flex-row-reverse")}>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant bg-surface-container-highest flex-shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary">
                  <UserIcon size={20} />
                </div>
              )}
            </div>
            <div className={cn("overflow-hidden flex-1", isArabic && "text-right")}>
              <p className="text-xs font-bold truncate">{user?.displayName || (isArabic ? 'المشغّل' : 'Operator')}</p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter truncate">{user?.email}</p>
            </div>
            <button onClick={onLogout} className="ml-auto text-on-surface-variant hover:text-red-400 transition-colors flex-shrink-0" title={isArabic ? 'تسجيل الخروج' : 'Sign Out'}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const TopBar = ({ title, toggleSidebar, isArabic, toggleLanguage }: { title: string, toggleSidebar: () => void, isArabic: boolean, toggleLanguage: () => void }) => {
  return (
    <header className={cn(
      "fixed top-0 h-16 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 border-b border-outline-variant",
      isArabic ? "right-0 lg:right-64 left-0" : "right-0 left-0 lg:left-64"
    )}>
      <div className={cn("flex items-center gap-4", isArabic && "flex-row-reverse")}>
        <button onClick={toggleSidebar} className="lg:hidden text-on-surface-variant hover:text-primary">
          <Menu size={24} />
        </button>
        <div className="text-xs font-black tracking-widest text-on-surface uppercase">{title}</div>
        <div className="hidden sm:flex items-center gap-2 text-primary">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest uppercase">{isArabic ? 'مزامنة Firebase' : 'Firebase Synced'}</span>
        </div>
      </div>

      <div className={cn("flex items-center gap-4", isArabic && "flex-row-reverse")}>
        <div className="relative hidden md:flex items-center bg-black/40 rounded-full px-4 py-1.5 w-64 border border-outline-variant">
          <Search size={14} className="text-on-surface-variant mr-2" />
          <input
            type="text"
            placeholder={isArabic ? 'بحث في السجلات...' : 'Search records...'}
            className="bg-transparent border-none text-xs focus:ring-0 p-0 placeholder-on-surface-variant/50 w-full"
            dir={isArabic ? 'rtl' : 'ltr'}
          />
        </div>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary"
          title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          <Languages size={16} />
          <span className="text-[10px] font-bold">{isArabic ? 'EN' : 'عر'}</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <Bell size={20} />
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <ShieldAlert size={20} />
        </button>
      </div>
    </header>
  );
};

// --- View: Auth ---

const AuthView = ({ onLogin, isLoading, error }: { onLogin: () => void, isLoading: boolean, error: string | null }) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-surface-bright/20 blur-[120px] rounded-full pointer-events-none" />

      <header className="fixed top-0 w-full flex items-center justify-between px-8 py-6">
        <div className="text-xl font-bold tracking-widest uppercase text-primary font-headline">PERSONAL OS</div>
        <button className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Support</button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] glass-card p-10 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="font-headline font-bold text-4xl tracking-tight text-on-surface mb-3">Welcome Back</h1>
          <p className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-bold">Access your digital sanctuary</p>
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
            {isLoading ? 'Authenticating...' : 'Sign in with Google'}
          </span>
        </button>

        <div className="flex items-center gap-4 opacity-30 justify-center">
          <div className="h-[1px] flex-1 bg-on-surface" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure Protocol</span>
          <div className="h-[1px] flex-1 bg-on-surface" />
        </div>
      </motion.div>

      <div className="mt-12 flex justify-center items-center gap-8 opacity-40">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Firebase Encrypted</span>
        </div>
        <div className="flex items-center gap-2">
          <Bolt size={14} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Access Restricted</span>
        </div>
      </div>

      <footer className="fixed bottom-0 w-full flex flex-col md:flex-row justify-between items-center px-8 py-8 gap-4 opacity-40">
        <p className="text-[10px] font-bold uppercase tracking-widest">© 2026 Personal OS. Precision Encrypted.</p>
        <div className="flex gap-6">
          <button className="text-[10px] font-bold uppercase tracking-widest hover:text-on-surface transition-colors">Privacy Policy</button>
          <button className="text-[10px] font-bold uppercase tracking-widest hover:text-on-surface transition-colors">Terms of Service</button>
        </div>
      </footer>
    </div>
  );
};

// --- View: Medical ---

const MedicalView = ({ userId }: { userId: string }) => {
  const [entries, setEntries] = useState<MedicalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ medication: '', dose: '', time: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medical`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalEntry)));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medication || !form.dose) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, `users/${userId}/medical`), {
        ...form,
        createdAt: serverTimestamp(),
      });
      setForm({ medication: '', dose: '', time: '', notes: '' });
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, `users/${userId}/medical`, id));
  };

  return (
    <div className="grid grid-cols-12 gap-8 h-full">
      <div className="col-span-12 lg:col-span-8 flex flex-col">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="font-headline text-4xl font-bold text-on-surface">Medical Log</h1>
            <p className="text-on-surface-variant text-sm mt-2">Real-time Firebase synced entries</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="text-primary animate-spin" size={32} />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Pill size={48} className="text-primary mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No entries yet</p>
            </div>
          ) : (
            entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-surface-container p-6 rounded-2xl border border-outline-variant/30 flex items-center justify-between group hover:bg-surface-container-high transition-all"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Pill size={24} />
                  </div>
                  <div>
                    <h3 className="font-headline text-lg font-bold">{entry.medication}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">{entry.dose} {entry.time && `• ${entry.time}`}</p>
                    {entry.notes && <p className="text-[10px] text-on-surface-variant/60 mt-1 italic">{entry.notes}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-on-surface-variant hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-4"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-8">
        <section className="bg-surface-container rounded-3xl p-8 border-t-4 border-primary shadow-2xl">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 flex items-center gap-3">
            <Plus size={16} className="text-primary" />
            Log New Entry
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant/70 tracking-widest">Medication</label>
              <input
                className="w-full recessed-input text-sm py-3 px-4"
                placeholder="e.g. Fortymox Drops"
                value={form.medication}
                onChange={e => setForm(f => ({ ...f, medication: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant/70 tracking-widest">Dose</label>
              <input
                className="w-full recessed-input text-sm py-3 px-4"
                placeholder="e.g. 5 drops / 1 tablet"
                value={form.dose}
                onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant/70 tracking-widest">Time</label>
              <input
                type="time"
                className="w-full recessed-input text-sm py-3 px-4"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant/70 tracking-widest">Notes</label>
              <input
                className="w-full recessed-input text-sm py-3 px-4"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full os-gradient-btn py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {submitting ? 'Saving...' : 'Log Entry'}
            </button>
          </form>
        </section>

        <section className="bg-gradient-to-br from-surface-container-highest to-surface-container p-8 rounded-3xl relative overflow-hidden border border-outline-variant/20">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">Total Logged Today</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-headline font-black">{entries.length}</span>
              <span className="text-xl font-bold text-on-surface-variant">entries</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-4 leading-relaxed">All data persisted securely in Firebase Firestore.</p>
          </div>
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        </section>
      </div>
    </div>
  );
};

// --- View: Financial ---

const FinancialView = ({ userId }: { userId: string }) => {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('EGP');
  const [form, setForm] = useState({ type: 'Expense', amount: '', source: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/financial`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialEntry)));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.source) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, `users/${userId}/financial`), {
        type: form.type,
        amount: parseFloat(form.amount),
        currency: selectedCurrency,
        source: form.source,
        date: form.date,
        createdAt: serverTimestamp(),
      });
      setForm({ type: 'Expense', amount: '', source: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, `users/${userId}/financial`, id));
  };

  const totalExpenses = entries.filter(e => e.type === 'Expense').reduce((acc, e) => acc + e.amount, 0);
  const totalIncome = entries.filter(e => e.type.startsWith('Income')).reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-8 h-full overflow-y-auto no-scrollbar pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-surface-container rounded-3xl p-10 border border-outline-variant/20 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">Financial Overview</span>
            <h1 className="text-5xl md:text-6xl font-headline font-bold mt-4 tracking-tight">Precision Tracking</h1>
            <div className="flex flex-wrap gap-12 mt-12">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Total Expenses</p>
                <p className="text-4xl font-headline font-extrabold">{totalExpenses.toLocaleString('en-EG', { minimumFractionDigits: 2 })} <span className="text-xl font-medium opacity-40">EGP</span></p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Total Income</p>
                <p className="text-4xl font-headline font-extrabold">{totalIncome.toLocaleString('en-EG', { minimumFractionDigits: 2 })} <span className="text-xl font-medium opacity-40">EGP</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          {[
            { label: 'Net Balance', val: (totalIncome - totalExpenses).toLocaleString('en-EG', { minimumFractionDigits: 2 }), color: 'text-green-400', bg: 'bg-green-400/10', icon: Wallet },
            { label: 'Total Income', val: totalIncome.toLocaleString('en-EG', { minimumFractionDigits: 2 }), color: 'text-primary', bg: 'bg-primary/10', icon: ArrowLeftRight },
            { label: 'Total Expenses', val: totalExpenses.toLocaleString('en-EG', { minimumFractionDigits: 2 }), color: 'text-red-400', bg: 'bg-red-400/10', icon: CreditCard },
            { label: 'Transactions', val: entries.length.toString(), color: 'text-blue-400', bg: 'bg-blue-400/10', icon: BarChart3 },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 5 }}
              className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant/30 flex items-center justify-between hover:bg-surface-bright transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                  <item.icon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest">{item.label}</p>
                  <p className="text-xl font-headline font-bold">{item.val}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-surface-container rounded-3xl border border-outline-variant/20 overflow-hidden shadow-2xl">
          <div className="px-8 py-5 border-b border-outline-variant/20 bg-surface-variant/20 flex justify-between items-center">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">NEW_ENTRY_PROTOCOL</h2>
            <span className="text-[9px] font-mono text-primary/60">Firebase Backed</span>
          </div>
          <div className="p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">Transaction Type</label>
                  <select
                    className="w-full recessed-input text-sm py-4 px-5 appearance-none cursor-pointer"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option>Expense</option>
                    <option>Income (Salary)</option>
                    <option>Income (Freelance)</option>
                    <option>Debt (Owed To Me)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">Currency</label>
                  <div className="flex gap-2">
                    {['EGP', 'SAR', 'USD', 'AED'].map(c => (
                      <button key={c} type="button" onClick={() => setSelectedCurrency(c)} className={cn(
                        "flex-1 py-3 rounded-xl font-bold text-[10px] transition-all",
                        selectedCurrency === c ? "bg-primary text-surface" : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright"
                      )}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">Source / Destination</label>
                  <input
                    className="w-full recessed-input text-sm py-4 px-5"
                    placeholder="From: Alex Bank -> To: Freelancer"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">Date</label>
                  <input
                    type="date"
                    className="w-full recessed-input text-sm py-4 px-5"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest px-1">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full recessed-input text-4xl font-headline font-black py-6 px-6 text-right pr-20"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant/40">{selectedCurrency}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full os-gradient-btn py-5 rounded-2xl uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                {submitting ? 'Saving...' : 'Commit Transaction'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-surface-container rounded-3xl border border-outline-variant/20 flex-1 flex flex-col shadow-2xl">
            <div className="px-8 py-5 border-b border-outline-variant/20 flex justify-between items-center">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">RECENT_TRANSACTIONS</h2>
              <Repeat size={16} className="text-on-surface-variant" />
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="text-primary animate-spin" size={24} /></div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                  <Landmark size={32} className="text-primary mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">No transactions yet</p>
                </div>
              ) : entries.slice(0, 8).map((entry, i) => (
                <div key={entry.id} className={cn("p-4 bg-black/20 rounded-xl flex items-center justify-between border-l-4 group", entry.type === 'Expense' ? 'border-red-500' : 'border-primary')}>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold truncate">{entry.source}</p>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">{entry.type} • {entry.date}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <p className={cn("text-sm font-bold", entry.type === 'Expense' ? 'text-red-400' : 'text-primary')}>
                      {entry.type === 'Expense' ? '-' : '+'}{entry.amount.toLocaleString()} {entry.currency}
                    </p>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-on-surface-variant hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- View: Nutrition ---

const NutritionView = ({ userId }: { userId: string }) => {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', meal: 'BREAKFAST', calories: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/nutrition`),
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
    SNACK: Coffee,
  };

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + e.calories,
    protein: acc.protein + e.protein,
    carbs: acc.carbs + e.carbs,
    fat: acc.fat + e.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const macros = [
    { label: 'Calories', val: `${totals.calories}`, total: '2500', percent: Math.min(Math.round(totals.calories / 25), 100), unit: 'kcal' },
    { label: 'Protein', val: `${totals.protein}g`, total: '180g', percent: Math.min(Math.round(totals.protein / 1.8), 100), unit: '' },
    { label: 'Carbs', val: `${totals.carbs}g`, total: '300g', percent: Math.min(Math.round(totals.carbs / 3), 100), unit: '' },
    { label: 'Fat', val: `${totals.fat}g`, total: '70g', percent: Math.min(Math.round(totals.fat / 0.7), 100), unit: '' },
  ];

  return (
    <div className="space-y-10 h-full overflow-y-auto no-scrollbar pb-24">
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-on-surface-variant">DAILY_NUTRITION_VITALS</h2>
          <span className="text-[9px] font-mono text-primary/60 tracking-tighter">FIREBASE_REALTIME</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {macros.map((macro, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface-container rounded-3xl p-8 flex flex-col items-center justify-center space-y-6 border border-outline-variant/20 relative overflow-hidden group shadow-xl"
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        <section className="xl:col-span-8 bg-surface-container rounded-3xl overflow-hidden border border-outline-variant/20 flex flex-col min-h-[500px] shadow-2xl">
          <div className="p-8 border-b border-outline-variant/20 flex justify-between items-center bg-surface-variant/10">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase">CHRONOLOGICAL_FOOD_LOG</h3>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{entries.length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="text-primary animate-spin" size={32} /></div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <Utensils size={48} className="text-primary mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No food entries yet</p>
              </div>
            ) : entries.map((entry, i) => {
              const Icon = mealIconMap[entry.meal] || Utensils;
              return (
                <div key={entry.id} className="p-6 flex items-center justify-between border-b border-outline-variant/10 hover:bg-surface-bright/20 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary/60">
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="text-base font-bold">{entry.name}</div>
                      <div className="text-[10px] text-on-surface-variant tracking-[0.1em] uppercase font-bold mt-1">{entry.meal}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-base font-bold text-primary">{entry.calories} kcal</div>
                      <div className="text-[10px] text-on-surface-variant/60 font-mono mt-1">{entry.protein}p / {entry.carbs}c / {entry.fat}f</div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-on-surface-variant hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="xl:col-span-4 space-y-8">
          <section className="bg-surface-container-high rounded-3xl p-8 border border-outline-variant/30 space-y-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <Plus size={16} className="text-primary" />
              <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase">QUICK_ENTRY_SYSTEM</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase px-1 tracking-widest">Food_Name</label>
                <input
                  className="w-full recessed-input text-sm py-4 px-5"
                  placeholder="Entry Label..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase px-1 tracking-widests">Meal_Category</label>
                <select
                  className="w-full recessed-input text-sm py-4 px-5 appearance-none"
                  value={form.meal}
                  onChange={e => setForm(f => ({ ...f, meal: e.target.value }))}
                >
                  <option>BREAKFAST</option>
                  <option>LUNCH</option>
                  <option>DINNER</option>
                  <option>SNACK</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Energy_kcal', key: 'calories' },
                  { label: 'Protein_g', key: 'protein' },
                  { label: 'Carbs_g', key: 'carbs' },
                  { label: 'Fat_g', key: 'fat' },
                ].map(f => (
                  <div key={f.key} className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase px-1 tracking-widest">{f.label}</label>
                    <input
                      type="number"
                      className="w-full recessed-input text-sm py-4 px-5"
                      placeholder="0"
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 rounded-2xl bg-primary-container text-surface font-black text-[10px] tracking-[0.3em] uppercase shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? 'SAVING...' : 'ADD_TO_DATABASE'}
              </button>
            </form>
          </section>

          <section className="bg-surface-container-highest/50 backdrop-blur-xl rounded-3xl p-8 relative overflow-hidden border border-outline-variant/20 shadow-2xl">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-[80px]" />
            <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-on-surface-variant mb-8">SUMMARY_METRICS</h3>
            <div className="space-y-8">
              <div className="flex justify-between items-end border-b border-outline-variant/20 pb-6">
                <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Total_Energy</span>
                <span className="font-headline text-4xl font-black leading-none">{totals.calories} <small className="text-xs font-medium opacity-40">KCAL</small></span>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { l: 'PRO', v: `${totals.protein}g` },
                  { l: 'CHO', v: `${totals.carbs}g` },
                  { l: 'FAT', v: `${totals.fat}g` },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-[9px] font-bold text-on-surface-variant/50 uppercase mb-2 tracking-widest">{s.l}</div>
                    <div className="text-xl font-headline font-bold">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<AppMode>('LOADING');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isArabic, setIsArabic] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleLanguage = () => {
    setIsArabic(prev => {
      const next = !prev;
      document.documentElement.dir = next ? 'rtl' : 'ltr';
      document.documentElement.lang = next ? 'ar' : 'en';
      return next;
    });
  };

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Check if the signed-in user is whitelisted
        if (firebaseUser.email === WHITELISTED_EMAIL) {
          setUser(firebaseUser);
          setMode('MEDICAL');
        } else {
          // Sign out unauthorized users
          signOut(auth);
          setAuthError('This dashboard is private.');
          setUser(null);
          setMode('AUTH');
        }
      } else {
        setUser(null);
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
    return <AuthView onLogin={handleLogin} isLoading={authLoading} error={authError} />;
  }

  const getTitle = () => {
    if (isArabic) {
      switch (mode) {
        case 'MEDICAL': return 'النظام الطبي / العلامات الحيوية';
        case 'FINANCIAL': return 'نظام إسلام / المالية';
        case 'NUTRITION': return 'نظام التغذية / الأيض';
        default: return 'النظام الشخصي';
      }
    }
    switch (mode) {
      case 'MEDICAL': return 'MEDICAL OS / VITAL SIGNS';
      case 'FINANCIAL': return 'ISLAM OS / FINANCIALS';
      case 'NUTRITION': return 'NUTRITION OS / METABOLICS';
      default: return 'PERSONAL OS';
    }
  };

  return (
    <div className={cn("min-h-screen bg-surface flex", isArabic && "flex-row-reverse")} dir={isArabic ? 'rtl' : 'ltr'}>
      <Sidebar
        user={user}
        activeMode={mode}
        setMode={setMode}
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
        onLogout={handleLogout}
        isArabic={isArabic}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={getTitle()} toggleSidebar={toggleSidebar} isArabic={isArabic} toggleLanguage={toggleLanguage} />

        <main className={cn("flex-1 pt-24 px-6 lg:px-10 pb-10", isArabic ? "lg:mr-64" : "lg:ml-64")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {mode === 'MEDICAL' && user && <MedicalView userId={user.uid} />}
              {mode === 'FINANCIAL' && user && <FinancialView userId={user.uid} />}
              {mode === 'NUTRITION' && user && <NutritionView userId={user.uid} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-outline-variant flex lg:hidden z-40">
        {[
          { id: 'MEDICAL', icon: Pill, label: isArabic ? 'طبي' : 'Med' },
          { id: 'FINANCIAL', icon: Landmark, label: isArabic ? 'مالي' : 'Fin' },
          { id: 'NUTRITION', icon: Utensils, label: isArabic ? 'غذاء' : 'Nut' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id as AppMode)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-all",
              mode === item.id ? "text-primary bg-primary/5" : "text-on-surface-variant"
            )}
          >
            <item.icon size={20} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
