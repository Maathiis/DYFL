import Friend from "../models/Friend.js";
import GlobalPlayer from "../models/GlobalPlayer.js";
import {
  getLastMatchId,
  getLastMatchIdByType,
  getPlayerRanks,
  getPuuidFromRiotId,
} from "./gameDetector.js";

// ===== FONCTIONS DE GESTION DES JOUEURS GLOBAUX =====

/**
 * Vérifie si un joueur global existe déjà
 * @param {string} riotId - Le RiotID du joueur
 * @returns {Promise<Object|null>} Le joueur global s'il existe, null sinon
 */
export async function checkGlobalPlayerExists(riotId) {
  try {
    return await GlobalPlayer.findOne({ riotId });
  } catch (error) {
    console.error(
      `Erreur lors de la vérification du joueur global ${riotId}:`,
      error
    );
    throw error;
  }
}

/**
 * Crée un nouveau joueur global
 * Récupère le PUUID, les rangs et les derniers matchs depuis l'API Riot
 * @param {string} riotId - Le RiotID du joueur
 * @returns {Promise<Object>} Le joueur global créé
 */
export async function createGlobalPlayer(riotId) {
  try {
    // Récupérer le PUUID depuis l'API Riot
    const puuid = await getPuuidFromRiotId(riotId);

    // Récupérer les données de rang
    const ranks = await getPlayerRanks(puuid);

    // Récupérer les derniers matchs
    const lastMatchId = await getLastMatchId(puuid);
    const lastMatchIdSoloQ = await getLastMatchIdByType(
      puuid,
      "RANKED_SOLO_5x5"
    );
    const lastMatchIdFlex = await getLastMatchIdByType(puuid, "RANKED_FLEX_SR");

    // Créer le nouveau joueur global avec toutes les données
    const globalPlayer = new GlobalPlayer({
      riotId,
      puuid,
      soloQ: ranks.soloQ,
      flex: ranks.flex,
      lastMatchId,
      lastMatchIdSoloQ,
      lastMatchIdFlex,
    });

    await globalPlayer.save();
    return globalPlayer;
  } catch (error) {
    console.error(
      `❌ Erreur lors de la création du joueur global ${riotId}:`,
      error
    );
    throw error;
  }
}

/**
 * Ajoute ou récupère un joueur global
 * Si le joueur n'existe pas, il est créé automatiquement
 * @param {string} riotId - Le RiotID du joueur
 * @returns {Promise<Object>} Le joueur global (existant ou nouvellement créé)
 */
export async function getOrCreateGlobalPlayer(riotId) {
  try {
    console.log(`🔍 [DEBUG] getOrCreateGlobalPlayer pour ${riotId}`);

    // Vérifier si le joueur existe déjà
    let globalPlayer = await checkGlobalPlayerExists(riotId);
    console.log(
      `🔍 [DEBUG] checkGlobalPlayerExists result: ${
        globalPlayer ? "EXISTS" : "NOT_FOUND"
      }`
    );

    if (!globalPlayer) {
      console.log(`🔍 [DEBUG] Joueur non trouvé, création en cours...`);
      // Le joueur n'existe pas, on le crée
      globalPlayer = await createGlobalPlayer(riotId);
      console.log(`✅ [DEBUG] Joueur créé avec succès`);
    } else {
      console.log(`✅ [DEBUG] Joueur existant trouvé`);
    }

    return globalPlayer;
  } catch (error) {
    console.error(
      `❌ [DEBUG] Erreur dans getOrCreateGlobalPlayer pour ${riotId}:`,
      error
    );
    throw error;
  }
}

/**
 * Met à jour les données d'un joueur global
 * @param {string} riotId - Le RiotID du joueur
 * @param {Object} updateData - Les données à mettre à jour
 * @returns {Promise<Object>} Le joueur global mis à jour
 */
export async function updateGlobalPlayer(riotId, updateData) {
  try {
    const result = await GlobalPlayer.findOneAndUpdate(
      { riotId },
      {
        ...updateData,
        lastUpdated: new Date(),
      },
      { new: true }
    );

    if (!result) {
      throw new Error(`Joueur global non trouvé : ${riotId}`);
    }

    return result;
  } catch (error) {
    console.error(
      `❌ Erreur lors de la mise à jour du joueur global ${riotId}:`,
      error
    );
    throw error;
  }
}

