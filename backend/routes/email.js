const express = require('express');
const router = express.Router();
const {
  sendPwdApprovalEmail,
  sendSeniorCitizenApprovalEmail,
  sendSeniorBookletApprovalEmail,
  sendSoloParentApprovalEmail,
} = require('../services/emailService');

// POST /api/email/send-pwd-id
router.post('/send-pwd-id', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      pwdIdNumber,
      referenceNumber,
      disabilityType,
      bloodType,
      approvedDate,
      contactNumber,
      address,
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const result = await sendPwdApprovalEmail({
      recipientEmail,
      recipientName,
      pwdIdNumber,
      referenceNumber,
      disabilityType,
      bloodType,
      approvedDate,
      contactNumber,
      address,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in send-pwd-id endpoint:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// POST /api/email/send-senior-id
router.post('/send-senior-id', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      seniorIdNumber,
      referenceNumber,
      applicationType,
      bloodType,
      approvedDate,
      contactNumber,
      address,
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const result = await sendSeniorCitizenApprovalEmail({
      recipientEmail,
      recipientName,
      seniorIdNumber,
      referenceNumber,
      applicationType,
      bloodType,
      approvedDate,
      contactNumber,
      address,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in send-senior-id endpoint:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// POST /api/email/send-solo-parent-id
router.post('/send-solo-parent-id', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      soloParentIdNumber,
      referenceNumber,
      classification,
      applicationType,
      approvedDate,
      contactNumber,
      address,
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const result = await sendSoloParentApprovalEmail({
      recipientEmail,
      recipientName,
      soloParentIdNumber,
      referenceNumber,
      classification,
      applicationType,
      approvedDate,
      contactNumber,
      address,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in send-solo-parent-id endpoint:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// POST /api/email/send-senior-booklet
router.post('/send-senior-booklet', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      bookletNumber,
      oscaIdNumber,
      referenceNumber,
      bookletType,
      applicationType,
      approvedDate,
      contactNumber,
      address,
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const result = await sendSeniorBookletApprovalEmail({
      recipientEmail,
      recipientName,
      bookletNumber,
      oscaIdNumber,
      referenceNumber,
      bookletType: bookletType || 'medicine',
      applicationType: applicationType || 'Renewal',
      approvedDate,
      contactNumber,
      address,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in send-senior-booklet endpoint:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

module.exports = router;
