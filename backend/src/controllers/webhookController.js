import crypto from 'crypto';
import Session from '../models/Session.js';
import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendTelegramNotification } from '../services/telegramService.js';
import { initializeTransaction, verifyTransaction } from '../services/chapaService.js';
import { settleTransaction } from './merchantController.js';

// @desc    Chapa server-to-server payment webhook — reliable fallback for merchant wallet
//          deposit confirmation in case the merchant closes the tab before the redirect
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

// @desc    Start a real Chapa checkout for a buyer purchasing a bundled product
// @route   POST /api/webhooks/purchase/initialize
// @access  Public
export const initializePurchase = async (req, res) => {
  try {
    const { buyerTelegramId, campaignId, productId, buyerName } = req.body;

    if (!buyerTelegramId || !campaignId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Buyer Telegram ID, campaign ID, and product ID are required',
      });
    }

    const session = await Session.findPendingSession(buyerTelegramId, campaignId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No pending session found for this buyer and campaign',
      });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || !campaign.canProcessConversion()) {
      return res.status(400).json({
        success: false,
        message: 'Campaign cannot process a purchase (inactive, expired, or insufficient budget)',
      });
    }

    if (!campaign.productIds.some((id) => String(id) === String(productId))) {
      return res.status(400).json({
        success: false,
        message: 'That product is not part of this campaign',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const txRef = `buy-${session._id}-${crypto.randomBytes(6).toString('hex')}`;
    session.productId = productId;
    session.txRef = txRef;
    await session.save();

    const [firstName, ...rest] = (buyerName || 'Telegram Buyer').trim().split(/\s+/);

    const { checkoutUrl } = await initializeTransaction({
      amount: product.price,
      // Telegram users have no real email — Chapa requires one, so synthesize a stable one.
      // Must be on a real, DNS-resolvable domain or Chapa's validation rejects it outright.
      email: `telegram_${buyerTelegramId}@lightb.tech`,
      firstName: firstName || 'Telegram',
      lastName: rest.join(' ') || 'Buyer',
      txRef,
      callbackUrl: `${process.env.BACKEND_URL}/api/webhooks/purchase/callback`,
      returnUrl: `${process.env.FRONTEND_URL}/purchase-callback?tx_ref=${txRef}`,
    });

    res.status(200).json({ success: true, data: { checkoutUrl, txRef } });
  } catch (error) {
    console.error('Error in initializePurchase:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting purchase',
      error: error.message,
    });
  }
};

// Re-verifies a purchase with Chapa and credits the referring influencer exactly once.
// Shared by the buyer-facing verify endpoint and the Chapa webhook.
export const settlePurchase = async (txRef) => {
  const session = await Session.findOne({ txRef });
  if (!session) {
    throw new Error('Purchase not found');
  }

  if (session.status === 'converted') {
    const campaign = await Campaign.findById(session.campaignId);
    const influencer = await User.findOne({ telegramId: session.referrerId });
    return { session, campaign, influencer };
  }

  const { status } = await verifyTransaction(txRef);
  if (status !== 'success') {
    throw new Error('Payment was not successful');
  }

  const campaign = await Campaign.findById(session.campaignId);
  if (!campaign || !campaign.canProcessConversion()) {
    throw new Error('Campaign can no longer process this conversion');
  }

  await campaign.processConversion();
  await session.markAsConverted();

  if (session.productId) {
    const product = await Product.findById(session.productId);
    if (product) await product.reduceStock();
  }

  // Find or create the influencer user
  let influencer = await User.findOne({ telegramId: session.referrerId });
  if (!influencer) {
    influencer = await User.create({
      telegramId: session.referrerId,
      role: 'influencer',
      earningsBalance: 0,
    });
  }

  influencer.earningsBalance += campaign.cpaReward;
  influencer.totalEarnings += campaign.cpaReward;
  influencer.totalConversions += 1;
  await influencer.save();

  try {
    await sendTelegramNotification(
      session.referrerId,
      `🎉 *Conversion verified!*\n\nSomeone bought a product via your link.\n\n💰 *${campaign.cpaReward.toLocaleString('en-US')} ETB* added to your balance.\n\n📊 Total Balance: *${influencer.earningsBalance.toLocaleString('en-US')} ETB*`,
    );
  } catch (notificationError) {
    console.error('Error sending notification:', notificationError);
  }

  return { session, campaign, influencer };
};

// @desc    Chapa server-to-server payment webhook — reliable fallback for purchase
//          confirmation in case the buyer closes the tab before the browser redirect
// @route   POST /api/webhooks/purchase/callback
// @access  Public (re-verifies with Chapa server-to-server before crediting anything)
export const purchaseWebhook = async (req, res) => {
  try {
    const txRef = req.body.tx_ref;
    if (!txRef) {
      return res.status(400).json({ success: false, message: 'tx_ref is required' });
    }
    await settlePurchase(txRef);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in purchaseWebhook:', error);
    res.status(200).json({ success: false, message: error.message });
  }
};

// @desc    Confirm a purchase and credit the influencer (idempotent)
// @route   GET /api/webhooks/purchase/verify/:txRef
// @access  Public
export const verifyPurchase = async (req, res) => {
  try {
    const { session, campaign, influencer } = await settlePurchase(req.params.txRef);
    res.status(200).json({
      success: true,
      message: 'Purchase confirmed',
      data: {
        sessionId: session._id,
        campaignBudgetRemaining: campaign?.budgetRemaining,
        influencerNewBalance: influencer?.earningsBalance,
      },
    });
  } catch (error) {
    console.error('Error in verifyPurchase:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error verifying purchase',
    });
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
