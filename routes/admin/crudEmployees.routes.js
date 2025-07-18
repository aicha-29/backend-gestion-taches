// routes/employees.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');
const employeesController = require('../../controllers/admin/crudEmployees.controller');
const {uploadUserPhoto}=require('../../middlewares/upload');

// GET /api/employees - Récupère tous les employés avec leurs projets
router.get('/',  authMiddleware,
  roleMiddleware.roleMiddleware('admin')
  ,employeesController.getAllEmployeesWithProjects);

router.get('/detailse/:id', authMiddleware,
  roleMiddleware.roleMiddleware('admin'), 
    employeesController.getEmployeeDetails);

router.post('/ajout', authMiddleware,
  roleMiddleware.roleMiddleware('admin'), 
    employeesController.createEmployee);


router.put('/:id', authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  uploadUserPhoto, 
    employeesController.updateEmployee);

    
router.delete('/:id', authMiddleware,
  roleMiddleware.roleMiddleware('admin'),
  employeesController.deleteEmployee);



  
module.exports = router;