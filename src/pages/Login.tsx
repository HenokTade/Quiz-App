import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, db, googleProvider } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setUser, darkMode } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
      setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email!,
        role: userData?.role || 'student',
        displayName: userData?.displayName
      });
      navigate('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let role: 'student' | 'admin' = 'student';
      let displayName = firebaseUser.displayName || '';

      if (!userDocSnap.exists()) {
        // First time Google sign-in: provision a new user
        await setDoc(userDocRef, {
          email: firebaseUser.email,
          displayName,
          role: 'student',
          createdAt: new Date().toISOString()
        });
      } else {
        const data = userDocSnap.data();
        role = data?.role || 'student';
        displayName = data?.displayName || displayName;
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        role,
        displayName
      });
      navigate('/home');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (!errMsg.includes('popup-closed-by-user')) {
        setError(errMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const cardBg = darkMode
    ? 'bg-gray-800/80 border border-gray-700'
    : 'bg-white/80 border border-gray-200';
  const inputCls = darkMode
    ? 'bg-gray-700 text-white border-gray-600 focus:border-indigo-500 placeholder-gray-400'
    : 'bg-gray-50 text-gray-900 border-gray-300 focus:border-indigo-500 placeholder-gray-400';
  const labelCls = darkMode ? 'text-gray-300' : 'text-gray-700';
  const pageBg = darkMode
    ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950'
    : 'bg-gradient-to-br from-slate-100 via-white to-indigo-50';

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${pageBg}`}>
      <div className={`max-w-md w-full rounded-2xl shadow-2xl backdrop-blur-sm p-8 ${cardBg}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Welcome back</h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sign in to your QuizApp account</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 mb-5
            ${darkMode
              ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-indigo-500'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-indigo-400'}
            disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.98]`}
        >
          {googleLoading ? (
            <svg className="animate-spin w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`flex-1 h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>or sign in with email</span>
          <div className={`flex-1 h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 ${inputCls}`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 ${inputCls}`}
              required
            />
          </div>
          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 hover:shadow-indigo-500/30 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-500 hover:text-indigo-400 font-semibold transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}