import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { getQueueType } from "../utils/format.js";
import {
  getAllGlobalPlayers,
  updateGlobalPlayer,
} from "./globalPlayerManager.js";
import { sendDefeatNotification } from "./notificationManager.js";

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Cache pour éviter les appels API redondants
const matchCache = new Map();
const rankCache = new Map();

const LOG_FILE = path.resolve("logs/game-detector.log");
function logGameDetector(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, logLine + "\n");
  } catch (e) {
    console.error("Erreur écriture fichier log:", e);
  }
}

// ===== FONCTIONS D'INTERACTION AVEC L'API RIOT =====

// Helper pour récupérer puuid depuis RiotID (Pseudo#TAGLINE)
export async function getPuuidFromRiotId(riotId) {
  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) throw new Error("Format RiotID invalide");

  const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;

  const res = await axios.get(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
  });
  return res.data.puuid;
}

// Helper pour récupérer les rangs d'un joueur (SoloQ et Flex)
export async function getDatas(puuid) {
  const url = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  const res = await axios.get(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
  });
  return res.data;
}

// Helper pour récupérer les données de rang d'un joueur (avec cache)
export async function getPlayerRanks(puuid) {
  if (rankCache.has(puuid)) {
    return rankCache.get(puuid);
  }

  try {
    const data = await getDatas(puuid);

    const ranks = {
      soloQ: null,
      flex: null,
    };

    data.forEach((entry) => {
      if (entry.queueType === "RANKED_SOLO_5x5") {
        ranks.soloQ = {
          tier: entry.tier,
          rank: entry.rank,
          lp: entry.leaguePoints,
        };
      } else if (entry.queueType === "RANKED_FLEX_SR") {
        ranks.flex = {
          tier: entry.tier,
          rank: entry.rank,
          lp: entry.leaguePoints,
        };
      }
    });

    rankCache.set(puuid, ranks);
    return ranks;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des rangs pour ${puuid}:`,
      error.response?.data || error.message
    );
    return { soloQ: null, flex: null };
  }
}

// ===== FONCTIONS DE GESTION DES MATCHS =====

// Helper pour récupérer les détails d'un match
export async function getMatchDetails(matchId) {
  if (matchCache.has(matchId)) {
    return matchCache.get(matchId);
  }

  try {
    const url = `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    const response = await axios.get(url, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    const matchData = {
      queueId: response.data.info.queueId,
      queueType: getQueueType(response.data.info.queueId),
      gameDuration: response.data.info.gameDuration,
      participants: response.data.info.participants,
    };

    matchCache.set(matchId, matchData);
    return matchData;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du match ${matchId}:`,
      error.response?.data || error.message
    );
    return null;
  }
}

// Helper pour récupérer le dernier match ID (tous types confondus)
export async function getLastMatchId(puuid) {
  try {
    const url = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`;
    const response = await axios.get(url, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
      params: {
        start: 0,
        count: 1,
      },
    });

    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du dernier match pour ${puuid}:`,
      error.response?.data || error.message
    );
    return null;
  }
}

// Helper pour récupérer le dernier match ID par type de file
const QUEUE_IDS = {
  RANKED_SOLO_5x5: 420,
  RANKED_FLEX_SR: 440,
};

export async function getLastMatchIdByType(puuid, type) {
  const queueId = QUEUE_IDS[type];
  if (!queueId) throw new Error(`Type de file non supporté : ${type}`);

  try {
    const response = await axios.get(
      `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      {
        params: {
          start: 0,
          count: 1,
          queue: queueId,
        },
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
      }
    );

    const matchIds = response.data;
    return matchIds.length > 0 ? matchIds[0] : null;
  } catch (error) {
    console.error(
      `Erreur dans getLastMatchIdByType pour ${type}:`,
      error.response?.data || error.message
    );
    throw new Error("Impossible de récupérer le dernier match ID");
  }
}

// ===== FONCTIONS DE DÉTECTION DE GAMES OPTIMISÉES =====

