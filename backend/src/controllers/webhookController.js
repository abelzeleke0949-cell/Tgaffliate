import Session from '../models/Session.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import { sendTelegramNotification } from '../services/telegramService.js';
import { settleTransaction } from './merchantController.js';

// @desc    Mock Chapa webhook - Process conversion
// @route   POST /api/webhooks/chapa-mock
// @access  Public (In production, verify webhook signature)
export const processConversion = async (req, res) => {
  try {
    const providedSecret = req.headers['x-webhook-secret'];
    if (process.env.CHAPA_WEBHOOK_SECRET && providedSecret !== process.env.CHAPA_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { buyerTelegramId, campaignId, metadata } = req.body;

    // Validation
    if (!buyerTelegramId || !campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Buyer Telegram ID and Campaign ID are required',
      });
    }

    // Find the pending session
    const session = await Session.findPendingSession(buyerTelegramId, campaignId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No pending session found for this buyer and campaign',
      });
    }

    // Find the campaign
    const campaign = await Campaign.findById(campaignId).populate('merchantId');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    // Check if campaign can process conversion
    if (!campaign.canProcessConversion()) {
      return res.status(400).json({
        success: false,
        message: 'Campaign cannot process conversion (inactive or insufficient budget)',
      });
    }

    // Process the conversion in campaign
    await campaign.processConversion();

    // Mark session as converted
    await session.markAsConverted();

    // Find or create the influencer user
    let influencer = await User.findOne({ telegramId: session.referrerId });
    
    if (!influencer) {
      influencer = await User.create({
        telegramId: session.referrerId,
        role: 'influencer',
        earningsBalance: 0,
      });
    }

    // Credit the influencer
    influencer.earningsBalance += campaign.cpaReward;
    influencer.totalEarnings += campaign.cpaReward;
    influencer.totalConversions += 1;
    await influencer.save();

    // Send Telegram notification to influencer
    try {
      await sendTelegramNotification(
        session.referrerId,
        `🎉 *Conversion verified!*\n\nSomeone bought "${campaign.productName}" via your link.\n\n💰 *${campaign.cpaReward.toLocaleString('en-US')} ETB* added to your balance.\n\n📊 Total Balance: *${influencer.earningsBalance.toLocaleString('en-US')} ETB*`,
      );
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the conversion if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Conversion processed successfully',
      data: {
        sessionId: session._id,
        campaignId: campaign._id,
        campaignName: campaign.productName,
        referrerId: session.referrerId,
        reward: campaign.cpaReward,
        influencerNewBalance: influencer.earningsBalance,
        campaignBudgetRemaining: campaign.budgetRemaining,
        campaignSalesGenerated: campaign.salesGenerated,
        convertedAt: session.convertedAt,
      },
    });
  } catch (error) {
    console.error('Error in processConversion:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing conversion',
      error: error.message,
    });
  }
};

// @desc    Chapa server-to-server payment webhook — reliable fallback for deposit
//          confirmation in case the merchant closes the tab before the browser redirect
// @route   POST /api/webhooks/chapa
// @access  Public (re-verifies with Chapa server-to-server before crediting anything)
export const chapaWebhook = async (req, res) => {
  try {
    const txRef = req.body.tx_ref;
    if (!txRef) {
      return res.status(400).json({ success: false, message: 'tx_ref is required' });
    }

    await settleTransaction(txRef);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in chapaWebhook:', error);
    res.status(200).json({ success: false, message: error.message });
  }
};

// @desc    Track click (optional - for analytics)
// @route   POST /api/webhooks/track-click
// @access  Public
export const trackClick = async (req, res) => {
  try {
    const { referrerId, campaignId, ipAddress, userAgent } = req.body;

    if (!referrerId || !campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Referrer ID and Campaign ID are required',
      });
    }

    // This endpoint can be used to track clicks for analytics
    // without creating a session (optional feature)

    res.status(200).json({
      success: true,
      message: 'Click tracked successfully',
    });
  } catch (error) {
    console.error('Error in trackClick:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking click',
      error: error.message,
    });
  }
};
