import User from '../models/User.js';
import Session from '../models/Session.js';

// @desc    Get user profile
// @route   GET /api/users/:telegramId
// @access  Public (should be protected in production)
export const getUserProfile = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user's conversion stats
    const sessions = await Session.find({ referrerId: telegramId });
    const stats = {
      totalClicks: sessions.length,
      totalConversions: sessions.filter(s => s.status === 'converted').length,
      pendingConversions: sessions.filter(s => s.status === 'pending').length,
      conversionRate: sessions.length > 0 
        ? ((sessions.filter(s => s.status === 'converted').length / sessions.length) * 100).toFixed(2)
        : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        stats,
      },
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message,
    });
  }
};

// @desc    Get user earnings history
// @route   GET /api/users/:telegramId/earnings
// @access  Public (should be protected in production)
export const getUserEarnings = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get all converted sessions for this user
    const convertedSessions = await Session.find({
      referrerId: telegramId,
      status: 'converted',
    })
      .populate('campaignId', 'cpaReward merchantId')
      .populate('productId', 'name')
      .sort({ convertedAt: -1 })
      .limit(50);

    const earnings = convertedSessions.map(session => ({
      sessionId: session._id,
      productName: session.productId?.name,
      reward: session.campaignId?.cpaReward,
      convertedAt: session.convertedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        currentBalance: user.earningsBalance,
        totalEarnings: user.totalEarnings,
        totalConversions: user.totalConversions,
        recentEarnings: earnings,
      },
    });
  } catch (error) {
    console.error('Error in getUserEarnings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user earnings',
      error: error.message,
    });
  }
};

// @desc    Create or update user
// @route   POST /api/users
// @access  Public
export const createOrUpdateUser = async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, role } = req.body;

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: 'Telegram ID is required',
      });
    }

    let user = await User.findOne({ telegramId });

    if (user) {
      // Update existing user
      if (username) user.username = username;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (role) user.role = role;
      
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } else {
      // Create new user
      user = await User.create({
        telegramId,
        username,
        firstName,
        lastName,
        role: role || 'influencer',
      });

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    }
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating/updating user',
      error: error.message,
    });
  }
};

// @desc    Get all influencers (leaderboard)
// @route   GET /api/users/influencers/leaderboard
// @access  Public
export const getInfluencerLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const influencers = await User.find({
      role: 'influencer',
      isActive: true,
    })
      .select('telegramId username firstName lastName totalEarnings totalConversions')
      .sort({ totalEarnings: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: influencers.length,
      data: influencers,
    });
  } catch (error) {
    console.error('Error in getInfluencerLeaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard',
      error: error.message,
    });
  }
};
