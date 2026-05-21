import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, Question } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
}

interface BulkUploadSection {
  section_title: string;
  questions: {
    type: string;
    question_text: string;
    choices: string[];
    correct_answer: string;
    explanation: string;
  }[];
}

interface BulkUploadData {
  quiz_title?: string;
  sections: BulkUploadSection[];
}

interface UserDoc {
  id: string;
  email: string;
  displayName?: string;
  role: 'student' | 'admin';
  createdAt?: string;
}

interface QuizResultDoc {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  category: string;
  categoryName?: string;
  score: number;
  totalQuestions: number;
  date: string;
}

export default function Admin() {
  const { user, darkMode } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [allResults, setAllResults] = useState<QuizResultDoc[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'categories' | 'questions' | 'bulk' | 'users' | 'results'>('stats');
  const [newCategory, setNewCategory] = useState('');
  const [categorySuccess, setCategorySuccess] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
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
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [editQuestionData, setEditQuestionData] = useState<Question | null>(null);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [resultFilterUser, setResultFilterUser] = useState('');
  const [resultFilterCategory, setResultFilterCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/home');
      return;
    }
    fetchCategories();
    fetchQuestions();
    fetchUsers();
    fetchAllResults();
  }, [user]);

  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as { id: string; name: string }[]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'questions'));
      setQuestions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Question[]);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UserDoc[];
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchAllResults = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'results'));
      const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as QuizResultDoc[];
      setAllResults(results);
    } catch (err) {
      console.error('Error fetching results:', err);
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'student' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleDeleteUserResult = async (resultId: string) => {
    try {
      await deleteDoc(doc(db, 'results', resultId));
      setAllResults(prev => prev.filter(r => r.id !== resultId));
    } catch (err) {
      console.error('Error deleting result:', err);
    }
  };

  const exportToCSV = () => {
    const filteredQuestions = questions.filter(q => {
      const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !filterCategory || q.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
    
    const headers = ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Explanation', 'Category'];
    const rows = filteredQuestions.map(q => [
      q.question,
      q.options[0] || '',
      q.options[1] || '',
      q.options[2] || '',
      q.options[3] || '',
      q.options[q.correctAnswer] || '',
      q.explanation || '',
      categories.find(c => c.id === q.category)?.name || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'questions_export.csv';
    link.click();
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || q.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredResults = allResults.filter(r => {
    const matchesUser = !resultFilterUser || r.userId === resultFilterUser;
    const matchesCategory = !resultFilterCategory || r.category === resultFilterCategory;
    return matchesUser && matchesCategory;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'categories'), { name: newCategory });
      setNewCategory('');
      setCategorySuccess('Category added successfully!');
      setTimeout(() => setCategorySuccess(''), 3000);
      await fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Error adding category: ' + err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const questionsInCat = await getDocs(query(collection(db, 'questions'), where('category', '==', id)));
    questionsInCat.docs.forEach(d => deleteDoc(doc(db, 'questions', d.id)));
    await deleteDoc(doc(db, 'categories', id));
    fetchCategories();
    fetchQuestions();
  };

  const handleEditCategory = (cat: Category) => {
    setEditCategoryId(cat.id);
    setEditCategoryName(cat.name);
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryId || !editCategoryName.trim()) return;
    await updateDoc(doc(db, 'categories', editCategoryId), { name: editCategoryName });
    setEditCategoryId(null);
    setEditCategoryName('');
    fetchCategories();
  };

  const handleCancelEditCategory = () => {
    setEditCategoryId(null);
    setEditCategoryName('');
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

  const handleEditQuestion = (q: Question) => {
    setEditQuestionId(q.id);
    setEditQuestionData(q);
  };

  const handleUpdateQuestion = async () => {
    if (!editQuestionId || !editQuestionData) return;
    await updateDoc(doc(db, 'questions', editQuestionId), {
      question: editQuestionData.question,
      options: editQuestionData.options,
      correctAnswer: editQuestionData.correctAnswer,
      explanation: editQuestionData.explanation,
      category: editQuestionData.category
    });
    setEditQuestionId(null);
    setEditQuestionData(null);
    fetchQuestions();
  };

  const handleCancelEditQuestion = () => {
    setEditQuestionId(null);
    setEditQuestionData(null);
  };

  const validateBulkJson = (json: string): { valid: boolean; data?: BulkUploadData; error?: string } => {
    try {
      const parsed = JSON.parse(json) as BulkUploadData;
      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        return { valid: false, error: 'Invalid format: "sections" array is required' };
      }
      for (const section of parsed.sections) {
        if (!section.section_title || !section.questions) {
          return { valid: false, error: 'Each section must have "section_title" and "questions"' };
        }
        for (const q of section.questions) {
          if (!q.question_text || !q.choices || !Array.isArray(q.choices) || q.choices.length < 2) {
            return { valid: false, error: `Question "${q.question_text || 'unknown'}" must have at least 2 choices` };
          }
          if (!q.correct_answer) {
            return { valid: false, error: `Question "${q.question_text}" must have a "correct_answer"` };
          }
        }
      }
      return { valid: true, data: parsed };
    } catch (e) {
      return { valid: false, error: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}` };
    }
  };

  const handleBulkUpload = async () => {
    setBulkError('');
    setBulkSuccess('');
    if (!bulkCategory) {
      setBulkError('Please select a category');
      return;
    }
    if (!bulkJson.trim()) {
      setBulkError('Please paste JSON data');
      return;
    }
    const validation = validateBulkJson(bulkJson);
    if (!validation.valid || !validation.data) {
      setBulkError(validation.error || 'Invalid JSON');
      return;
    }
    setIsUploading(true);
    try {
      let questionsAdded = 0;
      for (const section of validation.data.sections) {
        for (const q of section.questions) {
          const correctIndex = q.choices.indexOf(q.correct_answer);
          await addDoc(collection(db, 'questions'), {
            question: q.question_text,
            options: q.choices,
            correctAnswer: correctIndex >= 0 ? correctIndex : 0,
            explanation: q.explanation || '',
            category: bulkCategory
          });
          questionsAdded++;
        }
      }
      setBulkSuccess(`Successfully added ${questionsAdded} questions!`);
      setBulkJson('');
      fetchQuestions();
    } catch (e) {
      setBulkError(`Error uploading: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const totalResults = allResults.length;
  const totalUsers = users.length;
  const totalQuestions = questions.length;
  const totalCategories = categories.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;

  const navBtn = (tab: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeTab === tab
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
          : darkMode
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Admin Dashboard
          </h1>
          <div className="flex gap-1 flex-wrap">
            {navBtn('stats', 'Overview')}
            {navBtn('users', 'Users')}
            {navBtn('results', 'Results')}
            {navBtn('categories', 'Categories')}
            {navBtn('questions', 'Questions')}
            {navBtn('bulk', 'Bulk Upload')}
          </div>
        </div>

        {/* ── Overview ── */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Users', value: totalUsers, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { label: 'Total Quizzes Taken', value: totalResults, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
              { label: 'Total Questions', value: totalQuestions, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
              { label: 'Total Categories', value: totalCategories, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ].map(stat => (
              <div
                key={stat.label}
                className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 border ${stat.border} ${stat.bg}`}
              >
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                <p className={`text-4xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Manage Users ({totalUsers})
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {totalAdmins} admin{totalAdmins !== 1 ? 's' : ''}
              </p>
            </div>
            {users.length === 0 ? (
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No users registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                      <th className="text-left py-3 px-2 font-medium">Name</th>
                      <th className="text-left py-3 px-2 font-medium">Email</th>
                      <th className="text-left py-3 px-2 font-medium">Role</th>
                      <th className="text-left py-3 px-2 font-medium">Joined</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} hover:${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <td className={`py-3 px-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {u.displayName || '—'}
                        </td>
                        <td className={`py-3 px-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{u.email}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className={`py-3 px-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {u.id !== user.uid && (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as 'student' | 'admin')}
                              className={`text-xs p-1.5 rounded border ${
                                darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'
                              }`}
                            >
                              <option value="student">student</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                          {u.id === user.uid && (
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>You</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {activeTab === 'results' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                All Quiz Results ({filteredResults.length})
              </h2>
              <div className="flex gap-3 flex-wrap">
                <select
                  value={resultFilterUser}
                  onChange={(e) => setResultFilterUser(e.target.value)}
                  className={`text-sm p-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">All Users</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                  ))}
                </select>
                <select
                  value={resultFilterCategory}
                  onChange={(e) => setResultFilterCategory(e.target.value)}
                  className={`text-sm p-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">All Categories</option>
                  {[...new Set(allResults.map(r => r.category))].map(cat => (
                    <option key={cat} value={cat}>
                      {categories.find(c => c.id === cat)?.name || cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filteredResults.length === 0 ? (
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No results found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-left py-3 px-2 font-medium">Category</th>
                      <th className="text-left py-3 px-2 font-medium">Score</th>
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-right py-3 px-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map(r => {
                      const userDoc = users.find(u => u.id === r.userId);
                      const catName = categories.find(c => c.id === r.category)?.name || r.category;
                      const percentage = Math.round((r.score / r.totalQuestions) * 100);
                      return (
                        <tr key={r.id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                          <td className={`py-3 px-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {userDoc?.displayName || userDoc?.email || r.userId?.slice(0, 8)}
                          </td>
                          <td className={`py-3 px-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{catName}</td>
                          <td className="py-3 px-2">
                            <span className={`font-semibold ${
                              percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              {r.score}/{r.totalQuestions} ({percentage}%)
                            </span>
                          </td>
                          <td className={`py-3 px-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(r.date).toLocaleDateString()} {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleDeleteUserResult(r.id)}
                              className="text-red-500 hover:text-red-400 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Categories ── */}
        {activeTab === 'categories' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Manage Categories</h2>
              <button
                onClick={() => { fetchCategories(); fetchQuestions(); }}
                className="text-indigo-500 hover:text-indigo-400 text-sm"
              >
                Refresh
              </button>
            </div>
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
            {categorySuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">{categorySuccess}</div>
            )}
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className={`flex justify-between items-center p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {editCategoryId === cat.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className={`flex-1 p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}
                      />
                      <button onClick={handleUpdateCategory} className="text-green-500 hover:underline">Save</button>
                      <button onClick={handleCancelEditCategory} className="text-gray-500 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{cat.name}</span>
                      <div className="flex gap-3">
                        <button onClick={() => handleEditCategory(cat)} className="text-indigo-500 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:underline">Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Questions ── */}
        {activeTab === 'questions' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
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

            <h3 className={`text-xl font-semibold mt-8 mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Existing Questions ({filteredQuestions.length})</h3>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                className={`flex-1 p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button
                onClick={exportToCSV}
                disabled={filteredQuestions.length === 0}
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
            
            <div className="space-y-4">
              {filteredQuestions.map(q => (
                <div key={q.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {editQuestionId === q.id && editQuestionData ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editQuestionData.question}
                        onChange={(e) => setEditQuestionData({ ...editQuestionData, question: e.target.value })}
                        className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}
                      />
                      {editQuestionData.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={editQuestionData.correctAnswer === i}
                            onChange={() => setEditQuestionData({ ...editQuestionData, correctAnswer: i })}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...editQuestionData.options];
                              newOptions[i] = e.target.value;
                              setEditQuestionData({ ...editQuestionData, options: newOptions });
                            }}
                            className={`flex-1 p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}
                          />
                        </div>
                      ))}
                      <textarea
                        value={editQuestionData.explanation}
                        onChange={(e) => setEditQuestionData({ ...editQuestionData, explanation: e.target.value })}
                        placeholder="Explanation"
                        className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}
                      />
                      <select
                        value={editQuestionData.category}
                        onChange={(e) => setEditQuestionData({ ...editQuestionData, category: e.target.value })}
                        className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={handleUpdateQuestion} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
                        <button onClick={handleCancelEditQuestion} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className={darkMode ? 'text-white' : 'text-gray-900'}>
                        <p className="font-medium">{q.question}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{categories.find(c => c.id === q.category)?.name}</p>
                        <p className="text-sm text-green-500">Correct: {q.options[q.correctAnswer]}</p>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button onClick={() => handleEditQuestion(q)} className="text-indigo-500 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bulk Upload ── */}
        {activeTab === 'bulk' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Bulk Upload Questions (JSON)</h2>
            
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Category</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Paste JSON Data</label>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder={`{
  "quiz_title": "Holy Books Study - Grade 8",
  "sections": [
    {
      "section_title": "Chapter 1: The Pentateuch",
      "questions": [
        {
          "type": "multiple_choice",
          "question_text": "What is the meaning of the word 'Torah'?",
          "choices": ["History", "Law or Instruction", "Prophecy", "Poetry"],
          "correct_answer": "Law or Instruction",
          "explanation": "In Hebrew, 'Torah' means instruction or law."
        }
      ]
    }
  ]
}`}
                className={`w-full p-3 border rounded-lg font-mono text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
                rows={15}
              />
            </div>

            {bulkError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg">{bulkError}</div>
            )}
            {bulkSuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">{bulkSuccess}</div>
            )}

            <button
              onClick={handleBulkUpload}
              disabled={isUploading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload Questions'}
            </button>

            <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>JSON Format Example:</h3>
              <pre className={`text-xs overflow-x-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{`{
  "quiz_title": "My Quiz",
  "sections": [
    {
      "section_title": "Chapter 1",
      "questions": [
        {
          "type": "multiple_choice",
          "question_text": "Your question here?",
          "choices": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Option A",
          "explanation": "Optional explanation"
        }
      ]
    }
  ]
}`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
