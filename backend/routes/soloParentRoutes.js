// routes/soloParentRoutes.js
const express = require('express');
const router = express.Router();
const soloParentController = require('../controllers/soloParentController');
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
  soloParentController.getAllApplications
);

router.get(
  '/applications',
  soloParentController.getAllApplications
);

router.get(
  '/eligibility/:userId',
  soloParentController.checkEligibility
);

router.patch(
  '/:applicationId/update',
  soloParentController.updateApplicationData
);

router.get(
  '/user/:userId',
  soloParentController.getUserApplications
);

router.get(
  '/verify-id/:idNumber',
  soloParentController.verifySoloParentId
);

router.get(
  '/reference/:referenceNumber',
  soloParentController.getApplicationByReference
);

router.post(
  '/:applicationId/cancel',
  soloParentController.cancelApplication
);

router.get(
  '/admin/:applicationId',
  soloParentController.getApplicationById
);

router.patch(
  '/:applicationId/admin/update-status',
  soloParentController.updateApplicationStatus
);

router.delete('/clear-all', soloParentController.clearApplications);
router.delete('/admin/clear-all', soloParentController.clearApplications);
router.delete('/admin/:applicationId', soloParentController.deleteApplication);
router.delete('/:applicationId', soloParentController.deleteApplication);

module.exports = router;