// Fonction principale de détection de games pour un joueur global (optimisée)
export async function detectNewGamesForPlayer(globalPlayer) {
  try {
    const { riotId, puuid, lastMatchId, lastMatchIdSoloQ, lastMatchIdFlex } =
      globalPlayer;

    // 1. Récupérer le dernier match (tous modes confondus)
    const latestMatchId = await getLastMatchId(puuid);
    if (!latestMatchId) {
      return false;
    }

    // 2. Récupérer les détails du match (1 seul appel supplémentaire)
    const matchDetails = await getMatchDetails(latestMatchId);
    if (!matchDetails) {
      return false;
    }

    // 3. Déterminer le type de queue
    let updateData = { lastMatchId: latestMatchId };
    let queueType = matchDetails.queueType;
    let isRanked = false;
    if (queueType === "SoloQ") {
      updateData.lastMatchIdSoloQ = latestMatchId;
      isRanked = true;
    } else if (queueType === "Flex") {
      updateData.lastMatchIdFlex = latestMatchId;
      isRanked = true;
    }

    // 4. Cas : dernier match non classé
    if (!isRanked) {
      // On met à jour lastMatchId même si non classé
      await updateGlobalPlayer(riotId, updateData);
      return false;
    }

    // 5. Cas : dernier match classé mais ancien
    if (latestMatchId === lastMatchId) {
      return false;
    }

    // 6. Nouvelle game classée détectée
    const oldRanks = {
      soloQ: { ...globalPlayer.soloQ },
      flex: { ...globalPlayer.flex },
    };
    let newRanks = await getPlayerRanks(puuid);
    updateData.soloQ = newRanks.soloQ || globalPlayer.soloQ;
    updateData.flex = newRanks.flex || globalPlayer.flex;

    // Mettre à jour le joueur global
    try {
      await updateGlobalPlayer(riotId, updateData);
    } catch (error) {
      logGameDetector(
        `${riotId} → Erreur lors de la mise à jour du joueur global: ${error.message}`
      );
      return false;
    }

    // Notifications si défaite en classée
    const playerData = matchDetails.participants.find((p) => p.puuid === puuid);
    if (playerData && !playerData.win) {
      const lpDiff = calculateLPLossOrGain(queueType, oldRanks, newRanks);
      const lpLoss = Math.abs(lpDiff);

      // Vérifier s'il y a eu un derank
      const oldRank = queueType === "SoloQ" ? oldRanks.soloQ : oldRanks.flex;
      const newRank = queueType === "SoloQ" ? newRanks.soloQ : newRanks.flex;
      const hasDerank =
        oldRank &&
        newRank &&
        (oldRank.tier !== newRank.tier || oldRank.rank !== newRank.rank);

      if (hasDerank) {
        logGameDetector(
          `${riotId} → Nouvelle game classée détectée (${queueType}) : DÉFAITE + DÉRANK (${oldRank.tier} ${oldRank.rank} → ${newRank.tier} ${newRank.rank}), ~${lpLoss} LP perdus`
        );
      } else {
        logGameDetector(
          `${riotId} → Nouvelle game classée détectée (${queueType}) : DÉFAITE, -${lpLoss} LP`
        );
      }

      // Préparer les infos de derank si nécessaire
      const derankInfo = hasDerank
        ? {
            oldTier: oldRank.tier,
            oldRank: oldRank.rank,
            newTier: newRank.tier,
            newRank: newRank.rank,
          }
        : null;

      await sendDefeatNotification(
        riotId,
        queueType,
        playerData,
        matchDetails.gameDuration,
        lpLoss,
        derankInfo
      );
    } else if (playerData) {
      const lpDiff = calculateLPLossOrGain(queueType, oldRanks, newRanks);
      const lpGain = Math.abs(lpDiff);

      // Vérifier s'il y a eu une promotion
      const oldRank = queueType === "SoloQ" ? oldRanks.soloQ : oldRanks.flex;
      const newRank = queueType === "SoloQ" ? newRanks.soloQ : newRanks.flex;
      const hasPromotion =
        oldRank &&
        newRank &&
        (oldRank.tier !== newRank.tier || oldRank.rank !== newRank.rank);

      if (hasPromotion) {
        logGameDetector(
          `${queueType} - ${riotId} a gagné + PROMOTION (${oldRank.tier} ${oldRank.rank} → ${newRank.tier} ${newRank.rank})`
        );
      } else {
        logGameDetector(`${queueType} - ${riotId} a gagné, +${lpGain} LP`);
      }
    } else {
      logGameDetector(
        `${riotId} → Nouvelle game classée détectée (${queueType}) : données joueur non trouvées.`
      );
    }

    return true; // Nouvelle game détectée
  } catch (error) {
    logGameDetector(
      `${globalPlayer.riotId} → Erreur: ${
        error.response?.data || error.message
      }`
    );
    return false;
  }
}

