import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, Question } from '../store/useStore';

interface AnswerData {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
  selectedText?: string;
  correctText?: string;
  question?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
}

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
    answers: AnswerData[];
  } | null>(null);

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

        const storedAnswers: AnswerData[] = (data.answers || []).map((a: any) => ({
          questionIndex: a.questionIndex,
          selectedAnswer: a.selectedAnswer,
          isCorrect: a.isCorrect,
          selectedText: a.selectedText,
          correctText: a.correctText,
          question: a.question,
          options: a.options,
          correctAnswer: a.correctAnswer,
          explanation: a.explanation,
        }));

        const hasFullData = storedAnswers.length > 0 && storedAnswers[0].question;

        if (!hasFullData && storedAnswers.length > 0) {
          const questionsSnap = await getDocs(
            query(collection(db, 'questions'), where('category', '==', data.categoryId || data.category))
          );
          const fetchedQuestions: Question[] = questionsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          })) as Question[];

          const enriched = storedAnswers.map((a) => {
            const q = fetchedQuestions[a.questionIndex] || fetchedQuestions[0];
            return {
              ...a,
              question: q?.question || '',
              options: q?.options || [],
              correctAnswer: q?.correctAnswer ?? -1,
              explanation: q?.explanation || '',
            };
          });
          storedAnswers.splice(0, storedAnswers.length, ...enriched);
        }

        setResult({
          score: data.score,
          totalQuestions: data.totalQuestions,
          category: data.category,
          date: data.date,
          answers: storedAnswers,
        });
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
            {result.answers
              .slice()
              .sort((a, b) => a.questionIndex - b.questionIndex)
              .map((answer) => {
                const notAnswered = answer.selectedAnswer === -1;
                const hasText = answer.selectedText !== undefined;
                const correctAnswer = answer.correctText || (answer.options ? answer.options[answer.correctAnswer ?? -1] : '');
                const correctLetter = answer.options ? String.fromCharCode(65 + (answer.correctAnswer ?? 0)) : '';
                const userAnswer = hasText ? answer.selectedText : '';
                const userLetter = !notAnswered && answer.options ? String.fromCharCode(65 + answer.selectedAnswer) : '';
                return (
                  <div key={answer.questionIndex} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {answer.questionIndex + 1}. {answer.question || 'Question not available'}
                    </p>
                    {notAnswered ? (
                      <>
                        <p className="text-gray-500">— Not answered</p>
                        <p className="text-indigo-400 mt-1">
                          Correct: {correctLetter}. {correctAnswer}
                        </p>
                        {answer.explanation && (
                          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            💡 {answer.explanation}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className={answer.isCorrect ? 'text-green-400' : 'text-red-400'}>
                          {answer.isCorrect ? '✓ Correct' : hasText ? `✗ Your answer: ${userLetter}. ${userAnswer}` : '✗ Incorrect'}
                        </p>
                        {!answer.isCorrect && (
                          <p className="text-green-400 mt-1">
                            Correct: {correctLetter}. {correctAnswer}
                          </p>
                        )}
                        {answer.explanation && (
                          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            💡 {answer.explanation}
                          </p>
                        )}
                      </>
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
