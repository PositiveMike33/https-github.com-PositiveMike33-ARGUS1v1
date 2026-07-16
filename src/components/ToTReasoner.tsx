/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ToTAnalysisResult } from '../types';
import { jsPDF } from 'jspdf';
import { BranchEntropyD3Chart } from './BranchEntropyD3Chart';
import { ToTRiskMiniMap } from './ToTRiskMiniMap';
import * as d3 from 'd3';
import { 
  GitBranch, 
  Cpu, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  Flame, 
  TrendingDown,
  Camera,
  FileDown,
  Download,
  AlertTriangle,
  Sliders,
  Map,
  Layers,
  ShieldAlert,
  List,
  Percent
} from 'lucide-react';

interface ToTReasonerProps {
  result: ToTAnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyze: (weights?: { transit: number; safety: number; uncertainty: number }) => void;
  onClear: () => void;
  archive: ToTAnalysisResult[];
  selectedModel: string;
  onUpdateSelectedModel: (model: string) => void;
  analysisError: string | null;
  onClearError: () => void;
  isMockMode: boolean;
  onToggleMockMode: (val: boolean) => void;
}

export const ToTReasoner: React.FC<ToTReasonerProps> = ({
  result,
  isAnalyzing,
  onAnalyze,
  onClear,
  archive,
  selectedModel,
  onUpdateSelectedModel,
  analysisError,
  onClearError,
  isMockMode,
  onToggleMockMode,
}) => {
  const [recursiveStep, setRecursiveStep] = useState<number>(0);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refinementHistory, setRefinementHistory] = useState<{ step: number; entropy: number }[]>([]);

  // Backtracking states & synchronization
  const [backtrackedBranches, setBacktrackedBranches] = useState<string[]>([]);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'branches' | 'agents' | 'riskSummary'>('branches');

  const activeAgent = useMemo(() => {
    if (!result) return null;
    if (result.specializedAgent) return result.specializedAgent;
    
    // Generate appropriate default if missing (backward compatibility)
    if (result.feedType === 'STM') {
      return {
        name: "Sentinelle Transit",
        codename: "SENTINELLE-TRANSIT" as const,
        status: "OPTIMIZED" as const,
        interpretation: "Analyse active du métro de Montréal. Les sous-stations d'alimentation de Berri-UQAM montrent une charge thermique de 88% sous forte demande commuter, requérant un rechargement d'équilibre.",
        confidenceScore: 98,
        metrics: [
          { label: "Charge sous-station", value: "88% (Capacité crête)", status: "ALERT" as const },
          { label: "Intervalle inter-rames", value: "4.2 min (Stable)", status: "NORMAL" as const },
          { label: "Régulation thermique rails", value: "34.5°C (Sous contrôle)", status: "NORMAL" as const }
        ],
        contributionToToT: "Recommandation d'optimisation préventive de la ventilation tunnel et d'espacement de rames à Berri-UQAM pour éviter la dégradation thermique."
      };
    } else if (result.feedType === 'AVIATION') {
      return {
        name: "Aéro-Vigil",
        codename: "AERO-VIGIL" as const,
        status: "MONITORING" as const,
        interpretation: "Surveillance active de l'espace aérien CYUL. Interférences électromagnétiques atypiques sur le canal L1 (GPS) avec dérives géospatiales de navigation isolées.",
        confidenceScore: 95,
        metrics: [
          { label: "Brouillage bande L1", value: "+14 dB (Fort bruit)", status: "CRITICAL" as const },
          { label: "Flotte INS redondante", value: "100% active", status: "NORMAL" as const },
          { label: "Dérive moyenne estimée", value: "185m", status: "ALERT" as const }
        ],
        contributionToToT: "Augmentation de l'incertitude ToT à 40% pour forcer le basculement automatique sur le positionnement inertiel INS."
      };
    } else if (result.feedType === 'MARITIME') {
      return {
        name: "Aqua-Garde",
        codename: "AQUA-GARDE" as const,
        status: "MONITORING" as const,
        interpretation: "Analyse hydrographique du corridor fluvial LaSalle (Saint-Laurent). Hauteur de marée de -0.4m sous la normale, restreignant les tirants d'eau navigables.",
        confidenceScore: 96,
        metrics: [
          { label: "Niveau marée LaSalle", value: "-0.4m (Critique)", status: "ALERT" as const },
          { label: "Tirant d'eau limite", value: "11.2m", status: "ALERT" as const },
          { label: "Vitesse d'écoulement", value: "3.4 noeuds", status: "NORMAL" as const }
        ],
        contributionToToT: "Calcul de l'éligibilité des navires post-Panamax à l'allègement de cargaison et déviation vers le fret ferroviaire LaSalle."
      };
    } else {
      return {
        name: "Scout Omni-Vision",
        codename: "OMNI-VISION" as const,
        status: "ACTIVE" as const,
        interpretation: "Analyse de flux vidéo d'échangeur Turcot. Analyse optique en temps réel détectant des anomalies de pixels de haute température.",
        confidenceScore: 97,
        metrics: [
          { label: "Densité pixels fumée", value: "12% de la détection", status: "ALERT" as const },
          { label: "Température carter (IR)", value: "82°C (Stable)", status: "NORMAL" as const },
          { label: "Conformité de voie", value: "98.2%", status: "NORMAL" as const }
        ],
        contributionToToT: "Triangulation et confirmation visuelle immédiate pour guider l'unité de patrouille MTQ de Turcot."
      };
    }
  }, [result]);

  // Modal state for Quantum Entropy Details
  const [selectedModalBranch, setSelectedModalBranch] = useState<any | null>(null);
  const [decoherenceTime, setDecoherenceTime] = useState<number>(0.0); // 0 to 2
  const [quantumCoupling, setQuantumCoupling] = useState<number>(1.0); // scale factor

  const openQuantumModal = (branch: any) => {
    setSelectedModalBranch(branch);
    setDecoherenceTime(0.0);
    setQuantumCoupling(1.0);
  };

  const quantumCalculations = useMemo(() => {
    if (!selectedModalBranch) return null;

    // 1. Normalization of evaluationScore (threat level)
    const p = Math.max(0.001, Math.min(0.999, selectedModalBranch.evaluationScore / 100));

    // 2. Base coherence representing uncertainty/noise
    const baseCoherence = (selectedModalBranch.uncertainty / 100) * Math.sqrt(p * (1 - p)) * quantumCoupling;

    // 3. Decoherence over time: delta(t) = baseCoherence * exp(-t)
    const delta = baseCoherence * Math.exp(-decoherenceTime);

    // 4. Density Matrix rho:
    // [   p     delta ]
    // [ delta   1-p   ]
    const det = p * (1 - p) - delta * delta;

    // 5. Eigenvalues lambda_1, lambda_2 of rho:
    const discriminant = Math.max(0, 1 - 4 * det);
    const lambda1 = (1 + Math.sqrt(discriminant)) / 2;
    const lambda2 = (1 - Math.sqrt(discriminant)) / 2;

    // 6. Von Neumann Entropy: S = - (lambda1 * log2(lambda1) + lambda2 * log2(lambda2))
    const log2 = (x: number) => (x > 0.00001 ? Math.log2(x) : 0);
    const vonNeumannEntropy = -(lambda1 * log2(lambda1) + lambda2 * log2(lambda2));

    // 7. Purity: Tr(rho^2) = lambda1^2 + lambda2^2
    const purity = lambda1 * lambda1 + lambda2 * lambda2;

    // 8. Quantum Coherence Measure
    const quantumCoherenceMeasure = delta * delta * 4;

    return {
      p,
      baseCoherence,
      delta,
      det,
      lambda1,
      lambda2,
      vonNeumannEntropy,
      purity,
      quantumCoherenceMeasure,
    };
  }, [selectedModalBranch, decoherenceTime, quantumCoupling]);

  // Reset backtracked branches and active view when a new result loaded
  if (result && result.id !== currentResultId) {
    setCurrentResultId(result.id);
    setBacktrackedBranches([]);
    setActiveView('branches');
  }

  // Calculate the weighted global criticality score reactive to D3 backtrack clicks!
  const { weightedGlobalScore, totalWeight } = useMemo(() => {
    if (!result || !result.branches || result.branches.length === 0) {
      return { weightedGlobalScore: 0, totalWeight: 0 };
    }
    
    // Exclude backtracked branches to represent current selected state
    const activeBranches = result.branches.filter(
      (b, idx) => !backtrackedBranches.includes(b.id || `b-${idx}`)
    );

    if (activeBranches.length === 0) {
      return { weightedGlobalScore: 0, totalWeight: 0 };
    }

    let weightedSum = 0;
    let totalW = 0;

    activeBranches.forEach((b) => {
      // Weight is inversely related to uncertainty (higher uncertainty = lower weight)
      // certainty weight = 101 - uncertainty
      const weight = 101 - b.uncertainty;
      weightedSum += b.evaluationScore * weight;
      totalW += weight;
    });

    const score = totalW > 0 ? parseFloat((weightedSum / totalW).toFixed(2)) : 0;
    return { weightedGlobalScore: score, totalWeight: totalW };
  }, [result, backtrackedBranches]);

  // Tree node interface
  interface TreeNode {
    id: string;
    name: string;
    type: 'root' | 'branch' | 'lookahead' | 'critique' | 'recommendation';
    score?: number;
    uncertainty?: number;
    backtracked?: boolean;
    children?: TreeNode[];
    branchId?: string;
  }

  // Build tree data structure for D3 layout
  const treeData = useMemo<TreeNode | null>(() => {
    if (!result) return null;
    
    return {
      id: 'root',
      name: result.feedTitle.length > 25 ? `${result.feedTitle.substring(0, 25)}...` : result.feedTitle,
      type: 'root',
      children: result.branches.map((b, idx) => {
        const bId = b.id || `b-${idx}`;
        const isB = backtrackedBranches.includes(bId);
        return {
          id: bId,
          branchId: bId,
          name: `Branche B-0${idx + 1}`,
          type: 'branch',
          score: b.evaluationScore,
          uncertainty: b.uncertainty,
          backtracked: isB,
          children: [
            {
              id: `${bId}-lookahead`,
              branchId: bId,
              name: 'Lookahead',
              type: 'lookahead',
              backtracked: isB,
              children: [
                {
                  id: `${bId}-critique`,
                  branchId: bId,
                  name: `Critique (${b.evaluationScore >= 70 ? 'CIBLE' : 'NOMIN' })`,
                  type: 'critique',
                  backtracked: isB,
                  children: [
                    {
                      id: `${bId}-reco`,
                      branchId: bId,
                      name: b.recommendation.length > 15 ? `${b.recommendation.substring(0, 15)}...` : b.recommendation,
                      type: 'recommendation',
                      backtracked: isB,
                    }
                  ]
                }
              ]
            }
          ]
        };
      })
    };
  }, [result, backtrackedBranches]);

  // Compute D3 Tree positions
  const d3Tree = useMemo(() => {
    if (!treeData) return null;
    const d3Root = d3.hierarchy<TreeNode>(treeData);
    const treeLayout = d3.tree<TreeNode>().size([155, 230]);
    return treeLayout(d3Root);
  }, [treeData]);

  const handleNodeClick = (branchId?: string) => {
    if (!branchId) return;
    setBacktrackedBranches(prev => {
      if (prev.includes(branchId)) {
        return prev.filter(id => id !== branchId);
      } else {
        return [...prev, branchId];
      }
    });
  };

  // Entropy weighting factor states (default weights: transit: 0.5, safety: 0.5, uncertainty: 0.3)
  const [transitWeight, setTransitWeight] = useState<number>(0.5);
  const [safetyWeight, setSafetyWeight] = useState<number>(0.5);
  const [uncertaintyWeight, setUncertaintyWeight] = useState<number>(0.3);

  // Function to simulate recursive self-correction / refinement
  const runSelfCorrection = () => {
    if (!result || isRefining) return;
    setIsRefining(true);
    setRecursiveStep(1);
    
    const initialEntropy = result.entropyScore;
    const history = [{ step: 0, entropy: initialEntropy }];
    setRefinementHistory(history);

    // Simulated multi-step recursion lowering entropy
    setTimeout(() => {
      const step1Entropy = parseFloat((initialEntropy * 0.65).toFixed(4));
      setRecursiveStep(2);
      setRefinementHistory(prev => [...prev, { step: 1, entropy: step1Entropy }]);
      
      setTimeout(() => {
        const step2Entropy = parseFloat((initialEntropy * 0.25).toFixed(4));
        setRecursiveStep(3);
        setRefinementHistory(prev => [...prev, { step: 2, entropy: step2Entropy }]);
        setIsRefining(false);
      }, 1000);
    }, 1000);
  };

  const getEntropyColor = (score: number) => {
    if (score < 0.3) return 'text-emerald-400';
    if (score < 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getEntropyBg = (score: number) => {
    if (score < 0.3) return 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400';
    if (score < 0.6) return 'bg-yellow-950/30 border-yellow-800/40 text-yellow-400';
    return 'bg-red-950/30 border-red-800/40 text-red-400';
  };

  const currentEntropy = () => {
    if (!result) return 0;
    let baseEntropy = result.entropyScore;
    if (refinementHistory.length > 0) {
      baseEntropy = refinementHistory[refinementHistory.length - 1].entropy;
    }
    // Dynamic entropy increase when human operator backtracks a branch
    const addedEntropy = backtrackedBranches.length * 0.15;
    return parseFloat((baseEntropy + addedEntropy).toFixed(4));
  };

  const exportToPDF = () => {
    if (!result) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Title/Header Design with a dark high-tech slate motif
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RAPPORT DE DECISION ARGUS (PROTOCOLE D.U.R.)', 15, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`ID Signature: ${result.id}  |  Genere le: ${new Date().toLocaleString('fr-CA')}`, 15, 25);
    doc.text(`Source : ${result.feedType}  |  Temps de calcul : ${result.durationMs}ms  |  Entropie : ${currentEntropy()} bits`, 15, 30);
    
    const targetTitle = result.feedTitle.length > 80 ? `${result.feedTitle.substring(0, 77)}...` : result.feedTitle;
    doc.text(`Telemetrie Cible : ${targetTitle}`, 15, 35);
    
    // Main Content
    let y = 55;
    
    // Section 1: Décision Stratégique Consolidée
    doc.setFillColor(241, 245, 249); // light grey
    doc.rect(15, y, 180, 25, 'F');
    
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('1. DECISION STRATEGIQUE CONSOLIDEE', 18, y + 6);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(9);
    
    // Text wrap for finalDecision
    const splitDecision = doc.splitTextToSize(`"${result.finalDecision}"`, 172);
    doc.text(splitDecision, 18, y + 12);
    
    y += Math.max(25, 12 + splitDecision.length * 4) + 10;
    
    // Section 2: Analyse d'Entropie Quantique
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text("2. EVALUATION D'ENTROPIE QUANTIQUE", 15, y);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Score d'entropie actuel : ${currentEntropy()} bits (seuil de confiance critique : 0.50)`, 15, y);
    y += 5;
    const statusLabel = currentEntropy() < 0.3 ? 'COHERENT (CONVERGE)' : currentEntropy() < 0.6 ? 'STABLE' : 'FORTE INCERTITUDE';
    doc.text(`Statut de coherence : ${statusLabel}`, 15, y);
    y += 10;
    
    // Section 3: Séquences ToT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text("3. SEQUENCES DE RAISONNEMENT ToT (ARBRE DE PENSEES)", 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
    
    result.branches.forEach((branch, index) => {
      // Check for page overflow
      if (y > 255) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Branche B-0${index + 1} : ${branch.name}`, 15, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(branch.description, 175);
      doc.text(splitDesc, 15, y);
      y += splitDesc.length * 4.2 + 2;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Niveau de menace : ${branch.evaluationScore}% | Bruit (Incertitude) : ${branch.uncertainty}%`, 15, y);
      y += 4.5;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(79, 70, 229);
      doc.text(`Directive recommandee : ${branch.recommendation}`, 15, y);
      y += 5;
      
      if (branch.cascadingRisks && branch.cascadingRisks.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28); // red
        doc.text('Risques en cascade :', 15, y);
        y += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        branch.cascadingRisks.forEach(risk => {
          doc.text(`  - ${risk}`, 15, y);
          y += 4;
        });
      }
      y += 6;
    });
    
    // Section 4: CCTV Omnivision (if available)
    if (result.cctvParsing) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("4. RAPPORT D'ANALYSE OPTIQUE OMNI-VISION (CCTV_AGENT)", 15, y);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Etape d'Observation (Parsing) :", 15, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const splitParsing = doc.splitTextToSize(result.cctvParsing || '', 175);
      doc.text(splitParsing, 15, y);
      y += splitParsing.length * 4 + 4;
      
      doc.setFont('helvetica', 'bold');
      doc.text("Acteurs & Contextes (Identification) :", 15, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const splitIdent = doc.splitTextToSize(result.cctvIdentification || '', 175);
      doc.text(splitIdent, 15, y);
      y += splitIdent.length * 4 + 4;
      
      doc.setFont('helvetica', 'bold');
      doc.text("Jugement Initial & Intention :", 15, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const splitJudg = doc.splitTextToSize(result.cctvJudgment || '', 175);
      doc.text(splitJudg, 15, y);
      y += splitJudg.length * 4 + 4;
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Triangulation : ${result.cctvTriangulationStatus}  |  Classification Finale : ${result.cctvFinalClassification}`, 15, y);
      y += 6;
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text("Action Recommandee par CCTV_AGENT :", 15, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const splitCctvAct = doc.splitTextToSize(result.cctvActionRecommandee || '', 175);
      doc.text(splitCctvAct, 15, y);
      y += splitCctvAct.length * 4 + 4;
    }
    
    // 5. Appendice: Cartographie Géospatiale des Flux (D3)
    const mapPng = localStorage.getItem('argus_last_map_png');
    if (mapPng) {
      doc.addPage();
      let mapY = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("5. APPENDICE : CARTOGRAPHIE GEOSPATIALE DES FLUX (TEMPS REEL)", 15, mapY);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, mapY + 2, 195, mapY + 2);
      mapY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Capture telemetrique active issue de la carte interactive D3 (Secteur Montreal-Metropolitain) :", 15, mapY);
      mapY += 6;

      try {
        doc.addImage(mapPng, 'PNG', 15, mapY, 170, 95);
        mapY += 105;
      } catch (err) {
        console.error("Failed to embed map image into PDF:", err);
        doc.setTextColor(185, 28, 28);
        doc.text("Erreur technique : Impossible de charger l'appendice cartographique.", 15, mapY);
        mapY += 8;
      }
    }
    
    // Append the archived decision journal to the PDF if it exists
    if (archive && archive.length > 0) {
      doc.addPage();
      
      // Page title for the archive
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('JOURNAL DES DECISIONS ARCHIVEES (HISTORIQUE)', 15, 12);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Projet ARGUS  |  Nombre total d'enregistrements : ${archive.length}`, 15, 20);
      
      let archY = 40;
      
      archive.forEach((dec, idx) => {
        if (archY > 245) {
          doc.addPage();
          archY = 20;
        }
        
        doc.setFillColor(248, 250, 252); // light background for card
        doc.rect(15, archY, 180, 32, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, archY, 180, 32, 'D');
        
        // Header line in card
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(79, 70, 229); // Indigo
        const cleanTitle = dec.feedTitle.replace(/[^\x00-\x7F]/g, " "); // avoid any weird PDF character issues
        doc.text(`[${dec.feedType}] ${cleanTitle.length > 55 ? cleanTitle.slice(0, 52) + '...' : cleanTitle}`, 18, archY + 6);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`ID: ${dec.id}  |  Date: ${new Date(dec.timestamp).toLocaleString('fr-CA')}`, 18, archY + 11);
        
        // Final decision
        doc.setFont('helvetica', 'oblique');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        const cleanDecisionText = dec.finalDecision.replace(/[^\x00-\x7F]/g, " ");
        const splitDecStr = doc.splitTextToSize(`"${cleanDecisionText}"`, 172);
        doc.text(splitDecStr, 18, archY + 16);
        
        // Stats row at the bottom of the card
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Entropie: ${dec.entropyScore} bits  |  Temps: ${dec.durationMs}ms  |  Branches ToT: ${dec.branches?.length || 0}`, 18, archY + 28);
        
        archY += 38;
      });
    }
    
    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('CLASSIFIE ARGUS - USAGE OPERATIONNEL STRICTEMENT SECURISE', 15, 287);
      doc.text(`Page ${i} sur ${pageCount}`, 180, 287);
    }
    
    doc.save(`ARGUS-Decision-${result.id}.pdf`);
  };

  const exportToJSON = () => {
    if (!result) return;
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ARGUS-Decision-${result.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 overflow-hidden shadow-2xl flex flex-col h-full"
      id="tot-reasoner-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="font-display font-semibold text-sm tracking-wide text-slate-100">
              CŒUR ARGUS : ARBRE DE PENSÉES (ToT)
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              RAISONNEUR RÉCURSIF ET SCORES D'ENTROPIE QUANTIQUE
            </p>
          </div>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportToJSON}
              className="px-2.5 py-1 text-xs font-mono font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-950 border border-indigo-900/50 hover:border-indigo-800 rounded transition-all flex items-center gap-1.5 cursor-pointer"
              title="Exporter ce rapport de décision au format JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter en JSON</span>
            </button>
            <button
              onClick={exportToPDF}
              className="px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/50 hover:border-emerald-800 rounded transition-all flex items-center gap-1.5 cursor-pointer"
              title="Générer un rapport PDF complet"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Exporter en PDF</span>
            </button>
            <button 
              onClick={onClear}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Effacer
            </button>
          </div>
        )}
      </div>

      {/* Sélecteur d'Optimisation des Coûts du Modèle */}
      <div className="bg-slate-950/80 border-b border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10.5px] font-mono shrink-0">
        <div className="flex items-center gap-2 text-slate-400">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>ALGORITHME DE RAISONNEMENT :</span>
          <strong className="text-indigo-400 uppercase tracking-wider">{selectedModel}</strong>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Coût Token :</span>
          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
            selectedModel === 'gemini-3.5-flash' ? 'bg-red-950/30 text-red-400 border-red-900/30' :
            selectedModel === 'gemini-2.5-flash' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' :
            'bg-sky-950/40 text-sky-400 border-sky-500/30'
          }`}>
            {selectedModel === 'gemini-3.5-flash' ? 'Standard (100% Coût)' :
             selectedModel === 'gemini-2.5-flash' ? 'Éco-Performance (-70% Éco)' :
             'Budget Sentinelle (-85% Éco)'}
          </span>
          <select 
            value={selectedModel}
            onChange={(e) => onUpdateSelectedModel(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-[10px] font-mono cursor-pointer"
          >
            <option value="gemini-3.5-flash">gemini-3.5-flash (Standard)</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash (-70% Coût)</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash (-85% Coût)</option>
          </select>
        </div>
      </div>

      {/* Paramètres de Cohérence et Pondération d'Entropie */}
      <div className="bg-slate-950/40 border-b border-slate-800 p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>PARAMÈTRES DE COHÉRENCE ET PONDÉRATION D'ENTROPIE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Slider 1: Transit */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Temps de Transit (Fluidité)</span>
              <span className="text-indigo-400 font-bold">{(transitWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={transitWeight * 100}
              onChange={(e) => {
                const val = parseFloat(e.target.value) / 100;
                setTransitWeight(val);
              }}
              className="w-full accent-indigo-500 h-1 bg-slate-850 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 2: Sécurité */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Sécurité (Menace)</span>
              <span className="text-indigo-400 font-bold">{(safetyWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={safetyWeight * 100}
              onChange={(e) => {
                const val = parseFloat(e.target.value) / 100;
                setSafetyWeight(val);
              }}
              className="w-full accent-indigo-500 h-1 bg-slate-850 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 3: Bruit de données / Incertitude */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Incertitude (Bruit)</span>
              <span className="text-indigo-400 font-bold">{(uncertaintyWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={uncertaintyWeight * 100}
              onChange={(e) => {
                const val = parseFloat(e.target.value) / 100;
                setUncertaintyWeight(val);
              }}
              className="w-full accent-indigo-500 h-1 bg-slate-850 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Option to recalculate */}
        {result && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => onAnalyze({ transit: transitWeight, safety: safetyWeight, uncertainty: uncertaintyWeight })}
              disabled={isAnalyzing}
              className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>RECALCULER ToT AVEC CETTE PONDÉRATION</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5">
        {isMockMode && (
          <div className="p-3.5 bg-amber-950/25 border border-amber-900/50 text-amber-300 rounded-xl flex items-start gap-2.5 text-xs font-mono leading-relaxed animate-fade-in shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span>
                ⚠️ <strong>Mode Simulation actif</strong> : Le quota d'IA journalier est épuisé ou temporairement saturé (Code 429). L'application utilise des données synthétiques locales pour tester OpenSky, Leaflet et D3TransitMap en toute transparence.
              </span>
              <div className="pt-1">
                <button
                  onClick={() => onToggleMockMode(false)}
                  className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[9.5px] font-bold text-amber-300 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Réessayer la connexion réelle
                </button>
              </div>
            </div>
          </div>
        )}

        {analysisError ? (
          <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-xl space-y-4 animate-fade-in text-left">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                  MOTEUR IA INDISPONIBLE OU CHARGE CRITIQUE DÉTECTÉE
                </h4>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Le modèle de raisonnement <strong className="text-red-300">{selectedModel}</strong> a rencontré une surcharge de requêtes Google Cloud ou une indisponibilité (Code 503 / 429).
                  Choisissez l'une des 3 options d'optimisation de coût ci-dessous pour forcer l'allocation d'un modèle ultra-disponible et relancer la synthèse ToT instantanément :
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => {
                  onUpdateSelectedModel('gemini-3.5-flash');
                  onClearError();
                  setTimeout(() => onAnalyze(), 100);
                }}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  selectedModel === 'gemini-3.5-flash'
                    ? 'bg-slate-900 border-indigo-500 shadow-lg ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-200">
                    1. Mode Standard (gemini-3.5-flash)
                  </span>
                  <span className="text-[9px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded-full font-semibold">
                    STANDARD • 100% COÛT
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-tight">
                  Performances maximales de raisonnement pour l'arbre de pensées complexe et la vision multi-modale. Soumis aux surcharges.
                </p>
              </button>

              <button
                onClick={() => {
                  onUpdateSelectedModel('gemini-2.5-flash');
                  onClearError();
                  setTimeout(() => onAnalyze(), 100);
                }}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  selectedModel === 'gemini-2.5-flash'
                    ? 'bg-slate-900 border-emerald-500 shadow-lg ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    2. Option Éco-Performance (gemini-2.5-flash)
                  </span>
                  <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded-full font-bold">
                    RECOMMANDÉ • -70% COÛT
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-tight">
                  Calcul complet et conforme à 100%, vitesse de réponse accrue et résilience maximale contre la saturation.
                </p>
              </button>

              <button
                onClick={() => {
                  onUpdateSelectedModel('gemini-1.5-flash');
                  onClearError();
                  setTimeout(() => onAnalyze(), 100);
                }}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  selectedModel === 'gemini-1.5-flash'
                    ? 'bg-slate-900 border-sky-500 shadow-lg ring-1 ring-sky-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-400">
                    3. Mode Sentinelle Budget (gemini-1.5-flash)
                  </span>
                  <span className="text-[9px] font-mono bg-sky-950 text-sky-400 border border-sky-900/40 px-2 py-0.5 rounded-full font-semibold">
                    ÉCONOMIE MAXIMALE • -85% COÛT
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-tight">
                  Solution de secours hautement économique et résiliente, idéale pour optimiser le budget jetons à moindre coût.
                </p>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-900/60 text-[10px] font-mono text-slate-500">
              <span className="truncate max-w-[250px]">Erreur signalée : {analysisError}</span>
              <button
                onClick={onClearError}
                className="hover:text-slate-300 underline cursor-pointer"
              >
                Ignorer l'erreur
              </button>
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-t-2 border-indigo-500 border-r-2 border-indigo-500/20 animate-spin" />
              <Cpu className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-indigo-400">EXÉCUTION DU FLUX ToT ARGUS...</p>
              <p className="text-[11px] text-slate-500 font-mono mt-1">Appel de Gemini-3.5-Flash pour calculer les branches de décision probabilistes</p>
            </div>
            <div className="w-48 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-indigo-500 rounded-full animate-progress" style={{ width: '60%' }} />
            </div>
          </div>
        ) : result ? (
          <div className="space-y-5 animate-fade-in">
            
            {/* Meta & Entropy Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Target Alert Meta */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 block mb-1 uppercase">TÉLÉMÉTRIE CIBLE</span>
                <span className="font-display font-medium text-xs text-indigo-300 block truncate">{result.feedTitle}</span>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase ${
                    result.feedType === 'STM' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                    result.feedType === 'AVIATION' ? 'bg-sky-950 text-sky-400 border-sky-800' :
                    result.feedType === 'MARITIME' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                    'bg-indigo-950 text-indigo-400 border-indigo-800'
                  }`}>
                    {result.feedType}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    latence : {result.durationMs}ms
                  </span>
                </div>
              </div>

              {/* Quantum Entropy Widget */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">ENTROPIE QUANTIQUE</span>
                    {result.cached && (
                      <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[9px] font-mono px-1 py-0.5 rounded uppercase">
                        EN CACHE (SLA 0ms)
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`font-mono text-xl font-bold tracking-tight ${getEntropyColor(currentEntropy())}`}>
                      {currentEntropy()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">bits</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${getEntropyBg(currentEntropy())}`}>
                    {currentEntropy() < 0.3 ? 'COHÉRENT (CONVERGÉ)' : currentEntropy() < 0.6 ? 'STABLE' : 'FORTE INCERTITUDE'}
                  </span>
                </div>
              </div>

              {/* Cache Décisionnel / Cost Reduction */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">CACHE DÉCISIONNEL</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle className={`w-4 h-4 ${result.cached ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-mono font-medium text-slate-300">
                      {result.cached ? 'Succès cache : 100% coût LLM économisé' : 'Contournement cache : Analyse active'}
                    </span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 font-mono leading-tight mt-2">
                  Évite les appels de modèle redondants sur les alertes simultanées.
                </p>
              </div>

            </div>

            {/* Tree Branch Visual Nodes */}
            <div className="space-y-4">
              {/* Mini-graphe interactif d3.js */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3" id="d3-tot-interactive-tree">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                        ARBORESCENCE DECISIONNELLE TOT (INTERACTIF D3)
                      </h4>
                      <p className="text-[9px] text-slate-500 font-mono">
                        CLIQUEZ SUR UN NŒUD POUR DECLENCHER LE BACKTRACKING MANUEL ET AJUSTER L'ENTROPIE
                      </p>
                    </div>
                  </div>
                  {backtrackedBranches.length > 0 && (
                    <button
                      onClick={() => setBacktrackedBranches([])}
                      className="text-[9px] font-mono bg-red-950/60 hover:bg-red-900/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      RESET ({backtrackedBranches.length})
                    </button>
                  )}
                </div>

                <div className="relative overflow-x-auto flex justify-center bg-slate-950/40 p-2 rounded-lg border border-slate-900/40">
                  <svg width="460" height="200" viewBox="0 0 460 200" className="overflow-visible" id="argus-tot-svg">
                    <defs>
                      <filter id="argus-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="argus-glow-heavy" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Cybernetic Background Grid elements inside SVG */}
                    <g opacity="0.1" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 4">
                      <line x1="0" y1="50" x2="460" y2="50" />
                      <line x1="0" y1="100" x2="460" y2="100" />
                      <line x1="0" y1="150" x2="460" y2="150" />
                      <line x1="115" y1="0" x2="115" y2="200" />
                      <line x1="230" y1="0" x2="230" y2="200" />
                      <line x1="345" y1="0" x2="345" y2="200" />
                    </g>

                    {/* Render Links */}
                    {d3Tree && d3Tree.links().map((link: any, idx: number) => {
                      const sX = link.source.y + 35;
                      const sY = link.source.x + 20;
                      const tX = link.target.y + 35;
                      const tY = link.target.x + 20;
                      const isLinkBacktracked = link.target.data.backtracked;

                      const pathData = `M ${sX} ${sY} C ${(sX + tX) / 2} ${sY}, ${(sX + tX) / 2} ${tY}, ${tX} ${tY}`;

                      return (
                        <g key={`link-group-${idx}`}>
                          {/* Inner glowing route link */}
                          <path
                            d={pathData}
                            fill="none"
                            stroke={isLinkBacktracked ? '#ef4444' : '#6366f1'}
                            strokeOpacity={isLinkBacktracked ? 0.2 : 0.45}
                            strokeWidth={isLinkBacktracked ? 3.5 : 2.5}
                            filter={isLinkBacktracked ? "none" : "url(#argus-glow)"}
                            className="transition-all duration-300"
                          />
                          <path
                            d={pathData}
                            fill="none"
                            stroke={isLinkBacktracked ? '#f87171' : '#a5b4fc'}
                            strokeOpacity={isLinkBacktracked ? 0.6 : 0.8}
                            strokeWidth={isLinkBacktracked ? 1.5 : 1.2}
                            strokeDasharray={isLinkBacktracked ? '3 3' : '1 2'}
                            className="transition-all duration-300"
                          />
                        </g>
                      );
                    })}

                    {/* Render Nodes */}
                    {d3Tree && d3Tree.descendants().map((node: any, idx: number) => {
                      const cx = node.y + 35;
                      const cy = node.x + 20;
                      const n = node.data;
                      const isB = n.backtracked;

                      let color = '#818cf8';
                      let size = 6;
                      switch (n.type) {
                        case 'root':
                          color = '#818cf8';
                          size = 8;
                          break;
                        case 'branch':
                          color = isB ? '#ef4444' : '#c084fc';
                          size = 6.5;
                          break;
                        case 'lookahead':
                          color = isB ? '#ef4444' : '#38bdf8';
                          size = 5;
                          break;
                        case 'critique':
                          color = isB ? '#ef4444' : '#fbbf24';
                          size = 5;
                          break;
                        case 'recommendation':
                          color = isB ? '#ef4444' : '#34d399';
                          size = 4;
                          break;
                      }

                      return (
                        <g
                          key={`node-${n.id || idx}`}
                          transform={`translate(${cx}, ${cy})`}
                          onClick={() => n.branchId && handleNodeClick(n.branchId)}
                          className={`${n.branchId ? 'cursor-pointer group' : ''} transition-all duration-300`}
                        >
                          <circle
                            r={size + 4.5}
                            fill={color}
                            fillOpacity={isB ? 0.05 : 0.25}
                            className={n.type === 'root' && !isB ? 'animate-ping' : ''}
                            style={{ animationDuration: '3.5s' }}
                            filter={isB ? "none" : "url(#argus-glow-heavy)"}
                          />
                          <circle
                            r={size}
                            fill={color}
                            stroke={isB ? '#ef4444' : '#1e1b4b'}
                            strokeWidth={1.5}
                            className="transition-colors duration-300"
                            filter={isB ? "none" : "url(#argus-glow)"}
                          />
                          <text
                            dx={node.children ? -11 : 11}
                            dy={3}
                            textAnchor={node.children ? 'end' : 'start'}
                            fill={isB ? '#475569' : '#e2e8f0'}
                            fontSize={7.5}
                            fontFamily="monospace"
                            className={`${isB ? 'line-through opacity-40' : 'font-semibold'} select-none pointer-events-none transition-all duration-300`}
                          >
                            {n.name}
                          </text>
                          <title>{`${n.name} ${n.branchId ? '(Cliquez pour forcer le Backtrack)' : ''}`}</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {backtrackedBranches.length > 0 && (
                  <div className="p-2.5 rounded bg-red-950/15 border border-red-900/30 text-[9px] font-mono text-red-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>[CONTRÔLEUR D.U.R.] ACTION : Backtrack forcé de {backtrackedBranches.length} branche(s) stratégique(s). Entropie recalculée.</span>
                    </div>
                    <button
                      onClick={() => setBacktrackedBranches([])}
                      className="underline hover:text-red-300 font-bold uppercase"
                    >
                      RÉTABLIR TOUTES
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    SÉQUENCES ET ANALYSE SYNTHÉTIQUE DES RISQUES ToT
                  </h3>
                </div>
                
                <div className="flex items-center bg-slate-900/90 p-0.5 rounded border border-slate-800 text-[10px] font-mono font-bold overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setActiveView('branches')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeView === 'branches' 
                        ? 'bg-slate-950 text-indigo-400 border border-slate-800/60 shadow' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>SÉQUENCES DE DÉCISION</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('agents')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeView === 'agents' 
                        ? 'bg-slate-950 text-emerald-400 border border-slate-800/60 shadow' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>AGENTS IA SPÉCIALISÉS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('riskSummary')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeView === 'riskSummary' 
                        ? 'bg-slate-950 text-rose-400 border border-slate-800/60 shadow' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    id="btn-tot-risk-summary"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>RÉSUMÉ DES RISQUES AGRÉGÉS</span>
                  </button>
                </div>
              </div>

              {activeView === 'branches' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  {result.branches.map((branch, index) => {
                    const branchId = branch.id || `b-${index}`;
                    const isB = backtrackedBranches.includes(branchId);

                    // Custom calculations for graphics
                    const scoreWidth = `${branch.evaluationScore}%`;
                    const uncertaintyWidth = `${branch.uncertainty}%`;
                    
                    return (
                      <div 
                        key={branch.id || index}
                        onClick={() => openQuantumModal(branch)}
                        className={`p-4 rounded-lg border transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer group ${
                          isB 
                            ? 'bg-red-950/10 border-red-900/50 opacity-60 shadow-[inset_0_0_12px_rgba(239,68,68,0.05)] hover:border-red-800/80'
                            : 'bg-slate-950 border-slate-800/80 hover:border-indigo-500/85 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        }`}
                        title="Cliquer pour décoder l'entropie quantique de cette branche"
                      >
                        {isB && (
                          <div className="absolute top-0 right-0 bg-red-600/90 text-white font-mono text-[7px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-bl">
                            BACKTRACKED
                          </div>
                        )}
                        <div>
                          {/* Title */}
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-display font-semibold text-xs ${isB ? 'text-red-400 line-through' : 'text-slate-200 group-hover:text-white transition-colors'}`}>
                              {branch.name}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/10 group-hover:border-indigo-800/30 transition-all">
                              B-0{index + 1}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-400 leading-normal mb-3 font-sans">
                            {branch.description}
                          </p>

                          {/* Evaluation Score Bar */}
                          <div className="space-y-1 mb-2">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-500">Niveau de menace critique :</span>
                              <span className="text-indigo-300 font-semibold">{branch.evaluationScore}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                              <div 
                                className="h-full bg-indigo-500 rounded-full" 
                                style={{ width: scoreWidth }} 
                              />
                            </div>
                          </div>

                          {/* Uncertainty Bar */}
                          <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-500">Variance des données (Bruit) :</span>
                              <span className="text-orange-400 font-semibold">{branch.uncertainty}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                              <div 
                                className="h-full bg-orange-500 rounded-full" 
                                style={{ width: uncertaintyWidth }} 
                              />
                            </div>
                          </div>

                          {/* Cascading Risks */}
                          <div className="mt-3 pt-3 border-t border-slate-900 space-y-1.5">
                            <span className="text-[10px] font-mono text-red-400 uppercase flex items-center gap-1">
                              <Flame className="w-3 h-3 text-red-500 animate-pulse" />
                              <span>RISQUES EN CASCADE</span>
                            </span>
                            <ul className="space-y-1">
                              {branch.cascadingRisks?.map((risk, idx) => (
                                <li key={idx} className="text-[10px] text-slate-400 font-sans flex items-start gap-1">
                                  <span className="text-red-500/85 mt-0.5">•</span>
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Interactive D3 Entropy Distribution Graph */}
                          <div className="mt-4">
                            <BranchEntropyD3Chart 
                              branchId={branchId}
                              uncertainty={branch.uncertainty}
                              evaluationScore={branch.evaluationScore}
                            />
                          </div>

                          {/* Critics Summary Badge */}
                          {branch.critics && branch.critics.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-500 uppercase flex items-center gap-1">
                                <Cpu className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                <span>CRITIQUES IA :</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
                                branch.critics.reduce((acc, c) => acc + c.validityScore, 0) / branch.critics.length >= 85
                                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40'
                                  : 'bg-yellow-950/50 text-yellow-400 border-yellow-800/40'
                              }`}>
                                {branch.critics.length} CRITIQUES • VALIDITÉ : {Math.round(branch.critics.reduce((acc, c) => acc + c.validityScore, 0) / branch.critics.length)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Direct Recommendation with Entropy indicator */}
                        <div className="mt-4 p-2 bg-indigo-950/20 border border-indigo-900/30 rounded text-[11px] text-indigo-300 font-mono transition-colors group-hover:bg-indigo-950/40 group-hover:border-indigo-800/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-indigo-400 text-[9px] uppercase font-bold">Directive :</span>
                            <span className="text-[9px] text-indigo-400 font-bold group-hover:text-indigo-300 flex items-center gap-1 transition-colors">
                              <Layers className="w-3 h-3 text-indigo-400" />
                              <span>ENTROPIE QUANTIQUE</span>
                            </span>
                          </div>
                          <p className="line-clamp-2 leading-relaxed">{branch.recommendation}</p>
                          <div className="mt-2 text-center text-[9px] text-indigo-400 group-hover:text-indigo-300 font-bold uppercase tracking-wider border-t border-indigo-900/20 pt-1.5 flex items-center justify-center gap-1.5">
                            <span>Décoder l'Entropie Avancée</span>
                            <span className="transition-transform group-hover:translate-x-0.5">➔</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : activeView === 'agents' ? (
                <div className="space-y-5 animate-fade-in text-left">
                  {/* Top Header Card */}
                  <div className="p-5 rounded-xl border border-slate-900 bg-slate-950/80 relative overflow-hidden">
                    {/* Glowing background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3.5 rounded-xl border text-white ${
                          activeAgent?.codename === 'SENTINELLE-TRANSIT' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' :
                          activeAgent?.codename === 'AERO-VIGIL' ? 'bg-sky-950/60 border-sky-800 text-sky-400' :
                          activeAgent?.codename === 'AQUA-GARDE' ? 'bg-amber-950/60 border-amber-800 text-amber-400' :
                          'bg-indigo-950/60 border-indigo-800 text-indigo-400'
                        }`}>
                          <Cpu className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-base text-slate-100">
                              {activeAgent?.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold tracking-wider border ${
                              activeAgent?.codename === 'SENTINELLE-TRANSIT' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' :
                              activeAgent?.codename === 'AERO-VIGIL' ? 'bg-sky-950/80 text-sky-400 border-sky-500/30' :
                              activeAgent?.codename === 'AQUA-GARDE' ? 'bg-amber-950/80 text-amber-400 border-amber-500/30' :
                              'bg-indigo-950/80 text-indigo-400 border-indigo-500/30'
                            }`}>
                              {activeAgent?.codename}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>COGNITION ACTIVE • MODE : <strong className="text-slate-300">{activeAgent?.status}</strong></span>
                          </p>
                        </div>
                      </div>

                      {/* Confidence Score Gauge */}
                      <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-900 px-4 py-2.5 rounded-xl self-start md:self-center">
                        <div className="font-mono text-right">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">Confiance de l'Agent</span>
                          <span className="text-lg font-bold text-slate-200">{activeAgent?.confidenceScore}%</span>
                        </div>
                        <div className="w-24 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full ${
                              activeAgent?.confidenceScore && activeAgent.confidenceScore > 90 ? 'bg-emerald-500' :
                              activeAgent?.confidenceScore && activeAgent.confidenceScore > 75 ? 'bg-indigo-500' :
                              'bg-amber-500'
                            }`}
                            style={{ width: `${activeAgent?.confidenceScore || 90}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Agent Interpretation Statement */}
                    <div className="mt-5 pt-4 border-t border-slate-900">
                      <span className="text-[9px] font-mono text-indigo-400 block mb-1.5 uppercase font-bold">
                        DÉCRYPTAGE ET INTERPRÉTATION DU FLUX :
                      </span>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed italic bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        "{activeAgent?.interpretation}"
                      </p>
                    </div>
                  </div>

                  {/* Metrics and Influence Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 font-mono">
                    
                    {/* Live Telemetry Sensors (Metrics) */}
                    <div className="md:col-span-7 space-y-3.5">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          CAPTEURS PHYSIQUES ET TÉLÉMÉTRIE DU DOMAINE
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {activeAgent?.metrics?.map((metric, idx) => (
                          <div key={idx} className="p-3 bg-slate-950/60 border border-slate-900/80 rounded-xl space-y-2">
                            <span className="text-[8.5px] text-slate-500 font-bold block uppercase truncate" title={metric.label}>
                              {metric.label}
                            </span>
                            <div className="text-xs font-bold text-slate-200 truncate">
                              {metric.value}
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold inline-block border ${
                              metric.status === 'NORMAL' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' :
                              metric.status === 'ALERT' ? 'bg-amber-950/40 text-amber-400 border-amber-900/30' :
                              'bg-red-950/40 text-red-400 border-red-900/30'
                            }`}>
                              {metric.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ToT Influence Contribution */}
                    <div className="md:col-span-5 space-y-3.5">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          INFLUENCE DANS LA BOUCLE ToT
                        </span>
                      </div>

                      <div className="p-4 bg-indigo-950/10 border border-indigo-900/30 rounded-xl space-y-2">
                        <span className="text-[9px] text-indigo-400 font-bold block uppercase">
                          PERSPECTIVE CONTEXTUELLE APPORTÉE :
                        </span>
                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                          {activeAgent?.contributionToToT}
                        </p>
                        <div className="pt-2 border-t border-indigo-900/20 text-[8.5px] text-indigo-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Pondération de menace alignée sur la directive de l'agent.</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Critics section in the activeView === 'agents' tab */}
                  {result.branches && result.branches.some(b => b.critics && b.critics.length > 0) && (
                    <div className="mt-6 pt-6 border-t border-slate-900 space-y-4">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                          AGENTS CRITIQUES IA SPÉCIALISÉS (ANALYSE TRANSVERSE DE COHÉRENCE ToT)
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {result.branches.map((branch, bIdx) => (
                          <div key={branch.id || bIdx} className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 space-y-3.5 text-left">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                              <span className="text-[10px] font-mono font-bold text-indigo-400 block uppercase truncate max-w-[70%]" title={branch.name}>
                                {branch.name}
                              </span>
                              <span className="text-[9px] font-mono font-bold bg-indigo-950/50 text-indigo-300 border border-indigo-900/40 px-1.5 py-0.5 rounded">
                                B-0{bIdx + 1}
                              </span>
                            </div>

                            {branch.critics?.map((critic, cIdx) => (
                              <div key={critic.id || cIdx} className="bg-slate-950 p-3 rounded-lg border border-slate-900/60 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-200">{critic.name}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                    critic.validityScore >= 85 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/30' :
                                    critic.validityScore >= 70 ? 'bg-yellow-950 text-yellow-400 border border-yellow-800/30' :
                                    'bg-red-950 text-red-400 border border-red-800/30'
                                  }`}>
                                    {critic.validityScore}% val
                                  </span>
                                </div>
                                <span className="text-[8.5px] font-mono text-slate-500 block -mt-1">{critic.role}</span>
                                <p className="text-[10.5px] text-slate-400 italic font-sans leading-normal">
                                  "{critic.critiqueText}"
                                </p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* Score global pondéré gauge widget */}
                    <div className="lg:col-span-1 p-4 rounded-xl border border-slate-900 bg-slate-950/80 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
                          SCORE DE CRITICITÉ GLOBAL PONDÉRÉ (CGP)
                        </span>
                        
                        <div className="relative flex items-center justify-center my-4 h-28">
                          {/* SVG Simple Gauge */}
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className="stroke-slate-900"
                              strokeWidth="8"
                              fill="none"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              className={`transition-all duration-1000 ${
                                weightedGlobalScore > 75 ? 'stroke-red-500' :
                                weightedGlobalScore > 50 ? 'stroke-orange-500' :
                                weightedGlobalScore > 30 ? 'stroke-yellow-500' :
                                'stroke-indigo-500'
                              }`}
                              strokeWidth="8"
                              strokeDasharray="238.7"
                              strokeDashoffset={238.7 - (238.7 * weightedGlobalScore) / 100}
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                            <span className="text-xl font-bold text-slate-100">{weightedGlobalScore}%</span>
                            <span className="text-[7px] text-slate-500 uppercase">MENACE PONDÉRÉE</span>
                          </div>
                        </div>

                        <div className="text-center space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase block text-center ${
                            weightedGlobalScore > 75 ? 'bg-red-950/80 text-red-400 border border-red-900/50' :
                            weightedGlobalScore > 50 ? 'bg-orange-950/80 text-orange-400 border border-orange-900/50' :
                            weightedGlobalScore > 30 ? 'bg-yellow-950/80 text-yellow-400 border border-yellow-900/50' :
                            'bg-indigo-950/80 text-indigo-400 border border-indigo-900/50'
                          }`}>
                            {weightedGlobalScore > 75 ? 'ALERTE CRITIQUE NIVEAU 3' :
                             weightedGlobalScore > 50 ? 'SURVEILLANCE ACCRUE NIVEAU 2' :
                             weightedGlobalScore > 30 ? 'FLUX EN ALERTE SECONDAIRE' :
                             'FLUX STABLE / CONVERGÉ'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-900 text-[9px] font-mono text-slate-500 space-y-1">
                        <span className="font-bold text-slate-400 block uppercase text-[8px]">Formulation Mathématique ToT :</span>
                        <p className="leading-relaxed text-[8.5px]">
                          La criticité est pondérée par la certitude de chaque branche stratégique. Coefficient appliqué : <span className="text-slate-400 font-bold">Poids = 101 - Bruit</span>.
                        </p>
                        <p className="text-[8.5px] font-bold text-indigo-400">
                          CGP = Σ(Menace_i * Poids_i) / ΣPoids_i
                        </p>
                      </div>
                    </div>

                    {/* Consolidated risks table */}
                    <div className="lg:col-span-2 p-4 rounded-xl border border-slate-900 bg-slate-950/80 flex flex-col justify-between">
                      <div className="space-y-3">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                          MATRICE INTER-BRANCHES DES COFLITS DE TÉLÉMÉTRIE
                        </span>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[10px] font-mono">
                            <thead>
                              <tr className="border-b border-slate-900 text-slate-500 uppercase">
                                <th className="py-2">Branche</th>
                                <th className="py-2">Menace (Score)</th>
                                <th className="py-2">Bruit (Variance)</th>
                                <th className="py-2">Poids Certitude</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.branches.map((branch, idx) => {
                                const branchId = branch.id || `b-${idx}`;
                                const isB = backtrackedBranches.includes(branchId);
                                const cert = 100 - branch.uncertainty;
                                
                                return (
                                  <tr 
                                    key={branchId}
                                    className={`border-b border-slate-900/60 ${isB ? 'text-slate-600 line-through' : 'text-slate-300'}`}
                                  >
                                    <td className="py-2 font-semibold">
                                      {isB ? `[B-0${idx+1}] Backtrackée` : branch.name}
                                    </td>
                                    <td className="py-2">
                                      <span className={isB ? '' : branch.evaluationScore > 70 ? 'text-red-400' : 'text-indigo-300'}>
                                        {branch.evaluationScore}%
                                      </span>
                                    </td>
                                    <td className="py-2 text-orange-400">
                                      {branch.uncertainty}%
                                    </td>
                                    <td className="py-2">
                                      <div className="flex items-center gap-1.5">
                                        <div className="h-1.5 w-12 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                          <div 
                                            className={`h-full ${isB ? 'bg-slate-700' : 'bg-emerald-500'}`}
                                            style={{ width: `${cert}%` }}
                                          />
                                        </div>
                                        <span>{cert}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-4 p-2.5 rounded bg-indigo-950/20 border border-indigo-900/30 text-[9.5px] font-sans text-slate-300 leading-normal">
                        <span className="font-mono text-[9px] font-bold text-indigo-400 block uppercase mb-1">
                          DIRECTIVE EXECUTIVE CONSOLIDÉE
                        </span>
                        {result.branches.filter((b, idx) => !backtrackedBranches.includes(b.id || `b-${idx}`)).map((b, idx) => {
                          const trueIdx = result.branches.indexOf(b);
                          return (
                            <div key={idx} className="flex items-start gap-1 mt-1 font-mono text-[9px] text-slate-400">
                              <span className="text-indigo-400 font-bold">• B-0{trueIdx + 1} :</span>
                              <span className="text-slate-300 italic">{b.recommendation}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Real-time map displaying the decision hotspots */}
                  <div className="space-y-2">
                    <ToTRiskMiniMap 
                      branches={result.branches.filter((b, idx) => !backtrackedBranches.includes(b.id || `b-${idx}`))}
                      feedType={result.feedType}
                      weightedGlobalScore={weightedGlobalScore}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recursive Safety Actions */}
            <div className="p-4 rounded-lg bg-indigo-950/15 border border-indigo-900/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span>Auto-correction récursive (Boucle ToT)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Exécutez le prompt de manière récursive sur plusieurs branches pour faire converger les résultats et réduire l'entropie.
                  </p>
                </div>
                <button
                  onClick={runSelfCorrection}
                  disabled={isRefining || currentEntropy() < 0.1}
                  className={`px-3 py-1.5 font-mono text-xs rounded border flex items-center gap-1.5 transition-all duration-200 ${
                    currentEntropy() < 0.1
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20 cursor-not-allowed'
                      : isRefining
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 hover:shadow-indigo-600/10'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                  <span>
                    {currentEntropy() < 0.1 ? 'Entropie convergée' : isRefining ? `Raffinement Étape ${recursiveStep}...` : 'Réduire l\'entropie'}
                  </span>
                </button>
              </div>

              {/* Refinement Progress Chart */}
              {refinementHistory.length > 0 && (
                <div className="mt-3 p-3 bg-slate-950/80 rounded border border-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Tendance de convergence de l'entropie</span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      -{(100 - (currentEntropy() / result.entropyScore) * 100).toFixed(0)}% de bruit
                    </span>
                  </div>
                  
                  {/* Custom SVG Line Graph for exact rendering safety */}
                  <div className="h-16 flex items-end gap-1.5 pt-4">
                    {refinementHistory.map((h, idx) => {
                      const pct = Math.max(10, h.entropy * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] font-mono text-slate-400">{h.entropy}</span>
                          <div 
                            className={`w-full rounded-t transition-all duration-500 ${
                              idx === refinementHistory.length - 1 ? 'bg-emerald-500' : 'bg-slate-700'
                            }`} 
                            style={{ height: `${pct * 0.6}px` }} 
                          />
                          <span className="text-[8px] font-mono text-slate-500">Étape {h.step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CCTV_AGENT Omni-Vision Analysis Block */}
            {result.cctvParsing && (
              <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/40 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
                  <span className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span>RAPPORT D'ANALYSE OPTIQUE OMNI-VISION (CCTV_AGENT)</span>
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase tracking-wider">
                    CONFIANCE ZÉRO ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-xs">
                  <div className="p-3 bg-slate-950/80 rounded border border-slate-900">
                    <span className="text-[9px] font-mono text-indigo-400 uppercase block mb-1">1. Étape d'Observation (Parsing)</span>
                    <p className="text-slate-300 leading-relaxed font-sans">{result.cctvParsing}</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded border border-slate-900">
                    <span className="text-[9px] font-mono text-indigo-400 uppercase block mb-1">2. Acteurs & Contextes (Identification)</span>
                    <p className="text-slate-300 leading-relaxed font-sans">{result.cctvIdentification}</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded border border-slate-900">
                    <span className="text-[9px] font-mono text-indigo-400 uppercase block mb-1">3. Jugement Initial (Intention)</span>
                    <p className="text-slate-300 leading-relaxed font-sans">{result.cctvJudgment}</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded border border-slate-900 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-indigo-400 uppercase block mb-1">Triangulation & Classification</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[10px] font-mono">Triangulation :</span>
                          <span className="text-emerald-400 font-semibold font-mono text-[10px]">{result.cctvTriangulationStatus}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[10px] font-mono">Classification :</span>
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                            result.cctvFinalClassification === 'MENACE' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                          }`}>{result.cctvFinalClassification}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 p-3 bg-indigo-900/10 border border-indigo-900/30 rounded text-xs">
                  <span className="text-indigo-400 font-mono font-bold block text-[10px] uppercase mb-1">🎯 Action Recommandée :</span>
                  <p className="text-slate-200 font-semibold font-sans leading-relaxed">{result.cctvActionRecommandee}</p>
                </div>
              </div>
            )}

            {/* Triple-Blind Consensus Verification Block */}
            {result.tripleBlindVerification && (
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[10px] tracking-wider animate-pulse">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                    <span>PROTOCOLE TRIPLE-AVEUGLE (V9) : {result.tripleBlindVerification.isVerifiedTrue100Percent ? '100% VÉRIFIÉ & CERTIFIÉ CONFORME' : '100% CONFIRMÉ'}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800 text-[9px] font-bold">
                    CONSENSUS RÉCONCILIÉ
                  </span>
                </div>
                
                {/* Independent Data Segments Cross-Referencing Panel */}
                <div className="space-y-2 pb-1">
                  <span className="text-[9px] text-emerald-400 block uppercase font-bold tracking-wider">SEGMENTS DE DONNÉES CROISÉS & VÉRIFIÉS :</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="p-2.5 bg-slate-950/90 rounded border border-emerald-900/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-300 block truncate">{result.tripleBlindVerification.dataSegment1_Name || "Ségment 1 : Télémétrie Physique"}</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                          {result.tripleBlindVerification.dataSegment1_Status || "VALIDÉ"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-sans leading-relaxed">{result.tripleBlindVerification.dataSegment1_Details || "Données de capteurs brutes validées."}</p>
                    </div>
                    
                    <div className="p-2.5 bg-slate-950/90 rounded border border-emerald-900/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-300 block truncate">{result.tripleBlindVerification.dataSegment2_Name || "Ségment 2 : Historique"}</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                          {result.tripleBlindVerification.dataSegment2_Status || "VALIDÉ"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-sans leading-relaxed">{result.tripleBlindVerification.dataSegment2_Details || "Concordance historique établie."}</p>
                    </div>

                    <div className="p-2.5 bg-slate-950/90 rounded border border-emerald-900/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-300 block truncate">{result.tripleBlindVerification.dataSegment3_Name || "Ségment 3 : Rapports Externes"}</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                          {result.tripleBlindVerification.dataSegment3_Status || "VALIDÉ"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-sans leading-relaxed">{result.tripleBlindVerification.dataSegment3_Details || "Triangulation régionale confirmée."}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-emerald-900/30 pt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-slate-950/80 rounded border border-slate-900 space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Agent A (Scout Observateur) :</span>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed">{result.tripleBlindVerification.agentA_Finding}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950/80 rounded border border-slate-900 space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Agent B (Critique Réfutateur) :</span>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed">{result.tripleBlindVerification.agentB_Finding}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950/80 rounded border border-slate-900 space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Agent C (Synthèse Terrain) :</span>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed">{result.tripleBlindVerification.agentC_Finding}</p>
                  </div>
                </div>

                <div className="space-y-1 pt-1.5 border-t border-emerald-900/20">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Étapes de contre-vérification :</span>
                  <ul className="list-decimal list-inside text-[10px] text-slate-400 space-y-0.5 pl-1">
                    {result.tripleBlindVerification.verificationSteps.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Consolidated Decision Output */}
            <div className="p-4 rounded-lg bg-indigo-600/10 border border-indigo-500/30 space-y-2">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                DÉCISION STRATÉGIQUE CONSOLIDÉE (PROTOCOLE D.U.R.)
              </span>
              <p className="text-sm font-sans font-medium text-slate-200 leading-relaxed italic">
                "{result.finalDecision}"
              </p>
              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 mt-1">
                <span>Conformité standard : certifiée</span>
                <span>•</span>
                <span>ID Signature : {result.id}</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center space-y-4">
            <GitBranch className="w-12 h-12 text-slate-700" />
            <div className="text-center">
              <h3 className="font-display font-medium text-sm text-slate-400">Aucune télémétrie analysée pour le moment</h3>
              <p className="text-xs text-slate-500 font-mono mt-1 max-w-sm">
                Sélectionnez l'un des flux de données STM, Aviation, Maritime ou CCTV à gauche et cliquez sur « Synthétiser ToT » pour déclencher le raisonnement.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quantum Entropy Modal */}
      {selectedModalBranch && quantumCalculations && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in" id="quantum-entropy-modal">
          <div className="bg-slate-950 border border-indigo-900/40 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(99,102,241,0.2)] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-indigo-950/40 flex items-center justify-between bg-gradient-to-r from-slate-950 to-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-900/20 border border-indigo-800/40 rounded-lg">
                  <Layers className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold text-indigo-300 uppercase tracking-widest">
                    ANALYSEUR D'ENTROPIE QUANTIQUE AVANCÉ (PROTOCOLE D.U.R.)
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    Branche active : <span className="text-indigo-400 font-semibold">{selectedModalBranch.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedModalBranch(null)}
                className="text-slate-400 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-800 transition-colors text-xs font-mono px-3 cursor-pointer"
              >
                Fermer ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Branch Quick Recap */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Description de la Séquence de Décision</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedModalBranch.description}</p>
                <div className="mt-2 p-2.5 bg-indigo-950/25 border border-indigo-900/30 rounded text-xs text-indigo-300 font-mono">
                  <span className="text-indigo-400 font-bold block text-[10px] uppercase mb-0.5">Recommandation Moteur :</span>
                  {selectedModalBranch.recommendation}
                </div>
              </div>

              {/* Specialized AI Critics evaluations for this branch */}
              {selectedModalBranch.critics && selectedModalBranch.critics.length > 0 && (
                <div className="p-5 rounded-lg bg-emerald-950/5 border border-emerald-500/20 space-y-4 shadow-[inset_0_0_15px_rgba(16,185,129,0.02)] text-left">
                  <div className="flex items-center justify-between border-b border-emerald-900/20 pb-2">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>AGENTS IA CRITIQUES ACTIFS ({selectedModalBranch.critics.length})</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-850/40 uppercase tracking-wider font-bold">
                      SCORE VALIDITÉ MOYEN : {Math.round(selectedModalBranch.critics.reduce((acc: number, c: any) => acc + c.validityScore, 0) / selectedModalBranch.critics.length)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedModalBranch.critics.map((critic: any, idx: number) => (
                      <div key={critic.id || idx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-900 space-y-3 shadow-md flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              {critic.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              critic.validityScore >= 85 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20' :
                              critic.validityScore >= 70 ? 'bg-yellow-950/80 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-950/80 text-red-400 border border-red-500/20'
                            }`}>
                              Indice de validité : {critic.validityScore}%
                            </span>
                          </div>
                          
                          <span className="text-[8px] font-mono text-slate-500 uppercase block mb-2">{critic.role}</span>
                          
                          <p className="text-xs text-slate-300 leading-relaxed italic font-sans mb-3 bg-slate-900/40 p-2.5 rounded border border-slate-900/30">
                            "{critic.critiqueText}"
                          </p>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-slate-900/60">
                          {/* Weaknesses */}
                          <div>
                            <span className="text-[9px] font-mono text-red-400 uppercase font-bold flex items-center gap-1 mb-1">
                              <span>⚠️</span> FAIBLESSES LOGIQUES
                            </span>
                            <ul className="space-y-1 pl-1">
                              {critic.weaknesses.map((w: string, wIdx: number) => (
                                <li key={wIdx} className="text-[10px] text-slate-400 font-sans leading-normal flex items-start gap-1">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Inconsistencies */}
                          <div>
                            <span className="text-[9px] font-mono text-orange-400 uppercase font-bold flex items-center gap-1 mb-1">
                              <span>🔄</span> INCOHÉRENCES POTENTIELLES
                            </span>
                            <ul className="space-y-1 pl-1">
                              {critic.inconsistencies.map((i: string, iIdx: number) => (
                                <li key={iIdx} className="text-[10px] text-slate-400 font-sans leading-normal flex items-start gap-1">
                                  <span className="text-orange-500 mt-0.5">•</span>
                                  <span>{i}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Biases */}
                          <div>
                            <span className="text-[9px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1 mb-1">
                              <span>🧠</span> BIAIS DÉTECTÉS
                            </span>
                            <ul className="space-y-1 pl-1">
                              {critic.biases.map((b: string, bIdx: number) => (
                                <li key={bIdx} className="text-[10px] text-slate-400 font-sans leading-normal flex items-start gap-1">
                                  <span className="text-amber-500 mt-0.5">•</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Sliders & Variables */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block border-b border-indigo-950/40 pb-2">
                      1. PARAMÈTRES INTERACTIFS D'ÉTAT
                    </span>
                    
                    {/* Time / Decoherence Slider */}
                    <div className="space-y-2 bg-slate-950 p-3.5 rounded-lg border border-slate-900">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-400 font-medium">Temps de Décohérence Temporelle (t) :</span>
                        <span className="text-indigo-400 font-bold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/30">
                          t = {decoherenceTime.toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={decoherenceTime}
                        onChange={(e) => setDecoherenceTime(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                        Représente le temps écoulé depuis l'observation initiale. À <span className="text-slate-400 font-mono">t = 0</span>, la superposition quantique et l'incertitude sont maximales. À mesure que <span className="text-slate-400 font-mono">t ➔ 2.0s</span>, l'état se stabilise (décohérence) et l'entropie s'effondre vers un état classique stable.
                      </p>
                    </div>

                    {/* Quantum Coupling Noise Slider */}
                    <div className="space-y-2 bg-slate-950 p-3.5 rounded-lg border border-slate-900">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-400 font-medium">Couplage de Bruit Environnemental (N) :</span>
                        <span className="text-orange-400 font-bold bg-orange-950/50 px-2 py-0.5 rounded border border-orange-900/30">
                          N = {(quantumCoupling * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={quantumCoupling}
                        onChange={(e) => setQuantumCoupling(parseFloat(e.target.value))}
                        className="w-full accent-orange-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                        Amplifie ou atténue l'impact du bruit de variance environnementale sur le terme de cohérence (δ). Un couplage à <span className="text-slate-400 font-mono">0%</span> simule un système parfaitement isolé.
                      </p>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-3 bg-slate-900/30 p-4 rounded-lg border border-slate-800/85">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                      2. VALEURS CALCULÉES DE L'ÉTAT QUANTIQUE
                    </span>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 block">Menace Initiale (p)</span>
                        <span className="text-sm font-bold text-slate-300">{(quantumCalculations.p * 100).toFixed(1)}%</span>
                        <span className="text-[8px] text-slate-600 block mt-0.5">Valeur normalisée</span>
                      </div>
                      
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 block">Cohérence Active (δ)</span>
                        <span className="text-sm font-bold text-indigo-400">{quantumCalculations.delta.toFixed(4)}</span>
                        <span className="text-[8px] text-slate-600 block mt-0.5">Superposition quantique</span>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 block">Pureté d'État (γ)</span>
                        <span className="text-sm font-bold text-emerald-400">{quantumCalculations.purity.toFixed(4)}</span>
                        <span className="text-[8px] text-slate-600 block mt-0.5">
                          {quantumCalculations.purity > 0.92 ? 'État quasiment pur' : 'État mixte bruité'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded border border-slate-900">
                        <span className="text-[9px] text-slate-500 block">Indice de Cohérence</span>
                        <span className="text-sm font-bold text-orange-400">{(quantumCalculations.quantumCoherenceMeasure * 100).toFixed(1)}%</span>
                        <span className="text-[8px] text-slate-600 block mt-0.5">Interférence active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Density Matrix & Mathematics */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block border-b border-indigo-950/40 pb-2">
                      3. MODÉLISATION MATHÉMATIQUE DE LA DENSITÉ
                    </span>

                    {/* Density Matrix Visual */}
                    <div className="bg-slate-950 p-4 rounded-lg border border-indigo-950/80 flex flex-col items-center justify-center relative overflow-hidden">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-3">Matrice de Densité Quantique ρ</span>
                      
                      <div className="flex items-center gap-3">
                        {/* Matrix Left Bracket */}
                        <div className="text-3xl text-indigo-500/60 font-light scale-y-[2.2] select-none">[</div>
                        
                        {/* Matrix Grid */}
                        <div className="grid grid-cols-2 gap-4 text-center font-mono text-xs w-48 py-2">
                          <div className="p-2 bg-slate-900/80 border border-slate-800 rounded">
                            <span className="text-[8px] text-slate-500 block">ρ_11 (p)</span>
                            <span className="text-slate-200 font-bold">{quantumCalculations.p.toFixed(3)}</span>
                          </div>
                          <div className="p-2 bg-indigo-950/30 border border-indigo-900/20 rounded">
                            <span className="text-[8px] text-indigo-400 block">ρ_12 (δ)</span>
                            <span className="text-indigo-300 font-bold">{quantumCalculations.delta.toFixed(3)}</span>
                          </div>
                          <div className="p-2 bg-indigo-950/30 border border-indigo-900/20 rounded">
                            <span className="text-[8px] text-indigo-400 block">ρ_21 (δ*)</span>
                            <span className="text-indigo-300 font-bold">{quantumCalculations.delta.toFixed(3)}</span>
                          </div>
                          <div className="p-2 bg-slate-900/80 border border-slate-800 rounded">
                            <span className="text-[8px] text-slate-500 block">ρ_22 (1-p)</span>
                            <span className="text-slate-200 font-bold">{(1 - quantumCalculations.p).toFixed(3)}</span>
                          </div>
                        </div>

                        {/* Matrix Right Bracket */}
                        <div className="text-3xl text-indigo-500/60 font-light scale-y-[2.2] select-none">]</div>
                      </div>

                      <div className="text-[8px] font-mono text-slate-500 mt-3 text-center">
                        Trace de la matrice : Tr(ρ) = ρ_11 + ρ_22 = 1.000 (Conservation de la probabilité)
                      </div>
                    </div>

                    {/* Eigenvalues Calculation */}
                    <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800 space-y-3 font-mono text-[11px]">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">
                        4. VALEURS PROPRES DE LA MATRICE (EIGENVALUES)
                      </span>
                      <p className="text-[9px] text-slate-400 leading-normal font-sans">
                        Les valeurs propres représentent les probabilités découplées des états stationnaires d'entropie de la branche de décision :
                      </p>
                      
                      <div className="space-y-1.5 bg-slate-950 p-2.5 rounded border border-slate-900 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">λ_1 (État principal) :</span>
                          <span className="text-indigo-300 font-bold">{quantumCalculations.lambda1.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">λ_2 (État secondaire) :</span>
                          <span className="text-indigo-300 font-bold">{quantumCalculations.lambda2.toFixed(4)}</span>
                        </div>
                        <div className="border-t border-slate-800 pt-1 flex justify-between items-center text-[10px] text-slate-500">
                          <span>Somme des valeurs (Σ λ_i) :</span>
                          <span>{(quantumCalculations.lambda1 + quantumCalculations.lambda2).toFixed(3)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Resulting Von Neumann Entropy */}
                    <div className="p-4 rounded-lg bg-indigo-950/25 border border-indigo-900/40 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                          5. ENTROPIE DE VON NEUMANN RÉSULTANTE S(ρ)
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">Formule : -Σ λ_i log₂ λ_i</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-mono font-black text-indigo-400">
                            {quantumCalculations.vonNeumannEntropy.toFixed(5)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">Sh/Vn Entropie</span>
                        </div>
                        
                        <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded border ${
                          quantumCalculations.vonNeumannEntropy < 0.2 
                            ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40' 
                            : quantumCalculations.vonNeumannEntropy < 0.6 
                            ? 'bg-yellow-950/50 text-yellow-400 border-yellow-800/40' 
                            : 'bg-red-950/50 text-red-400 border-red-800/40'
                        }`}>
                          {quantumCalculations.vonNeumannEntropy < 0.2 ? 'Stabilité Forte' :
                           quantumCalculations.vonNeumannEntropy < 0.6 ? 'Superposition' : 'Incertitude Critique'}
                        </span>
                      </div>

                      {/* Dynamic Quantum State Interpretation */}
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-900 text-[11px] font-sans text-slate-300 leading-normal">
                        {quantumCalculations.vonNeumannEntropy < 0.2 ? (
                          <span className="text-emerald-400">🟢 État de Décision Cohérent. Les interférences de bruit sont négligeables. Confiance de transition maximale. Le système converge fermement.</span>
                        ) : quantumCalculations.vonNeumannEntropy < 0.6 ? (
                          <span className="text-yellow-400">🟡 État de Superposition Intermédiaire. Le réseau subit des perturbations modérées. Un filtrage de Kalman ou un backtrack préventif est recommandé pour minimiser l'entropie résiduelle.</span>
                        ) : (
                          <span className="text-red-400">🔴 État Hautement Entropique (Bruit dominant). Décohérence critique du réseau de données. Risque de collision informationnelle élevé. Backtrack de sécurité fortement conseillé.</span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
