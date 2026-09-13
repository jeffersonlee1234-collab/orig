// routes/soloParentRoutes.js
const express = require('express');
const router = express.Router();
const soloParentController = require('../controllers/soloParentController');
const auth = require('../middleware/auth'); // Authentication middleware
const adminAuth = require('../middleware/adminAuth'); // Admin authentication
const uploadFiles = require('../middleware/fileUpload'); // Multer config

// User routes
router.post(
  '/create',
  soloParentController.createApplication
);

router.post(
  '/:applicationId/upload-documents',
  uploadFiles.array('documents', 10),
  soloParentController.uploadDocuments
);

router.delete(
  '/:applicationId/remove-document/:documentId/:filename',
  soloParentController.removeDocument
);

router.post(
  '/:applicationId/submit',
  soloParentController.submitApplication
);

router.get(
  '/admin/all',
  auth,
  adminAuth,
  soloParentController.getAllApplications
);

router.get(
  '/eligibility/:userId',
  soloParentController.checkEligibility
);

router.patch(
  '/:applicationId/update',
  auth,
  soloParentController.updateApplicationData
);

router.get(
  '/user/:userId',
  soloParentController.getUserApplications
);

router.get(
  '/reference/:referenceNumber',
  soloParentController.getApplicationByReference
);

router.post(
  '/:applicationId/cancel',
  auth,
  soloParentController.cancelApplication
);

router.get(
  '/admin/:applicationId',
  auth,
  adminAuth,
  soloParentController.getApplicationById
);

router.patch(
  '/:applicationId/admin/update-status',
  auth,
  adminAuth,
  soloParentController.updateApplicationStatus
);

router.delete('/clear-all', soloParentController.clearApplications);
router.delete('/admin/clear-all', soloParentController.clearApplications);
router.delete('/admin/:applicationId', soloParentController.deleteApplication);
router.delete('/:applicationId', soloParentController.deleteApplication);

module.exports = router;