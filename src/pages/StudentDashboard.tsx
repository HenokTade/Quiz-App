import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

interface QuizResult {
  id: string;
  category: string;
  score: number;
  totalQuestions: number;
  date: string;
}

interface HighScore {
  category: string;
  bestScore: number;
  bestPercentage: number;
  attempts: number;
}

export default function StudentDashboard() {
  const { user, darkMode } = useStore();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchResults();
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, 'categories'));
    const cats: { [key: string]: string } = {};
    snapshot.docs.forEach(doc => {
      cats[doc.id] = doc.data().name;
    });
    setCategories(cats);
  };

  const fetchResults = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'results'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const resultsData: QuizResult[] = snapshot.docs.map(doc => ({
        id: doc.id,
        category: doc.data().category,
        score: doc.data().score,
        totalQuestions: doc.data().totalQuestions,
        date: doc.data().date
      }));
      setResults(resultsData);

      const scoresByCategory: { [key: string]: { best: number; total: number; attempts: number } } = {};
      resultsData.forEach(r => {
        const percentage = Math.round((r.score / r.totalQuestions) * 100);
        if (!scoresByCategory[r.category] || percentage > scoresByCategory[r.category].best) {
          scoresByCategory[r.category] = { best: percentage, total: r.score, attempts: 1 };
        } else {
          scoresByCategory[r.category].attempts++;
        }
      });

      const highScoresData: HighScore[] = Object.entries(scoresByCategory).map(([cat, data]) => ({
        category: cat,
        bestScore: data.total,
        bestPercentage: data.best,
        attempts: data.attempts
      }));
      setHighScores(highScoresData);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role === 'admin') {
    navigate('/home');
    return null;
  }

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Student Dashboard
          </h1>
          <button
            onClick={() => navigate('/home')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Take Quiz
          </button>
        </div>

        {loading ? (
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Total Quizzes Taken
                </h3>
                <p className={`text-4xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {results.length}
                </p>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Average Score
                </h3>
                <p className={`text-4xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {results.length > 0
                    ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / results.length)
                    : 0}%
                </p>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Categories Explored
                </h3>
                <p className={`text-4xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {highScores.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  High Scores
                </h2>
                {highScores.length === 0 ? (
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    No quizzes taken yet. Start a quiz to see your scores!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {highScores.map((hs, index) => (
                      <div key={index} className={`flex justify-between items-center p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {categories[hs.category] || hs.category}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {hs.attempts} attempt{hs.attempts > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${hs.bestPercentage >= 70 ? 'text-green-500' : hs.bestPercentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {hs.bestPercentage}%
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {hs.bestScore}/{highScores.find(h => h.category === hs.category)?.bestScore || hs.bestScore}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Recent Results
                </h2>
                {results.length === 0 ? (
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    No quiz results yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.slice(0, 10).map((result) => {
                      const percentage = Math.round((result.score / result.totalQuestions) * 100);
                      return (
                        <div key={result.id} className={`flex justify-between items-center p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div>
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {categories[result.category] || result.category}
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(result.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {percentage}%
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {result.score}/{result.totalQuestions}
                            </p>
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