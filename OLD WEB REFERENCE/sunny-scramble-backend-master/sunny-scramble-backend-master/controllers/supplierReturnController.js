const SupplierReturn = require('../models/SupplierReturn');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

const getSupplierReturns = async (req, res) => {
  try {
    const returns = await SupplierReturn.find()
      .populate('supplierId', 'supplierName')
      .populate('productId', 'productName')
      .populate('processedBy', 'fullName')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supplier returns' });
  }
};

const createSupplierReturn = async (req, res) => {
  try {
    const { supplierId, productId, quantity, reason, action, amountRefunded, notes } = req.body;
    
    if (!supplierId || !productId || !quantity || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Cannot return more than current stock' });
    }

    const supplierReturn = new SupplierReturn({
      supplierId,
      productId,
      quantity,
      reason,
      action: action || 'Pending',
      amountRefunded: amountRefunded || 0,
      notes,
      processedBy: req.user?.id
    });

    await supplierReturn.save();

    // Deduct stock being returned to supplier
    product.quantity -= quantity;
    await product.save();

    if (req.user) {
      const auditLog = new AuditLog({
        userId: req.user.id,
        action: `Processed RTS: ${quantity} units of ${product.productName} to Supplier`,
        module: 'Returns'
      });
      await auditLog.save();
    }

    res.status(201).json({ message: 'Return to supplier processed successfully', supplierReturn });
  } catch (error) {
    res.status(500).json({ message: 'Error processing return to supplier', error: error.message });
  }
};

const updateSupplierReturnStatus = async (req, res) => {
  try {
    const { action } = req.body;
    const sReturn = await SupplierReturn.findById(req.params.id);
    
    if (!sReturn) return res.status(404).json({ message: 'Return not found' });
    
    sReturn.action = action;
    await sReturn.save();

    if (req.user) {
      const auditLog = new AuditLog({
        userId: req.user.id,
        action: `Updated RTS ${sReturn._id} status to ${action}`,
        module: 'Returns'
      });
      await auditLog.save();
    }

    res.json({ message: 'RTS status updated', supplierReturn: sReturn });
  } catch (error) {
    res.status(500).json({ message: 'Error updating RTS status', error: error.message });
  }
};

module.exports = {
  getSupplierReturns,
  createSupplierReturn,
  updateSupplierReturnStatus
};
