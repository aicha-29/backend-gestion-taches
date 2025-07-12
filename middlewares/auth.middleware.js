const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async (req, res, next) => {
  try {
    // 1. Récupérer le token depuis les headers
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    // 2. Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Récupérer l'utilisateur SANS le mot de passe
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // 4. Passer au middleware suivant
    next();
  } catch (err) {
    res.status(401).json({ message:err.message || 'Token invalide' });
  }
};