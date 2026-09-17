const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Eligibility Analysis route
router.post('/analyze-eligibility', aiController.analyzeEligibility);

// Interactive Social Worker AI Assistant Chat route
router.post('/assistant-chat', aiController.assistantChat);

// Health check route
router.get('/health', aiController.healthCheck);

module.exports = router;
