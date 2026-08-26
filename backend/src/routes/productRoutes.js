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

// Private - merchant catalog management (must come before /:id to avoid matching "mine" as an id)
router.get('/mine/list', protectMerchant, getMyProducts);
router.post('/', protectMerchant, upload.array('images', 6), createProduct);
router.put('/:id', protectMerchant, updateProduct);

// Public - Mini App needs to render individual products
router.get('/:id', getProduct);

export default router;