// Traitement d'une nouvelle game pour un joueur global
export async function processNewGameForPlayer(
  globalPlayer,
  matchId,
  queueType,
  matchDetails
) {
  const { riotId, puuid } = globalPlayer;
  logGameDetector(
    `${riotId} → Nouvelle game ${queueType} détectée: ${matchId}`
  );

  // Trouver les données du joueur dans le match
  const playerData = matchDetails.participants.find((p) => p.puuid === puuid);
  if (!playerData) {
    logGameDetector(`Joueur ${riotId} non trouvé dans le match.`);
    return;
  }

  // Récupérer les anciens rangs avant la mise à jour
  const oldRanks = {
    soloQ: { ...globalPlayer.soloQ },
    flex: { ...globalPlayer.flex },
  };

  // Mettre à jour les rangs
  const newRanks = await getPlayerRanks(puuid);

  // Préparer les données de mise à jour
  const updateData = {
    soloQ: newRanks.soloQ || globalPlayer.soloQ,
    flex: newRanks.flex || globalPlayer.flex,
  };

  // Mettre à jour le lastMatchId approprié
  if (queueType === "SoloQ") {
    updateData.lastMatchIdSoloQ = matchId;
    updateData.lastMatchId = matchId;
  } else if (queueType === "Flex") {
    updateData.lastMatchIdFlex = matchId;
    updateData.lastMatchId = matchId;
  }

  // Mettre à jour le joueur global
  try {
    await updateGlobalPlayer(riotId, updateData);
  } catch (error) {
    logGameDetector(`Erreur lors de la mise à jour de ${riotId}:`, error);
    return;
  }

  // Traiter la défaite avec notifications multi-utilisateurs
  if (!playerData.win) {
    const lpLoss = calculateLPLoss(queueType, oldRanks, newRanks);
    await sendDefeatNotification(
      riotId,
      queueType,
      playerData,
      matchDetails.gameDuration,
      lpLoss
    );
  } else {
    logGameDetector(`${queueType} - ${riotId} a gagné, pas de notif.`);
  }
}

// Calculer la perte de LP
function calculateLPLoss(queueType, oldRanks, newRanks) {
  const oldRank = queueType === "SoloQ" ? oldRanks.soloQ : oldRanks.flex;
  const newRank = queueType === "SoloQ" ? newRanks.soloQ : newRanks.flex;

  if (!oldRank || !newRank || !oldRank.lp || !newRank.lp) {
    return 0;
  }

  // Si le tier/rank a changé, on ne peut pas calculer précisément
  if (oldRank.tier !== newRank.tier || oldRank.rank !== newRank.rank) {
    return 0;
  }

  const lpLoss = oldRank.lp - newRank.lp;
  return lpLoss > 0 ? lpLoss : 0;
}

