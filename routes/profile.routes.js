const express = require('express');
const router = express.Router();
const  protect  = require('../middlewares/auth.middleware');
const  ProfileController  = require('../controllers/profile.controller');

// Route protégée par JWT
router.get('/', protect, ProfileController.getProfile);
module.exports = router;