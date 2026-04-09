const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected
router.post('/logout', authenticateUser, authController.logout);
router.get('/profile', authenticateUser, authController.getProfile);
router.put('/profile', authenticateUser, authController.updateProfile);
router.put('/change-password', authenticateUser, authController.changePassword);

module.exports = router;
