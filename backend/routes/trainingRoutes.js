// backend/routes/trainingRoutes.js
const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');

// Available Training Programs
router.get('/programs', trainingController.getAvailablePrograms);

// Applications
router.get('/applications', trainingController.getApplications);
router.post('/apply', trainingController.applyForTraining);
router.patch('/applications/:id/status', trainingController.updateApplicationStatus);
router.delete('/applications/:id', trainingController.deleteApplication);

// Reset (testing)
router.all('/reset', trainingController.resetApplications);

module.exports = router;
