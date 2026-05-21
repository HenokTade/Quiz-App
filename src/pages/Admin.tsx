import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

interface UserDoc { id: string; email: string; displayName?: string; role: 'student' | 'admin'; createdAt?: string }

interface QuizResultDoc {
  id: string; userId: string; category: string; score: number; totalQuestions: number; date: string
}

export default function Admin() {
  const { user, darkMode } = useStore();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [allResults, setAllResults] = useState<QuizResultDoc[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'results'>('stats');
  const [resultFilterUser, setResultFilterUser] = useState('');
  const [resultFilterCategory, setResultFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UserDoc[]);
  };

  const fetchAllResults = async () => {
    const snapshot = await getDocs(collection(db, 'results'));
    setAllResults(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as QuizResultDoc[]);
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/home'); return; }
    const load = async () => {
      setLoading(true); setFetchError('');
      try {
        await Promise.all([fetchUsers(), fetchAllResults()]);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load data');
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleRoleChange = async (uid: string, newRole: 'student' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role. Check console for details.');
    }
  };

  const handleDeleteUserResult = async (resultId: string) => {
    await deleteDoc(doc(db, 'results', resultId));
    setAllResults(prev => prev.filter(r => r.id !== resultId));
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Delete this user and all their quiz results?')) return;
    const resultsQuery = query(collection(db, 'results'), where('userId', '==', uid));
    const resultsSnap = await getDocs(resultsQuery);
    const deletePromises = resultsSnap.docs.map(d => deleteDoc(doc(db, 'results', d.id)));
    await Promise.all(deletePromises);
    await deleteDoc(doc(db, 'users', uid));
    setUsers(prev => prev.filter(u => u.id !== uid));
    setAllResults(prev => prev.filter(r => r.userId !== uid));
  };

  const filteredResults = allResults.filter(r => {
    const matchesUser = !resultFilterUser || r.userId === resultFilterUser;
    const matchesCategory = !resultFilterCategory || r.category === resultFilterCategory;
    return matchesUser && matchesCategory;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!user || user.role !== 'admin') return null;

  const totalResults = allResults.length;
  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;

  const navBtn = (tab: typeof activeTab, label: string) => (
    <button onClick={() => setActiveTab(tab)}
      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeTab === tab
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
          : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}>{label}</button>
  );

  return (
    <div className={`min-h-screen py-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h1>
          <div className="flex gap-1 flex-wrap">
            {navBtn('stats', 'Overview')}
            {navBtn('users', 'Users')}
            {navBtn('results', 'Results')}
          </div>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700/50 text-red-700 dark:text-red-400 rounded-xl">
            Failed to load data: {fetchError}
          </div>
        )}

        {activeTab === 'stats' && (
          <>
            {loading ? (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 text-center`}>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading dashboard data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Users', value: totalUsers, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { label: 'Total Quizzes Taken', value: totalResults, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                ].map(stat => (
                  <div key={stat.label}
                    className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 border ${stat.border} ${stat.bg}`}>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                    <p className={`text-4xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Manage Users ({totalUsers})</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{totalAdmins} admin{totalAdmins !== 1 ? 's' : ''}</p>
            </div>
            {users.length === 0 ? (
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No users registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                      <th className="text-left py-3 px-2 font-medium">Name</th>
                      <th className="text-left py-3 px-2 font-medium">Email</th>
                      <th className="text-left py-3 px-2 font-medium">Role</th>
                      <th className="text-left py-3 px-2 font-medium">Joined</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <td className={`py-3 px-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{u.displayName || '—'}</td>
                        <td className={`py-3 px-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{u.email}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                          }`}>{u.role}</span>
                        </td>
                        <td className={`py-3 px-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {u.id !== user.uid ? (
                            <div className="flex items-center justify-end gap-2">
                              <select key={u.role} value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as 'student' | 'admin')}
                                className={`text-xs p-1.5 rounded border ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'}`}>
                                <option value="student">student</option>
                                <option value="admin">admin</option>
                              </select>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">Delete</button>
                            </div>
                          ) : (
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>You</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>All Quiz Results ({filteredResults.length})</h2>
              <div className="flex gap-3 flex-wrap">
                <select value={resultFilterUser} onChange={e => setResultFilterUser(e.target.value)}
                  className={`text-sm p-2 rounded-lg border ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'}`}>
                  <option value="">All Users</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
                </select>
                <select value={resultFilterCategory} onChange={e => setResultFilterCategory(e.target.value)}
                  className={`text-sm p-2 rounded-lg border ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'}`}>
                  <option value="">All Categories</option>
                  {[...new Set(allResults.map(r => r.category))].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            {filteredResults.length === 0 ? (
              <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No results found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-left py-3 px-2 font-medium">Category</th>
                      <th className="text-left py-3 px-2 font-medium">Score</th>
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-right py-3 px-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map(r => {
                      const userDoc = users.find(u => u.id === r.userId);
                      const percentage = Math.round((r.score / r.totalQuestions) * 100);
                      return (
                        <tr key={r.id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                          <td className={`py-3 px-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {userDoc?.displayName || userDoc?.email || r.userId?.slice(0, 8)}
                          </td>
                          <td className={`py-3 px-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{r.category}</td>
                          <td className="py-3 px-2">
                            <span className={`font-semibold ${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {r.score}/{r.totalQuestions} ({percentage}%)
                            </span>
                          </td>
                          <td className={`py-3 px-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(r.date).toLocaleDateString()} {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button onClick={() => handleDeleteUserResult(r.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
