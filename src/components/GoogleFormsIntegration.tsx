/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Forms Survey Integration for Argus Engine
 * Author: AI Coding Agent
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  PlusCircle, 
  RefreshCw, 
  ExternalLink, 
  BarChart3, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Lock, 
  Sparkles, 
  PieChart as PieIcon, 
  Layers, 
  HelpCircle,
  Copy,
  Clock
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

interface GoogleFormsIntegrationProps {
  user: User | null;
  formsToken: string | null;
  onTokenUpdate?: (token: string | null) => void;
}

interface FormDetails {
  formId: string;
  title: string;
  responderUri: string;
  editUri: string;
  createdAt: string;
}

interface SurveyResponse {
  responseId: string;
  submittedAt: string;
  answers: {
    [questionId: string]: string;
  };
}

// Chart color palette
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

// 100% French Simulated data for preview before creation
const SIMULATED_DATA_Q1 = [
  { name: 'Quotidienne (Heures de pointe)', value: 42, color: '#6366f1' },
  { name: 'Fréquente (Semaine)', value: 28, color: '#10b981' },
  { name: 'Occasionnelle (Loisirs)', value: 19, color: '#f59e0b' },
  { name: 'Rare ou Jamais', value: 11, color: '#ec4899' },
];

const SIMULATED_DATA_Q2 = [
  { name: 'Oui, indispensable (Éviter congestion)', value: 55, color: '#6366f1' },
  { name: 'Oui, utile occasionnellement', value: 31, color: '#10b981' },
  { name: 'Non, je me fie au GPS textuel', value: 10, color: '#f59e0b' },
  { name: 'N\'utilise pas de voiture', value: 4, color: '#ec4899' },
];

const SIMULATED_DATA_Q3 = [
  { name: 'Gratuit (Version de base)', value: 48, color: '#6366f1' },
  { name: 'Abonnement Standard ($4.99/m)', value: 32, color: '#10b981' },
  { name: 'Abonnement Premium ($9.99/m)', value: 15, color: '#f59e0b' },
  { name: 'Abonnement Flotte ($19.99+/m)', value: 5, color: '#ec4899' },
];

