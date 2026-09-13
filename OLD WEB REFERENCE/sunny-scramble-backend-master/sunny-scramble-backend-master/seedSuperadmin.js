const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedSuperadmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Seeding superadmin...');
    
    // Check if superadmin exists
    let superadmin = await User.findOne({ email: 'admin@sunnyscramble.com' });
    
    if (superadmin) {
      console.log('Superadmin already exists. Resetting password...');
      const salt = await bcrypt.genSalt(10);
      superadmin.passwordHash = await bcrypt.hash('admin123', salt);
      await superadmin.save();
      console.log('Superadmin password reset to "admin123".');
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      superadmin = new User({
        fullName: 'Super Administrator',
        email: 'admin@sunnyscramble.com',
        role: 'superadmin',
        passwordHash
      });
      await superadmin.save();
      console.log('Superadmin created successfully.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    process.exit(1);
  }
};

seedSuperadmin();
