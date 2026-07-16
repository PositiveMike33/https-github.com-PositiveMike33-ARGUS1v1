import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  Send, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Code, 
  Activity, 
  Lock, 
  Key, 
  FileCode,
  ArrowRight,
  Database,
  Cpu,
  RefreshCw
} from 'lucide-react';

interface ApiTesterProps {
  user: any;
}

export function ApiTester({ user }: ApiTesterProps) {
  // Input payload state
  const [streamId, setStreamId] = useState('stm-green-line-delay-704');
  const [sector, setSector] = useState<'STM' | 'AVIATION' | 'MARITIME' | 'CCTV'>('STM');
  const [metricName, setMetricName] = useState('substation_temperature');
  const [metricValue, setMetricValue] = useState(88.4);
  const [unit, setUnit] = useState('°C');
  const [context, setContext] = useState('Incident thermique mineur sur la ligne Verte - Section de contrôle Berri-UQAM.');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [metaJson, setMetaJson] = useState('{\n  "rail_temp": "42.1C",\n  "operators_alerted": true,\n  "subsystem_id": "SUB-402"\n}');

  // Auth type
  const [authType, setAuthType] = useState<'bearer' | 'apikey'>('apikey');
  const [customApiKey, setCustomApiKey] = useState('argus_sec_default_2026');

  // Test execution state
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    requestHeaders: any;
    requestBody: any;
    responseBody: any;
    success: boolean;
  } | null>(null);

  // Load Presets
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'stm_delay':
        setStreamId('stm-delay-orange-line');
        setSector('STM');
        setMetricName('delay_seconds');
        setMetricValue(420);
        setUnit('seconds');
        setContext('Interruption temporaire de service sur la ligne Orange entre Lionel-Groulx et Berri-UQAM en raison d\'un problème de signalisation.');
        setSeverity('high');
        setMetaJson('{\n  "impacted_stations": ["Berri-UQAM", "Champ-de-Mars", "Place-d\'Armes"],\n  "backup_shuttle_active": true\n}');
        break;
      case 'aviation_alert':
        setStreamId('cyul-aviation-radar-992');
        setSector('AVIATION');
        setMetricName('radar_unidentified_signatures');
        setMetricValue(3);
        setUnit('targets');
        setContext('Échos radar non corrélés détectés à la frontière sud de la zone de contrôle CYUL. Altitude estimée : 12 000 pieds.');
        setSeverity('medium');
        setMetaJson('{\n  "squawk": "7700",\n  "radar_station": "CYUL-WEST-R1",\n  "nearest_corridor": "AIRWAY-V12"\n}');
        break;
      case 'maritime_collision':
        setStreamId('st-lawrence-maritime-005');
        setSector('MARITIME');
        setMetricName('distance_to_nearest_vessel');
        setMetricValue(180);
        setUnit('meters');
        setContext('Alerte de proximité critique émise dans le chenal de LaSalle. Rapprochement excessif détecté entre deux navires de transport.');
        setSeverity('critical');
        setMetaJson('{\n  "vessel_a_mmsi": "316001234",\n  "vessel_b_mmsi": "316005678",\n  "collision_time_est": "180s"\n}');
        break;
      case 'cctv_motion':
        setStreamId('cctv-berri-station-cam3');
        setSector('CCTV');
        setMetricName('pixel_motion_ratio');
        setMetricValue(94.8);
        setUnit('%');
        setContext('Détection d\'activité anormale et mouvements de foule sur le quai de la ligne Jaune après les heures de service régulières.');
        setSeverity('low');
        setMetaJson('{\n  "camera_model": "AXIS-Q6055-E",\n  "framerate_fps": 30,\n  "night_vision_active": true\n}');
        break;
      default:
        break;
    }
  };

  // Run REST query
  const executeApiTest = async () => {
    setIsSending(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      // 1. Prepare payload
      let parsedMeta = {};
      try {
        parsedMeta = JSON.parse(metaJson);
      } catch (e) {
        console.warn('Invalid meta JSON, falling back to empty object', e);
      }

      const payload = {
        streamId,
        sector,
        metricName,
        metricValue,
        unit: unit || undefined,
        context,
        severity,
        timestamp: new Date().toISOString(),
        meta: parsedMeta
      };

      // 2. Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (authType === 'apikey') {
        headers['X-ARGUS-API-Key'] = customApiKey;
      } else {
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      // 3. Fire API
      const response = await fetch('/api/v1/streams/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const durationMs = Date.now() - startTime;
      let responseBody: any;
      try {
        responseBody = await response.json();
      } catch (e) {
        responseBody = { error: 'Failed to parse JSON response body.' };
      }

      setTestResult({
        status: response.status,
        statusText: response.statusText,
        durationMs,
        requestHeaders: headers,
        requestBody: payload,
        responseBody,
        success: response.ok
      });

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      setTestResult({
        status: 500,
        statusText: 'Internal Connection Failure',
        durationMs,
        requestHeaders: {},
        requestBody: {},
        responseBody: { error: error.message || 'La connexion à l\'API locale de l\'application a échoué.' },
        success: false
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-6" id="api-tester-suite">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide font-sans">
            <Terminal className="w-4.5 h-4.5 text-indigo-400" />
            <span>BANQUET D'ESSAI INTÉGRÉ DE L'API REST ARGUS</span>
          </h2>
          <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
            EFFECTUEZ DES REQUÊTES EN DIRECT SUR LE POINT D'ENTRÉE SÉCURISÉ /api/v1/streams/analyze
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
          <span className="text-slate-400">Presets :</span>
          <button onClick={() => applyPreset('stm_delay')} className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-emerald-400 rounded border border-slate-800 font-semibold cursor-pointer">
            🚆 STM Delay
          </button>
          <button onClick={() => applyPreset('aviation_alert')} className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded border border-slate-800 font-semibold cursor-pointer">
            ✈️ Aviation Radar
          </button>
          <button onClick={() => applyPreset('maritime_collision')} className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-red-400 rounded border border-slate-800 font-semibold cursor-pointer">
            🚢 Maritime
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 rounded-xl border border-slate-900 p-4 space-y-3.5 text-left text-xs font-mono">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Authentification & Transport</span>
            </h3>

            {/* Auth Selector */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-semibold block">METHODE D'ACCÈS :</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAuthType('apikey')}
                  className={`p-2 rounded border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authType === 'apikey'
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>X-ARGUS-API-Key</span>
                </button>
                <button
                  onClick={() => setAuthType('bearer')}
                  className={`p-2 rounded border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authType === 'bearer'
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Bearer Token</span>
                </button>
              </div>
            </div>

            {/* Config Fields depending on Auth Selection */}
            {authType === 'apikey' ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9.5px] text-slate-400 font-semibold">CLE EN DIRECT :</label>
                  <span className="text-[8px] text-slate-600">Défaut: argus_sec_default_2026</span>
                </div>
                <input
                  type="text"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-1.5 px-2.5 rounded text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : (
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-400">Statut Firebase Auth :</span>
                  {user ? (
                    <span className="text-emerald-400 font-bold">OPÉRATEUR CONNECTÉ</span>
                  ) : (
                    <span className="text-amber-400 animate-pulse font-bold">DÉCONNECTÉ (Requête Anonyme)</span>
                  )}
                </div>
                <p className="text-[8.5px] text-slate-500 leading-normal">
                  {user 
                    ? `Utilise automatiquement le jeton d'identification JWT émis pour ${user.displayName || user.email}.`
                    : 'Alerte: L\'absence d\'utilisateur authentifié provoquera une erreur 401 Unauthorized de l\'API.'}
                </p>
              </div>
            )}
          </div>

          {/* 2. Payload Configuration */}
          <div className="bg-slate-950 rounded-xl border border-slate-900 p-4 space-y-3 text-left text-xs font-mono">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-900 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Paramètres de flux (Zod Schema)</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-semibold">STREAM ID :</label>
                <input
                  type="text"
                  value={streamId}
                  onChange={(e) => setStreamId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-1.5 px-2 rounded text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-semibold">SECTEUR :</label>
                <select
                  value={sector}
                  onChange={(e: any) => setSector(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-1.5 px-2 rounded text-[11px] focus:outline-none focus:border-indigo-500"
                >
                  <option value="STM">STM (Métro)</option>
                  <option value="AVIATION">AVIATION (Radar)</option>
                  <option value="MARITIME">MARITIME (Rive)</option>
                  <option value="CCTV">CCTV (Optique)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[9px] text-slate-400 block mb-1 font-semibold">NOM DE MÉTRIQUE :</label>
                <input
                  type="text"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-1.5 px-2 rounded text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-semibold">VALEUR :</label>
                <input
                  type="number"
                  value={metricValue}
                  onChange={(e) => setMetricValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-1.5 px-2 rounded text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-slate-400 block mb-1 font-semibold">UNITÉ (OPT) :</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-1.5 px-2 rounded text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] text-slate-400 block mb-1 font-semibold">SEVÉRITÉ :</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`py-1 text-[8.5px] rounded border font-bold transition-all cursor-pointer uppercase text-center ${
                        severity === sev
                          ? sev === 'critical'
                            ? 'bg-red-950 border-red-500 text-red-400'
                            : sev === 'high'
                            ? 'bg-amber-950 border-amber-500 text-amber-400'
                            : sev === 'medium'
                            ? 'bg-blue-950 border-blue-500 text-blue-400'
                            : 'bg-slate-800 border-slate-500 text-slate-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate-400 block mb-1 font-semibold">CONTEXTE TEXTUEL (DÉTAILS) :</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-[11px] focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-400 block mb-1 font-semibold">DONNÉES SUPPLÉMENTAIRES (META JSON) :</label>
              <textarea
                value={metaJson}
                onChange={(e) => setMetaJson(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-[11px] font-mono focus:outline-none focus:border-indigo-500 resize-none text-[10.5px]"
              />
            </div>
          </div>

          <button
            onClick={executeApiTest}
            disabled={isSending}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/15 font-bold tracking-wide text-xs font-sans transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>EXÉCUTION EN COURS DE L'API REST...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>SOUMETTRE LE FLUX AUX MODÈLES ARGUS</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Dynamic Raw Stream Logs & API Responses (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 rounded-xl border border-slate-900 p-4 h-[560px] flex flex-col justify-between text-left">
            <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Console Télémétrique de Réponse API</span>
                </h3>
                {testResult ? (
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                    testResult.success 
                      ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800' 
                      : 'bg-red-950/50 text-red-400 border-red-800'
                  }`}>
                    CODE: {testResult.status} {testResult.statusText}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[9.5px] font-medium rounded animate-pulse">
                    EN ATTENTE D'ÉMISSION
                  </span>
                )}
              </div>

              {testResult ? (
                <div className="flex-1 flex flex-col space-y-3 overflow-y-auto pr-1">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <div className="text-[8.5px] text-slate-500 font-semibold uppercase">TEMPS DE TRANSIT</div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">{testResult.durationMs} ms</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <div className="text-[8.5px] text-slate-500 font-semibold uppercase">INTEGRITE REQUÊTE</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">ZOD VALIDE</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <div className="text-[8.5px] text-slate-500 font-semibold uppercase">REPONDANT ARGUS</div>
                      <div className="text-xs font-bold text-indigo-400 mt-0.5">GEMINI 3.5</div>
                    </div>
                  </div>

                  {/* Request Payload Details */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold font-mono">EN-TÊTES HTTP ENVOYÉS :</div>
                    <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300 overflow-x-auto">
                      {JSON.stringify(testResult.requestHeaders, null, 2)}
                    </pre>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-1 flex-1 flex flex-col min-h-0">
                    <div className="text-[10px] text-slate-400 font-bold font-mono">REPONSE DE L'API REST ARGUS (JSON BRUT) :</div>
                    <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-auto flex-1 select-text">
                      {JSON.stringify(testResult.responseBody, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 font-sans">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-indigo-500 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Prêt pour l'interrogation télémétrique</h4>
                    <p className="text-[11px] text-slate-500 leading-normal max-w-sm">
                      Configurez vos données de flux de transport sur le panneau de gauche et cliquez sur "Soumettre le flux" pour tester la validité des modèles d'évaluation et de l'arbre de pensées (ToT) en direct.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-900 pt-3 flex items-center justify-between font-mono text-[9px] text-slate-500">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-500 animate-pulse" />
                <span>REST SYSTEM: LOCAL API ON /api/v1/streams/analyze</span>
              </span>
              <span>HEURE EST: {new Date().toLocaleTimeString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
