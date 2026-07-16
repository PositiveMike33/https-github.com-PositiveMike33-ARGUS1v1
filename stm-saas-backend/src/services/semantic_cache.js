import crypto from 'crypto';
import { redisClient } from '../config/db.js';

export const generateCacheKey = (stmData) => {
  const rawString = JSON.stringify(stmData).toLowerCase();
  return 'stm_route:v1:' + crypto.createHash('sha256').update(rawString).digest('hex');
};

export const checkSemanticCache = async (stmData) => {
  const cacheKey = generateCacheKey(stmData);
  const cachedResponse = await redisClient.get(cacheKey);
  
  if (cachedResponse) {
    console.log(`⚡ [CACHE HIT] Itinéraire récupéré en < 5ms | Coût: 0$ | Marge: 100%`);
    return JSON.parse(cachedResponse);
  }
  return null;
};

export const setSemanticCache = async (stmData, llmResponse) => {
  const cacheKey = generateCacheKey(stmData);
  // 600 secondes = 10 minutes (Garantit la pertinence face aux alertes STM)
  await redisClient.setEx(cacheKey, 600, JSON.stringify(llmResponse));
};
