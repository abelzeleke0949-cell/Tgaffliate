import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  buyerTelegramId: {
    type: String,
    required: true,
    index: true,
  },
  referrerId: {
    type: String,
    required: true,
    index: true,
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'converted', 'expired'],
    default: 'pending',
  },
  clickedAt: {
    type: Date,
    default: Date.now,
  },
  convertedAt: {
    type: Date,
    default: null,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  metadata: {
    type: Map,
    of: String,
    default: {},
  },
}, {
  timestamps: true,
});

// Compound indexes for faster queries
sessionSchema.index({ buyerTelegramId: 1, campaignId: 1 });
sessionSchema.index({ referrerId: 1, status: 1 });
sessionSchema.index({ status: 1, createdAt: 1 });

// Method to mark session as converted
sessionSchema.methods.markAsConverted = async function() {
  if (this.status !== 'pending') {
    throw new Error('Session is not in pending state');
  }
  
  this.status = 'converted';
  this.convertedAt = new Date();
  return await this.save();
};

// Static method to find pending session
sessionSchema.statics.findPendingSession = function(buyerTelegramId, campaignId) {
  return this.findOne({
    buyerTelegramId,
    campaignId,
    status: 'pending',
  }).sort({ createdAt: -1 }); // Get the most recent pending session
};

// Static method to get conversion stats for an influencer
sessionSchema.statics.getInfluencerStats = async function(referrerId) {
  return await this.aggregate([
    { $match: { referrerId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

const Session = mongoose.model('Session', sessionSchema);

export default Session;
