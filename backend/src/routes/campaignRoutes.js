import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getMyCampaigns,
  getCampaign,
  updateCampaign,
  getCampaignStats,
} from '../controllers/campaignController.js';
import { protectMerchant } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public - used by the Telegram Mini App to browse active campaigns
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.get('/:id/stats', getCampaignStats);

// Private - merchant dashboard
router.post('/', protectMerchant, upload.array('images', 6), createCampaign);
router.get('/mine/list', protectMerchant, getMyCampaigns);
router.put('/:id', protectMerchant, updateCampaign);

export default router;
