import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/database.js";
import friendsRoutes from "./routes/friends.js";
import notificationsRoutes from "./routes/notifications.js";
import usersRoutes from "./routes/users.js";
import { processAllGlobalPlayers } from "./services/gameDetector.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes API centralisées sous /api
app.use("/api/friends", friendsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);

// Route de santé
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "DYFL Backend is running" });
});

// Route de documentation API
app.get("/api", (req, res) => {
  res.json({
    name: "DYFL Backend API",
    version: "1.0.0",
    description: "API pour le suivi des amis League of Legends",
    baseUrl: `${req.protocol}://${req.get("host")}/api`,
    endpoints: {
      users: {
        "POST /users": "Créer/récupérer un utilisateur",
        body: "{ deviceId: string, pushToken?: string }",
      },
      friends: {
        "GET /friends": "Récupérer tous les amis",
        "GET /friends/stats": "Statistiques des amis",
        "POST /friends": "Ajouter un ami",
        "DELETE /friends": "Supprimer des amis",
      },
      notifications: {
        "POST /notifications/push/register": "Enregistrer token",
        "POST /notifications/push/test": "Tester notification",
      },
      health: {
        "GET /health": "État de l'API",
      },
    },
  });
});

// Connexion à MongoDB et démarrage du serveur
async function startServer() {
  try {
    // Connexion à MongoDB
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });

    // Fonction principale qui s'exécute périodiquement
    async function main() {
      try {
        await processAllGlobalPlayers();
      } catch (error) {
        console.error("Erreur dans la boucle principale:", error);
      }
    }

    // Exécuter immédiatement une première fois
    await main();

    // Puis toutes les 2 minutes
    setInterval(main, 2 * 60 * 1000);
  } catch (error) {
    console.error("Erreur lors du démarrage du serveur:", error);
    process.exit(1);
  }
}

startServer();
