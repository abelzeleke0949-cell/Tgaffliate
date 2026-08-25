import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productDescription: {
    type: String,
    default: '',
  },
  productPrice: {
    type: Number,
    default: 0,
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 0,
  },
  budgetRemaining: {
    type: Number,
    required: true,
    min: 0,
  },
  cpaReward: {
    type: Number,
    required: true,
    min: 0,
  },
  salesGenerated: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
campaignSchema.index({ merchantId: 1, isActive: 1 });
campaignSchema.index({ isActive: 1, budgetRemaining: 1 });

// Virtual for budget usage percentage
campaignSchema.virtual('budgetUsagePercentage').get(function() {
  if (this.totalBudget === 0) return 0;
  return ((this.totalBudget - this.budgetRemaining) / this.totalBudget) * 100;
});

// Method to check if campaign can process a conversion
campaignSchema.methods.canProcessConversion = function() {
  return this.isActive && this.budgetRemaining >= this.cpaReward;
};

// Method to process a conversion
campaignSchema.methods.processConversion = async function() {
  if (!this.canProcessConversion()) {
    throw new Error('Cannot process conversion: insufficient budget or inactive campaign');
  }
  
  this.budgetRemaining -= this.cpaReward;
  this.salesGenerated += 1;
  
  // Auto-deactivate if budget is depleted
  if (this.budgetRemaining < this.cpaReward) {
    this.isActive = false;
  }
  
  return await this.save();
};

// Static method to get active campaigns
campaignSchema.statics.getActiveCampaigns = function() {
  return this.find({ 
    isActive: true, 
    budgetRemaining: { $gte: 0 } 
  }).populate('merchantId', 'businessName');
};

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;
