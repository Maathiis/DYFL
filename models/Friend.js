import mongoose from 'mongoose';

// Schéma pour représenter la relation entre un utilisateur et un joueur
// Un ami = un utilisateur qui a ajouté un joueur à sa liste d'amis
// Cette table fait le lien entre User et GlobalPlayer
const friendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Référence vers la table User
    required: true,
    index: true
  },
  riotId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index composé pour éviter qu'un utilisateur ajoute le même ami plusieurs fois
// Un utilisateur ne peut avoir qu'une relation avec un joueur donné
friendSchema.index({ userId: 1, riotId: 1 }, { unique: true });

export default mongoose.model('Friend', friendSchema); 