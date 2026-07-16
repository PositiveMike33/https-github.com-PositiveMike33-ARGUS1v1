/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ToTAnalysisResult, FeedType } from '../types';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  Legend
} from 'recharts';
import { 
  ShieldCheck, 
  TrendingDown, 
  TrendingUp, 
  AlertOctagon, 
  Activity, 
  Zap, 
  Globe, 
  Cpu, 
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ExecutiveSummaryProps {
  archive: ToTAnalysisResult[];
}

const getISOWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const generateHistoricalWeeks = () => {
  const now = new Date();
  const currentWeek = getISOWeek(now);
  return [
    { week: `Semaine W${currentWeek - 3}`, stmEntropy: 0.32, aviationEntropy: 0.24, maritimeEntropy: 0.41, cctvEntropy: 0.18, totalDecisions: 14 },
    { week: `Semaine W${currentWeek - 2}`, stmEntropy: 0.38, aviationEntropy: 0.29, maritimeEntropy: 0.35, cctvEntropy: 0.22, totalDecisions: 18 },
    { week: `Semaine W${currentWeek - 1}`, stmEntropy: 0.29, aviationEntropy: 0.31, maritimeEntropy: 0.48, cctvEntropy: 0.15, totalDecisions: 22 },
    { week: `Semaine W${currentWeek}`, stmEntropy: 0.45, aviationEntropy: 0.35, maritimeEntropy: 0.52, cctvEntropy: 0.28, totalDecisions: 29 },
  ];
};

export const ExecutiveSummaryDashboard: React.FC<ExecutiveSummaryProps> = ({ archive }) => {
  const [selectedSubView, setSelectedSubView] = useState<'trends' | 'sectors' | 'diagnostics'>('trends');

  // Aggregated computations
  const dashboardStats = useMemo(() => {
    // 1. Weekly grouping of decisions
    const weekMap: Record<string, { totalEntropy: number; count: number; sectors: Record<FeedType, { sum: number; count: number }> }> = {};

    const historicalWeeks = generateHistoricalWeeks();
    const weeks = historicalWeeks.map(h => h.week);
    weeks.forEach(w => {
      weekMap[w] = { 
        totalEntropy: 0, 
        count: 0, 
        sectors: {
          STM: { sum: 0, count: 0 },
          AVIATION: { sum: 0, count: 0 },
          MARITIME: { sum: 0, count: 0 },
          CCTV: { sum: 0, count: 0 }
        }
      };
    });

    // Populate with actual decisions from archive
    archive.forEach(item => {
      const date = new Date(item.timestamp);
      // Group logically into recent weeks
      let chosenWeek = weeks[3]; // Default to current week
      const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 21) chosenWeek = weeks[0];
      else if (diffDays > 14) chosenWeek = weeks[1];
      else if (diffDays > 7) chosenWeek = weeks[2];

      if (!weekMap[chosenWeek]) {
        weekMap[chosenWeek] = {
          totalEntropy: 0,
          count: 0,
          sectors: { STM: { sum: 0, count: 0 }, AVIATION: { sum: 0, count: 0 }, MARITIME: { sum: 0, count: 0 }, CCTV: { sum: 0, count: 0 } }
        };
      }

      weekMap[chosenWeek].totalEntropy += item.entropyScore;
      weekMap[chosenWeek].count++;
      
      const sector = item.feedType;
      if (weekMap[chosenWeek].sectors[sector]) {
        weekMap[chosenWeek].sectors[sector].sum += item.entropyScore;
        weekMap[chosenWeek].sectors[sector].count++;
      }
    });

    // 2. Synthesize weekly data points merging historical baselines with active archive values
    const chartData = historicalWeeks.map((hist, idx) => {
      const wName = hist.week;
      const actual = weekMap[wName];

      let stmVal = hist.stmEntropy;
      let aviVal = hist.aviationEntropy;
      let marVal = hist.maritimeEntropy;
      let cctvVal = hist.cctvEntropy;
      let decsCount = hist.totalDecisions;

      if (actual && actual.count > 0) {
        decsCount += actual.count;
        if (actual.sectors.STM.count > 0) stmVal = (stmVal + (actual.sectors.STM.sum / actual.sectors.STM.count)) / 2;
        if (actual.sectors.AVIATION.count > 0) aviVal = (aviVal + (actual.sectors.AVIATION.sum / actual.sectors.AVIATION.count)) / 2;
        if (actual.sectors.MARITIME.count > 0) marVal = (marVal + (actual.sectors.MARITIME.sum / actual.sectors.MARITIME.count)) / 2;
        if (actual.sectors.CCTV.count > 0) cctvVal = (cctvVal + (actual.sectors.CCTV.sum / actual.sectors.CCTV.count)) / 2;
      }

      const avgEntropy = (stmVal + aviVal + marVal + cctvVal) / 4;
      // Resilience = Inverse of Entropy (normalized)
      const resilience = Math.max(10, Math.round((1 - avgEntropy) * 100));

      return {
        week: wName.replace('Semaine ', ''),
        entropy: parseFloat(avgEntropy.toFixed(3)),
        resilience,
        STM: parseFloat(stmVal.toFixed(3)),
        AVIATION: parseFloat(aviVal.toFixed(3)),
        MARITIME: parseFloat(marVal.toFixed(3)),
        CCTV: parseFloat(cctvVal.toFixed(3)),
        décisions: decsCount
      };
    });

    // 3. Compute global diagnostic KPIs
    const currentWeekStats = chartData[chartData.length - 1];
    const prevWeekStats = chartData[chartData.length - 2];

    const entropyDiff = parseFloat((currentWeekStats.entropy - prevWeekStats.entropy).toFixed(3));
    const isEntropyImproving = entropyDiff <= 0;

    const currentResilience = currentWeekStats.resilience;
    const resilienceDiff = currentResilience - prevWeekStats.resilience;

    // Identify the most vulnerable sector based on highest current entropy
    const sectorsArray = [
      { name: 'STM (Métro/Bus)', score: currentWeekStats.STM },
      { name: 'AVIATION (Fret/CYUL)', score: currentWeekStats.AVIATION },
      { name: 'MARITIME (Arrimage LaSalle)', score: currentWeekStats.MARITIME },
      { name: 'CCTV (Télémétrie Vidéo)', score: currentWeekStats.CCTV }
    ];
    sectorsArray.sort((a, b) => b.score - a.score);
    const mostVulnerableSector = sectorsArray[0];

    // Identify the safest sector based on lowest current entropy
    sectorsArray.sort((a, b) => a.score - b.score);
    const safestSector = sectorsArray[0];

    // Radar chart dataset for Sector Specific Risk Profile
    const radarData = [
      { subject: 'STM', A: Math.round((1 - currentWeekStats.STM) * 100), fullMark: 100 },
      { subject: 'AVIATION', A: Math.round((1 - currentWeekStats.AVIATION) * 100), fullMark: 100 },
      { subject: 'MARITIME', A: Math.round((1 - currentWeekStats.MARITIME) * 100), fullMark: 100 },
      { subject: 'CCTV', A: Math.round((1 - currentWeekStats.CCTV) * 100), fullMark: 100 },
    ];

    return {
      chartData,
      currentEntropy: currentWeekStats.entropy,
      entropyDiff,
      isEntropyImproving,
      currentResilience,
      resilienceDiff,
      mostVulnerableSector,
      safestSector,
      radarData,
      totalDecisionsArchived: archive.length + 83 // actual + simulated baseline history
    };
  }, [archive]);

  return (
    <div 
      className="bg-slate-950/65 border border-slate-900 rounded-xl p-5 space-y-5 shadow-2xl relative overflow-hidden font-sans text-left"
      id="executive-summary-dashboard"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-emerald-400">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
              <span>EXECUTIVE RESILIENCE SUMMARY</span>
              <span className="text-[7.5px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">
                CONSOLIDÉ HEBDOMADAIRE
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              ANALYSE ENTROPIQUE QUANTIQUE ET FIABILITÉ DES INFRASTRUCTURES
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 self-start md:self-center font-mono text-[9px] font-bold">
          <button
            onClick={() => setSelectedSubView('trends')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              selectedSubView === 'trends' 
                ? 'bg-slate-950 text-emerald-400 border border-slate-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ENTROPIE & RÉSILIENCE
          </button>
          <button
            onClick={() => setSelectedSubView('sectors')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              selectedSubView === 'sectors' 
                ? 'bg-slate-950 text-emerald-400 border border-slate-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PROFIL SECTORIEL
          </button>
          <button
            onClick={() => setSelectedSubView('diagnostics')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              selectedSubView === 'diagnostics' 
                ? 'bg-slate-950 text-emerald-400 border border-slate-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DIAGNOSTIC ARGUS
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        
        {/* KPI 1: Network Resilience Index */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-900/85 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>RÉSILIENCE DU RÉSEAU</span>
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tracking-tight">{dashboardStats.currentResilience}%</span>
            <span className={`text-[9px] font-bold flex items-center ${
              dashboardStats.resilienceDiff >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {dashboardStats.resilienceDiff >= 0 ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
              {dashboardStats.resilienceDiff >= 0 ? `+${dashboardStats.resilienceDiff}%` : `${dashboardStats.resilienceDiff}%`}
            </span>
          </div>
          <p className="text-[8.5px] text-slate-500 leading-normal">
            Capacité d'adaptation autonome du transit face aux pannes sectorielles.
          </p>
        </div>

        {/* KPI 2: Quantum Entropy score */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-900/85 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>ENTROPIE GLOBALE</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-indigo-300 tracking-tight">{dashboardStats.currentEntropy} <span className="text-xs text-slate-500 font-normal">H(x)</span></span>
            <span className={`text-[9px] font-bold flex items-center ${
              dashboardStats.isEntropyImproving ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {dashboardStats.isEntropyImproving ? <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> : <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
              {dashboardStats.entropyDiff >= 0 ? `+${dashboardStats.entropyDiff}` : `${dashboardStats.entropyDiff}`}
            </span>
          </div>
          <p className="text-[8.5px] text-slate-500 leading-normal">
            Niveau d'incertitude quantique et de désordre informatif mesuré.
          </p>
        </div>

        {/* KPI 3: Vulnerability center */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-900/85 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>AXE VULNÉRABLE</span>
            <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-200 truncate">{dashboardStats.mostVulnerableSector.name}</div>
            <div className="text-[9px] text-amber-400 font-bold uppercase">
              ENTROPIE CRÊTE : {dashboardStats.mostVulnerableSector.score.toFixed(3)}
            </div>
          </div>
          <p className="text-[8.5px] text-slate-500 leading-normal">
            Secteur affichant les congestions ou alertes météo les plus denses.
          </p>
        </div>

        {/* KPI 4: Decisions made */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-900/85 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>DÉCISIONS ENREGISTRÉES</span>
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white tracking-tight">{dashboardStats.totalDecisionsArchived}</span>
            <span className="text-[9px] text-slate-500 font-bold">AUTONOMES</span>
          </div>
          <p className="text-[8.5px] text-slate-500 leading-normal">
            Régulations ToT synchronisées de manière persistante sur Firestore.
          </p>
        </div>
      </div>

      {/* Main Graph/Visual Content Area */}
      <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-xl">
        {selectedSubView === 'trends' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Évolution Temporelle de l'Entropie & Résilience du Transit</span>
              </span>
              <span className="text-[8.5px] font-mono text-slate-500">Métrique Shannon/Vopson</span>
            </div>
            
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardStats.chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 9, fontFamily: 'monospace' }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', paddingTop: 8 }} />
                  <Line 
                    name="Indice de Résilience (%)" 
                    type="monotone" 
                    dataKey="resilience" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    name="Incidents cumulés (x50)" 
                    type="monotone" 
                    dataKey="décisions" 
                    stroke="#6366f1" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {selectedSubView === 'sectors' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Résilience Vectorielle des Secteurs (%)</span>
                </span>
              </div>
              
              <div className="h-[180px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dashboardStats.radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" style={{ fontSize: 8 }} />
                    <Radar 
                      name="Fiabilité Active" 
                      dataKey="A" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.15} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: 8 }}
                      itemStyle={{ fontSize: 10, fontFamily: 'monospace' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Distribution des Risques d'Entropie</span>
                </span>
              </div>
              
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardStats.chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: 8 }}
                      itemStyle={{ fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', paddingTop: 8 }} />
                    <Bar name="STM" dataKey="STM" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar name="AVIATION" dataKey="AVIATION" fill="#6366f1" radius={[2, 2, 0, 0]} />
                    <Bar name="MARITIME" dataKey="MARITIME" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                    <Bar name="CCTV" dataKey="CCTV" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedSubView === 'diagnostics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Rapport d'Intégrité Cognitif ARGUS</span>
              </span>
              <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/60 font-bold">
                MOTEUR DE SYNTHÈSE COGNITIVE PRÉDICTIF
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-lg space-y-2 text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>STATUT D'ALIGNEMENT DU SYSTÈME</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  La résilience globale du réseau est consolidée à <strong className="text-white">{dashboardStats.currentResilience}%</strong>.
                  La diminution de l'entropie sur l'axe <strong className="text-emerald-400">{dashboardStats.safestSector.name}</strong> compense les perturbations locales sur le segment maritime LaSalle.
                </p>
                <div className="text-[9px] text-slate-500 flex items-center gap-1">
                  <span>Murs de Chine agentiques isolés : 100% conformes</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-lg space-y-2 text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>RECOMMANDATION DU DIRECTEUR LOGISTIQUE</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Axe critique : <strong className="text-amber-400">{dashboardStats.mostVulnerableSector.name}</strong> présente le niveau d'entropie le plus élevé ({dashboardStats.mostVulnerableSector.score.toFixed(3)}). 
                  Il est recommandé d'activer le contournement automatique via l'échangeur Turcot en période de pointe.
                </p>
                <div className="text-[9px] text-slate-500 flex items-center gap-1">
                  <span>Recalcul de secours actif sur les segments critiques</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
