import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import API from '../services/api';

const Settings = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['admin', 'owner', 'superadmin'].includes(user.role);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

  const [configForm, setConfigForm] = useState({
    storeName: '', storeAddress: '', storeContact: '', branchName: '', 
    taxRate: 0, taxRegistrationNumber: '', receiptFooter: '', lowStockThreshold: 20, currency: 'PHP'
  });
  const [configMessage, setConfigMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (isAdmin) {
      API.get('/config').then(res => {
        if (res.data) {
          setConfigForm(prev => ({ ...prev, ...res.data }));
        }
      }).catch(err => console.error(err));
    }
  }, [isAdmin]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await API.put('/users/change-password', passwordForm);
      setPasswordMessage({ text: 'Password changed successfully.', type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => setPasswordMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setPasswordMessage({ text: err.response?.data?.message || 'Failed to change password.', type: 'error' });
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/config', configForm);
      setConfigForm(prev => ({ ...prev, ...res.data.config }));
      setConfigMessage({ text: 'Store configuration updated.', type: 'success' });
      setTimeout(() => setConfigMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setConfigMessage({ text: err.response?.data?.message || 'Failed to update config.', type: 'error' });
    }
  };

  const handleBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API.defaults.baseURL}/backup/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Backup failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sunny_scramble_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading backup');
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account security</p>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow duration-300">
        <h2 className="text-base font-bold text-slate-800 mb-1">Change Password</h2>
        <p className="text-sm text-slate-500 mb-6">Update your account password. Use a strong, unique password.</p>

        {passwordMessage.text && (
          <div className={`px-4 py-3 rounded-lg mb-5 text-sm font-medium flex items-start gap-2 ${
            passwordMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {passwordMessage.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input type="password" required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input type="password" required value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} className={inputClass} />
          </div>
          <button type="submit" className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors">
            Update Password
          </button>
        </form>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mt-6 hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-base font-bold text-slate-800 mb-1">Store Configuration</h2>
          <p className="text-sm text-slate-500 mb-6">Manage global store settings and information.</p>

          {configMessage.text && (
            <div className={`px-4 py-3 rounded-lg mb-5 text-sm font-medium flex items-start gap-2 ${
              configMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {configMessage.text}
            </div>
          )}

          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                <input type="text" value={configForm.storeName} onChange={(e) => setConfigForm({...configForm, storeName: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                <input type="text" value={configForm.branchName} onChange={(e) => setConfigForm({...configForm, branchName: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Store Contact</label>
                <input type="text" value={configForm.storeContact} onChange={(e) => setConfigForm({...configForm, storeContact: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Store Address</label>
                <input type="text" value={configForm.storeAddress} onChange={(e) => setConfigForm({...configForm, storeAddress: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                <input type="number" step="0.01" value={configForm.taxRate} onChange={(e) => setConfigForm({...configForm, taxRate: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Registration Number (TIN)</label>
                <input type="text" value={configForm.taxRegistrationNumber} onChange={(e) => setConfigForm({...configForm, taxRegistrationNumber: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Threshold (%)</label>
                <input type="number" value={configForm.lowStockThreshold} onChange={(e) => setConfigForm({...configForm, lowStockThreshold: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select value={configForm.currency} onChange={(e) => setConfigForm({...configForm, currency: e.target.value})} className={inputClass}>
                  <option value="PHP">PHP (₱)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Footer Message</label>
                <input type="text" value={configForm.receiptFooter} onChange={(e) => setConfigForm({...configForm, receiptFooter: e.target.value})} className={inputClass} />
              </div>
            </div>
            
            <button type="submit" className="px-6 py-2.5 mt-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors">
              Save Configuration
            </button>
          </form>
        </div>
      )}


    </div>
  );
};

export default Settings;
