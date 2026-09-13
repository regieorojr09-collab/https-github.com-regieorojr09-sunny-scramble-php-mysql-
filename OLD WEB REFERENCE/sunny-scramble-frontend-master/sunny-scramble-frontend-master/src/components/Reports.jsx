import { useState, useEffect } from 'react';
import API from '../services/api';

const Reports = () => {
  const [salesData, setSalesData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [incomeData, setIncomeData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const query = params.toString() ? `?${params.toString()}` : '';

      const [salesRes, expenseRes, incomeRes] = await Promise.all([
        API.get(`/reports/sales-summary${query}`),
        API.get(`/reports/expense-summary${query}`),
        API.get(`/reports/income-statement${query}`)
      ]);

      setSalesData(salesRes.data);
      setExpenseData(expenseRes.data);
      setIncomeData(incomeRes.data);
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = (e) => {
    e.preventDefault();
    fetchReports();
  };

  if (loading && !incomeData) {
    return <div className="p-8 text-center text-slate-500">Loading reports...</div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">View sales, expenses, and overall profit & loss</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors text-sm h-[38px]">
            Generate Report
          </button>
        </form>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

      {incomeData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Sales</h3>
            <p className="text-3xl font-bold text-slate-800">₱{incomeData.revenue.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-2">{salesData.length} recorded sales</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Expenses</h3>
            <p className="text-3xl font-bold text-slate-800">₱{incomeData.expenses.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-2">{expenseData.length} recorded expenses</p>
          </div>
          <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 ${incomeData.netIncome >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Net Income</h3>
            <p className={`text-3xl font-bold ${incomeData.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ₱{incomeData.netIncome.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 mt-2">Overall profit/loss</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-700">Recent Sales</h2>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-500 text-xs">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {salesData.length > 0 ? salesData.map(sale => (
                  <tr key={sale._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-600">{new Date(sale.saleDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">₱{sale.totalAmount.toLocaleString()}</td>
                  </tr>
                )) : <tr><td colSpan="2" className="p-6 text-center text-slate-500">No sales data.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-700">Recent Expenses</h2>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-500 text-xs">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenseData.length > 0 ? expenseData.map(expense => (
                  <tr key={expense._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-600">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-slate-600">{expense.category}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">₱{expense.totalCost.toLocaleString()}</td>
                  </tr>
                )) : <tr><td colSpan="3" className="p-6 text-center text-slate-500">No expenses data.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
