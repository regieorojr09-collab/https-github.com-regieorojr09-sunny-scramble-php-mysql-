import { useState, useEffect } from 'react';
import API from '../services/api';
import Pagination from './Pagination';

const Inventory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [productForm, setProductForm] = useState({ productName: '', category: 'Chicken', unitCost: '', sellingPrice: '', expirationDate: '', maxCapacity: 100, imageUrl: '', imageFile: null });
  const [editForm, setEditForm] = useState({ id: '', productName: '', category: '', unitCost: '', sellingPrice: '', expirationDate: '', maxCapacity: 100, imageUrl: '', imageFile: null, status: 'active', quantity: 0 });
  const [adjustForm, setAdjustForm] = useState({ productId: '', productName: '', currentQty: 0, type: 'stock-out', quantity: '', reason: 'Damage / Spoilage' });
  const [historyData, setHistoryData] = useState([]);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);

  const [config, setConfig] = useState({ lowStockThreshold: 20 });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, confRes] = await Promise.all([
        API.get('/products'),
        API.get('/config')
      ]);
      setProducts(prodRes.data);
      if (confRes.data) setConfig(confRes.data);
    } catch { setError('Failed to fetch data'); }
    setIsLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      let dataToSend = productForm;
      if (productForm.imageFile) {
        const formData = new FormData();
        formData.append('productName', productForm.productName);
        formData.append('category', productForm.category);
        formData.append('unitCost', productForm.unitCost);
        formData.append('sellingPrice', productForm.sellingPrice);
        if (productForm.expirationDate) formData.append('expirationDate', productForm.expirationDate);
        if (productForm.maxCapacity) formData.append('maxCapacity', productForm.maxCapacity);
        if (productForm.imageUrl) formData.append('imageUrl', productForm.imageUrl);
        formData.append('image', productForm.imageFile);
        dataToSend = formData;
      }
      await API.post('/products', dataToSend);
      setShowAddModal(false);
      setProductForm({ productName: '', category: 'Chicken', unitCost: '', sellingPrice: '', expirationDate: '', maxCapacity: 100, imageUrl: '', imageFile: null });
      setMessage('Product added successfully.');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Failed to add product.'); }
  };

  const openEditModal = (product) => {
    setEditForm({ 
      id: product._id, 
      productName: product.productName, 
      category: product.category, 
      unitCost: product.unitCost, 
      sellingPrice: product.sellingPrice, 
      expirationDate: product.expirationDate ? new Date(product.expirationDate).toISOString().split('T')[0] : '',
      maxCapacity: product.maxCapacity || 100,
      imageUrl: product.imageUrl || '',
      status: product.status || 'active',
      quantity: product.quantity || 0
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      let dataToSend = editForm;
      if (editForm.imageFile) {
        const formData = new FormData();
        formData.append('productName', editForm.productName);
        formData.append('category', editForm.category);
        formData.append('unitCost', editForm.unitCost);
        formData.append('sellingPrice', editForm.sellingPrice);
        formData.append('status', editForm.status);
        if (editForm.expirationDate) formData.append('expirationDate', editForm.expirationDate);
        if (editForm.maxCapacity) formData.append('maxCapacity', editForm.maxCapacity);
        if (editForm.imageUrl) formData.append('imageUrl', editForm.imageUrl);
        formData.append('image', editForm.imageFile);
        dataToSend = formData;
      }
      await API.put(`/products/${editForm.id}`, dataToSend);
      setShowEditModal(false);
      setMessage('Product updated successfully.');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Failed to update product.'); }
  };

  const openAdjustModal = (product) => {
    setAdjustForm({ productId: product._id, productName: product.productName, currentQty: product.quantity, type: 'stock-out', quantity: '', reason: '' });
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/inventory', {
        productId: adjustForm.productId,
        type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        reason: `[Adjustment] ${adjustForm.reason}`
      });
      setShowAdjustModal(false);
      setMessage(`Stock adjusted for ${adjustForm.productName}.`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Failed to record adjustment.'); }
  };

  const openHistoryModal = async (product) => {
    try {
      setSelectedProductForHistory(product);
      setHistoryCurrentPage(1);
      setShowHistoryModal(true);
      const res = await API.get(`/inventory/${product._id}/history`);
      setHistoryData(res.data);
    } catch {
      setError('Failed to fetch product history.');
      setShowHistoryModal(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = p.status !== 'archived';
    else if (statusFilter === 'archived') matchesStatus = p.status === 'archived';
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900";
  const selectClass = "px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900";

  return (
    <div className="max-w-7xl mx-auto">
      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Inventory Master List</h1>
              <p className="text-xs text-slate-500">Manage products and manual stock adjustments</p>
            </div>
          </div>
          <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Search catalog..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className={`${inputClass} flex-1`} />
          <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className={selectClass}>
            <option value="">All Categories</option>
            <option value="Chicken">Chicken</option>
            <option value="Egg">Egg</option>
            <option value="Condiments">Condiments</option>
            <option value="Pantry Staples">Pantry Staples</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={selectClass}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-12">Img</th><th className="p-4">Product Name</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Exp. Date</th>
                <th className="p-4 w-52">Stock Level</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-8 h-8 text-amber-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="font-medium text-sm">Loading inventory items...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-500 font-medium">No products found.</td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                const capacity = product.maxCapacity || 100;
                const stockPct = Math.min((product.quantity / capacity) * 100, 100);
                const threshold = config.lowStockThreshold || 20;
                
                let stockColorClass = 'bg-emerald-500';
                if (stockPct <= threshold) {
                  stockColorClass = 'bg-red-500';
                } else if (stockPct <= 50) {
                  stockColorClass = 'bg-amber-500';
                }

                return (
                  <tr key={product._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      {product.imageUrl ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden"><img src={product.imageUrl} alt="" className="w-full h-full object-cover" /></div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm">📦</div>
                      )}
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-800">{product.productName}</td>
                    <td className="p-4 text-sm text-slate-600">{product.category}</td>
                    <td className="p-4 text-sm font-semibold text-slate-800">₱{product.sellingPrice}</td>
                    <td className="p-4 text-sm font-medium text-slate-600">
                      {product.expirationDate ? (
                        <span className={new Date(product.expirationDate) < new Date(new Date().setDate(new Date().getDate() + 7)) ? 'text-rose-600 font-bold' : ''}>
                          {new Date(product.expirationDate).toLocaleDateString()}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold">{product.quantity} <span className="text-slate-400 font-normal">/ {capacity}</span></span>
                        <span className="text-slate-400">{Math.round(stockPct)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${stockColorClass}`} style={{ width: `${stockPct}%` }} />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {product.status === 'archived' ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Archived</span>
                      ) : (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          product.quantity > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>{product.quantity > 0 ? 'Active' : 'Out of Stock'}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openHistoryModal(product)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="View History">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <button onClick={() => openAdjustModal(product)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">Adjust</button>
                        <button onClick={() => openEditModal(product)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredProducts.length}
          startIndex={startIndex}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        />
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <input type="text" name="productName" value={productForm.productName} onChange={(e) => setProductForm({...productForm, productName: e.target.value})} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select name="category" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className={selectClass + " w-full"}>
                  <option value="Chicken">Chicken</option><option value="Egg">Egg</option><option value="Condiments">Condiments</option><option value="Pantry Staples">Pantry Staples</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
                  <input type="date" name="expirationDate" value={productForm.expirationDate} onChange={(e) => setProductForm({...productForm, expirationDate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Capacity (for % calc)</label>
                  <input type="number" name="maxCapacity" value={productForm.maxCapacity} onChange={(e) => setProductForm({...productForm, maxCapacity: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (Optional)</label>
                  <input type="text" name="imageUrl" value={productForm.imageUrl} onChange={(e) => setProductForm({...productForm, imageUrl: e.target.value})} className={inputClass} placeholder="https://example.com/image.jpg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Or Upload File (Max 5MB)</label>
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => setProductForm({...productForm, imageFile: e.target.files[0]})} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (₱)</label>
                  <input type="number" name="unitCost" value={productForm.unitCost} onChange={(e) => setProductForm({...productForm, unitCost: e.target.value})} className={inputClass} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₱)</label>
                  <input type="number" name="sellingPrice" value={productForm.sellingPrice} onChange={(e) => setProductForm({...productForm, sellingPrice: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Edit Product</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <input type="text" name="productName" value={editForm.productName} onChange={(e) => setEditForm({...editForm, productName: e.target.value})} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select name="category" value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className={selectClass + " w-full"}>
                  <option value="Chicken">Chicken</option><option value="Egg">Egg</option><option value="Condiments">Condiments</option><option value="Pantry Staples">Pantry Staples</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
                  <input type="date" name="expirationDate" value={editForm.expirationDate} onChange={(e) => setEditForm({...editForm, expirationDate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Capacity (for % calc)</label>
                  <input type="number" name="maxCapacity" value={editForm.maxCapacity} onChange={(e) => setEditForm({...editForm, maxCapacity: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (Optional)</label>
                  <input type="text" name="imageUrl" value={editForm.imageUrl} onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})} className={inputClass} placeholder="https://example.com/image.jpg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Or Upload File (Max 5MB)</label>
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => setEditForm({...editForm, imageFile: e.target.files[0]})} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (₱)</label>
                  <input type="number" name="unitCost" value={editForm.unitCost} onChange={(e) => setEditForm({...editForm, unitCost: e.target.value})} className={inputClass} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₱)</label>
                  <input type="number" name="sellingPrice" value={editForm.sellingPrice} onChange={(e) => setEditForm({...editForm, sellingPrice: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select name="status" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})} className={selectClass + " w-full"}>
                    <option value="active">Active</option>
                    <option value="archived" disabled={editForm.quantity > 0}>Archived {editForm.quantity > 0 ? '(Requires 0 stock)' : ''}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Adjust Stock: <span className="text-blue-600">{adjustForm.productName}</span>
              </h2>
              <p className="text-sm text-slate-600 mt-3">Current Stock: <span className="font-bold text-slate-800">{adjustForm.currentQty}</span></p>
            </div>
            
            <form onSubmit={handleAdjustSubmit} className="space-y-5">
              {/* Type Toggle */}
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setAdjustForm({ ...adjustForm, type: 'stock-out' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${
                    adjustForm.type === 'stock-out' ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" /></svg>
                  Decrease
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustForm({ ...adjustForm, type: 'stock-in' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${
                    adjustForm.type === 'stock-in' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                  Increase
                </button>
              </div>

              {/* Quantity */}
              <div className="relative mt-2">
                <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs font-semibold text-blue-600">Quantity to Adjust</label>
                <input 
                  type="number" 
                  min="1" 
                  value={adjustForm.quantity} 
                  onChange={(e) => setAdjustForm({...adjustForm, quantity: e.target.value})} 
                  className="w-full px-4 py-3.5 border-2 border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-white text-slate-900 font-medium" 
                  required 
                />
              </div>

              {/* Reason */}
              <div>
                <textarea 
                  value={adjustForm.reason} 
                  onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 resize-none h-24" 
                  placeholder="Reason for Adjustment"
                  required 
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2 justify-end items-center">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="px-5 py-2.5 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" className={`px-5 py-2.5 rounded-lg text-white font-bold text-sm flex items-center gap-2 transition-colors ${adjustForm.type === 'stock-out' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {adjustForm.type === 'stock-out' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                  )}
                  Submit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-800">
                Movement History: <span className="text-blue-600">{selectedProductForHistory?.productName}</span>
              </h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-center">Change</th>
                    <th className="p-4 text-center">Stock Before</th>
                    <th className="p-4 text-center">Stock After</th>
                    <th className="p-4">Recorded By</th>
                    <th className="p-4">Notes / Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.length > 0 ? (
                    (() => {
                      const historyTotalPages = Math.ceil(historyData.length / historyItemsPerPage);
                      const historyStartIndex = (historyCurrentPage - 1) * historyItemsPerPage;
                      const paginatedHistory = historyData.slice(historyStartIndex, historyStartIndex + historyItemsPerPage);
                      return paginatedHistory.map((record) => (
                        <tr key={record._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(record.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              record.type === 'Delivery' ? 'bg-emerald-100 text-emerald-700' :
                              record.type === 'Sale' ? 'bg-blue-100 text-blue-700' :
                              record.type === 'Spoilage' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {record.type}
                            </span>
                          </td>
                          <td className={`p-4 text-sm font-bold text-center ${record.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {record.change > 0 ? '+' : ''}{record.change}
                          </td>
                          <td className="p-4 text-sm text-center text-slate-500">{record.stockBefore}</td>
                          <td className="p-4 text-sm font-bold text-center text-slate-800">{record.stockAfter}</td>
                          <td className="p-4 text-sm text-slate-600">{record.recordedBy}</td>
                          <td className="p-4 text-xs text-slate-500 truncate max-w-[200px]" title={record.notes}>
                            {record.notes}
                          </td>
                        </tr>
                      ));
                    })()
                  ) : (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-500">No movement history found for this product.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {historyData.length > 0 && (
              <Pagination 
                currentPage={historyCurrentPage}
                totalPages={Math.ceil(historyData.length / historyItemsPerPage)}
                itemsPerPage={historyItemsPerPage}
                totalItems={historyData.length}
                startIndex={(historyCurrentPage - 1) * historyItemsPerPage}
                onPageChange={setHistoryCurrentPage}
                onItemsPerPageChange={(val) => { setHistoryItemsPerPage(val); setHistoryCurrentPage(1); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
