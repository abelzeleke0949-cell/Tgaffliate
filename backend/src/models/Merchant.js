import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const merchantSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,  // This creates the index automatically
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalDeposited: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  contactPhone: {
    type: String,
    default: null,
  },
  address: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for faster queries (email index is already created by unique: true)
merchantSchema.index({ isActive: 1 });

// Hash password before saving
merchantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to verify a candidate password
merchantSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Method to check if merchant has sufficient balance
merchantSchema.methods.hasSufficientBalance = function(amount) {
  return this.walletBalance >= amount;
};

// Method to deposit funds
merchantSchema.methods.deposit = async function(amount) {
  this.walletBalance += amount;
  this.totalDeposited += amount;
  return await this.save();
};

// Method to deduct funds (for campaign budget)
merchantSchema.methods.deduct = async function(amount) {
  if (!this.hasSufficientBalance(amount)) {
    throw new Error('Insufficient balance');
  }
  this.walletBalance -= amount;
  this.totalSpent += amount;
  return await this.save();
};

// Method to return previously-deducted funds (e.g. a rejected campaign's escrowed budget)
merchantSchema.methods.refund = async function(amount) {
  this.walletBalance += amount;
  this.totalSpent = Math.max(0, this.totalSpent - amount);
  return await this.save();
};

const Merchant = mongoose.model('Merchant', merchantSchema);

export default Merchant;
