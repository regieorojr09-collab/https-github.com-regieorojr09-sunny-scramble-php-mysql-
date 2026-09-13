import { useState, useEffect } from 'react';
import API from '../services/api';
import Pagination from './Pagination';

const Spoilage = () => {
  const [spoilages, setSpoilages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ productId: '', quantity: '', reason: 'Damaged', notes: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [spoilagesRes, productsRes] = await Promise.all([
        API.get('/spoilages'),
        API.get('/products')
      ]);
      setSpoilages(spoilagesRes.data);
      setProducts(productsRes.data);
      if (productsRes.data.length > 0 && !formData.productId) {
        setFormData(prev => ({ ...prev, productId: productsRes.data[0]._id }));
      }
      setError('');
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/spoilages', {
        ...formData,
        quantity: Number(formData.quantity)
      });
      setMessage('Spoilage recorded successfully.');
      setShowModal(false);
      setFormData({ productId: products[0]?._id || '', quantity: '', reason: 'Damaged', notes: '' });
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record spoilage.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900";

  return (
    <div className="max-w-6xl mx-auto">
      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Spoilage & Adjustments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track expired, damaged, or spilled inventory</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Record Spoilage
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Date</th>
              <th className="p-4">Product</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Lost Value (Cost)</th>
              <th className="p-4">Reported By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-10 text-center text-slate-500">Loading records...</td></tr>
            ) : spoilages.length > 0 ? (
              (() => {
                const totalPages = Math.ceil(spoilages.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedSpoilages = spoilages.slice(startIndex, startIndex + itemsPerPage);
                return paginatedSpoilages.map((spoilage) => (
                  <tr key={spoilage._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm text-slate-500">{new Date(spoilage.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-sm font-medium text-slate-800">{spoilage.productId ? spoilage.productId.productName : 'Unknown'}</td>
                    <td className={`p-4 text-sm font-bold ${spoilage.type === 'stock-in' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {spoilage.type === 'stock-in' ? '+' : '-'}{Math.abs(spoilage.quantity)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        spoilage.type === 'stock-in' ? 'bg-emerald-100 text-emerald-700' :
                        (spoilage.reason && spoilage.reason.includes('[Adjustment]')) ? 'bg-purple-100 text-purple-700' :
                        spoilage.reason === 'Staff Meal' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {spoilage.reason ? spoilage.reason.replace('[Adjustment] ', 'Adjustment: ') : 'Unknown'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-800">
                      {spoilage.type === 'stock-in' ? '--' : `₱${spoilage.cost}`}
                    </td>
                    <td className="p-4 text-sm text-slate-500">{spoilage.reportedBy ? spoilage.reportedBy.fullName : 'System'}</td>
                  </tr>
                ));
              })()
            ) : (
              <tr><td colSpan="6" className="p-10 text-center text-slate-400 text-sm">No spoilage records found.</td></tr>
            )}
          </tbody>
        </table>
        
        {!loading && spoilages.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil(spoilages.length / itemsPerPage)}
            itemsPerPage={itemsPerPage}
            totalItems={spoilages.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Record Spoilage / Loss</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select name="productId" value={formData.productId} onChange={handleChange} className={inputClass} required>
                  <option value="" disabled>Select a product...</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.productName} (In Stock: {p.quantity})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Lost</label>
                  <input type="number" name="quantity" min="1" value={formData.quantity} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <select name="reason" value={formData.reason} onChange={handleChange} className={inputClass} required>
                    <option value="Damaged">Damaged</option>
                    <option value="Expired">Expired</option>
                    <option value="Spilled">Spilled</option>
                    <option value="Staff Meal">Staff Meal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input type="text" name="notes" value={formData.notes} onChange={handleChange} className={inputClass} placeholder="Additional details..." />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors">
                Save Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Spoilage;
