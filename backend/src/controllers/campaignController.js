import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js';

const PRODUCT_POPULATE = 'name description images price category';

// @desc    Create a new campaign bundling one or more of the merchant's own products
// @route   POST /api/campaigns
// @access  Private (merchant)
export const createCampaign = async (req, res) => {
  try {
    const { productIds, endDate } = req.body;
    const totalBudget = Number(req.body.totalBudget);
    const cpaReward = Number(req.body.cpaReward);

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product must be selected',
      });
    }

    if (!totalBudget || !cpaReward) {
      return res.status(400).json({
        success: false,
        message: 'Total budget and CPA reward are required',
      });
    }

    if (!endDate || Number.isNaN(new Date(endDate).getTime()) || new Date(endDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'A valid end date in the future is required',
      });
    }

    if (totalBudget <= 0 || cpaReward <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total budget and CPA reward must be positive numbers',
      });
    }

    if (totalBudget < cpaReward) {
      return res.status(400).json({
        success: false,
        message: 'Total budget must be at least equal to CPA reward',
      });
    }

    const merchant = req.merchant;

    // Every selected product must belong to this merchant and be active
    const products = await Product.find({ _id: { $in: productIds }, merchantId: merchant._id });
    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected products were not found in your catalog',
      });
    }
    if (products.some((p) => !p.isActive)) {
      return res.status(400).json({
        success: false,
        message: 'All selected products must be active',
      });
    }

    // Check if merchant has sufficient balance
    if (!merchant.hasSufficientBalance(totalBudget)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${merchant.walletBalance} ETB, Required: ${totalBudget} ETB`,
      });
    }

    // Deduct budget from merchant wallet (Escrow)
    await merchant.deduct(totalBudget);

    // Create campaign — stays inactive until an admin approves it
    const campaign = await Campaign.create({
      merchantId: merchant._id,
      productIds,
      totalBudget,
      budgetRemaining: totalBudget,
      cpaReward,
      endDate,
      isActive: false,
    });

    await campaign.populate([
      { path: 'merchantId', select: 'businessName email' },
      { path: 'productIds', select: PRODUCT_POPULATE },
    ]);

    res.status(201).json({
      success: true,
      message: 'Campaign submitted for admin review. Budget has been escrowed.',
      data: campaign,
    });
  } catch (error) {
    console.error('Error in createCampaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating campaign',
      error: error.message,
    });
  }
};

// @desc    Get active campaigns (public browse, used by the Mini App)
// @route   GET /api/campaigns
// @access  Public
export const getCampaigns = async (req, res) => {
  try {
    const { isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
      // An expired campaign shouldn't show up in the public feed even if isActive
      // was never manually flipped off yet.
      if (filter.isActive) {
        filter.endDate = { $gt: new Date() };
      }
    }

    const campaigns = await Campaign.find(filter)
      .populate('merchantId', 'businessName')
      .populate('productIds', PRODUCT_POPULATE)
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    console.error('Error in getCampaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaigns',
      error: error.message,
    });
  }
};

// @desc    Get the logged-in merchant's own campaigns (any status)
// @route   GET /api/campaigns/mine
// @access  Private (merchant)
export const getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ merchantId: req.merchant._id })
      .populate('productIds', PRODUCT_POPULATE)
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    console.error('Error in getMyCampaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaigns',
      error: error.message,
    });
  }
};

// @desc    Get single campaign
// @route   GET /api/campaigns/:id
// @access  Public
export const getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('merchantId', 'businessName email contactPhone')
      .populate('productIds', PRODUCT_POPULATE);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('Error in getCampaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaign',
      error: error.message,
    });
  }
};

// @desc    Update a campaign owned by the logged-in merchant
// @route   PUT /api/campaigns/:id
// @access  Private (merchant, must own the campaign)
export const updateCampaign = async (req, res) => {
  try {
    const { isActive } = req.body;

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    if (String(campaign.merchantId) !== String(req.merchant._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this campaign',
      });
    }

    if (isActive !== undefined) {
      if (isActive && campaign.approvalStatus !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Campaign must be approved by an admin before it can be activated',
        });
      }
      campaign.isActive = isActive;
    }

    await campaign.save();

    res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign,
    });
  } catch (error) {
    console.error('Error in updateCampaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating campaign',
      error: error.message,
    });
  }
};

// @desc    Get campaign statistics
// @route   GET /api/campaigns/:id/stats
// @access  Public
export const getCampaignStats = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const stats = {
      campaignId: campaign._id,
      totalBudget: campaign.totalBudget,
      budgetRemaining: campaign.budgetRemaining,
      budgetSpent: campaign.totalBudget - campaign.budgetRemaining,
      budgetUsagePercentage: campaign.budgetUsagePercentage,
      cpaReward: campaign.cpaReward,
      salesGenerated: campaign.salesGenerated,
      totalPaidOut: campaign.salesGenerated * campaign.cpaReward,
      isActive: campaign.isActive,
      maxPossibleConversions: Math.floor(campaign.budgetRemaining / campaign.cpaReward),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in getCampaignStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaign stats',
      error: error.message,
    });
  }
};
