import Product from '../models/Product.js';
import { CATEGORIES } from '../constants/categories.js';
import { deleteUploadedFiles, uploadUrlPrefix } from '../middleware/upload.js';

// @desc    Create a product in the logged-in merchant's catalog
// @route   POST /api/products
// @access  Private (merchant)
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stockQuantity } = req.body;
    const files = req.files || [];

    if (!name || !description || !description.trim() || !price || !category) {
      deleteUploadedFiles(files);
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required',
      });
    }

    if (!CATEGORIES.includes(category)) {
      deleteUploadedFiles(files);
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    if (Number(price) <= 0) {
      deleteUploadedFiles(files);
      return res.status(400).json({ success: false, message: 'Price must be a positive number' });
    }

    if (files.length < 3) {
      deleteUploadedFiles(files);
      return res.status(400).json({
        success: false,
        message: 'At least 3 product images are required',
      });
    }

    const product = await Product.create({
      merchantId: req.merchant._id,
      name,
      description: description.trim(),
      images: files.map((file) => `${uploadUrlPrefix}/${file.filename}`),
      price: Number(price),
      category,
      stockQuantity: stockQuantity !== undefined && stockQuantity !== '' ? Number(stockQuantity) : null,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Error in createProduct:', error);
    res.status(500).json({ success: false, message: 'Error creating product', error: error.message });
  }
};

// @desc    List the logged-in merchant's own products (any status)
// @route   GET /api/products/mine
// @access  Private (merchant)
export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ merchantId: req.merchant._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error('Error in getMyProducts:', error);
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
};

// @desc    Get a single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error('Error in getProduct:', error);
    res.status(500).json({ success: false, message: 'Error fetching product', error: error.message });
  }
};

// @desc    Update a product owned by the logged-in merchant (text fields + isActive only)
// @route   PUT /api/products/:id
// @access  Private (merchant, must own the product)
export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stockQuantity, isActive } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (String(product.merchantId) !== String(req.merchant._id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to modify this product' });
    }

    if (category !== undefined && !CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category;
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity === '' ? null : Number(stockQuantity);
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error('Error in updateProduct:', error);
    res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
  }
};
