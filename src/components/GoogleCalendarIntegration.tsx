/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Share2, 
  Navigation, 
  Clock, 
  Compass, 
  MapPin, 
  Check,
  Briefcase,
  User,
  ExternalLink
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, loginWithGoogle } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

// Extend window interface for Google Analytics gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

interface GoogleCalendarIntegrationProps {
  user: FirebaseUser | null;
  calendarToken: string | null;
  onTokenUpdate: (token: string | null) => void;
  isMuted?: boolean;
}

interface CalendarEventItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  isRealCalendar?: boolean;
  routePresetId?: string;
}

interface TravelPreset {
  id: string;
  title: string;
  origin: string;
  destination: string;
  scheduleDesc: string;
  startHour: string; // HH:MM
  endHour: string; // HH:MM
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  type: 'weekend' | 'weekday';
}

const MICHAEL_PRESETS: TravelPreset[] = [
  {
    id: 'preset-weekend-return',
    title: '🚗 Retour Labatt -> Carrières (Samedi & Dimanche)',
    origin: '50 Avenue Labatt, LaSalle',
    destination: '2200 Rue des Carrières, Montréal',
    scheduleDesc: 'Week-end à 23h00 (Sat & Sun)',
    startHour: '23:00',
    endHour: '23:45',
    daysOfWeek: [0, 6],
    type: 'weekend'
  },
  {
    id: 'preset-weekday-veronique-aller',
    title: '🌸 Transit chez Véronique (Lundi au Vendredi - Aller)',
    origin: '2200 Rue des Carrières, Montréal',
    destination: '365 Av. George-V, Lachine, QC H8S 4L3',
    scheduleDesc: 'Semaine en matinée à 08h00',
    startHour: '08:00',
    endHour: '08:45',
    daysOfWeek: [1, 2, 3, 4, 5],
    type: 'weekday'
  },
  {
    id: 'preset-weekday-veronique-retour',
    title: '🏠 Retour de chez Véronique (Lundi au Vendredi - Retour)',
    origin: '365 Av. George-V, Lachine, QC H8S 4L3',
    destination: '2200 Rue des Carrières, Montréal',
    scheduleDesc: 'Semaine en soirée à 17h30',
    startHour: '17:30',
    endHour: '18:15',
    daysOfWeek: [1, 2, 3, 4, 5],
    type: 'weekday'
  }
];

