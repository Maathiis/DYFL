import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/database.js';
import friendsRoutes from './routes/friends.js';
import { processAllGlobalPlayers } from './services/gameDetector.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes API
app.use('/friends', friendsRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'DYFL Backend is running' });
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
        console.error('Erreur dans la boucle principale:', error);
      }
    }

    // Exécuter immédiatement une première fois
    await main();

    // Puis toutes les 2 minutes
    setInterval(main, 2 * 60 * 1000);

  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();