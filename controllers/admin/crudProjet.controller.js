const Project = require('../../models/project');
const User = require('../../models/user');
const Task=require('../../models/task')

//creer un projet
exports.createProject = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      company, 
      city, 
      endDate, 
      priority,
      logo,
      assignedEmployeesCINs
    } = req.body;

    // Validation
    if (!name || !company || !city) {
      return res.status(400).json({
        success: false,
        message: 'Les champs name, company et city sont obligatoires'
      });
    }

   // Création du projet
    const newProject = new Project({
      name,
      description,
      company,
      city,
      endDate,
      priority,
      logo
    });

    // Assignation des employés
    if (assignedEmployeesCINs?.length > 0) {
      const employees = await User.find({ 
        cin: { $in: assignedEmployeesCINs },
        role: 'employee'
      }).select('_id');

      if (employees.length !== assignedEmployeesCINs.length) {
        const missingCINs = assignedEmployeesCINs.filter(cin => 
          !employees.some(e => e.cin === cin)
        );
        return res.status(404).json({ 
          success: false,
          message: 'Certains CINs ne correspondent à aucun employé',
          missingCINs
        });
      }

      newProject.assignedEmployees = employees.map(emp => emp._id);
    }

    await newProject.save();

    // Réponse simplifiée avec seulement un succès
    res.status(201).json({ 
      success: true,
      message: 'Projet créé avec succès'
    });

  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création'
    });
  }
};




//update de projet 


exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      company,
      city,
      endDate,
      status,
      priority,
      logo,
      assignedEmployeesCINs // Nouveau tableau de CNI
    } = req.body;

    // Vérifier l'existence du projet
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Mise à jour des champs de base
    project.name = name || project.name;
    project.description = description || project.description;
    project.company = company || project.company;
    project.city = city || project.city;
    project.endDate = endDate || project.endDate;
    project.status = status || project.status;
    project.priority = priority || project.priority;
    project.logo = logo || project.logo;

    // Gestion des employés assignés (si CNI fournis)
    if (assignedEmployeesCINs !== undefined) {
      if (assignedEmployeesCINs.length > 0) {
        // Trouver les IDs des employés correspondant aux CNI
        const employees = await User.find({
          cin: { $in: assignedEmployeesCINs },
          role: 'employee'
        }).select('_id');

        // Vérifier si tous les CNI existent
        if (employees.length !== assignedEmployeesCINs.length) {
          const foundCINs = employees.map(emp => emp.cin);
          const missingCINs = assignedEmployeesCINs.filter(cin => !foundCINs.includes(cin));
          
          return res.status(404).json({
            success: false,
            message: 'Certains employés n\'existent pas',
            missingCINs
          });
        }

        project.assignedEmployees = employees.map(emp => emp._id);
      } else {
        // Si tableau vide, on supprime toutes les assignations
        project.assignedEmployees = [];
      }
    }

    await project.save();

    // Réponse formatée cohérente avec les autres endpoints
    const updatedProject = await Project.findById(id)
      .populate({
        path: 'assignedEmployees',
        select: 'profilePhoto',
        match: { role: 'employee' }
      })
      .select('name logo city priority status progression company')
      .lean();

    res.json({
      success: true,
      data: {
        ...updatedProject,
        assignedEmployees: updatedProject.assignedEmployees?.map(e => e.profilePhoto) || []
      }
    });

  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour',
      error: error.message
    });
  }
};

//tous les projets 
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


//supprimer un projet avec ses taches associer 


exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier l'existence du projet
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Supprimer les tâches associées en premier (important pour les contraintes de référence)
    await Task.deleteMany({ project: id });


    // Supprimer le projet
    await Project.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Projet et tâches associées supprimés avec succès'
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression',
      error: error.message
    });
  }
};

