require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const itemsToSeed = [
  // Chicken items
  { productName: 'Breast Choice cuts 2pcs (approx. 480g)', category: 'Chicken', sellingPrice: 101.00, unitCost: 80.00, quantity: 20 },
  { productName: 'Thigh Choice cuts 4pcs (approx. 720g)', category: 'Chicken', sellingPrice: 152.00, unitCost: 120.00, quantity: 20 },
  { productName: 'Chicken Inasal 2 x 250g', category: 'Chicken', sellingPrice: 167.00, unitCost: 130.00, quantity: 20 },
  { productName: 'Drumstick Choice cuts 6pcs (approx. 540g)', category: 'Chicken', sellingPrice: 114.00, unitCost: 90.00, quantity: 20 },
  { productName: 'Fresh Whole Chicken (Approx 1.29kg)', category: 'Chicken', sellingPrice: 242.00, unitCost: 190.00, quantity: 20 },
  { productName: 'Chicken Adobo Flakes 300g', category: 'Chicken', sellingPrice: 178.00, unitCost: 140.00, quantity: 20 },
  { productName: 'Chicken Hamonado Longganisa 300g', category: 'Chicken', sellingPrice: 201.00, unitCost: 160.00, quantity: 20 },
  { productName: 'Chicken Embutido 300g', category: 'Chicken', sellingPrice: 224.00, unitCost: 180.00, quantity: 20 },
  { productName: 'Wings Choice cuts 5pcs (approx. 630g)', category: 'Chicken', sellingPrice: 133.00, unitCost: 100.00, quantity: 20 },
  { productName: 'Chicken Vigan Longganisa 300g', category: 'Chicken', sellingPrice: 224.00, unitCost: 180.00, quantity: 20 },
  { productName: 'Spicy Chicken Wings 500g', category: 'Chicken', sellingPrice: 145.00, unitCost: 110.00, quantity: 20 },
  { productName: 'Garlic Marinated Chicken 440g', category: 'Chicken', sellingPrice: 135.00, unitCost: 100.00, quantity: 20 },
  { productName: 'Fresh Spring Chicken (Approx 900g)', category: 'Chicken', sellingPrice: 169.00, unitCost: 130.00, quantity: 20 },
  { productName: 'Whole Chicken Twin Pack (Approx 1.3kg)', category: 'Chicken', sellingPrice: 282.00, unitCost: 230.00, quantity: 20 },
  { productName: 'Chicken Barbecue Cut-ups 600g', category: 'Chicken', sellingPrice: 172.00, unitCost: 140.00, quantity: 20 },
  { productName: 'Chicken Tocino 350g', category: 'Chicken', sellingPrice: 167.00, unitCost: 130.00, quantity: 20 },

  // Egg items
  { productName: 'White Eggs - Small (12s)', category: 'Egg', sellingPrice: 115.00, unitCost: 90.00, quantity: 30 },
  { productName: 'White Eggs - Medium (12s)', category: 'Egg', sellingPrice: 120.00, unitCost: 95.00, quantity: 30 },
  { productName: 'White Eggs - Large (12s)', category: 'Egg', sellingPrice: 126.00, unitCost: 100.00, quantity: 30 },
  { productName: 'White Eggs - XL (12s)', category: 'Egg', sellingPrice: 132.00, unitCost: 105.00, quantity: 30 },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sunny_scramble');
    console.log('Connected to DB');

    // Default expiration date = 30 days from now
    const defaultExpDate = new Date();
    defaultExpDate.setDate(defaultExpDate.getDate() + 30);

    for (let item of itemsToSeed) {
      await Product.findOneAndUpdate(
        { productName: item.productName },
        { $setOnInsert: item, $set: { expirationDate: defaultExpDate } },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`Upserted: ${item.productName}`);
    }

    // Set expiration date for ALL existing items to +30 days if they don't have one
    await Product.updateMany(
      { expirationDate: { $exists: false } },
      { $set: { expirationDate: defaultExpDate } }
    );
    console.log('Updated existing products with default expiration dates.');

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

run();
