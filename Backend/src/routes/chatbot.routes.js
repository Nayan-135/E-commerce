const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');

router.post('/message', chatbotController.handleMessage);

module.exports = router;
