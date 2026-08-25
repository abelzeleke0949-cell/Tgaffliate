import Admin from '../models/Admin.js';
import Merchant from '../models/Merchant.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { generateToken } from '../utils/generateToken.js';

// @desc    Log an admin in
// @route   POST /api/admin/login
// @access  Public
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(admin._id, 'admin');

    res.status(200).json({
      success: true,
      data: {
        token,
        admin: { id: admin._id, name: admin.name, email: admin.email },
      },
    });
  } catch (error) {
    console.error('Error in loginAdmin:', error);
    res.status(500).json({ success: false, message: 'Error logging in', error: error.message });
  }
};

// @desc    Platform-wide summary stats
// @route   GET /api/admin/stats
// @access  Private (admin)
export const getStats = async (req, res) => {
  try {
    const [merchantCount, campaignCount, activeCampaignCount, userCount, sessions] = await Promise.all([
      Merchant.countDocuments(),
      Campaign.countDocuments(),
      Campaign.countDocuments({ isActive: true }),
      User.countDocuments(),
      Session.find({}, 'status'),
    ]);

    const campaigns = await Campaign.find({}, 'totalBudget budgetRemaining salesGenerated cpaReward');
    const totalEscrow = campaigns.reduce((sum, c) => sum + c.budgetRemaining, 0);
    const totalPaidOut = campaigns.reduce((sum, c) => sum + c.salesGenerated * c.cpaReward, 0);
    const totalSales = campaigns.reduce((sum, c) => sum + c.salesGenerated, 0);

    const conversions = sessions.filter((s) => s.status === 'converted').length;
    const pending = sessions.filter((s) => s.status === 'pending').length;

    res.status(200).json({
      success: true,
      data: {
        merchantCount,
        campaignCount,
        activeCampaignCount,
        userCount,
        totalSales,
        totalEscrow,
        totalPaidOut,
        sessions: { total: sessions.length, converted: conversions, pending },
      },
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
};

// @desc    List all merchants
// @route   GET /api/admin/merchants
// @access  Private (admin)
export const listMerchants = async (req, res) => {
  try {
    const merchants = await Merchant.find().select('-__v').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: merchants.length, data: merchants });
  } catch (error) {
    console.error('Error in listMerchants:', error);
    res.status(500).json({ success: false, message: 'Error fetching merchants', error: error.message });
  }
};

// @desc    Activate/deactivate a merchant
// @route   PATCH /api/admin/merchants/:id
// @access  Private (admin)
export const updateMerchantStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const merchant = await Merchant.findById(req.params.id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }
    if (isActive !== undefined) merchant.isActive = isActive;
    await merchant.save();
    res.status(200).json({ success: true, data: merchant });
  } catch (error) {
    console.error('Error in updateMerchantStatus:', error);
    res.status(500).json({ success: false, message: 'Error updating merchant', error: error.message });
  }
};

// @desc    List all campaigns (any merchant)
// @route   GET /api/admin/campaigns
// @access  Private (admin)
export const listCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('merchantId', 'businessName email')
      .select('-__v')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error) {
    console.error('Error in listCampaigns:', error);
    res.status(500).json({ success: false, message: 'Error fetching campaigns', error: error.message });
  }
};

// @desc    Pause/resume a campaign
// @route   PATCH /api/admin/campaigns/:id
// @access  Private (admin)
export const updateCampaignStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    if (isActive !== undefined) campaign.isActive = isActive;
    await campaign.save();
    res.status(200).json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error in updateCampaignStatus:', error);
    res.status(500).json({ success: false, message: 'Error updating campaign', error: error.message });
  }
};

// @desc    List influencer/buyer users
// @route   GET /api/admin/users
// @access  Private (admin)
export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v').sort({ totalEarnings: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error in listUsers:', error);
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

// @desc    List click/conversion sessions
// @route   GET /api/admin/sessions
// @access  Private (admin)
export const listSessions = async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate('campaignId', 'productName cpaReward')
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    console.error('Error in listSessions:', error);
    res.status(500).json({ success: false, message: 'Error fetching sessions', error: error.message });
  }
};
