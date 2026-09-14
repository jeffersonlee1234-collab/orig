const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');

// Mahalaga: mauna ang '/deleted' bago ang '/:id' routes sa Express,
// para hindi ma-match ang "deleted" bilang isang :id value.
router.get('/deleted', activityLogController.getDeletedActivityLog);
router.get('/', activityLogController.getActivityLog);

router.patch('/:id/soft-delete', activityLogController.softDeleteActivity);
router.patch('/:id/restore', activityLogController.restoreActivity);
router.delete('/:id', activityLogController.permanentlyDeleteActivity);

module.exports = router;