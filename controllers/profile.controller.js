const User = require('../models/user');


exports.getProfile = async (req, res) => {
  try {
    // L'utilisateur est déjà authentifié par le middleware
    const user = req.user;
    
    // Structure de réponse sécurisée
    const profileData = {
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      cin: user.cin,
      profilePhoto: user.profilePhoto || 'default-avatar.png'
    };

    res.status(200).json({
      success: true,
      data: profileData
    });

  } catch (err) {
    console.error('Profile Error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
};