// Calculer la perte ou le gain de LP, même en cas de promotion/demote
function calculateLPLossOrGain(queueType, oldRanks, newRanks) {
  const oldRank = queueType === "SoloQ" ? oldRanks.soloQ : oldRanks.flex;
  const newRank = queueType === "SoloQ" ? newRanks.soloQ : newRanks.flex;

  if (
    !oldRank ||
    !newRank ||
    typeof oldRank.lp !== "number" ||
    typeof newRank.lp !== "number"
  ) {
    return 0;
  }

  // Si le tier/rank a changé (promotion/demote), calculer avec la logique 100 LP par rank
  if (oldRank.tier !== newRank.tier || oldRank.rank !== newRank.rank) {
    // Déterminer si c'est une promotion ou un derank
    const isDerank = isHigherRank(oldRank, newRank);

    if (isDerank) {
      // Derank : perte = ancien LP + (100 - nouveau LP)
      // Ex: Gold IV 0 LP → Silver I 75 LP = 0 + (100 - 75) = 25 LP perdus
      const lpLoss = oldRank.lp + (100 - newRank.lp);
      return -lpLoss;
    } else {
      // Promotion : gain = nouveau LP + (100 - ancien LP)
      // Ex: Silver I 100 LP → Gold IV 0 LP = 0 + (100 - 100) = 0 LP gagnés
      const lpGain = newRank.lp + (100 - oldRank.lp);
      return lpGain;
    }
  }

  // Sinon, simple différence
  return newRank.lp - oldRank.lp;
}

// Helper pour déterminer si un rank est plus élevé qu'un autre
function isHigherRank(rank1, rank2) {
  const tierOrder = [
    "IRON",
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "DIAMOND",
    "MASTER",
    "GRANDMASTER",
    "CHALLENGER",
  ];
  const rankOrder = ["I", "II", "III", "IV"]; // I est le plus haut, IV le plus bas

  const tier1Index = tierOrder.indexOf(rank1.tier);
  const tier2Index = tierOrder.indexOf(rank2.tier);

  if (tier1Index > tier2Index) return true;
  if (tier1Index < tier2Index) return false;

  // Même tier, comparer les ranks
  const rank1Index = rankOrder.indexOf(rank1.rank);
  const rank2Index = rankOrder.indexOf(rank2.rank);

  return rank1Index < rank2Index; // I (index 0) est plus haut que IV (index 3)
}

// Fonction optimisée pour traiter tous les joueurs globaux
export async function processAllGlobalPlayers() {
  try {
    // Récupérer tous les joueurs globaux uniques
    const globalPlayers = await getAllGlobalPlayers();

    logGameDetector(
      `Traitement de ${globalPlayers.length} joueurs globaux uniques...`
    );

    if (globalPlayers.length === 0) {
      logGameDetector("Aucun joueur global trouvé en base de données.");
      return;
    }

    // Compteur pour les nouvelles games détectées
    let newGamesDetected = 0;

    // Traiter les joueurs en parallèle avec limitation pour éviter de surcharger l'API
    const batchSize = 3; // Traiter 3 joueurs à la fois
    for (let i = 0; i < globalPlayers.length; i += batchSize) {
      const batch = globalPlayers.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((player) => detectNewGamesForPlayer(player))
      );

      // Compter les nouvelles games détectées
      results.forEach((result) => {
        if (result === true) newGamesDetected++;
      });

      // Pause entre les batches pour respecter les limites de l'API
      if (i + batchSize < globalPlayers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Message de résumé
    if (newGamesDetected === 0) {
      logGameDetector("Traitement terminé, pas de nouveau match.");
    } else {
      logGameDetector(
        `Traitement terminé. ${newGamesDetected} nouvelle(s) game(s) détectée(s).`
      );
    }

    // Nettoyer le cache périodiquement
    if (Math.random() < 0.1) {
      // 10% de chance de nettoyer
      matchCache.clear();
      rankCache.clear();
    }
  } catch (error) {
    logGameDetector(
      "Erreur lors du traitement des joueurs globaux: " +
        (error?.message || error)
    );
  }
}

// Fonction de compatibilité (dépréciée)
export async function processAllFriends() {
  logGameDetector(
    "processAllFriends est déprécié, utilisez processAllGlobalPlayers à la place"
  );
  return processAllGlobalPlayers();
}
