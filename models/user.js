const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true,
     // Ne pas retourner le mot de passe par défaut
  },
  role: { 
    type: String, 
    enum: ["admin", "employee"], // Corrigé "employe" -> "employee"
    default: "employee" 
  },
  position: {
    type: String, 
    required: true,
    trim: true
  },
  cin: { 
    type: String, // Changé Number -> String pour plus de flexibilité
    trim: true,
    unique: true,
    sparse: true // Permet des valeurs null uniques
  },
  profilePhoto: {
    type: String,
    default: "default-avatar.png" // Valeur par défaut
  },
 }); 

// Middleware de hash du mot de passe (inchangé)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", userSchema);