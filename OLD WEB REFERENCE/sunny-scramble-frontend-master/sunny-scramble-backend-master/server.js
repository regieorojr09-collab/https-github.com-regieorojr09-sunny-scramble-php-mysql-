const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: [
        'http://localhost:5173', // Keeps local development working
        'https://sunny-scramble-frontend.vercel.app' // Allows your live Vercel frontend
    ],
    credentials: true
}));
app.use(express.json()); // Parses incoming JSON requests
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files from uploads

// Route Imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const salesRoutes = require('./routes/salesRoutes');     
const reportRoutes = require('./routes/reportRoutes');   
const deliveryRoutes = require('./routes/deliveryRoutes');
const userRoutes = require('./routes/userRoutes');
const auditRoutes = require('./routes/auditRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const configRoutes = require('./routes/configRoutes');
const spoilageRoutes = require('./routes/spoilageRoutes');
const customerReturnRoutes = require('./routes/customerReturnRoutes');
const supplierReturnRoutes = require('./routes/supplierReturnRoutes');
const backupRoutes = require('./routes/backupRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);       
app.use('/api/reports', reportRoutes); 
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/config', configRoutes);
app.use('/api/spoilages', spoilageRoutes);
app.use('/api/customer-returns', customerReturnRoutes);
app.use('/api/supplier-returns', supplierReturnRoutes);
app.use('/api/backup', backupRoutes);

// Error Handler Middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas.'))
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });

// Basic Root Route
app.get('/', (req, res) => {
  res.send('Sunny & Scramble API is running...');
});

// Server Initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});