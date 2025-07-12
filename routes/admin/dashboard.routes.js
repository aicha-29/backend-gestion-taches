const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');
const dashboardController = require('../../controllers/admin/dashboard.controller');

router.get('/stats', 
  authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  dashboardController.getStats
);

module.exports = router;