require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleProducts = [
  // CHICKEN
  { productName: 'Jumbo Dressed Chicken (1.5 kg)', category: 'Chicken', quantity: 50, unitCost: 180, sellingPrice: 220, imageUrl: '' },
  { productName: 'Premium Dressed Chicken (1.2 kg)', category: 'Chicken', quantity: 50, unitCost: 110, sellingPrice: 145, imageUrl: '' },
  { productName: 'Twin Pack - Chicken Wings', category: 'Chicken', quantity: 50, unitCost: 150, sellingPrice: 195, imageUrl: '' },
  { productName: 'Twin Pack - Chicken Thigh', category: 'Chicken', quantity: 50, unitCost: 160, sellingPrice: 210, imageUrl: '' },
  { productName: 'Twin Pack - Chicken Drumstick', category: 'Chicken', quantity: 50, unitCost: 140, sellingPrice: 180, imageUrl: '' },
  { productName: 'Twin Pack - Chicken Breast', category: 'Chicken', quantity: 50, unitCost: 130, sellingPrice: 165, imageUrl: '' },
  
  // EGGS
  { productName: 'X-Large Eggs (Dozen)', category: 'Egg', quantity: 50, unitCost: 85, sellingPrice: 110, imageUrl: '' },
  { productName: 'Large Eggs (Dozen)', category: 'Egg', quantity: 50, unitCost: 75, sellingPrice: 100, imageUrl: '' },
  { productName: 'Medium Eggs (Dozen)', category: 'Egg', quantity: 50, unitCost: 70, sellingPrice: 95, imageUrl: '' },
  { productName: 'Small Eggs (Dozen)', category: 'Egg', quantity: 50, unitCost: 65, sellingPrice: 90, imageUrl: '' },
  { productName: 'X-Large Eggs (Tray)', category: 'Egg', quantity: 50, unitCost: 170, sellingPrice: 220, imageUrl: '' },
  { productName: 'Large Eggs (Tray)', category: 'Egg', quantity: 50, unitCost: 150, sellingPrice: 200, imageUrl: '' },
  { productName: 'Medium Eggs (Tray)', category: 'Egg', quantity: 50, unitCost: 135, sellingPrice: 180, imageUrl: '' },
  { productName: 'Small Eggs (Tray)', category: 'Egg', quantity: 50, unitCost: 120, sellingPrice: 160, imageUrl: '' },

  // READY TO COOK
  { productName: 'Spicy Chicken Wings with Breading', category: 'Chicken', quantity: 50, unitCost: 90, sellingPrice: 125, imageUrl: '' },
  { productName: 'Chicken BBQ Bone-In', category: 'Chicken', quantity: 50, unitCost: 95, sellingPrice: 130, imageUrl: '' },
  { productName: 'Chicken Inasal with Chicken Oil', category: 'Chicken', quantity: 50, unitCost: 90, sellingPrice: 125, imageUrl: '' },
  { productName: 'Chicken Lumpiang Shanghai', category: 'Chicken', quantity: 50, unitCost: 65, sellingPrice: 90, imageUrl: '' },
  { productName: 'Chicken Barbecue', category: 'Chicken', quantity: 50, unitCost: 130, sellingPrice: 185, imageUrl: '' },
  { productName: 'Chicken Embutido', category: 'Chicken', quantity: 50, unitCost: 130, sellingPrice: 185, imageUrl: '' },
  { productName: 'Chicken Tocino', category: 'Chicken', quantity: 50, unitCost: 95, sellingPrice: 135, imageUrl: '' },
  { productName: 'Chicken Pops', category: 'Chicken', quantity: 50, unitCost: 130, sellingPrice: 185, imageUrl: '' },
  { productName: 'Chicken Longanisa Vigan Style', category: 'Chicken', quantity: 50, unitCost: 125, sellingPrice: 180, imageUrl: '' },
  { productName: 'Chicken Longanisa Hamonado Style', category: 'Chicken', quantity: 50, unitCost: 115, sellingPrice: 165, imageUrl: '' }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Seeding products...');
    
    // Clear existing products
    await Product.deleteMany({});
    
    await Product.insertMany(sampleProducts);
    console.log('Successfully seeded exact products list.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedDB();
