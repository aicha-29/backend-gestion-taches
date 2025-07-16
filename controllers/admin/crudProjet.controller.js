const Project = require('../../models/project');
const User = require('../../models/user');
const Task = require('../../models/task');
const { upload, processImage } = require('../../utils/upload');
const fs = require('fs');
const path = require('path');



const buildImageUrls = (req, project) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  // Si le chemin commence déjà par "uploads/"
  if (project.logo && project.logo.startsWith('uploads/')) {
    return {
      logoUrl: project.logo ? `${baseUrl}/public/${project.logo}` : null,
      thumbnailUrl: project.thumbnail ? `${baseUrl}/public/${project.thumbnail}` : null
    };
  }else{
  // Pour la rétrocompatibilité avec les anciens chemins
  return {
    logoUrl: project.logo ? `${baseUrl}/public/uploads/projects/originals/${project.logo}` : null,
    thumbnailUrl: project.thumbnail ? `${baseUrl}/public/uploads/projects/thumbnails/${project.thumbnail}` : null
  };
};
};

// CREATE - Créer un nouveau projet avec upload d'image
exports.createProject = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      await processImage(req, res, async () => {
        const { 
          name, 
          description, 
          company, 
          city, 
          endDate, 
          priority,
          assignedEmployeesCINs,
          startDate
        } = req.body;

        // Validation
        if (!name || !company || !city) {
          if (req.file) fs.unlinkSync(req.file.path); // Nettoyer si échec validation
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
          logo: req.file?.filename || null,
          thumbnail: req.file?.filename || null
        });

        // Assignation des employés (inchangé)
        if (assignedEmployeesCINs?.length > 0) {
          const employees = await User.find({ 
            cin: { $in: assignedEmployeesCINs },
            role: 'employee'
          }).select('_id');

          if (employees.length !== assignedEmployeesCINs.length) {
            const missingCINs = assignedEmployeesCINs.filter(cin => 
              !employees.some(e => e.cin === cin)
            );
            if (req.file) {
              fs.unlinkSync(req.file.path);
              if (req.file.thumbnail) {
                fs.unlinkSync(path.join('public', req.file.thumbnail));
              }
            }
            return res.status(404).json({ 
              success: false,
              message: 'Certains CINs ne correspondent à aucun employé',
              missingCINs
            });
          }
          newProject.assignedEmployees = employees.map(emp => emp._id);
        }

        await newProject.save();

        res.status(201).json({ 
          success: true,
          message: 'Projet créé avec succès',
          data: {
            ...newProject.toObject(),
            ...buildImageUrls(req, newProject)
          }
        });
      });
    });
  } catch (error) {
    console.error('Error creating project:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
      if (req.file.thumbnail) {
        fs.unlinkSync(path.join('public', req.file.thumbnail));
      }
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création'
    });
  }
};



// READ - Obtenir tous les projets (version simplifiée pour les cartes)
exports.getAllProjectsForCards = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate({
        path: 'assignedEmployees',
        select: '  profilePhoto profilePhotoThumb name position',
        match: { role: 'employee' }
      })
      .select('name logo  thumbnail city priority status progression company')
      .sort({ createdAt: -1 })
      .lean();

    const baseUrl = `${req.protocol}://${req.get('host')}/public/projects/`;
    const formattedProjects = projects.map(project => {
    const { logoUrl, thumbnailUrl } = buildImageUrls(req, project);
      return{
      ...project,
      logoUrl, 
      thumbnailUrl,
      assignedEmployees: project.assignedEmployees?.map(emp => ({
        name: emp.name,
        position: emp.position,
        profilePhoto: emp.profilePhotoThumb ? `${baseUrl}/${emp.profilePhotoThumb}` : null
      }))|| []
    };
  });

    res.json(formattedProjects);
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur lors de la récupération des projets" 
    });
  }
};



