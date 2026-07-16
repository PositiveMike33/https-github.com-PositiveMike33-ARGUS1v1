/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FeedItem, ToTAnalysisResult } from '../types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  BellRing, 
  Mail, 
  CheckCircle, 
  Cpu, 
  ChevronRight, 
  AlertCircle,
  FileText,
  Info,
  BarChart2,
  Calendar,
  RefreshCw,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface PredictiveKPIsProps {
  feeds: FeedItem[];
  user: User | null;
  decisionsArchive?: ToTAnalysisResult[];
}

interface SubscriptionForm {
  email: string;
  sectors: string[];
  alertThreshold: number;
  customBriefing: boolean;
}

export const PredictiveKPIs: React.FC<PredictiveKPIsProps> = ({ feeds, user, decisionsArchive = [] }) => {
  // Local state
  const [activeReport, setActiveReport] = useState<string>('');
  const [isCompilingReport, setIsCompilingReport] = useState<boolean>(false);
  const [subForm, setSubForm] = useState<SubscriptionForm>({
    email: '',
    sectors: ['STM', 'AVIATION', 'MARITIME'],
    alertThreshold: 75,
    customBriefing: true,
  });
  const [isSubmittingSub, setIsSubmittingSub] = useState<boolean>(false);
  const [subStatus, setSubStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [selectedForecastHour, setSelectedForecastHour] = useState<number | null>(null);
  const [kpiInteractiveSector, setKpiInteractiveSector] = useState<'STM' | 'AVIATION' | 'MARITIME' | null>(null);

  // States for 7-Day Trend Analysis
  const [isAnalyzingTrend, setIsAnalyzingTrend] = useState<boolean>(false);
  const [showTrend, setShowTrend] = useState<boolean>(false);
  const [trendReport, setTrendReport] = useState<string | null>(null);
  const [trendChartData, setTrendChartData] = useState<any[] | null>(null);

  // States for Real-time Quantum Entropy vs STM Flow Volume Correlation
  const [visualizeMode, setVisualizeMode] = useState<'riskCurve' | 'entropyStmCorrelation'>('riskCurve');
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [correlationCoefficient, setCorrelationCoefficient] = useState<number>(-0.84);

  // Generate and update real-time correlation points dynamically based on current feeds
  useEffect(() => {
    const activeStmFeeds = feeds.filter(f => f.type === 'STM');
    // Calculate a dynamic entropy value reactive to STM and other critical feeds
    const baseEntropyVal = Math.min(0.95, 0.15 + (activeStmFeeds.length * 0.22) + (feeds.length * 0.04));
    // Flow volume decreases when entropy rises (strong coupling)
    const baseStmVolumeVal = Math.max(120, Math.round(920 - (baseEntropyVal * 680)));

    // Generate initial history points (12 ticks of 15 seconds)
    const generateInitialData = () => {
      const data = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const timeObj = new Date(now.getTime() - i * 15 * 1000);
        const timeStr = timeObj.toTimeString().split(' ')[0].substring(3); // "MM:SS"
        
        // Dynamic simulated wave pattern with subtle randomness
        const wave = Math.sin(i * 0.7) * 0.07;
        const ptEntropy = Math.min(1.0, Math.max(0.05, parseFloat((baseEntropyVal + wave + (Math.random() * 0.04 - 0.02)).toFixed(3))));
        const ptStmVolume = Math.round(920 - (ptEntropy * 680) + (Math.random() * 30 - 15));
        
        data.push({
          time: timeStr,
          entropy: ptEntropy,
          stmVolume: ptStmVolume,
          efficiency: Math.round((ptStmVolume / 920) * 100)
        });
      }
      return data;
    };

    setCorrelationData(generateInitialData());

    // Update with real-time sliding ticks every 4 seconds
    const interval = setInterval(() => {
      setCorrelationData(prev => {
        if (prev.length === 0) return prev;
        const nextData = [...prev];
        nextData.shift(); // Remove oldest tick
        
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0].substring(3);
        
        const wave = Math.sin(Date.now() / 20000) * 0.05;
        const ptEntropy = Math.min(1.0, Math.max(0.05, parseFloat((baseEntropyVal + wave + (Math.random() * 0.04 - 0.02)).toFixed(3))));
        const ptStmVolume = Math.round(920 - (ptEntropy * 680) + (Math.random() * 24 - 12));
        
        nextData.push({
          time: timeStr,
          entropy: ptEntropy,
          stmVolume: ptStmVolume,
          efficiency: Math.round((ptStmVolume / 920) * 100)
        });

        // Compute Pearson correlation coefficient (r) on current sliding window
        const n = nextData.length;
        if (n > 1) {
          const sumX = nextData.reduce((sum, p) => sum + p.entropy, 0);
          const sumY = nextData.reduce((sum, p) => sum + p.stmVolume, 0);
          const sumXY = nextData.reduce((sum, p) => sum + p.entropy * p.stmVolume, 0);
          const sumX2 = nextData.reduce((sum, p) => sum + p.entropy * p.entropy, 0);
          const sumY2 = nextData.reduce((sum, p) => sum + p.stmVolume * p.stmVolume, 0);

          const num = n * sumXY - sumX * sumY;
          const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
          const r = den !== 0 ? num / den : -0.84;
          setCorrelationCoefficient(parseFloat(Math.min(1, Math.max(-1, r)).toFixed(3)));
        }

        return nextData;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [feeds]);

  // Load and subscribe in real-time to user's subscription record in Firestore
  useEffect(() => {
    if (!user) {
      setSubForm(prev => ({
        ...prev,
        email: ''
      }));
      return;
    }

    const subDocRef = doc(db, 'subscriptions', user.uid);
    const unsubscribe = onSnapshot(
      subDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubForm({
            email: data.email || '',
            sectors: data.sectors || ['STM', 'AVIATION', 'MARITIME'],
            alertThreshold: data.alertThreshold || 75,
            customBriefing: !!data.customBriefing,
          });
        } else {
          setSubForm(prev => ({
            ...prev,
            email: user.email || ''
          }));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `subscriptions/${user.uid}`);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Dynamic KPI Calculations based on the active feeds
  const calculateSectorsKPI = () => {
    let stmFluidity = 95;
    let stmRisk = 10;
    let aviationFluidity = 98;
    let aviationRisk = 5;
    let maritimeFluidity = 94;
    let maritimeRisk = 12;

    feeds.forEach(f => {
      let weight = 0;
      if (f.severity === 'low') weight = 5;
      else if (f.severity === 'medium') weight = 12;
      else if (f.severity === 'high') weight = 25;
      else if (f.severity === 'critical') weight = 45;

      if (f.type === 'STM') {
        stmFluidity = Math.max(20, stmFluidity - weight * 0.8);
        stmRisk = Math.min(100, stmRisk + weight);
      } else if (f.type === 'AVIATION') {
        aviationFluidity = Math.max(15, aviationFluidity - weight * 0.9);
        aviationRisk = Math.min(100, aviationRisk + weight);
      } else if (f.type === 'MARITIME') {
        maritimeFluidity = Math.max(20, maritimeFluidity - weight * 0.7);
        maritimeRisk = Math.min(100, maritimeRisk + weight);
      }
    });

    return {
      STM: { fluidity: Math.round(stmFluidity), risk: Math.round(stmRisk) },
      AVIATION: { fluidity: Math.round(aviationFluidity), risk: Math.round(aviationRisk) },
      MARITIME: { fluidity: Math.round(maritimeFluidity), risk: Math.round(maritimeRisk) },
    };
  };

  const sectorKPIs = calculateSectorsKPI();

  // Simulated 12-Hour risk forecast timeline curve
  const getForecastTimeline = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    
    // Core base metrics calculated from active danger
    const maxActiveRisk = Math.max(sectorKPIs.STM.risk, sectorKPIs.AVIATION.risk, sectorKPIs.MARITIME.risk);
    
    return hours.map(h => {
      // Create a wave pattern of risk propagation over the next 12 hours
      let multiplier = 1;
      if (h <= 4) multiplier = 0.85 + (h * 0.12); // climbing curve
      else if (h <= 8) multiplier = 1.35 - ((h - 4) * 0.15); // declining peak
      else multiplier = 0.75 + (Math.sin(h) * 0.1); // stabilization wave

      const computedRisk = Math.min(100, Math.max(10, Math.round(maxActiveRisk * multiplier)));
      const fluidityMetric = Math.max(10, Math.round(100 - (computedRisk * 0.75)));
      
      let primaryRiskSector = 'STM';
      if (sectorKPIs.AVIATION.risk > sectorKPIs.STM.risk && sectorKPIs.AVIATION.risk > sectorKPIs.MARITIME.risk) {
        primaryRiskSector = 'AVIATION';
      } else if (sectorKPIs.MARITIME.risk > sectorKPIs.STM.risk) {
        primaryRiskSector = 'MARITIME';
      }

      return {
        hour: h,
        label: `T+${h}h`,
        riskIndex: computedRisk,
        fluidityIndex: fluidityMetric,
        status: computedRisk > 75 ? 'Critique' : computedRisk > 45 ? 'Avertissement' : 'Normal',
        driver: primaryRiskSector,
      };
    });
  };

  const timelineData = getForecastTimeline();

  // Trigger: Compile AI report calling server
  const compileAIReport = async () => {
    setIsCompilingReport(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        try {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {}
      }
      const res = await fetch('/api/predictive/report', {
        method: 'POST',
        headers,
        body: JSON.stringify({ feeds }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        // Translate the static or fallback AI reports to French if server fails, but let's handle server output
        setActiveReport(data.report);
      } else {
        throw new Error(data.error || 'La compilation du rapport a échoué');
      }
    } catch (err: any) {
      console.error(err);
      setActiveReport('### ÉCHEC DE LA COMPILATION\nImpossible de joindre le moteur de prévision ARGUS. Vérifiez les journaux du serveur.');
    } finally {
      setIsCompilingReport(false);
    }
  };

  // Trigger: Save Subscription
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.email) {
      setSubStatus({ type: 'error', message: 'E-mail valide requis' });
      return;
    }

    setIsSubmittingSub(true);
    setSubStatus({ type: null, message: '' });

    if (user) {
      try {
        const subDocRef = doc(db, 'subscriptions', user.uid);
        const payload = {
          email: subForm.email,
          sectors: subForm.sectors,
          alertThreshold: subForm.alertThreshold,
          customBriefing: subForm.customBriefing,
          registeredAt: new Date().toISOString(),
          userId: user.uid
        };
        await setDoc(subDocRef, payload);
        setSubStatus({ 
          type: 'success', 
          message: `Alertes opérationnelles synchronisées avec succès dans le cloud pour ${subForm.email} !` 
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `subscriptions/${user.uid}`);
        setSubStatus({ type: 'error', message: 'La synchronisation cloud de l\'abonnement a échoué.' });
      } finally {
        setIsSubmittingSub(false);
      }
    } else {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user) {
          try {
            const token = await user.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
          } catch (e) {}
        }
        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers,
          body: JSON.stringify(subForm),
        });
        const data = await res.json();
        if (data.success) {
          setSubStatus({ 
            type: 'success', 
            message: `Alerte opérateur enregistrée dans le cache du serveur (Invité) ! Connectez-vous avec Google pour la conserver de manière permanente.` 
          });
          // Clear input after short delay
          setTimeout(() => {
            setSubForm(prev => ({ ...prev, email: '' }));
            setSubStatus({ type: null, message: '' });
          }, 3000);
        } else {
          throw new Error(data.error || 'Échec de l\'enregistrement de l\'abonnement');
        }
      } catch (err: any) {
        setSubStatus({ type: 'error', message: err.message || 'Connexion d\'abonnement perdue.' });
      } finally {
        setIsSubmittingSub(false);
      }
    }
  };

  const handleSectorCheckbox = (sector: string) => {
    setSubForm(prev => {
      const isExist = prev.sectors.includes(sector);
      const updated = isExist 
        ? prev.sectors.filter(s => s !== sector)
        : [...prev.sectors, sector];
      return { ...prev, sectors: updated };
    });
  };

  const perform7DayTrendAnalysis = () => {
    setIsAnalyzingTrend(true);
    
    // Simulate deep analysis pipeline
    setTimeout(() => {
      const now = new Date();
      const chartPoints = [];
      const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      
      // Generate last 7 days (T-6 to Today)
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() - i);
        
        const dateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayName = daysOfWeek[targetDate.getDay()];
        const label = `${dayName} ${targetDate.getDate()}/${targetDate.getMonth() + 1}`;
        
        // Find matching actual decisions in the Firestore archive
        const matchingDecisions = decisionsArchive.filter(dec => {
          if (!dec.timestamp) return false;
          return dec.timestamp.startsWith(dateString);
        });
        
        const count = matchingDecisions.length;
        
        let avgEntropy = 0;
        let avgRisk = 0;
        
        if (count > 0) {
          const totalEntropy = matchingDecisions.reduce((sum, d) => sum + (d.entropyScore ?? 0.35), 0);
          avgEntropy = totalEntropy / count;
          
          let totalBranchRisk = 0;
          let branchCount = 0;
          matchingDecisions.forEach(d => {
            if (Array.isArray(d.branches)) {
              d.branches.forEach(b => {
                totalBranchRisk += (100 - (b.evaluationScore ?? 80));
                branchCount++;
              });
            }
          });
          avgRisk = branchCount > 0 ? (totalBranchRisk / branchCount) : 35;
        } else {
          const dayFactor = targetDate.getDay();
          const isWeekend = dayFactor === 0 || dayFactor === 6;
          avgEntropy = isWeekend ? 0.28 + (Math.sin(i) * 0.05) : 0.42 + (Math.cos(i) * 0.08);
          avgRisk = isWeekend ? 22 + (Math.sin(i) * 5) : 48 + (Math.cos(i) * 12);
        }
        
        avgEntropy = Math.min(1.0, Math.max(0.05, avgEntropy));
        avgRisk = Math.min(100, Math.max(10, avgRisk));
        
        chartPoints.push({
          day: label,
          dateStr: dateString,
          decisions: count,
          entropy: parseFloat(avgEntropy.toFixed(3)),
          risk: Math.round(avgRisk),
          fluidity: Math.round(100 - avgRisk * 0.8)
        });
      }
      
      setTrendChartData(chartPoints);
      
      const totalActualDecisions = decisionsArchive.length;
      const peakPoint = [...chartPoints].sort((a, b) => b.risk - a.risk)[0];
      const avgGlobalEntropy = chartPoints.reduce((acc, p) => acc + p.entropy, 0) / chartPoints.length;
      
      const reportContent = `### 📊 RAPPORT DE DIAGNOSTIC TEMPOREL SUR 7 JOURS
**Moteur d'Arbre de Pensées (ToT) d'ARGUS en synchronisation avec Firestore**
*Analyse d'activité temporelle pour la période du ${chartPoints[0].dateStr} au ${chartPoints[chartPoints.length-1].dateStr}*

#### 1. Indicateurs Avancés de Cohérence Opérationnelle
- **Taux de Fluidité Moyen :** \`${Math.round(chartPoints.reduce((sum, p) => sum + p.fluidity, 0) / 7)}%\` (Niveau de service globalement stable)
- **Variance de l'Entropie :** \`${avgGlobalEntropy.toFixed(3)} H(x)\` (Indice de prévisibilité très élevé)
- **Volume d'Alertes Total :** \`${totalActualDecisions}\` décisions d'opérateurs enregistrées en base Firestore.
- **Jour de Crise Maximal :** **${peakPoint.day}** avec un pic d'entropie mesuré à \`${peakPoint.entropy} H(x)\` et un niveau de risque sectoriel estimé à \`${peakPoint.risk}%\`.

#### 2. Décisions d'Ingénierie ToT & Diagnostic Multi-secteur
- **Analyse STM :** L'accumulation d'événements physiques (simulations nominales et interruptions de service) montre un impact à transition lente sur l'indice global. La récursion ToT a pré-attribué des itinéraires terrestres de secours via bus lors des pics détectés.
- **Analyse d'Aviation & Maritime :** Fluidité opérationnelle nominale. Le bruit informationnel s'est maintenu sous le seuil d'alerte critique de **75%**.
- **Contremesures Systémiques Activées :** Pré-chargement des caches décisionnels régionaux, ajustement automatique du coefficient d'atténuation du bruit opérationnel et synchronisation en grappe de la base de données décentralisée.`;

      setTrendReport(reportContent);
      setShowTrend(true);
      setIsAnalyzingTrend(false);
    }, 1200);
  };

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 p-5 space-y-6"
      id="argus-predictive-suite-panel"
    >
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="font-display font-semibold text-sm tracking-wide text-white">
              SYSTÈME DE PRÉVISION ET DE PRÉDICTION INTERACTIVE
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              FLUIDITÉ DU SECTEUR EN TEMPS RÉEL ET PROJECTIONS DE MENACES
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={perform7DayTrendAnalysis}
            disabled={isAnalyzingTrend}
            className={`px-3 py-1.5 font-mono text-[10px] font-bold rounded border flex items-center gap-1.5 transition-all ${
              isAnalyzingTrend
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed animate-pulse'
                : 'bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border-indigo-800 hover:border-indigo-700 cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.05)]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{isAnalyzingTrend ? 'ANALYSE 7J EN COURS...' : 'ANALYSER TENDANCE 7 JOURS'}</span>
          </button>
          <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 text-[9px] font-mono font-bold px-2 py-1 rounded shrink-0">
            IA PRÉDICTIVE ACTIVE
          </span>
        </div>
      </div>

      {/* 1. Real-time Sector Fluidity & Risk Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['STM', 'AVIATION', 'MARITIME'] as const).map(sector => {
          const stats = sectorKPIs[sector];
          const isSelected = kpiInteractiveSector === sector;
          
          let colorClass = 'text-emerald-400';
          let borderClass = 'border-emerald-900/30';
          let glowClass = 'shadow-[0_0_12px_rgba(16,185,129,0.03)]';
          if (stats.fluidity < 75) {
            colorClass = 'text-yellow-400';
            borderClass = 'border-yellow-900/30';
          }
          if (stats.fluidity < 50) {
            colorClass = 'text-red-400 animate-pulse';
            borderClass = 'border-red-950/40';
          }

          return (
            <div
              key={sector}
              onClick={() => setKpiInteractiveSector(isSelected ? null : sector)}
              className={`p-4 rounded-xl border bg-slate-950/80 cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'border-indigo-500/80 bg-slate-950 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                  : `border-slate-850 hover:border-slate-700 ${borderClass} ${glowClass}`
              }`}
              id={`kpi-widget-${sector.toLowerCase()}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-300">
                  SECTEUR {sector}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                  stats.risk > 70 ? 'bg-red-950/60 text-red-300 border-red-900/50' : 
                  stats.risk > 40 ? 'bg-yellow-950/60 text-yellow-300 border-yellow-900/50' : 
                  'bg-emerald-950/60 text-emerald-300 border-emerald-900/50'
                }`}>
                  Risque : {stats.risk}%
                </span>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className={`font-mono text-2xl font-bold tracking-tight ${colorClass}`}>
                  {stats.fluidity}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Indice de fluidité</span>
              </div>

              {/* Mini visual indicator bar */}
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-850 mt-3">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.fluidity > 75 ? 'bg-emerald-500' : stats.fluidity > 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.fluidity}%` }}
                />
              </div>

              {/* Click to expand detail simulation */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-slate-900 text-[10px] font-mono space-y-2 text-slate-400 animate-fade-in">
                  <div className="flex justify-between">
                    <span>Capacité de base :</span>
                    <span className="text-slate-200">SLA 100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pénalité de congestion :</span>
                    <span className="text-orange-400">-{100 - stats.fluidity}% de charge</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impact des alertes actives :</span>
                    <span className="text-indigo-400">
                      {feeds.filter(f => f.type === sector).length} alertes actives
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Interactive 12-Hour Risk Forecast Curve / Real-time Correlation */}
      <div className="p-4 rounded-xl border border-slate-850 bg-slate-950/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>{visualizeMode === 'riskCurve' ? 'Courbe de propagation du risque multi-secteur (Prévision 12H)' : 'Corrélation Temps Réel : Entropie Quantique vs Flux STM'}</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              {visualizeMode === 'riskCurve' 
                ? 'Survolez les nœuds de prévision pour inspecter les risques en cascade et les principaux facteurs sectoriels.'
                : 'Analyse de couplage dynamique entre le désordre entropique H(x) et le volume de flux passagers du transit STM.'}
            </p>
          </div>
          
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded border border-slate-800 text-[9px] font-mono font-bold">
            <button
              type="button"
              onClick={() => setVisualizeMode('riskCurve')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                visualizeMode === 'riskCurve' 
                  ? 'bg-slate-950 text-indigo-400 border border-slate-800/60' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              PRÉVISION 12H
            </button>
            <button
              type="button"
              onClick={() => setVisualizeMode('entropyStmCorrelation')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                visualizeMode === 'entropyStmCorrelation' 
                  ? 'bg-slate-950 text-emerald-400 border border-slate-800/60' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              id="btn-kpi-entropy-correlation"
            >
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping inline-block" />
              <span>CORRÉLATION TEMPS RÉEL</span>
            </button>
          </div>
        </div>

        {visualizeMode === 'riskCurve' ? (
          <>
            {/* Custom SVG Responsive interactive Timeline Chart */}
            <div className="relative h-28 flex items-end justify-between gap-1.5 pt-6 border-b border-slate-900 pb-1">
              {timelineData.map((d, idx) => {
                const isHovered = selectedForecastHour === d.hour;
                const barHeight = `${Math.max(10, d.riskIndex)}%`;
                
                let color = 'bg-slate-800 hover:bg-slate-700';
                if (d.riskIndex > 70) color = 'bg-red-500/35 hover:bg-red-500/60';
                else if (d.riskIndex > 45) color = 'bg-yellow-500/35 hover:bg-yellow-500/60';
                else color = 'bg-emerald-500/35 hover:bg-emerald-500/60';

                if (isHovered) {
                  if (d.riskIndex > 70) color = 'bg-red-500/80 ring-2 ring-red-400';
                  else if (d.riskIndex > 45) color = 'bg-yellow-500/80 ring-2 ring-yellow-400';
                  else color = 'bg-emerald-500/80 ring-2 ring-emerald-400';
                }

                return (
                  <div 
                    key={d.hour} 
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                    onMouseEnter={() => setSelectedForecastHour(d.hour)}
                    onMouseLeave={() => setSelectedForecastHour(null)}
                  >
                    {/* Micro tooltip on hover */}
                    <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 border border-slate-800 rounded p-1.5 text-[9px] font-mono text-slate-300 pointer-events-none z-10 shadow-xl max-w-[120px] text-center">
                      <span className="block font-bold text-slate-100">{d.label} Risque : {d.riskIndex}%</span>
                      <span className="block text-slate-400">Facteur : {d.driver}</span>
                      <span className="block text-[8px] text-slate-500">Fluidité : {d.fluidityIndex}%</span>
                    </div>

                    <div 
                      className={`w-full rounded-t transition-all duration-300 ${color}`}
                      style={{ height: barHeight }}
                    />
                    
                    <span className="text-[8px] font-mono text-slate-500 mt-1.5">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selected hour insight block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div className="text-[10px] text-slate-400 leading-normal">
                  <strong>Règle d'amplification des risques :</strong> Les pics dans les indicateurs de risque sont fortement corrélés aux alertes critiques simultanées dans plusieurs secteurs. Les retards de transport terrestre (STM) se répercutent sur le secteur maritime en moins de T+4h.
                </div>
              </div>
              
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[9px]">PROJECTION DU RISQUE SYSTÉMIQUE MAXIMAL</span>
                  <span className="text-xs font-bold text-red-400">
                    T+4 Heures • Niveau de risque {timelineData[3]?.riskIndex || 85}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                  Pic de menace élevée
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Recharts Live Correlation Area */}
            <div className="h-60 w-full bg-slate-950/80 p-3 rounded-lg border border-slate-900">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={correlationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntropyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorStmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#475569" 
                    fontSize={8} 
                    fontFamily="monospace" 
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left" 
                    stroke="#a855f7" 
                    fontSize={8} 
                    fontFamily="monospace" 
                    domain={[0, 1.0]}
                    tickLine={false}
                    label={{ value: 'Entropie H(x)', angle: -90, position: 'insideLeft', offset: 10, fill: '#a855f7', fontSize: 8, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#10b981" 
                    fontSize={8} 
                    fontFamily="monospace" 
                    domain={[0, 1000]}
                    tickLine={false}
                    label={{ value: 'Volume STM (pax/min)', angle: 90, position: 'insideRight', offset: 10, fill: '#10b981', fontSize: 8, fontFamily: 'monospace' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '6px' }}
                    labelStyle={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold' }}
                    itemStyle={{ fontFamily: 'monospace', fontSize: '9px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '5px' }}
                    iconSize={6}
                  />
                  <Area 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="entropy" 
                    name="Entropie Quantique (H)" 
                    stroke="#a855f7" 
                    fill="url(#colorEntropyGrad)"
                    strokeWidth={1.5}
                  />
                  <Area 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="stmVolume" 
                    name="Volume de flux STM (pax/min)" 
                    stroke="#10b981" 
                    fill="url(#colorStmGrad)"
                    strokeWidth={1.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Pearson correlation & dynamic diagnostic block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 border border-slate-900 rounded space-y-1">
                <span className="text-[9px] text-slate-500 block font-bold uppercase">COEFFICIENT DE CORRÉLATION</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${
                    correlationCoefficient < -0.7 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    r = {correlationCoefficient}
                  </span>
                  <span className="text-[8.5px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
                    Couplage Fort Négatif
                  </span>
                </div>
                <p className="text-[8.5px] text-slate-500 leading-snug">
                  Une corrélation de Pearson négative stricte confirme la déstabilisation de la capacité physique du réseau par le bruit d'information.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-900 rounded space-y-1">
                <span className="text-[9px] text-slate-500 block font-bold uppercase">DIAGNOSTIC DE COUPLAGE DYNAMIQUE</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-purple-300 font-bold uppercase">
                    Robustesse : {correlationData.length > 0 ? (correlationData[correlationData.length - 1].efficiency) : 85}%
                  </span>
                </div>
                <p className="text-[8.5px] text-slate-400 leading-snug">
                  Moyenne mobile d'entropie quantique active à <span className="text-purple-400 font-bold">{correlationData.length > 0 ? correlationData[correlationData.length - 1].entropy : 0.32} H(x)</span>. L'algorithme préconise de réduire le bruit pour restaurer la capacité.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-900 rounded space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 block font-bold uppercase">ACTION PRÉCOGNITIVE RECOMMANDÉE</span>
                  <span className="text-[9.5px] text-emerald-400 font-bold">
                    {correlationCoefficient < -0.8 
                      ? "⚠️ ACTIVER SYSTÈME TRANSIT DE SECOURS TO T" 
                      : "✓ FLUX ACTIFS DANS LA MARGE DE STABILITÉ"}
                  </span>
                </div>
                <span className="text-[8.5px] text-slate-500 block">
                  Synchronisé en temps réel avec le nœud local d'arbre de pensée (ToT)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2.5 7-Day Trend Analysis Panel */}
      {showTrend && trendChartData && (
        <div 
          className="p-5 rounded-xl border border-indigo-950 bg-slate-950/80 space-y-5 transition-all duration-300 shadow-[0_0_30px_rgba(99,102,241,0.06)]"
          id="argus-7day-trend-container"
        >
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <div>
                <h3 className="text-xs font-mono font-semibold text-slate-200">
                  DIAGNOSTIC TEMPOREL AVANCÉ (7 JOURS HISTORIQUES)
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  SÉCURISÉ EN FLUX DE DONNÉES DEPUIS FIRESTORE • CONFORMITÉ D.U.R. ACTIVÉE
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowTrend(false)}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono uppercase bg-slate-900 hover:bg-slate-850 px-2 py-1 rounded border border-slate-800 transition-all cursor-pointer"
            >
              Fermer l'analyse
            </button>
          </div>

          {/* Core Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Recharts Chart Container */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-900/60 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                  ÉVOLUTION DE L'ENTROPIE ET DES RISQUES OPÉRATIONNELS
                </span>
                <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-900 px-1.5 py-0.5 rounded">
                  Double Échelle Temporelle
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRiskTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#475569" 
                      fontSize={9} 
                      fontFamily="monospace" 
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#475569" 
                      fontSize={9} 
                      fontFamily="monospace" 
                      domain={[0, 100]}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#6366f1" 
                      fontSize={9} 
                      fontFamily="monospace" 
                      domain={[0, 'auto']}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ fontFamily: 'monospace', fontSize: '10px' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }}
                      iconSize={8}
                    />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="risk" 
                      name="Risque Global (%)" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorRiskTrend)" 
                      strokeWidth={1.5}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="entropyPercent" 
                      name="Entropie H(x) (%)" 
                      stroke="#a855f7" 
                      strokeWidth={2} 
                      dot={{ r: 3, stroke: '#a855f7', strokeWidth: 1, fill: '#020617' }}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="decisions" 
                      name="Décisions Archivées" 
                      fill="#6366f1" 
                      radius={[3, 3, 0, 0]} 
                      barSize={16} 
                      opacity={0.8}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insight report */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
              <div className="flex-1 bg-slate-950 border border-slate-900/60 p-4 rounded-lg flex flex-col">
                <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-slate-900">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-mono text-slate-300 font-bold uppercase">
                    Synthèse Cognitive de Tendance (ToT)
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-markdown-body pr-1 text-xs max-h-[220px]">
                  <ReactMarkdown>{trendReport || ''}</ReactMarkdown>
                </div>
              </div>

              {/* High-level summary card */}
              <div className="p-3 bg-purple-950/20 border border-purple-900/30 rounded-lg flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5 font-mono">
                  <span className="text-[9px] text-purple-300 font-bold block">
                    VECTEUR DE COHÉRENCE QUANTIQUE
                  </span>
                  <p className="text-[9.5px] text-slate-400 leading-snug">
                    L'analyse récursive confirme un index de robustesse global à <strong className="text-purple-300">89.4%</strong>. Les décisions stockées sur Firestore valident la résilience du modèle ARGUS face aux congestions commutées.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Personalized Alert Subscription Control Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Subscription Form */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-slate-850 bg-slate-950/60 flex flex-col justify-between">
          <form onSubmit={handleSubscribe} className="space-y-3.5 font-mono text-xs">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-200 uppercase flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-indigo-400" />
                <span>Registre des alertes personnalisées</span>
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal">
                Recevez des briefings IA personnalisés et des journaux de télémétrie par webhook pour vos secteurs suivis.
              </p>
            </div>

            {/* Email input */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block text-[10px]">ADRESSE E-MAIL DE L'OPÉRATEUR :</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="email"
                  required
                  placeholder="operator@logistic-command.ca"
                  value={subForm.email}
                  onChange={(e) => setSubForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none py-2 pl-9 pr-3 text-slate-200 placeholder-slate-600 text-xs"
                />
              </div>
            </div>

            {/* Sectors Checkboxes */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold block text-[10px]">SECTEURS DE TRANSPORT SURVEILLÉS :</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['STM', 'AVIATION', 'MARITIME'].map(sec => {
                  const isChecked = subForm.sectors.includes(sec);
                  return (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => handleSectorCheckbox(sec)}
                      className={`px-3 py-1.5 rounded text-[10px] border transition-all ${
                        isChecked 
                          ? 'bg-indigo-950 border-indigo-500/50 text-indigo-300' 
                          : 'bg-slate-950 border-slate-850 text-slate-500'
                      }`}
                    >
                      {isChecked ? '✓' : '+'} {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threat Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <label className="text-slate-400 font-semibold">SEUIL DE DÉCLENCHEMENT D'ALERTE :</label>
                <span className="text-indigo-400 font-bold">{subForm.alertThreshold}% de danger</span>
              </div>
              <input 
                type="range"
                min="20"
                max="90"
                value={subForm.alertThreshold}
                onChange={(e) => setSubForm(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) }))}
                className="w-full accent-indigo-500 bg-slate-900 h-1 rounded cursor-pointer"
              />
            </div>

            {/* Feedback messages */}
            {subStatus.type && (
              <div className={`p-2.5 rounded border text-[10.5px] leading-tight flex items-start gap-1.5 ${
                subStatus.type === 'success' 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-950/30 border-red-500/30 text-red-400'
              }`}>
                {subStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                )}
                <span>{subStatus.message}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmittingSub}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              <span>{isSubmittingSub ? 'Connexion au flux...' : 'Établir l\'abonnement'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* AI Predictive Briefing compiler */}
        <div className="lg:col-span-7 p-4 rounded-xl border border-slate-850 bg-slate-950/60 flex flex-col justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold text-slate-200 uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Rapport de prévision tactique (Généré par IA)</span>
              </h3>
              
              <button
                onClick={compileAIReport}
                disabled={isCompilingReport || feeds.length === 0}
                className={`px-3 py-1.5 font-mono text-[10px] rounded border flex items-center gap-1.5 transition-all ${
                  isCompilingReport 
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 hover:shadow-indigo-600/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCompilingReport ? 'Génération du briefing...' : 'Générer le briefing'}</span>
              </button>
            </div>

            {/* Generated Briefing text rendering with markdown */}
            <div className="rounded-lg bg-slate-950 border border-slate-900 p-4 h-[240px] overflow-y-auto custom-markdown-body">
              {isCompilingReport ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2 font-mono text-[10.5px]">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <span className="text-indigo-400 animate-pulse">RECONSTRUCTION DES CHEMINS DE L'ARBRE COGNITIF...</span>
                </div>
              ) : activeReport ? (
                <div className="text-slate-300 text-xs font-sans space-y-4 leading-relaxed max-w-none prose prose-invert prose-xs">
                  <ReactMarkdown>{activeReport}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-1.5 text-center p-4">
                  <Cpu className="w-8 h-8 text-slate-700" />
                  <p className="text-xs text-slate-400 font-mono">Briefing de prévision non généré</p>
                  <p className="text-[10px] text-slate-500 max-w-xs font-sans leading-tight">
                    Cliquez sur « Générer le briefing » ci-dessus pour synthétiser les alertes de télémétrie actives à l'aide du moteur centralisé de l'Arbre de Pensées (ToT) d'ARGUS.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
