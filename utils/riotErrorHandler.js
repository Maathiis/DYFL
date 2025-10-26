// Utilitaires pour la gestion des erreurs API Riot Games
export function handleRiotAPIError(error, context = "") {
  const contextMsg = context ? ` (${context})` : "";

  if (error.response?.status === 502) {
    return new Error(`API Riot Games temporairement indisponible${contextMsg}`);
  } else if (error.response?.status === 503) {
    return new Error(`API Riot Games en maintenance${contextMsg}`);
  } else if (error.response?.status === 429) {
    return new Error(`Limite de taux API Riot Games dépassée${contextMsg}`);
  } else if (error.response?.status === 404) {
    return new Error(`Ressource non trouvée${contextMsg}`);
  } else if (error.response?.status === 403) {
    return new Error(`Clé API Riot Games invalide ou expirée${contextMsg}`);
  } else if (error.code === "ECONNABORTED") {
    return new Error(`Timeout de connexion à l'API Riot Games${contextMsg}`);
  } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    return new Error(
      `Impossible de se connecter à l'API Riot Games${contextMsg}`
    );
  }

  return error;
}

// Fonction pour retry avec backoff exponentiel
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Ne pas retry pour les erreurs 4xx (sauf 429)
      if (
        error.response?.status >= 400 &&
        error.response?.status < 500 &&
        error.response?.status !== 429
      ) {
        throw handleRiotAPIError(error);
      }

      if (attempt === maxRetries) {
        throw handleRiotAPIError(error);
      }

      // Attendre avant le prochain essai (backoff exponentiel)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(
        `Tentative ${attempt}/${maxRetries} échouée, retry dans ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
