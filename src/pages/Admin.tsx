import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
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

export default function Admin() {
  const { user, darkMode } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'questions' | 'bulk'>('categories');
  const [newCategory, setNewCategory] = useState('');
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
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 rounded-lg ${activeTab === 'bulk' ? 'bg-indigo-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}
          >
            Bulk Upload
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
                  {editCategoryId === cat.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className={`flex-1 p-2 border rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}
                      />
                      <button onClick={handleUpdateCategory} className="text-green-600 hover:underline">Save</button>
                      <button onClick={handleCancelEditCategory} className="text-gray-500 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{cat.name}</span>
                      <div className="flex gap-3">
                        <button onClick={() => handleEditCategory(cat)} className="text-indigo-600 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:underline">Delete</button>
                      </div>
                    </>
                  )}
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
                        <p className="text-sm text-gray-500">{categories.find(c => c.id === q.category)?.name}</p>
                        <p className="text-sm text-green-600">Correct: {q.options[q.correctAnswer]}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleEditQuestion(q)} className="text-indigo-600 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-600 hover:underline">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
</div>
          )}

        {activeTab === 'bulk' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
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
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{bulkError}</div>
            )}
            {bulkSuccess && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{bulkSuccess}</div>
            )}

            <button
              onClick={handleBulkUpload}
              disabled={isUploading}
              className={`bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed`}
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