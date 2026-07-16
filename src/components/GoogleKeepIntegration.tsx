/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  CloudLightning, 
  Sparkles, 
  RefreshCw, 
  FileText,
  Share2,
  Lock,
  Compass,
  CheckSquare,
  Bookmark,
  Calendar
} from 'lucide-react';
import { ToTAnalysisResult } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

interface GoogleKeepIntegrationProps {
  user: User | null;
  keepToken: string | null;
  decisionsArchive: ToTAnalysisResult[];
}

interface KeepNote {
  id: string;
  title: string;
  text: string;
  color?: 'default' | 'red' | 'amber' | 'blue' | 'green';
  isList?: boolean;
  listItems?: { text: string; checked: boolean }[];
  timestamp: string;
  isRealKeep?: boolean;
}

// Default simulated notes in French for the ARGUS tactical system
const DEFAULT_TACTICAL_NOTES: KeepNote[] = [
  {
    id: 'note-1',
    title: '📌 Protocole Transit LaSalle',
    text: 'En cas de blocage de l\'échangeur Turcot, activer la déviation terrestre par l\'Avenue Labatt et la route 138. Prioriser les conteneurs de fret aérien CYUL.',
    color: 'amber',
    timestamp: new Date().toISOString()
  },
  {
    id: 'note-2',
    title: '🚨 Fréquences d\'Urgence STM & VHF',
    text: 'Canal de transit principal : 158.450 MHz.\nCanal de liaison maritime Sophia : 162.025 MHz.\nEn cas d\'interruption métro ligne orange, utiliser le bus de secours articulé L99.',
    color: 'red',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'note-3',
    title: '✅ Check-list Certification D.U.R.',
    text: 'Vérifier la conformité de chaque flux ToT.',
    color: 'green',
    isList: true,
    listItems: [
      { text: 'Triangulation de la source CCTV validée', checked: true },
      { text: 'Score d\'entropie quantique inférieur à 0.45', checked: true },
      { text: 'Murs de Chine agentiques isolés et étanches', checked: false },
      { text: 'Rapport de diagnostic 7 jours exporté', checked: false }
    ],
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'note-4',
    title: '🚢 Paramètres d\'Arrimage Maritime',
    text: 'Tirant d\'eau optimal du bassin principal : 11.3m.\nCapacité de levage grue portuaire G-102 : 45 tonnes.\nCoefficient de marée LaSalle stabilisé.',
    color: 'blue',
    timestamp: new Date(Date.now() - 14400000).toISOString()
  }
];

