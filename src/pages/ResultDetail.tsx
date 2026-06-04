import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, Question } from '../store/useStore';

export default function ResultDetail() {
  const { resultId } = useParams<{ resultId: string }>();
  const { user, darkMode } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    score: number;
    totalQuestions: number;
    category: string;
    date: string;
    answers: { questionIndex: number; selectedAnswer: number; isCorrect: boolean; selectedText?: string; correctText?: string }[];
  } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchResult = async () => {
      try {
        const resultDoc = await getDoc(doc(db, 'results', resultId!));
        if (!resultDoc.exists()) {
          setError('Result not found');
          setLoading(false);
          return;
        }
        const data = resultDoc.data();
        if (data.userId !== user.uid && user.role !== 'admin') {
          setError('You do not have permission to view this result');
          setLoading(false);
          return;
        }
        setResult({
          score: data.score,
          totalQuestions: data.totalQuestions,
          category: data.category,
          date: data.date,
          answers: data.answers || [],
        });

        const questionsSnap = await getDocs(
          query(collection(db, 'questions'), where('category', '==', data.categoryId || data.category))
        );
        const fetchedQuestions: Question[] = questionsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as Question[];
        setQuestions(fetchedQuestions);
      } catch (err) {
        setError('Failed to load result');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId, user]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className="text-indigo-600">Loading...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{error || 'Result not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto px-4">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate('/dashboard')} className="text-indigo-500 hover:text-indigo-400">
              ← Back to Dashboard
            </button>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {new Date(result.date).toLocaleDateString()} {new Date(result.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {result.category}
          </h1>
          <div className="text-center py-6">
            <div className="text-6xl font-bold mb-2">
              <span className={percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}>
                {percentage}%
              </span>
            </div>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Score: {result.score} / {result.totalQuestions}
            </p>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Review Answers
          </h2>
          <div className="space-y-4">
            {result.answers.map((answer, index) => {
              const question = questions[index];
              const notAnswered = answer.selectedAnswer === -1;
              const userAnswer = answer.selectedText || (question ? question.options[answer.selectedAnswer] : 'Unknown');
              const correctAnswer = answer.correctText || (question ? question.options[question.correctAnswer] : '');
              return (
                <div key={index} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {index + 1}. {question?.question || 'Question not available'}
                  </p>
                  {notAnswered ? (
                    <p className="text-gray-500">— Not answered</p>
                  ) : (
                    <>
                      <p className={answer.isCorrect ? 'text-green-400' : 'text-red-400'}>
                        {answer.isCorrect ? '✓ Correct' : `✗ Your answer: ${userAnswer}`}
                      </p>
                      {!answer.isCorrect && (
                        <p className="text-green-400 mt-1">
                          Correct: {correctAnswer}
                        </p>
                      )}
                    </>
                  )}
                  {question?.explanation && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      💡 {question.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
