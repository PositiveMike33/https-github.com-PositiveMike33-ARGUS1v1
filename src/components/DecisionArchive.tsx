/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ToTAnalysisResult } from '../types';
import { 
  Archive, 
  Trash2, 
  Bus, 
  Plane, 
  Ship, 
  Activity,
  History,
  Camera,
  Download,
  FileDown,
  Clock,
  Calendar,
  AlertTriangle,
  X
} from 'lucide-react';

interface DecisionArchiveProps {
  archive: ToTAnalysisResult[];
  onSelect: (result: ToTAnalysisResult) => void;
  onClearAll: () => void;
  selectedId?: string;
}

export const DecisionArchive: React.FC<DecisionArchiveProps> = ({
  archive,
  onSelect,
  onClearAll,
  selectedId,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d' | '30d' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const filteredArchive = useMemo(() => {
    if (timeRange === 'all') return archive;
    const now = Date.now();
    return archive.filter(dec => {
      const decTime = new Date(dec.timestamp).getTime();
      if (isNaN(decTime)) return true;
      
      if (timeRange === '24h') {
        return now - decTime <= 24 * 60 * 60 * 1000;
      }
      if (timeRange === '7d') {
        return now - decTime <= 7 * 24 * 60 * 60 * 1000;
      }
      if (timeRange === '30d') {
        return now - decTime <= 30 * 24 * 60 * 60 * 1000;
      }
      if (timeRange === 'custom') {
        let match = true;
        if (startDate) {
          match = match && decTime >= new Date(startDate).getTime();
        }
        if (endDate) {
          match = match && decTime <= new Date(endDate).getTime();
        }
        return match;
      }
      return true;
    });
  }, [archive, timeRange, startDate, endDate]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'STM':
        return <Bus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'AVIATION':
        return <Plane className="w-3.5 h-3.5 text-sky-400" />;
      case 'MARITIME':
        return <Ship className="w-3.5 h-3.5 text-amber-400" />;
      case 'CCTV':
        return <Camera className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const exportAllAsJSON = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (archive.length === 0) return;
    const jsonString = JSON.stringify(archive, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `argus_archive_tot_complet_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportFilteredAsJSON = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filteredArchive.length === 0) return;
    const jsonString = JSON.stringify(filteredArchive, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `argus_archive_tot_filtre_${timeRange}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportSingleAsJSON = (dec: ToTAnalysisResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const jsonString = JSON.stringify(dec, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `argus_tot_decision_${dec.id}_${new Date(dec.timestamp).toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (archive.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres contextuelles pour exporter en PDF.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>ARGUS - Rapport Historique des Décisions (ToT)</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #1e293b; background-color: #fff; line-height: 1.5; }
            h1 { font-size: 24px; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
            h2 { font-size: 13px; color: #64748b; margin-top: -15px; margin-bottom: 30px; font-family: monospace; letter-spacing: 0.02em; }
            .decision-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
            .title { font-weight: bold; font-size: 16px; color: #0f172a; }
            .type-tag { padding: 3px 8px; font-size: 11px; font-weight: bold; font-family: monospace; border-radius: 4px; border: 1px solid #cbd5e1; display: inline-block; }
            .type-STM { background-color: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
            .type-AVIATION { background-color: #f0f9ff; border-color: #bae6fd; color: #075985; }
            .type-MARITIME { background-color: #fffbeb; border-color: #fde68a; color: #78350f; }
            .type-CCTV { background-color: #f5f3ff; border-color: #ddd6fe; color: #5b21b6; }
            .timestamp { font-size: 12px; color: #64748b; font-family: monospace; }
            .final-decision { font-size: 14px; font-style: italic; background-color: #f8fafc; padding: 12px; border-left: 4px solid #4f46e5; margin: 15px 0; color: #334155; }
            .meta-info { display: flex; gap: 20px; font-size: 11px; font-family: monospace; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
            .meta-item strong { color: #334155; }
            .branches-section { margin-top: 15px; }
            .branches-title { font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 10px; font-family: monospace; letter-spacing: 0.05em; }
            .branch-item { font-size: 12px; margin-bottom: 12px; padding-left: 12px; border-left: 2px solid #e2e8f0; }
            .branch-header { display: flex; justify-content: space-between; font-weight: 600; color: #1e293b; margin-bottom: 3px; }
            .branch-desc { color: #475569; font-size: 12px; }
            .branch-rec { font-style: italic; color: #4f46e5; margin-top: 4px; font-size: 11.5px; font-family: monospace; }
            .cctv-report { background-color: #faf5ff; border: 1px dashed #d8b4fe; padding: 12px; border-radius: 6px; margin-top: 15px; font-size: 12px; }
            .cctv-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; margin-top: 8px; }
            .cctv-block { background: #fff; padding: 8px; border: 1px solid #f3e8ff; border-radius: 4px; }
            .cctv-label { font-size: 10px; font-weight: bold; color: #7c3aed; font-family: monospace; text-transform: uppercase; }
            .footer { font-size: 11px; text-align: center; color: #94a3b8; margin-top: 50px; font-family: monospace; border-t: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>Rapport de Décisions ToT - Projet ARGUS</h1>
          <h2>Généré le : ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Montreal' })} (Heure de l'Est)</h2>
          ${archive.map(dec => `
            <div class="decision-card">
              <div class="header-row">
                <div>
                  <span class="type-tag type-${dec.feedType}">${dec.feedType}</span>
                  <span class="title" style="margin-left: 10px;">${dec.feedTitle}</span>
                </div>
                <span class="timestamp">${new Date(dec.timestamp).toLocaleString('fr-CA', { timeZone: 'America/Montreal' })}</span>
              </div>
              
              <div class="final-decision">
                <strong>Décision Stratégique Globale (Standard D.U.R.) :</strong><br/>
                "${dec.finalDecision}"
              </div>

              <div class="meta-info">
                <div class="meta-item">ID Signature : <strong>${dec.id}</strong></div>
                <div class="meta-item">Entropie Quantique : <strong>${dec.entropyScore} bits</strong></div>
                <div class="meta-item">Latence d'Analyse : <strong>${dec.durationMs} ms</strong></div>
              </div>

              ${dec.feedType === 'CCTV' && dec.cctvParsing ? `
                <div class="cctv-report">
                  <div style="font-weight: bold; color: #6d28d9; font-family: monospace; text-transform: uppercase; font-size: 11px; margin-bottom: 5px;">
                    RAPPORT D'ANALYSE OPTIQUE OMNI-VISION (CCTV_AGENT)
                  </div>
                  <div class="cctv-grid">
                    <div class="cctv-block">
                      <div class="cctv-label">1. Étape d'Observation (Parsing)</div>
                      <div style="margin-top: 3px;">${dec.cctvParsing}</div>
                    </div>
                    <div class="cctv-block">
                      <div class="cctv-label">2. Acteurs & Contextes (Identification)</div>
                      <div style="margin-top: 3px;">${dec.cctvIdentification}</div>
                    </div>
                    <div class="cctv-block">
                      <div class="cctv-label">3. Jugement & Triangulation</div>
                      <div style="margin-top: 3px;">${dec.cctvJudgment}</div>
                    </div>
                    <div class="cctv-block">
                      <div class="cctv-label">Statut Triangulation & Classification</div>
                      <div style="margin-top: 3px; font-weight: 600;">
                        Statut : <span style="color: #059669;">${dec.cctvTriangulationStatus}</span><br/>
                        Classification : <span style="color: ${dec.cctvFinalClassification === 'MENACE' ? '#dc2626' : '#d97706'};">${dec.cctvFinalClassification}</span>
                      </div>
                    </div>
                  </div>
                  <div style="margin-top: 8px; font-weight: 500; border-top: 1px solid #f3e8ff; padding-top: 8px; color: #5b21b6;">
                    Action Recommandée : ${dec.cctvActionRecommandee}
                  </div>
                </div>
              ` : ''}

              <div class="branches-section">
                <div class="branches-title">Arbre de Raisonnement Récursif (Branches ToT) :</div>
                ${dec.branches ? dec.branches.map((b, idx) => `
                  <div class="branch-item">
                    <div class="branch-header">
                      <span>${b.name}</span>
                      <span style="color: #4f46e5; font-family: monospace; font-size: 11px;">
                        Menace: ${b.evaluationScore}% | Bruit: ${b.uncertainty}%
                      </span>
                    </div>
                    <div class="branch-desc">${b.description}</div>
                    <div class="branch-rec">Directive : ${b.recommendation}</div>
                    ${b.cascadingRisks && b.cascadingRisks.length > 0 ? `
                      <div style="font-size: 10px; color: #dc2626; margin-top: 3px; font-weight: 500;">
                        Risques : ${b.cascadingRisks.join(' → ')}
                      </div>
                    ` : ''}
                  </div>
                `).join('') : '<div class="branch-item">Aucune branche de raisonnement détaillée</div>'}
              </div>
            </div>
          `).join('')}
          <div class="footer">
            Consortium de Sécurité ARGUS - Système d'Analyse ToT Hautement Sécurisé - Document Confidentiel Opérationnel
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div 
      className="rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 overflow-hidden shadow-2xl flex flex-col h-full"
      id="decision-archive-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="font-display font-semibold text-sm tracking-wide text-slate-100">
              _ARCHIVES_INFRASTRUCTURE
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              LOG HISTORIQUE DES DÉCISIONS ET CACHE D'ÉTAT
            </p>
          </div>
        </div>
        {archive.length > 0 && (
          <button 
            onClick={() => setShowConfirmModal(true)}
            className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            title="Effacer l'archive d'historique structurel."
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Effacer les logs</span>
          </button>
        )}
      </div>

      {/* Download Action Bar */}
      {archive.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/20 flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Télécharger :</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportAllAsJSON}
              className="text-[10px] font-mono bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded text-indigo-400 hover:text-indigo-300 transition-all flex items-center gap-1.5"
              title="Exporter l'archive complète au format JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON (Tout)</span>
            </button>
            {timeRange !== 'all' && (
              <button
                onClick={exportFilteredAsJSON}
                className="text-[10px] font-mono bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded text-indigo-300 hover:text-indigo-200 transition-all flex items-center gap-1.5 animate-fade-in"
                title="Exporter uniquement le filtre actif au format JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON (Filtré)</span>
              </button>
            )}
            <button
              onClick={exportAsPDF}
              className="text-[10px] font-mono bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1.5"
              title="Générer un rapport PDF imprimable"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF (Rapport)</span>
            </button>
          </div>
        </div>
      )}

      {/* Time-Range Picker / Sélecteur de Plage Temporelle */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/20 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>PLAGE TEMPORELLE :</span>
          </div>
          {timeRange !== 'all' && (
            <span className="text-indigo-400 font-bold bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-900/30 text-[9px]">
              {filteredArchive.length} / {archive.length} DÉC
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-5 gap-1">
          {([
            { id: 'all', label: 'TOUS' },
            { id: '24h', label: '24H' },
            { id: '7d', label: '7J' },
            { id: '30d', label: '30J' },
            { id: 'custom', label: 'PERSO' }
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTimeRange(opt.id)}
              className={`text-[9px] py-1 font-mono rounded text-center transition-all border ${
                timeRange === opt.id
                  ? 'bg-indigo-600/95 text-white border-indigo-500 font-semibold shadow-[0_0_8px_rgba(99,102,241,0.25)]'
                  : 'bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Inputs Personnalisés si 'custom' est sélectionné */}
        {timeRange === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1.5 duration-200">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-slate-500 block uppercase flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>Début :</span>
              </span>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 text-[10px] font-mono border border-slate-850 focus:border-indigo-500 focus:outline-none p-1 rounded text-slate-300"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-slate-500 block uppercase flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>Fin :</span>
              </span>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 text-[10px] font-mono border border-slate-850 focus:border-indigo-500 focus:outline-none p-1 rounded text-slate-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {filteredArchive.length > 0 ? (
          filteredArchive.map((dec) => {
            const isSelected = dec.id === selectedId;
            return (
              <div
                key={dec.id}
                onClick={() => onSelect(dec)}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-250 ${
                  isSelected 
                    ? 'bg-indigo-950/50 border-indigo-500/80 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                    : 'bg-slate-950 border-slate-850 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getIcon(dec.feedType)}
                    <span className="font-display font-semibold text-xs text-slate-200 truncate max-w-[150px]">
                      {dec.feedTitle}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">
                    {new Date(dec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-sans line-clamp-2 italic leading-relaxed mb-2">
                  "{dec.finalDecision}"
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-slate-900/60">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Entropie :</span>
                    <span className={`font-semibold ${
                      dec.entropyScore < 0.3 ? 'text-emerald-400' : dec.entropyScore < 0.6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {dec.entropyScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>{dec.durationMs}ms</span>
                    <span>•</span>
                    <span className="text-[9px] text-slate-400">
                      {dec.branches?.length || 3} br.
                    </span>
                    <span>•</span>
                    <button
                      onClick={(e) => exportSingleAsJSON(dec, e)}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 font-mono bg-slate-900/80 hover:bg-indigo-950/60 border border-slate-850 hover:border-indigo-900 px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 cursor-pointer"
                      title="Exporter cette analyse au format JSON"
                    >
                      <Download className="w-2.5 h-2.5" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : archive.length > 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center space-y-2 text-center py-6">
            <Clock className="w-8 h-8 text-slate-700 animate-pulse" />
            <div>
              <p className="text-xs text-slate-400 font-mono">Filtre sans résultat</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5 mx-auto font-sans leading-tight">
                Aucune décision enregistrée durant cette période de temps spécifiée.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center space-y-2 text-center py-6">
            <History className="w-8 h-8 text-slate-700" />
            <div>
              <p className="text-xs text-slate-400 font-mono">Archive vide</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5 mx-auto font-sans leading-tight">
                Les décisions synthétisées persisteront ici sous forme de piste d'audit.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="confirm-clear-archive-modal">
          <div className="bg-slate-900 border border-red-500/30 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-950/40 border border-red-800/40 rounded-lg text-red-400 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-mono font-bold text-sm tracking-wide text-white uppercase">
                  CONFIRMATION : PURGE DES ARCHIVES
                </h3>
                <p className="text-[10px] text-red-400 font-mono">
                  ACTION IRREVERSIBLE • PROTOCOLE PVA-100
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 font-sans leading-relaxed space-y-2">
              <p>
                Vous êtes sur le point de vider l'intégralité de l'historique des décisions enregistrées dans la base de données locale d'ARGUS (<span className="text-red-400 font-bold font-mono">{archive.length}</span> entrées).
              </p>
              <p className="bg-slate-950/50 p-2 rounded border border-slate-800/60 font-mono text-[10px] text-slate-400">
                ⚠️ Toutes les branches de raisonnement ToT, les rapports d'analyse optique CCTV, les métriques d'entropie quantique et la piste d'audit de l'infrastructure seront définitivement purgés.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 rounded text-xs font-mono border border-slate-850 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                ANNULER
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setShowConfirmModal(false);
                }}
                className="px-3.5 py-1.5 rounded text-xs font-mono font-bold bg-red-950 hover:bg-red-900 border border-red-800/60 text-red-300 hover:text-white transition-all shadow-[0_0_12px_rgba(239,68,68,0.15)] hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer"
              >
                CONFIRMER LA PURGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
