import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Merchant from '../models/Merchant.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import Session from '../models/Session.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Merchant.deleteMany({});
    await Campaign.deleteMany({});
    await User.deleteMany({});
    await Session.deleteMany({});

    // Create sample merchant with enough balance for all campaigns
    console.log('👤 Creating sample merchant...');
    const totalInitialBalance = 100000; // Increased to cover all campaign budgets
    const merchant = await Merchant.create({
      businessName: 'Ethiopian Coffee Co.',
      email: 'coffee@example.com',
      password: 'password123',
      walletBalance: totalInitialBalance,
      totalDeposited: totalInitialBalance,
      contactPhone: '+251911234567',
      address: 'Addis Ababa, Ethiopia',
    });

    console.log(`✅ Merchant created: ${merchant.businessName}`);

    // Create sample campaigns
    console.log('📢 Creating sample campaigns...');
    const campaigns = await Campaign.create([
      {
        merchantId: merchant._id,
        productName: 'Habesha Coffee Sampler Box',
        productDescription: 'Six single-origin Ethiopian roasts, freshly ground and delivered across Addis Ababa within 48 hours.',
        productPrice: 1250,
        totalBudget: 20000,
        budgetRemaining: 14500,
        cpaReward: 50,
        salesGenerated: 110,
        isActive: true,
      },
      {
        merchantId: merchant._id,
        productName: 'Addis Skincare Night Serum',
        productDescription: 'Natural skincare serum made with Ethiopian botanicals.',
        productPrice: 890,
        totalBudget: 12000,
        budgetRemaining: 9800,
        cpaReward: 80,
        salesGenerated: 27,
        isActive: true,
      },
      {
        merchantId: merchant._id,
        productName: 'Sheba Leather Laptop Sleeve',
        productDescription: 'Handcrafted leather laptop sleeve from Ethiopian artisans.',
        productPrice: 2500,
        totalBudget: 30000,
        budgetRemaining: 4200,
        cpaReward: 120,
        salesGenerated: 215,
        isActive: true,
      },
    ]);

    console.log(`✅ Created ${campaigns.length} campaigns`);

    // Update merchant's wallet balance (deduct campaign budgets)
    const totalBudgets = campaigns.reduce((sum, c) => sum + c.totalBudget, 0);
    const remainingBalance = totalInitialBalance - totalBudgets;
    
    console.log(`💰 Total campaign budgets: ${totalBudgets.toLocaleString('en-US')} ETB`);
    console.log(`💵 Remaining wallet balance: ${remainingBalance.toLocaleString('en-US')} ETB`);
    
    merchant.walletBalance = remainingBalance;
    merchant.totalSpent = totalBudgets;
    await merchant.save();

    // Create sample influencer user
    console.log('👥 Creating sample user...');
    const user = await User.create({
      telegramId: 'inf_123',
      username: 'selam_bekele',
      firstName: 'Selam',
      lastName: 'Bekele',
      role: 'influencer',
      earningsBalance: 150,
      totalEarnings: 2500,
      totalConversions: 50,
    });

    console.log(`✅ User created: @${user.username}`);

    // Create sample sessions
    console.log('📊 Creating sample sessions...');
    const sessions = await Session.create([
      {
        buyerTelegramId: '987654321',
        referrerId: user.telegramId,
        campaignId: campaigns[0]._id,
        status: 'converted',
        convertedAt: new Date(),
      },
      {
        buyerTelegramId: '123456789',
        referrerId: user.telegramId,
        campaignId: campaigns[1]._id,
        status: 'pending',
      },
    ]);

    console.log(`✅ Created ${sessions.length} sessions`);

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Merchants: 1`);
    console.log(`   Campaigns: ${campaigns.length}`);
    console.log(`   Users: 1`);
    console.log(`   Sessions: ${sessions.length}`);
    console.log(`\n💼 Merchant Details:`);
    console.log(`   🔑 ID: ${merchant._id}`);
    console.log(`   📧 Email: ${merchant.email}`);
    console.log(`   🔒 Password: password123`);
    console.log(`   💰 Initial Balance: ${totalInitialBalance.toLocaleString('en-US')} ETB`);
    console.log(`   💵 Current Balance: ${merchant.walletBalance.toLocaleString('en-US')} ETB`);
    console.log(`   📊 Total in Escrow: ${totalBudgets.toLocaleString('en-US')} ETB`);
    console.log(`\n👤 Test Influencer:`);
    console.log(`   🆔 Telegram ID: ${user.telegramId}`);
    console.log(`   👤 Username: @${user.username}`);
    console.log(`   💵 Balance: ${user.earningsBalance.toLocaleString('en-US')} ETB`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  await seedData();
  await mongoose.connection.close();
  console.log('\n👋 Database connection closed');
  process.exit(0);
};

run();
