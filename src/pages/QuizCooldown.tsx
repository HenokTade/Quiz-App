import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { reportViolation, getStrikeLimit } from '../lib/reportViolation';

export default function QuizCooldown() {
  const navigate = useNavigate();
  const { quizFinished, quizStartTime, tabViolations, quizViolationLimit, user } = useStore();
  const isQuizActive = !quizFinished && quizStartTime > 0;
  const isAdmin = user?.role === 'admin';
  const recordedRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const strikeLimit = getStrikeLimit(quizViolationLimit);

  const maybeAutoSubmit = (count: number) => {
    const limit = getStrikeLimit(useStore.getState().quizViolationLimit);
    if (count >= limit && !submittingRef.current) {
      submittingRef.current = true;
      setSubmitting(true);
      window.setTimeout(() => {
        useStore.getState().finishQuiz();
        navigate('/results');
      }, 2500);
    }
  };

  useEffect(() => {
    if (!isQuizActive) {
      if (!submittingRef.current) navigate('/home');
      return;
    }
    // Anti-cheat doesn't apply to admins — never record a violation for them.
    if (isAdmin) return;
    if (!recordedRef.current) {
      recordedRef.current = true;
      maybeAutoSubmit(reportViolation('navigation_attempt'));
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isQuizActive, navigate, isAdmin]);

  // Keep monitoring tab switches even on the blocked page
  useEffect(() => {
    if (!isQuizActive || isAdmin) return;

    const record = () => {
      if (submittingRef.current) return;
      if (Date.now() - lastViolationTimeRef.current < 500) return;
      lastViolationTimeRef.current = Date.now();
      maybeAutoSubmit(reportViolation('tab_switch'));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') record();
    };
    const onBlur = () => {
      if (document.visibilityState !== 'hidden') record();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [isQuizActive, isAdmin]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6 animate-pulse">🚫</div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Navigation Blocked
        </h2>
        <p className="text-gray-400 text-lg mb-6">
          You cannot navigate away while a quiz is in progress.
        </p>
        {tabViolations > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-red-500/40">
            <p className="text-red-400 text-sm mb-2">
              ⛔ {tabViolations} violation{tabViolations !== 1 ? 's' : ''} recorded
            </p>
            {tabViolations === strikeLimit - 1 && !submitting && (
              <p className="text-amber-400 text-sm mb-2 font-semibold">
                ⚠️ Final warning: one more violation will automatically close and submit your quiz.
              </p>
            )}
            <p className="text-gray-500 text-xs">
              All violations are tracked and visible to your instructor.
            </p>
          </div>
        )}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm mb-2">⚠️ Anti-Cheat Active</p>
          <p className="text-gray-500 text-xs">
            Tab switches, external links, and navigation are monitored.
            Attempting to cheat will black out the screen and record a violation.
            On the {strikeLimit}{strikeLimit === 1 ? 'st' : strikeLimit === 2 ? 'nd' : strikeLimit === 3 ? 'rd' : 'th'} violation your quiz is automatically submitted.
          </p>
        </div>
        {submitting ? (
          <div className="bg-red-900/40 border border-red-500/60 rounded-xl p-4">
            <p className="text-red-300 font-semibold animate-pulse">🚨 Auto-submitting your quiz…</p>
            <p className="text-gray-400 text-xs mt-1">Your answers are being recorded.</p>
          </div>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-lg"
          >
            Return to Quiz
          </button>
        )}
      </div>
    </div>
  );
}
