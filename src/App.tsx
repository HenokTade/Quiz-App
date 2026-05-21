import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useStore, User } from './store/useStore';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import StudentDashboard from './pages/StudentDashboard';
import QuestionsManager from './pages/QuestionsManager';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AppContent() {
  const { darkMode, setUser } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();
        const emailName = firebaseUser.email?.split('@')[0] || '';
        const fallbackName = emailName
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          role: userData?.role || 'student',
          displayName: userData?.displayName || fallbackName
        } as User);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-xl text-indigo-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/quiz/:categoryId" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/questions" element={<ProtectedRoute><QuestionsManager /></ProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/dashboard" />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}