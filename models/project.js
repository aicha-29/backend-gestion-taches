const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  company: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  endDate: Date,
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'completed'], 
    default: 'active' 
  },
  progression: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  assignedEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  logo: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual pour les tâches (utile pour les populate)
ProjectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project'
});

// Méthode pour calculer la progression (utilisée par les hooks de Task)
ProjectSchema.methods.updateProgression = async function() {
  const tasks = await mongoose.model('Task').find({ project: this._id });
  const totalTasks = tasks.length;
  
  if (totalTasks > 0) {
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    this.progression = Math.round((completedCount / totalTasks) * 100);
    
    // Mise à jour automatique du statut
    if (this.progression === 100) {
      this.status = 'completed';
    } else if (this.status === 'completed') {
      this.status = 'active';
    }
  } else {
    this.progression = 0;
  }
  
  return this.save();
};

module.exports = mongoose.model('Project', ProjectSchema);