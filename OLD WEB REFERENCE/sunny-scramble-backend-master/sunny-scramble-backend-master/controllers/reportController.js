const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const Spoilage = require('../models/Spoilage');

// Get Dashboard Summary (Sales, Expenses, and Profit)
exports.getDashboardSummary = async (req, res) => {
  try {
    const { period } = req.query;
    
    let dateQuery = {};
    if (period && period !== 'all-time') {
      const now = new Date();
      let startDate = new Date();
      if (period === 'today') {
        startDate.setHours(0,0,0,0);
        const endDate = new Date();
        endDate.setHours(23,59,59,999);
        dateQuery.createdAt = { $gte: startDate, $lte: endDate };
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
        dateQuery.createdAt = { $gte: startDate };
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        dateQuery.createdAt = { $gte: startDate };
      }
    }

    // 1. Calculate Total Sales
    const sales = await Sale.find(dateQuery);
    const totalSales = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // 2. Calculate Total Expenses from Deliveries
    const deliveries = await Delivery.find(dateQuery);
    const totalExpenses = deliveries.reduce((acc, curr) => acc + curr.totalCost, 0);

    // 3. Get Low Stock Products (Inventory report aspect)
    const StoreConfig = require('../models/StoreConfig');
    let config = await StoreConfig.findOne();
    const lowStockThresholdPct = config && config.lowStockThreshold ? config.lowStockThreshold : 20;

    const allProducts = await Product.find();
    const lowStockProducts = allProducts.filter(product => {
      const capacity = product.maxCapacity || 100;
      const stockPct = (product.quantity / capacity) * 100;
      return stockPct <= lowStockThresholdPct;
    });

    const totalDeliveries = await Delivery.countDocuments(dateQuery);
    const totalSpoilage = await Spoilage.countDocuments(dateQuery);

    // 4. Calculate Revenue for Last 6 Months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const recentSales = await Sale.find({ createdAt: { $gte: sixMonthsAgo } });
    
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyRevenue = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyRevenue[`${monthNames[d.getMonth()]} ${d.getFullYear()}`] = 0;
    }

    recentSales.forEach(sale => {
      const d = new Date(sale.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlyRevenue[key] !== undefined) {
        monthlyRevenue[key] += sale.totalAmount;
      }
    });

    const last6MonthsRevenue = Object.keys(monthlyRevenue).map(key => ({
      month: key.split(' ')[0],
      revenue: monthlyRevenue[key]
    }));

    res.status(200).json({
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      totalDeliveries,
      totalSpoilage,
      last6MonthsRevenue
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating report summary', error: error.message });
  }
};

exports.getSalesSummary = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }
    const sales = await Sale.find(query);
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales summary', error: error.message });
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }
    const deliveries = await Delivery.find(query).populate('productId');
    
    const formattedExpenses = deliveries.map(del => ({
      _id: del._id,
      expenseDate: del.createdAt,
      category: 'Restock: ' + (del.productId ? del.productId.productName : 'Unknown Product'),
      totalCost: del.totalCost
    }));

    res.status(200).json(formattedExpenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expense summary', error: error.message });
  }
};

exports.getIncomeStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const salesQuery = {};
    const expenseQuery = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      salesQuery.createdAt = { $gte: start, $lte: end };
      expenseQuery.createdAt = { $gte: start, $lte: end };
    }
    const sales = await Sale.find(salesQuery);
    const totalSales = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const deliveries = await Delivery.find(expenseQuery);
    const totalExpenses = deliveries.reduce((acc, curr) => acc + curr.totalCost, 0);

    res.status(200).json({
      revenue: totalSales,
      expenses: totalExpenses,
      netIncome: totalSales - totalExpenses
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating income statement', error: error.message });
  }
};