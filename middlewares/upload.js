const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

// Créer les dossiers s'ils n'existent pas
const uploadDir = 'public/uploads/projects/originals';
const thumbDir = 'public/uploads/projects/thumbnails';

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });


// Configuration de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'project-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif)'));
  }
};

const uploadProjectLogo = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
}).single('logo');

// Middleware pour traiter et redimensionner l'image
const processProjectLogo = async (req, res, next) => {
  if (!req.file) return next();
  
  try {
    const filename = path.basename(req.file.path);
    const thumbPath = path.join(thumbDir, filename);
    
    await sharp(req.file.path)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat('jpeg', { 
        quality: 80,
        mozjpeg: true 
      })
      .toFile(thumbPath);
      req.file.logoPath = path.join('uploads/projects/originals', req.file.filename).replace(/\\/g, '/');
      req.file.thumbnail = path.join('uploads/projects/thumbnails', req.file.filename).replace(/\\/g, '/');

    next();
  } catch (err) {
    // Supprimer le fichier uploadé si le traitement échoue
    fs.unlinkSync(req.file.path);
    next(err);
  }
};

 //CONFIGURATION UTILISATEURS
const userUploadDir = 'public/uploads/users/originals';
const userThumbDir = 'public/uploads/users/thumbnails';

if (!fs.existsSync(userUploadDir)) fs.mkdirSync(userUploadDir, { recursive: true });
if (!fs.existsSync(userThumbDir)) fs.mkdirSync(userThumbDir, { recursive: true });

const userStorage = multer.diskStorage({
  destination: userUploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const userFileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Seules les images JPEG/PNG sont autorisées'));
};

const uploadUserPhoto = multer({
  storage: userStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: userFileFilter
}).single('profilePhoto');

const processUserPhoto = async (req, res, next) => {
  if (!req.file) return next();
  
  try {
    const filename = path.basename(req.file.path);
    const thumbPath = path.join(userThumbDir, filename);
    
    // Création miniature carrée 200x200
    await sharp(req.file.path)
      .resize(200, 200)
      .toFormat('jpeg', { quality: 80 })
      .toFile(thumbPath);
    
    // Stockage des chemins relatifs (sans 'public/')
    req.file.profilePhoto = `uploads/users/originals/${filename}`;
    req.file.profilePhotoThumb = `uploads/users/thumbnails/${filename}`;
    next();
  } catch (err) {
    fs.unlinkSync(req.file.path);
    next(err);
  }
};

module.exports = {
  // Pour les projets
  uploadProjectLogo,
  processProjectLogo,
   
  
  // Pour les utilisateurs
  uploadUserPhoto,
  processUserPhoto
};