/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToTAnalysisResult, FeedType } from '../types';
import { 
  Activity, 
  Cpu, 
  HelpCircle, 
  Info, 
  Zap, 
  Compass, 
  ShieldAlert, 
  Network 
} from 'lucide-react';

interface QuantumEntropyGaugeProps {
  selectedResult: ToTAnalysisResult | null;
  archive: ToTAnalysisResult[];
  onSelectActive: (result: ToTAnalysisResult) => void;
}

export const QuantumEntropyGauge: React.FC<QuantumEntropyGaugeProps> = ({
  selectedResult,
  archive,
  onSelectActive
}) => {
  // Local state for micro-fluctuations to simulate live quantum telemetry measurements
  const [quantumFluctuation, setQuantumFluctuation] = useState<number>(0);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Micro-fluctuations timer
  useEffect(() => {
    const interval = setInterval(() => {
      // Small Gaussian-like fluctuation around 0
      const noise = (Math.random() - 0.5) * 0.004;
      setQuantumFluctuation(noise);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // Compute active item to show in details
  const activeItem = useMemo<ToTAnalysisResult | null>(() => {
    if (selectedResult) return selectedResult;
    if (archive && archive.length > 0) return archive[0];
    return null;
  }, [selectedResult, archive]);

  // Compute stats of active item (or simulated default item)
  const activeEntropy = useMemo(() => {
    if (!activeItem) return 0.1852; // Standby/Nominal default value
    // Add real-time fluctuation
    const base = activeItem.entropyScore;
    return Math.max(0, Math.min(1, parseFloat((base + quantumFluctuation).toFixed(4))));
  }, [activeItem, quantumFluctuation]);

  // Coherence categorization
  const entropyCategory = useMemo(() => {
    const val = activeEntropy;
    if (val < 0.3) {
      return {
        label: 'COHÉRENT (CONVERGÉ)',
        color: 'text-emerald-400',
        stroke: '#10b981',
        bg: 'bg-emerald-950/20 border-emerald-900/30',
        glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
        desc: 'Incertitude minimale. Le raisonnement ToT converge parfaitement vers la décision optimale.'
      };
    } else if (val < 0.6) {
      return {
        label: 'STABLE (TRANSITOIRE)',
        color: 'text-amber-400',
        stroke: '#f59e0b',
        bg: 'bg-amber-950/20 border-amber-900/30',
        glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
        desc: 'Incertitude modérée. Légères fluctuations de bruit opérationnel sous contrôle.'
      };
    } else {
      return {
        label: 'TURBULENT (VOLATIL)',
        color: 'text-rose-500',
        stroke: '#f43f5e',
        bg: 'bg-rose-950/20 border-rose-900/30',
        glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        desc: 'Incertitude critique. Forte discorde entre branches ; correction récursive hautement active.'
      };
    }
  }, [activeEntropy]);

  // Simulated standby system monitors when archive is empty
  const standbySectors = useMemo(() => {
    return [
      { id: 'standby-stm', feedTitle: 'Secteur Métro STM', feedType: 'STM' as FeedType, entropyScore: 0.124 },
      { id: 'standby-aviation', feedTitle: 'Corridor Aérien CYUL', feedType: 'AVIATION' as FeedType, entropyScore: 0.215 },
      { id: 'standby-maritime', feedTitle: 'Flot LaSalle St-Laurent', feedType: 'MARITIME' as FeedType, entropyScore: 0.398 },
      { id: 'standby-cctv', feedTitle: 'Échangeur Turcot Vision', feedType: 'CCTV' as FeedType, entropyScore: 0.085 }
    ];
  }, []);

  // Determine list of gauge items to display in grid
  const recentItems = useMemo(() => {
    if (archive && archive.length > 0) {
      // Show up to 4 recent/active analyses
      // Sort to make sure we show unique items by feedId if possible, or just the latest unique
      const seen = new Set<string>();
      const uniqueRecent: ToTAnalysisResult[] = [];
      
      // Ensure currently selected is included first if possible
      if (selectedResult) {
        uniqueRecent.push(selectedResult);
        seen.add(selectedResult.id);
      }

      archive.forEach(item => {
        if (!seen.has(item.id)) {
          uniqueRecent.push(item);
          seen.add(item.id);
        }
      });

      return uniqueRecent.slice(0, 4);
    }
    return [];
  }, [archive, selectedResult]);

  // SVG Gauge calculations
  const radius = 54;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~339.29

  const getStrokeDashoffset = (entropy: number) => {
    // 0 entropy = full circle (0 dash offset), 1 entropy = empty circle or vice versa
    // Let's make progress clockwise from top
    return circumference * (1 - entropy);
  };

  const getSecteurColor = (type: FeedType) => {
    switch (type) {
      case 'STM': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'AVIATION': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'MARITIME': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 space-y-4 relative overflow-hidden font-sans"
      id="quantum-entropy-gauge-panel"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Supervision d'Entropie Quantique</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">
              Télémétrie en temps réel des arbres ToT actifs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            title="Explication de l'Entropie Quantique ToT"
          >
            <Info className="w-4 h-4" />
          </button>
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-900 bg-indigo-950/50 text-indigo-400">
            H(S) VN-ENTROPY
          </span>
        </div>
      </div>

      {/* Info Popup Drawer */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-indigo-950/20 border border-indigo-900/40 rounded-lg p-3 text-[10px] text-slate-300 font-mono leading-relaxed text-left space-y-2"
          >
            <div className="flex items-start gap-1.5 text-indigo-400 font-bold">
              <Compass className="w-3.5 h-3.5 mt-0.5" />
              <span>PRINCIPE D'INCERTITUDE DÉCISIONNELLE ToT</span>
            </div>
            <p>
              L'<strong>Entropie de Von Neumann H(S)</strong> mesure le niveau de désordre, de conflit ou de décohérence entre les branches de décision de notre algorithme d'arbre de pensées (ToT). 
            </p>
            <p>
              • Un score <strong className="text-emerald-400">&lt; 0.30</strong> indique un consensus parfait (Zéro confusion).
              <br />
              • Un score <strong className="text-amber-400">0.30 - 0.60</strong> indique des alternatives équilibrées sous contrôle standard.
              <br />
              • Un score <strong className="text-rose-400">&gt; 0.60</strong> indique des conclusions turbulentes, déclenchant automatiquement des recursions correctives de l'IA.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* LEFT COLUMN: Main circular gauge of focused ToT (5 columns) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 border border-slate-800/40 bg-slate-950/20 rounded-xl relative">
          
          {/* Main Ring Container */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            
            {/* Outer dotted decorative rotating ring (superposition effect) */}
            <motion.div 
              className="absolute inset-0 border border-dashed border-indigo-500/20 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
            />

            {/* Inner secondary rotating indicators */}
            <motion.div 
              className="absolute inset-2 border-2 border-dotted border-indigo-400/10 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            />

            {/* Core Circular SVG Gauge */}
            <svg className="w-36 h-36 transform -rotate-90">
              {/* Background circular track */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-800/80 fill-transparent"
                strokeWidth={strokeWidth}
              />
              
              {/* Active animated progress stroke with custom color based on entropy score */}
              <motion.circle
                cx="72"
                cy="72"
                r={radius}
                className={`fill-transparent transition-all duration-700 ease-out ${entropyCategory.glow}`}
                stroke={entropyCategory.stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: getStrokeDashoffset(activeEntropy) }}
                strokeLinecap="round"
              />
            </svg>

            {/* Inside Circle Digital Stats */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                {activeItem ? activeItem.feedType : 'VEILLE'}
              </span>
              <motion.span 
                key={activeEntropy} // Triggers simple animate-in when value shifts
                initial={{ opacity: 0.6, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-2xl font-mono font-black tracking-tight text-white mt-0.5"
              >
                {activeEntropy.toFixed(4)}
              </motion.span>
              <span className="text-[8px] font-mono text-slate-400 -mt-1 uppercase tracking-tight">
                bits H(s)
              </span>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${entropyCategory.color} animate-ping`} />
                <span className={`text-[7px] font-mono font-bold ${entropyCategory.color}`}>
                  {activeEntropy < 0.3 ? 'COHÉRENT' : activeEntropy < 0.6 ? 'STABLE' : 'TURBULENT'}
                </span>
              </div>
            </div>

          </div>

          {/* Focused Item Label Details */}
          <div className="mt-2 w-full text-center space-y-1">
            <span className="text-[9px] font-mono text-slate-400 block truncate max-w-full font-bold px-2">
              {activeItem ? activeItem.feedTitle : 'Système global de cohérence active'}
            </span>
            <p className="text-[8.5px] text-slate-500 font-mono leading-tight px-1 text-center">
              {entropyCategory.desc}
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Grid of ALL active / standby monitors (7 columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-3.5">
          
          <div className="flex items-center justify-between text-left">
            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Network className="w-3 h-3 text-indigo-400" />
              Secteurs et Analyses Actives
            </span>
            <span className="text-[8px] text-slate-500 font-mono">
              {recentItems.length > 0 ? `${recentItems.length} ACTIFS` : 'MODES VEILLE ACTIVE'}
            </span>
          </div>

          {/* Cases Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {recentItems.length > 0 ? (
              /* REAL ACTIVE INCIDENTS GAUGES */
              recentItems.map((item) => {
                const isSelected = selectedResult?.id === item.id;
                const localEntropy = Math.min(1, Math.max(0, parseFloat((item.entropyScore + (isSelected ? quantumFluctuation : 0)).toFixed(4))));
                
                // Color codes for item
                const itemColor = localEntropy < 0.3 ? 'text-emerald-400' : localEntropy < 0.6 ? 'text-amber-400' : 'text-rose-400';
                const itemStroke = localEntropy < 0.3 ? '#10b981' : localEntropy < 0.6 ? '#f59e0b' : '#f43f5e';
                const itemBg = localEntropy < 0.3 ? 'bg-emerald-950/10' : localEntropy < 0.6 ? 'bg-amber-950/10' : 'bg-rose-950/10';

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectActive(item)}
                    className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden flex items-center gap-2.5 cursor-pointer hover:border-slate-700/60 group ${
                      isSelected 
                        ? 'bg-indigo-950/15 border-indigo-500/80 shadow-lg ring-1 ring-indigo-500/20' 
                        : 'bg-slate-950/40 border-slate-900'
                    }`}
                  >
                    {/* Ring Visual Indicator */}
                    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          className="stroke-slate-900 fill-transparent"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          className="fill-transparent"
                          stroke={itemStroke}
                          strokeWidth="3.5"
                          strokeDasharray={2 * Math.PI * 16}
                          strokeDashoffset={(2 * Math.PI * 16) * (1 - localEntropy)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[8px] font-mono font-bold text-slate-200">
                        {localEntropy.toFixed(2)}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 font-mono text-left">
                      <div className="flex items-center gap-1">
                        <span className={`text-[7px] font-bold px-1 rounded uppercase scale-90 ${getSecteurColor(item.feedType)}`}>
                          {item.feedType}
                        </span>
                        {isSelected && (
                          <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />
                        )}
                      </div>
                      <h4 className="text-[9.5px] font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors mt-0.5">
                        {item.feedTitle}
                      </h4>
                      <span className="text-[7.5px] text-slate-500 block truncate">
                        SLA : {item.durationMs}ms • {localEntropy < 0.3 ? 'COHÉRENT' : localEntropy < 0.6 ? 'STABLE' : 'VOLATIL'}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              /* STANDBY SYSTEM MONITORS WHEN NO RECENT ToT EXISTS YET */
              standbySectors.map((monitor) => {
                // Fluctuate each sector slightly independently
                const sectorFluct = monitor.entropyScore + (Math.sin(Date.now() / 2000 + (monitor.entropyScore * 10)) * 0.008);
                const localEntropy = Math.min(1, Math.max(0, parseFloat(sectorFluct.toFixed(4))));
                
                const itemColor = localEntropy < 0.3 ? 'text-emerald-400' : localEntropy < 0.6 ? 'text-amber-400' : 'text-rose-400';
                const itemStroke = localEntropy < 0.3 ? '#10b981' : localEntropy < 0.6 ? '#f59e0b' : '#f43f5e';

                return (
                  <div
                    key={monitor.id}
                    className="p-2.5 rounded-xl border border-slate-900 bg-slate-950/20 text-left flex items-center gap-2.5 relative group"
                  >
                    {/* Ring Visual Indicator */}
                    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          className="stroke-slate-900 fill-transparent"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          className="fill-transparent"
                          stroke={itemStroke}
                          strokeWidth="3.5"
                          strokeDasharray={2 * Math.PI * 16}
                          strokeDashoffset={(2 * Math.PI * 16) * (1 - localEntropy)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[8px] font-mono font-bold text-slate-300">
                        {localEntropy.toFixed(2)}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 font-mono">
                      <div className="flex items-center justify-between">
                        <span className={`text-[7px] font-bold px-1 rounded uppercase scale-90 ${getSecteurColor(monitor.feedType)}`}>
                          {monitor.feedType}
                        </span>
                        <span className="text-[6.5px] text-emerald-500 font-bold flex items-center gap-0.5">
                          <Zap className="w-2 h-2 text-emerald-500" />
                          VEILLE
                        </span>
                      </div>
                      <h4 className="text-[9.5px] font-bold text-slate-400 truncate mt-0.5">
                        {monitor.feedTitle}
                      </h4>
                      <span className="text-[7.5px] text-slate-600 block">
                        Régime de bruit normalisé
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick manual triggers / instructions card */}
          <div className="p-2 rounded-lg border border-slate-900/60 bg-slate-950/25 flex items-center gap-2 text-[8.5px] font-mono text-slate-500 text-left">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              <strong>Note de l'Opérateur</strong> : Pour générer des mesures d'entropie quantique ToT authentiques, cliquez sur n'importe quelle alerte du flux en temps réel sur la gauche pour lancer une analyse stratégique multicritères de l'IA.
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
