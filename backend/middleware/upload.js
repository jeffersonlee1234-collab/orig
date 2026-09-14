const multer = require('multer');

const storage = multer.memoryStorage();

const allowedTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpe?g|png|pdf)$/i;
  const hasValidType = allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/');
  const hasValidExtension = allowedExtensions.test(file.originalname);

  if (hasValidType || hasValidExtension) {
    cb(null, true);
  } else {
    cb(new Error('Hindi tanggap na file type. JPG, PNG, o PDF lang ang pwede.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

module.exports = upload;