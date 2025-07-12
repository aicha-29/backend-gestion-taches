const Project = require('../../models/project');
const User = require('../../models/user');

exports.getAllProjectsForCards = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate({
        path: 'assignedEmployees',
        select: 'profilePhoto', // Seulement la photo
        match: { role: 'employee' }
      })
      .select('name logo city priority status progression company') // Champs strictement nécessaires
      .sort({ createdAt: -1 })
      .lean(); // Conversion en objet JS simple

    // Transformation finale
    const formattedProjects = projects.map(project => ({
      ...project,
      assignedEmployees: project.assignedEmployees.map(e => e.profilePhoto)
    }));

    res.json(formattedProjects);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};