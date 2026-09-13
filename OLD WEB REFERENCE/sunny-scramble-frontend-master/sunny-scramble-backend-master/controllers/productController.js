const Product = require('../models/Product');

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { productName, category, unitCost, sellingPrice, expirationDate, maxCapacity } = req.body;
    let { imageUrl } = req.body;

    // If a file was uploaded, convert it to base64
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      imageUrl = `data:${req.file.mimetype};base64,${b64}`;
    }
    
    const newProduct = new Product({
      productName,
      category,
      unitCost,
      sellingPrice,
      expirationDate: expirationDate || undefined,
      maxCapacity: maxCapacity || 100,
      imageUrl,
      quantity: 0 // Default starting quantity
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

// Update a product (e.g., price changes)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Validation: Prevent archiving if stock > 0
    if (updateData.status === 'archived') {
      const existingProduct = await Product.findById(id);
      if (existingProduct && existingProduct.quantity > 0) {
        return res.status(400).json({ message: 'Cannot archive product. Stock must be zero.' });
      }
    }

    // If a new file was uploaded, convert it to base64
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      updateData.imageUrl = `data:${req.file.mimetype};base64,${b64}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};