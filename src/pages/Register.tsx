import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const { setUser, darkMode } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        role: 'student',
        createdAt: new Date().toISOString()
      });
      setUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email!,
        role: 'student',
        displayName
      });
      navigate('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Register</h2>
        {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
              required
            />
          </div>
          <div className="mb-4">
            <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
              required
            />
          </div>
          <div className="mb-6">
            <label className={`block mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300'}`}
              required
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700">
            Register
          </button>
        </form>
        <p className={`mt-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Already have an account? <Link to="/login" className="text-indigo-600">Login</Link>
        </p>
      </div>
    </div>
  );
}