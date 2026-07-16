/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FeedItem } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Legend
} from 'recharts';
import { 
  Route, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Clock, 
  MapPin, 
  Activity, 
  CornerDownRight, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';

interface CriticalRouteTimelineProps {
  feeds: FeedItem[];
}

interface TimelinePoint {
  progress: number; // 0% to 100%
  name: string; // Milestone name
  location: string; // Physical location description
  stmFluidity: number; // calculated %
  aviationFluidity: number; // calculated %
  maritimeFluidity: number; // calculated %
  activeBlockageSector?: string;
  blockageDetail?: string;
}

export const CriticalRouteTimeline: React.FC<CriticalRouteTimelineProps> = ({ feeds }) => {
  const [activeSegmentProgress, setActiveSegmentProgress] = useState<number>(30);

  // Parse active feeds to extract real-time risk modifiers for each sector
  const sectorRisks = useMemo(() => {
    let stmMod = 0;
    let aviMod = 0;
    let marMod = 0;

    feeds.forEach(f => {
      let weight = 0;
      if (f.severity === 'low') weight = 5;
      else if (f.severity === 'medium') weight = 15;
      else if (f.severity === 'high') weight = 30;
      else if (f.severity === 'critical') weight = 50;

      if (f.type === 'STM') stmMod += weight;
      if (f.type === 'AVIATION') aviMod += weight;
      if (f.type === 'MARITIME') marMod += weight;
    });

    return {
      STM: Math.min(80, stmMod),
      AVIATION: Math.min(80, aviMod),
      MARITIME: Math.min(80, marMod)
    };
  }, [feeds]);

  // Generate dynamic data points across the journey (from 0% to 100%)
  const timelineData = useMemo<TimelinePoint[]>(() => {
    // We simulate 6 milestones along the standard logical corridor:
    // 1. 0% - Départ YUL
    // 2. 20% - Échangeur Turcot (Pivot Routier & CCTV)
    // 3. 40% - Tunnel Ville-Marie (STM transition)
    // 4. 60% - Berri-UQAM (Complexe d'échange STM / Maritime proximity)
    // 5. 80% - Port de Montréal (Quai 52)
    // 6. 100% - Centre de Commande ARGUS (Sophia HQ)

    const baseSTM = 90 - sectorRisks.STM;
    const baseAVI = 95 - sectorRisks.AVIATION;
    const baseMAR = 88 - sectorRisks.MARITIME;

    return [
      {
        progress: 0,
        name: "Aéroport CYUL",
        location: "Zone Fret & Aviation Civile",
        // Aviation sector is more vulnerable at the airport itself
        stmFluidity: Math.round(Math.max(10, baseSTM)),
        aviationFluidity: Math.round(Math.max(10, baseAVI * 0.8)),
        maritimeFluidity: Math.round(Math.max(10, baseMAR)),
        activeBlockageSector: sectorRisks.AVIATION > 30 ? "AVIATION" : undefined,
        blockageDetail: sectorRisks.AVIATION > 30 ? "Aérogare saturée - Signal GPS dégradé" : undefined
      },
      {
        progress: 20,
        name: "Échangeur Turcot",
        location: "Bifurcation Nord-Sud",
        // Highway/Road junction affects all, but STM remains relatively isolated here
        stmFluidity: Math.round(Math.max(10, baseSTM * 0.95)),
        aviationFluidity: Math.round(Math.max(10, baseAVI)),
        maritimeFluidity: Math.round(Math.max(10, baseMAR * 0.9)),
        activeBlockageSector: undefined
      },
      {
        progress: 40,
        name: "Tunnel Ville-Marie",
        location: "Axe Routier Souterrain",
        // Highly sensitive to CCTV road blockages & tunnel congestion
        stmFluidity: Math.round(Math.max(10, baseSTM)),
        aviationFluidity: Math.round(Math.max(10, baseAVI)),
        maritimeFluidity: Math.round(Math.max(10, baseMAR * 0.85)),
        activeBlockageSector: sectorRisks.STM > 40 ? "STM" : undefined,
        blockageDetail: sectorRisks.STM > 40 ? "Ralentissement tunnel par répercussion" : undefined
      },
      {
        progress: 60,
        name: "Berri-UQAM (Logistique)",
        location: "Hub Souterrain de Transit",
        // Critical STM hub. If STM has issues, this point is a massive bottleneck
        stmFluidity: Math.round(Math.max(10, baseSTM * 0.7)),
        aviationFluidity: Math.round(Math.max(10, baseAVI)),
        maritimeFluidity: Math.round(Math.max(10, baseMAR * 0.95)),
        activeBlockageSector: baseSTM * 0.7 < 55 ? "STM" : undefined,
        blockageDetail: baseSTM * 0.7 < 55 ? "Saturation quai et congestion des lignes d'échange" : undefined
      },
      {
        progress: 80,
        name: "Port de Montréal (Quai 52)",
        location: "Terminal Maritime Est",
        // Maritime hub
        stmFluidity: Math.round(Math.max(10, baseSTM)),
        aviationFluidity: Math.round(Math.max(10, baseAVI * 0.95)),
        maritimeFluidity: Math.round(Math.max(10, baseMAR * 0.75)),
        activeBlockageSector: baseMAR * 0.75 < 55 ? "MARITIME" : undefined,
        blockageDetail: baseMAR * 0.75 < 55 ? "Goulot d'étranglement logistique quai 52" : undefined
      },
      {
        progress: 100,
        name: "Centre ARGUS (Sophia HQ)",
        location: "Point d'Arrivée Sécurisé",
        // Highly secured hub, fluidities recover to optimal values
        stmFluidity: Math.round(Math.max(10, baseSTM * 0.95)),
        aviationFluidity: Math.round(Math.max(10, baseAVI * 0.95)),
        maritimeFluidity: Math.round(Math.max(10, baseMAR * 0.95)),
        activeBlockageSector: undefined
      }
    ];
  }, [sectorRisks]);

  // Find all active blocking points (fluidity < 55%) along the corridor
  const blockingPoints = useMemo(() => {
    const list: { name: string; sector: string; value: number; detail: string; progress: number }[] = [];
    
    timelineData.forEach(pt => {
      if (pt.stmFluidity < 55) {
        list.push({ 
          name: pt.name, 
          sector: "STM", 
          value: pt.stmFluidity, 
          detail: pt.blockageDetail || "Fluidité critique sur le réseau ferroviaire souterrain",
          progress: pt.progress 
        });
      }
      if (pt.aviationFluidity < 55) {
        list.push({ 
          name: pt.name, 
          sector: "AVIATION", 
          value: pt.aviationFluidity, 
          detail: pt.blockageDetail || "Saturation de l'espace aérien fret / Brouillage",
          progress: pt.progress 
        });
      }
      if (pt.maritimeFluidity < 55) {
        list.push({ 
          name: pt.name, 
          sector: "MARITIME", 
          value: pt.maritimeFluidity, 
          detail: pt.blockageDetail || "Goulot de chargement et d'ancrage maritime",
          progress: pt.progress 
        });
      }
    });

    return list;
  }, [timelineData]);

  // Get current interpolated stats based on slider progress position (0-100)
  const currentScrubbedStats = useMemo(() => {
    // Find enclosing points
    let lowerPt = timelineData[0];
    let upperPt = timelineData[timelineData.length - 1];

    for (let i = 0; i < timelineData.length - 1; i++) {
      if (activeSegmentProgress >= timelineData[i].progress && activeSegmentProgress <= timelineData[i + 1].progress) {
        lowerPt = timelineData[i];
        upperPt = timelineData[i + 1];
        break;
      }
    }

    const range = upperPt.progress - lowerPt.progress;
    const factor = range === 0 ? 0 : (activeSegmentProgress - lowerPt.progress) / range;

    const stm = Math.round(lowerPt.stmFluidity + (upperPt.stmFluidity - lowerPt.stmFluidity) * factor);
    const avi = Math.round(lowerPt.aviationFluidity + (upperPt.aviationFluidity - lowerPt.aviationFluidity) * factor);
    const mar = Math.round(lowerPt.maritimeFluidity + (upperPt.maritimeFluidity - lowerPt.maritimeFluidity) * factor);

    return {
      stm,
      avi,
      mar,
      prevMilestone: lowerPt.name,
      nextMilestone: upperPt.name,
      closestLocation: factor < 0.5 ? lowerPt.location : upperPt.location,
      closestMilestone: factor < 0.5 ? lowerPt.name : upperPt.name
    };
  }, [activeSegmentProgress, timelineData]);

  // Generate automated smart recommendation based on closest bottleneck
  const smartAdvisory = useMemo(() => {
    const stats = currentScrubbedStats;
    const stmFluid = stats.stm;
    const aviFluid = stats.avi;
    const marFluid = stats.mar;

    if (stmFluid < 55) {
      return {
        type: 'STRICT_ROUTING_ALERT',
        title: 'BIFURCATION STM CRITIQUE REQUISE',
        desc: `Saturations détectées près de ${stats.closestMilestone}. Le ToT conseille à Michael d'abandonner le métro et de basculer sur un véhicule terrestre léger via des axes secondaires.`,
        action: 'Activer le protocole de redirection de secours ARGUS-STM.',
        severity: 'high'
      };
    }
    if (marFluid < 55) {
      return {
        type: 'LOGISTICS_ADVISORY',
        title: 'ALERTE DE FLUIDITÉ DU PORT',
        desc: `Congestion critique détectée dans le corridor maritime à ${stats.closestMilestone}. Les transits de fret et de conteneurs sont ralentis de plus de 45 minutes.`,
        action: 'Réorienter les convois routiers vers le hub autoroutier 20.',
        severity: 'medium'
      };
    }
    if (aviFluid < 55) {
      return {
        type: 'AVIONICS_INTERFERENCE',
        title: 'BRUIT DU CORRIDOR AÉRIEN',
        desc: `Indicateurs d'aviation civile instables à l'approche de ${stats.closestMilestone}. Le guidage GNSS subit des perturbations légères.`,
        action: 'Activer la triangulation inertielle et surveiller les altimètres.',
        severity: 'medium'
      };
    }

    return {
      type: 'OPTIMAL_FLIGHT_PATH',
      title: 'ITINÉRAIRE VERT - FLUIDITÉ EXCELLENTE',
      desc: `Tous les réseaux majeurs (STM, Aviation, Maritime) opèrent au-dessus des seuils D.U.R. nominaux au niveau de ${stats.closestMilestone}.`,
      action: 'Poursuivre sur le tracé optimal actuel. Vitesse de croisière nominale.',
      severity: 'nominal'
    };
  }, [currentScrubbedStats]);

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 p-5 space-y-6"
      id="critical-itinerary-timeline-visualizer"
    >
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm tracking-wide text-white flex items-center gap-2">
              <span>SUPERPOSITION DE FLUIDITÉ : ITINÉRAIRE CRITIQUE</span>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-mono font-normal px-1.5 py-0.5 rounded">VUE LIVE</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              ANALYSE SIMULTANÉE DE FLUIDITÉ STM, AVIATION ET MARITIME SUR LE CORRIDOR DE TRANSIT DE MICHAEL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>RÉACTIVITÉ DE CALCUL : <strong className="text-emerald-400">&lt; 150ms</strong></span>
        </div>
      </div>

      {/* Main Grid: Chart & Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recharts superposition timeline (Col Span 8) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>COURBES DE FLUIDITÉ MULTI-SECTEURS (%) LE LONG DU TRAJET</span>
            </span>
            <div className="flex items-center gap-3 text-[9px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> STM</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> AVIATION</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> MARITIME</span>
            </div>
          </div>

          <div className="h-[240px] w-full bg-slate-950/60 rounded-xl p-3 border border-slate-900 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timelineData}
                margin={{ top: 15, right: 15, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="stmTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="aviTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="marTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />
                
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false}
                  fontFamily="JetBrains Mono"
                />
                
                <YAxis 
                  stroke="#64748b" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  fontFamily="JetBrains Mono"
                  unit="%"
                />

                {/* Reference line marking critical bottleneck threshold (55%) */}
                <ReferenceLine 
                  y={55} 
                  stroke="#f43f5e" 
                  strokeDasharray="4 4" 
                  strokeWidth={1}
                  label={{ 
                    value: 'SEUIL DE BLOCAGE CRITIQUE (55%)', 
                    position: 'top', 
                    fill: '#f43f5e', 
                    fontSize: 7, 
                    fontFamily: 'JetBrains Mono',
                    offset: 3
                  }} 
                />

                {/* Vertical Reference line marking the scrubbed slider position */}
                <ReferenceLine 
                  x={timelineData[Math.round(activeSegmentProgress / 20)]?.name || "Échangeur Turcot"} 
                  stroke="#6366f1" 
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TimelinePoint;
                      return (
                        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded shadow-2xl font-mono text-[10px] space-y-1.5">
                          <p className="text-slate-200 font-bold border-b border-slate-900 pb-1 flex items-center justify-between gap-4">
                            <span>{data.name}</span>
                            <span className="text-[8px] text-indigo-400 font-normal">{data.progress}% du trajet</span>
                          </p>
                          <p className="text-[9px] text-slate-400 italic">{data.location}</p>
                          <div className="space-y-1 pt-1.5">
                            <div className="flex justify-between gap-4 items-center">
                              <span className="text-slate-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> STM :
                              </span>
                              <span className={`font-bold ${data.stmFluidity < 55 ? 'text-red-400' : 'text-emerald-400'}`}>{data.stmFluidity}% fluidité</span>
                            </div>
                            <div className="flex justify-between gap-4 items-center">
                              <span className="text-slate-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" /> AVIATION :
                              </span>
                              <span className={`font-bold ${data.aviationFluidity < 55 ? 'text-red-400' : 'text-sky-400'}`}>{data.aviationFluidity}% fluidité</span>
                            </div>
                            <div className="flex justify-between gap-4 items-center">
                              <span className="text-slate-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> MARITIME :
                              </span>
                              <span className={`font-bold ${data.maritimeFluidity < 55 ? 'text-red-400' : 'text-amber-400'}`}>{data.maritimeFluidity}% fluidité</span>
                            </div>
                          </div>

                          {data.activeBlockageSector && (
                            <div className="mt-2 pt-1 border-t border-slate-900 bg-red-950/30 p-1.5 rounded text-[8.5px] text-red-300 border border-red-900/40">
                              <strong>BLOCAGE ({data.activeBlockageSector}) :</strong> {data.blockageDetail}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="stmFluidity"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#stmTimelineGrad)"
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="aviationFluidity"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#aviTimelineGrad)"
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="maritimeFluidity"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#marTimelineGrad)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Controls & Scrubbing panel (Col Span 4) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          {/* Timeline scrubbing widget */}
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-850 space-y-3 flex-1">
            <h3 className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>EXPLORATEUR TEMPOREL</span>
            </h3>

            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Déplacez le curseur pour inspecter la fluidité prédictive des trois secteurs à chaque segment du trajet complet de Michael.
            </p>

            {/* Slider container */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>DÉPART (0%)</span>
                <span className="text-indigo-400 font-bold">{activeSegmentProgress}% DU TRAJET</span>
                <span>CIBLE (100%)</span>
              </div>

              <input 
                type="range"
                min="0"
                max="100"
                value={activeSegmentProgress}
                onChange={(e) => setActiveSegmentProgress(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>

            {/* Real-time stats corresponding to slider position */}
            <div className="pt-2.5 border-t border-slate-900 space-y-2.5">
              <div className="text-[10.5px] font-mono text-slate-400 flex items-center justify-between">
                <span>Segment inspecté :</span>
                <span className="text-slate-200 font-bold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-400" />
                  {currentScrubbedStats.closestMilestone}
                </span>
              </div>

              {/* Grid of values */}
              <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                <div className="bg-slate-900/60 border border-slate-850 rounded p-2 text-center">
                  <span className="text-slate-500 block text-[8px] uppercase">STM</span>
                  <span className={`text-xs font-bold block mt-0.5 ${currentScrubbedStats.stm < 55 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {currentScrubbedStats.stm}%
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-850 rounded p-2 text-center">
                  <span className="text-slate-500 block text-[8px] uppercase">AVIATION</span>
                  <span className={`text-xs font-bold block mt-0.5 ${currentScrubbedStats.avi < 55 ? 'text-red-400' : 'text-sky-400'}`}>
                    {currentScrubbedStats.avi}%
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-850 rounded p-2 text-center">
                  <span className="text-slate-500 block text-[8px] uppercase">MARITIME</span>
                  <span className={`text-xs font-bold block mt-0.5 ${currentScrubbedStats.mar < 55 ? 'text-red-400' : 'text-amber-400'}`}>
                    {currentScrubbedStats.mar}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Decision Block */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[115px] ${
            smartAdvisory.severity === 'high' ? 'bg-red-950/30 border-red-800 text-red-100' :
            smartAdvisory.severity === 'medium' ? 'bg-yellow-950/30 border-yellow-800 text-yellow-100' :
            'bg-slate-950/80 border-slate-850 text-slate-100'
          }`}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {smartAdvisory.severity === 'high' ? (
                  <ShieldAlert className="w-4.5 h-4.5 text-red-400 shrink-0" />
                ) : (
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                )}
                <span className="text-[10px] font-mono font-bold tracking-wider block uppercase">
                  {smartAdvisory.title}
                </span>
              </div>
              <p className="text-[10px] font-sans leading-relaxed text-slate-300">
                {smartAdvisory.desc}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-900/40 mt-2 flex items-start gap-1 font-mono text-[9.5px]">
              <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">
                <strong>Conseil ToT : </strong>{smartAdvisory.action}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Visual Timeline Bar & Active Blockages list */}
      <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-900 space-y-4">
        <h3 className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>POINTS DE BLOCAGE CRITIQUES ET OBSTACLES SUR LA TRAJECTOIRE COMPLETE</span>
        </h3>

        {blockingPoints.length === 0 ? (
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center gap-2.5 text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span>EXCELLENTE NOUVELLE : Aucun point de blocage détecté. Tous les secteurs opèrent avec une fluidité optimale pour Michael.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blockingPoints.map((bp, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-red-950/25 border border-red-900/50 rounded-lg flex gap-3 text-xs items-start"
              >
                <div className="p-1.5 bg-red-950 border border-red-800 rounded text-red-400 text-[9px] font-mono shrink-0 font-bold uppercase">
                  {bp.sector}
                </div>
                <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <span>{bp.name} ({bp.progress}% du trajet)</span>
                    <ChevronRight className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{bp.value}% fluidité</span>
                  </div>
                  <p className="text-slate-400 text-[9.5px] leading-relaxed">
                    {bp.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Visual pipeline tracks showing bottlenecks along journey timeline */}
        <div className="pt-2 border-t border-slate-900/80 space-y-3">
          <div className="text-[9.5px] font-mono text-slate-500 uppercase">
            Vue linéaire synoptique de la fluidité des corridors (0% ➔ 100%) :
          </div>

          <div className="space-y-2.5">
            {/* STM corridor bar */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-slate-400 w-16 uppercase">STM (Métro)</span>
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden flex">
                {timelineData.map((pt, idx) => {
                  let barBg = 'bg-emerald-500';
                  if (pt.stmFluidity < 55) barBg = 'bg-rose-500';
                  else if (pt.stmFluidity < 75) barBg = 'bg-amber-500';
                  return <div key={idx} className={`h-full flex-1 border-r border-slate-950/30 ${barBg}`} title={`${pt.name}: ${pt.stmFluidity}%`} />;
                })}
              </div>
            </div>

            {/* AVIATION corridor bar */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-slate-400 w-16 uppercase">Aviation</span>
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden flex">
                {timelineData.map((pt, idx) => {
                  let barBg = 'bg-sky-400';
                  if (pt.aviationFluidity < 55) barBg = 'bg-rose-500';
                  else if (pt.aviationFluidity < 75) barBg = 'bg-amber-500';
                  return <div key={idx} className={`h-full flex-1 border-r border-slate-950/30 ${barBg}`} title={`${pt.name}: ${pt.aviationFluidity}%`} />;
                })}
              </div>
            </div>

            {/* MARITIME corridor bar */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-slate-400 w-16 uppercase">Maritime</span>
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden flex">
                {timelineData.map((pt, idx) => {
                  let barBg = 'bg-amber-500';
                  if (pt.maritimeFluidity < 55) barBg = 'bg-rose-500';
                  else if (pt.maritimeFluidity < 75) barBg = 'bg-amber-500';
                  return <div key={idx} className={`h-full flex-1 border-r border-slate-950/30 ${barBg}`} title={`${pt.name}: ${pt.maritimeFluidity}%`} />;
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
