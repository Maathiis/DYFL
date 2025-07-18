import express from 'express';
import { userMiddleware, userMiddlewareGet } from '../services/userManager.js';
import {
  getFriendsByUserId,
  addFriend,
  removeFriendsBatch,
  getFriendsStats
} from '../services/friendsManager.js';

const router = express.Router();

// GET /friends - Récupère tous les amis d'un utilisateur
router.get('/', userMiddlewareGet, async (req, res) => {
  try {
    const friends = await getFriendsByUserId(req.user._id);
    res.json(friends);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des amis:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des amis' });
  }
});

// GET /friends/stats - Récupère les statistiques des amis
router.get('/stats', userMiddlewareGet, async (req, res) => {
  try {
    const stats = await getFriendsStats(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// POST /friends - Ajoute un ami
router.post('/', userMiddleware, async (req, res) => {
  const { riotId } = req.body;

  if (!riotId) {
    return res.status(400).json({ error: 'riotId requis' });
  }

  try {
    // Ajouter l'ami (la logique de vérification/création du GlobalPlayer est gérée dans addFriend)
    const friend = await addFriend(req.user._id, riotId);
    
    res.status(201).json({
      message: `Ami ajouté : ${riotId}`,
      friend
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de l\'ami:', error);
    
    if (error.message.includes('Format RiotID invalide')) {
      return res.status(400).json({ error: 'Format RiotID invalide. Utilisez le format Pseudo#TAGLINE' });
    }
    
    if (error.message.includes('Cet ami est déjà dans votre liste')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'ami' });
  }
});

// DELETE /friends - Supprime un ou plusieurs amis (toujours via le body JSON)
router.delete('/', userMiddleware, async (req, res) => {
  const { riotIds } = req.body;

  if (!riotIds || !Array.isArray(riotIds) || riotIds.length === 0) {
    return res.status(400).json({ error: 'Le body doit contenir riotIds (tableau non vide)' });
  }

  try {
    const response = await removeFriendsBatch(req.user._id, riotIds, false);
    res.json({
      message: `Suppression en lot terminée`,
      success: response.success || [],
      failed: response.failed || [],
      total: riotIds.length,
      successCount: (response.success || []).length,
      failedCount: (response.failed || []).length
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression en lot:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression en lot' });
  }
});

export default router; 