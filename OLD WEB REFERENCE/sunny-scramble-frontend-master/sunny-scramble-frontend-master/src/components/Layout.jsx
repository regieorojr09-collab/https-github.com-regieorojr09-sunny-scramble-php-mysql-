import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import API from '../services/api';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse sidebar on smaller screens, but expand on large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [forcePasswordForm, setForcePasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [forcePasswordError, setForcePasswordError] = useState('');

  const handleForcePasswordSubmit = async (e) => {
    e.preventDefault();
    if (forcePasswordForm.newPassword !== forcePasswordForm.confirmPassword) {
      setForcePasswordError('Passwords do not match.');
      return;
    }
    try {
      await API.put('/users/change-password', { newPassword: forcePasswordForm.newPassword });
      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      setForcePasswordError(err.response?.data?.message || 'Failed to update password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const navGroups = [
    {
      label: 'Main',
      links: [
        { path: '/dashboard',  label: 'Dashboard',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      ]
    },
    {
      label: 'Sales & Service',
      links: [
        { path: '/sales',       label: 'Sales (POS)',     icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
        { path: '/transactions',label: 'Transaction History', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      ]
    },
    {
      label: 'Inventory & Supply',
      links: [
        { path: '/inventory',   label: 'Inventory',       icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { path: '/deliveries',  label: 'Expenses And Delivery',      icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
        { path: '/spoilage',    label: 'Spoilage',        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        { path: '/suppliers',   label: 'Suppliers',       icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      ]
    }
  ];

  const adminLinks = ['admin', 'owner', 'superadmin'].includes(user.role)
    ? [
        { path: '/users',       label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
      ]
    : [];

  const allGroups = [
    ...navGroups,
    {
      label: 'Reports',
      links: [
        { path: '/reports', label: 'Reports & Analytics', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }
      ]
    },
    {
      label: 'Administration',
      links: adminLinks
    }
  ];

  const [expandedGroups, setExpandedGroups] = useState({
    'Main': true,
    'Sales & Service': true,
    'Inventory & Supply': true,
    'Reports': true,
    'Administration': true
  });

  const toggleGroup = (label) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-gray text-brand-dark font-sans">
      
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-brand-dark/50 z-30 lg:hidden backdrop-blur-sm" onClick={closeMobile} />
      )}

      {/* Force Password Change Modal Overlay */}
      {user.mustChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 border border-slate-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Action Required</h2>
              <p className="text-sm text-slate-500 mt-2">For your security, you must change your auto-generated password before accessing the system.</p>
            </div>
            
            {forcePasswordError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-200 font-medium">
                {forcePasswordError}
              </div>
            )}
            
            <form onSubmit={handleForcePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input 
                  type="password" required 
                  value={forcePasswordForm.newPassword} 
                  onChange={e => setForcePasswordForm({...forcePasswordForm, newPassword: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Enter a strong password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input 
                  type="password" required 
                  value={forcePasswordForm.confirmPassword} 
                  onChange={e => setForcePasswordForm({...forcePasswordForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Confirm your password"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors mt-2">
                Update Password
              </button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors">
                Cancel and Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu button & Top Shell Bar (Mobile only or if needed globally, keeping it minimal here) */}
      <div className="lg:hidden fixed top-0 w-full h-16 bg-white border-b border-gray-200 z-20 flex items-center px-4 shadow-sm">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="ml-3 font-semibold text-brand-dark">Sunny and Scramble</span>
      </div>

      {/* Sidebar - SAP White Clean Design */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        {/* Logo area */}
        <div className={`p-4 border-b border-gray-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 shrink-0`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/icon.png"
              alt="Logo"
              className="w-8 h-8 rounded-md object-cover border border-gray-200 shrink-0 shadow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-300">
                <h1 className="text-sm font-bold text-brand-dark tracking-tight leading-tight whitespace-nowrap">Sunny & Scramble</h1>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Malanday, San Mateo</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 scrollbar-hide">
          {allGroups.map((group) => {
            if (group.links.length === 0) return null;
            return (
              <div key={group.label} className="space-y-1">
                {!isCollapsed && (
                  <div 
                    className="flex items-center justify-between px-3 py-1 cursor-pointer text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                    onClick={() => toggleGroup(group.label)}
                  >
                    <span>{group.label}</span>
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedGroups[group.label] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
                
                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${expandedGroups[group.label] || isCollapsed ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {group.links.map((link) => {
                    const active = location.pathname === link.path;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={closeMobile}
                        title={isCollapsed ? link.label : ''}
                        className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                          ${active
                            ? 'bg-brand-yellow/10 text-brand-dark'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-brand-dark'
                          }`}
                      >
                        <div className={`flex items-center justify-center ${active ? 'text-brand-yellow drop-shadow-sm' : 'text-gray-400 group-hover:text-brand-dark'}`}>
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? "2" : "1.75"} d={link.icon} />
                          </svg>
                        </div>
                        {!isCollapsed && (
                          <span className={`truncate ${active ? 'font-semibold' : ''}`}>{link.label}</span>
                        )}
                        {/* Active indicator dot for collapsed state (optional) */}
                        {isCollapsed && active && (
                          <span className="absolute left-1 w-1.5 h-1.5 rounded-full bg-brand-yellow"></span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer & Collapse Toggle */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-2 p-1`}>
            <div className="w-8 h-8 rounded-full bg-brand-yellow flex items-center justify-center text-brand-dark font-bold text-xs shrink-0 shadow-sm border border-yellow-300">
              {user.fullName ? user.fullName.charAt(0) : 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-dark truncate">{user.fullName || 'Staff User'}</p>
                <p className="text-[11px] text-gray-500 capitalize">{user.role || 'staff'}</p>
              </div>
            )}
          </div>
          
          <div className={`flex ${isCollapsed ? 'flex-col gap-2' : 'gap-2'}`}>
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-brand-red bg-red-50 hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            )}
            {isCollapsed && (
              <button
                onClick={handleLogout}
                title="Logout"
                className="w-full flex justify-center py-2 rounded-lg text-brand-red bg-red-50 hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            )}
            <button
              onClick={toggleSidebar}
              className={`hidden lg:flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-brand-dark hover:bg-gray-100 transition-colors ${!isCollapsed ? 'w-10' : 'w-full'}`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - Wrapped in SAP Fiori style card container */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-16 flex flex-col h-full relative">

        
        <div className="p-4 lg:p-8 flex-1 max-w-[1600px] w-full mx-auto">
          {/* Let pages render directly to avoid double cards. SAP Fiori places content blocks directly on the gray background. */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
