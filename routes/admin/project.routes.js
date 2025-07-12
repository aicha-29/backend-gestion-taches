const express = require('express');
const router = express.Router();
const projectController = require('../../controllers/admin/project.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// Nouvelle endpoint spécial cartes
router.get(
  '/cards',
  authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  projectController.getAllProjectsForCards
);

module.exports = router;