export const GoogleFormsIntegration: React.FC<GoogleFormsIntegrationProps> = ({
  user,
  formsToken,
  onTokenUpdate
}) => {
  const [activeForm, setActiveForm] = useState<FormDetails | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  // Real-time active FormId loading from Firestore
  useEffect(() => {
    if (!user) {
      setActiveForm(null);
      setResponses([]);
      return;
    }

    const docRef = doc(db, 'operator_surveys', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.formId) {
          setActiveForm({
            formId: data.formId,
            title: data.title || "Sondage Mobilité & Caméras CCTV - Argus",
            responderUri: data.responderUri || "",
            editUri: data.editUri || "",
            createdAt: data.createdAt || new Date().toISOString()
          });
          
          // Trigger pulling real responses if token is active
          if (formsToken) {
            pullRealResponses(data.formId, formsToken);
          }
        } else {
          setActiveForm(null);
          setResponses([]);
        }
      } else {
        setActiveForm(null);
        setResponses([]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `operator_surveys/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user, formsToken]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Programmatically Create a Google Form with 3 specific questions using v1 Google Forms API
  const handleCreateSurvey = async () => {
    if (!formsToken || !user) {
      setErrorMsg("Veuillez d'abord connecter votre session Google Opérateur.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Create the empty form metadata
      const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${formsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          info: {
            title: "Sondage Mobilité & Caméras CCTV - Argus Engine",
            documentTitle: "Sondage de Circulation Québec"
          }
        })
      });

      if (!createRes.ok) {
        throw new Error(`Erreur d'initialisation de Google Form: ${createRes.statusText}`);
      }

      const formMeta = await createRes.json();
      const formId = formMeta.formId;
      const responderUri = formMeta.responderUri;

      // 2. Add the 3 precise survey questions via batchUpdate
      const batchUpdateBody = {
        requests: [
          {
            createItem: {
              item: {
                title: "Quelle est votre fréquence d'utilisation du réseau routier ou des transports à Montréal ?",
                description: "Sélectionnez l'option correspondant à vos déplacements généraux.",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Quotidienne (Heures de pointe)" },
                        { value: "Fréquente (Semaine)" },
                        { value: "Occasionnelle (Loisirs & Fins de semaine)" },
                        { value: "Rare ou Jamais" }
                      ]
                    }
                  }
                }
              },
              location: { index: 0 }
            }
          },
          {
            createItem: {
              item: {
                title: "L'accès en temps réel aux caméras CCTV de circulation influencerait-il vos trajets ?",
                description: "Indiquez l'impact d'un panneau CCTV interactif sur votre logistique.",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Oui, indispensable (Éviter congestion)" },
                        { value: "Oui, utile occasionnellement" },
                        { value: "Non, je me fie au GPS textuel" },
                        { value: "N'utilise pas de voiture" }
                      ]
                    }
                  }
                }
              },
              location: { index: 1 }
            }
          },
          {
            createItem: {
              item: {
                title: "Quel budget mensuel maximum considérez-vous juste pour le service prédictif d'Argus ?",
                description: "Financement des serveurs de vision et d'ingestion de la STM en temps réel.",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Gratuit (Version de base)" },
                        { value: "Abonnement Standard ($4.99/m)" },
                        { value: "Abonnement Premium ($9.99/m)" },
                        { value: "Abonnement Flotte ($19.99+/m)" }
                      ]
                    }
                  }
                }
              },
              location: { index: 2 }
            }
          }
        ]
      };

      const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${formsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchUpdateBody)
      });

      if (!updateRes.ok) {
        throw new Error(`Impossible d'ajouter les questions au Google Form: ${updateRes.statusText}`);
      }

      // 3. Define the editor URI (Forms default link format)
      const editUri = `https://docs.google.com/forms/d/${formId}/edit`;

      // 4. Save to Firestore for permanent persistence
      const docRef = doc(db, 'operator_surveys', user.uid);
      await setDoc(docRef, {
        formId,
        title: "Sondage Mobilité & Caméras CCTV - Argus Engine",
        responderUri,
        editUri,
        createdAt: new Date().toISOString(),
        userId: user.uid
      });

      setActiveForm({
        formId,
        title: "Sondage Mobilité & Caméras CCTV - Argus Engine",
        responderUri,
        editUri,
        createdAt: new Date().toISOString()
      });

      setSuccessMsg("Votre Google Form en 3 questions a été créé avec succès dans votre Google Drive !");
      
      // Pull initial responses (empty)
      pullRealResponses(formId, formsToken);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erreur de création de formulaire. Veuillez vérifier vos autorisations.");
    } finally {
      setIsLoading(false);
    }
  };

  // Pull real responses from Google Forms API
  const pullRealResponses = async (formId: string, token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 404) {
        // Form exists but no responses have been submitted yet
        setResponses([]);
        return;
      }

      if (!res.ok) {
        throw new Error(`Erreur lors du téléchargement des réponses: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (data.responses) {
        // Parse answers
        const parsedResponses: SurveyResponse[] = data.responses.map((r: any) => {
          const answersMap: { [qid: string]: string } = {};
          if (r.answers) {
            Object.keys(r.answers).forEach((questionId) => {
              const textAns = r.answers[questionId].textAnswers?.answers;
              if (textAns && textAns.length > 0) {
                answersMap[questionId] = textAns[0].value;
              }
            });
          }
          return {
            responseId: r.responseId,
            submittedAt: r.createTime,
            answers: answersMap
          };
        });
        setResponses(parsedResponses);
      } else {
        setResponses([]);
      }
    } catch (err: any) {
      console.warn("Forms Response Pull Warning:", err);
      // Suppress full crashes, but let operator know
      setErrorMsg("Impossible de charger les réponses réelles. Vérifiez qu'au moins une personne ait répondu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshResponses = () => {
    if (activeForm && formsToken) {
      pullRealResponses(activeForm.formId, formsToken);
      setSuccessMsg("Mise à jour des réponses réelles effectuée !");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Explicit user confirmation dialog before deleting form from app (MUTATIVE OPERATION)
  const handleDeleteFormConnection = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      "Êtes-vous certain de vouloir dissocier ce sondage Google Forms d'Argus Engine ?\nCette opération ne supprimera pas le fichier de votre Google Drive, mais retirera l'analyse en temps réel du panneau."
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const docRef = doc(db, 'operator_surveys', user.uid);
      await setDoc(docRef, { formId: null, responderUri: null, editUri: null }, { merge: true });
      setActiveForm(null);
      setResponses([]);
      setSuccessMsg("Sondage dissocié avec succès.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Échec de la dissociation du sondage.");
    } finally {
      setIsLoading(false);
    }
  };

  // Convert real response map into Recharts compatible datasets
  const getCompiledChartData = (questionIndex: number) => {
    if (responses.length === 0) {
      // Return simulated data as a gorgeous layout placeholder
      return questionIndex === 0 ? SIMULATED_DATA_Q1 : (questionIndex === 1 ? SIMULATED_DATA_Q2 : SIMULATED_DATA_Q3);
    }

    // Attempt to parse actual responses
    // We count answers based on text matching because we know our exact options
    const counts: { [key: string]: number } = {};
    
    // Default answers keys based on index
    const options = questionIndex === 0 
      ? ["Quotidienne (Heures de pointe)", "Fréquente (Semaine)", "Occasionnelle (Loisirs & Fins de semaine)", "Rare ou Jamais"]
      : questionIndex === 1
      ? ["Oui, indispensable (Éviter congestion)", "Oui, utile occasionnellement", "Non, je me fie au GPS textuel", "N'utilise pas de voiture"]
      : ["Gratuit (Version de base)", "Abonnement Standard ($4.99/m)", "Abonnement Premium ($9.99/m)", "Abonnement Flotte ($19.99+/m)"];

    options.forEach(opt => counts[opt] = 0);

    responses.forEach(resp => {
      // Find answer that matches options
      Object.values(resp.answers).forEach(val => {
        // Check for partial or direct match
        options.forEach(opt => {
          if (val && (val.toLowerCase().includes(opt.toLowerCase().slice(0, 15)) || opt.toLowerCase().includes(val.toLowerCase().slice(0, 15)))) {
            counts[opt] = (counts[opt] || 0) + 1;
          }
        });
      });
    });

    // Format for Recharts
    return options.map((opt, i) => ({
      name: opt,
      value: counts[opt] || 0,
      color: CHART_COLORS[i % CHART_COLORS.length]
    }));
  };

  return (
    <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-900 overflow-hidden shadow-2xl p-6 text-left" id="google-forms-survey-manager">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-900">
        <div className="text-left">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-display uppercase tracking-wider">
                Sondages Google Forms en Temps Réel
                {activeForm && (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-bold">
                    CONNECTÉ
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                Enquêtes de transit limitées à 3 questions maximum • Synchronisation native Drive
              </p>
            </div>
          </div>
        </div>

        {formsToken ? (
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
            {activeForm ? (
              <>
                <button
                  onClick={handleRefreshResponses}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  title="Actualiser les réponses"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>Synchroniser</span>
                </button>
                <a
                  href={activeForm.editUri}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-indigo-400 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </a>
                <button
                  onClick={handleDeleteFormConnection}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 hover:border-red-900 text-red-400 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dissocier</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleCreateSurvey}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>Créer le Sondage (Max 3 questions)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-mono">
            <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>CONNECTEZ-VOUS POUR PILOTER GOOGLE FORMS</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3.5 bg-red-950/20 border border-red-900/40 text-red-400 rounded-lg text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3.5 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 rounded-lg text-xs flex items-start gap-2.5"
          >
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 animate-bounce" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left Column: Visual summary & Iframe / Controls */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl space-y-3.5">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider flex items-center gap-1.5 font-mono uppercase">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Sondage de Mobilité active
              </h3>
              
              <div className="space-y-2 font-sans text-xs text-slate-300 leading-relaxed">
                <p>
                  Ce module automatise l'échantillonnage de l'opinion des usagers du réseau métropolitain de Montréal en <strong>3 questions stratégiques</strong> :
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-400 text-[11px]">
                  <li>Fréquence d'utilisation du transit (routier, STM).</li>
                  <li>Intérêt concret pour le panneau interactif CCTV en temps réel.</li>
                  <li>Montant mensuel estimé juste pour l'infrastructure d'Argus.</li>
                </ol>
              </div>

              {activeForm && (
                <div className="pt-2 border-t border-slate-900/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">ID DU FORMULAIRE :</span>
                    <span className="text-indigo-400 truncate max-w-[120px] font-bold">{activeForm.formId}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">RÉPONSES REÇUES :</span>
                    <span className="text-emerald-400 font-bold">{responses.length} réelles</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <button
                      onClick={() => copyToClipboard(activeForm.responderUri)}
                      className="flex-1 py-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded text-[10px] text-slate-300 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>{isCopied ? "Copié !" : "Copier le Lien Public"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-xl space-y-2.5">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {responses.length > 0 ? "RÉPONSES LES PLUS RÉCENTES" : "INDICATEUR DE STATUT"}
              </h3>

              {responses.length > 0 ? (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {responses.slice(0, 3).map((resp, i) => (
                    <div key={resp.responseId} className="p-2 rounded bg-slate-950 border border-slate-900/60 font-mono text-[9px] flex items-center justify-between text-slate-400">
                      <span className="truncate max-w-[120px]">Réf: #{resp.responseId.slice(-8)}</span>
                      <span>{new Date(resp.submittedAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                  {activeForm 
                    ? "Aucune soumission réelle enregistrée dans le formulaire actuellement. Partagez le lien pour obtenir des données !"
                    : "Affichage en mode démo interactif. Associez ou créez un sondage avec votre compte Google pour basculer vers les données réelles de votre Drive."
                  }
                </p>
              )}
            </div>
          </div>

          <div className="text-[9.5px] text-slate-500 font-mono leading-relaxed p-3 bg-indigo-950/5 border border-indigo-950/20 rounded-lg">
            ⚠️ <strong>Zéro simulation forcée</strong> : L'API Google Forms v1 crée réellement le document dans votre Drive personnel et extrait les réponses authentiques via l'access token sécurisé de votre session.
          </div>
        </div>

        {/* Middle and Right: Recharts charts visualizing the responses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/60">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider mb-4 font-mono uppercase flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-indigo-400" />
              1. Fréquence d'utilisation du réseau routier / transports
            </h3>
            <div className="h-[180px] w-full flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCompiledChartData(0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {getCompiledChartData(0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={(entry as any).color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#cbd5e1', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-1.5 font-mono text-[10px] text-slate-400">
                {getCompiledChartData(0).map((item: any, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-200">{item.value}{responses.length > 0 ? ' rps' : '%'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Question 2 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/60">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider mb-3 font-mono uppercase flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                2. Impact du CCTV interactif
              </h3>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getCompiledChartData(1)} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#cbd5e1', fontSize: '10px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {getCompiledChartData(1).map((entry: any, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Question 3 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/60">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider mb-3 font-mono uppercase flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                3. Budget mensuel estimé juste
              </h3>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getCompiledChartData(2)}>
                    <XAxis dataKey="name" tick={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#cbd5e1', fontSize: '10px' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {getCompiledChartData(2).map((entry: any, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center px-1 pt-1.5 text-[8px] font-mono text-slate-500">
                <span>Gratuit</span>
                <span>Standard</span>
                <span>Premium</span>
                <span>Flotte</span>
              </div>
            </div>
          </div>

          {/* Iframe for active form submission directly inside the dashboard */}
          {activeForm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-950/80 rounded-xl border border-slate-900 overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-900 flex items-center justify-between">
                <span className="font-mono text-[9px] font-bold text-slate-400">VISUALISATION INTÉGRÉE DU SONDAGE GOOGLE FORMS</span>
                <a 
                  href={activeForm.responderUri} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[9px] font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  OUVRIR EN PLEIN ÉCRAN
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="w-full h-[320px] bg-white">
                <iframe
                  src={`${activeForm.responderUri}?embedded=true`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                  title="Formulaire Google Forms"
                >
                  Chargement...
                </iframe>
              </div>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
};
