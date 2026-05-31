import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore, Question } from '../store/useStore';
import { QuestionSkeleton, Skeleton } from '../components/Skeleton';



export default function Quiz() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [totalTimeLeft, setTotalTimeLeft] = useState(300);
  const [initialTime, setInitialTime] = useState(300);
  const [timerNotice, setTimerNotice] = useState('');
  const [criticalTimer, setCriticalTimer] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [cooldownBlocked, setCooldownBlocked] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState('');
  const { darkMode, user, startQuiz, addQuizAnswer, updateQuizAnswer, currentQuestionIndex, setCurrentQuestionIndex, setCurrentCategory, setCurrentQuiz, feedbackMode, setFeedbackMode, quizAnswers } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryDoc = await getDoc(doc(db, 'categories', categoryId!));
        if (!categoryDoc.exists()) {
          navigate('/home');
          return;
        }
        const catData = categoryDoc.data();
        const categoryName = catData.name || 'Unknown';

        if (catData.locked === true && user?.role !== 'admin') {
          setCooldownBlocked(true);
          setCooldownMessage('This exam is currently locked by the instructor. Please check back later.');
          setLoading(false);
          return;
        }

        const settings = {
          quizTime: catData.quizTime ?? 5,
          retakeMode: catData.retakeMode ?? 'unlimited',
          retakeCooldown: catData.retakeCooldown ?? 0,
          feedbackMode: catData.feedbackMode ?? 'after_each',
          shuffleQuestions: catData.shuffleQuestions ?? true,
        };

        setCurrentCategory(categoryId!, categoryName);
        setFeedbackMode(settings.feedbackMode);

        const totalTimeSeconds = settings.quizTime * 60;
        setTotalTimeLeft(totalTimeSeconds);
        setInitialTime(totalTimeSeconds);

        if (user && settings.retakeMode !== 'unlimited') {
          const resultsQuery = query(
            collection(db, 'results'),
            where('userId', '==', user.uid),
            where('categoryId', '==', categoryId)
          );
          const resultsSnap = await getDocs(resultsQuery);

          if (!resultsSnap.empty) {
            if (settings.retakeMode === 'once') {
              setCooldownBlocked(true);
              setCooldownMessage('This quiz can only be taken once.');
              setLoading(false);
              return;
            }

            if (settings.retakeMode === 'cooldown' && settings.retakeCooldown > 0) {
              let lastTimestamp = 0;
              for (const d of resultsSnap.docs) {
                const ts = new Date(d.data().date).getTime();
                if (ts > lastTimestamp) lastTimestamp = ts;
              }
              const lastDate = lastTimestamp > 0 ? new Date(lastTimestamp) : null;
              if (lastDate) {
                const cooldownMs = settings.retakeCooldown * 60 * 60 * 1000;
                const availableDate = new Date(lastDate.getTime() + cooldownMs);
                if (availableDate > new Date()) {
                  const hoursLeft = Math.ceil((availableDate.getTime() - Date.now()) / (60 * 60 * 1000));
                  setCooldownBlocked(true);
                  setCooldownMessage(
                    hoursLeft >= 1
                      ? `You can retake this quiz in approximately ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`
                      : 'You can retake this quiz in less than an hour'
                  );
                  setLoading(false);
                  return;
                }
              }
            }
          }
        }

        const questionsSnapshot = await getDocs(query(collection(db, 'questions'), where('category', '==', categoryId)));
        const fetchedQuestions: Question[] = questionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Question[];

        const orderedQuestions = settings.shuffleQuestions
          ? [...fetchedQuestions].sort(() => Math.random() - 0.5)
          : [...fetchedQuestions];
        const shuffledQuestionsWithOptions = orderedQuestions.map((q) => {
          const correctOptionText = q.options[q.correctAnswer];
          const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
          const newCorrectAnswerIndex = shuffledOpts.indexOf(correctOptionText);
          return {
            ...q,
            options: shuffledOpts,
            correctAnswer: newCorrectAnswerIndex >= 0 ? newCorrectAnswerIndex : 0
          };
        });

        setQuestions(shuffledQuestionsWithOptions);
        setCurrentQuiz(shuffledQuestionsWithOptions);
        startQuiz();
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [categoryId, user]);

  useEffect(() => {
    if (showFeedback || quizCompleted || questions.length === 0) return;
    const timer = setInterval(() => {
      setTotalTimeLeft((prev) => {
        if (prev <= 1) {
          handleQuizComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showFeedback, quizCompleted, currentQuestionIndex, questions.length]);

  useEffect(() => {
    if (totalTimeLeft <= 0 || initialTime <= 0) return;
    const half = Math.round(initialTime * 0.5);
    const quarter = Math.round(initialTime * 0.25);
    const tenPct = Math.round(initialTime * 0.1);
    if (totalTimeLeft <= 10) {
      setTimerNotice('⚠️ Less than 10 seconds!');
      setCriticalTimer(true);
    } else if (totalTimeLeft <= 60) {
      setTimerNotice('⚠️ Less than 1 minute remaining!');
      setCriticalTimer(true);
    } else if (totalTimeLeft <= tenPct) {
      setTimerNotice('⚠️ Less than 10% time remaining!');
      setCriticalTimer(true);
    } else if (totalTimeLeft <= quarter) {
      if (!criticalTimer) {
        setTimerNotice('⏳ Quarter time remaining');
      }
    } else if (totalTimeLeft <= half) {
      if (!timerNotice) {
        setTimerNotice('⏳ Half time remaining');
      }
    }
  }, [totalTimeLeft]);

  useEffect(() => {
    const prev = quizAnswers.find(a => a.questionIndex === currentQuestionIndex);
    setSelectedAnswer(prev !== undefined ? prev.selectedAnswer : null);
    setShowFeedback(false);
  }, [currentQuestionIndex, quizAnswers]);

  const saveCurrentAnswer = () => {
    const answer = selectedAnswer !== null ? selectedAnswer : -1;
    updateQuizAnswer({ questionIndex: currentQuestionIndex, selectedAnswer: answer });
  };

  const handleQuizComplete = () => {
    for (let i = 0; i < questions.length; i++) {
      const existing = quizAnswers.find(a => a.questionIndex === i);
      if (!existing) {
        addQuizAnswer({ questionIndex: i, selectedAnswer: -1 });
      }
    }
    setQuizCompleted(true);
    navigate('/results');
  };

  const handleAnswerSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
  };

  const handlePreviousQuestion = () => {
    saveCurrentAnswer();
    setShowFeedback(false);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    saveCurrentAnswer();
    setShowFeedback(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setQuizCompleted(true);
      navigate('/results');
    }
  };

  const handleSubmitAnswer = () => {
    if (feedbackMode === 'after_each') {
      if (selectedAnswer === null) return;
      setShowFeedback(true);
    } else {
      handleNextQuestion();
    }
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

  if (cooldownBlocked) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-xl shadow-lg text-center ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-4">Quiz Unavailable</h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{cooldownMessage}</p>
          <button onClick={() => navigate('/home')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>No questions available for this category.</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentOptions = currentQuestion?.options || [];
  const correctAnswerIndex = currentQuestion?.correctAnswer ?? -1;
  const isCorrect = selectedAnswer === correctAnswerIndex;

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <span className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className={`px-4 py-2 rounded-lg font-bold transition-all ${
            criticalTimer ? 'bg-red-500 animate-pulse scale-110'
            : totalTimeLeft <= Math.round(initialTime * 0.25) ? 'bg-yellow-500'
            : 'bg-indigo-600'
          } text-white`}>
            ⏱️ {Math.floor(totalTimeLeft / 60)}:{(totalTimeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {timerNotice && (
          <div className={`mb-4 p-3 rounded-lg font-semibold ${
            criticalTimer
              ? 'bg-red-100 border border-red-500 text-red-700 animate-pulse'
              : 'bg-yellow-100 border border-yellow-500 text-yellow-800'
          }`}>
            {timerNotice}
          </div>
        )}

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="flex gap-1 mb-6">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded ${
                idx < currentQuestionIndex
                  ? 'bg-green-500'
                  : idx === currentQuestionIndex
                    ? 'bg-indigo-600'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 mb-6`}>
          <div className="flex gap-2 mb-4">
            {currentQuestionIndex > 0 && (
              <button
                onClick={handlePreviousQuestion}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                ← Previous
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleNextQuestion}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Skip →' : 'Finish'}
            </button>
          </div>
          <h2 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentQuestion?.question}
          </h2>

          <div className="space-y-3">
            {currentOptions.map((option, index) => {
              let buttonClass = `w-full p-4 text-left rounded-lg border-2 transition-all `;
              if (showFeedback) {
                if (index === correctAnswerIndex) {
                  buttonClass += 'bg-green-600 border-green-600 text-white';
                } else if (index === selectedAnswer && !isCorrect) {
                  buttonClass += 'bg-red-600 border-red-600 text-white';
                } else {
                  buttonClass += darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-500';
                }
              } else {
                buttonClass += selectedAnswer === index
                  ? darkMode ? 'border-indigo-500 bg-indigo-900/50 text-indigo-300' : 'border-indigo-600 bg-indigo-50 text-indigo-700'
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
            <div className={`mt-6 p-4 rounded-lg ${isCorrect ? (darkMode ? 'bg-green-900/40 border border-green-700/50' : 'bg-green-100') : (darkMode ? 'bg-red-900/40 border border-red-700/50' : 'bg-red-100')}`}>
              <p className={`font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentQuestion?.explanation}
              </p>
            </div>
          )}

          {!showFeedback ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={feedbackMode === 'after_each' && selectedAnswer === null}
              className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {feedbackMode === 'after_each' ? 'Submit Answer' : 'Next →'}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next →' : 'View Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
