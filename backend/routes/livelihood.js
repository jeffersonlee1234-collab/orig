// routes/livelihood.js
const express = require('express');
const router = express.Router();
const livelihoodController = require('../controllers/livelihoodController');
const upload = require('../middleware/fileUpload');

// Reset / Clear All Applications (Admin Testing)
router.all('/applications/reset', livelihoodController.resetApplications);

// Applications
router.post('/applications', livelihoodController.createApplication);
router.get('/applications', livelihoodController.getApplications);
router.get('/applications/:referenceNumber', livelihoodController.getApplicationByReference);
router.put('/applications/:id', livelihoodController.updateApplication);
router.patch('/applications/:id/status', livelihoodController.updateStatus);

// Capital / Materials Assistance (Part 2)
router.post('/applications/:id/assistance', livelihoodController.saveAssistance);
router.put('/applications/:id/assistance', livelihoodController.saveAssistance);

// Livelihood Monitoring (Part 3)
router.post('/applications/:id/monitoring', livelihoodController.addMonitoringLog);

// Supporting Documents upload
router.post('/upload-documents', upload.array('documents', 10), livelihoodController.uploadDocuments);

module.exports = router;
