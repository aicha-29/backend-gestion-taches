const mongoose = require('mongoose');
require('dotenv').config();

async function deleteCollection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Suppression de la collection
    const result = await mongoose.connection.db.dropCollection('users');
    console.log('Collection supprimée:', result);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
}

deleteCollection();