export const startGtfsWorker = () => {
  console.log('🚇 [GTFS WORKER] Initialisation du flux STM-Realtime...');
  
  setInterval(async () => {
    try {
      // Mock de l'ingestion Protobuf GTFS-RT
      // const response = await fetch('https://api.stm.info/pub/od/gtfs-rt/ic/v2/alerts');
      // Stockage dans Redisearch
      // console.log('🔄 [GTFS WORKER] Alertes métro/bus mises à jour.');
    } catch (error) {
      console.error('❌ [GTFS WORKER] Erreur de synchro:', error.message);
    }
  }, 60000); // Polling toutes les 60s
};
