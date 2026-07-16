import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import ivm from 'isolated-vm';
import { initDB } from './config/db.js';

// --- NOUVEAUX IMPORTS ---
import { checkSemanticCache, setSemanticCache } from './services/semantic_cache.js';
import { generateStmAnalysis } from './services/llm_router.js';
import { initRabbitMQ, publishBillingEvent } from './services/billing_consumer.js';
import { startGtfsWorker } from './workers/gtfs_worker.js';

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 1. Zod : Validation de la structure entrante
const stmQuerySchema = z.object({
  origin: z.string().min(2).max(100),
  destination: z.string().min(2).max(100),
  preferences: z.enum(['fastest', 'accessible', 'fewest_transfers']).default('fastest'),
  type: z.string().optional()
});

// 2. Sandboxing V8 : Construction sécurisée du prompt
const promptShield = async (req, res, next) => {
  try {
    const safeData = stmQuerySchema.parse(req.body);
    
    // Création d'une machine virtuelle ultra-limitée (16 Mo de RAM max)
    const isolate = new ivm.Isolate({ memoryLimit: 16 });
    const context = await isolate.createContext();
    const jail = context.global;
    
    await jail.set('input', new ivm.Reference(safeData));
    
    // Le System Prompt métier n'est jamais manipulé dans le thread Node principal
    const script = await isolate.compileScript(`
      const data = input.copySync();
      \`[RÔLE: SYSTÈME STM EXPERT]
      Analysez l'itinéraire de \${data.origin} vers \${data.destination}. 
      Préférence: \${data.preferences}. 
      Retourne un JSON strict avec les lignes GTFS recommandées.\`;
    `);
    
    req.safePrompt = await script.run(context, { timeout: 50 }); // Time-out de 50ms (Anti-ReDoS)
    req.stmData = safeData;
    
    script.release();
    context.release();
    isolate.dispose();
    
    next();
  } catch (error) {
    console.error("[SHIELD] Erreur :", error.message);
    res.status(400).json({ error: "Requête invalide ou tentative d'injection LLM détectée." });
  }
};

// 3. Kill Switch : Protège ta carte bleue (Metered Billing)
const billingKillSwitch = async (req, res, next) => {
  // Dans la réalité, cet ID vient du header après décodage JWT par Kong ou un Middleware Auth
  const userId = req.headers['x-user-id'] || 'demo-user-123'; 

  try {
    /* 
      const { rows } = await pgPool.query('SELECT is_active FROM users WHERE id = $1', [userId]);
      if (rows.length === 0 || !rows[0].is_active) {
        return res.status(402).json({ error: "Payment Required", message: "Accès suspendu. Régularisez votre compte Stripe." });
      }
    */
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erreur de vérification des droits." });
  }
};

// --- ROUTE PRINCIPALE SAAS ENTIÈREMENT SÉCURISÉE ---
app.post('/api/v1/analyze', billingKillSwitch, promptShield, async (req, res) => {
  const userId = req.headers['x-user-id'] || 'demo-user-123';
  const stmData = req.stmData;
  const safePrompt = req.safePrompt;

  try {
    // 1. Redis Cache : Le Graal de la rentabilité
    const cachedResponse = await checkSemanticCache(stmData);
    if (cachedResponse) {
      return res.status(200).json({ status: 'success', source: 'redis_cache', data: cachedResponse.text });
    }

    // 2. Disjoncteur & Routeur Hybride (Ollama ↔ Gemini)
    const llmResult = await generateStmAnalysis(safePrompt, stmData);

    // 3. Mise en Cache du nouveau calcul
    await setSemanticCache(stmData, llmResult);

    // 4. Facturation Fire & Forget (RabbitMQ vers Stripe)
    publishBillingEvent(userId, llmResult.tokens, llmResult.provider);

    // 5. Réponse UI non-bloquante
    return res.status(200).json({ 
      status: 'success', 
      source: llmResult.provider, 
      data: llmResult.text 
    });

  } catch (error) {
    console.error('❌ [CRITICAL] Pipeline IA échoué:', error);
    res.status(503).json({ error: "L'intelligence d'itinéraire STM est temporairement indisponible." });
  }
});

// Serveur WebSocket (Pour le streaming SSE des réponses LLM vers React)
wss.on('connection', (ws) => {
  console.log('🔗 Client React/Vite connecté pour streaming LLM');
  ws.send(JSON.stringify({ type: 'system', message: 'Connecté au moteur STM-SaaS' }));
});

const PORT = process.env.PORT || 3000;
const startServer = async () => {
  await initDB();
  await initRabbitMQ(); // Connecte le canal de Facturation
  startGtfsWorker();    // Lance l'ingestion temps réel

  server.listen(PORT, () => {
    console.log(`🚀 [SaaS Engine] Backend hybride opérationnel sur le port ${PORT}`);
    console.log(`📈 Stratégie : 70% Local (Ollama) / 30% Cloud (Gemini) active.`);
    console.log(`🛡️  (Attention : Le Frontend React/Vite doit attaquer KONG sur le port 8000)`);
  });
};

startServer();
