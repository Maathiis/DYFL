import express from 'express';
import { getOrCreateUser } from '../services/userManager.js';

const router = express.Router();

// Créer un utilisateur (ou le récupérer s'il existe déjà)
// Body attendu : { deviceId: string, pushToken?: string }
router.post('/', async (req, res) => {
  try {
    const { deviceId, pushToken } = req.body;
    console.log(deviceId, pushToken )
    console.log(req.body)
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId requis' });
    }
    // Création ou récupération de l'utilisateur
    let user = await getOrCreateUser(deviceId, pushToken);
    // Met à jour le pushToken si fourni
    if (pushToken && user.pushToken !== pushToken) {
      user.pushToken = pushToken;
      await user.save();
    }
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

export default router;
