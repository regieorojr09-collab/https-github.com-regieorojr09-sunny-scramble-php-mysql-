const Spoilage = require('../models/Spoilage');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

const getSpoilages = async (req, res) => {
  try {
    const spoilages = await Spoilage.find()
      .populate('productId', 'productName unitCost')
      .populate('reportedBy', 'fullName')
      .lean();

    const InventoryTransaction = require('../models/InventoryTransaction');
    const transactions = await InventoryTransaction.find({
      reason: { $nin: ['sold', 'delivery'] }
    })
      .populate('productId', 'productName unitCost')
      .populate('recordedBy', 'fullName')
      .lean();

    const mappedTransactions = transactions.map(t => {
      // Calculate cost if available
      const unitCost = t.productId ? (t.productId.unitCost || 0) : 0;
      const totalCost = unitCost * t.quantity;
      
      return {
        _id: t._id,
        productId: t.productId,
        quantity: t.quantity,
        reason: t.reason,
        cost: t.type === 'stock-in' ? 0 : totalCost,
        notes: t.type === 'stock-in' ? 'Manual Stock In' : 'Manual Stock Out',
        reportedBy: t.recordedBy,
        createdAt: t.createdAt,
        type: t.type
      };
    });

    const combined = [...spoilages, ...mappedTransactions].sort((a, b) => b.createdAt - a.createdAt);

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching spoilage records' });
  }
};

const recordSpoilage = async (req, res) => {
  try {
    const { productId, quantity, reason, notes } = req.body;
    
    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Not enough stock to mark as spoiled' });
    }

    const unitCost = product.unitCost || 0;
    const cost = unitCost * quantity;

    const spoilage = new Spoilage({
      productId,
      quantity,
      reason,
      cost,
      notes,
      reportedBy: req.user?.id
    });

    await spoilage.save();

    // Deduct stock
    product.quantity -= quantity;
    await product.save();

    // Log action
    if (req.user) {
      const auditLog = new AuditLog({
        userId: req.user.id,
        action: `Recorded spoilage: ${quantity} units of ${product.productName} (${reason})`,
        module: 'Inventory'
      });
      await auditLog.save();
    }

    res.status(201).json({ message: 'Spoilage recorded successfully', spoilage });
  } catch (error) {
    res.status(500).json({ message: 'Error recording spoilage', error: error.message });
  }
};

module.exports = {
  getSpoilages,
  recordSpoilage
};
