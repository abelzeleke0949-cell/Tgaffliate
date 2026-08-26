import express from 'express';
import {
  processConversion,
  trackClick,
  chapaWebhook,
} from '../controllers/webhookController.js';

const router = express.Router();

// Webhook routes
router.post('/chapa-mock', processConversion);
router.post('/chapa', chapaWebhook);
router.post('/track-click', trackClick);

export default router;
