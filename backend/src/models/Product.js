import mongoose from 'mongoose';
import { CATEGORIES } from '../constants/categories.js';

const productSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    default: [],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
    enum: CATEGORIES,
  },
  stockQuantity: {
    type: Number,
    default: null,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

productSchema.index({ merchantId: 1, isActive: 1 });

// Method to reduce stock on a verified sale. No-ops for unlimited-stock products (null).
productSchema.methods.reduceStock = async function () {
  if (this.stockQuantity === null) return;
  this.stockQuantity = Math.max(0, this.stockQuantity - 1);
  await this.save();
};

const Product = mongoose.model('Product', productSchema);

export default Product;
