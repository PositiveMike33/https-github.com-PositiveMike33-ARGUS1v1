/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowUpRight,
  Grid
} from 'lucide-react';
import { db, loginWithGoogle } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface GoogleSheetsIntegrationProps {
  user: FirebaseUser | null;
  sheetsToken: string | null;
  onTokenUpdate: (token: string | null) => void;
  decisionsArchive: any[];
}

interface SpreadsheetItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string;
}

interface DisplayRow {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  severity: string;
  entropy: number;
  decision: string;
}

export const GoogleSheetsIntegration: React.FC<GoogleSheetsIntegrationProps> = ({
  user,
  sheetsToken,
  onTokenUpdate,
  decisionsArchive
}) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetItem[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null);
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isLoggingRow, setIsLoggingRow] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState<boolean>(false);

  // Log API call telemetry
  const logAPICall = useCallback(async (endpoint: string, status: number, size: string) => {
    if (!user) return;
    try {
      const logId = `sheets-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'telemetry_logs', logId), {
        id: logId,
        endpoint: `sheets.googleapis.com${endpoint}`,
        status,
        responseSize: size,
        timestamp: new Date().toISOString(),
        userId: user.uid
      });
    } catch (e) {
      console.warn('Could not write Sheets API telemetry log:', e);
    }
  }, [user]);

  // Fetch Spreadsheets List from Google Drive
  const fetchSpreadsheets = useCallback(async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=5&orderBy=modifiedTime%20desc&fields=files(id,name,webViewLink,modifiedTime)`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          onTokenUpdate(null);
          throw new Error('Votre session Google Sheets a expiré. Veuillez vous reconnecter.');
        }
        throw new Error(`Erreur Drive API (${res.status})`);
      }

      const data = await res.json();
      logAPICall('/v4/spreadsheets/list', 200, `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`);

      if (data && Array.isArray(data.files)) {
        setSpreadsheets(data.files);
        // Auto-select latest spreadsheet if none selected
        if (data.files.length > 0 && !selectedSpreadsheetId) {
          setSelectedSpreadsheetId(data.files[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch spreadsheets:', err);
      setErrorMsg(err.message || 'Impossible de lister vos feuilles de calcul.');
    } finally {
      setIsLoading(false);
    }
  }, [logAPICall, onTokenUpdate, selectedSpreadsheetId]);

  // Read data from the selected spreadsheet
  const fetchSpreadsheetData = useCallback(async (token: string, spreadsheetId: string) => {
    setIsLoadingSheet(true);
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Décisions Log'!A1:G10`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const data = await res.json();
        logAPICall(`/v4/spreadsheets/${spreadsheetId}/values`, 200, '0.8 KB');
        if (data && Array.isArray(data.values)) {
          setSheetRows(data.values);
        } else {
          setSheetRows([]);
        }
      } else {
        // Sheet might not have the "Décisions Log" tab, try reading Sheet1 or default
        const resDefault = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:G10`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (resDefault.ok) {
          const data = await resDefault.json();
          if (data && Array.isArray(data.values)) {
            setSheetRows(data.values);
          } else {
            setSheetRows([]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch spreadsheet rows:', err);
    } finally {
      setIsLoadingSheet(false);
    }
  }, [logAPICall]);

  // Synchronize on token or sheet select
  useEffect(() => {
    if (sheetsToken && user) {
      fetchSpreadsheets(sheetsToken);
    }
  }, [sheetsToken, user, fetchSpreadsheets]);

  useEffect(() => {
    if (sheetsToken && selectedSpreadsheetId) {
      fetchSpreadsheetData(sheetsToken, selectedSpreadsheetId);
    }
  }, [sheetsToken, selectedSpreadsheetId, fetchSpreadsheetData]);

  const handleOAuthConnect = async () => {
    if (isLinking) return;
    setIsLinking(true);
    try {
      const loginResult = await loginWithGoogle();
      if (loginResult && loginResult.accessToken) {
        onTokenUpdate(loginResult.accessToken);
        showTemporarySuccess('Authentification Google Sheets validée !');
      }
    } catch (err: any) {
      console.error('Failed to link Sheets credentials:', err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setErrorMsg('Bloqueur de popups actif. Veuillez autoriser les popups ou ouvrir l\'application dans un nouvel onglet.');
      } else {
        setErrorMsg(err.message || 'Échec de la connexion Google Sheets.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Create a brand-new Spreadsheet with correct header structure
  const handleCreateDecisionsLog = async () => {
    if (!sheetsToken) return;

    // Explicit confirmation dialog to comply with security/mutation guidelines
    const confirmed = window.confirm("Voulez-vous créer un nouveau tableur 'ARGUS Decisions Log' sur votre Google Sheets pour archiver les données ToT ?");
    if (!confirmed) return;

    setIsCreating(true);
    setErrorMsg(null);
    try {
      const body = {
        properties: {
          title: `ARGUS Decisions Log - ${new Date().toLocaleDateString('fr-CA')}`
        },
        sheets: [
          {
            properties: {
              title: 'Décisions Log'
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: 'ID DECISION' } },
                      { userEnteredValue: { stringValue: 'HORODATAGE' } },
                      { userEnteredValue: { stringValue: 'SECTEUR' } },
                      { userEnteredValue: { stringValue: 'TITRE INCIDENT' } },
                      { userEnteredValue: { stringValue: 'GRAVITÉ' } },
                      { userEnteredValue: { stringValue: 'ENTROPIE (H)' } },
                      { userEnteredValue: { stringValue: 'DIRECTIVE FINALE' } }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sheetsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error(`Échec de création du tableur (${res.status})`);
      }

      const data = await res.json();
      logAPICall('/v4/spreadsheets', 200, '1.5 KB');

      showTemporarySuccess('Tableur "ARGUS Decisions Log" créé avec succès !');
      setSelectedSpreadsheetId(data.spreadsheetId);
      fetchSpreadsheets(sheetsToken);
    } catch (err: any) {
      console.error('Spreadsheet creation error:', err);
      setErrorMsg(err.message || 'Impossible de créer la feuille de calcul.');
    } finally {
      setIsCreating(false);
    }
  };

  // Append a decision row to Google Sheets
  const handleLogDecisionRow = async (decision: any) => {
    const spreadsheetId = selectedSpreadsheetId;
    if (!sheetsToken || !spreadsheetId) {
      setErrorMsg('Veuillez sélectionner ou créer une feuille de calcul au préalable.');
      return;
    }

    // Direct confirmation from user before mutating/creating sheets rows
    const confirmed = window.confirm(`Voulez-vous ajouter la décision #${decision.id?.slice(0, 8)} au tableur ?`);
    if (!confirmed) return;

    setIsLoggingRow(decision.id);
    setErrorMsg(null);
    try {
      const rowValue = [
        decision.id || 'N/A',
        decision.timestamp || new Date().toISOString(),
        decision.feedType || decision.type || 'N/A',
        decision.feedTitle || decision.title || 'N/A',
        decision.severity || 'N/A',
        decision.entropyScore !== undefined ? String(decision.entropyScore) : 'N/A',
        decision.finalDecision || 'N/A'
      ];

      const body = {
        values: [rowValue]
      };

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Décisions Log'!A:G:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sheetsToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (!res.ok) {
        // Retry with default sheet A1 if "Décisions Log" range failed
        const retryRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:G:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sheetsToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );
        if (!retryRes.ok) {
          throw new Error(`Échec d'écriture (${res.status})`);
        }
      }

      logAPICall(`/v4/spreadsheets/${spreadsheetId}/values:append`, 200, '0.5 KB');
      showTemporarySuccess('Décision consignée avec succès dans Google Sheets !');
      fetchSpreadsheetData(sheetsToken, spreadsheetId);
    } catch (err: any) {
      console.error('Log row error:', err);
      setErrorMsg(err.message || 'Échec de la consignation dans la feuille de calcul.');
    } finally {
      setIsLoggingRow(null);
    }
  };

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 flex flex-col h-[600px] shadow-lg relative overflow-hidden font-sans"
      id="argus-google-sheets-container"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Bilan & Google Sheets
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              CONSIGNATION EN DIRECT • DÉCISION-AS-A-SERVICE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] font-bold">
          {sheetsToken ? (
            <span className="flex items-center gap-1 bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SHEETS CONNECTÉ
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
              DÉCONNECTÉ
            </span>
          )}

          {user && sheetsToken && (
            <button
              onClick={() => fetchSpreadsheets(sheetsToken)}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded transition-all cursor-pointer disabled:opacity-30"
              title="Actualiser les tableurs"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4">
        
        {/* Success/Error Toasts */}
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
            <FileSpreadsheet className="w-10 h-10 text-slate-600 animate-pulse" />
            <div>
              <p className="text-xs text-slate-400 font-medium font-mono">OPÉRATEUR REQUIS</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal font-mono">
                Connectez-vous pour exporter et lister vos décisions stratégiques dans des rapports Google Sheets partagés.
              </p>
            </div>
          </div>
        ) : !sheetsToken ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
            <FileSpreadsheet className="w-10 h-10 text-slate-700" />
            <div>
              <p className="text-xs text-slate-400 font-bold font-mono">SAUVEGARDE EXCEL / SHEETS DISPONIBLE</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal font-mono">
                Synchronisez votre compte Google Sheets pour générer et formater des bilans complets d'incidents sous forme de tableur.
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
                  <span>CONNEXION...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>ACTIVER GOOGLE SHEETS</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            
            {/* Spreadsheet Selector & New creator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 text-left">
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Tableur Actif
                </span>
                {spreadsheets.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono">Aucun tableur trouvé.</p>
                ) : (
                  <select
                    value={selectedSpreadsheetId || ''}
                    onChange={(e) => setSelectedSpreadsheetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 font-mono text-[10px] text-slate-200 outline-none"
                  >
                    {spreadsheets.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={handleCreateDecisionsLog}
                  disabled={isCreating}
                  className="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-900/30 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg font-mono text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  {isCreating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>CRÉER "DECISIONS LOG"</span>
                </button>
              </div>
            </div>

            {/* Quick action to log latest Decision */}
            <div className="flex-1 flex flex-col space-y-2">
              <span className="text-[9px] font-mono text-slate-500 tracking-wider font-bold uppercase">
                CONSIGNATION RAPIDE D'INCIDENT ToT :
              </span>

              {decisionsArchive.length === 0 ? (
                <div className="p-8 rounded-xl border border-slate-900 bg-slate-950/10 text-center">
                  <span className="text-[9px] text-slate-500 font-mono">Aucun incident archivé en mémoire à exporter.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {decisionsArchive.slice(0, 3).map((item) => {
                    const isLogging = isLoggingRow === item.id;
                    return (
                      <div 
                        key={item.id}
                        className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-3 text-left hover:border-slate-850 transition-all"
                      >
                        <div className="min-w-0 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-bold uppercase bg-slate-900 text-slate-400 px-1 py-0.2 rounded border border-slate-800">
                              {item.feedType || item.type || 'N/A'}
                            </span>
                            <h4 className="text-[10px] font-bold text-slate-200 truncate pr-2 max-w-[150px] md:max-w-xs">
                              {item.feedTitle || item.title || 'Incident'}
                            </h4>
                          </div>
                          <span className="text-[8px] text-slate-500">
                            Entropie (H) : {item.entropyScore !== undefined ? item.entropyScore : '0.50'} • Gravité : {item.severity || 'N/A'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleLogDecisionRow(item)}
                          disabled={!!isLoggingRow || !selectedSpreadsheetId}
                          className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg font-mono text-[8.5px] font-bold border border-emerald-900/30 hover:border-emerald-500 transition-all flex items-center gap-1 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isLogging ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Database className="w-3 h-3" />
                          )}
                          <span>LOG VER SHEETS</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Sheets Row Preview */}
            {selectedSpreadsheetId && (
              <div className="border border-slate-900/80 rounded-xl bg-slate-950/10 p-3 flex flex-col space-y-2 h-[150px]">
                <div className="flex items-center justify-between text-left">
                  <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold flex items-center gap-1">
                    <Grid className="w-3 h-3" />
                    Aperçu en Direct de la Grille ({sheetRows.length} lignes)
                  </span>
                  {spreadsheets.find(s => s.id === selectedSpreadsheetId) && (
                    <a
                      href={spreadsheets.find(s => s.id === selectedSpreadsheetId)?.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8.5px] text-slate-500 hover:text-white flex items-center gap-0.5 font-mono"
                    >
                      <span>Ouvrir tableur</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {isLoadingSheet ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  </div>
                ) : sheetRows.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[8px] text-slate-600 font-mono">Aucune donnée trouvée. Consignez une décision ci-dessus pour l'initialiser !</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto max-h-[110px] text-[8.5px] font-mono border border-slate-900/50 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 sticky top-0 border-b border-slate-900 font-bold uppercase text-[7.5px]">
                          <th className="p-1.5 border-r border-slate-900">Incident</th>
                          <th className="p-1.5 border-r border-slate-900">Gravité</th>
                          <th className="p-1.5 border-r border-slate-900">Entropie</th>
                          <th className="p-1.5">Décision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {sheetRows.slice(1).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-950/20">
                            <td className="p-1.5 border-r border-slate-900 truncate max-w-[100px] font-bold text-slate-200">{row[3] || row[0] || 'N/A'}</td>
                            <td className="p-1.5 border-r border-slate-900 font-bold uppercase">{row[4] || 'N/A'}</td>
                            <td className="p-1.5 border-r border-slate-900">{row[5] || '0.50'}</td>
                            <td className="p-1.5 truncate max-w-[150px]" title={row[6]}>{row[6] || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
