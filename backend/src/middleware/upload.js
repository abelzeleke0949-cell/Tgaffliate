import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Used for product catalog images (the only image upload in the app — campaigns just
// reference existing products, they don't take their own uploads).
export const uploadDir = path.join(process.cwd(), 'uploads', 'products');
export const uploadUrlPrefix = '/uploads/products';
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
});

// Deletes files multer already wrote to disk when a request fails validation
// after upload but before the record is actually created.
export const deleteUploadedFiles = (files = []) => {
  for (const file of files) {
    fs.unlink(file.path, () => {});
  }
};
