import { useState, useEffect } from 'react';
import API from '../services/api';
import { jsPDF } from 'jspdf';
import Pagination from './Pagination';

const Transactions = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const { data } = await API.get('/sales');
        setSales(data);
      } catch (err) {
        console.error('Error fetching sales:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  const filteredSales = sales.filter(sale => {
    const saleId = sale._id.toLowerCase();
    const matchesSearch = saleId.includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(sale.saleDate) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(sale.saleDate) <= new Date(endDate + 'T23:59:59');
    }
    return matchesSearch && matchesDate;
  });

  const handleViewReceipt = (sale) => {
    setReceiptData({
      saleId: sale._id.substring(0, 8),
      date: new Date(sale.saleDate).toLocaleString(),
      items: sale.items.map(item => ({
        productName: item.productId ? item.productId.productName : 'Unknown Item',
        quantity: item.quantity,
        price: item.price || 0
      })),
      total: sale.totalAmount
    });
    setShowReceiptModal(true);
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
      let name = item.productName;
      if (name.length > 20) name = name.substring(0, 17) + "...";
      doc.text(name, 5, y);
      doc.text(item.quantity.toString(), 55, y, { align: "center" });
      doc.text((item.price * item.quantity).toFixed(2), 75, y, { align: "right" });
      y += 5;
    });
    
    doc.text("----------------------------------------", 40, y, { align: "center" });
    y += 5;
    
    doc.setFont("courier", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(`P ${receiptData.total.toFixed(2)}`, 75, y, { align: "right" });
    
    y += 10;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for your purchase!", 40, y, { align: "center" });

    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transaction History</h1>
          <p className="text-sm text-slate-500 mt-1">View previous sales</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 flex-1 flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Date & Time</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Items</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading transactions...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No transactions found.</td></tr>
              ) : (
                (() => {
                  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);
                  
                  return paginatedSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-slate-600 font-medium">
                        {new Date(sale.saleDate).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {sale._id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="p-4 text-slate-600">
                        <ul className="list-disc pl-4 text-xs space-y-1">
                          {sale.items.map((item, idx) => (
                            <li key={idx}>
                              <span className="font-medium text-slate-700">{item.productId ? item.productId.productName : 'Unknown Item'}</span> <span className="text-slate-400">x{item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600 text-base">
                        ₱{sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewReceipt(sale)}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && filteredSales.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil(filteredSales.length / itemsPerPage)}
            itemsPerPage={itemsPerPage}
            totalItems={filteredSales.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        )}
      </div>

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

            <div className="flex justify-between items-center pt-2 pb-6 border-b border-dashed border-slate-300 mb-6">
              <span className="text-base font-bold text-slate-800">Total:</span>
              <span className="text-xl font-bold text-slate-800">₱{receiptData.total.toFixed(2)}</span>
            </div>

            <p className="text-center text-sm text-slate-600 mb-6">Thank you for your purchase!</p>

            <div className="flex gap-3 justify-center items-center">
              <button onClick={() => setShowReceiptModal(false)} className="px-5 py-2.5 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors">Close</button>
              <button onClick={handlePrintReceipt} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-amber-500 hover:bg-amber-600 transition-colors flex items-center gap-2">
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

export default Transactions;
