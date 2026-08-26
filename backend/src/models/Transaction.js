import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
  },
  txRef: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

transactionSchema.index({ merchantId: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
