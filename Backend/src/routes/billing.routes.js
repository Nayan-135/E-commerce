const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');

router.get('/addresses', billingController.getAddresses);
router.post('/addresses', billingController.addAddress);
router.put('/addresses/:id', billingController.updateAddress);
router.delete('/addresses/:id', billingController.deleteAddress);
router.put('/addresses/:id/default', billingController.setDefault);

module.exports = router;
