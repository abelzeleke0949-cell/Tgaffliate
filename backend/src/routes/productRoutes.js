import express from 'express';
import {
  createProduct,
  getMyProducts,
  getProduct,
  updateProduct,
} from '../controllers/productController.js';
import { protectMerchant } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public - Mini App needs to render individual products
router.get('/:id', getProduct);

// Private - merchant catalog management
router.post('/', protectMerchant, upload.array('images', 6), createProduct);
router.get('/mine/list', protectMerchant, getMyProducts);
router.put('/:id', protectMerchant, updateProduct);

export default router;
