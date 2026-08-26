import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginAdmin,
  getStats,
  listMerchants,
  updateMerchantStatus,
  listCampaigns,
  updateCampaignStatus,
  approveCampaign,
  rejectCampaign,
  listUsers,
  listSessions,
} from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

router.post('/login', authLimiter, loginAdmin);

router.use(protectAdmin);
router.get('/stats', getStats);
router.get('/merchants', listMerchants);
router.patch('/merchants/:id', updateMerchantStatus);
router.get('/campaigns', listCampaigns);
router.patch('/campaigns/:id', updateCampaignStatus);
router.patch('/campaigns/:id/approve', approveCampaign);
router.patch('/campaigns/:id/reject', rejectCampaign);
router.get('/users', listUsers);
router.get('/sessions', listSessions);

export default router;
