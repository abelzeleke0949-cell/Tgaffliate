import crypto from 'crypto';
import Campaign from '../models/Campaign.js';
import Merchant from '../models/Merchant.js';
import Transaction from '../models/Transaction.js';
import { initializeTransaction, verifyTransaction } from '../services/chapaService.js';

// Re-verifies a transaction with Chapa and credits the wallet exactly once.
// Shared by the merchant-facing verify endpoint and the Chapa webhook.
export const settleTransaction = async (txRef) => {
  const transaction = await Transaction.findOne({ txRef });
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status === 'success') {
    const merchant = await Merchant.findById(transaction.merchantId);
    return { transaction, merchant };
  }

  const { status } = await verifyTransaction(txRef);

  if (status !== 'success') {
    transaction.status = 'failed';
    await transaction.save();
    throw new Error('Payment was not successful');
  }

  const merchant = await Merchant.findById(transaction.merchantId);
  if (!merchant) {
    throw new Error('Merchant not found');
  }

  await merchant.deposit(transaction.amount);
  transaction.status = 'success';
  await transaction.save();

  return { transaction, merchant };
};

// @desc    Start a real Chapa checkout session to top up the merchant's wallet
// @route   POST /api/merchant/deposit/initialize
// @access  Private (merchant)
export const initializeDeposit = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid amount is required',
      });
    }

    const merchant = req.merchant;
    const txRef = `dep-${merchant._id}-${crypto.randomBytes(6).toString('hex')}`;

    await Transaction.create({
      merchantId: merchant._id,
      txRef,
      amount,
    });

    const [firstName, ...rest] = merchant.businessName.trim().split(/\s+/);

    const { checkoutUrl } = await initializeTransaction({
      amount,
      email: merchant.email,
      firstName: firstName || 'Merchant',
      lastName: rest.join(' ') || 'Account',
      txRef,
      callbackUrl: `${process.env.BACKEND_URL}/api/webhooks/chapa`,
      returnUrl: `${process.env.FRONTEND_URL}/wallet-callback?tx_ref=${txRef}`,
    });

    res.status(200).json({
      success: true,
      data: { checkoutUrl, txRef },
    });
  } catch (error) {
    console.error('Error in initializeDeposit:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting deposit',
      error: error.message,
    });
  }
};

// @desc    Confirm a Chapa deposit and credit the wallet (idempotent)
// @route   GET /api/merchant/deposit/verify/:txRef
// @access  Private (merchant)
export const verifyDeposit = async (req, res) => {
  try {
    const { txRef } = req.params;

    const transaction = await Transaction.findOne({ txRef });
    if (!transaction || String(transaction.merchantId) !== String(req.merchant._id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const { merchant } = await settleTransaction(txRef);

    res.status(200).json({
      success: true,
      message: 'Deposit confirmed',
      data: {
        walletBalance: merchant.walletBalance,
        totalDeposited: merchant.totalDeposited,
      },
    });
  } catch (error) {
    console.error('Error in verifyDeposit:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error verifying deposit',
    });
  }
};

// @desc    Get the logged-in merchant's own profile + campaign summary
// @route   GET /api/merchant/me
// @access  Private (merchant)
export const getMerchant = async (req, res) => {
  try {
    const merchant = req.merchant;

    const campaigns = await Campaign.find({ merchantId: merchant._id });
    const campaignsSummary = {
      total: campaigns.length,
      active: campaigns.filter((c) => c.isActive).length,
      totalSales: campaigns.reduce((sum, c) => sum + c.salesGenerated, 0),
    };

    res.status(200).json({
      success: true,
      data: {
        ...merchant.toObject(),
        campaignsSummary,
      },
    });
  } catch (error) {
    console.error('Error in getMerchant:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching merchant',
      error: error.message,
    });
  }
};
