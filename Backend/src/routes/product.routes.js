const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticateUser, requireAdmin } = require('../middleware/auth.middleware');

// Public routes
router.get('/', productController.getAll);
router.get('/search', productController.search);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getById);

// Admin-only routes
router.post('/', authenticateUser, requireAdmin, productController.create);
router.put('/:id', authenticateUser, requireAdmin, productController.update);
router.delete('/:id', authenticateUser, requireAdmin, productController.remove);

module.exports = router;
