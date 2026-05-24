import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, RetakeMode } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { CardSkeleton } from '../components/Skeleton';

interface Category {
  id: string;
  name: string;
  questionCount: number;
  quizTime?: number;
  retakeMode?: RetakeMode;
  retakeCooldown?: number;
  cooldownEnd?: Date | null;
  takenOnce?: boolean;
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, darkMode } = useStore();
  const navigate = useNavigate();

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
            cooldownEnd: null,
            takenOnce: false,
          });
        }

        if (user) {
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

  const formatCooldown = (end: Date): string => {
    const ms = end.getTime() - Date.now();
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Welcome, {user.displayName || 'Student'}!
        </h1>
        <h2 className={`text-xl mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Choose a Category</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No categories available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const blocked = cat.cooldownEnd !== null || cat.takenOnce;
              return (
                <div
                  key={cat.id}
                  onClick={() => !blocked && navigate(`/quiz/${cat.id}`)}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 transition-shadow ${
                    blocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'
                  }`}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
