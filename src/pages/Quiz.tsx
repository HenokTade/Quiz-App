import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, Question } from '../store/useStore';
import { QuestionSkeleton, Skeleton } from '../components/Skeleton';

const QUESTION_TIME = 30;

export default function Quiz() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const { darkMode, startQuiz, addQuizAnswer, currentQuestionIndex, setCurrentQuestionIndex, setCurrentCategory } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const categoryDoc = await getDocs(query(collection(db, 'categories')));
        const categoryData = categoryDoc.docs.find(d => d.id === categoryId);
        const categoryName = categoryData?.data().name || 'Unknown';
        
        setCurrentCategory(categoryId!, categoryName);
        
        const questionsSnapshot = await getDocs(query(collection(db, 'questions'), where('category', '==', categoryId)));
        const fetchedQuestions: Question[] = questionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Question[];
        setQuestions(fetchedQuestions);
        startQuiz();
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [categoryId]);

  useEffect(() => {
    if (showFeedback || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNextQuestion(null);
          return QUESTION_TIME;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showFeedback, currentQuestionIndex, questions.length]);

  const handleAnswerSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
  };

  const handleNextQuestion = (answer: number | null) => {
    const finalAnswer = answer !== null ? answer : -1;
    addQuizAnswer({ questionIndex: currentQuestionIndex, selectedAnswer: finalAnswer });
    setShowFeedback(false);
    setSelectedAnswer(null);
    setTimeLeft(QUESTION_TIME);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      navigate('/results');
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    setShowFeedback(true);
  };

  if (loading) {
    return (
      <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6 flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-2 w-full mb-8" />
          <QuestionSkeleton />
          <div className="mt-6">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>No questions available for this category.</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <span className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className={`px-4 py-2 rounded-lg ${timeLeft <= 10 ? 'bg-red-500' : 'bg-indigo-600'} text-white`}>
            ⏱️ {timeLeft}s
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 mb-6`}>
          <h2 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentQuestion?.question}
          </h2>
          
          <div className="space-y-3">
            {currentQuestion?.options.map((option, index) => {
              let buttonClass = `w-full p-4 text-left rounded-lg border-2 transition-all `;
              if (showFeedback) {
                if (index === currentQuestion.correctAnswer) {
                  buttonClass += 'bg-green-500 border-green-500 text-white';
                } else if (index === selectedAnswer && !isCorrect) {
                  buttonClass += 'bg-red-500 border-red-500 text-white';
                } else {
                  buttonClass += darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500';
                }
              } else {
                buttonClass += selectedAnswer === index 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : darkMode ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showFeedback}
                  className={buttonClass}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentQuestion?.explanation}
              </p>
            </div>
          )}
        </div>

        {!showFeedback ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={() => handleNextQuestion(selectedAnswer)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
          </button>
        )}
      </div>
    </div>
  );
}