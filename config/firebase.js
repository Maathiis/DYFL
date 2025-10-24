import { Expo } from "expo-server-sdk";

// Configuration Firebase pour Expo
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN, // Optionnel
});

// Configuration FCM (à ajouter quand vous aurez la clé)
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

export { expo, FCM_SERVER_KEY };
