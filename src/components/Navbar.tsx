import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useStore } from '../store/useStore';

export default function Navbar() {
  const { user, darkMode, setDarkMode } = useStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <nav className={`${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-md`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-600">QuizApp</Link>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {user ? (
            <>
              <Link to="/dashboard" className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'} hover:underline`}>Dashboard</Link>
              <Link to="/home" className="text-gray-600 hover:underline">Quizzes</Link>
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
    </nav>
  );
}