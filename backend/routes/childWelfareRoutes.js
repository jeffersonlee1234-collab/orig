// routes/childWelfareRoutes.js
const express = require('express');
const router = express.Router();
const childWelfareController = require('../controllers/childWelfareController');
const uploadFiles = require('../middleware/fileUpload');

router.post('/create', childWelfareController.createApplication);

router.post(
  '/:applicationId/upload-documents',
  uploadFiles.array('documents', 10),
  childWelfareController.uploadDocuments
);

router.delete(
  '/:applicationId/remove-document/:documentId/:filename',
  childWelfareController.removeDocument
);

router.post('/:applicationId/submit', childWelfareController.submitApplication);

router.get('/user/:userId', childWelfareController.getUserApplications);

router.get('/reference/:referenceNumber', childWelfareController.getApplicationByReference);

router.post('/:applicationId/cancel', childWelfareController.cancelApplication);

// Admin routes
router.get('/admin/all', childWelfareController.getAllApplications);
router.get('/admin/:applicationId', childWelfareController.getApplicationById);
router.patch('/:applicationId/admin/update-status', childWelfareController.updateApplicationStatus);
router.delete('/clear-all', childWelfareController.clearApplications);
router.delete('/admin/clear-all', childWelfareController.clearApplications);
router.delete('/admin/:applicationId', childWelfareController.deleteApplication);
router.delete('/:applicationId', childWelfareController.deleteApplication);

module.exports = router;