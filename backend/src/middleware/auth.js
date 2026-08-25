import jwt from 'jsonwebtoken';
import Merchant from '../models/Merchant.js';
import Admin from '../models/Admin.js';

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return null;
};

// Requires a valid merchant JWT; attaches req.merchant
export const protectMerchant = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'merchant') {
      return res.status(403).json({ success: false, message: 'Merchant access required' });
    }

    const merchant = await Merchant.findById(decoded.id);
    if (!merchant || !merchant.isActive) {
      return res.status(401).json({ success: false, message: 'Merchant account not found or inactive' });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Requires a valid admin JWT; attaches req.admin
export const protectAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};
