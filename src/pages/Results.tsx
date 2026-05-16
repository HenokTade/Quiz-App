import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';

export default function Results() {
  const { currentQuiz, quizAnswers, user, darkMode, resetQuiz } = useStore();
  const [score, setScore] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentQuiz.length === 0) {
      navigate('/home');
      return;
    }

    let correct = 0;
    quizAnswers.forEach((answer) => {
      const question = currentQuiz[answer.questionIndex];
      if (question && answer.selectedAnswer === question.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);

    const saveResult = async () => {
      if (user) {
        await addDoc(collection(db, 'results'), {
          userId: user.uid,
          category: currentQuiz[0]?.category || 'unknown',
          score: correct,
          totalQuestions: currentQuiz.length,
          date: new Date().toISOString(),
          answers: quizAnswers.map(a => ({
            questionIndex: a.questionIndex,
            selectedAnswer: a.selectedAnswer,
            isCorrect: currentQuiz[a.questionIndex]?.correctAnswer === a.selectedAnswer
          }))
        });
      }
    };
    saveResult();
  }, []);

  const handleRetake = () => {
    resetQuiz();
    navigate('/home');
  };

  const percentage = currentQuiz.length > 0 ? Math.round((score / currentQuiz.length) * 100) : 0;

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto px-4">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8 text-center`}>
          <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Quiz Complete!
          </h1>
          
          <div className="text-6xl font-bold mb-4">
            <span className={percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}>
              {percentage}%
            </span>
          </div>
          
          <p className={`text-xl mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            You scored {score} out of {currentQuiz.length}
          </p>

          <div className="text-left space-y-4 mb-8">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Review Answers:</h2>
            {currentQuiz.map((question, index) => {
              const answer = quizAnswers.find(a => a.questionIndex === index);
              const isCorrect = answer?.selectedAnswer === question.correctAnswer;
              return (
                <div key={index} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {index + 1}. {question.question}
                  </p>
                  <p className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                    {isCorrect ? '✓ Correct' : `✗ Your answer: ${question.options[answer?.selectedAnswer ?? 0] || 'No answer'}`}
                  </p>
                  {!isCorrect && (
                    <p className="text-green-600 mt-1">
                      Correct: {question.options[question.correctAnswer]}
                    </p>
                  )}
                  <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    💡 {question.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleRetake}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700"
          >
            Take Another Quiz
          </button>
        </div>
      </div>
    </div>
  );
}