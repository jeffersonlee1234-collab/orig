const express = require('express');
const router = express.Router();
const financialAidController = require('../controllers/financialAidController');

router.get('/', financialAidController.getDisbursements);
router.get('/user/:refOrQcId', financialAidController.getUserDisbursements);
router.post('/', financialAidController.createDisbursement);
router.put('/:id/release', financialAidController.releaseDisbursement);
router.delete('/cleanup-user/:nameOrRef', financialAidController.deleteUserDisbursements);
router.delete('/:id', financialAidController.deleteDisbursement);
router.post('/cleanup', financialAidController.cleanupOrphanDisbursements);

module.exports = router;
