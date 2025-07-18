import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';

/**
 * Récupère ou crée un utilisateur basé sur le deviceId
 * const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

// Map pour stocker les deviceId temporairement (en production, utilisez Redis)
const deviceIdMap = new Map();
 * Génère ou récupère un deviceId pour l'appareil
function getOrCreateDeviceId() {
  // En production, vous pourriez utiliser des identifiants d'appareil réels
  // comme l'ID de l'appareil mobile, l'adresse MAC, etc.
  const deviceId = uuidv4();
  return deviceId;
}
 */

export async function getOrCreateUser(deviceId) {
  try {
    let user = await User.findOne({ deviceId });
    
    if (!user) {
      user = new User({ deviceId });
      await user.save();
    } else {
      // Mettre à jour lastSeen
      user.lastSeen = new Date();
      await user.save();
    }
    
    return user;
  } catch (error) {
    console.error('Erreur lors de la récupération/création de l\'utilisateur:', error);
    throw error;
  }
}

/**
 * Récupère un utilisateur par deviceId
 */
export async function getUserByDeviceId(deviceId) {
  try {
    const user = await User.findOne({ deviceId });
    return user;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    throw error;
  }
}

/**
 * Middleware pour gérer l'utilisateur dans les requêtes
 */
export async function userMiddleware(req, res, next) {
  try {
    // Récupérer deviceId depuis le body, l'en-tête X-Device-ID, ou les paramètres
    const deviceId = req.body.deviceId || req.headers['x-device-id'] || req.query.deviceId;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId requis (body, en-tête X-Device-ID, ou paramètre query)' });
    }
    
    const user = await getOrCreateUser(deviceId);
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur dans le middleware utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la gestion de l\'utilisateur' });
  }
}

/**
 * Middleware pour les requêtes GET avec deviceId en paramètre
 */
export async function userMiddlewareGet(req, res, next) {
  try {
    // Récupérer deviceId depuis l'en-tête X-Device-ID ou les paramètres query
    const deviceId = req.headers['x-device-id'] || req.query.deviceId;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId requis (en-tête X-Device-ID ou paramètre query)' });
    }
    
    const user = await getOrCreateUser(deviceId);
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur dans le middleware utilisateur GET:', error);
    res.status(500).json({ error: 'Erreur lors de la gestion de l\'utilisateur' });
  }
}

/**
 * Supprime un utilisateur et tous ses amis
 */
export async function deleteUser(deviceId) {
  try {
    const user = await User.findOneAndDelete({ deviceId });
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    return user;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    throw error;
  }
} 