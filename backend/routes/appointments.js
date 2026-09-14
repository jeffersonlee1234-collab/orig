const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.get('/', appointmentController.getAppointments);
router.post('/', appointmentController.createAppointment);
router.put('/:id/schedule', appointmentController.scheduleAppointment);
router.put('/:id/complete', appointmentController.completeAppointment);
router.delete('/cleanup-user/:nameOrRef', appointmentController.deleteUserAppointments);
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;
