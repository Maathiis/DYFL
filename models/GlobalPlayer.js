import mongoose from "mongoose";

// Schéma pour représenter un joueur global unique
// Un joueur peut être dans plusieurs listes d'amis mais n'apparaît qu'une fois ici
// Contient toutes les données de jeu (rangs, matchs, etc.)
const globalPlayerSchema = new mongoose.Schema(
  {
    riotId: {
      type: String,
      required: true,
      unique: true, // Un joueur ne peut apparaître qu'une fois
      index: true,
    },
    puuid: {
      type: String,
      required: true,
      unique: true, // PUUID Riot unique
      index: true,
      validate: {
        validator: function (v) {
          // Un PUUID Riot valide fait ~78 caractères
          return v && v.length >= 70 && /^[a-zA-Z0-9_-]+$/.test(v);
        },
        message: "PUUID invalide",
      },
    },
    // Données de rang SoloQ
    soloQ: {
      tier: String, // Bronze, Silver, Gold, etc.
      rank: String, // IV, III, II, I
      lp: Number, // Points de ligue
    },
    // Données de rang Flex
    flex: {
      tier: String,
      rank: String,
      lp: Number,
    },
    // IDs des derniers matchs pour éviter les doublons
    lastMatchIdSoloQ: String,
    lastMatchIdFlex: String,
    lastMatchId: String, // Dernier match tous types confondus
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("GlobalPlayer", globalPlayerSchema);
