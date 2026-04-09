const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { requireAdmin } = require('../middleware/auth.middleware');

// Customer routes
router.post('/', orderController.create);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getById);
router.put('/:id/cancel', orderController.cancel);

// Admin routes
router.get('/', requireAdmin, orderController.getAll);
router.put('/:id/status', requireAdmin, orderController.updateStatus);

module.exports = router;
