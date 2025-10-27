import connectDB from "../config/database.js";
import GlobalPlayer from "../models/GlobalPlayer.js";
import { getPuuidFromRiotId } from "../services/gameDetector.js";

async function fixInvalidPUUIDs() {
  try {
    await connectDB();
    console.log("🔍 Recherche des PUUIDs invalides...\n");

    const players = await GlobalPlayer.find({});
    const invalidPlayers = [];

    for (const player of players) {
      // Un PUUID valide devrait faire ~78 caractères
      // et contenir seulement des alphanumériques, - et _
      const isValid =
        player.puuid &&
        typeof player.puuid === "string" &&
        player.puuid.length >= 70 &&
        /^[a-zA-Z0-9_-]+$/.test(player.puuid);

      if (!isValid) {
        invalidPlayers.push(player);
        console.log(`❌ PUUID invalide trouvé:`);
        console.log(`   RiotID: ${player.riotId}`);
        console.log(`   PUUID: ${player.puuid}`);
        console.log(`   Longueur: ${player.puuid?.length || 0}\n`);
      }
    }

    if (invalidPlayers.length === 0) {
      console.log("✅ Tous les PUUIDs sont valides !");
      return;
    }

    console.log(
      `\n📊 ${invalidPlayers.length} joueur(s) avec PUUID invalide trouvé(s)`
    );
    console.log("🔧 Réparation en cours...\n");

    for (const player of invalidPlayers) {
      try {
        console.log(`🔄 Réparation de ${player.riotId}...`);

        // Récupérer le nouveau PUUID depuis l'API Riot
        const newPuuid = await getPuuidFromRiotId(player.riotId);

        // Mettre à jour le joueur avec le bon PUUID
        await GlobalPlayer.findByIdAndUpdate(player._id, {
          puuid: newPuuid,
          lastUpdated: new Date(),
        });

        console.log(`✅ ${player.riotId} réparé avec le PUUID: ${newPuuid}\n`);
      } catch (error) {
        console.error(
          `❌ Impossible de réparer ${player.riotId}: ${error.message}\n`
        );
      }
    }

    console.log("✅ Réparation terminée !");
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    process.exit(0);
  }
}

fixInvalidPUUIDs();
