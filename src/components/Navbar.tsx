import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useStore } from '../store/useStore';
import { useState } from 'react';

export default function Navbar() {
  const { user, darkMode, setDarkMode } = useStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const linkClass = `block px-3 py-2 rounded-lg ${
    darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
  }`;

  return (
    <nav className={`${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-md`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-full object-cover border border-indigo-500/30" />
          <span>QuizApp</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded-lg md:hidden ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'} hover:underline`}>Dashboard</Link>
                {user.role === 'admin' && (
                  <Link to="/questions" className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'} hover:underline`}>Questions</Link>
                )}
                <Link to="/home" className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:underline`}>Quizzes</Link>
                <button onClick={handleLogout} className="text-red-600 hover:underline">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-indigo-600 hover:underline">Login</Link>
                <Link to="/register" className="text-indigo-600 hover:underline">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className={`md:hidden border-t ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} px-4 py-3 space-y-2`}>
          {user ? (
            <>
              <Link to="/dashboard" className={linkClass} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              {user.role === 'admin' && (
                <Link to="/questions" className={linkClass} onClick={() => setMenuOpen(false)}>Questions</Link>
              )}
              <Link to="/home" className={linkClass} onClick={() => setMenuOpen(false)}>Quizzes</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className={`block w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 ${darkMode ? 'hover:bg-red-900/20' : ''}`}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClass} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className={linkClass} onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}