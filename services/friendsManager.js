import Friend from '../models/Friend.js';
import GlobalPlayer from '../models/GlobalPlayer.js';
import { getOrCreateGlobalPlayer, removeGlobalPlayerIfUnused } from './globalPlayerManager.js';
import { getPuuidFromRiotId, getDatas } from './gameDetector.js';

// ===== FONCTIONS DE GESTION DES AMIS =====

/**
 * Récupère tous les amis d'un utilisateur avec leurs données de jeu complètes
 * Combine les données de la relation Friend avec celles du GlobalPlayer
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Array>} Liste des amis avec leurs données de jeu
 */
export async function getFriendsByUserId(userId) {
  try {
    // Récupérer toutes les relations d'amis de l'utilisateur
    const friends = await Friend.find({ userId }).populate('userId', 'deviceId');
    
    // Pour chaque ami, récupérer les données de jeu depuis GlobalPlayer
    const friendsWithData = [];
    
    for (const friend of friends) {
      // Récupérer les données du joueur global
      const globalPlayer = await GlobalPlayer.findOne({ riotId: friend.riotId });
      
      if (globalPlayer) {
        // Combiner les données de la relation avec celles du joueur global
        friendsWithData.push({
          ...friend.toObject(),
          puuid: globalPlayer.puuid,
          soloQ: globalPlayer.soloQ,
          flex: globalPlayer.flex,
          lastMatchIdSoloQ: globalPlayer.lastMatchIdSoloQ,
          lastMatchIdFlex: globalPlayer.lastMatchIdFlex,
          lastMatchId: globalPlayer.lastMatchId,
          lastUpdated: globalPlayer.lastUpdated
        });
      } else {
        // Fallback si le joueur global n'existe pas (cas d'erreur)
        friendsWithData.push(friend.toObject());
      }
    }
    
    return friendsWithData;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des amis:', error);
    throw error;
  }
}

/**
 * Ajoute un ami pour un utilisateur
 * Vérifie si le joueur existe déjà dans GlobalPlayer, sinon le crée
 * @param {string} userId - L'ID de l'utilisateur
 * @param {string} riotId - Le RiotID du joueur à ajouter
 * @returns {Promise<Object>} L'ami ajouté avec ses données
 */
export async function addFriend(userId, riotId) {
  try {
    // Vérifier si l'ami existe déjà pour cet utilisateur
    const existingFriend = await Friend.findOne({ userId, riotId });
    if (existingFriend) {
      throw new Error('Cet ami est déjà dans votre liste');
    }
    
    // Vérifier/créer le joueur global
    // Si le joueur n'existe pas dans GlobalPlayer, il sera créé automatiquement
    const globalPlayer = await getOrCreateGlobalPlayer(riotId);
    
    // Créer la relation d'ami
    const friend = new Friend({
      userId,
      riotId
    });
    
    await friend.save();
    
    // Retourner l'ami avec les données du joueur global
    return {
      ...friend.toObject(),
      puuid: globalPlayer.puuid,
      soloQ: globalPlayer.soloQ,
      flex: globalPlayer.flex,
      lastMatchIdSoloQ: globalPlayer.lastMatchIdSoloQ,
      lastMatchIdFlex: globalPlayer.lastMatchIdFlex,
      lastMatchId: globalPlayer.lastMatchId
    };
  } catch (error) {
    if (error.code === 11000) {
      // Erreur de doublon (index unique)
      throw new Error('Cet ami est déjà dans votre liste');
    }
    console.error('❌ Erreur lors de l\'ajout de l\'ami:', error);
    throw error;
  }
}

/**
 * Supprime un ami pour un utilisateur
 * Vérifie ensuite si le joueur peut être supprimé de GlobalPlayer
 * @param {string} userId - L'ID de l'utilisateur
 * @param {string} riotId - Le RiotID du joueur à supprimer
 * @returns {Promise<Object>} L'ami supprimé
 */
export async function removeFriend(userId, riotId) {
  try {
    // Supprimer la relation d'ami
    const result = await Friend.findOneAndDelete({ userId, riotId });
    if (!result) {
      throw new Error('Ami non trouvé');
    }
    
    // Vérifier si le joueur peut être supprimé de GlobalPlayer
    // (seulement s'il n'est plus ami avec aucun utilisateur)
    await removeGlobalPlayerIfUnused(riotId);
    
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'ami:', error);
    throw error;
  }
}


/**
 * Supprime plusieurs amis en lot
 * @param {string} userId - L'ID de l'utilisateur
 * @param {Array} riotIds - Liste des RiotIDs à supprimer
 * @param {boolean} force - Si true, continue même en cas d'erreur
 * @returns {Promise<Object>} Résultat de la suppression en lot
 */
export async function removeFriendsBatch(userId, riotIds, force = false) {
  try {
    const results = [];
    const successful = [];
    const failed = [];

    for (const riotId of riotIds) {
      try {
        await removeFriend(userId, riotId);
        successful.push(riotId);
        results.push({ riotId, status: 'success' });
      } catch (error) {
        failed.push(riotId);
        results.push({ 
          riotId, 
          status: 'error', 
          message: error.message || 'Erreur lors de la suppression' 
        });
      }
    }
    
    const response = {
      message: `Suppression terminée`,
      summary: {
        total: riotIds.length,
        successful: successful.length,
        failed: failed.length
      },
      results
    };

    // Si force=true ou aucune erreur, on retourne 200
    if (force || failed.length === 0) {
      return response;
    } else {
      // 207 = Multi-Status (certaines opérations ont échoué)
      response.statusCode = 207;
      return response;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression en lot:', error);
    throw error;
  }
}

/**
 * Récupère les statistiques des amis d'un utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Object>} Statistiques des amis
 */
export async function getFriendsStats(userId) {
  try {
    const friends = await getFriendsByUserId(userId);
    
    const stats = {
      total: friends.length,
      withSoloQ: friends.filter(f => f.soloQ && f.soloQ.tier).length,
      withFlex: friends.filter(f => f.flex && f.flex.tier).length,
      tiers: {
        soloQ: {},
        flex: {}
      }
    };
    
    // Compter les tiers SoloQ
    friends.forEach(friend => {
      if (friend.soloQ && friend.soloQ.tier) {
        stats.tiers.soloQ[friend.soloQ.tier] = (stats.tiers.soloQ[friend.soloQ.tier] || 0) + 1;
      }
    });
    
    // Compter les tiers Flex
    friends.forEach(friend => {
      if (friend.flex && friend.flex.tier) {
        stats.tiers.flex[friend.flex.tier] = (stats.tiers.flex[friend.flex.tier] || 0) + 1;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
}