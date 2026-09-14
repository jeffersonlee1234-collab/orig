const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base upload directories exist
const baseUploadDir = path.join(__dirname, '../uploads');
const soloParentDir = path.join(baseUploadDir, 'solo-parent');
const childWelfareDir = path.join(baseUploadDir, 'child-welfare');
const aicsDir = path.join(baseUploadDir, 'aics');
const livelihoodDir = path.join(baseUploadDir, 'livelihood');

[baseUploadDir, soloParentDir, childWelfareDir, aicsDir, livelihoodDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure dynamic storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destDir = baseUploadDir;
    const url = (req.originalUrl || req.baseUrl || '').toLowerCase();

    if (url.includes('child-welfare')) {
      destDir = childWelfareDir;
    } else if (url.includes('solo-parent')) {
      destDir = soloParentDir;
    } else if (url.includes('aics')) {
      destDir = aicsDir;
    } else if (url.includes('livelihood')) {
      destDir = livelihoodDir;
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${timestamp}-${random}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heif',
    'image/heic',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heif', '.heic', '.pdf', '.docx'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
});

module.exports = upload;