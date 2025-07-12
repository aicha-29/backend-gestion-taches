const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/user');
const Project = require('./models/project');

const deleteCollections = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");

    // Supprimer tous les documents de la collection users
    await User.deleteMany({});
    console.log("✅ Collection 'users' vidée");

    // Supprimer tous les documents de la collection projects
    await Project.deleteMany({});
    console.log("✅ Collection 'projects' vidée");

  } catch (error) {
    console.error("❌ Erreur lors de la suppression :", error.message);
  } finally {
    mongoose.connection.close();
  }
};

deleteCollections();
