import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  questionCount: number;
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
          const questionsSnap = await getDocs(query(collection(db, 'questions'), where('category', '==', docSnap.id)));
          cats.push({ id: docSnap.id, name: docSnap.data().name, questionCount: questionsSnap.size });
        }
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Welcome, {user.displayName || 'Student'}!
        </h1>
        <h2 className={`text-xl mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Choose a Category</h2>
        {loading ? (
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
        ) : categories.length === 0 ? (
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No categories available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer`}
                onClick={() => navigate(`/quiz/${cat.id}`)}
              >
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {cat.name}
                </h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {cat.questionCount} questions
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}