import { useState, useEffect } from 'react';
import API from '../services/api';
import Pagination from './Pagination';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ fullName: '', email: '', role: 'staff' });
  const [generatedPasswordModal, setGeneratedPasswordModal] = useState({ show: false, password: '', title: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data);
    } catch { setError('Failed to fetch users'); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUsers(); }, []);

  const handleUpdateUser = async (id, updates) => {
    try {
      await API.put(`/users/${id}`, updates);
      setMessage('User updated.');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Failed to update user.'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await API.delete(`/users/${id}`);
        setMessage('User deleted.');
        fetchUsers();
        setTimeout(() => setMessage(''), 3000);
      } catch { setError('Failed to delete user.'); }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/users', newUserForm);
      setMessage('User created.');
      setShowAddModal(false);
      setNewUserForm({ fullName: '', email: '', role: 'staff' });
      fetchUsers();
      if (res.data.generatedPassword) {
        setGeneratedPasswordModal({ show: true, password: res.data.generatedPassword, title: `Password for ${res.data.user.fullName}` });
      } else {
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) { setError(err.response?.data?.message || 'Failed to create user.'); }
  };

  const handleResetPassword = async (id, name) => {
    if (window.confirm(`Are you sure you want to reset the password for ${name}?`)) {
      try {
        const res = await API.put(`/users/${id}/reset-password`);
        setMessage('Password reset.');
        if (res.data.generatedPassword) {
          setGeneratedPasswordModal({ show: true, password: res.data.generatedPassword, title: `New password for ${name}` });
        }
        setTimeout(() => setMessage(''), 3000);
      } catch (err) { setError(err.response?.data?.message || 'Failed to reset password.'); }
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900";

  return (
    <div className="max-w-6xl mx-auto">
      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage user accounts and role assignments</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role & Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              (() => {
                const totalPages = Math.ceil(users.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);
                
                return paginatedUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-800">{user.fullName}</td>
                    <td className="p-4 text-sm text-slate-500">{user.email}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUser(user._id, { role: e.target.value })}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                          disabled={user.role === 'owner'}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                        {user.role !== 'owner' && (
                          <select
                            value={user.status || 'active'}
                            onChange={(e) => handleUpdateUser(user._id, { status: e.target.value })}
                            className={`px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:border-amber-500 ${user.status === 'inactive' ? 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500/50'}`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-3 items-center">
                      <button onClick={() => handleResetPassword(user._id, user.fullName)} className="text-xs font-medium text-blue-500 hover:text-blue-700 hover:underline">Reset Pass</button>
                      {user.role !== 'owner' && (
                        <button onClick={() => handleDelete(user._id)} className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline">Delete</button>
                      )}
                    </td>
                  </tr>
                ));
              })()
            ) : <tr><td colSpan="4" className="p-10 text-center text-slate-400 text-sm">No users found.</td></tr>}
          </tbody>
        </table>
        
        {users.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil(users.length / itemsPerPage)}
            itemsPerPage={itemsPerPage}
            totalItems={users.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" required value={newUserForm.fullName} onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email / Username</label>
                <input type="text" required value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={newUserForm.role} onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})} className={inputClass}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Password Modal */}
      {generatedPasswordModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-2">{generatedPasswordModal.title}</h2>
            <p className="text-sm text-slate-500 mb-4">Please copy and send this auto-generated password to the user. They will be forced to change it on their first login.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-bold text-slate-800 tracking-wider select-all">{generatedPasswordModal.password}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedPasswordModal.password);
                  alert('Password copied to clipboard!');
                }} 
                className="p-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-md transition-colors"
                title="Copy to clipboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
            <button 
              onClick={() => {
                setGeneratedPasswordModal({ show: false, password: '', title: '' });
                setMessage('');
              }} 
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
