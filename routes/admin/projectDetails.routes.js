const express = require('express');
const router = express.Router();
const projectController = require('../../controllers/admin/projectDetails.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.get(
  '/:id', 
  authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  projectController.getProjectDetails
);

module.exports = router;