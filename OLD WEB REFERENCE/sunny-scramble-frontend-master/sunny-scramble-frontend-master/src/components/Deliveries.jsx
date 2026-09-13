import { useState, useEffect } from 'react';
import API from '../services/api';
import Pagination from './Pagination';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    productId: '', quantity: '', unitCost: '', totalCost: '',
    supplierId: '', referenceNo: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = async () => {
    try {
      const [deliveriesRes, productsRes, suppliersRes] = await Promise.all([
        API.get('/deliveries').catch(() => ({ data: [] })),
        API.get('/products'),
        API.get('/suppliers')
      ]);
      setDeliveries(deliveriesRes.data);
      setProducts(productsRes.data);
      setSuppliers(suppliersRes.data);
      if (productsRes.data.length > 0 && !formData.productId) {
        setFormData(prev => ({ ...prev, productId: productsRes.data[0]._id }));
      }
      if (suppliersRes.data.length > 0 && !formData.supplierId) {
        setFormData(prev => ({ ...prev, supplierId: suppliersRes.data[0]._id }));
      }
    } catch { setError('Failed to fetch data'); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if ((name === 'quantity' || name === 'unitCost') && updated.quantity && updated.unitCost) {
        updated.totalCost = (parseFloat(updated.quantity) * parseFloat(updated.unitCost)).toString();
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/deliveries', {
        ...formData,
        quantity: Number(formData.quantity),
        unitCost: Number(formData.unitCost),
        totalCost: Number(formData.totalCost)
      });
      setMessage('Delivery logged successfully.');
      setShowModal(false);
      setFormData({ productId: products[0]?._id || '', quantity: '', unitCost: '', totalCost: '', supplierId: suppliers[0]?._id || '', referenceNo: '' });
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Failed to log delivery.'); }
  };

  const filteredDeliveries = deliveries.filter(d =>
    (d.supplierId?.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     d.productId?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     d.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900";

  return (
    <div className="max-w-7xl mx-auto">
      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Stock Inbound / Receiving</h1>
              <p className="text-xs text-slate-500">Track incoming stock and supplier expenses</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Record Stock Received
          </button>
        </div>

        {/* Filter */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <input
            type="text"
            placeholder="Search supplier, reference number, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} w-full md:w-96`}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-12">Img</th>
                <th className="p-4">Date & Ref</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Product Details</th>
                <th className="p-4">Costing</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.length > 0 ? (
                (() => {
                  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginatedDeliveries = filteredDeliveries.slice(startIndex, startIndex + itemsPerPage);
                  
                  return paginatedDeliveries.map((delivery) => (
                    <tr key={delivery._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4"><div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm">🚚</div></td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-slate-800">{new Date(delivery.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-400">Ref: {delivery.referenceNo || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{delivery.supplierId?.supplierName || 'Unknown'}</td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-slate-800">{delivery.productId ? delivery.productId.productName : 'Unknown'}</div>
                        <div className="text-xs font-semibold text-amber-600">+ {delivery.quantity} Units added</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-800">₱{delivery.totalCost}</div>
                        <div className="text-xs text-slate-400">@ ₱{delivery.unitCost} / unit</div>
                      </td>
                      <td className="p-4 text-right">
                        <button className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">View</button>
                      </td>
                    </tr>
                  ));
                })()
              ) : (
                <tr><td colSpan="6" className="p-10 text-center text-slate-400 text-sm">No deliveries recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredDeliveries.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil(filteredDeliveries.length / itemsPerPage)}
            itemsPerPage={itemsPerPage}
            totalItems={filteredDeliveries.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        )}
      </div>

      {/* Add Delivery Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Record Stock Received</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Received Product</label>
                <select name="productId" value={formData.productId} onChange={handleChange} className={inputClass} required>
                  {products.map(p => <option key={p._id} value={p._id}>{p.productName} (Stock: {p.quantity})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                  <select name="supplierId" value={formData.supplierId} onChange={handleChange} className={inputClass} required>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.supplierName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reference / OR No.</label>
                  <input type="text" name="referenceNo" value={formData.referenceNo} onChange={handleChange} className={inputClass} placeholder="e.g. INV-2026" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className={inputClass} required placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (₱)</label>
                  <input type="number" name="unitCost" value={formData.unitCost} onChange={handleChange} min="0" step="0.01" className={inputClass} required placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-amber-700 mb-1">Total (₱)</label>
                  <input type="number" name="totalCost" value={formData.totalCost} onChange={handleChange} className={inputClass} required readOnly />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">Save Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
