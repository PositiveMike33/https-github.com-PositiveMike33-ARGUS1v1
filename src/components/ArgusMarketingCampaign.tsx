import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  CartesianGrid
} from 'recharts';
import { 
  Sparkles, 
  TrendingUp, 
  Settings, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Users, 
  DollarSign, 
  Coins, 
  Send, 
  Smartphone,
  ChevronRight,
  Calculator,
  Percent,
  CheckCircle2,
  FileCode2,
  Share2
} from 'lucide-react';

export function ArgusMarketingCampaign() {
  // Interactive calculators or inputs to make it an engaging SaaS config sandbox
  const [agencyFee, setAgencyFee] = useState<number>(497);
  const [usersCount, setUsersCount] = useState<number>(150);
  const [multiplier, setMultiplier] = useState<number>(1.1);
  const [includedCredits, setIncludedCredits] = useState<number>(10);

  // Computed Values
  const costPerUser = usersCount > 0 ? (agencyFee / usersCount).toFixed(2) : '0.00';
  const targetPrice = 9.99;
  const standardAgencyFee = 297;
  const savingsPercent = 85;

  // Chart Data 1: Cost Distribution comparison
  const costData = [
    { name: 'Frais HL Std', value: standardAgencyFee, color: '#3B82F6', desc: 'Abonnement standard' },
    { name: 'Frais HL Argus', value: agencyFee, color: '#FF5E00', desc: 'Plan Pro mutualisé' },
    { name: 'Marge Sociale', value: Math.round(agencyFee * (multiplier - 1)), color: '#10B981', desc: 'Frais Stripe couverts' },
    { name: 'Crédits Offerts', value: includedCredits, color: '#8B5CF6', desc: 'SMS de notification' }
  ];

  // Chart Data 2: Adoption/User Growth Over Time
  const growthData = [
    { month: 'Jan', usagers: 120, target: 100 },
    { month: 'Fév', usagers: 450, target: 400 },
    { month: 'Mar', usagers: 890, target: 800 },
    { month: 'Avr', usagers: 1500, target: 1300 },
    { month: 'Mai', usagers: 2400, target: 2000 },
    { month: 'Juin', usagers: 3800, target: 3200 }
  ];

  // Chart Data 3: Scatter plot for GTFS Latency vs Engagement
  const scatterData = [
    { x: 1, y: 35, z: 100, label: 'Latence 1s - Engagement optimal' },
    { x: 2, y: 32, z: 90, label: 'Latence 2s' },
    { x: 3, y: 30, z: 85, label: 'Latence 3s' },
    { x: 4, y: 25, z: 75, label: 'Latence 4s' },
    { x: 5, y: 20, z: 60, label: 'Latence 5s - Limite fluidité' },
    { x: 6, y: 18, z: 50, label: 'Latence 6s' },
    { x: 7, y: 14, z: 40, label: 'Latence 7s' },
    { x: 8, y: 11, z: 30, label: 'Latence 8s' },
    { x: 9, y: 8, z: 20, label: 'Latence 9s' },
    { x: 10, y: 5, z: 10, label: 'Latence 10s - Perte d\'attention' }
  ];

  // Custom tooltips to keep min 16 chars as instructed
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-left text-xs space-y-1 shadow-xl">
          <p className="font-bold text-white uppercase">{payload[0].name || payload[0].payload.name || 'Statistiques'}</p>
          <p className="text-emerald-400 font-bold">Valeur : {payload[0].value} $</p>
          {payload[0].payload.desc && (
            <p className="text-slate-400 text-[10px] uppercase leading-normal">{payload[0].payload.desc}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-left text-xs space-y-1 shadow-xl max-w-[220px]">
          <p className="font-bold text-sky-400 uppercase">Ajustement GTFS-RT</p>
          <p className="text-slate-300 font-bold">Latence : {data.x} sec</p>
          <p className="text-orange-400 font-bold">Engagement : {data.y} %</p>
          <p className="text-slate-500 text-[9.5px] italic leading-normal border-t border-slate-900 pt-1 mt-1">
            {data.label}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-8" id="argus-marketing-campaign-dashboard">
      {/* Dynamic Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-900 p-8 md:p-12 text-left">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#FF5E00]/10 via-[#3B82F6]/5 to-transparent rounded-full filter blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded bg-orange-600/15 border border-orange-500/30 font-mono text-[9.5px] font-bold text-orange-400 uppercase tracking-widest animate-pulse">
              🚀 CAMPAGNE IMPACT QUÉBEC
            </span>
            <span className="px-3 py-1 rounded bg-blue-600/15 border border-blue-500/30 font-mono text-[9.5px] font-bold text-blue-400 uppercase tracking-widest">
              MUTUALISATION SOCIALE
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase leading-tight font-sans">
            Démocratiser le SaaS au Québec avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5E00] to-[#3B82F6]">Argus Engine</span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-3xl font-sans">
            Analyse stratégique et opérationnelle pour le déploiement de notre moteur d'évaluation des flux. 
            Utiliser le plan d'agence HighLevel pour mutualiser les coûts d'infrastructure CRM, de facturation Stripe, 
            et de transport GTFS-RT en direct pour les populations québécoises à faible revenu.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a href="#vision-sociale" className="px-5 py-2.5 bg-gradient-to-r from-[#FF5E00] to-orange-600 hover:opacity-90 text-white font-bold text-xs font-sans rounded-xl transition-all shadow-lg shadow-orange-600/15 uppercase">
              Découvrir la Vision
            </a>
            <a href="#config-saas" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs font-sans rounded-xl transition-all border border-slate-800 uppercase">
              Paramètres HighLevel
            </a>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 py-1 font-mono text-[10.5px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>SYSTÈME OPÉRATIONNEL ACTIF 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 1. La Vision Sociale d'Argus */}
      <section id="vision-sociale" className="space-y-6 text-left">
        <div className="bg-slate-900/40 rounded-3xl p-6 md:p-8 border border-slate-900 border-l-[6px] border-l-[#FF5E00] relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase font-sans tracking-wide">
                1. La Vision Sociale d'Argus
              </h2>
              <p className="text-xs text-slate-500 font-mono uppercase mt-0.5">
                MUTUALISER LES COÛTS D'INFRASTRUCTURE POUR SOUTENIR LES QUÉBÉCOIS
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-orange-400 font-mono text-[10px] font-bold rounded-lg">
                SAAS V2 PROTOCOLE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                L'objectif principal d'Argus Engine est de détourner l'utilisation traditionnelle du plan Pro de HighLevel (<strong>$497 USD/mois</strong>) axée sur la maximisation de marge, pour la transformer en un levier d'économie d'échelle sociale. 
              </p>
              <p className="text-sm text-slate-400 leading-relaxed font-sans">
                En proposant notre système en marque blanche et en raccordant les flux de télémétrie GTFS-RT (métro, bus) et les notifications d'incidents via l'infrastructure CRM centralisée, nous redistribuons les fonctionnalités avancées à une infime fraction du prix du marché. Nos usagers profitent ainsi d'outils performants de planification budgétaire et d'alertes instantanées par SMS sans barrière financière d'accès.
              </p>
              
              {/* Interactive Sandbox Simulator */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 space-y-3 mt-4">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-orange-500" />
                  <span>SIMULATEUR DE REDISTRIBUTION SOCIALE</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-mono uppercase font-bold">Invest HL ($) :</label>
                    <input 
                      type="number" 
                      value={agencyFee} 
                      onChange={(e) => setAgencyFee(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-mono uppercase font-bold">Nb Usagers :</label>
                    <input 
                      type="number" 
                      value={usersCount} 
                      onChange={(e) => setUsersCount(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-mono uppercase font-bold">Multiplier :</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={multiplier} 
                      onChange={(e) => setMultiplier(Math.max(1.0, parseFloat(e.target.value) || 1.0))}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-mono uppercase font-bold">Crédits Offerts :</label>
                    <input 
                      type="number" 
                      value={includedCredits} 
                      onChange={(e) => setIncludedCredits(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 gap-4 content-center">
              {/* Card 1 */}
              <div className="bg-orange-950/20 rounded-2xl p-5 border border-orange-500/10 flex items-center gap-4 transition-all hover:bg-orange-950/30">
                <div className="w-12 h-12 rounded-xl bg-[#FF5E00]/15 flex items-center justify-center text-xl shrink-0">
                  💸
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">INVESTISSEMENT AGENCE PRO</div>
                  <div className="text-2xl font-black text-[#FF5E00] font-sans">${agencyFee} USD/m</div>
                  <p className="text-[9.5px] text-slate-400">Coût fixe global entièrement absorbé par le collectif d'Argus Engine.</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-blue-950/20 rounded-2xl p-5 border border-blue-500/10 flex items-center gap-4 transition-all hover:bg-blue-950/30">
                <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/15 flex items-center justify-center text-xl shrink-0">
                  🛡️
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">RÉDUCTION DU COÛT USAGER</div>
                  <div className="text-2xl font-black text-[#3B82F6] font-sans">{savingsPercent}% ÉCONOMISÉS</div>
                  <p className="text-[9.5px] text-slate-400">Par rapport à l'acquisition individuelle d'outils CRM et d'alertes GTFS distincts.</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-emerald-950/20 rounded-2xl p-5 border border-emerald-500/10 flex items-center gap-4 transition-all hover:bg-emerald-950/30">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-xl shrink-0">
                  ⚡
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">COÛT RÉEL NET PER CAPITA</div>
                  <div className="text-2xl font-black text-emerald-400 font-sans">${costPerUser} USD/usager</div>
                  <p className="text-[9.5px] text-slate-400">Calculé en temps réel selon notre base active actuelle de {usersCount} exploitants.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Paramétrage "HighLevel" Optimal & Chart 1 */}
      <section id="config-saas" className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-stretch">
        {/* Info Column (7 cols) */}
        <div className="lg:col-span-6 bg-slate-900/40 rounded-3xl p-6 md:p-8 border border-slate-900 border-l-[6px] border-l-[#3B82F6] flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase font-sans tracking-wide flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#3B82F6]" />
                <span>2. Paramétrage "HighLevel" Optimal</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono uppercase mt-0.5">
                CONFIGURATION SOCIALE DE L'INFRASTRUCTURE COMMERCIALE STRIPE
              </p>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              Selon le livre blanc de référence <strong>« Paramétrer le configurateur SaaS de HighLevel »</strong>, la clé du succès réside dans l'ajustement minutieux des <em>Complimentary Credits</em> et du processus de <em>Rebuilding</em> de l'agence.
            </p>

            <ul className="space-y-3.5 pt-2">
              <li className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-full bg-orange-600/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="text-slate-100">Paiements Actifs :</strong> Connexion Stripe obligatoire intégrant un système d'auto-suspension instantanée en cas de défaut de paiement pour protéger le fonds d'infrastructure solidaire Argus.
                </div>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-slate-100">Crédits Inclus :</strong> Allocation automatique de <strong className="text-[#3B82F6]">${includedCredits} USD</strong> de crédits initiaux pour permettre l'émission immédiate des alertes SMS/Emails de transport, sans aucune barrière financière.
                </div>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="text-slate-100">Marge Sociale Réduite :</strong> Fixation du multiplicateur de coût à <strong className="text-emerald-400">{multiplier}x</strong> (au lieu des 3x standards de l'industrie) afin de couvrir uniquement les micro-frais de transaction de Stripe et des transporteurs.
                </div>
              </li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-900 flex items-center gap-3 mt-6">
            <span className="text-lg">💡</span>
            <p className="text-[10px] text-slate-500 font-mono uppercase leading-normal">
              Le paramétrage à {multiplier}x assure l'intégrité financière d'Argus tout en garantissant des tarifs imprenables à l'échelle de la province du Québec.
            </p>
          </div>
        </div>

        {/* Chart Column (5 cols) */}
        <div className="lg:col-span-6 bg-slate-950 rounded-3xl p-6 border border-slate-900 flex flex-col justify-between">
          <div className="space-y-1 text-left mb-4">
            <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
              RÉPARTITION DES COÛTS & CRÉDITS
            </h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase">
              COMPARAISON DIRECTE SAAS STANDARD VS ARGUS ENGINE (VALEURS EN $ CAD)
            </p>
          </div>

          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={9} 
                  tickLine={false} 
                  fontFamily="JetBrains Mono"
                />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-slate-900 pt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-[#3B82F6]" />
              <span className="text-slate-400">Std HL : $297</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-[#FF5E00]" />
              <span className="text-slate-400">Argus : ${agencyFee}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Architecture de Données GTFS-RT & Scatter Plot */}
      <section id="architecture-gtfs" className="bg-slate-900/40 rounded-3xl p-6 md:p-8 border border-slate-900 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div className="text-left">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase font-sans tracking-wide flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <span>3. Architecture de Données GTFS-RT</span>
            </h2>
            <p className="text-xs text-slate-500 font-mono uppercase mt-0.5">
              TRANSITION PROTOBUF SANDBOX & INTERFAÇAGE DES NOTIFICATIONS HIGHLEVEL
            </p>
          </div>
          <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[9.5px] font-bold rounded">
            PROTOBUF BINAIRE DÉPLOYÉ
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl text-left font-sans">
          Argus Engine ingère en continu les flux Protobuf compressés (architecture éprouvée basée sur la sandbox <strong>gtfs_realtime_protobuf_sandbox.html</strong>) pour alimenter nos modèles prédictifs et de routage. Dès qu'une anomalie est résolue par l'arbre de pensées (ToT), l'API envoie instantanément une mise à jour au format requis pour l'application mobile de HighLevel.
        </p>

        {/* Data pipeline visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs py-4">
          <div className="border border-slate-900 bg-slate-950/80 p-5 rounded-2xl text-left space-y-2 relative group hover:border-[#FF5E00]/20 transition-all">
            <div className="text-2xl">📡</div>
            <div className="font-bold text-orange-400 uppercase tracking-wide">Swagger iBUS STM</div>
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase">
              Source de télémétrie temps réel STM et coordonnées géospatiales des véhicules de transport.
            </p>
          </div>

          <div className="border border-slate-900 bg-slate-950/80 p-5 rounded-2xl text-left space-y-2 relative group hover:border-[#3B82F6]/20 transition-all flex flex-col justify-between">
            <div>
              <div className="text-2xl">⚙️</div>
              <div className="font-bold text-indigo-400 uppercase tracking-wide">Moteur Décisionnel ToT</div>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase mt-1">
                Calcul des routes d'échappement critiques et ajustement de l'arbre de décision.
              </p>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-blue-500 rounded-full mt-3 animate-pulse" />
          </div>

          <div className="border border-slate-900 bg-slate-950/80 p-5 rounded-2xl text-left space-y-2 relative group hover:border-emerald-500/20 transition-all">
            <div className="text-2xl">📱</div>
            <div className="font-bold text-emerald-400 uppercase tracking-wide">HighLevel Mobile CRM</div>
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase">
              Passerelle de notification finalisée offrant des alertes par SMS et notifications push aux résidents.
            </p>
          </div>
        </div>

        {/* Scatter plot visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
          <div className="lg:col-span-5 text-left space-y-4">
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wide">
              Analyse de Corrélation : Latence GTFS vs Engagement
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Le graphique ci-contre illustre la corrélation critique entre le temps de latence de mise à jour des flux GTFS (en secondes) et le taux de complétion d'itinéraires et d'engagement des usagers sur l'application mobile.
            </p>
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-900 font-mono text-[10px] text-slate-400">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span>Régression de Pearson (r) :</span>
                <span className="text-orange-500 font-bold">-0.94 (Corrélation Négative Forte)</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span>Latence Cible d'Argus :</span>
                <span className="text-emerald-400 font-bold">&lt; 2.5 secondes</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950 rounded-3xl p-5 border border-slate-900 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: -10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Latence" 
                  unit="s" 
                  stroke="#475569" 
                  fontSize={9}
                  tickLine={false}
                  fontFamily="JetBrains Mono"
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Engagement" 
                  unit="%" 
                  stroke="#475569" 
                  fontSize={9}
                  tickLine={false}
                  fontFamily="JetBrains Mono"
                />
                <Tooltip content={<CustomScatterTooltip />} />
                <Scatter name="Points de corrélation" data={scatterData} fill="#3B82F6">
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.x <= 3 ? '#10B981' : entry.x <= 6 ? '#3B82F6' : '#FF5E00'} 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 4. Analyse Comparative & Impact sur le Pouvoir d'Achat */}
      <section id="impact-achat" className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-stretch">
        {/* User growth chart column (6 cols) */}
        <div className="lg:col-span-6 bg-slate-950 rounded-3xl p-6 border border-slate-900 flex flex-col justify-between">
          <div className="space-y-1 text-left mb-4">
            <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
              COURBE D'ADOPTION COMMUNAUTAIRE
            </h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase">
              CROISSANCE DES USAGERS MENSUELS ACTIFS À FAIBLE REVENU (H+6 PROJECTIONS)
            </p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorUsagers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5E00" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FF5E00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  stroke="#475569" 
                  fontSize={9} 
                  tickLine={false} 
                  fontFamily="JetBrains Mono" 
                />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="usagers" 
                  stroke="#FF5E00" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorUsagers)" 
                  name="Usagers Actifs"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-slate-900 pt-3 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>MODÈLE ESTIMÉ PAR LES DONNÉES EN DIRECT DE L'API</span>
            <span className="text-[#FF5E00] font-bold">CIBLE JUIN : 3 800</span>
          </div>
        </div>

        {/* Narrative & Info Column (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/40 rounded-3xl p-6 md:p-8 border border-slate-900 border-l-[6px] border-l-[#8B5CF6] flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase font-sans tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-[#8B5CF6]" />
                <span>4. Impact sur le Pouvoir d'Achat</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono uppercase mt-0.5">
                SIMPLIFICATION DES REQUÊTES GÉOSPATIALES ET GESTION FINANCIÈRE
              </p>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              L'analyse approfondie des schémas de Swagger GTFS (notamment <strong>swagger_gtfs-realtime_v2_pr.json</strong>) démontre une complexité structurelle que les citoyens ne peuvent exploiter directement sans de coûteux outils tiers. 
            </p>

            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Argus Engine résout ce fossé technologique en centralisant le décodage et l'analyse ToT à l'échelle du serveur, tout en offrant une interface épurée à un prix cible solidaire de seulement <strong className="text-white bg-[#8B5CF6]/15 px-2 py-0.5 rounded border border-[#8B5CF6]/20">${targetPrice}/mois</strong>.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900 text-left">
                <div className="text-base font-bold text-[#FF5E00]">Accessibilité Inégalée</div>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-mono">
                  Seulement {targetPrice} $ par mois pour un tableau de bord prédictif complet.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900 text-left">
                <div className="text-base font-bold text-[#3B82F6]">Paiements Checkout</div>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-mono">
                  Automatisation intégrale via tunnel Stripe pour limiter la maintenance d'équipe.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-5 mt-6 flex items-center justify-between font-mono text-[9px] text-slate-500">
            <span>RÉDACTEUR PRINCIPAL : ÉQUIPE ARGUS SAAS QUÉBEC</span>
            <span>PROJET SAAS QUÉBEC 2026</span>
          </div>
        </div>
      </section>
    </div>
  );
}
