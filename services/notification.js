import { getUsersWithPlayer } from './globalPlayerManager.js';
import { Expo } from 'expo-server-sdk';
const expo = new Expo();

/*async function sendDefeatNotification(user) {
  if (Expo.isExpoPushToken(user.expoPushToken)) {
    await expo.sendPushNotificationsAsync([{
      to: user.expoPushToken,
      title: 'Défaite détectée 🛑',
      body: 'Ton ami Zoorva a perdu une partie !',
    }]);
  }
}*/

// ===== FONCTIONS DE NOTIFICATIONS =====

// Notification simple (pour compatibilité)
export const sendNotification = (message) => {
  // À brancher avec FCM, Expo, etc.
};

// Notification pour un utilisateur spécifique
export const sendNotificationToUser = (deviceId, message) => {
  // À brancher avec FCM, Expo, etc.
};

// Notification pour tous les utilisateurs qui ont un joueur en ami
export const sendNotificationToUsersWithPlayer = async (riotId, message) => {
  try {
    const users = await getUsersWithPlayer(riotId);
    
    if (users.length === 0) {
      return;
    }
    
    // Envoyer la notification à chaque utilisateur
    for (const user of users) {
      await sendNotificationToUser(user.deviceId, message);
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'envoi des notifications pour ${riotId}:`, error);
  }
};

// Notification de défaite avec gestion multi-utilisateurs
export const sendDefeatNotification = async (riotId, queueType, playerData, matchDuration, lpLoss = 0) => {
  const { secondsToMinutes } = await import('../utils/format.js');
  const minutes = secondsToMinutes(matchDuration);
  
  let message = `${queueType} - ${riotId} a perdu avec ${playerData.championName} (${playerData.kills}/${playerData.deaths}/${playerData.assists}) en ${minutes} minutes`;
  
  if (lpLoss > 0) {
    message += ` (-${lpLoss} LP)`;
  }
  
  await sendNotificationToUsersWithPlayer(riotId, message);
};