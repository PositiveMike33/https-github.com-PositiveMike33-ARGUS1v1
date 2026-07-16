/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { APIIntegrationLog } from '../types';
import { 
  DollarSign, 
  Code, 
  Bell, 
  Terminal, 
  Sliders, 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  Check,
  MessageSquare,
  Download,
  Search
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface EliteMonetizationProps {
  apiLogs: APIIntegrationLog[];
  onRefreshLogs: () => void;
  isLoadingLogs: boolean;
  alertThreshold: number;
  isSubscribed: boolean;
  onUpdateSubscription: (threshold: number, subscribed: boolean) => void;
  twilioEnabled: boolean;
  twilioPhoneNumber: string;
  onUpdateTwilio: (enabled: boolean, phoneNumber: string) => void;
}

interface TokenConsumptionChartProps {
  chartData: any[];
  stripeCeiling: number;
}

export const TokenConsumptionChart: React.FC<TokenConsumptionChartProps> = ({
  chartData,
  stripeCeiling,
}) => {
  return (
    <div className="h-[120px] w-full text-[9px] select-none" id="token-consumption-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 8 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 8 }} domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, stripeCeiling * 1.15)]} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '4px', color: '#f1f5f9', fontSize: '9px' }}
            labelClassName="text-emerald-400 font-bold font-mono"
          />
          <Area type="monotone" dataKey="cumulative" stroke="#10b981" fillOpacity={1} fill="url(#colorCumulative)" name="Tokens cumulés" strokeWidth={1.5} />
          <ReferenceLine y={stripeCeiling} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limite Stripe', fill: '#ef4444', position: 'top', fontSize: 8 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const EliteMonetization: React.FC<EliteMonetizationProps> = ({
  apiLogs,
  onRefreshLogs,
  isLoadingLogs,
  alertThreshold,
  isSubscribed,
  onUpdateSubscription,
  twilioEnabled,
  twilioPhoneNumber,
  onUpdateTwilio,
}) => {
  const [activeTab, setActiveTab] = useState<'daas' | 'predictive' | 'audit'>('daas');
  const [copied, setCopied] = useState<boolean>(false);
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stripeCeiling, setStripeCeiling] = useState<number>(350000); // 350k tokens default ceiling

  // Estimate tokens from log size (e.g., "12.34 KB" -> 12.34)
  const estimateTokensForLog = (log: APIIntegrationLog) => {
    const kb = parseFloat(log.responseSize) || 5;
    return Math.floor(kb * 250) + 12000; // base tokens per API call
  };

  // Get total token consumption
  const totalConsumed = apiLogs.reduce((acc, log) => acc + estimateTokensForLog(log), 0);

  // Prepare data for the real-time token consumption chart (chronological oldest to newest)
  const prepareChartData = () => {
    if (!apiLogs || apiLogs.length === 0) {
      // Mock history so the chart is populated initially
      return [
        { name: '15:50', tokens: 42000, cumulative: 42000 },
        { name: '15:52', tokens: 58000, cumulative: 100000 },
        { name: '15:55', tokens: 61000, cumulative: 161000 },
        { name: '15:57', tokens: 49000, cumulative: 210000 },
        { name: '16:00', tokens: 72000, cumulative: 282000 },
      ];
    }

    let runningSum = 0;
    const sortedLogs = [...apiLogs].reverse();
    return sortedLogs.map((log) => {
      const tokens = estimateTokensForLog(log);
      runningSum += tokens;
      const timeString = new Date(log.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return {
        name: timeString,
        tokens,
        cumulative: runningSum,
      };
    });
  };

  const chartData = prepareChartData();

  const handleExportLogs = () => {
    const headers = ['ID', 'Endpoint', 'Status', 'Response Size', 'Timestamp'];
    const rows = apiLogs.map(log => [
      log.id,
      `"${log.endpoint || ''}"`,
      log.status,
      `"${log.responseSize || ''}"`,
      `"${log.timestamp || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `api_telemetry_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = apiLogs.filter((log) => {
    if (!statusFilter) return true;
    return log.status.toString().includes(statusFilter);
  });

  const copyCode = () => {
    const code = `curl -X POST https://argus-decision.io/api/tot/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-ARGUS-API-KEY: argus_live_831a89c9fd2e1b1d" \\
  -d '{
    "feedId": "stm-01",
    "type": "STM",
    "title": "Metro Line Power Grid Spike",
    "source": "STM Fleet Telemetry",
    "severity": "high",
    "value": "22 min delay",
    "details": "Substation energy surge detected at Berri-UQAM..."
  }'`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 overflow-hidden shadow-2xl flex flex-col h-full"
      id="elite-monetization-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="font-display font-semibold text-sm tracking-wide text-slate-100">
              CENTRE D'INTÉGRATION ET DE REVENUS ÉLITE
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              DÉCISION EN TANT QUE SERVICE & AUDIT OPÉRATIONNEL
            </p>
          </div>
        </div>
        <button
          onClick={handleExportLogs}
          className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 hover:text-emerald-300 border border-emerald-900/60 bg-emerald-950/25 px-3 py-1.5 rounded transition-colors cursor-pointer font-bold shadow-sm"
          id="btn-header-export-logs"
          title="Exporter l'historique des logs au format CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exporter les logs (CSV)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/20 font-mono text-xs">
        <button
          onClick={() => setActiveTab('daas')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all duration-200 ${
            activeTab === 'daas'
              ? 'border-emerald-500 text-emerald-400 font-semibold bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10'
          }`}
        >
          Decision-as-a-Service
        </button>
        <button
          onClick={() => setActiveTab('predictive')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all duration-200 ${
            activeTab === 'predictive'
              ? 'border-emerald-500 text-emerald-400 font-semibold bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10'
          }`}
        >
          Tableau de bord prédictif
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all duration-200 ${
            activeTab === 'audit'
              ? 'border-emerald-500 text-emerald-400 font-semibold bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10'
          }`}
        >
          Audit de sécurité
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        
        {activeTab === 'daas' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Ingestion des décisions par API REST (DaaS)</span>
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Monétisez les indicateurs prédictifs de fluidité en vendant des données d'évaluation des risques directement exploitables par des machines aux opérateurs logistiques.
              </p>
            </div>

            {/* API Key info */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">CLÉ D'INTÉGRATION DAAS</span>
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    {apiKeyVisible ? 'argus_live_831a89c9fd2e1b1d' : '••••••••••••••••••••••••••••••••'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded transition-colors"
              >
                {apiKeyVisible ? 'Masquer' : 'Révéler'}
              </button>
            </div>

            {/* Code Block */}
            <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs">
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-800/60 flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">EXPÉDITION DE TÉLÉMÉTRIE CURL</span>
                <button
                  onClick={copyCode}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
                  <span>{copied ? 'Copié !' : 'Copier le code'}</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-[10px] text-slate-300">
{`curl -X POST https://argus-decision.io/api/tot/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-ARGUS-API-KEY: argus_live_831a89c9fd2e1b1d" \\
  -d '{
    "feedId": "stm-01",
    "type": "STM",
    "title": "Metro Line Power Grid Spike",
    "source": "STM Fleet Telemetry",
    "severity": "high",
    "value": "22 min delay",
    "details": "Substation energy surge detected at Berri-UQAM..."
  }'`}
              </pre>
            </div>

            {/* Live Endpoint Traffic logs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Logs de trafic API en direct (Simulé)</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportLogs}
                    className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 hover:text-emerald-300 border border-emerald-900/60 bg-emerald-950/25 px-2.5 py-1 rounded transition-colors cursor-pointer font-bold"
                    id="btn-export-api-logs"
                    title="Télécharger les logs de télémétrie au format CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter les logs (CSV)</span>
                  </button>
                  <button 
                    onClick={onRefreshLogs}
                    disabled={isLoadingLogs}
                    className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 hover:text-emerald-300 border border-emerald-900/60 bg-emerald-950/25 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </button>
                </div>
              </div>

              {/* Status Code Filter Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <input
                  type="text"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  placeholder="Rechercher par code d'état HTTP (ex: 200, 500)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none rounded font-mono text-[10px] transition-colors"
                  id="api-status-filter-input"
                />
              </div>

              <div className="max-h-[160px] overflow-y-auto rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5 font-mono text-[10px] space-y-2">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between border-b border-slate-900/60 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-emerald-400 font-semibold">[POST]</span>
                        <span className="truncate max-w-[120px]">{log.endpoint}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span>{log.responseSize}</span>
                        <span className={`px-1 rounded text-[9px] ${
                          log.status === 200 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60' : 'bg-red-950/60 text-red-400 border border-red-900/60'
                        }`}>
                          {log.status}
                        </span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">Aucun log correspondant au filtre ou enregistré.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'predictive' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Contrôle des seuils d'actifs urbains</span>
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Niveau d'abonnement au tableau de bord personnalisé permettant aux gestionnaires d'actifs de définir des déclencheurs d'alarme en temps réel et de gérer les cibles de fluidité actives.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-4 font-mono text-xs">
              {/* Alert threshold slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Seuil d'alerte de menace critique :</span>
                  <span className="text-emerald-400 font-bold">{alertThreshold}% Danger</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="95" 
                  value={alertThreshold} 
                  onChange={(e) => onUpdateSubscription(parseInt(e.target.value), isSubscribed)}
                  className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer" 
                />
                <p className="text-[9px] text-slate-500 leading-tight">
                  Envoie automatiquement les données de télémétrie par Webhook aux abonnés lorsque le score de la branche ToT dépasse ce paramètre.
                </p>
              </div>

              {/* Toggle subscription mock */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-900/60">
                <div className="flex items-center gap-2">
                  <Bell className={`w-4 h-4 ${isSubscribed ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-slate-300 block font-semibold">Signaux Webhook actifs</span>
                    <span className="text-[10px] text-slate-500 block">Envoi de webhooks vers CYUL & Port de Montréal</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSubscription(alertThreshold, !isSubscribed)}
                  className={`px-3 py-1 text-[11px] rounded transition-all duration-200 border ${
                    isSubscribed 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {isSubscribed ? 'CONNECTÉ' : 'EN ATTENTE'}
                </button>
              </div>

              {/* Twilio SMS Alerts Section */}
              <div className="flex flex-col gap-3 pt-3 border-t border-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${twilioEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-slate-300 block font-semibold">SMS d'Alerte Critiques (Twilio)</span>
                      <span className="text-[10px] text-slate-500 block">SMS si score de menace ≥ {alertThreshold}%</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateTwilio(!twilioEnabled, twilioPhoneNumber)}
                    className={`px-3 py-1 text-[11px] rounded transition-all duration-200 border ${
                      twilioEnabled 
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {twilioEnabled ? 'ACTIF' : 'INACTIF'}
                  </button>
                </div>

                {twilioEnabled && (
                  <div className="space-y-1.5 pl-6">
                    <label className="text-[9px] text-slate-500 block uppercase font-bold">Numéro destinataire (E.164) :</label>
                    <input
                      type="tel"
                      value={twilioPhoneNumber}
                      placeholder="+15145550199"
                      onChange={(e) => onUpdateTwilio(twilioEnabled, e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded px-2.5 py-1.5 font-mono text-xs placeholder:text-slate-700 transition-colors"
                    />
                    <p className="text-[8px] text-slate-500 leading-normal font-sans">
                      Saisir avec indicatif pays. Si les secrets Twilio ne sont pas renseignés dans l'environnement, le système passe automatiquement en mode simulateur/sandbox sécurisé.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Suivi de la Consommation de Tokens en temps réel & Plafond de Facturation Stripe */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CONSO TOKENS VS PLAFOND STRIPE</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Calcul en temps réel de l'activité du raisonneur
                  </p>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 uppercase block">Plafond Actif :</span>
                  <span className="text-emerald-400 font-bold block text-xs">
                    {(stripeCeiling / 1000).toFixed(0)}k Tokens (${(stripeCeiling * 0.00015).toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Chart container */}
              <TokenConsumptionChart chartData={chartData} stripeCeiling={stripeCeiling} />

              {/* Slider for Stripe billing ceiling */}
              <div className="space-y-1.5 pt-2 border-t border-slate-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Ajuster le plafond Stripe :</span>
                  <span className="text-red-400 font-bold">{(stripeCeiling / 1000).toFixed(0)}k Tokens</span>
                </div>
                <input 
                  type="range" 
                  min="100000" 
                  max="1000000" 
                  step="50000"
                  value={stripeCeiling} 
                  onChange={(e) => setStripeCeiling(parseInt(e.target.value))}
                  className="w-full accent-red-500 bg-slate-800 h-1 rounded-lg cursor-pointer" 
                  id="stripe-ceiling-slider"
                />
                
                {/* Visual Alert Badge */}
                {totalConsumed >= stripeCeiling ? (
                  <div className="p-2 bg-red-950/40 border border-red-900/50 rounded flex items-center gap-2 text-[9px] text-red-400 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500 block"></span>
                    <span>ALERTE : Plafond Stripe dépassé ! ({(totalConsumed / stripeCeiling * 100).toFixed(1)}%). Appels restreints.</span>
                  </div>
                ) : totalConsumed >= stripeCeiling * 0.8 ? (
                  <div className="p-2 bg-amber-950/40 border border-amber-900/50 rounded flex items-center gap-2 text-[9px] text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 block animate-ping"></span>
                    <span>ATTENTION : Proche du plafond Stripe ({(totalConsumed / stripeCeiling * 100).toFixed(1)}%).</span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 rounded flex items-center gap-2 text-[9px] text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                    <span>MARGE VALIDE : ({(totalConsumed / stripeCeiling * 100).toFixed(1)}% consommés).</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Tiers */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">INDICATEURS DE REVENUS</span>
                <span className="text-base font-bold text-slate-200 mt-1 block">18,4k $</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">MRR Récurrent</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">ABONNÉS</span>
                <span className="text-base font-bold text-slate-200 mt-1 block">42 opérateurs</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Maritime & Transport</span>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Audit de sécurité opérationnel et conformité</span>
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Vérification continue des logs confirmant que les actions pilotées par LLM sont conformes aux règles régionales de sécurité et de sûreté des transports.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-slate-300">
                <span>Cadre de sécurité D.U.R.</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 100% conforme
                </span>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase block">STATUT DES CRITÈRES D'AUDIT :</span>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded border border-slate-800/60">
                    <span className="text-slate-400">1. Isolation "Mur de Chine" (Barrières)</span>
                    <span className="text-emerald-400 font-semibold uppercase">VÉRIFIÉ</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded border border-slate-800/60">
                    <span className="text-slate-400">2. Limites de récursion (Disjoncteur)</span>
                    <span className="text-emerald-400 font-semibold uppercase">ACTIF (max 5)</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded border border-slate-800/60">
                    <span className="text-slate-400">3. Contrôle humain prioritaire</span>
                    <span className="text-amber-400 font-semibold uppercase">STANDBY MANUEL</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-mono leading-normal italic text-center">
              "La complexity doit être transmutée en intelligence structurée."
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
