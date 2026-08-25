import { Telegraf, Markup } from 'telegraf';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Campaign from '../models/Campaign.js';

let bot = null;

export const initializeTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not found. Bot will not be initialized.');
    return null;
  }

  bot = new Telegraf(token);

  // Start command handler
  bot.start(async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      const username = ctx.from.username || null;
      const firstName = ctx.from.first_name || null;
      const lastName = ctx.from.last_name || null;

      // Parse referral parameters from deep link
      // Format: /start inf_123_camp_456
      const startPayload = ctx.startPayload || '';
      let referrerId = null;
      let campaignId = null;

      if (startPayload) {
        const parts = startPayload.split('_');
        // Expected format: inf_<referrer_telegram_id>_camp_<campaign_id>
        if (parts.length >= 4 && parts[0] === 'inf' && parts[2] === 'camp') {
          referrerId = parts[1];
          campaignId = parts[3];
        }
      }

      // Create or update user
      let user = await User.findOne({ telegramId });

      if (!user) {
        user = await User.create({
          telegramId,
          username,
          firstName,
          lastName,
          role: referrerId ? 'buyer' : 'influencer', // If they came via referral, mark as buyer initially
        });
      } else {
        // Update user info
        user.username = username;
        user.firstName = firstName;
        user.lastName = lastName;
        await user.save();
      }

      // If referral parameters exist, create a session
      if (referrerId && campaignId) {
        // Verify campaign exists
        const campaign = await Campaign.findById(campaignId);

        if (campaign && campaign.isActive) {
          // Create a new session
          await Session.create({
            buyerTelegramId: telegramId,
            referrerId,
            campaignId,
            status: 'pending',
          });

          // Send message with Web App button
          await ctx.reply(
            `🎉 Welcome! You've arrived via a special affiliate link.\n\n` +
            `Check out this amazing product: *${campaign.productName}*\n\n` +
            `Tap the button below to view and purchase:`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.webApp(
                    '🛍️ View Product',
                    `${process.env.MINI_APP_URL}?campaignId=${campaignId}&buyerId=${telegramId}`
                  ),
                ],
              ]),
            }
          );
        } else {
          await ctx.reply('Sorry, this campaign is no longer active.');
        }
      } else {
        // No referral - show influencer welcome message
        const greeting = `👋 Welcome${firstName ? ' ' + firstName : ''}!\n\n` +
          `💼 Your current balance: *${user.earningsBalance.toLocaleString('en-US')} ETB*\n` +
          `📊 Total conversions: ${user.totalConversions}\n\n` +
          `Use the Mini App to browse products and generate your affiliate links:`;

        await ctx.reply(greeting, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.webApp(
                '🚀 Open CPA Hub',
                process.env.MINI_APP_URL
              ),
            ],
          ]),
        });
      }
    } catch (error) {
      console.error('Error in /start command:', error);
      await ctx.reply('Sorry, something went wrong. Please try again later.');
    }
  });

  // Balance command
  bot.command('balance', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      const user = await User.findOne({ telegramId });

      if (!user) {
        await ctx.reply('User not found. Please use /start first.');
        return;
      }

      const message = `💰 *Your Earnings Summary*\n\n` +
        `Current Balance: *${user.earningsBalance.toLocaleString('en-US')} ETB*\n` +
        `Total Earned: *${user.totalEarnings.toLocaleString('en-US')} ETB*\n` +
        `Total Conversions: ${user.totalConversions}`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in /balance command:', error);
      await ctx.reply('Error fetching balance. Please try again later.');
    }
  });

  // Help command
  bot.help(async (ctx) => {
    const helpText = `🤖 *CPA Hub Bot Commands*\n\n` +
      `/start - Start the bot and open Mini App\n` +
      `/balance - Check your earnings balance\n` +
      `/help - Show this help message\n\n` +
      `🔗 Generate affiliate links in the Mini App and earn ETB for every verified sale!`;

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  // Error handling
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('An error occurred. Please try again later.');
  });

  console.log('✅ Telegram bot initialized');
  return bot;
};

// Function to send notification to a user
export const sendTelegramNotification = async (telegramId, message) => {
  if (!bot) {
    console.warn('Bot not initialized. Cannot send notification.');
    return false;
  }

  try {
    await bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
    });
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
};

// Start the bot
export const startTelegramBot = async () => {
  if (!bot) {
    console.warn('Bot not initialized. Skipping bot launch.');
    return;
  }

  try {
    // Use polling for development (for production, use webhooks)
    if (process.env.NODE_ENV === 'production' && process.env.TELEGRAM_WEBHOOK_DOMAIN) {
      // Set webhook for production
      const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_DOMAIN}/api/telegram/webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Telegram webhook set to: ${webhookUrl}`);
    } else {
      // Use polling for development
      await bot.launch();
      console.log('✅ Telegram bot started with polling');
    }

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('Error starting Telegram bot:', error);
  }
};

export const getTelegramBot = () => bot;
