import Campaign from '../models/Campaign.js';

// @desc    Create a new campaign for the logged-in merchant
// @route   POST /api/campaigns
// @access  Private (merchant)
export const createCampaign = async (req, res) => {
  try {
    const {
      productName,
      productDescription,
      productPrice,
      totalBudget,
      cpaReward,
    } = req.body;

    // Validation
    if (!productName || !totalBudget || !cpaReward) {
      return res.status(400).json({
        success: false,
        message: 'Product name, total budget, and CPA reward are required',
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
    const merchantId = merchant._id;

    // Check if merchant has sufficient balance
    if (!merchant.hasSufficientBalance(totalBudget)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${merchant.walletBalance} ETB, Required: ${totalBudget} ETB`,
      });
    }

    // Deduct budget from merchant wallet (Escrow)
    await merchant.deduct(totalBudget);

    // Create campaign
    const campaign = await Campaign.create({
      merchantId,
      productName,
      productDescription: productDescription || '',
      productPrice: productPrice || 0,
      totalBudget,
      budgetRemaining: totalBudget,
      cpaReward,
      isActive: true,
    });

    // Populate merchant data
    await campaign.populate('merchantId', 'businessName email');

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully. Budget has been escrowed.',
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
    }

    const campaigns = await Campaign.find(filter)
      .populate('merchantId', 'businessName')
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
      .populate('merchantId', 'businessName email contactPhone');

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
    const { isActive, productDescription, productPrice } = req.body;

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

    // Only allow updating certain fields
    if (isActive !== undefined) campaign.isActive = isActive;
    if (productDescription !== undefined) campaign.productDescription = productDescription;
    if (productPrice !== undefined) campaign.productPrice = productPrice;

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
      productName: campaign.productName,
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
