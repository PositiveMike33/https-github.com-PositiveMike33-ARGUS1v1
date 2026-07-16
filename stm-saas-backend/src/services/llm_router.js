import CircuitBreaker from 'opossum';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';

// 🟢 INFÉRENCE LOCALE (Coût : 0.00$)
const callLocalOllama = async (prompt, modelName) => {
  console.log(`🤖 [INFERENCE] Exécution sur RTX 4050 (Modèle: ${modelName})...`);
  
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, prompt, stream: false })
  });

  if (!response.ok) throw new Error(`Ollama Node HS (${response.status})`);
  const data = await response.json();
  
  return {
    provider: `ollama_${modelName}`,
    text: data.response,
    tokens: { input: data.prompt_eval_count || 0, output: data.eval_count || 0 }
  };
};

// ☁️ INFÉRENCE CLOUD (Coût : Gemini Pricing)
const callGeminiCloud = async (prompt) => {
  console.log(`☁️ [INFERENCE] Routage vers Gemini Cloud (Contexte étendu)...`);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  return {
    provider: 'gemini_cloud',
    text: response.text,
    tokens: { input: usage.promptTokenCount, output: usage.candidatesTokenCount }
  };
};

// ⚙️ DISJONCTEUR : Protection de l'API Cloud avec Fallback Local
const geminiBreaker = new CircuitBreaker(callGeminiCloud, { 
  timeout: 10000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 30000 
});

geminiBreaker.fallback(async (prompt, error) => {
  console.warn(`⚠️ [FAILOVER] API Gemini (Cloud) HS - Raison : ${error.message}. Bascule d'urgence sur Ollama local (deus_ex_sophia_ft)...`);
  return await callLocalOllama(prompt, 'deus_ex_sophia_ft');
});

// 🚀 AIGUILLAGE INTELLIGENT
export const generateStmAnalysis = async (prompt, stmData) => {
  // Détermination de la complexité (Requiert-on le Cloud ?)
  const isComplex = stmData.preferences === 'fewest_transfers' || prompt.length > 2500;

  if (isComplex) {
    return await geminiBreaker.fire(prompt);
  } else {
    // Si simple : choix entre télémétrie pure (argus) ou analyse (deus_ex_sophia_ft)
    const model = stmData.type === 'telemetry' ? 'argus' : 'deus_ex_sophia_ft';
    return await callLocalOllama(prompt, model);
  }
};
