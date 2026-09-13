import { useState, useEffect } from 'react';
import API from '../services/api';
import { jsPDF } from 'jspdf';

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState('');
  const [taxRate, setTaxRate] = useState(0);

  const fetchData = async () => {
    try {
      const prodRes = await API.get('/products');
      setProducts(prodRes.data.filter(p => p.status !== 'archived'));
      const configRes = await API.get('/config');
      if (configRes.data && configRes.data.taxRate) {
        setTaxRate(configRes.data.taxRate);
      }
    } catch { setError('Failed to fetch data'); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const handleAddToCart = (product) => {
    setError(''); setMessage('');
    if (product.quantity <= 0) return setError(`${product.productName} is out of stock.`);
    const existing = cart.find(item => item.productId === product._id);
    if (existing) {
      if (existing.quantity + 1 > product.quantity) return setError(`Not enough stock for ${product.productName}.`);
      setCart(cart.map(item => item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: product._id, productName: product.productName, price: product.sellingPrice, quantity: 1, stock: product.quantity, imageUrl: product.imageUrl, category: product.category }]);
    }
  };

  const updateCartQty = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        if (newQty > item.stock) { setError(`Only ${item.stock} in stock.`); return item; }
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveFromCart = (productId) => setCart(cart.filter(item => item.productId !== productId));
  const subtotalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const taxAmount = subtotalAmount * (taxRate / 100);
  const totalAmount = subtotalAmount + taxAmount;

  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    try {
      const payload = {
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity, price: item.price })),
        subtotalAmount,
        taxAmount,
        totalAmount
      };

      const res = await API.post('/sales', payload);
      
      setReceiptData({
        saleId: res.data.sale._id.substring(0, 8),
        date: new Date(res.data.sale.saleDate).toLocaleString(),
        items: [...cart],
        subtotalAmount,
        taxAmount,
        taxRate,
        total: totalAmount
      });
      
      setCart([]);
      setShowConfirmModal(false);
      setShowReceiptModal(true);
      fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed to record sale.'); setShowConfirmModal(false); }
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    
    // Receipt width 80mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    // Center text at X=40
    doc.text("Sunny & Scramble", 40, 15, { align: "center" });
    
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text("Official Receipt", 40, 20, { align: "center" });
    
    doc.text("----------------------------------------", 40, 25, { align: "center" });
    
    doc.setFontSize(9);
    doc.text(`Sale ID: ${receiptData.saleId}`, 5, 30);
    doc.text(`Date: ${receiptData.date}`, 5, 35);
    doc.text(`Cashier: Demo Admin`, 5, 40);
    
    doc.text("----------------------------------------", 40, 45, { align: "center" });
    
    doc.setFont("courier", "bold");
    doc.text("Item", 5, 50);
    doc.text("Qty", 55, 50, { align: "center" });
    doc.text("Total", 75, 50, { align: "right" });
    
    doc.setFont("courier", "normal");
    let y = 55;
    receiptData.items.forEach(item => {
      // truncate product name
      let name = item.productName;
      if (name.length > 20) name = name.substring(0, 17) + "...";
      doc.text(name, 5, y);
      doc.text(item.quantity.toString(), 55, y, { align: "center" });
      doc.text((item.price * item.quantity).toFixed(2), 75, y, { align: "right" });
      y += 5;
    });
    
    doc.text("----------------------------------------", 40, y, { align: "center" });
    y += 5;
    
    if (receiptData.taxAmount > 0) {
      doc.setFont("courier", "normal");
      doc.text("SUBTOTAL:", 5, y);
      doc.text(`P ${receiptData.subtotalAmount.toFixed(2)}`, 75, y, { align: "right" });
      y += 5;
      doc.text(`TAX (${receiptData.taxRate}%):`, 5, y);
      doc.text(`P ${receiptData.taxAmount.toFixed(2)}`, 75, y, { align: "right" });
      y += 5;
    }

    doc.setFont("courier", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(`P ${receiptData.total.toFixed(2)}`, 75, y, { align: "right" });
    
    y += 10;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for your purchase!", 40, y, { align: "center" });

    // Output as Blob URL and open in new window
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCat;
  });

  const cats = ['All', 'Chicken', 'Egg', 'Condiments'];

  return (
    <div className="max-w-[1600px] mx-auto h-full">
      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col lg:flex-row h-[calc(100vh-8rem)] overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* Left: Product Catalog */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header / Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <h1 className="text-base font-bold text-slate-800">Product Catalog</h1>
            </div>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-w-[200px]"
            />
            <div className="flex gap-1.5 flex-shrink-0">
              {cats.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    (selectedCategory === cat || (cat === 'All' && !selectedCategory))
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50/50 content-start">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.productId === product._id);
              const cartQty = cartItem ? cartItem.quantity : 0;
              const remainingStock = product.quantity - cartQty;
              const isOutOfStock = remainingStock <= 0;

              return (
              <div key={product._id} onClick={() => !isOutOfStock && handleAddToCart(product)} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col transition-all duration-300 ${isOutOfStock ? 'opacity-75 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-md cursor-pointer'}`}>
                <div className="h-28 rounded-lg mb-3 flex items-center justify-center text-3xl bg-slate-50 overflow-hidden relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-50 grayscale' : ''}`} />
                  ) : (
                    product.category === 'Chicken' ? '🍗' : product.category === 'Egg' ? '🥚' : '📦'
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-[3px] border-red-500 text-red-500 font-extrabold text-sm tracking-widest uppercase px-3 py-1 rotate-[-15deg] bg-white/80 rounded-sm">Out of Stock</div>
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1 truncate">{product.productName}</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-slate-500">Stock: {remainingStock}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{product.category}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                  <span className="text-base font-bold text-amber-600">₱{product.sellingPrice}</span>
                  <button
                    disabled={isOutOfStock}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                      !isOutOfStock
                        ? 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-105'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Right: Cart Info */}
        <div className="w-full lg:w-[380px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col">
          
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              Order Items
              <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
            </h2>
            <button onClick={() => setCart([])} className="text-xs font-medium text-red-500 hover:text-red-700">Clear</button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs mt-1">Click + to add items</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.productId} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex gap-3">
                  {/* Cart Item Image */}
                  <div className="w-12 h-12 rounded-md bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 text-lg">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      item.category === 'Chicken' ? '🍗' : item.category === 'Egg' ? '🥚' : '📦'
                    )}
                  </div>
                  
                  {/* Cart Item Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-semibold text-slate-800 leading-tight pr-2 truncate">{item.productName}</h4>
                      <button onClick={() => handleRemoveFromCart(item.productId)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-blue-600">₱{item.price}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateCartQty(item.productId, -1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold">-</button>
                        <span className="w-5 text-center text-xs font-semibold text-slate-800">{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.productId, 1)} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout */}
          <div className="p-4 border-t border-slate-200 bg-white">
            {taxRate > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtotal</span>
                  <span className="text-sm font-bold text-slate-700">₱{subtotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax ({taxRate}%)</span>
                  <span className="text-sm font-bold text-slate-700">₱{taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-extrabold text-slate-800">₱{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                cart.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
              Complete Sale
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Confirm Action</h2>
            <p className="text-sm text-slate-600 mb-6">Complete sale for a total of <span className="font-bold text-slate-800">₱{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>? This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowConfirmModal(false)} className="px-5 py-2.5 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={handleConfirmSale} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Sunny & Scramble</h2>
              <p className="text-sm text-slate-500">Official Receipt</p>
            </div>
            
            <div className="text-xs text-slate-600 space-y-1 mb-4 pb-4 border-b border-dashed border-slate-300">
              <p><span className="font-bold">Sale ID:</span> {receiptData.saleId}</p>
              <p><span className="font-bold">Date:</span> {receiptData.date}</p>
              <p><span className="font-bold">Cashier:</span> Demo Admin</p>
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-700 font-bold">Item</th>
                  <th className="text-center py-2 text-slate-700 font-bold">Qty</th>
                  <th className="text-right py-2 text-slate-700 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    <td className="py-2 text-slate-600 truncate max-w-[150px]">{item.productName}</td>
                    <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-800 font-medium">{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {receiptData.taxAmount > 0 && (
              <>
                <div className="flex justify-between items-center pt-2 pb-1">
                  <span className="text-sm font-semibold text-slate-600">Subtotal:</span>
                  <span className="text-sm font-semibold text-slate-600">₱{receiptData.subtotalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-sm font-semibold text-slate-600">Tax ({receiptData.taxRate}%):</span>
                  <span className="text-sm font-semibold text-slate-600">₱{receiptData.taxAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-2 pb-6 border-b border-dashed border-slate-300 mb-6">
              <span className="text-base font-bold text-slate-800">Total:</span>
              <span className="text-xl font-bold text-slate-800">₱{receiptData.total.toFixed(2)}</span>
            </div>

            <p className="text-center text-sm text-slate-600 mb-6">Thank you for your purchase!</p>

            <div className="flex gap-3 justify-center items-center">
              <button onClick={() => setShowReceiptModal(false)} className="px-5 py-2.5 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors">Close</button>
              <button onClick={handlePrintReceipt} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
