const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

const mongoose = require('mongoose');

// Record a stock-in or stock-out transaction
exports.recordTransaction = async (req, res) => {
  try {
    const { productId, type, quantity, reason } = req.body;
    const userId = req.user.id; // From auth middleware

    // 1. Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // 2. Validate stock-out quantity to prevent negative inventory
    if (type === 'stock-out' && product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock for this transaction' });
    }

    // 3. Update the product quantity
    if (type === 'stock-in') {
      product.quantity += Number(quantity);
    } else if (type === 'stock-out') {
      product.quantity -= Number(quantity);
    }
    await product.save();

    // 4. Record the transaction
    const transaction = new InventoryTransaction({
      productId,
      type,
      quantity,
      reason,
      recordedBy: userId
    });
    await transaction.save();

    // 5. Save an Audit Log
    const auditLog = new AuditLog({
      userId,
      action: `Recorded ${type} of ${quantity} for product ${product.productName}`,
      module: 'Inventory'
    });
    await auditLog.save();

    res.status(201).json({ message: 'Inventory transaction recorded successfully', transaction, productQuantity: product.quantity });
  } catch (error) {
    res.status(500).json({ message: 'Error recording transaction', error: error.message });
  }
};

// Get movement history for a product
exports.getProductHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const [sales, deliveries, spoilages, transactions, product] = await Promise.all([
      require('../models/Sale').find({ 'items.productId': productId }).populate('recordedBy', 'fullName').lean(),
      require('../models/Delivery').find({ productId }).populate('supplierId', 'supplierName').lean(),
      require('../models/Spoilage').find({ productId }).populate('reportedBy', 'fullName').lean(),
      require('../models/InventoryTransaction').find({ productId }).populate('recordedBy', 'fullName').lean(),
      require('../models/Product').findById(productId).lean()
    ]);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    let history = [];

    sales.forEach(sale => {
      const item = sale.items.find(i => i.productId.toString() === productId);
      if (item) {
        history.push({
          _id: sale._id,
          date: sale.createdAt,
          type: 'Sale',
          change: -item.quantity,
          recordedBy: sale.recordedBy ? sale.recordedBy.fullName : 'System',
          notes: `Sale ID: ${sale._id}`
        });
      }
    });

    deliveries.forEach(del => {
      history.push({
        _id: del._id,
        date: del.createdAt,
        type: 'Delivery',
        change: del.quantity,
        recordedBy: 'System',
        notes: `Supplier: ${del.supplierId ? del.supplierId.supplierName : 'Unknown'} (Ref: ${del.referenceNo || 'N/A'})`
      });
    });

    spoilages.forEach(sp => {
      history.push({
        _id: sp._id,
        date: sp.createdAt,
        type: 'Spoilage',
        change: -sp.quantity,
        recordedBy: sp.reportedBy ? sp.reportedBy.fullName : 'System',
        notes: `Reason: ${sp.reason}`
      });
    });

    transactions.forEach(tr => {
      history.push({
        _id: tr._id,
        date: tr.createdAt,
        type: 'Adjustment',
        change: tr.type === 'stock-in' ? tr.quantity : -tr.quantity,
        recordedBy: tr.recordedBy ? tr.recordedBy.fullName : 'System',
        notes: tr.reason || (tr.type === 'stock-in' ? 'Manual Stock In' : 'Manual Stock Out')
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    let currentStock = product.quantity;
    
    history = history.map(record => {
      const stockAfter = currentStock;
      const stockBefore = stockAfter - record.change;
      currentStock = stockBefore;

      return {
        ...record,
        stockBefore,
        stockAfter
      };
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};