export const GoogleKeepIntegration: React.FC<GoogleKeepIntegrationProps> = ({
  user,
  keepToken,
  decisionsArchive
}) => {
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Note Creation Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newText, setNewText] = useState<string>('');
  const [newColor, setNewColor] = useState<'default' | 'red' | 'amber' | 'blue' | 'green'>('default');
  const [newIsList, setNewIsList] = useState<boolean>(false);
  const [newTodoItems, setNewTodoItems] = useState<string>('');

  // Delete note confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Active sync state indicators
  const [keepSyncStatus, setKeepSyncStatus] = useState<'unlinked' | 'synced' | 'local_cloud'>('local_cloud');
  const [activeTab, setActiveTab] = useState<'notes' | 'export_tot'>('notes');

  const fetchNotes = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const idToken = await user.getIdToken();
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${idToken}`,
      };
      if (keepToken) {
        headers['X-Google-Access-Token'] = keepToken;
      }

      const res = await fetch('/api/keep/notes', { headers });
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes.map((n: any) => ({
          id: n.id,
          title: n.title,
          text: n.body,
          color: n.isSynced ? 'green' : 'default',
          timestamp: n.createdAt || n.updatedAt || new Date().toISOString(),
          isRealKeep: !!n.googleKeepId,
        })));
        if (data.googleKeepError) {
          setKeepSyncStatus('local_cloud');
        } else if (keepToken) {
          setKeepSyncStatus('synced');
        } else {
          setKeepSyncStatus('local_cloud');
        }
      } else {
        setErrorMsg(data.error || 'Impossible de charger les notes depuis le serveur.');
      }
    } catch (err: any) {
      console.error('Failed to fetch notes from backend:', err);
      setErrorMsg('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load user notes from full-stack backend
  useEffect(() => {
    if (!user) {
      setNotes(DEFAULT_TACTICAL_NOTES);
      setKeepSyncStatus('local_cloud');
      return;
    }
    fetchNotes();
  }, [user, keepToken]);

  const syncWithRealGoogleKeep = async () => {
    await fetchNotes();
    showTemporarySuccess('Notes synchronisées avec le service Google Keep !');
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle && !newText && !newTodoItems) {
      setErrorMsg('Veuillez remplir au moins le titre ou le contenu.');
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);

    let bodyContent = newText;
    if (newIsList && newTodoItems) {
      bodyContent = newTodoItems;
    }

    try {
      const idToken = await user ? await user.getIdToken() : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      if (keepToken) {
        headers['X-Google-Access-Token'] = keepToken;
      }

      const res = await fetch('/api/keep/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTitle || 'Note sans titre',
          body: bodyContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewTitle('');
        setNewText('');
        setNewColor('default');
        setNewIsList(false);
        setNewTodoItems('');
        
        showTemporarySuccess('Note créée avec succès !');
        await fetchNotes();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la création de la note.');
      }
    } catch (err: any) {
      console.error('Error creating note:', err);
      setErrorMsg('Erreur lors de la sauvegarde de la note.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (id: string, title: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteNote = async () => {
    if (!deleteConfirmId) return;
    
    setIsLoading(true);
    setErrorMsg(null);

    const targetNote = notes.find(n => n.id === deleteConfirmId);
    const noteTitle = targetNote ? targetNote.title : 'Note';

    try {
      const idToken = await user ? await user.getIdToken() : null;
      const headers: Record<string, string> = {};
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      if (keepToken) {
        headers['X-Google-Access-Token'] = keepToken;
      }

      const res = await fetch(`/api/keep/notes/${deleteConfirmId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();
      if (data.success) {
        showTemporarySuccess(`Note "${noteTitle}" supprimée.`);
        await fetchNotes();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la suppression.');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setErrorMsg('Impossible de supprimer la note.');
    } finally {
      setDeleteConfirmId(null);
      setIsLoading(false);
    }
  };

  const handleExportToKeep = async (decision: ToTAnalysisResult) => {
    setIsLoading(true);
    setErrorMsg(null);

    const title = `📊 Décision ToT ARGUS : ${decision.feedTitle}`;
    
    const formattedBranches = decision.branches
      .map(b => `* ${b.name} (Confiance: ${b.evaluationScore}%, Entropie: ${(b.uncertainty / 100).toFixed(2)}) - ${b.description}`)
      .join('\n\n');

    const formattedText = `### ANALYSE LOGISTIQUE TACTIQUE ToT
*   **Incident d'origine :** ${decision.feedTitle} (${decision.feedType})
*   **Horodatage :** ${new Date(decision.timestamp).toLocaleString('fr-FR')}
*   **Score d'Entropie Quantique :** ${decision.entropyScore.toFixed(3)} H(x)
*   **Moteur d'analyse :** Sophia (ToT Récursif)

### COMPORTEMENT DU RAISONNEMENT (BRANCHES ToT)
${formattedBranches}

### DÉCISION SYSTÉMIQUE FINALE
> ${decision.finalDecision}

---
Certifié D.U.R. • Consortium ARGUS.`;

    try {
      const idToken = await user ? await user.getIdToken() : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      if (keepToken) {
        headers['X-Google-Access-Token'] = keepToken;
      }

      const res = await fetch('/api/keep/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          body: formattedText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showTemporarySuccess(`Décision "${decision.feedTitle}" exportée avec succès !`);
        await fetchNotes();
      } else {
        setErrorMsg(data.error || 'Erreur lors de l\'export de la décision.');
      }
    } catch (err) {
      console.error('Error exporting ToT to Keep:', err);
      setErrorMsg('Erreur lors de l\'export de la décision.');
    } finally {
      setIsLoading(false);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-950/20 border-red-900/40 hover:border-red-900/70 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.03)]';
      case 'amber':
        return 'bg-amber-950/20 border-amber-900/40 hover:border-amber-900/70 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.03)]';
      case 'blue':
        return 'bg-blue-950/20 border-blue-900/40 hover:border-blue-900/70 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.03)]';
      case 'green':
        return 'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-900/70 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.03)]';
      default:
        return 'bg-slate-900/30 border-slate-900 hover:border-slate-800 text-slate-100';
    }
  };

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 flex flex-col h-[600px] shadow-lg relative overflow-hidden"
      id="argus-google-keep-container"
    >
      {/* Header and Sync indicator */}
      <div className="p-4 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <BookOpen className="w-4 h-4 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Notes Tactiques & Google Keep
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              CONSIGNATION LOGISTIQUE • SOPHIA ToT SYNCHRONISATION
            </p>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] font-bold">
          {keepSyncStatus === 'synced' ? (
            <span className="flex items-center gap-1 bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API KEEP SYNCHRONISÉE
            </span>
          ) : (
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1 bg-indigo-950/40 text-indigo-300 border border-indigo-900/40 px-2 py-0.5 rounded cursor-help" title="Google restreint l'API Google Keep aux comptes professionnels Workspace. Vos notes sont sauvegardées en toute sécurité sur Firestore Cloud.">
                <CloudLightning className="w-3 h-3 text-indigo-400" />
                FIRESTORE CLOUD ACTIF
              </span>
            </div>
          )}

          {user && (
            <button
              onClick={syncWithRealGoogleKeep}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded transition-all cursor-pointer"
              title="Actualiser la synchronisation"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900/80 bg-slate-950/20">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'notes'
              ? 'border-yellow-500 text-yellow-400 bg-yellow-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>BLOC-NOTES MILITAIRE ({notes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('export_tot')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'export_tot'
              ? 'border-yellow-500 text-yellow-400 bg-yellow-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>EXPORTER DECISIONS ToT</span>
        </button>
      </div>

      {/* Main Panel Body */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4">
        
        {/* Alerts or Success triggers */}
        <AnimatePresence>
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-2.5 bg-emerald-950/30 border border-emerald-900/40 text-[10px] text-emerald-300 font-mono rounded-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-2.5 bg-red-950/20 border border-red-900/30 text-[10px] text-red-300 font-mono rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'notes' ? (
          <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
            
            {/* Left Column: List of notes */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-slate-500 tracking-wider font-bold uppercase flex items-center gap-1">
                  <Compass className="w-3 h-3 text-yellow-500" />
                  <span>CONSIGNES SÉCURISÉES SUR CLOUD</span>
                </span>
                {!user && (
                  <span className="text-[8px] font-mono text-slate-500 italic bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Mode invité</span>
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 bg-slate-950/10 rounded-xl border border-slate-900/60">
                  <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                  <span className="text-[9px] text-slate-500 font-mono mt-2">Chargement de Keep...</span>
                </div>
              ) : notes.length === 0 ? (
                <div className="p-8 rounded-xl border border-slate-900 bg-slate-950/10 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-700" />
                  <span className="text-[10px] text-slate-500 font-mono">Aucune note tactique consignée</span>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
                  {notes.map((note) => (
                    <div 
                      key={note.id} 
                      className={`p-3 rounded-xl border transition-all text-left flex flex-col space-y-1.5 relative group ${getColorClasses(note.color)}`}
                    >
                      {/* Delete button (displays confirmation modal overlay) */}
                      <button
                        onClick={() => handleDeleteNote(note.id, note.title)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 bg-slate-950/65 border border-slate-800/40 text-slate-400 hover:text-red-400 rounded transition-all cursor-pointer"
                        title="Supprimer la note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <div className="flex items-start justify-between pr-6 gap-2">
                        <h4 className="font-bold text-[10.5px] tracking-wide uppercase font-mono leading-tight">
                          {note.title}
                        </h4>
                        <span className="text-[8px] font-mono opacity-50 shrink-0">
                          {new Date(note.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>

                      {note.isList ? (
                        <div className="space-y-1 pt-1">
                          {note.listItems?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[9px] font-mono">
                              <CheckSquare className={`w-3 h-3 ${item.checked ? 'text-emerald-400 fill-emerald-950/30' : 'text-slate-500'}`} />
                              <span className={item.checked ? 'line-through text-slate-500' : 'text-slate-300'}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[9px] opacity-80 whitespace-pre-wrap leading-normal font-mono">
                          {note.text}
                        </p>
                      )}

                      {/* Real Keep logo tag if synced */}
                      {note.isRealKeep && (
                        <div className="pt-1.5 flex justify-end">
                          <span className="bg-yellow-950/30 text-yellow-500 text-[6.5px] font-mono font-extrabold px-1.5 py-0.2 rounded border border-yellow-800/30 tracking-wider">
                             GOOGLE KEEP LIVE
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Add Note Form */}
            <div className="flex flex-col space-y-3 pt-2">
              <span className="text-[9px] font-mono text-slate-500 tracking-wider font-bold uppercase flex items-center gap-1">
                <Plus className="w-3 h-3 text-yellow-500" />
                <span>NOUVELLE CONSIGNE TACTIQUE</span>
              </span>

              <form 
                onSubmit={handleCreateNote}
                className="bg-slate-950/50 rounded-xl border border-slate-900 p-3.5 space-y-3 flex flex-col justify-between flex-1"
              >
                <div className="space-y-2.5">
                  <div>
                    <input
                      type="text"
                      placeholder="Titre de la consigne (ex: Déviation A-15)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-600 text-[10.5px] font-mono font-semibold"
                    />
                  </div>

                  {/* Toggle checklist type */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewIsList(!newIsList)}
                      className={`px-2.5 py-1 rounded font-mono text-[8.5px] border font-bold transition-all ${
                        newIsList
                          ? 'bg-yellow-950/40 text-yellow-400 border-yellow-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {newIsList ? '📋 MODE CHECK-LIST ACTIVE' : '📝 BASCULER EN CHECK-LIST'}
                    </button>
                  </div>

                  {newIsList ? (
                    <div>
                      <textarea
                        rows={3}
                        placeholder="Entrez un élément par ligne pour générer la check-list"
                        value={newTodoItems}
                        onChange={(e) => setNewTodoItems(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-yellow-600 text-[9.5px] font-mono h-[90px] resize-none leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div>
                      <textarea
                        rows={3}
                        placeholder="Rédigez la consigne opérationnelle ici..."
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-yellow-600 text-[9.5px] font-mono h-[90px] resize-none leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Color picker */}
                  <div className="space-y-1">
                    <span className="text-[7.5px] font-mono text-slate-500 font-extrabold tracking-wider uppercase">Niveau de Sévérité / Tag Visuel :</span>
                    <div className="flex gap-2.5 pt-0.5">
                      {(['default', 'red', 'amber', 'blue', 'green'] as const).map((color) => {
                        const bgMap = {
                          default: 'bg-slate-850 border-slate-700',
                          red: 'bg-red-500/20 border-red-500/40',
                          amber: 'bg-amber-500/20 border-amber-500/40',
                          blue: 'bg-blue-500/20 border-blue-500/40',
                          green: 'bg-emerald-500/20 border-emerald-500/40'
                        };
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewColor(color)}
                            className={`w-4 h-4 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${bgMap[color]} ${
                              newColor === color ? 'scale-125 border-yellow-400' : 'scale-100'
                            }`}
                            title={`Niveau ${color}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 bg-yellow-950 text-yellow-300 border border-yellow-800 hover:bg-yellow-900/60 hover:border-yellow-700 font-mono text-[9.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-yellow-950/10 cursor-pointer pt-3"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-yellow-300" />
                      <span>CONSIGNATION DE LA NOTE...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>ENREGISTRER LA NOTE TACTIQUE</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Decision Export Tab */
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-500 tracking-wider font-bold uppercase">
                EXPORTER DES RAISONNEMENTS DE SOPHIA ToT VERS COMPTE GOOGLE
              </span>
              <span className="text-[8px] font-mono text-slate-500 font-semibold text-yellow-500 bg-yellow-950/10 px-1.5 py-0.5 rounded border border-yellow-900/10">
                1-Clic Exportation
              </span>
            </div>

            {decisionsArchive.length === 0 ? (
              <div className="p-12 rounded-xl border border-slate-900 bg-slate-950/10 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                <Sparkles className="w-6 h-6 text-slate-700 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-mono max-w-sm">
                  Aucun rapport de décision ToT n'a été mémorisé en base pour le moment. Analysez un incident dans l'orchestrateur ARGUS ci-dessus.
                </span>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
                {decisionsArchive.map((decision) => (
                  <div 
                    key={decision.id}
                    className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl hover:border-slate-850 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                  >
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          decision.feedType === 'STM' ? 'bg-emerald-400' :
                          decision.feedType === 'AVIATION' ? 'bg-indigo-400' : 'bg-blue-400'
                        }`} />
                        <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">
                          {decision.feedTitle}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[8px] text-slate-500 font-semibold leading-none">
                        <span>ENTROPIE : {decision.entropyScore.toFixed(3)} H(x)</span>
                        <span>•</span>
                        <span>{decision.branches.length} BRANCHES ToT</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{new Date(decision.timestamp).toLocaleTimeString('fr-FR')}</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExportToKeep(decision)}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 bg-yellow-950/20 hover:bg-yellow-950 hover:text-yellow-300 text-yellow-400/80 border border-yellow-900/30 hover:border-yellow-800 font-mono text-[9px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>EXPORTER VERS KEEP / FIRESTORE</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Overlay (Mandatory UX Dialog) */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-20"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-red-950 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-red-950/40 border border-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                  Confirmer la suppression ?
                </h4>
                <p className="text-[9.5px] text-slate-400 leading-normal font-mono">
                  Êtes-vous sûr de vouloir supprimer définitivement cette note tactique ? Cette action effacera les données associées de Firestore (et de Keep si la synchronisation bidirectionnelle est active).
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white font-mono text-[9px] font-bold rounded-lg border border-slate-800 transition-all cursor-pointer"
                >
                  ANNULER
                </button>
                <button
                  onClick={confirmDeleteNote}
                  className="flex-1 py-2 bg-red-950 hover:bg-red-900 text-red-200 hover:text-red-100 font-mono text-[9px] font-bold rounded-lg border border-red-800 transition-all cursor-pointer animate-pulse hover:animate-none"
                >
                  CONFIRMER
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
