import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, RetakeMode } from '../store/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardSkeleton } from '../components/Skeleton';
import { gradeKey, gradeLabel } from '../lib/grades';

interface Category {
  id: string;
  name: string;
  questionCount: number;
  quizTime?: number;
  retakeMode?: RetakeMode;
  retakeCooldown?: number;
  cooldownEnd?: Date | null;
  takenOnce?: boolean;
  locked?: boolean;
  grade?: number | null;
}

// Soft tinted palettes, cycled per grade card; literal class strings so Tailwind keeps them
const GRADE_PALETTES = [
  {
    light: 'from-indigo-50 to-indigo-100 text-indigo-900 ring-indigo-200/70 shadow-indigo-200/50',
    dark: 'from-indigo-950/70 to-gray-800 text-indigo-100 ring-indigo-800/40 shadow-black/30',
    mark: 'text-indigo-300', darkMark: 'text-indigo-400/40',
    pill: 'bg-white/80 text-indigo-700',
    darkPill: 'bg-indigo-400/15 text-indigo-200',
  },
  {
    light: 'from-emerald-50 to-emerald-100 text-emerald-900 ring-emerald-200/70 shadow-emerald-200/50',
    dark: 'from-emerald-950/70 to-gray-800 text-emerald-100 ring-emerald-800/40 shadow-black/30',
    mark: 'text-emerald-300', darkMark: 'text-emerald-400/40',
    pill: 'bg-white/80 text-emerald-700',
    darkPill: 'bg-emerald-400/15 text-emerald-200',
  },
  {
    light: 'from-amber-50 to-amber-100 text-amber-900 ring-amber-200/70 shadow-amber-200/50',
    dark: 'from-amber-950/70 to-gray-800 text-amber-100 ring-amber-800/40 shadow-black/30',
    mark: 'text-amber-300', darkMark: 'text-amber-400/40',
    pill: 'bg-white/80 text-amber-700',
    darkPill: 'bg-amber-400/15 text-amber-200',
  },
  {
    light: 'from-rose-50 to-rose-100 text-rose-900 ring-rose-200/70 shadow-rose-200/50',
    dark: 'from-rose-950/70 to-gray-800 text-rose-100 ring-rose-800/40 shadow-black/30',
    mark: 'text-rose-300', darkMark: 'text-rose-400/40',
    pill: 'bg-white/80 text-rose-700',
    darkPill: 'bg-rose-400/15 text-rose-200',
  },
  {
    light: 'from-sky-50 to-sky-100 text-sky-900 ring-sky-200/70 shadow-sky-200/50',
    dark: 'from-sky-950/70 to-gray-800 text-sky-100 ring-sky-800/40 shadow-black/30',
    mark: 'text-sky-300', darkMark: 'text-sky-400/40',
    pill: 'bg-white/80 text-sky-700',
    darkPill: 'bg-sky-400/15 text-sky-200',
  },
  {
    light: 'from-violet-50 to-violet-100 text-violet-900 ring-violet-200/70 shadow-violet-200/50',
    dark: 'from-violet-950/70 to-gray-800 text-violet-100 ring-violet-800/40 shadow-black/30',
    mark: 'text-violet-300', darkMark: 'text-violet-400/40',
    pill: 'bg-white/80 text-violet-700',
    darkPill: 'bg-violet-400/15 text-violet-200',
  },
];

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, darkMode } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const cats: Category[] = [];
        for (const docSnap of categoriesSnapshot.docs) {
          const catData = docSnap.data();
          const questionsSnap = await getDocs(query(collection(db, 'questions'), where('category', '==', docSnap.id)));
          cats.push({
            id: docSnap.id,
            name: catData.name,
            questionCount: questionsSnap.size,
            quizTime: catData.quizTime ?? 5,
            retakeMode: catData.retakeMode ?? 'unlimited',
            retakeCooldown: catData.retakeCooldown ?? 0,
            locked: catData.locked ?? false,
            grade: typeof catData.grade === 'number' ? catData.grade : null,
            cooldownEnd: null,
            takenOnce: false,
          });
        }

        if (user && user.role !== 'admin') {
          const resultsSnapshot = await getDocs(query(collection(db, 'results'), where('userId', '==', user.uid)));
          const userResults: Record<string, Date> = {};
          resultsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const catId = data.categoryId;
            const date = new Date(data.date);
            if (!userResults[catId] || date > userResults[catId]) {
              userResults[catId] = date;
            }
          });

          cats.forEach(cat => {
            if (!userResults[cat.id]) return;
            if (cat.retakeMode === 'once') {
              cat.takenOnce = true;
            } else if (cat.retakeMode === 'cooldown' && cat.retakeCooldown && cat.retakeCooldown > 0) {
              const lastDate = userResults[cat.id];
              const cooldownMs = cat.retakeCooldown * 60 * 60 * 1000;
              const availableDate = new Date(lastDate.getTime() + cooldownMs);
              if (availableDate > new Date()) {
                cat.cooldownEnd = availableDate;
              }
            }
          });
        }

        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [user]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const isAdmin = user.role === 'admin';
  const isBlocked = (cat: Category) => cat.cooldownEnd !== null || !!cat.takenOnce || (cat.locked === true && !isAdmin);
  const gradeTabs = [...new Set(categories.map(c => c.grade ?? null))]
    .sort((a, b) => (a ?? Infinity) - (b ?? Infinity))
    .map(grade => {
      const exams = categories.filter(c => gradeKey(c.grade) === gradeKey(grade));
      return {
        key: gradeKey(grade),
        label: gradeLabel(grade),
        badge: grade ? String(grade) : '•••',
        count: exams.length,
        available: exams.filter(c => !isBlocked(c)).length,
      };
    });
  if (isAdmin) {
    gradeTabs.push({ key: 'all', label: 'All exams', badge: 'All', count: categories.length, available: categories.length });
  }

  // No valid ?grade= means the grade picker is shown
  const requestedGrade = searchParams.get('grade');
  const selectedTab = gradeTabs.find(t => t.key === requestedGrade) ?? null;
  const selectedGrade = selectedTab?.key ?? null;
  const visibleCategories = selectedGrade === 'all'
    ? categories
    : categories.filter(c => gradeKey(c.grade) === selectedGrade);
  const selectGrade = (key: string) => setSearchParams({ grade: key });
  const backToGrades = () => setSearchParams({});

  const formatCooldown = (end: Date): string => {
    const ms = end.getTime() - Date.now();
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderCard = (cat: Category, index: number) => {
    const blocked = isBlocked(cat);
    return (
      <div
        key={cat.id}
        onClick={() => !blocked && navigate(`/quiz/${cat.id}`)}
        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6
          transform transition-all duration-200
          opacity-0 translate-y-4 delay-[${index * 50}ms]
          animate-[fadeInUp_0.3s_ease-out_forwards]
          ${blocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'}
          ${!blocked && 'active:scale-[0.98]'}`}
      >
        <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {cat.name}
        </h3>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          {cat.questionCount} questions {cat.quizTime ? `· ${cat.quizTime} min` : ''}
        </p>
        {cat.takenOnce && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-1">
            ⛔ Taken — one time only
          </p>
        )}
        {cat.cooldownEnd && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-1">
            ⏳ Retake available in {formatCooldown(cat.cooldownEnd)}
          </p>
        )}
        {cat.locked && (
          <p className={`mt-3 text-sm flex items-center gap-1 ${
            user?.role === 'admin'
              ? darkMode ? 'text-amber-400' : 'text-amber-600'
              : 'text-red-400'
          }`}>
            🔒 {user?.role === 'admin' ? 'Exam is locked — students cannot access it' : 'Exam is locked — wait for instructor'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className={`text-3xl font-bold mb-8
          ${darkMode ? 'text-white' : 'text-gray-900'}
          animate-[fadeInUp_0.5s_ease-out_0.3s_forwards]`}>
          Welcome, {user.displayName || 'Student'}!
        </h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton
                key={i}
                className={`animate-[pulse-slow_1.5s_ease_in_out_infinite]
                  delay-[${i * 100}ms]`}
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No exams available yet.</p>
        ) : !selectedTab ? (
          <>
            <h2 className={`text-xl mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Choose your grade</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gradeTabs.map((tab, index) => {
                const palette = GRADE_PALETTES[index % GRADE_PALETTES.length];
                return (
                <button
                  key={tab.key}
                  onClick={() => selectGrade(tab.key)}
                  className={`group relative overflow-hidden rounded-2xl p-6 h-48 flex flex-col text-left
                    bg-gradient-to-br ${darkMode ? palette.dark : palette.light}
                    shadow-lg ring-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]
                    opacity-0 translate-y-4 animate-[fadeInUp_0.3s_ease-out_forwards]`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span aria-hidden className={`absolute -right-3 -bottom-10 text-[10rem] font-black leading-none
                    ${darkMode ? palette.darkMark : palette.mark}
                    transition-transform duration-300 group-hover:scale-110`}>
                    {tab.badge}
                  </span>
                  <span className="relative text-xs font-semibold uppercase tracking-widest opacity-70">
                    {tab.key === 'all' ? 'Admin view' : tab.key === 'other' ? 'Ungraded' : 'Grade'}
                  </span>
                  <span className="relative text-4xl font-extrabold mt-1">{tab.key === 'other' || tab.key === 'all' ? tab.label : tab.badge}</span>
                  <span className="relative mt-auto flex items-center gap-2 text-sm font-medium">
                    <span className={`px-2.5 py-1 rounded-full ${darkMode ? palette.darkPill : palette.pill}`}>
                      {tab.count} {tab.count === 1 ? 'exam' : 'exams'}
                    </span>
                    {!isAdmin && tab.available < tab.count && (
                      <span className="opacity-80">{tab.available} available</span>
                    )}
                    <span className="ml-auto transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <button onClick={backToGrades}
              className={`mb-4 text-sm font-medium flex items-center gap-1 ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}>
              ← All grades
            </button>
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedTab.label}
              <span className="ml-3 text-base font-normal text-gray-500">
                {selectedTab.count} {selectedTab.count === 1 ? 'exam' : 'exams'}
              </span>
            </h2>
            {selectedGrade === 'all' ? (
              // Admin "All exams" view: one section per grade
              <div className="space-y-10">
                {gradeTabs.filter(t => t.key !== 'all').map(tab => (
                  <section key={tab.key}>
                    <div className="flex items-baseline justify-between gap-4 mb-4">
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {tab.label}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          {tab.count} {tab.count === 1 ? 'exam' : 'exams'}
                        </span>
                      </h3>
                      <button onClick={() => selectGrade(tab.key)} className="shrink-0 text-sm text-indigo-500 hover:text-indigo-400">
                        View {tab.label} →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categories.filter(c => gradeKey(c.grade) === tab.key).map(renderCard)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div key={selectedGrade} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCategories.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
