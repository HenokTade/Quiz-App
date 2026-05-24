import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, Question, QuizSettings, RetakeMode, FeedbackMode } from '../store/useStore';

interface Category { id: string; name: string; quizTime?: number; retakeMode?: RetakeMode; retakeCooldown?: number; feedbackMode?: FeedbackMode; shuffleQuestions?: boolean }

interface BulkUploadSection {
  section_title: string;
  questions: {
    type: string; question_text: string; choices: string[]; correct_answer: string; explanation: string;
  }[];
}

interface BulkUploadData { quiz_title?: string; sections: BulkUploadSection[] }

export default function QuestionsManager() {
  const { darkMode } = useStore();
  const [activeTab, setActiveTab] = useState<'categories' | 'questions' | 'bulk' | 'settings'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [categorySuccess, setCategorySuccess] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    question: '', option1: '', option2: '', option3: '', option4: '',
    correctAnswer: 0, explanation: '', category: ''
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
  const [settingsCategory, setSettingsCategory] = useState('');
  const [quizTime, setQuizTime] = useState(5);
  const [retakeMode, setRetakeMode] = useState<RetakeMode>('unlimited');
  const [retakeCooldown, setRetakeCooldown] = useState(0);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('after_each');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => { fetchCategories(); fetchQuestions(); }, []);

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, 'categories'));
    setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);
  };

  const fetchQuestions = async () => {
    const snapshot = await getDocs(collection(db, 'questions'));
    setQuestions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Question[]);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || q.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await addDoc(collection(db, 'categories'), {
      name: newCategory,
      quizTime: 5,
      retakeMode: 'unlimited',
      retakeCooldown: 0,
      feedbackMode: 'after_each',
      shuffleQuestions: true
    });
    setNewCategory('');
    setCategorySuccess('Category added successfully!');
    setTimeout(() => setCategorySuccess(''), 3000);
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const questionsInCat = await getDocs(query(collection(db, 'questions'), where('category', '==', id)));
    questionsInCat.docs.forEach(d => deleteDoc(doc(db, 'questions', d.id)));
    await deleteDoc(doc(db, 'categories', id));
    fetchCategories();
    fetchQuestions();
  };

  const handleEditCategory = (cat: Category) => { setEditCategoryId(cat.id); setEditCategoryName(cat.name); };

  const handleUpdateCategory = async () => {
    if (!editCategoryId || !editCategoryName.trim()) return;
    await updateDoc(doc(db, 'categories', editCategoryId), { name: editCategoryName });
    setEditCategoryId(null);
    setEditCategoryName('');
    fetchCategories();
  };

  const handleCancelEditCategory = () => { setEditCategoryId(null); setEditCategoryName(''); };

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
    setNewQuestion({ question: '', option1: '', option2: '', option3: '', option4: '', correctAnswer: 0, explanation: '', category: '' });
    fetchQuestions();
  };

  const handleDeleteQuestion = async (id: string) => { await deleteDoc(doc(db, 'questions', id)); fetchQuestions(); };

  const handleEditQuestion = (q: Question) => { setEditQuestionId(q.id); setEditQuestionData(q); };

  const handleUpdateQuestion = async () => {
    if (!editQuestionId || !editQuestionData) return;
    await updateDoc(doc(db, 'questions', editQuestionId), {
      question: editQuestionData.question, options: editQuestionData.options,
      correctAnswer: editQuestionData.correctAnswer, explanation: editQuestionData.explanation,
      category: editQuestionData.category
    });
    setEditQuestionId(null);
    setEditQuestionData(null);
    fetchQuestions();
  };

  const handleCancelEditQuestion = () => { setEditQuestionId(null); setEditQuestionData(null); };

  const exportToCSV = () => {
    const headers = ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Explanation', 'Category'];
    const rows = filteredQuestions.map(q => [
      q.question, q.options[0] || '', q.options[1] || '', q.options[2] || '', q.options[3] || '',
      q.options[q.correctAnswer] || '', q.explanation || '',
      categories.find(c => c.id === q.category)?.name || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'questions_export.csv';
    link.click();
  };

  const validateBulkJson = (json: string): { valid: boolean; data?: BulkUploadData; error?: string } => {
    try {
      const parsed = JSON.parse(json) as BulkUploadData;
      if (!parsed.sections || !Array.isArray(parsed.sections)) return { valid: false, error: '"sections" array is required' };
      for (const section of parsed.sections) {
        if (!section.section_title || !section.questions) return { valid: false, error: 'Each section must have "section_title" and "questions"' };
        for (const q of section.questions) {
          if (!q.question_text || !q.choices || q.choices.length < 2) return { valid: false, error: `Question "${q.question_text}" must have at least 2 choices` };
          if (!q.correct_answer) return { valid: false, error: `Question "${q.question_text}" must have a "correct_answer"` };
        }
      }
      return { valid: true, data: parsed };
    } catch (e) {
      return { valid: false, error: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}` };
    }
  };

  const handleBulkUpload = async () => {
    setBulkError(''); setBulkSuccess('');
    if (!bulkCategory) { setBulkError('Please select a category'); return; }
    if (!bulkJson.trim()) { setBulkError('Please paste JSON data'); return; }
    const validation = validateBulkJson(bulkJson);
    if (!validation.valid || !validation.data) { setBulkError(validation.error || 'Invalid JSON'); return; }
    setIsUploading(true);
    try {
      let qAdded = 0;
      for (const section of validation.data.sections) {
        for (const q of section.questions) {
          await addDoc(collection(db, 'questions'), {
            question: q.question_text, options: q.choices,
            correctAnswer: q.choices.indexOf(q.correct_answer) >= 0 ? q.choices.indexOf(q.correct_answer) : 0,
            explanation: q.explanation || '', category: bulkCategory
          });
          qAdded++;
        }
      }
      setBulkSuccess(`Successfully added ${qAdded} questions!`);
      setBulkJson('');
      fetchQuestions();
    } catch (e) {
      setBulkError(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally { setIsUploading(false); }
  };

  const handleSettingsCategoryChange = (catId: string) => {
    setSettingsCategory(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      setQuizTime(cat.quizTime ?? 5);
      setRetakeMode(cat.retakeMode ?? 'unlimited');
      setRetakeCooldown(cat.retakeCooldown ?? 0);
      setFeedbackMode(cat.feedbackMode ?? 'after_each');
      setShuffleQuestions(cat.shuffleQuestions ?? true);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsError(''); setSettingsSuccess('');
    if (!settingsCategory) { setSettingsError('Please select a category'); return; }
    try {
      await updateDoc(doc(db, 'categories', settingsCategory), {
        quizTime: quizTime,
        retakeMode: retakeMode,
        retakeCooldown: retakeMode === 'cooldown' ? retakeCooldown : 0,
        feedbackMode: feedbackMode,
        shuffleQuestions: shuffleQuestions
      });
      setSettingsSuccess('Settings saved successfully!');
      setTimeout(() => setSettingsSuccess(''), 3000);
      fetchCategories();
    } catch (e) {
      setSettingsError(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  };

  const navBtn = (tab: typeof activeTab, label: string) => (
    <button onClick={() => setActiveTab(tab)}
      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeTab === tab
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
          : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}>{label}</button>
  );

  const iCls = darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300';

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Questions Manager</h1>
        <div className="flex gap-4 mb-6 flex-wrap">
          {navBtn('categories', 'Categories')}
          {navBtn('questions', 'Questions')}
          {navBtn('bulk', 'Bulk Upload')}
          {navBtn('settings', 'Settings')}
        </div>

        {activeTab === 'categories' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Manage Categories</h2>
              <button onClick={() => { fetchCategories(); fetchQuestions(); }} className="text-indigo-500 hover:text-indigo-400 text-sm">Refresh</button>
            </div>
            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 mb-6">
              <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category name"
                className={`flex-1 p-3 border rounded-lg ${iCls}`} />
              <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">Add</button>
            </form>
            {categorySuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">{categorySuccess}</div>
            )}
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className={`flex justify-between items-center p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {editCategoryId === cat.id ? (
                    <div className="flex gap-2 flex-1">
                      <input type="text" value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)}
                        className={`flex-1 p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
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

        {activeTab === 'questions' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Question</h2>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              {[
                { label: 'Question', key: 'question', type: 'textarea' },
                { label: 'Option 1', key: 'option1' }, { label: 'Option 2', key: 'option2' },
                { label: 'Option 3', key: 'option3' }, { label: 'Option 4', key: 'option4' },
              ].map(f => f.type === 'textarea' ? (
                <div key={f.key}>
                  <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{f.label}</label>
                  <textarea value={(newQuestion as any)[f.key]} onChange={e => setNewQuestion({ ...newQuestion, [f.key]: e.target.value })}
                    className={`w-full p-3 border rounded-lg ${iCls}`} rows={3} />
                </div>
              ) : (
                <div key={f.key}>
                  <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{f.label}</label>
                  <input type="text" value={(newQuestion as any)[f.key]} onChange={e => setNewQuestion({ ...newQuestion, [f.key]: e.target.value })}
                    className={`w-full p-3 border rounded-lg ${iCls}`} />
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Correct Answer</label>
                  <select value={newQuestion.correctAnswer} onChange={e => setNewQuestion({ ...newQuestion, correctAnswer: parseInt(e.target.value) })}
                    className={`w-full p-3 border rounded-lg ${iCls}`}>
                    {[0, 1, 2, 3].map(i => <option key={i} value={i}>Option {i + 1}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                  <select value={newQuestion.category} onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    className={`w-full p-3 border rounded-lg ${iCls}`}>
                    <option value="">Select category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">Add Question</button>
            </form>

            <h3 className={`text-xl font-semibold mt-8 mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Existing Questions ({filteredQuestions.length})</h3>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search questions..."
                className={`flex-1 p-3 border rounded-lg ${iCls}`} />
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={`p-3 border rounded-lg ${iCls}`}>
                <option value="">All Categories</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <button onClick={exportToCSV} disabled={filteredQuestions.length === 0}
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">Export CSV</button>
            </div>
            <div className="space-y-4">
              {filteredQuestions.map(q => (
                <div key={q.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {editQuestionId === q.id && editQuestionData ? (
                    <div className="space-y-3">
                      <input type="text" value={editQuestionData.question} onChange={e => setEditQuestionData({ ...editQuestionData, question: e.target.value })}
                        className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
                      {editQuestionData.options.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input type="radio" name={`corr-${q.id}`} checked={editQuestionData.correctAnswer === i}
                            onChange={() => setEditQuestionData({ ...editQuestionData, correctAnswer: i })} />
                          <input type="text" value={opt} onChange={e => {
                            const o = [...editQuestionData.options]; o[i] = e.target.value; setEditQuestionData({ ...editQuestionData, options: o });
                          }} className={`flex-1 p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
                        </div>
                      ))}
                      <textarea value={editQuestionData.explanation} onChange={e => setEditQuestionData({ ...editQuestionData, explanation: e.target.value })}
                        placeholder="Explanation" className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
                      <select value={editQuestionData.category} onChange={e => setEditQuestionData({ ...editQuestionData, category: e.target.value })}
                        className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
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

        {activeTab === 'bulk' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Bulk Upload Questions (JSON)</h2>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Category</label>
              <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className={`w-full p-3 border rounded-lg ${iCls}`}>
                <option value="">Select category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Paste JSON Data</label>
              <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)}
                placeholder='{\n  "quiz_title": "My Quiz",\n  "sections": [{\n    "section_title": "Chapter 1",\n    "questions": [{\n      "type": "multiple_choice",\n      "question_text": "Your question?",\n      "choices": ["A", "B", "C", "D"],\n      "correct_answer": "A",\n      "explanation": "..."\n    }]\n  }]\n}'
                className={`w-full p-3 border rounded-lg font-mono text-sm ${iCls}`} rows={15} />
            </div>
            {bulkError && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg">{bulkError}</div>}
            {bulkSuccess && <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">{bulkSuccess}</div>}
            <button onClick={handleBulkUpload} disabled={isUploading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
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

        {activeTab === 'settings' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quiz Settings</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Configure quiz time limit, retake rule, and feedback display mode per category.
            </p>

            <div className="mb-6">
              <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
              <select value={settingsCategory} onChange={e => handleSettingsCategoryChange(e.target.value)}
                className={`w-full p-3 border rounded-lg ${iCls}`}>
                <option value="">Select a category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>

            {settingsCategory && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Quiz Time Limit (minutes)
                    </label>
                    <input type="number" min={1} max={180} value={quizTime}
                      onChange={e => setQuizTime(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-full p-3 border rounded-lg ${iCls}`} />
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Total time allowed for the entire quiz
                    </p>
                  </div>
                  <div>
                    <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Retake Rule
                    </label>
                    <select value={retakeMode} onChange={e => setRetakeMode(e.target.value as RetakeMode)}
                      className={`w-full p-3 border rounded-lg ${iCls}`}>
                      <option value="unlimited">Unlimited — retake anytime</option>
                      <option value="cooldown">Time-based — wait X hours</option>
                      <option value="once">One time only — can't retake</option>
                    </select>
                    {retakeMode === 'cooldown' && (
                      <div className="mt-3">
                        <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Cooldown (hours)
                        </label>
                        <input type="number" min={1} max={720} value={retakeCooldown || 1}
                          onChange={e => setRetakeCooldown(Math.max(1, parseInt(e.target.value) || 1))}
                          className={`w-full p-3 border rounded-lg ${iCls}`} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Feedback Display
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'after_each' as FeedbackMode, label: 'After each question', desc: 'Show correct/incorrect and explanation after each answer' },
                      { value: 'at_end' as FeedbackMode, label: 'At the end', desc: 'Show all answers and explanations on the results page' },
                      { value: 'none' as FeedbackMode, label: 'Not shown', desc: 'No feedback displayed at all — only total score' },
                    ].map(opt => (
                      <label key={opt.value}
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${feedbackMode === opt.value ? (darkMode ? 'ring-2 ring-indigo-500' : 'ring-2 ring-indigo-400') : ''}`}>
                        <input type="radio" name="feedbackMode" value={opt.value}
                          checked={feedbackMode === opt.value}
                          onChange={e => e.target.checked && setFeedbackMode(opt.value)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                        <div>
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {opt.label}
                          </span>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {opt.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Question Order
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setShuffleQuestions(!shuffleQuestions)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${shuffleQuestions ? 'bg-indigo-600' : 'bg-gray-400'}`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${shuffleQuestions ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </div>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {shuffleQuestions ? 'Shuffle questions randomly' : 'Show questions in order'}
                    </span>
                  </label>
                </div>

                {settingsError && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg">{settingsError}</div>
                )}
                {settingsSuccess && (
                  <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">{settingsSuccess}</div>
                )}

                <button onClick={handleSaveSettings}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
                  Save Settings
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
