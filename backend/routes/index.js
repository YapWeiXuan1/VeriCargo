const express = require('express');
const router = express.Router();
const authController = require('../controller/AuthController');
const requireAuth = require('../middleware/auth')
const walletController = require('../controller/walletController');
const proofController = require('../controller/proofController');
const notificationController = require('../controller/notificationController');
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', requireAuth, authController.me);
router.put('/auth/profile', requireAuth, authController.updateProfile);
router.post('/auth/reset-password', requireAuth, authController.resetPassword);
router.get('/carriers', requireAuth, authController.searchCarriers);
router.get('/wallet/status', requireAuth, walletController.getWalletStatus);
router.post('/wallet/request-challenge', requireAuth, walletController.requestWalletChallenge);
router.post('/wallet/verify-challenge', requireAuth, walletController.verifyWalletChallenge);
router.post('/proofs', requireAuth, proofController.uploadProofImage);
router.get('/proofs/:proofHash', requireAuth, proofController.getProofImage);
router.get('/notifications', requireAuth, notificationController.list);
router.post('/notifications/sync', requireAuth, notificationController.sync);
router.patch('/notifications/read-all', requireAuth, notificationController.markAllRead);
router.patch('/notifications/dismiss-all', requireAuth, notificationController.dismissAll);
router.patch('/notifications/:id/dismiss', requireAuth, notificationController.dismiss);
router.patch('/notifications/:id/read', requireAuth, notificationController.markRead);

module.exports = router;
