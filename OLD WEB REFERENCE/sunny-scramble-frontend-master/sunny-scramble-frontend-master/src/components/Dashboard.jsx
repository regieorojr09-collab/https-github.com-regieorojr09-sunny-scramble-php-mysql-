import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState('today');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await API.get(`/reports/summary?period=${timeFilter}`);
        setSummary(response.data);
      } catch { setError('Failed to load dashboard summary.'); }
    };
    fetchSummary();
  }, [timeFilter]);

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm font-medium">{error}</div>
  );

  if (!summary) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-slate-400">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        <span className="text-sm font-medium">Loading dashboard data...</span>
      </div>
    </div>
  );

  const isPositive = summary.netProfit >= 0;

  const stats = [
    { label: 'Total Revenue',  value: `₱${summary.totalSales.toLocaleString()}`,        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'blue',   bg: 'bg-blue-50', link: '/reports' },
    { label: 'Net Profit',     value: `₱${summary.netProfit.toLocaleString()}`,          icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',                                                               color: isPositive ? 'emerald' : 'red', bg: isPositive ? 'bg-emerald-50' : 'bg-red-50', link: '/reports' },
    { label: 'Total Expenses', value: `₱${summary.totalExpenses.toLocaleString()}`,       icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z', color: 'orange', bg: 'bg-orange-50', link: '/deliveries' },
    { label: 'Low Stock Items',value: summary.lowStockCount.toString(),                    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z', color: 'rose',   bg: 'bg-rose-50', link: '/inventory' },
    { label: 'Stock Received',value: summary.totalDeliveries?.toString() || '0',         icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z', color: 'purple', bg: 'bg-purple-50', link: '/deliveries' },
    { label: 'Spoiled Items',  value: summary.totalSpoilage?.toString() || '0',            icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'yellow', bg: 'bg-yellow-50', link: '/spoilage' },
  ];

  const colorMap = {
    blue:    { text: 'text-blue-700',    icon: 'text-blue-600',    borderSide: 'border-l-4 border-l-blue-500' },
    emerald: { text: 'text-emerald-700', icon: 'text-emerald-600', borderSide: 'border-l-4 border-l-emerald-500' },
    red:     { text: 'text-red-700',     icon: 'text-red-600',     borderSide: 'border-l-4 border-l-red-500' },
    orange:  { text: 'text-orange-700',  icon: 'text-orange-600',  borderSide: 'border-l-4 border-l-orange-500' },
    rose:    { text: 'text-rose-700',    icon: 'text-rose-600',    borderSide: 'border-l-4 border-l-rose-500' },
    cyan:    { text: 'text-cyan-700',    icon: 'text-cyan-600',    borderSide: 'border-l-4 border-l-cyan-500' },
    purple:  { text: 'text-purple-700',  icon: 'text-purple-600',  borderSide: 'border-l-4 border-l-purple-500' },
    yellow:  { text: 'text-yellow-700',  icon: 'text-yellow-600',  borderSide: 'border-l-4 border-l-yellow-500' },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your business performance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            {['today', 'week', 'month', 'all-time'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${timeFilter === filter ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                {filter === 'all-time' ? 'All Time' : filter}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 bg-white shadow-sm border border-slate-200 rounded-lg px-3 py-1.5 self-start sm:self-auto hidden sm:block">
            Updated just now
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const c = colorMap[stat.color];
          return (
            <div 
              key={stat.label} 
              onClick={() => stat.link && navigate(stat.link)}
              className={`bg-white rounded-xl shadow-md border border-slate-200 p-5 transition-all duration-300 ${c.borderSide} ${stat.link ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <svg className={`w-5 h-5 ${c.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.text}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom grid: Chart + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart area */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Revenue Trend</h2>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Last 6 months
            </div>
          </div>
          <div className="w-full h-56 flex items-end gap-3 px-2">
            {summary.last6MonthsRevenue && summary.last6MonthsRevenue.map((item, i) => {
              const maxRev = Math.max(...summary.last6MonthsRevenue.map(d => d.revenue), 1);
              const heightPct = Math.max((item.revenue / maxRev) * 100, 5); // min 5% height
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    ₱{item.revenue.toLocaleString()}
                  </div>
                  <div className="w-full bg-amber-400/80 hover:bg-amber-500 rounded-t-md transition-all duration-300" style={{ height: `${heightPct}%` }} />
                  <span className="text-[11px] font-medium text-slate-400">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock List */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Low Stock Alerts</h2>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{summary.lowStockCount}</span>
          </div>
          {summary.lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {summary.lowStockProducts.slice(0, 6).map((product) => {
                const capacity = product.maxCapacity || 100;
                const pct = Math.min((product.quantity / capacity) * 100, 100);
                return (
                  <div key={product._id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                      {product.category === 'Chicken' ? '🍗' : product.category === 'Egg' ? '🥚' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{product.productName}</p>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct <= 10 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-600">{product.quantity}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm">All stock levels are optimal.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
