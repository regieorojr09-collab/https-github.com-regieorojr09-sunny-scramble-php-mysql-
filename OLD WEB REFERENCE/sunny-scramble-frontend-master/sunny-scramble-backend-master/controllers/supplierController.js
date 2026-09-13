const Supplier = require('../models/Supplier');
const Delivery = require('../models/Delivery');

const getSuppliers = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.supplierName = { $regex: req.query.search, $options: 'i' };
    }
    const suppliers = await Supplier.find(query).sort({ supplierName: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching suppliers' });
  }
};

const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    
    // Optional: Fetch recent deliveries for this supplier
    const recentDeliveries = await Delivery.find({ supplierId: supplier._id })
      .populate('productId')
      .sort({ createdAt: -1 })
      .limit(10);
      
    res.json({ supplier, recentDeliveries });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching supplier' });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { supplierName, contact, address, contactPerson, email, paymentTerms, notes } = req.body;
    
    if (!supplierName || !contact) {
      return res.status(400).json({ message: 'Supplier name and contact are required' });
    }

    const supplier = new Supplier({
      supplierName,
      contact,
      address,
      contactPerson,
      email,
      paymentTerms,
      notes,
      createdBy: req.user.id
    });
    
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating supplier' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating supplier' });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    // Soft delete by setting status to inactive
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier marked as inactive', supplier });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting supplier' });
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
