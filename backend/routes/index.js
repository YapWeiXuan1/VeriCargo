const express = require('express');
const router = express.Router();
const authController = require('../controller/AuthController');
const requireAuth = require('../middleware/auth')

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.put('/auth/profile', requireAuth, authController.updateProfile);
router.post('/auth/reset-password', requireAuth, authController.resetPassword);

module.exports = router;