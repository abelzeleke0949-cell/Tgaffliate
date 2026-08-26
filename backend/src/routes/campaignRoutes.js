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

const router = express.Router();

// Private - merchant dashboard (must come before /:id to avoid matching "mine" as an id)
router.get('/mine/list', protectMerchant, getMyCampaigns);
router.post('/', protectMerchant, createCampaign);
router.put('/:id', protectMerchant, updateCampaign);

// Public - used by the Telegram Mini App to browse active campaigns
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.get('/:id/stats', getCampaignStats);

export default router;
