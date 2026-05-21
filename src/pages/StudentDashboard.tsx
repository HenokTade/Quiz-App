import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import Admin from './Admin';
import { useStore } from '../store/useStore';

export default function StudentDashboard() {
  const { user } = useStore();

  if (user?.role === 'admin') {
    return <Admin />;
  }

  return <StudentView />;
}

function StudentView() {
  const { user, darkMode } = useStore();
  const [results, setResults] = useState<{
    id: string; category: string; score: number; totalQuestions: number; date: string;
  }[]>([]);
  const [highScores, setHighScores] = useState<{
    category: string; bestScore: number; totalQuestions: number; bestPercentage: number; attempts: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchResults();
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, 'categories'));
    const cats: { [key: string]: string } = {};
    snapshot.docs.forEach(doc => { cats[doc.id] = doc.data().name; });
    setCategories(cats);
  };

  const fetchResults = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'results'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const resultsData = snapshot.docs.map(doc => ({
        id: doc.id, category: doc.data().category, score: doc.data().score,
        totalQuestions: doc.data().totalQuestions, date: doc.data().date,
      }));
      resultsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setResults(resultsData);

      const scoresByCategory: Record<string, { best: number; total: number; totalQuestions: number; attempts: number }> = {};
      resultsData.forEach(r => {
        const pct = Math.round((r.score / r.totalQuestions) * 100);
        if (!scoresByCategory[r.category]) {
          scoresByCategory[r.category] = { best: pct, total: r.score, totalQuestions: r.totalQuestions, attempts: 1 };
        } else {
          scoresByCategory[r.category].attempts++;
          if (pct > scoresByCategory[r.category].best) {
            scoresByCategory[r.category].best = pct;
            scoresByCategory[r.category].total = r.score;
            scoresByCategory[r.category].totalQuestions = r.totalQuestions;
          }
        }
      });
      setHighScores(Object.entries(scoresByCategory).map(([cat, d]) => ({
        category: cat, bestScore: d.total, totalQuestions: d.totalQuestions, bestPercentage: d.best, attempts: d.attempts,
      })));
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
          <button onClick={() => navigate('/home')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
            Take Quiz
          </button>
        </div>

        {loading ? (
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Total Quizzes Taken', value: results.length, cls: darkMode ? 'text-indigo-400' : 'text-indigo-600' },
                { label: 'Average Score', value: results.length > 0 ? `${Math.round(results.reduce((a, r) => a + (r.score / r.totalQuestions) * 100, 0) / results.length)}%` : '0%', cls: darkMode ? 'text-green-400' : 'text-green-600' },
                { label: 'Categories Explored', value: highScores.length, cls: darkMode ? 'text-purple-400' : 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{s.label}</h3>
                  <p className={`text-4xl font-bold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>High Scores</h2>
                {highScores.length === 0 ? (
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No quizzes taken yet. Start a quiz to see your scores!</p>
                ) : (
                  <div className="space-y-3">
                    {highScores.map((hs, i) => (
                      <div key={i} className={`flex justify-between items-center p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{categories[hs.category] || hs.category}</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{hs.attempts} attempt{hs.attempts > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${hs.bestPercentage >= 70 ? 'text-green-500' : hs.bestPercentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{hs.bestPercentage}%</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Score: {hs.bestScore}/{hs.totalQuestions}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Results</h2>
                {results.length === 0 ? (
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No quiz results yet.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.slice(0, 10).map(r => {
                      const pct = Math.round((r.score / r.totalQuestions) * 100);
                      return (
                        <div key={r.id} className={`flex justify-between items-center p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div>
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{categories[r.category] || r.category}</p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(r.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${pct >= 70 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{pct}%</p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{r.score}/{r.totalQuestions}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}