/**
 * Met à jour les données complètes d'un joueur global depuis l'API Riot
 * @param {string} riotId - Le RiotID du joueur
 * @returns {Promise<Object>} Le joueur global mis à jour
 */
export async function refreshGlobalPlayerData(riotId) {
  try {
    const globalPlayer = await checkGlobalPlayerExists(riotId);
    if (!globalPlayer) {
      throw new Error(`Joueur global non trouvé : ${riotId}`);
    }

    // Récupérer les données de rang
    const ranks = await getPlayerRanks(globalPlayer.puuid);

    // Récupérer les derniers matchs
    const lastMatchId = await getLastMatchId(globalPlayer.puuid);
    const lastMatchIdSoloQ = await getLastMatchIdByType(
      globalPlayer.puuid,
      "RANKED_SOLO_5x5"
    );
    const lastMatchIdFlex = await getLastMatchIdByType(
      globalPlayer.puuid,
      "RANKED_FLEX_SR"
    );

    // Mettre à jour le joueur global
    const updatedPlayer = await updateGlobalPlayer(riotId, {
      soloQ: ranks.soloQ,
      flex: ranks.flex,
      lastMatchId,
      lastMatchIdSoloQ,
      lastMatchIdFlex,
    });

    return updatedPlayer;
  } catch (error) {
    console.error(
      `❌ Erreur lors de la mise à jour des données pour ${riotId}:`,
      error
    );
    throw error;
  }
}

/**
 * Récupère tous les joueurs globaux uniques
 * Triés par date de dernière mise à jour (plus anciens en premier)
 * @returns {Promise<Array>} Liste de tous les joueurs globaux
 */
export async function getAllGlobalPlayers() {
  try {
    return await GlobalPlayer.find().sort({ lastUpdated: 1 });
  } catch (error) {
    console.error(
      "❌ Erreur lors de la récupération des joueurs globaux:",
      error
    );
    throw error;
  }
}

/**
 * Récupère tous les utilisateurs qui ont un joueur en ami
 * @param {string} riotId - Le RiotID du joueur
 * @returns {Promise<Array>} Liste des utilisateurs qui ont ce joueur en ami
 */
export async function getUsersWithPlayer(riotId) {
  try {
    const friends = await Friend.find({ riotId }).populate(
      "userId",
      "deviceId"
    );
    return friends.map((friend) => friend.userId);
  } catch (error) {
    console.error(
      `❌ Erreur lors de la récupération des utilisateurs pour ${riotId}:`,
      error
    );
    throw error;
  }
}

/**
 * Vérifie si un joueur global peut être supprimé
 * Un joueur peut être supprimé seulement s'il n'est plus ami avec aucun utilisateur
 * @param {string} riotId - Le RiotID du joueur
 * @returns {Promise<boolean>} true si supprimé, false sinon
 */
export async function removeGlobalPlayerIfUnused(riotId) {
  try {
    // Compter combien d'utilisateurs ont encore ce joueur en ami
    const friendCount = await Friend.countDocuments({ riotId });

    if (friendCount === 0) {
      // Plus personne n'a ce joueur en ami, on peut le supprimer
      await GlobalPlayer.findOneAndDelete({ riotId });
      return true;
    }

    // Le joueur est encore ami avec au moins un utilisateur
    return false;
  } catch (error) {
    console.error(
      `❌ Erreur lors de la vérification/suppression du joueur global ${riotId}:`,
      error
    );
    throw error;
  }
}

/**
 * Supprime un joueur global et toutes ses relations d'amis
 * Utilisé pour nettoyer complètement un joueur de la base
 * @param {string} riotId - Le RiotID du joueur
 * @returns {Promise<boolean>} true si supprimé, false sinon
 */
export async function forceRemoveGlobalPlayer(riotId) {
  try {
    // Supprimer toutes les relations d'amis
    await Friend.deleteMany({ riotId });

    // Supprimer le joueur global
    const result = await GlobalPlayer.findOneAndDelete({ riotId });

    if (result) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      `❌ Erreur lors de la suppression forcée du joueur global ${riotId}:`,
      error
    );
    throw error;
  }
}
