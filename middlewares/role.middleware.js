exports.roleMiddleware = (allowedRoles) => (req, res, next) => {
  const userRole = req.user.role; // Récupéré du JWT
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  
  next();
};
