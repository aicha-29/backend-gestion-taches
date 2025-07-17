const express = require('express');
const router = express.Router();
const crudProjectController = require('../../controllers/admin/crudProjet.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// Nouvelle endpoint spécial cartes
router.get(
  '/cards',
  authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  crudProjectController.getAllProjectsForCards
);


// Route protégée (ajoute un projet)
router.post(
  '/ajout',  
   authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  crudProjectController.createProject
);

router.put(
  '/update/:id',
   authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  crudProjectController.updateProject
);


// Suppression d'un projet
router.delete('/:id', 
 authMiddleware,
 roleMiddleware.roleMiddleware('admin'),
crudProjectController.deleteProject
);

router.get(
  '/:id', 
  authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  crudProjectController.getProjectDetails
);




module.exports = router;