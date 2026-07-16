/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  FileText,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
  ArrowRight,
  FileDown,
  Sparkles
} from 'lucide-react';
import { db, loginWithGoogle } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface GoogleDriveIntegrationProps {
  user: FirebaseUser | null;
  driveToken: string | null;
  onTokenUpdate: (token: string | null) => void;
  currentResult: any | null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  modifiedTime: string;
}

export const GoogleDriveIntegration: React.FC<GoogleDriveIntegrationProps> = ({
  user,
  driveToken,
  onTokenUpdate,
  currentResult
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Log API call telemetry
  const logAPICall = useCallback(async (endpoint: string, status: number, size: string) => {
    if (!user) return;
    try {
      const logId = `drive-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'telemetry_logs', logId), {
        id: logId,
        endpoint: `drive.googleapis.com${endpoint}`,
        status,
        responseSize: size,
        timestamp: new Date().toISOString(),
        userId: user.uid
      });
    } catch (e) {
      console.warn('Could not write Drive API telemetry log:', e);
    }
  }, [user]);

  // Fetch files from Google Drive
  const fetchDriveFiles = useCallback(async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = encodeURIComponent("trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${queryParams}&pageSize=6&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,webViewLink,iconLink,modifiedTime)`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          onTokenUpdate(null);
          throw new Error('Votre session Google Drive a expiré. Veuillez vous reconnecter.');
        }
        throw new Error(`Erreur API Google Drive (${res.status})`);
      }

      const data = await res.json();
      logAPICall('/v3/files', 200, `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`);

      if (data && Array.isArray(data.files)) {
        setFiles(data.files);
      }
    } catch (err: any) {
      console.error('Failed to fetch Drive files:', err);
      setErrorMsg(err.message || 'Impossible de récupérer la liste des fichiers.');
    } finally {
      setIsLoading(false);
    }
  }, [logAPICall, onTokenUpdate]);

  // Sync files on token refresh
  useEffect(() => {
    if (driveToken && user) {
      fetchDriveFiles(driveToken);
    }
  }, [driveToken, user, fetchDriveFiles]);

  const handleOAuthConnect = async () => {
    if (isLinking) return;
    setIsLinking(true);
    try {
      const loginResult = await loginWithGoogle();
      if (loginResult && loginResult.accessToken) {
        onTokenUpdate(loginResult.accessToken);
        showTemporarySuccess('Authentification Google Drive effectuée avec succès !');
      }
    } catch (err: any) {
      console.error('Failed to link Drive credentials:', err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setErrorMsg('Bloqueur de popups actif. Veuillez autoriser les popups ou ouvrir l\'application dans un nouvel onglet.');
      } else {
        setErrorMsg(err.message || 'Échec de la connexion Google Drive.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Create & Export Active ToT Decision to Google Drive
  const handleExportDecision = async () => {
    if (!driveToken) return;
    if (!currentResult) {
      setErrorMsg("Aucune décision active à exporter. Veuillez d'abord analyser un incident.");
      return;
    }

    setIsExporting(true);
    setErrorMsg(null);
    try {
      const fileName = `ARGUS_Decision_${currentResult.specializedAgent?.codename || 'LOG'}_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
      
      const content = `# RAPPORT DE DÉCISION ARGUS • COGNITIVE SÉCURITÉ
Rapport généré le : ${new Date().toLocaleString('fr-CA')}
Agent Responsable : ${currentResult.specializedAgent?.name || 'Inconnu'} (${currentResult.specializedAgent?.codename || 'N/A'})

## SYNTHÈSE DE LA DIRECTIVE OPÉRATIONNELLE (PROTOCOLE D.U.R.)
${currentResult.finalDecision || 'N/A'}

## RAISONNEMENT DE L'ARBRE DE RÉFLEXION (Tree of Thoughts)
${currentResult.branches?.map((b: any, idx: number) => `
### Branche ${idx + 1} : ${b.name}
- **Score de Gravité/Urgence :** ${b.evaluationScore}/100
- **Indice d'Incertitude :** ${b.uncertainty}/100
- **Recommandation Stratégique :** ${b.recommendation}
- **Risques de Cascade associés :**
${b.cascadingRisks?.map((r: string) => `  * ${r}`).join('\n')}
`).join('\n')}

---
### PROTOCOLE DE TRIANGULATION TRIPLE-BLIND
Consensus Atteint : ${currentResult.tripleBlindVerification?.consensusAchieved ? 'OUI' : 'NON'}
Confirmation 100% : ${currentResult.tripleBlindVerification?.isVerifiedTrue100Percent ? 'OUI' : 'NON'}

Observations Autonomes :
- **Segment Physique (Sensors) :** ${currentResult.tripleBlindVerification?.dataSegment1_Status || 'VALIDÉ'} - ${currentResult.tripleBlindVerification?.dataSegment1_Details || ''}
- **Segment Historique (Congestion) :** ${currentResult.tripleBlindVerification?.dataSegment2_Status || 'VALIDÉ'} - ${currentResult.tripleBlindVerification?.dataSegment2_Details || ''}
- **Segment Régional (Ministères) :** ${currentResult.tripleBlindVerification?.dataSegment3_Status || 'VALIDÉ'} - ${currentResult.tripleBlindVerification?.dataSegment3_Details || ''}

*Document produit de manière autonome par le système de gestion cognitive de crise ARGUS.*`;

      // 1. Create file metadata
      const metadata = {
        name: fileName,
        mimeType: 'text/markdown',
      };

      // 2. Multi-part upload body
      const boundary = 'foo_bar_baz';
      const delimiter = `\n--${boundary}\n`;
      const closeDelimiter = `\n--${boundary}--`;

      const body = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\n\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/markdown; charset=UTF-8\n\n' +
        content +
        closeDelimiter;

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${driveToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: body
        }
      );

      if (!res.ok) {
        throw new Error(`Échec de création du fichier sur Drive (${res.status})`);
      }

      const fileData = await res.json();
      logAPICall('/v3/files?uploadType=multipart', 200, '2.4 KB');

      showTemporarySuccess(`Rapport "${fileName}" exporté avec succès sur Google Drive !`);
      setShowConfirmModal(false);
      fetchDriveFiles(driveToken);
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Échec lors de la création du rapport sur Drive.');
    } finally {
      setIsExporting(false);
    }
  };

  // Upload custom file from disk
  const handleUploadFile = async (file: File) => {
    if (!driveToken) return;

    // Direct confirmation from user before mutating/creating files
    const confirmUpload = window.confirm(`Voulez-vous téléverser le fichier "${file.name}" (${(file.size / 1024).toFixed(1)} Ko) sur votre Google Drive ?`);
    if (!confirmUpload) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const metadata = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
      };

      const boundary = 'upload_boundary';
      const delimiter = `\n--${boundary}\n`;
      const closeDelimiter = `\n--${boundary}--`;

      // Read file content as base64 or raw string
      const fileReader = new FileReader();
      const fileReadPromise = new Promise<string>((resolve) => {
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.readAsBinaryString(file);
      });

      const binaryContent = await fileReadPromise;

      const body = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\n\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${metadata.mimeType}\n` +
        'Content-Transfer-Encoding: binary\n\n' +
        binaryContent +
        closeDelimiter;

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${driveToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: body
        }
      );

      if (!res.ok) {
        throw new Error(`Échec du téléversement (${res.status})`);
      }

      const fileData = await res.json();
      logAPICall('/v3/files?uploadType=multipart', 200, `${(file.size / 1024).toFixed(2)} KB`);

      showTemporarySuccess(`Fichier "${file.name}" téléversé avec succès !`);
      fetchDriveFiles(driveToken);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Échec du téléversement du fichier.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Drag & Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  // Delete File with confirmation
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!driveToken) return;

    // Explicit confirmation dialog to comply with security/mutation guidelines
    const confirmed = window.confirm(`Êtes-vous absolument sûr de vouloir supprimer "${fileName}" de votre Google Drive ? Cette action est irréversible.`);
    if (!confirmed) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${driveToken}` }
      });

      if (!res.ok) {
        throw new Error(`Échec de la suppression (${res.status})`);
      }

      logAPICall(`/v3/files/${fileId}`, 200, '0.1 KB');
      showTemporarySuccess(`Fichier "${fileName}" supprimé.`);
      fetchDriveFiles(driveToken);
    } catch (err: any) {
      console.error('Delete file error:', err);
      setErrorMsg(err.message || 'Impossible de supprimer le fichier.');
    } finally {
      setIsLoading(false);
      setShowConfirmDeleteId(null);
    }
  };

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 flex flex-col h-[600px] shadow-lg relative overflow-hidden font-sans"
      id="argus-google-drive-container"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Folder className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Sauvegardes & Google Drive
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              ARCHIVES SÉCURISÉES • EXPORTATION DE DÉCISION TO ToT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] font-bold">
          {driveToken ? (
            <span className="flex items-center gap-1 bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DRIVE COMPATIBLE
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
              NON CONNECTÉ
            </span>
          )}

          {user && driveToken && (
            <button
              onClick={() => fetchDriveFiles(driveToken)}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded transition-all cursor-pointer disabled:opacity-30"
              title="Actualiser Google Drive"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4">
        
        {/* Success/Error Alerts */}
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

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-3">
            <Folder className="w-10 h-10 text-slate-600 animate-pulse" />
            <div>
              <p className="text-xs text-slate-400 font-medium font-mono">OPÉRATEUR DE SÉCURITÉ REQUIS</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal font-mono">
                Connectez-vous pour configurer l'archivage automatique ou l'exportation unilatérale de rapports opérationnels.
              </p>
            </div>
          </div>
        ) : !driveToken ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
            <Folder className="w-10 h-10 text-slate-700" />
            <div>
              <p className="text-xs text-slate-400 font-bold font-mono">LIAISON GOOGLE DRIVE DISPONIBLE</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal font-mono">
                Associez votre espace Google Drive sécurisé pour exporter des logs d'incidents critiques en un clic.
              </p>
            </div>
            <button
              onClick={handleOAuthConnect}
              disabled={isLinking}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-mono text-[10px] font-bold tracking-wider transition-all flex items-center gap-2 border border-indigo-500/20 cursor-pointer shadow-md"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>CONNEXION EN COURS...</span>
                </>
              ) : (
                <>
                  <Folder className="w-3.5 h-3.5" />
                  <span>ACTIVER L'ACCÈS GOOGLE DRIVE</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            
            {/* Quick Export Active Decision */}
            <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[8px] font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-900 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  DÉCISION ACTIVE ToT
                </span>
                <p className="text-[10px] text-slate-300 font-semibold truncate mt-1">
                  {currentResult ? `${currentResult.specializedAgent?.name || 'Directive'} • ${currentResult.finalDecision?.slice(0, 45)}...` : 'Aucune décision en mémoire.'}
                </p>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isExporting || !currentResult}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg font-mono text-[9px] font-bold border border-indigo-500/20 hover:border-indigo-500 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>EXPORTER RAISONNEMENT</span>
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed p-4 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                dragActive 
                  ? 'border-indigo-400 bg-indigo-500/10' 
                  : 'border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 hover:border-slate-750'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
              />
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              ) : (
                <Upload className="w-6 h-6 text-slate-500" />
              )}
              <div>
                <p className="text-[10px] font-bold text-slate-300 font-mono">TÉLÉVERSER UN COMPTE-RENDU</p>
                <p className="text-[8px] text-slate-500 font-mono mt-0.5">Glissez un document ici ou cliquez pour parcourir</p>
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 flex flex-col space-y-2">
              <span className="text-[9px] font-mono text-slate-500 tracking-wider font-bold uppercase">
                LOGS ET ARCHIVES DU COMPTE GOOGLE DRIVE :
              </span>

              {isLoading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                </div>
              ) : files.length === 0 ? (
                <div className="p-8 rounded-xl border border-slate-900 bg-slate-950/10 text-center flex flex-col items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-700 mb-1" />
                  <span className="text-[9px] text-slate-500 font-mono">Aucun fichier trouvé sur votre espace Drive.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {files.map((file) => (
                    <div 
                      key={file.id}
                      className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-lg flex items-center justify-between gap-3 text-left hover:border-slate-850 transition-all"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {file.iconLink ? (
                          <img 
                            src={file.iconLink} 
                            alt="" 
                            className="w-4 h-4 shrink-0 filter brightness-90 contrast-125"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0 font-mono">
                          <h4 className="text-[10px] font-bold text-slate-200 truncate pr-2 max-w-[200px] md:max-w-xs">
                            {file.name}
                          </h4>
                          <span className="text-[8px] text-slate-500">
                            Modifié : {new Date(file.modifiedTime).toLocaleDateString('fr-CA')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a 
                          href={file.webViewLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 text-slate-500 hover:text-indigo-400 border border-transparent hover:border-slate-800 hover:bg-slate-900 rounded transition-all cursor-pointer"
                          title="Ouvrir dans Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="p-1 text-slate-500 hover:text-red-400 border border-transparent hover:border-slate-800 hover:bg-slate-900 rounded transition-all cursor-pointer"
                          title="Supprimer le fichier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Dynamic Modal confirmation for ToT export (Least privilege compliance) */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-xl p-5 shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center gap-3 text-indigo-400">
                <Sparkles className="w-5 h-5 shrink-0" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider">Confirmer l'Export Google Drive</h4>
              </div>

              <div className="text-[10px] text-slate-400 font-mono leading-relaxed space-y-2">
                <p>
                  Vous vous apprêtez à générer et exporter un rapport de décision autonome au format Markdown (.md) directement sur votre espace Drive.
                </p>
                <p className="bg-slate-950 p-2 border border-slate-850 rounded text-indigo-300 font-semibold truncate">
                  Fichier : ARGUS_Decision_{currentResult?.specializedAgent?.codename || 'LOG'}_...md
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-lg font-mono text-[9px] font-bold transition-all cursor-pointer"
                >
                  ANNULER
                </button>
                <button
                  onClick={handleExportDecision}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-mono text-[9px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isExporting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>CONFIRMER EXPORTATION</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
