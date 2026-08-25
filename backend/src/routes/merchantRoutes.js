import express from 'express';
import { getMerchant, depositFunds } from '../controllers/merchantController.js';
import { protectMerchant } from '../middleware/auth.js';

const router = express.Router();

router.use(protectMerchant);
router.get('/me', getMerchant);
router.post('/deposit', depositFunds);

export default router;
