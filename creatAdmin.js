const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/user");

dotenv.config();
const createAdmin = async () => {
  try {
    await connectDB(); // Utilisation de la fonction centralisée

    const existingAdmin = await User.findOne({ email: "admin@devpu.com" });
    if (existingAdmin) {
      console.log(" Un admin avec cet email existe déjà.");
    } else {
      const admin = new User({
        name: "Admin DevPu",
        email: "admin@devpu.com",
        password: "admin123", // hashé automatiquement via pre('save')
        role: "admin",
        position:"directeur",
        cin:123456,
        profilePhoto:"./assets/image-directeur.png"
      });

      await admin.save();
      console.log("Admin créé avec succès !");
    }
  } catch (error) {
    console.error("Erreur lors de la création de l'admin :", error.message);
  } finally {
    process.exit(); // Termine le script proprement
  }
};
createAdmin();