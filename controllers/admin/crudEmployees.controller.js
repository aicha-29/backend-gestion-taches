const User = require('../../models/user');
const Project = require('../../models/project');
const Task=require('../../models/task');
const mongoose=require('mongoose');
const { uploadUserPhoto,processUserPhoto}=require('../../middlewares/upload');
const fs = require('fs');
const path = require('path');
const multer = require('multer');


exports.getAllEmployeesWithProjects = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('name position profilePhoto profilePhotoThumb') // Ajout de profilePhotoThumb
      .lean();

    const employeesWithProjects = await Promise.all(
      employees.map(async (employee) => {
        const projects = await Project.find({ assignedEmployees: employee._id })
          .select('logo')
          .lean();

        // Construire les URLs complets pour les photos
        const baseUrl = `${req.protocol}://${req.get('host')}/public/`;
        
        return {
          ...employee,
          profilePhoto: employee.profilePhoto ? baseUrl + employee.profilePhoto : null,
          profilePhotoThumb: employee.profilePhotoThumb ? baseUrl + employee.profilePhotoThumb : null,
          projects: projects.map(project => ({
            logo: project.logo ? baseUrl+'uploads/projects/originals/'+ project.logo : null,
            thumbnail:project.thumbnail ? baseUrl +'uploads/projects/thumbnails/'+project.thumbnail : null
          }))
        };
      })
    );

    res.status(200).json(employeesWithProjects);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Server error while fetching employees' });
  }
};



//details d'un employe



exports.getEmployeeDetails = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const baseUrl = `${req.protocol}://${req.get('host')}/public/`;

    // Récupérer les détails de l'employé
    const employee = await User.findById(employeeId)
      .select('name position email cin profilePhoto profilePhotoThumb')
      .lean();

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Récupérer les projets assignés avec plus de détails
    const projects = await Project.find({ assignedEmployees: employeeId })
      .select('name company priority logo thumbnail')
      .lean();

    // Formater la réponse
    const response = {
      employee: {
        ...employee,
        profilePhoto: employee.profilePhoto ? baseUrl + employee.profilePhoto : null,
        profilePhotoThumb: employee.profilePhotoThumb ? baseUrl + employee.profilePhotoThumb : null
      },
      projects: projects.map(project => ({
        name: project.name,
        company: project.company,
        priority: project.priority,
        logo: project.logo ? baseUrl+'uploads/projects/originals/' + project.logo : null,
        thumbnail: project.thumbnail ? baseUrl +'uploads/projects/thumbnails/'+ project.thumbnail : null
      }))
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ 
      message: 'Server error while fetching employee details',
      error: error.message 
    });
  }
};


exports.createEmployee = async (req, res) => {
  try {
    // Middleware pour gérer l'upload de photo
    uploadUserPhoto(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        // Erreur de Multer (ex: fichier trop volumineux)
        return res.status(400).json({ message: err.message });
      } else if (err) {
        // Autres erreurs
        return res.status(400).json({ message: err.message });
      }

      // Traitement de la photo si elle existe
      if (req.file) {
        await processUserPhoto(req, res, () => {});
      }

      // Validation des données requises
      const { name, email, password, position, cin,role } = req.body;
      if (!name || !email || !position || !cin || !password || !role) {
        // Supprimer le fichier uploadé si la validation échoue
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
      }

      // Vérifier si l'email existe déjà
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

         const existingCin = await User.findOne({ cin });
        if (existingCin) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Cet cin est déjà utilisé' });
      }
      // Créer le nouvel employé
      const newEmployee = new User({
        name,
        email,
        password,
        position,
        cin,
        role, // Définit automatiquement le rôle
        profilePhoto: req.file?.profilePhoto || null,
        profilePhotoThumb: req.file?.profilePhotoThumb || null
      });

      // Sauvegarder dans la base de données
      await newEmployee.save();

      // Réponse avec les données créées (sans le mot de passe)
      const employeeResponse = newEmployee.toObject();
      delete employeeResponse.password;

      res.status(201).json({
        message: 'Employé créé avec succès',
        employee: employeeResponse
      });
    });
  } catch (error) {
    // Nettoyage en cas d'erreur
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Error creating employee:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création de l\'employé',
      error: error.message 
    });
  }
};



