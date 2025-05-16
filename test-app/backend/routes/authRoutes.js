const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { clientSignup } = require('../controllers/clientController');
const { trainerSignup } = require('../controllers/trainerController');
const { default: AdminLogin } = require('../../src/pages/Admin_login');

// Auth routes
router.post('/register', registerUser);
router.post('/Client_login', loginUser);
router.post('/Client_signup', clientSignup);
router.post('/Admin_login', AdminLogin);

// Trainer auth route
router.post('/Trainer_signup', trainerSignup);

module.exports = router;
