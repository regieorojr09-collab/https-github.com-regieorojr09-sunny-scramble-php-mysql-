const mongoose = require('mongoose');

const spoilageSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  reason: { 
    type: String, 
    enum: ['Expired', 'Damaged', 'Spilled', 'Staff Meal', 'Other'],
    required: true 
  },
  cost: { 
    type: Number, 
    required: true 
  },
  notes: {
    type: String,
    default: ''
  },
  reportedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Spoilage', spoilageSchema);
