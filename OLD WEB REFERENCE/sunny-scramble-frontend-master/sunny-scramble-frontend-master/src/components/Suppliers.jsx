import { useState, useEffect } from 'react';
import API from '../services/api';
import Pagination from './Pagination';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    supplierName: '',
    contact: '',
    address: '',
    contactPerson: '',
    email: '',
    paymentTerms: ['COD'],
    otherPaymentTerm: '',
    status: 'active',
    notes: ''
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/suppliers');
      setSuppliers(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      
      const termsArray = (supplier.paymentTerms || '').split(',').map(t => t.trim()).filter(Boolean);
      let pt = [];
      let ot = '';
      
      termsArray.forEach(t => {
        if (['COD', 'CARD'].includes(t)) {
          pt.push(t);
        } else {
          pt.push('OTHERS');
          ot = t;
        }
      });
      if (pt.length === 0) pt = ['COD'];

      setFormData({
        supplierName: supplier.supplierName,
        contact: supplier.contact,
        address: supplier.address,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        paymentTerms: pt,
        otherPaymentTerm: ot,
        status: supplier.status || 'active',
        notes: supplier.notes || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        supplierName: '',
        contact: '',
        address: '',
        contactPerson: '',
        email: '',
        paymentTerms: ['COD'],
        otherPaymentTerm: '',
        status: 'active',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      let terms = [...formData.paymentTerms];
      if (terms.includes('OTHERS')) {
        terms = terms.filter(t => t !== 'OTHERS');
        if (formData.otherPaymentTerm.trim()) {
          terms.push(formData.otherPaymentTerm.trim());
        }
      }
      submitData.paymentTerms = terms.join(', ');

      if (editingSupplier) {
        await API.put(`/suppliers/${editingSupplier._id}`, submitData);
        setMessage('Supplier updated successfully');
      } else {
        await API.post('/suppliers', submitData);
        setMessage('Supplier added successfully');
      }
      setShowModal(false);
      fetchSuppliers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving supplier');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this supplier?')) return;
    try {
      await API.delete(`/suppliers/${id}`);
      setMessage('Supplier deactivated successfully');
      fetchSuppliers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting supplier');
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900";

  return (
    <div className="max-w-7xl mx-auto">
      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your vendors and suppliers</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Contact Person</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Terms</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-10 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-8 h-8 text-amber-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-medium text-sm">Loading suppliers...</p>
                  </div>
                </td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center text-slate-500 font-medium">No suppliers found.</td></tr>
              ) : (
                (() => {
                  const totalPages = Math.ceil(suppliers.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginatedSuppliers = suppliers.slice(startIndex, startIndex + itemsPerPage);
                  
                  return paginatedSuppliers.map((supplier) => (
                    <tr key={supplier._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-800">{supplier.supplierName}</td>
                      <td className="p-4 text-sm text-slate-600">{supplier.contactPerson || '-'}</td>
                      <td className="p-4 text-sm text-slate-600">{supplier.contact}</td>
                      <td className="p-4 text-sm text-slate-600">{supplier.paymentTerms}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${supplier.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'} uppercase tracking-wider`}>
                          {supplier.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-3 items-center">
                        <button onClick={() => openModal(supplier)} className="text-xs font-medium text-blue-500 hover:text-blue-700 hover:underline">Edit</button>
                        {supplier.status === 'active' && (
                          <button onClick={() => handleDelete(supplier._id)} className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline">Disable</button>
                        )}
                      </td>
                    </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && suppliers.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil(suppliers.length / itemsPerPage)}
            itemsPerPage={itemsPerPage}
            totalItems={suppliers.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} required className={inputClass} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="text" name="contact" value={formData.contact} onChange={handleInputChange} required className={inputClass} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputClass} />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} required rows="2" className={`${inputClass} resize-none`} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms</label>
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-medium">
                      <input 
                        type="checkbox" 
                        checked={formData.paymentTerms.includes('COD')} 
                        onChange={(e) => {
                          const newTerms = e.target.checked 
                            ? [...formData.paymentTerms, 'COD'] 
                            : formData.paymentTerms.filter(t => t !== 'COD');
                          setFormData({ ...formData, paymentTerms: newTerms });
                        }}
                        className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 accent-amber-500"
                      />
                      COD
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-medium">
                      <input 
                        type="checkbox" 
                        checked={formData.paymentTerms.includes('CARD')} 
                        onChange={(e) => {
                          const newTerms = e.target.checked 
                            ? [...formData.paymentTerms, 'CARD'] 
                            : formData.paymentTerms.filter(t => t !== 'CARD');
                          setFormData({ ...formData, paymentTerms: newTerms });
                        }}
                        className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 accent-amber-500"
                      />
                      CARD
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-medium">
                      <input 
                        type="checkbox" 
                        checked={formData.paymentTerms.includes('OTHERS')} 
                        onChange={(e) => {
                          const newTerms = e.target.checked 
                            ? [...formData.paymentTerms, 'OTHERS'] 
                            : formData.paymentTerms.filter(t => t !== 'OTHERS');
                          setFormData({ ...formData, paymentTerms: newTerms, otherPaymentTerm: e.target.checked ? formData.otherPaymentTerm : '' });
                        }}
                        className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 accent-amber-500"
                      />
                      OTHERS (Please specify)
                    </label>
                    
                    {formData.paymentTerms.includes('OTHERS') && (
                      <input 
                        type="text" 
                        value={formData.otherPaymentTerm}
                        onChange={(e) => setFormData({ ...formData, otherPaymentTerm: e.target.value })}
                        placeholder="Specify term..."
                        required
                        className="ml-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900 w-full sm:w-auto flex-1"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className={inputClass}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
                  <input type="text" name="notes" value={formData.notes} onChange={handleInputChange} className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors">
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
