const mongoose = require("mongoose");
const dotenv = require("dotenv");

const User = require("./models/user");
const Project = require("./models/project");
const Task = require("./models/task");

dotenv.config(); // charge .env pour MONGODB_URI

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connexion à MongoDB réussie");

    // 1. Créer un utilisateur employé
    const employee = new User({
      name: "Employé Test",
      email: "employee@devpu.com",
      password: "test123", // sera hashé automatiquement
      role: "employee",
      position: "développeur",
      cin: "E123456"
    });
    await employee.save();

    // 2. Créer un projet
    const project = new Project({
      name: "Projet Test",
      description: "Projet pour tests dashboard",
      company: "DevPu",
      city: "Rabat",
      priority: "high"
    });
    await project.save();

    // 3. Créer des tâches liées à ce projet
    const task1 = new Task({
      title: "Tâche 1",
      description: "Tâche normale",
      type: "daily",
      status: "inProgress",
      project: project._id,
      assignedTo: employee._id,
      progress: 60
    });
    await task1.save();

    const task2 = new Task({
      title: "Tâche 2",
      description: "Tâche en retard",
      type: "long",
      status: "pending",
      deadline: new Date("2024-01-01"),
      project: project._id,
      assignedTo: employee._id,
      progress: 0
    });
    await task2.save();

    console.log("✅ Données de test insérées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'insertion :", error.message);
  } finally {
    mongoose.connection.close();
  }
};

seedData();
    