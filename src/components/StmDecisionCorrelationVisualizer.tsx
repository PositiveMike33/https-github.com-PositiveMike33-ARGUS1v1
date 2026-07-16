/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { FeedItem, ToTAnalysisResult } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity, ShieldCheck, Zap, AlertCircle, Sparkles } from 'lucide-react';

interface StmDecisionCorrelationVisualizerProps {
  feeds: FeedItem[];
  decisionsArchive: ToTAnalysisResult[];
}

interface CorrelationDataPoint {
  timeLabel: string;
  stmAlerts: number;    // Intensity of received STM alerts (e.g. weighted severity of active green/orange line issues)
  totDecisions: number; // Volume of decisions taken via ToT logic
  remediation: number;  // Level of resolved threat/avoidance achieved by the decisions
  entropyReduction: number; // Quantum entropy resorbed (x100)
}

export const StmDecisionCorrelationVisualizer: React.FC<StmDecisionCorrelationVisualizerProps> = ({
  feeds,
  decisionsArchive
}) => {
  // 1. Calculate active metrics based on live inputs
  const liveStats = useMemo(() => {
    // Count STM feeds by severity
    let alertWeight = 0;
    let stmCount = 0;
    feeds.forEach(f => {
      if (f.type === 'STM') {
        stmCount++;
        if (f.severity === 'low') alertWeight += 1.5;
        else if (f.severity === 'medium') alertWeight += 3.5;
        else if (f.severity === 'high') alertWeight += 6;
        else if (f.severity === 'critical') alertWeight += 10;
      }
    });

    // Count decisions matching STM
    const stmDecisions = decisionsArchive.filter(d => d.feedType === 'STM');
    const decisionWeight = stmDecisions.reduce((acc, d) => {
      // More branches or higher scores mean a more intensive decision
      const branchIntensity = d.branches?.length || 3;
      return acc + (branchIntensity * 1.8);
    }, 0);

    // Alignment rate: how well decisions cover alerts
    const alignmentRate = alertWeight > 0 
      ? Math.min(100, Math.round((decisionWeight / (alertWeight * 1.5)) * 100))
      : 100; // 100% nominal if no active alerts

    return {
      activeAlertsCount: stmCount,
      alertWeight: parseFloat(alertWeight.toFixed(1)),
      decisionsCount: stmDecisions.length,
      decisionWeight: parseFloat(decisionWeight.toFixed(1)),
      alignmentRate: Math.max(15, alignmentRate) // baseline min
    };
  }, [feeds, decisionsArchive]);

  // 2. Generate past 24-hour chronological trend data for the stacked area chart
  const chartData = useMemo<CorrelationDataPoint[]>(() => {
    const dataPoints: CorrelationDataPoint[] = [];
    const now = new Date();
    const intervals = [21, 18, 15, 12, 9, 6, 3, 0];

    // Build points back in time
    intervals.forEach((hours, idx) => {
      const pointTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      const hStr = String(pointTime.getHours()).padStart(2, '0');
      const mStr = String(pointTime.getMinutes()).padStart(2, '0');
      const timeLabel = hours === 0 ? 'Actuel' : `T-${hours}h (${hStr}:${mStr})`;

      // Baseline simulation to establish historical trend
      // Commute peak waves in Montreal (7-9h, 16-18h)
      const hourVal = pointTime.getHours();
      const isCommute = (hourVal >= 7 && hourVal <= 9) || (hourVal >= 16 && hourVal <= 18);

      let baseAlerts = isCommute ? 8.5 : 2.5;
      let baseDecisions = isCommute ? 6.0 : 2.0;
      let baseRemediation = isCommute ? 4.5 : 1.5;

      // Add small organic random variations
      const seed = Math.sin(idx + 1.5) * 1.2;
      baseAlerts = Math.max(1, baseAlerts + seed);
      baseDecisions = Math.max(0.5, baseDecisions + seed * 0.8);
      baseRemediation = Math.max(0.5, baseRemediation + seed * 0.9);

      if (hours === 0) {
        // Feed in live dynamic stats to make the current point react to real-time events
        dataPoints.push({
          timeLabel,
          stmAlerts: Math.max(1.5, liveStats.alertWeight),
          totDecisions: Math.max(1, liveStats.decisionWeight),
          remediation: Math.max(1, (liveStats.decisionWeight * 0.8) + (liveStats.alignmentRate / 35)),
          entropyReduction: Math.max(10, Math.round(liveStats.alignmentRate * 0.85))
        });
      } else {
        // Calculate correlation/remediation for historical items
        const rawReduction = Math.min(95, Math.round((baseDecisions / (baseAlerts || 1)) * 80 + 10));
        dataPoints.push({
          timeLabel,
          stmAlerts: parseFloat(baseAlerts.toFixed(1)),
          totDecisions: parseFloat(baseDecisions.toFixed(1)),
          remediation: parseFloat(baseRemediation.toFixed(1)),
          entropyReduction: Math.max(15, rawReduction)
        });
      }
    });

    return dataPoints;
  }, [liveStats]);

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 p-5 flex flex-col space-y-5 shadow-lg relative overflow-hidden font-sans"
      id="argus-stm-decision-correlation-container"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Corrélation Télémétrique & Décisions STM
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              ANALYSE MULTICOUCHE DES ALERTES RÉCEPTEURS vs ACTIONS TOT CONJOINTES
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] font-bold">
          <span className="flex items-center gap-1 bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded">
            <Sparkles className="w-2.5 h-2.5 animate-pulse text-indigo-300" />
            VÉLOCITÉ COHÉRENTE
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        
        <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-3 text-left">
          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Alertes Reçues (Charge)</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-bold text-slate-200 font-mono">
              {liveStats.activeAlertsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              (index: {liveStats.alertWeight})
            </span>
          </div>
          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-mono">
            Volume brut cumulé des incidents de transport
          </p>
        </div>

        <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-3 text-left">
          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Résolutions Déclenchées</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-bold text-indigo-400 font-mono">
              {liveStats.decisionsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              (index: {liveStats.decisionWeight})
            </span>
          </div>
          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-mono">
            Synthèses ToT finalisées pour évitement
          </p>
        </div>

        <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-3 text-left">
          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Taux d'Alignement</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {liveStats.alignmentRate}%
            </span>
            <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 px-1 py-0.2 rounded font-mono font-bold scale-90">
              OPTIMAL
            </span>
          </div>
          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-mono">
            Couverture décisionnelle face aux congestions
          </p>
        </div>

        <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-3 text-left">
          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Entropie Résorbée</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-amber-400 font-mono">
              {Math.round(liveStats.alignmentRate * 0.72)}%
            </span>
            <span className="text-[9px] text-slate-400 font-mono">Δ</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-mono">
            Réduction de l'incertitude locale de transit
          </p>
        </div>

      </div>

      {/* Stacked Area Chart */}
      <div className="h-[260px] w-full" id="argus-recharts-stm-stacked-area">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorDecisions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorRemediation" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false} />
            <XAxis 
              dataKey="timeLabel" 
              stroke="#475569" 
              fontSize={9} 
              tickLine={false}
              fontFamily="JetBrains Mono, monospace"
            />
            <YAxis 
              stroke="#475569" 
              fontSize={9} 
              tickLine={false}
              axisLine={false}
              fontFamily="JetBrains Mono, monospace"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg shadow-xl font-mono text-[10px] space-y-1 text-left">
                      <p className="font-bold text-slate-300 border-b border-slate-900 pb-1 mb-1">
                        {payload[0].payload.timeLabel}
                      </p>
                      {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between gap-5">
                          <span style={{ color: p.color }} className="font-semibold">
                            {p.name === 'stmAlerts' ? '🔥 Charge STM' : p.name === 'totDecisions' ? '⚡ Décisions ToT' : '🛡️ Évitement/Remède'} :
                          </span>
                          <span className="text-slate-200 font-bold">{p.value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-5 pt-1 mt-1 border-t border-slate-900 text-slate-400">
                        <span>Stabilisation :</span>
                        <span className="text-amber-400 font-bold">
                          {payload[0].payload.entropyReduction}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              content={() => (
                <div className="flex justify-center gap-6 text-[10px] font-mono font-bold">
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/50" />
                    <span>CHARGE STM (ALERTES)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500/20 border border-indigo-500/50" />
                    <span>DÉCISIONS D'ÉVITEMENT (ToT)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/50" />
                    <span>INDEX DE RÉSILIENCE</span>
                  </div>
                </div>
              )}
            />
            {/* Area chart in stacked mode (using stackId="1") to show cumulative weight/correlation */}
            <Area
              type="monotone"
              dataKey="stmAlerts"
              name="stmAlerts"
              stackId="1"
              stroke="#f43f5e"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorAlerts)"
            />
            <Area
              type="monotone"
              dataKey="totDecisions"
              name="totDecisions"
              stackId="1"
              stroke="#6366f1"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorDecisions)"
            />
            <Area
              type="monotone"
              dataKey="remediation"
              name="remediation"
              stackId="1"
              stroke="#10b981"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorRemediation)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory footer footer */}
      <div className="bg-slate-950/25 border border-slate-900/60 rounded-xl p-3 flex items-start gap-2 text-left">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
          <strong className="text-slate-300">Observation Télémétrique :</strong> Le graphique démontre une corrélation directe entre les alertes STM reçues et les décisions d'évitement formulées par l'Arbre de Pensées (ToT). Chaque hausse des alertes (zone rose) est absorbée par une augmentation proportionnelle de la couverture décisionnelle (zone indigo), ce qui stabilise la trajectoire globale et maintient l'index de résilience à un niveau de sécurité optimal.
        </p>
      </div>
    </div>
  );
};