exports.getProjectDetails = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate({
        path: 'assignedEmployees',
        select: 'name profilePhoto profilePhotoThumb position',
        match: { role: 'employee' }
      })
      .select('-__v -createdAt')
      .lean();

    if (!project) {
      return res.status(404).json({ 
        success: false,
        message: "Projet non trouvé" 
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/public/uploads/projects`;
    
    // Formatage des dates
    project.startDate = project.startDate?.toISOString().split('T')[0];
    project.endDate = project.endDate?.toISOString().split('T')[0];

    // Ajout des URLs
    const {logoUrl ,thumbnailUrl} = buildImageUrls(req,project);
    project.logoUrl=logoUrl;
    project.thumbnailUrl=thumbnailUrl;
    // Formatage des employés
    project.assignedEmployees = project.assignedEmployees?.map(emp => ({
      ...emp,
      profilePhoto: emp.profilePhoto ? `${baseUrl}/${emp.profilePhoto}` : null,
      profilePhotoThumb: emp.profilePhotoThumb ? `${baseUrl}/${emp.profilePhotoThumb}` : null
    })) || [];

    res.json({
      success: true,
      data: project
    });
  } catch (err) {
    console.error('Error fetching project details:', err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur lors de la récupération du projet" 
    });
  }
};






exports.updateProject = async (req, res) => {
  try {
    
    
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      await processImage(req, res, async () => {
        const { id } = req.params;
        const {
          name,
          description,
          company,
          city,
          endDate,
          status,
          priority,
          assignedEmployeesCINs,
          removeLogo
        } = req.body;

        // Vérifier l'existence du projet
        const project = await Project.findById(id);
        if (!project) {
          if (req.file) {
            fs.unlinkSync(req.file.path);
            if (req.file.thumbnail) {
              fs.unlinkSync(path.join('public', req.file.thumbnail));
            }
          }
          return res.status(404).json({
            success: false,
            message: 'Projet non trouvé'
          });
        }

        // Sauvegarder les anciens chemins pour nettoyage
        const oldLogo = project.logo;
        const oldThumbnail = project.thumbnail;

        // Mise à jour des champs de base
        project.name = name || project.name;
        project.description = description || project.description;
        project.company = company || project.company;
        project.city = city || project.city;
        project.endDate = endDate || project.endDate;
        project.status = status || project.status;
        project.priority = priority || project.priority;

        // Gestion du logo
        if (removeLogo === 'true') {
          // Supprimer le logo existant
          if (project.logo) {
            fs.unlinkSync(path.join('public', project.logo));
            if (project.thumbnail) fs.unlinkSync(path.join('public', project.thumbnail));
            project.logo = null;
            project.thumbnail = null;
          }
        } else if (req.file) {
          // Mettre à jour avec un nouveau logo
          project.logo = req.file.logoPath;
          project.thumbnail = req.file.thumbnail;
        }

        // Gestion des employés assignés (inchangé)
        if (assignedEmployeesCINs !== undefined) {
          if (assignedEmployeesCINs.length > 0) {
            const employees = await User.find({
              cin: { $in: assignedEmployeesCINs },
              role: 'employee'
            }).select('_id');

            if (employees.length !== assignedEmployeesCINs.length) {
              const foundCINs = employees.map(emp => emp.cin);
              const missingCINs = assignedEmployeesCINs.filter(cin => !foundCINs.includes(cin));
              if (req.file) {
                fs.unlinkSync(req.file.path);
                if (req.file.thumbnail) {
                  fs.unlinkSync(path.join('public', req.file.thumbnail));
                }
              }
              return res.status(404).json({
                success: false,
                message: 'Certains employés n\'existent pas',
                missingCINs
              });
            }
            project.assignedEmployees = employees.map(emp => emp._id);
          } else {
            project.assignedEmployees = [];
          }
        }

        await project.save();

        // Supprimer les anciennes images si remplacées
        if ((req.file || removeLogo === 'true') && oldLogo) {
          fs.unlinkSync(path.join('public', oldLogo));
          if (oldThumbnail) fs.unlinkSync(path.join('public', oldThumbnail));
        }

        const updatedProject = await Project.findById(id)
          .populate({
            path: 'assignedEmployees',
            select: 'profilePhoto profilePhotoThumb',
            match: { role: 'employee' }
          })
          .lean();

        // Construire les URLs pour les employés aussi
        const baseUrl = `${req.protocol}://${req.get('host')}/public`;
        updatedProject.assignedEmployees = updatedProject.assignedEmployees?.map(emp => ({
          ...emp,
          profilePhoto: emp.profilePhoto ? `${baseUrl}/${emp.profilePhoto}` : null,
          profilePhotoThumb: emp.profilePhotoThumb ? `${baseUrl}/${emp.profilePhotoThumb}` : null
        })) || [];

        res.json({
          success: true,
          data: {
            ...updatedProject,
            ...buildImageUrls(req, updatedProject)
          }
        });
      });
    });
  } catch (error) {
    console.error('Error updating project:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
      if (req.file.thumbnail) {
        fs.unlinkSync(path.join('public', req.file.thumbnail));
      }
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour',
      error: error.message
    });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Trouver le projet pour obtenir les chemins des images
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Supprimer les tâches associées
    await Task.deleteMany({ project: id });

    // Supprimer les images du projet
    if (project.logo) {
      fs.unlinkSync(path.join('public', project.logo));
      if (project.thumbnail) {
        fs.unlinkSync(path.join('public', project.thumbnail));
      }
    }

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