import mongoose from 'mongoose';

// Schéma pour représenter un utilisateur de l'application mobile
// Un utilisateur est créé lors de l'installation de l'app sur un téléphone
const userSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true, // Chaque téléphone a un deviceId unique
    index: true
  },
  pushToken: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

export default mongoose.model('User', userSchema); 