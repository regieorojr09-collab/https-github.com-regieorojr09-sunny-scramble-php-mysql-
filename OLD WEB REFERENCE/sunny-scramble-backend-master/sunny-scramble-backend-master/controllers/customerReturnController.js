const CustomerReturn = require('../models/CustomerReturn');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

const getCustomerReturns = async (req, res) => {
  try {
    const returns = await CustomerReturn.find()
      .populate('customerId', 'customerName')
      .populate('productId', 'productName')
      .populate('processedBy', 'fullName')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer returns' });
  }
};

const createCustomerReturn = async (req, res) => {
  try {
    const { customerId, productId, quantity, reason, action, amountRefunded, notes } = req.body;
    
    if (!customerId || !productId || !quantity || !reason || !action) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const customerReturn = new CustomerReturn({
      customerId,
      productId,
      quantity,
      reason,
      action,
      amountRefunded: amountRefunded || 0,
      notes,
      processedBy: req.user?.id
    });

    await customerReturn.save();

    // If Replaced, deduct stock
    if (action === 'Replaced') {
      if (product.quantity < quantity) {
        return res.status(400).json({ message: 'Not enough stock to replace item' });
      }
      product.quantity -= quantity;
      await product.save();
    }
    // If Refunded, we might not add it back to stock if it's defective, usually we don't.
    // If it's returning good stock, we could add it back, but let's keep it simple for now.

    if (req.user) {
      const auditLog = new AuditLog({
        userId: req.user.id,
        action: `Processed Customer Return: ${quantity} units of ${product.productName} (${action})`,
        module: 'Returns'
      });
      await auditLog.save();
    }

    res.status(201).json({ message: 'Return processed successfully', customerReturn });
  } catch (error) {
    res.status(500).json({ message: 'Error processing return', error: error.message });
  }
};

module.exports = {
  getCustomerReturns,
  createCustomerReturn
};
