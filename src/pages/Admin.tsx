import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, Question } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { user, darkMode } = useStore();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'questions'>('categories');
  const [newCategory, setNewCategory] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correctAnswer: 0,
    explanation: '',
    category: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/home');
      return;
    }
    fetchCategories();
    fetchQuestions();
  }, [user]);

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, 'categories'));
    setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as { id: string; name: string }[]);
  };

  const fetchQuestions = async () => {
    const snapshot = await getDocs(collection(db, 'questions'));
    setQuestions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Question[]);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await addDoc(collection(db, 'categories'), { name: newCategory });
    setNewCategory('');
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const questionsInCat = await getDocs(query(collection(db, 'questions'), where('category', '==', id)));
    questionsInCat.docs.forEach(d => deleteDoc(doc(db, 'questions', d.id)));
    await deleteDoc(doc(db, 'categories', id));
    fetchCategories();
    fetchQuestions();
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question || !newQuestion.category) return;
    await addDoc(collection(db, 'questions'), {
      question: newQuestion.question,
      options: [newQuestion.option1, newQuestion.option2, newQuestion.option3, newQuestion.option4],
      correctAnswer: newQuestion.correctAnswer,
      explanation: newQuestion.explanation,
      category: newQuestion.category
    });
    setNewQuestion({
      question: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correctAnswer: 0,
      explanation: '',
      category: ''
    });
    fetchQuestions();
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteDoc(doc(db, 'questions', id));
    fetchQuestions();
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h1>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 rounded-lg ${activeTab === 'categories' ? 'bg-indigo-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-6 py-3 rounded-lg ${activeTab === 'questions' ? 'bg-indigo-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}
          >
            Questions
          </button>
        </div>

        {activeTab === 'categories' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Manage Categories</h2>
            <form onSubmit={handleAddCategory} className="flex gap-4 mb-6">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name"
                className={`flex-1 p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
              />
              <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
                Add
              </button>
            </form>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className={`flex justify-between items-center p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Question</h2>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Question</label>
                <textarea
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i}>
                    <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Option {i}</label>
                    <input
                      type="text"
                      value={newQuestion[`option${i}` as keyof typeof newQuestion] as string}
                      onChange={(e) => setNewQuestion({ ...newQuestion, [`option${i}`]: e.target.value })}
                      className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Correct Answer</label>
                <select
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: parseInt(e.target.value) })}
                  className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
                >
                  <option value={0}>Option 1</option>
                  <option value={1}>Option 2</option>
                  <option value={2}>Option 3</option>
                  <option value={3}>Option 4</option>
                </select>
              </div>
              <div>
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Explanation</label>
                <textarea
                  value={newQuestion.explanation}
                  onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                  className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
                  rows={2}
                />
              </div>
              <div>
                <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                <select
                  value={newQuestion.category}
                  onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
                Add Question
              </button>
            </form>

            <h3 className={`text-xl font-semibold mt-8 mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Existing Questions</h3>
            <div className="space-y-4">
              {questions.map(q => (
                <div key={q.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex justify-between items-start">
                    <div className={darkMode ? 'text-white' : 'text-gray-900'}>
                      <p className="font-medium">{q.question}</p>
                      <p className="text-sm text-gray-500">{categories.find(c => c.id === q.category)?.name}</p>
                    </div>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}