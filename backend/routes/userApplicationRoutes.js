const express = require('express');
const router = express.Router();
const userApplicationController = require('../controllers/userApplicationController');

// Deleted list
router.get('/deleted', userApplicationController.getDeletedApplications);

// Soft delete
router.post('/delete', userApplicationController.archiveApplication);
router.post('/archive', userApplicationController.archiveApplication);

// Restore
router.post('/restore', userApplicationController.restoreApplication);

// Permanent delete
router.post('/permanent-delete', userApplicationController.permanentDeleteApplication);

// Fallback
router.delete('/:id', userApplicationController.archiveApplication);
router.delete('/:category/:id', userApplicationController.archiveApplication);

module.exports = router;
