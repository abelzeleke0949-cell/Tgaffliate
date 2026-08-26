import express from 'express';
import { getMerchant, initializeDeposit, verifyDeposit } from '../controllers/merchantController.js';
import { protectMerchant } from '../middleware/auth.js';

const router = express.Router();

router.use(protectMerchant);
router.get('/me', getMerchant);
router.post('/deposit/initialize', initializeDeposit);
router.get('/deposit/verify/:txRef', verifyDeposit);

export default router;
