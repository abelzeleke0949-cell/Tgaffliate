import express from 'express';
import {
  processConversion,
  trackClick,
} from '../controllers/webhookController.js';

const router = express.Router();

// Webhook routes
router.post('/chapa-mock', processConversion);
router.post('/track-click', trackClick);

export default router;
