import Merchant from '../models/Merchant.js';
import { generateToken } from '../utils/generateToken.js';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// @desc    Register a new merchant account
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { businessName, email, password, contactPhone, address } = req.body;

    if (!businessName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Business name, email, and password are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    const existing = await Merchant.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const merchant = await Merchant.create({
      businessName,
      email,
      password,
      contactPhone,
      address,
    });

    const token = generateToken(merchant._id, 'merchant');

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          email: merchant.email,
          walletBalance: merchant.walletBalance,
        },
      },
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ success: false, message: 'Error creating account', error: error.message });
  }
};

// @desc    Log a merchant in
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const merchant = await Merchant.findOne({ email: email.toLowerCase() }).select('+password');
    if (!merchant || !(await merchant.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!merchant.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }

    const token = generateToken(merchant._id, 'merchant');

    res.status(200).json({
      success: true,
      data: {
        token,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          email: merchant.email,
          walletBalance: merchant.walletBalance,
        },
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ success: false, message: 'Error logging in', error: error.message });
  }
};

// @desc    Get the logged-in merchant's profile
// @route   GET /api/auth/me
// @access  Private (merchant)
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.merchant._id,
      businessName: req.merchant.businessName,
      email: req.merchant.email,
      walletBalance: req.merchant.walletBalance,
      totalDeposited: req.merchant.totalDeposited,
      totalSpent: req.merchant.totalSpent,
    },
  });
};
