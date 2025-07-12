const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  type: {
    type: String,
    enum: ["daily", "long"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "inProgress", "completed", "late"],
    default: "pending"
  },
  deadline: {
    type: Date,
    required: function() { return this.type === "long"; } // Seulement pour les tâches longues
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ajoutez ceci après la définition de taskSchema
taskSchema.post('save', async function(task) {
  if (task.project) {
    const Project = mongoose.model('Project');
    const project = await Project.findById(task.project);
    
    if (project) {
      // Récupère TOUTES les tâches du projet pour calcul précis
      const tasks = await mongoose.model('Task').find({ project: task.project });
      const completedCount = tasks.filter(t => t.status === 'completed').length;
      
      project.progression = Math.round((completedCount / tasks.length) * 100);
      
      // Mise à jour automatique du statut
      if (project.progression === 100) {
        project.status = 'completed';
      } else if (project.status === 'completed') {
        project.status = 'active';
      }
      
      await project.save();
    }
  }
});

taskSchema.post('deleteOne', { document: true }, async function(task) {
  if (task.project) {
    const Project = mongoose.model('Project');
    const project = await Project.findById(task.project);
    
    if (project) {
      const tasks = await mongoose.model('Task').find({ project: task.project });
      
      if (tasks.length > 0) {
        const completedCount = tasks.filter(t => t.status === 'completed').length;
        project.progression = Math.round((completedCount / tasks.length) * 100);
      } else {
        project.progression = 0;
      }
      
      await project.save();
    }
  }
});







// Middleware pour marquer automatiquement les tâches en retard
taskSchema.pre("save", function(next) {
  if (this.deadline && new Date() > this.deadline && this.status !== "completed") {
    this.status = "late";
  }
  next();
});

module.exports = mongoose.model("Task", taskSchema);