//update d'un employee
exports.updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { name, email, position, cin, removePhoto ,password } = req.body;

    // Vérifier si l'employé existe
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Gestion de la suppression de photo
    let oldProfilePhoto = null;
    let oldProfileThumb = null;

    // Vérifier removePhoto avant même le middleware Multer
    if (removePhoto === 'true') {
      if (employee.profilePhoto) {
        oldProfilePhoto = employee.profilePhoto;
       // oldProfileThumb = employee.profilePhotoThumb;
        employee.profilePhoto = undefined;
       // employee.profilePhotoThumb = undefined;
      }
    }

    // Middleware pour l'upload de nouvelle photo
    uploadUserPhoto(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }

      // Si aucun fichier n'est envoyé mais removePhoto est true, sauvegarder maintenant
      if (!req.file && removePhoto === 'true') {
        await employee.save();
        
        // Supprimer les anciens fichiers
        if (oldProfilePhoto) {
          const oldPhotoPath = path.join('public', oldProfilePhoto);
          //const oldThumbPath = path.join('public', oldProfileThumb);
          if (fs.existsSync(oldPhotoPath)) fs.unlinkSync(oldPhotoPath);
         // if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);
        }

        return res.status(200).json({
          message: 'Photo supprimée avec succès',
          employee: employee.toObject()
        });
      }

      // Traitement normal si fichier est envoyé
      if (req.file) {
        await processUserPhoto(req, res, () => {});
        
        // Supprimer l'ancienne photo si elle existe
        if (employee.profilePhoto) {
          oldProfilePhoto = employee.profilePhoto;
          oldProfileThumb = employee.profilePhotoThumb;
        }

        // Mettre à jour avec la nouvelle photo
        employee.profilePhoto = req.file.profilePhoto;
        employee.profilePhotoThumb = req.file.profilePhotoThumb;
      }

      // Vérifier l'unicité de l'email si modifié
      if (email && email !== employee.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          // Nettoyer les fichiers uploadés si erreur
          if (req.file) {
            fs.unlinkSync(req.file.path);
            const thumbPath = path.join(path.dirname(req.file.path), 
                              path.basename(req.file.profilePhotoThumb));
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
          }
          return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
      }


        if (cin && cin !== employee.cin) {
        const existingUser = await User.findOne({ cin });
        if (existingUser) {
          // Nettoyer les fichiers uploadés si erreur
          if (req.file) {
            fs.unlinkSync(req.file.path);
            const thumbPath = path.join(path.dirname(req.file.path), 
                              path.basename(req.file.profilePhotoThumb));
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
          }
          return res.status(400).json({ message: 'Cet CIN est déjà utilisé' });
        }
      }






      // Mettre à jour les champs
      if (name && employee.name!=name) employee.name = name;
      if (email && employee.email!=email) employee.email = email;
      if (position && employee.position!=position) employee.position = position;
      if (cin && employee.cin!=cin ) employee.cin = cin;
      if(password ) employee.password=password;

      // Sauvegarder les modifications
      await employee.save();

      // Supprimer les anciens fichiers après sauvegarde réussie
      if (oldProfilePhoto) {
        const oldPhotoPath = path.join('public', oldProfilePhoto);
        const oldThumbPath = path.join('public', oldProfileThumb);
        if (fs.existsSync(oldPhotoPath)) fs.unlinkSync(oldPhotoPath);
        if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);
      }

      // Préparer la réponse
      const employeeResponse = employee.toObject();
      delete employeeResponse.password;

      // Construire les URLs complets si nécessaire
      const baseUrl = `${req.protocol}://${req.get('host')}/`;
      if (employeeResponse.profilePhoto) {
        employeeResponse.profilePhotoUrl = baseUrl + employeeResponse.profilePhoto;
        employeeResponse.profileThumbUrl = baseUrl + employeeResponse.profilePhotoThumb;
      }

      res.status(200).json({
        message: 'Employé mis à jour avec succès',
        employee: employeeResponse
      });
    });
  } catch (error) {
    // Nettoyage complet en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
      const thumbPath = path.join(path.dirname(req.file.path), 
                        path.basename(req.file.profilePhotoThumb));
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }
    
    console.error('Error updating employee:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la mise à jour',
      error: error.message 
    });
  }
};



//supprimer un employe


exports.deleteEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const employeeId = req.params.id;

    // 1. Vérifier si l'employé existe
    const employee = await User.findById(employeeId).session(session);
    if (!employee) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // 2. Supprimer les fichiers de photo de profil s'ils existent
    if (employee.profilePhoto && employee.profilePhoto !== 'default-avatar.png') {
      const photoPath = path.join('public', employee.profilePhoto);
      const thumbPath = employee.profilePhotoThumb
      ? path.join('public', employee.profilePhotoThumb)
      : null;

  
      if (thumbPath) {
        // Supprime les deux fichiers en parallèle
        await Promise.all([
          fs.promises.unlink(photoPath).catch(err => console.error('Error deleting photo:', err)),
          fs.promises.unlink(thumbPath).catch(err => console.error('Error deleting thumbnail:', err))
        ]);
      } else {
        // Supprime uniquement la photo si la miniature n'existe pas
        await fs.promises.unlink(photoPath).catch(err => console.error('Error deleting photo:', err));
      }
    }
  

    

    // 3. Retirer l'employé des projets assignés
    await Project.updateMany(
      { assignedEmployees: employeeId },
      { $pull: { assignedEmployees: employeeId } },
      { session }
    );

    // 4. Mettre à jour les tâches assignées (les désassigner)
   /* await Task.updateMany(
      { assignedTo: employeeId },
      { $set: { assignedTo: null } },
      { session }
    );*/
    await Task.deleteMany(
      { assignedTo: employeeId },
      { session }
    );


    // 5. Supprimer l'employé
    await User.deleteOne({ _id: employeeId }).session(session);

    // 6. Valider la transaction
    await session.commitTransaction();

    res.status(200).json({ 
      message: 'Employé supprimé avec succès',
      deletedEmployee: {
        id: employee._id,
        name: employee.name,
        email: employee.email
      }
    });
  } catch (error) {
    // En cas d'erreur, annuler la transaction
    await session.abortTransaction();
    
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression de l\'employé',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};