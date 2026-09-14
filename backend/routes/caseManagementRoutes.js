// routes/caseManagementRoutes.js
const express = require('express');
const router = express.Router();
const caseManagementController = require('../controllers/caseManagementController');

// GET all integrated cases
router.get('/cases', caseManagementController.getAllCases);

// PUT update case status / details
router.put('/case/:caseNumber/status', caseManagementController.updateCaseStatus);

// POST add referral
router.post('/case/:caseNumber/referral', caseManagementController.addReferral);

// POST add monitoring log
router.post('/case/:caseNumber/monitoring', caseManagementController.addMonitoring);

module.exports = router;
