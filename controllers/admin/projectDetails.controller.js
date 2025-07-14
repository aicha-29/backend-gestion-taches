const Project = require('../../models/project');
const User = require('../../models/user');

exports.getProjectDetails = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate({
        path: 'assignedEmployees',
        select: 'name profilePhoto position -_id', // Champs spécifiques sans l'ID
        match: { role: 'employee' } // Filtre employés seulement
      })
      .select('-__v -createdAt -assignedEmployees._id') // Exclusion des champs inutiles
      .lean(); // Conversion en objet simple

    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    // Formatage des dates
    project.startDate = project.startDate?.toISOString().split('T')[0];
    project.endDate = project.endDate?.toISOString().split('T')[0];

    res.json(project);
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};