export const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  user,
  calendarToken,
  onTokenUpdate,
  isMuted = false
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'live_events'>('presets');
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState<boolean>(false);
  
  // Initialize Google Analytics Gtag dynamically if not present
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.gtag) {
      const script1 = document.createElement('script');
      script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-11JXZ5KS9H';
      script1.async = true;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-11JXZ5KS9H', { 'anonymize_ip': true });
      `;
      document.head.appendChild(script2);
    }
  }, []);

  // Tracking Helper function
  const trackAnalyticsEvent = useCallback((eventName: string, params: object = {}) => {
    if (window.gtag) {
      window.gtag('event', eventName, {
        ...params,
        user_id: user?.uid || 'guest_operator',
        timestamp: new Date().toISOString()
      });
    }
    console.info(`[ARGUS-ANALYTICS] Event logged: "${eventName}"`, params);
  }, [user]);

  // Log API operation to telemetry db
  const logAPICall = useCallback(async (endpoint: string, status: number, size: string) => {
    if (!user) return;
    try {
      const logId = `calendar-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'telemetry_logs', logId), {
        id: logId,
        endpoint: `calendar.googleapis.com${endpoint}`,
        status,
        responseSize: size,
        timestamp: new Date().toISOString(),
        userId: user.uid
      });
    } catch (e) {
      console.warn('Could not write calendar API telemetry log:', e);
    }
  }, [user]);

  // Read Calendar Events from Firestore when disconnected or as default cache
  useEffect(() => {
    if (!user) {
      // Offline fallback lists Michael's presets pre-scheduled
      const fallbackEvents: CalendarEventItem[] = MICHAEL_PRESETS.map((p, idx) => ({
        id: `offline-event-${idx}`,
        title: p.title,
        startTime: `${new Date().toISOString().split('T')[0]}T${p.startHour}:00`,
        endTime: `${new Date().toISOString().split('T')[0]}T${p.endHour}:00`,
        location: p.destination,
        description: `Plan de trajet ToT ARGUS. Départ de: ${p.origin}.`,
        routePresetId: p.id
      }));
      setEvents(fallbackEvents);
      return;
    }

    const q = query(
      collection(db, 'calendar_events'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: CalendarEventItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as CalendarEventItem);
        });

        // Sort chronologically by startTime
        items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setEvents(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'calendar_events');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch real Google Calendar events
  const fetchRealCalendarEvents = useCallback(async (token: string) => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    trackAnalyticsEvent('calendar_fetch_start');

    try {
      const timeMin = new Date().toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=10&orderBy=startTime&singleEvents=true`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          onTokenUpdate(null);
          throw new Error('Votre session de connexion Google a expiré. Veuillez vous reconnecter.');
        }
        throw new Error(`Erreur API Google Calendar (${res.status})`);
      }

      const data = await res.json();
      logAPICall('/v3/calendars/primary/events', 200, `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`);

      if (data && Array.isArray(data.items)) {
        const realEvents: CalendarEventItem[] = data.items.map((item: any) => ({
          id: item.id || `google-${Math.random()}`,
          title: item.summary || 'Sans titre',
          startTime: item.start?.dateTime || item.start?.date || '',
          endTime: item.end?.dateTime || item.end?.date || '',
          location: item.location || '',
          description: item.description || '',
          isRealCalendar: true
        }));

        // Merge real events and write to Firestore for offline durability
        setEvents(prev => {
          const localOnly = prev.filter(e => !e.isRealCalendar);
          return [...realEvents, ...localOnly];
        });

        // Backup to firestore
        for (const ev of realEvents) {
          await setDoc(doc(db, 'calendar_events', `${user.uid}-${ev.id}`), {
            id: ev.id,
            title: ev.title,
            startTime: ev.startTime,
            endTime: ev.endTime,
            location: ev.location || '',
            description: ev.description || '',
            userId: user.uid,
            timestamp: Date.now()
          });
        }

        trackAnalyticsEvent('calendar_fetch_success', { count: realEvents.length });
      }
    } catch (err: any) {
      console.warn('Failed to fetch real calendar events:', err);
      setErrorMsg(err.message || 'Impossible de charger vos événements Google Calendar.');
      trackAnalyticsEvent('calendar_fetch_failure', { error: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, logAPICall, onTokenUpdate, trackAnalyticsEvent]);

  // Synchronize dynamic events automatically if token is refreshed
  useEffect(() => {
    if (calendarToken && user) {
      fetchRealCalendarEvents(calendarToken);
    }
  }, [calendarToken, user, fetchRealCalendarEvents]);

  // OAuth linkage helper
  const handleOAuthConnect = async () => {
    if (isLinking) return;
    setIsLinking(true);
    trackAnalyticsEvent('calendar_oauth_init');
    try {
      const loginResult = await loginWithGoogle();
      if (loginResult && loginResult.accessToken) {
        onTokenUpdate(loginResult.accessToken);
        trackAnalyticsEvent('calendar_oauth_success');
        showTemporarySuccess('Authentification Google Calendar validée avec succès !');
      }
    } catch (err: any) {
      console.error('Failed to link Calendar credentials: ', err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setErrorMsg('Le bloqueur de popups de votre navigateur a bloqué la fenêtre d\'authentification Google (car l\'application s\'exécute dans l\'iframe d\'AI Studio). Veuillez autoriser les popups pour ce site dans votre navigateur ou ouvrez l\'application dans un nouvel onglet via le bouton en haut à droite d\'AI Studio pour contourner les restrictions d\'iframe.');
      } else {
        setErrorMsg(err.message || 'Connexion refusée ou bloquée par l\'explorateur.');
      }
      trackAnalyticsEvent('calendar_oauth_failure', { error: err.message });
    } finally {
      setIsLinking(false);
    }
  };

  // Sync preset journey as a Google Calendar Event
  const handleSyncPreset = async (preset: TravelPreset) => {
    if (!user) {
      setErrorMsg('Veuillez vous connecter en haut à droite pour synchroniser vers le Cloud.');
      return;
    }

    setIsSyncingId(preset.id);
    setErrorMsg(null);
    trackAnalyticsEvent('calendar_sync_preset_start', { presetId: preset.id });

    // Calculate dates for upcoming matches of these days of week
    const targetEvents: Omit<CalendarEventItem, 'id'>[] = [];
    const today = new Date();

    // Schedule 3 future iterations of this transit event for Michael
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      if (preset.daysOfWeek.includes(d.getDay())) {
        const dateStr = d.toISOString().split('T')[0];
        targetEvents.push({
          title: preset.title,
          startTime: `${dateStr}T${preset.startHour}:00`,
          endTime: `${dateStr}T${preset.endHour}:00`,
          location: preset.destination,
          description: `Plan de trajet ToT ARGUS sécurisé.\n\n*   **Origine :** ${preset.origin}\n*   **Destination :** ${preset.destination}\n*   **Mode recommandé :** Optimisation ToT récursive temps réel.\n\nConsigné automatiquement par ARGUS Engine.`,
          routePresetId: preset.id
        });
      }
    }

    if (targetEvents.length === 0) {
      // Fallback: use today's date
      const dateStr = today.toISOString().split('T')[0];
      targetEvents.push({
        title: preset.title,
        startTime: `${dateStr}T${preset.startHour}:00`,
        endTime: `${dateStr}T${preset.endHour}:00`,
        location: preset.destination,
        description: `Plan de trajet ToT ARGUS sécurisé.\n\n*   **Origine :** ${preset.origin}\n*   **Destination :** ${preset.destination}\n*   **Mode recommandé :** Optimisation ToT récursive temps réel.`,
        routePresetId: preset.id
      });
    }

    try {
      let isSyncedToGoogle = false;

      // 1. If we have a live calendarToken, push to official Google Calendar endpoint
      if (calendarToken) {
        for (const ev of targetEvents) {
          const body = {
            summary: ev.title,
            location: ev.location,
            description: ev.description,
            start: {
              dateTime: ev.startTime,
              timeZone: 'America/Montreal'
            },
            end: {
              dateTime: ev.endTime,
              timeZone: 'America/Montreal'
            }
          };

          const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${calendarToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(body)
            }
          );

          if (res.ok) {
            const data = await res.json();
            logAPICall('/v3/calendars/primary/events', 201, '1.2 KB');
            isSyncedToGoogle = true;

            // Save to Firestore with Google Calendar reference ID
            await setDoc(doc(db, 'calendar_events', `${user.uid}-${data.id}`), {
              id: data.id,
              title: ev.title,
              startTime: ev.startTime,
              endTime: ev.endTime,
              location: ev.location || '',
              description: ev.description || '',
              routePresetId: preset.id,
              userId: user.uid,
              timestamp: Date.now()
            });
          } else {
            console.warn(`Failed to post preset to Google API. Status: ${res.status}`);
          }
        }
      }

      // 2. Always back up to Firestore database for resilient offline access
      if (!isSyncedToGoogle) {
        for (const ev of targetEvents) {
          const offlineId = `offline-${preset.id}-${Date.now()}`;
          await setDoc(doc(db, 'calendar_events', `${user.uid}-${offlineId}`), {
            id: offlineId,
            title: ev.title,
            startTime: ev.startTime,
            endTime: ev.endTime,
            location: ev.location || '',
            description: ev.description || '',
            routePresetId: preset.id,
            userId: user.uid,
            timestamp: Date.now()
          });
        }
        showTemporarySuccess('Itinéraires enregistrés avec succès sur votre espace Cloud Firestore !');
      } else {
        showTemporarySuccess('Trajets synchronisés avec succès sur votre Google Calendar et Firestore Cloud !');
      }

      trackAnalyticsEvent('calendar_sync_preset_success', { presetId: preset.id, googleApi: isSyncedToGoogle });
      
      // Vibration and acoustic chime trigger if not muted
      triggerTactileAlert(preset.title);

    } catch (err: any) {
      console.error('Preset sync error:', err);
      setErrorMsg('Erreur technique lors de la synchronisation.');
      trackAnalyticsEvent('calendar_sync_preset_failure', { error: err.message });
    } finally {
      setIsSyncingId(null);
    }
  };

  // Delete event from local Firestore and/or Google Calendar
  const handleDeleteEvent = async (id: string, isReal: boolean) => {
    if (!user) return;
    setIsLoading(true);
    trackAnalyticsEvent('calendar_delete_event_start', { eventId: id, isReal });

    try {
      const docId = id.startsWith(`${user.uid}-`) ? id : `${user.uid}-${id}`;
      await deleteDoc(doc(db, 'calendar_events', docId));

      if (calendarToken && isReal) {
        logAPICall(`/v3/calendars/primary/events/${id}`, 200, '0.1 KB');
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${calendarToken}` }
        });
      }

      showTemporarySuccess('Événement retiré du calendrier.');
      trackAnalyticsEvent('calendar_delete_event_success');
    } catch (err: any) {
      console.error('Delete event error:', err);
      setErrorMsg('Erreur lors du retrait de l\'événement.');
      trackAnalyticsEvent('calendar_delete_event_failure', { error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerTactileAlert = (title: string) => {
    if (isMuted) return;

    // Vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate([150, 50, 150]);
    }

    // Audio synthesizer context
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const now = audioCtx.currentTime;
        
        const playTone = (time: number, freq: number, dur: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.2, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(time);
          osc.stop(time + dur);
        };

        playTone(now, 523.25, 0.15); // C5
        playTone(now + 0.15, 659.25, 0.25); // E5
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const formatDateTimeEst = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-CA', {
        timeZone: 'America/Montreal',
        weekday: 'short',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 flex flex-col h-[600px] shadow-lg relative overflow-hidden font-sans"
      id="argus-google-calendar-container"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Trajets & Google Calendar
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              SYNCHRONISEUR SÉCURISÉ D'ITINÉRAIRES • MICHAEL & VÉRONIQUE
            </p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] font-bold">
          {calendarToken ? (
            <span className="flex items-center gap-1 bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CALENDRIER SYNC
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-indigo-950/40 text-indigo-300 border border-indigo-900/40 px-2 py-0.5 rounded">
              FIRESTORE DURABLE
            </span>
          )}

          {user && (
            <button
              onClick={() => calendarToken && fetchRealCalendarEvents(calendarToken)}
              disabled={isLoading || !calendarToken}
              className="p-1 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded transition-all cursor-pointer disabled:opacity-30"
              title="Actualiser la liste Google Calendar"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900/80 bg-slate-950/20">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'presets'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>TRAJETS DE MICHAEL ({MICHAEL_PRESETS.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('live_events')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'live_events'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>AGENDA SYNCHRONISÉ ({events.length})</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4">
        
        {/* Alerts / success toasts */}
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
            <Calendar className="w-10 h-10 text-slate-600 animate-pulse" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Liaison Opérateur Requise</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal font-mono">
                Connectez-vous en tant qu'opérateur pour lier votre compte Google Calendar et sauvegarder les trajets sur Firestore durable.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'presets' ? (
              <motion.div
                key="presets-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3 flex flex-col flex-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-500 tracking-wider font-bold uppercase">
                    TRAJETS SUR MESURE DEMANDÉS PAR L'OPÉRATEUR :
                  </span>
                  {!calendarToken && (
                    <button
                      onClick={handleOAuthConnect}
                      disabled={isLinking}
                      className="text-[8.5px] text-indigo-400 hover:text-indigo-300 underline font-semibold flex items-center gap-1 font-mono transition-colors"
                    >
                      {isLinking ? 'Liaison en cours...' : '▲ Activer Google Calendar direct'}
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                  {MICHAEL_PRESETS.map((preset) => {
                    const isSyncing = isSyncingId === preset.id;
                    const alreadyScheduled = events.some(e => e.routePresetId === preset.id);

                    return (
                      <div 
                        key={preset.id}
                        className={`p-3.5 rounded-xl border transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          preset.type === 'weekend'
                            ? 'bg-amber-950/5 border-amber-950/20 hover:border-amber-900/40 shadow-sm shadow-amber-950/5'
                            : 'bg-indigo-950/5 border-indigo-950/20 hover:border-indigo-900/40 shadow-sm shadow-indigo-950/5'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${preset.type === 'weekend' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-tight truncate">
                              {preset.title.split(' ').slice(1).join(' ')}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[9.5px] font-mono text-slate-400 leading-tight">
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="text-slate-500">De :</span>
                              <span className="truncate text-slate-300 font-semibold">{preset.origin.split(',')[0]}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <Compass className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="text-slate-500">À :</span>
                              <span className="truncate text-slate-300 font-semibold">{preset.destination.split(',')[0]}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-500">Plan :</span>
                              <span className="text-slate-300 font-semibold">{preset.scheduleDesc}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          <button
                            onClick={() => handleSyncPreset(preset)}
                            disabled={isSyncing}
                            className={`w-full md:w-auto px-3 py-2 rounded-lg font-mono text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                              alreadyScheduled
                                ? 'bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-400 border-emerald-900/30 hover:border-emerald-800'
                                : preset.type === 'weekend'
                                ? 'bg-amber-950/20 hover:bg-amber-950 text-amber-400 border-amber-900/20 hover:border-amber-800'
                                : 'bg-indigo-950/20 hover:bg-indigo-950 text-indigo-400 border-indigo-900/20 hover:border-indigo-800'
                            }`}
                          >
                            {isSyncing ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                <span>SYNC...</span>
                              </>
                            ) : alreadyScheduled ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>SYNC CLOUD OK</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3 h-3" />
                                <span>SYNC GOOGLE & CLOUD</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* Live Events list */
              <motion.div
                key="live-events-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3 flex flex-col flex-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-500 tracking-wider font-bold uppercase">
                    PROCHAINS CONGÉS / TRAJETS DE MICHAEL :
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 italic">Durablement sauvegardés</span>
                </div>

                {events.length === 0 ? (
                  <div className="p-12 rounded-xl border border-slate-900 bg-slate-950/10 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                    <Calendar className="w-6 h-6 text-slate-700 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-mono max-w-xs leading-normal">
                      Aucun trajet n'a été planifié. Utilisez l'onglet de gauche pour synchroniser instantanément un calendrier ToT.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-1">
                    {events.map((event) => (
                      <div 
                        key={event.id}
                        className="p-3 bg-slate-950/30 border border-slate-900 rounded-xl hover:border-slate-850 transition-all flex items-center justify-between gap-3 text-left"
                      >
                        <div className="space-y-1 font-mono min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-tight truncate max-w-[200px] md:max-w-xs">
                              {event.title}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8.5px] text-slate-500 font-semibold leading-none">
                            <span className="text-slate-400">{formatDateTimeEst(event.startTime)}</span>
                            {event.location && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px] text-indigo-400">{event.location.split(',')[0]}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {event.isRealCalendar && (
                            <span className="text-[7px] font-mono font-bold bg-indigo-950/50 text-indigo-400 border border-indigo-900/30 px-1.5 py-0.5 rounded uppercase">
                              LIVE GOOGLE
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteEvent(event.id, !!event.isRealCalendar)}
                            className="p-1.5 hover:bg-slate-900 rounded border border-transparent hover:border-slate-800 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                            title="Retirer l'événement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
