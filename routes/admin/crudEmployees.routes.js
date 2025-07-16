// routes/employees.routes.js
const express = require('express');
const router = express.Router();
const employeesController = require('../../controllers/admin/crudEmployees.controller');

// GET /api/employees - Récupère tous les employés avec leurs projets
router.get('/', employeesController.getAllEmployeesWithProjects);

module.exports = router;