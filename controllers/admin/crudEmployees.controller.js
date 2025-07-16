// controllers/employees.controller.js
const User = require('../../models/user');
const Project = require('../../models/project');

exports.getAllEmployeesWithProjects = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('name position profilePhoto')
      .lean();

    const employeesWithProjects = await Promise.all(
      employees.map(async (employee) => {
        const projects = await Project.find({ assignedEmployees: employee._id })
          .select('logo')
          .lean();

        return {
          ...employee,
          projects: projects.map(project => project.logo)
        };
      })
    );

    res.status(200).json(employeesWithProjects);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Server error while fetching employees' });
  }
};