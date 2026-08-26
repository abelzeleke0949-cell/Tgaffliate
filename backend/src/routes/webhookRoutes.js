import express from 'express';
import {
  chapaWebhook,
  initializePurchase,
  purchaseWebhook,
  verifyPurchase,
  trackClick,
} from '../controllers/webhookController.js';

const router = express.Router();

// Merchant wallet deposit webhook
router.post('/chapa', chapaWebhook);

// Buyer purchase (real Chapa checkout)
router.post('/purchase/initialize', initializePurchase);
router.post('/purchase/callback', purchaseWebhook);
router.get('/purchase/verify/:txRef', verifyPurchase);

router.post('/track-click', trackClick);

export default router;
