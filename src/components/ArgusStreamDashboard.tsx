/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FeedItem, ToTAnalysisResult, FeedType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Activity,
  Bell,
  CheckCircle,
  Smartphone,
  ShieldAlert,
  Sliders,
  TrendingUp,
  Cpu,
  Waves,
  Compass,
  Eye,
  AlertTriangle,
  Info,
  Server,
  Zap,
  TrendingDown,
  Lock,
  Send,
  HelpCircle
} from 'lucide-react';

interface ArgusStreamDashboardProps {
  activeFeeds: FeedItem[];
  archive: ToTAnalysisResult[];
  isSubscribed: boolean;
  alertThreshold: number;
  twilioEnabled: boolean;
  twilioPhoneNumber: string;
  onUpdateSubscription: (newThreshold: number, newSubscribed: boolean) => Promise<void>;
  onUpdateTwilio: (enabled: boolean, phoneNumber: string) => Promise<void>;
  onAnalyzeFeed: (feed: FeedItem) => Promise<void>;
  isAnalyzing: boolean;
}

export const ArgusStreamDashboard: React.FC<ArgusStreamDashboardProps> = ({
  activeFeeds,
  archive,
  isSubscribed,
  alertThreshold,
  twilioEnabled,
  twilioPhoneNumber,
  onUpdateSubscription,
  onUpdateTwilio,
  onAnalyzeFeed,
  isAnalyzing
}) => {
  // Local States
  const [selectedSector, setSelectedSector] = useState<FeedType | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'HIGH_CRITICAL' | 'MEDIUM_LOW'>('ALL');
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState(twilioPhoneNumber);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [alertTesting, setAlertTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Map of sector colors and logos
  const sectorConfig = {
    STM: {
      color: 'from-blue-600 to-cyan-500',
      bg: 'bg-blue-950/40',
      border: 'border-blue-900/60',
      text: 'text-blue-400',
      icon: Cpu,
      label: 'STM Métro & Bus'
    },
    AVIATION: {
      color: 'from-purple-600 to-indigo-500',
      bg: 'bg-purple-950/40',
      border: 'border-purple-900/60',
      text: 'text-purple-400',
      icon: Compass,
      label: 'Aviation CYUL Fret'
    },
    MARITIME: {
      color: 'from-teal-600 to-emerald-500',
      bg: 'bg-teal-950/40',
      border: 'border-teal-900/60',
      text: 'text-teal-400',
      icon: Waves,
      label: 'Maritime LaSalle'
    },
    CCTV: {
      color: 'from-pink-600 to-rose-500',
      bg: 'bg-rose-950/40',
      border: 'border-rose-900/60',
      text: 'text-rose-400',
      icon: Eye,
      label: 'CCTV Échangeur'
    }
  };

  // Filtered feeds list
  const filteredFeeds = useMemo(() => {
    return activeFeeds.filter(feed => {
      const sectorMatch = selectedSector === 'ALL' || feed.type === selectedSector;
      let severityMatch = true;
      if (selectedSeverity === 'HIGH_CRITICAL') {
        severityMatch = feed.severity === 'high' || feed.severity === 'critical';
      } else if (selectedSeverity === 'MEDIUM_LOW') {
        severityMatch = feed.severity === 'medium' || feed.severity === 'low';
      }
      return sectorMatch && severityMatch;
    });
  }, [activeFeeds, selectedSector, selectedSeverity]);

  // Find selected feed details
  const selectedFeed = useMemo(() => {
    return activeFeeds.find(f => f.id === selectedFeedId) || filteredFeeds[0] || activeFeeds[0] || null;
  }, [activeFeeds, filteredFeeds, selectedFeedId]);

  // Set selected feed ID initially if null
  React.useEffect(() => {
    if (selectedFeed && !selectedFeedId) {
      setSelectedFeedId(selectedFeed.id);
    }
  }, [selectedFeed, selectedFeedId]);

  // Find ToT analysis result corresponding to the selected feed
  const activeAnalysis = useMemo(() => {
    if (!selectedFeed) return null;
    return archive.find(item => item.feedId === selectedFeed.id) || null;
  }, [archive, selectedFeed]);

  // Compute calculated metrics for charts
  const statsSummary = useMemo(() => {
    const defaultSectors = { STM: 85, AVIATION: 92, MARITIME: 78, CCTV: 95 };
    const computedSectors = { ...defaultSectors };

    // Dynamic sectors average from archive
    archive.forEach(item => {
      const severityFactor = item.feedTitle.includes('critical') ? 40 : item.feedTitle.includes('high') ? 25 : 10;
      const fluidity = Math.max(15, Math.min(100, Math.round(100 - (item.entropyScore * 65) - severityFactor)));
      computedSectors[item.feedType] = Math.round((computedSectors[item.feedType] + fluidity) / 2);
    });

    const activeRisks = archive.map(item => {
      const date = new Date(item.timestamp);
      const hour = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return {
        time: hour,
        entropy: parseFloat(item.entropyScore.toFixed(3)),
        fluidity: Math.max(10, Math.min(100, Math.round(100 - (item.entropyScore * 65)))),
        cascadingRisk: Math.round(item.branches.reduce((acc, b) => acc + b.evaluationScore, 0) / item.branches.length)
      };
    }).slice(-6); // Last 6 events

    // Historical radar profile
    const radarProfile = [
      { subject: 'Fluidité Globale', STM: computedSectors.STM, AVIATION: computedSectors.AVIATION, MARITIME: computedSectors.MARITIME, CCTV: computedSectors.CCTV },
      { subject: 'Stabilité Grid', STM: 88, AVIATION: 90, MARITIME: 75, CCTV: 92 },
      { subject: 'Inverse Risque', STM: Math.round(100 - (computedSectors.STM * 0.3)), AVIATION: Math.round(100 - (computedSectors.AVIATION * 0.2)), MARITIME: Math.round(100 - (computedSectors.MARITIME * 0.4)), CCTV: Math.round(100 - (computedSectors.CCTV * 0.15)) }
    ];

    return {
      sectorsFluidity: computedSectors,
      activeRisks,
      radarProfile
    };
  }, [archive]);

  // Handler to update Phone number and save
  const handlePhoneSave = async () => {
    setIsUpdatingPhone(true);
    try {
      await onUpdateTwilio(twilioEnabled, phoneInput);
      setTestResult('Configuration SMS mise à jour avec succès.');
    } catch (e) {
      setTestResult('Erreur lors de la sauvegarde.');
    } finally {
      setIsUpdatingPhone(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  // Handler to trigger a test Twilio alert
  const triggerTestAlert = async () => {
    if (!phoneInput) {
      setTestResult("Veuillez d'abord saisir un numéro de téléphone.");
      return;
    }
    setAlertTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneInput,
          title: "Simulation Alerte Critique ARGUS",
          severity: "critical",
          score: 89,
          threshold: alertThreshold,
          decision: "DANGER DE DÉGRADATION IMMÉDIATE DU TRANSIT. Déploiement automatisé du protocole d'urgence ARGUS."
        })
      });
      const data = await response.json();
      if (data.success) {
        if (data.sandbox) {
          setTestResult(`[Sandbox] Alerte SMS simulée avec succès. Contenu : "${data.body}"`);
        } else {
          setTestResult(`[Twilio Direct] SMS envoyé avec succès au ${phoneInput}. SID: ${data.sid}`);
        }
      } else {
        setTestResult(`Erreur d'envoi : ${data.error}`);
      }
    } catch (err: any) {
      setTestResult(`Erreur de connexion : ${err.message}`);
    } finally {
      setAlertTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-100" id="argus-interactive-cockpit">
      {/* LEFT SECTION: Feeds list & Tree of Thoughts Visualizer (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Stream Filter & Feed Stream Cards */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-display text-white tracking-wide uppercase flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                COCKPIT DES FLUX DE TÉLÉMÉTRIE ARGUS
              </h3>
              <p className="text-xs text-slate-400">Filtrage sélectif et déclenchement du moteur de raisonnement ToT</p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 items-center text-[10px] font-bold font-mono">
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">TOUS LES SECTEURS</option>
                <option value="STM">STM (MÉTRO / BUS)</option>
                <option value="AVIATION">AVIATION (CYUL)</option>
                <option value="MARITIME">MARITIME (ST-LAURENT)</option>
                <option value="CCTV">CCTV (VIDÉO-INTELLIGENCE)</option>
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">TOUTES GRAVITÉS</option>
                <option value="HIGH_CRITICAL">HAUTE & CRITIQUE</option>
                <option value="MEDIUM_LOW">MOYENNE & BASSE</option>
              </select>
            </div>
          </div>

          {/* Cards slider/row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[160px] pr-1">
            <AnimatePresence mode="popLayout">
              {filteredFeeds.map((feed) => {
                const sector = sectorConfig[feed.type] || sectorConfig.STM;
                const SectorIcon = sector.icon;
                const isSelected = selectedFeed?.id === feed.id;
                const analyzed = archive.some(item => item.feedId === feed.id);

                return (
                  <motion.div
                    key={feed.id}
                    layoutId={`feed-card-${feed.id}`}
                    onClick={() => setSelectedFeedId(feed.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between text-left h-24 ${
                      isSelected 
                        ? 'bg-slate-900 border-emerald-500/70 shadow-lg shadow-emerald-950/20' 
                        : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`p-1 rounded bg-slate-950 border border-slate-800 ${sector.text}`}>
                          <SectorIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9px] font-mono font-bold tracking-wide uppercase text-slate-400">
                          {feed.type}
                        </span>
                      </div>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                        feed.severity === 'critical' ? 'bg-red-950/60 text-red-400 border border-red-900/50' :
                        feed.severity === 'high' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                        feed.severity === 'medium' ? 'bg-yellow-950/40 text-yellow-500 border border-yellow-900/30' :
                        'bg-slate-950/60 text-slate-400 border border-slate-800'
                      }`}>
                        {feed.severity}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1 truncate font-display tracking-tight">
                        {feed.title}
                      </h4>
                      <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-slate-400">
                        <span>{feed.value}</span>
                        {analyzed ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> ToT OK
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center gap-0.5">
                            <Activity className="w-2.5 h-2.5 animate-pulse" /> PENDANT
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {filteredFeeds.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-900 rounded-lg">
                Aucun flux ne correspond aux filtres sélectionnés.
              </div>
            )}
          </div>
        </div>

        {/* Selected Feed ToT Tree of Thoughts Visualizer */}
        {selectedFeed && (
          <div className="bg-slate-950/65 border border-slate-900 rounded-xl p-5 space-y-5 text-left relative overflow-hidden">
            {/* Hologram Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.05),rgba(0,0,0,0))]" />

            {/* Header detail */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 ${sectorConfig[selectedFeed.type]?.text || 'text-slate-300'}`}>
                    {selectedFeed.type} TELEMETRY
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">ID: {selectedFeed.id}</span>
                </div>
                <h3 className="text-lg font-bold font-display text-white tracking-tight leading-snug">
                  {selectedFeed.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-2xl">
                  {selectedFeed.details}
                </p>
              </div>

              {!activeAnalysis ? (
                <button
                  onClick={() => onAnalyzeFeed(selectedFeed)}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-900 text-white font-mono text-xs font-bold rounded-lg border border-emerald-500/30 transition-all flex items-center justify-center gap-2 min-w-[170px]"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin text-emerald-300" />
                      ANALYSE TOT EN COURS...
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4 animate-pulse" />
                      LANCER TOT ENGINE
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-emerald-500 font-bold">RÉSOULÉ AVEC TOT</div>
                    <div className="text-xs text-emerald-400 font-bold font-mono">
                      H(x) Entropie : {activeAnalysis.entropyScore.toFixed(4)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tree Section */}
            {activeAnalysis ? (
              <div className="space-y-6 relative z-10 font-sans">
                {/* Visual Tree Connectors Lines (simulation using borders) */}
                <div className="relative">
                  
                  {/* Root Node */}
                  <div className="flex justify-center mb-6">
                    <div className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono max-w-xs shadow-md">
                      <div className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">ENTRÉE DU FLUX</div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5 line-clamp-1">{selectedFeed.title}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1.5">
                        <span>{selectedFeed.value}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{selectedFeed.source}</span>
                      </div>
                    </div>
                  </div>

                  {/* Branches Layout (3 columns) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
                    {/* Line Connectors */}
                    <div className="absolute top-[-24px] left-1/2 right-1/2 h-[24px] border-l border-dashed border-slate-800 pointer-events-none hidden md:block" />
                    
                    {activeAnalysis.branches.map((branch, idx) => {
                      const scoreColor = branch.evaluationScore > 75 ? 'text-red-400 bg-red-950/30 border-red-900/60' :
                                         branch.evaluationScore > 45 ? 'text-amber-400 bg-amber-950/30 border-amber-900/60' :
                                         'text-emerald-400 bg-emerald-950/30 border-emerald-900/60';
                      
                      return (
                        <div key={idx} className="bg-slate-900/80 border border-slate-900/90 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-inner relative hover:border-slate-800 transition-all">
                          <div>
                            {/* Branch header */}
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">
                                {branch.name.toUpperCase()}
                              </span>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}>
                                {branch.evaluationScore}%
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                              {branch.description}
                            </p>
                          </div>

                          {/* Risk cascading list */}
                          <div className="space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-900/80">
                            <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-500" /> Cascades Evaluées :
                            </span>
                            <ul className="list-disc list-inside text-[9.5px] text-slate-400 space-y-0.5">
                              {branch.cascadingRisks.map((risk, rIdx) => (
                                <li key={rIdx} className="line-clamp-1 truncate">{risk}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Branch recommendation */}
                          <div className="text-[10px] leading-relaxed border-t border-slate-900 pt-2.5">
                            <span className="text-[8.5px] font-mono font-bold text-emerald-500 uppercase tracking-wide">Directive Proposée :</span>
                            <p className="text-slate-300 font-medium italic mt-0.5">"{branch.recommendation}"</p>
                          </div>

                          {/* Specialized Critics review list (if any) */}
                          {branch.critics && branch.critics.length > 0 && (
                            <div className="border-t border-slate-900/90 pt-2.5 space-y-2">
                              <span className="text-[8.5px] font-mono font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                                <Cpu className="w-2.5 h-2.5 text-indigo-400" /> Agents Critiques Spécialisés :
                              </span>
                              {branch.critics.map((critic, cIdx) => (
                                <div key={cIdx} className="bg-slate-950/60 p-2 rounded border border-slate-900 space-y-1 text-left text-[9px]">
                                  <div className="flex items-center justify-between font-mono font-bold">
                                    <span className="text-slate-300">{critic.name}</span>
                                    <span className={`px-1 py-0.5 rounded text-[8px] ${
                                      critic.validityScore > 85 ? 'bg-emerald-950/50 text-emerald-400' : 'bg-amber-950/50 text-amber-500'
                                    }`}>
                                      {critic.validityScore}% Valide
                                    </span>
                                  </div>
                                  <p className="text-slate-400 leading-normal italic">"{critic.critiqueText}"</p>
                                  {critic.weaknesses.length > 0 && (
                                    <div className="text-[8px] text-amber-400/90 font-mono">
                                      ⚠️ Faiblesse : {critic.weaknesses[0]}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Convergence Arrow Down */}
                  <div className="flex justify-center my-4">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                    </div>
                  </div>

                  {/* Convergence Final Decision Card */}
                  <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-emerald-950/40 border border-emerald-900/60 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-widest uppercase flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> DÉCISION CONVERGENTE SYNTHÉTISÉE PAR L'AI ORCHESTRATOR
                      </span>
                      {activeAnalysis.specializedAgent && (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          {activeAnalysis.specializedAgent.codename} ACTIVE ({activeAnalysis.specializedAgent.confidenceScore || 90}% CONF)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white leading-relaxed font-mono font-medium">
                      {activeAnalysis.finalDecision}
                    </p>
                    {activeAnalysis.specializedAgent && (
                      <div className="text-[10px] text-indigo-300 leading-normal border-t border-slate-900/95 pt-2 flex items-start gap-1">
                        <Info className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span><strong>Interprétation de l'agent :</strong> {activeAnalysis.specializedAgent.interpretation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-900 rounded-xl bg-slate-900/10 text-slate-500 space-y-3">
                <Cpu className="w-10 h-10 text-slate-700 animate-pulse" />
                <div className="text-center">
                  <p className="text-sm font-bold font-mono">Moteur de raisonnement en attente</p>
                  <p className="text-xs text-slate-600 max-w-sm mt-1">
                    Cliquez sur "LANCER TOT ENGINE" pour exécuter les 3 branches d'analyse critique ToT de l'IA en temps réel sur cet événement.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Fluidity, Risk analytics & Subscription controls (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Real-time Sector Fluidity indices & charts */}
        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-display text-white tracking-wider uppercase">
                INDICES DE FLUIDITÉ & RISQUES
              </h3>
              <p className="text-[10px] font-mono text-slate-500">MOTEUR PRÉDICTIF ARGUS ET CASCADE TOURNANTE</p>
            </div>
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>

          {/* Mini-gauges grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {Object.entries(statsSummary.sectorsFluidity).map(([sectorKey, fluidityVal]) => {
              const conf = sectorConfig[sectorKey as FeedType] || sectorConfig.STM;
              const isLow = fluidityVal < 60;
              const isMed = fluidityVal >= 60 && fluidityVal < 85;

              return (
                <div key={sectorKey} className="p-3 bg-slate-900/40 border border-slate-900/90 rounded-lg space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wide">
                    {sectorKey}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-white font-mono">{fluidityVal}%</span>
                    <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded ${
                      isLow ? 'bg-red-950/40 text-red-400 border border-red-900/30' :
                      isMed ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                      'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                    }`}>
                      {isLow ? 'CRITIQUE' : isMed ? 'CONGESTION' : 'FLUIDE'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${conf.color} transition-all duration-1000`}
                      style={{ width: `${fluidityVal}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Area Chart: Fluidity vs Cascading Risk */}
          <div className="space-y-1 pt-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">
              ÉVOLUTION ENTROPIE ET RISQUE SÉRIE EN COURS
            </span>
            <div className="h-44 w-full">
              {statsSummary.activeRisks.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={statsSummary.activeRisks} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fluidityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={8} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={8} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: '10px', color: '#fff' }} />
                    <Area type="monotone" dataKey="fluidity" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#fluidityGrad)" name="Fluidité" />
                    <Area type="monotone" dataKey="cascadingRisk" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#riskGrad)" name="Risque Cascade" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-900 rounded-lg text-slate-600 font-mono text-[10px] uppercase">
                  Aucune donnée ToT archivée pour tracer la courbe
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SMS Operator Subscription & Warning Threshold configuration Panel */}
        <div className="bg-slate-950/65 border border-slate-900 rounded-xl p-5 space-y-4 text-left relative overflow-hidden">
          {/* Subtle warning alert gradient glowing */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3">
            <div className="p-2 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-400">
              <Bell className="w-4 h-4 animate-swing" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-display text-white tracking-wider uppercase">
                ABONNEMENT ALERTES LOGISTIQUES
              </h3>
              <p className="text-[9.5px] font-mono text-rose-400">PARAMÈTRES SMS OPÉRATEUR SÉCURISÉS (TWILIO)</p>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="space-y-4 font-sans text-xs">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between bg-slate-900/40 border border-slate-900 rounded-lg p-3">
              <div>
                <span className="font-bold text-slate-200">Abonnement Actif</span>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                  Recevoir des alertes ToT critiques instantanément.
                </p>
              </div>
              <button
                onClick={() => onUpdateSubscription(alertThreshold, !isSubscribed)}
                className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none flex ${
                  isSubscribed ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Threshold Slider */}
            <div className="space-y-1.5 bg-slate-900/40 border border-slate-900 rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                <span className="text-slate-400">SEUIL DE DÉCLENCHEMENT</span>
                <span className="text-amber-400">{alertThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={alertThreshold}
                onChange={(e) => onUpdateSubscription(parseInt(e.target.value), isSubscribed)}
                className="w-full accent-emerald-500 bg-slate-950 cursor-pointer h-1.5 rounded-lg"
              />
              <p className="text-[9px] text-slate-500 leading-relaxed">
                Les alertes ne seront acheminées que si le niveau d'incertitude/risque ToT dépasse ce pourcentage.
              </p>
            </div>

            {/* Twilio configurations */}
            <div className="space-y-3 bg-slate-900/40 border border-slate-900 rounded-lg p-3">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-slate-400">CANAL SMS TWILIO</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  twilioEnabled ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-slate-950/60 text-slate-500 border border-slate-800'
                }`}>
                  {twilioEnabled ? 'ACTIF (TWILIO)' : 'MUTÉ'}
                </span>
              </div>

              {/* Twilio enabled checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={twilioEnabled}
                  onChange={(e) => onUpdateTwilio(e.target.checked, phoneInput)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Activer l'acheminement des SMS</span>
              </label>

              {/* Phone Input */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono font-bold">NUMÉRO OPÉRATEUR (E.164)</span>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="+15145550199"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-900 rounded px-3 py-1.5 text-xs text-white placeholder-slate-700 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handlePhoneSave}
                    disabled={isUpdatingPhone || phoneInput === twilioPhoneNumber}
                    className="px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded font-mono text-xs font-bold border border-slate-700"
                  >
                    OK
                  </button>
                </div>
              </div>

              {/* Test trigger buttons */}
              <div className="flex gap-2 pt-1 border-t border-slate-900/90">
                <button
                  onClick={triggerTestAlert}
                  disabled={alertTesting}
                  className="flex-1 py-1.5 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/50 disabled:opacity-50 rounded text-rose-400 font-mono text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1"
                >
                  {alertTesting ? (
                    <>
                      <Activity className="w-3 h-3 animate-spin" />
                      ENVOI DU TEST...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Simuler Alerte SMS
                    </>
                  )}
                </button>
              </div>

              {/* Result output feedback */}
              {testResult && (
                <div className="p-2.5 bg-slate-950/80 border border-slate-900 rounded text-[9.5px] font-mono text-slate-400 leading-normal whitespace-pre-line animate-fade-in">
                  {testResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
