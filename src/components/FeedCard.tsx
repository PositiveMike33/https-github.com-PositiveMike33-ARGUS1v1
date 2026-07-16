/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FeedItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus, 
  Plane, 
  Ship, 
  Clock, 
  Shuffle, 
  Database,
  ArrowRight,
  Camera
} from 'lucide-react';

interface FeedCardProps {
  item: FeedItem;
  onStandardize: (id: string) => void;
  onAnalyze: (item: FeedItem) => void;
  isAnalyzing: boolean;
  hasBeenAnalyzed: boolean;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  item,
  onStandardize,
  onAnalyze,
  isAnalyzing,
  hasBeenAnalyzed,
}) => {
  const getIcon = () => {
    switch (item.type) {
      case 'STM':
        return <Bus className="w-5 h-5 text-emerald-400" />;
      case 'AVIATION':
        return <Plane className="w-5 h-5 text-sky-400" />;
      case 'MARITIME':
        return <Ship className="w-5 h-5 text-amber-400" />;
      case 'CCTV':
        return <Camera className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getSeverityBadgeColor = () => {
    switch (item.severity) {
      case 'low':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'medium':
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      case 'high':
        return 'bg-orange-950/80 text-orange-300 border-orange-800';
      case 'critical':
        return 'bg-red-950/80 text-red-300 border-red-800 animate-pulse';
    }
  };

  const getSeverityLabel = (sev: string) => {
    switch (sev) {
      case 'low':
        return 'BASSE';
      case 'medium':
        return 'MOYENNE';
      case 'high':
        return 'HAUTE';
      case 'critical':
        return 'CRITIQUE';
      default:
        return sev.toUpperCase();
    }
  };

  const getTypeTheme = () => {
    switch (item.type) {
      case 'STM':
        return {
          border: 'border-emerald-900/40 hover:border-emerald-400/80',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_25px_rgba(16,185,129,0.18)]',
          banner: 'bg-emerald-500/5',
        };
      case 'AVIATION':
        return {
          border: 'border-sky-900/40 hover:border-sky-400/80',
          glow: 'shadow-[0_0_15px_rgba(14,165,233,0.05)] hover:shadow-[0_0_25px_rgba(14,165,233,0.18)]',
          banner: 'bg-sky-500/5',
        };
      case 'MARITIME':
        return {
          border: 'border-amber-900/40 hover:border-amber-400/80',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:shadow-[0_0_25px_rgba(245,158,11,0.18)]',
          banner: 'bg-amber-500/5',
        };
      case 'CCTV':
        return {
          border: 'border-indigo-900/40 hover:border-indigo-400/80',
          glow: 'shadow-[0_0_15px_rgba(99,102,241,0.05)] hover:shadow-[0_0_25px_rgba(99,102,241,0.18)]',
          banner: 'bg-indigo-500/5',
        };
    }
  };

  const theme = getTypeTheme();
  
  const isBrandNew = React.useMemo(() => {
    const ageMs = Date.now() - new Date(item.timestamp).getTime();
    return ageMs > 0 && ageMs < 15000; // 15 seconds
  }, [item.timestamp]);

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes telemetry-pulse-${item.id} {
          0% {
            box-shadow: 0 0 0 0 rgba(${item.type === 'STM' ? '16, 185, 129' : item.type === 'AVIATION' ? '14, 165, 233' : item.type === 'MARITIME' ? '245, 158, 11' : '99, 102, 241'}, 0.5);
            border-color: rgba(${item.type === 'STM' ? '16, 185, 129' : item.type === 'AVIATION' ? '14, 165, 233' : item.type === 'MARITIME' ? '245, 158, 11' : '99, 102, 241'}, 0.8);
          }
          50% {
            box-shadow: 0 0 18px 4px rgba(${item.type === 'STM' ? '16, 185, 129' : item.type === 'AVIATION' ? '14, 165, 233' : item.type === 'MARITIME' ? '245, 158, 11' : '99, 102, 241'}, 0.15);
            border-color: rgba(${item.type === 'STM' ? '16, 185, 129' : item.type === 'AVIATION' ? '14, 165, 233' : item.type === 'MARITIME' ? '245, 158, 11' : '99, 102, 241'}, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(${item.type === 'STM' ? '16, 185, 129' : item.type === 'AVIATION' ? '14, 165, 233' : item.type === 'MARITIME' ? '245, 158, 11' : '99, 102, 241'}, 0.5);
            border-color: rgba(${item.type === 'STM' ? '16, 185, 129' : item.type === 'AVIATION' ? '14, 165, 233' : item.type === 'MARITIME' ? '245, 158, 11' : '99, 102, 241'}, 0.8);
          }
        }
        .telemetry-pulse-${item.id} {
          animation: telemetry-pulse-${item.id} 2s infinite ease-in-out;
        }
      `}} />
      <div 
        className={`relative rounded-xl border bg-slate-900/90 text-slate-100 overflow-hidden transform hover:scale-[1.02] transition-all duration-300 will-change-transform group flex flex-col justify-between ${theme ? theme.border : ''} ${theme ? theme.glow : ''} ${isBrandNew ? `telemetry-pulse-${item.id} border-indigo-500 bg-slate-950` : ''}`}
        id={`feed-card-${item.id}`}
      >
      {/* Real-Time Highlight Effects for Brand New Arrivals */}
      {isBrandNew && (
        <>
          {/* Pulsing outer highlight border overlay */}
          <motion.div
            initial={{ opacity: 0.9, scale: 0.99 }}
            animate={{ 
              opacity: [0.9, 0.2, 0.9],
              scale: [1, 1.015, 1],
              borderColor: [
                item.type === 'STM' ? '#10b981' : item.type === 'AVIATION' ? '#0ea5e9' : item.type === 'MARITIME' ? '#f59e0b' : '#6366f1',
                'rgba(99, 102, 241, 0)',
                item.type === 'STM' ? '#10b981' : item.type === 'AVIATION' ? '#0ea5e9' : item.type === 'MARITIME' ? '#f59e0b' : '#6366f1',
              ]
            }}
            transition={{ 
              duration: 2.2, 
              repeat: 5, // Pulse 5 times (around 11 seconds total)
              ease: "easeInOut" 
            }}
            className="absolute inset-0 border-2 rounded-xl pointer-events-none z-20"
          />
          
          {/* Ambient fading background glow */}
          <motion.div
            initial={{ opacity: 0.25 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 10, ease: "easeOut" }}
            className={`absolute inset-0 pointer-events-none z-0 ${
              item.type === 'STM' ? 'bg-emerald-500/15' : item.type === 'AVIATION' ? 'bg-sky-500/15' : item.type === 'MARITIME' ? 'bg-amber-500/15' : 'bg-indigo-500/15'
            }`}
          />
        </>
      )}

      {/* Visual Accent Top Bar */}
      <div className={`h-1.5 w-full ${
        item.type === 'STM' ? 'bg-emerald-500' : item.type === 'AVIATION' ? 'bg-sky-500' : item.type === 'MARITIME' ? 'bg-amber-500' : 'bg-indigo-500'
      }`} />

      {/* Card Header */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-slate-800 border border-slate-700/60`}>
              {getIcon()}
            </div>
            <span className="font-mono text-xs font-semibold text-slate-400 tracking-wider">
              SECTEUR {item.type}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {isBrandNew && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 120 }}
                className="bg-red-600/90 border border-red-500/30 text-white font-mono text-[9px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.4)]"
              >
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                <span>NOUVEAU</span>
              </motion.span>
            )}
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider font-medium ${getSeverityBadgeColor()}`}>
              {getSeverityLabel(item.severity)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-display text-base font-semibold text-slate-100 group-hover:text-white transition-colors duration-200 leading-tight mb-2">
          {item.title}
        </h3>

        {/* Source and Timestamp */}
        <div className="flex items-center gap-3 text-slate-400 text-xs mb-3 font-mono">
          <span className="truncate max-w-[150px]">{item.source}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(item.timestamp)}
          </span>
        </div>

        {/* Highlight Telemetry Metric */}
        <div className="mb-4 p-2.5 rounded bg-slate-950/85 border border-slate-800/80 font-mono text-xs flex items-center justify-between">
          <span className="text-slate-400">Valeur de télémétrie :</span>
          <span className="text-slate-200 font-semibold">{item.value}</span>
        </div>

        {/* Description Body */}
        <p className="text-slate-300 text-sm leading-relaxed line-clamp-3 mb-4 font-sans">
          {item.details}
        </p>

        {/* Standardized Payload Preview if active */}
        <AnimatePresence initial={false}>
          {item.mcpStandardized && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="mt-2 p-3 rounded bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 text-xs font-mono overflow-hidden"
            >
              <div className="flex items-center gap-1.5 mb-1.5 text-emerald-400">
                <Database className="w-3.5 h-3.5" />
                <span>Données standardisées MCP :</span>
              </div>
              <pre className="text-[10px] overflow-x-auto p-1.5 bg-slate-950/60 rounded border border-slate-800">
{JSON.stringify({
  schema: `argus:sector:${item.type.toLowerCase()}:v1`,
  telemetry: {
    id: item.id,
    alert: item.title,
    severityLevel: item.severity === 'critical' ? 4 : item.severity === 'high' ? 3 : item.severity === 'medium' ? 2 : 1,
    originator: item.source,
    valueMetric: item.value,
    capturedAt: item.timestamp,
  }
}, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Actions */}
      <div className="p-4 pt-0 border-t border-slate-800/60 bg-slate-950/30 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onStandardize(item.id)}
          className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded transition-all duration-200 border ${
            item.mcpStandardized 
              ? 'bg-emerald-950/35 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/20' 
              : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700 bg-slate-900/40'
          }`}
          title="Convertir ce flux brut en format de conteneur standardisé MCP avant l'analyse."
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{item.mcpStandardized ? 'Standardisé MCP' : 'Connecter MCP'}</span>
        </button>

        <button
          onClick={() => onAnalyze(item)}
          disabled={isAnalyzing}
          className={`flex items-center gap-1.5 text-xs font-mono font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200 shadow-md ${
            isAnalyzing 
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : hasBeenAnalyzed
              ? 'bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 border border-indigo-500'
          }`}
        >
          <span>{isAnalyzing ? 'Réflexion...' : hasBeenAnalyzed ? 'Re-synthétiser ToT' : 'Synthétiser ToT'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    </>
  );
};
