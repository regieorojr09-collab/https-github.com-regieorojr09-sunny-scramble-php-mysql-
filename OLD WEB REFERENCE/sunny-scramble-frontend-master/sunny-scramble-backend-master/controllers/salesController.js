const Sale = require('../models/Sale');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const AuditLog = require('../models/AuditLog');

const mongoose = require('mongoose');

// Record a new sale
exports.recordSale = async (req, res) => {
  try {
    const { items, totalAmount, subtotalAmount, taxAmount, customerId } = req.body;
    const userId = req.user.id;

    // 1. Pre-check all inventory levels before processing
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.productName}` });
      }
    }

    // 2. Create the Sale record
    const newSale = new Sale({
      items,
      subtotalAmount,
      taxAmount,
      totalAmount,
      customerId,
      recordedBy: userId
    });
    const savedSale = await newSale.save();

    // 3. Deduct inventory and log stock-out transactions
    for (let item of items) {
      const product = await Product.findById(item.productId);
      product.quantity -= Number(item.quantity);
      await product.save();

      const invTrans = new InventoryTransaction({
        productId: item.productId,
        type: 'stock-out',
        quantity: item.quantity,
        reason: 'sold',
        recordedBy: userId
      });
      await invTrans.save();
    }

    // 4. Save an Audit Log
    const auditLog = new AuditLog({
      userId,
      action: `Recorded sale of ₱${totalAmount}`,
      module: 'Sales'
    });
    await auditLog.save();

    res.status(201).json({ message: 'Sale recorded successfully', sale: savedSale });
  } catch (error) {
    res.status(500).json({ message: 'Error recording sale', error: error.message });
  }
};

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('recordedBy', 'fullName')
      .populate('items.productId', 'productName')
      .populate('customerId', 'customerName')
      .sort({ saleDate: -1 });
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales', error: error.message });
  }
};

// Upload receipt image
exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    sale.receiptImage = `data:${req.file.mimetype};base64,${b64}`;
    await sale.save();

    res.status(200).json({ message: 'Receipt uploaded successfully', sale });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading receipt', error: error.message });
  }
};