import Campaign from '../models/Campaign.js';

// @desc    Deposit funds to the logged-in merchant's wallet
// @route   POST /api/merchant/deposit
// @access  Private (merchant)
export const depositFunds = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid amount is required',
      });
    }

    const merchant = req.merchant;
    await merchant.deposit(amount);

    res.status(200).json({
      success: true,
      message: `Successfully deposited ${amount} ETB`,
      data: {
        merchantId: merchant._id,
        businessName: merchant.businessName,
        walletBalance: merchant.walletBalance,
        totalDeposited: merchant.totalDeposited,
      },
    });
  } catch (error) {
    console.error('Error in depositFunds:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing deposit',
      error: error.message,
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
