const express = require('express');
const router = express.Router();
const beneficiaryController = require('../controllers/beneficiaryController');

// GET /api/beneficiaries — List all beneficiaries with enrolled programs and history
router.get('/', beneficiaryController.getAllBeneficiaries);

// GET /api/beneficiaries/:id — Get detailed beneficiary profile
router.get('/:id', beneficiaryController.getBeneficiaryById);

// PUT /api/beneficiaries/:id/verify — Admin verification action (verify, unverify, pending)
router.put('/:id/verify', beneficiaryController.verifyBeneficiary);

// POST /api/beneficiaries/:id/history — Add timeline / case note entry
router.post('/:id/history', beneficiaryController.addBeneficiaryHistory);

// DELETE /api/beneficiaries/:id — Delete beneficiary
router.delete('/:id', beneficiaryController.deleteBeneficiary);

module.exports = router;
