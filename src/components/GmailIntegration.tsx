/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Send, 
  Inbox, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  UserCheck,
  Star,
  Bell
} from 'lucide-react';
import { ToTAnalysisResult } from '../types';
import { loginWithGoogle, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from 'firebase/auth';
import { doc, setDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface GmailIntegrationProps {
  user: User | null;
  gmailToken: string | null;
  onTokenUpdate: (token: string | null) => void;
  currentResult: ToTAnalysisResult | null;
  isMuted?: boolean;
}

interface GmailMessageDetail {
  id: string;
  subject: string;
  date: string;
  snippet: string;
  to: string;
  from?: string;
  isUnread?: boolean;
  isImportant?: boolean;
}

// 100% French simulated emails for default display
const INITIAL_MOCK_INBOX = [
  {
    id: 'm-1',
    from: 'Station Rosemont (STM) <alerts@stm.info>',
    subject: '[ALERTE] Ligne Orange - Retard de métro résorbé',
    snippet: 'Le transit est redevenu fluide entre Rosemont et Lionel-Groulx. Reprise nominale des rames.',
    date: '10:45',
    isUnread: true,
    isImportant: false,
    to: 'moi'
  },
  {
    id: 'm-2',
    from: 'Contrôle Aérien CYUL <tower@cyul.ca>',
    subject: '[MÉTÉO] Visibilité réduite - vents de travers LaSalle',
    snippet: 'Fortes rafales de secteur Ouest. Les couloirs de fret aérien restent actifs sous guidage radar.',
    date: '10:42',
    isUnread: true,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'm-3',
    from: 'Port de Montréal <shipping@port-montreal.com>',
    subject: 'ARRIVÉE : Cargo CMA CGM Fort de France (Quai 52)',
    snippet: 'Le déchargement au Quai 52 commencera sous peu. Tirant d\'eau optimal mesuré à 11.3 mètres.',
    date: '10:38',
    isUnread: false,
    isImportant: false,
    to: 'moi'
  },
  {
    id: 'm-4',
    from: 'Sophia (Moteur ARGUS) <sophia@argus-consortium.io>',
    subject: '[SYSTEM] Validation ToT effectuée automatiquement',
    snippet: 'Tous les flux de télémétrie sont stables. L\'indice d\'entropie quantique global s\'établit à 0.22.',
    date: '10:30',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'm-5',
    from: 'Michael Gauthier <mikegauthierguillet@gmail.com>',
    subject: 'Re: Plan de transit LaSalle sécurisé - Demande de confirmation',
    snippet: 'La liaison tactique par la 15 Sud me semble la plus rapide si les caméras CCTV confirment l\'absence d\'intrusion.',
    date: '10:15',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'm-6',
    from: 'Transit Logistics <dispatch@tl-montreal.ca>',
    subject: 'Rapport d\'expédition : 50 Avenue Labatt',
    snippet: 'Conteneurs de classe 4 reçus et scannés. Intégrité des scellés validée par capteur RFID.',
    date: '09:45',
    isUnread: false,
    isImportant: false,
    to: 'moi'
  },
  {
    id: 'm-7',
    from: 'CCTV Surveillance Centre <hq-cctv@argus-security.net>',
    subject: 'Rapport quotidien Caméras Échangeur Turcot',
    snippet: 'Maintenance effectuée sur le dôme de la caméra 402. Flux optique 4K stabilisé avec encodage H.265.',
    date: '09:12',
    isUnread: false,
    isImportant: false,
    to: 'moi'
  },
  {
    id: 'm-8',
    from: 'Aviation Civile <no-reply@aviation-canada.gc.ca>',
    subject: 'NOTAM : Restrictions temporaires de survol Montréal',
    snippet: 'Altitude minimale de transit fixée à 3000 pieds pour le couloir de transit Ouest.',
    date: '08:30',
    isUnread: false,
    isImportant: false,
    to: 'moi'
  },
  {
    id: 'm-9',
    from: 'Admin ARGUS <admin@argus-consortium.io>',
    subject: 'Mise à jour système v4.12 installée avec succès',
    snippet: 'Intégration MCP renforcée. Les schémas JSON et types de données de télémétrie sont désormais certifiés DUR.',
    date: '07:15',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'm-10',
    from: 'Consortium Assurances <security-insure@ops-transit.com>',
    subject: 'Validation du score de risque d\'entropie',
    snippet: 'Attribution du label d\'assurance A+ basé sur le taux d\'évitement des risques ToT calculé par Sophia.',
    date: 'Hier',
    isUnread: false,
    isImportant: false,
    to: 'moi'
  }
];

const INITIAL_MOCK_IMPORTANT = [
  {
    id: 'm-2',
    from: 'Contrôle Aérien CYUL <tower@cyul.ca>',
    subject: '[MÉTÉO] Visibilité réduite - vents de travers LaSalle',
    snippet: 'Fortes rafales de secteur Ouest. Les couloirs de fret aérien restent actifs sous guidage radar.',
    date: '10:42',
    isUnread: true,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'm-4',
    from: 'Sophia (Moteur ARGUS) <sophia@argus-consortium.io>',
    subject: '[SYSTEM] Validation ToT effectuée automatiquement',
    snippet: 'Tous les flux de télémétrie sont stables. L\'indice d\'entropie quantique global s\'établit à 0.22.',
    date: '10:30',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'm-5',
    from: 'Michael Gauthier <mikegauthierguillet@gmail.com>',
    subject: 'Re: Plan de transit LaSalle sécurisé - Demande de confirmation',
    snippet: 'La liaison tactique par la 15 Sud me semble la plus rapide si les caméras CCTV confirment l\'absence d\'intrusion.',
    date: '10:15',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'm-9',
    from: 'Admin ARGUS <admin@argus-consortium.io>',
    subject: 'Mise à jour système v4.12 installée avec succès',
    snippet: 'Intégration MCP renforcée. Les schémas JSON et types de données de télémétrie sont désormais certifiés DUR.',
    date: '07:15',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'imp-1',
    from: 'Directeur Sécurité <director@argus-consortium.io>',
    subject: '[IMPORTANT] Directive de transit d\'urgence LaSalle',
    snippet: 'En cas d\'entropie ToT supérieure à 0.70, le transit vers le 50 Avenue Labatt doit être immédiatement suspendu.',
    date: 'Hier',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'imp-2',
    from: 'Garde Côtière <operations@maritime-canada.gc.ca>',
    subject: 'Alerte Navigation - Anomalie de signal GPS Port',
    snippet: 'Des soupçons de spoofing GPS ont été signalés à l\'embouchure du Port de Montréal. Triangulation radar requise.',
    date: 'Hier',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  },
  {
    id: 'imp-3',
    from: 'STM Operations Centre <hq-stm@stm.info>',
    subject: 'Plan de contingence Tunnel Ville-Marie',
    snippet: 'En cas de fermeture, rediriger l\'ensemble des lignes d\'autobus logistiques vers la rue Notre-Dame.',
    date: 'Hier',
    isUnread: false,
    isImportant: true,
    to: 'moi'
  }
];

const RANDOM_INCOMING_MAILS = [
  {
    from: 'Capitaine Quai 52 <captain52@port-montreal.com>',
    subject: '[RAPIDE] Brouillard dense détecté sur le fleuve',
    snippet: 'La visibilité est réduite à moins de 200m. Les radars de bord fonctionnent à puissance maximale.',
    isImportant: false
  },
  {
    from: 'Michael Gauthier <mikegauthierguillet@gmail.com>',
    subject: '[ALERTE] Point de contrôle Carrières dégagé',
    snippet: 'Le départ du 2200 Rue des Carrières est sécurisé. Le métro Rosemont fonctionne parfaitement à cette heure.',
    isImportant: true
  },
  {
    from: 'Superviseur Réseau STM <supervisor@stm.info>',
    subject: 'Ralentissement ligne Verte - Station Angrignon',
    snippet: 'Intervention technique mineure en cours. Retard estimé à 6 minutes. Les correspondances restent actives.',
    isImportant: false
  },
  {
    from: 'CCTV Automatique <cctv-bot@argus-security.net>',
    subject: '[CCTV] Alerte intrusion clôture Ouest',
    snippet: 'Mouvement suspect détecté à proximité de l\'Avenue Labatt. La caméra 109 a zoomé sur la zone concernée.',
    isImportant: true
  },
  {
    from: 'Aéroport CYUL Operations <freight@cyul.ca>',
    subject: 'Cargo FedEx 402 en approche finale CYUL',
    snippet: 'Atterrissage prévu à 10h52 sur la piste 24R. Tous les corridors logistiques terrestres sont alertés.',
    isImportant: false
  }
];

export const GmailIntegration: React.FC<GmailIntegrationProps> = ({
  user,
  gmailToken,
  onTokenUpdate,
  currentResult,
  isMuted = false
}) => {
  const [recipient, setRecipient] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  
  // Navigation within Gmail center
  const [activeTab, setActiveTab] = useState<'realtime' | 'dispatch'>('realtime');

  // Sent log states
  const [sentLogs, setSentLogs] = useState<GmailMessageDetail[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Real-time Inbox and Important states
  const [inboxEmails, setInboxEmails] = useState<GmailMessageDetail[]>([]);
  const [importantEmails, setImportantEmails] = useState<GmailMessageDetail[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState<boolean>(false);
  const [isLoadingImportant, setIsLoadingImportant] = useState<boolean>(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [importantError, setImportantError] = useState<string | null>(null);

  // New incoming notification state
  const [newMailAlert, setNewMailAlert] = useState<boolean>(false);

  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Ref to track seen email IDs to prevent alerts on initial load
  const seenEmailIdsRef = React.useRef<Set<string>>(new Set());

  // Vibration and Audio notification trigger
  const triggerAlertNotification = (subject: string) => {
    if (isMuted) {
      console.info(`[ARGUS ALERT] Notification muette (Mute Alerts est activé) pour : ${subject}`);
      return;
    }

    // 1. Browser Vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }

    // 2. Custom Sound Notification using Web Audio API (highly resilient, client-side synthesized)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        
        const playBeep = (startTime: number, frequency: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, startTime);
          
          gainNode.gain.setValueAtTime(0.3, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        // Double tactile alert beep
        playBeep(now, 880, 0.25);
        playBeep(now + 0.3, 1046.5, 0.4);
      }
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }

    console.info(`[ARGUS ALERT] Notification déclenchée pour : ${subject}`);
  };

  // Check for new critical emails to trigger vibration and sound notifications
  const processEmailAlerts = React.useCallback((emails: GmailMessageDetail[]) => {
    if (emails.length === 0) return;

    const isInitialLoad = seenEmailIdsRef.current.size === 0;

    emails.forEach((email) => {
      if (!seenEmailIdsRef.current.has(email.id)) {
        // Add to seen set
        seenEmailIdsRef.current.add(email.id);

        // If it's NOT the initial load, and it's a critical email, trigger notification!
        if (!isInitialLoad) {
          const isCritical = email.isImportant || 
            /alerte|urgent|critical|incident|danger|erreur|entropie/i.test(email.subject || '') ||
            /alerte|urgent|critical|incident|danger|erreur|entropie/i.test(email.snippet || '');

          if (isCritical) {
            triggerAlertNotification(email.subject);
          }
        }
      }
    });
  }, []);

  // Trigger alert checks on email state changes
  useEffect(() => {
    processEmailAlerts(inboxEmails);
    if (inboxEmails.length > 0) {
      localStorage.setItem('argus_cached_inbox', JSON.stringify(inboxEmails));
    }
  }, [inboxEmails, processEmailAlerts]);

  useEffect(() => {
    processEmailAlerts(importantEmails);
    if (importantEmails.length > 0) {
      localStorage.setItem('argus_cached_important', JSON.stringify(importantEmails));
    }
  }, [importantEmails, processEmailAlerts]);

  // Helper to save real emails to Firestore
  const saveEmailToFirestore = async (email: GmailMessageDetail) => {
    try {
      const emailRef = doc(db, 'gmail_messages', email.id);
      await setDoc(emailRef, {
        id: email.id,
        from: email.from || 'Inconnu',
        subject: email.subject || '(Sans objet)',
        snippet: email.snippet || '',
        date: email.date || 'Récent',
        to: email.to || 'moi',
        isUnread: email.isUnread ?? false,
        isImportant: email.isImportant ?? false,
        timestamp: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `gmail_messages/${email.id}`);
    }
  };

  // Initialize recipient when user is authenticated
  useEffect(() => {
    if (user?.email && !recipient) {
      setRecipient(user.email);
    }
  }, [user, recipient]);

  // Fetch recent sent emails matching ARGUS query
  const fetchSentDispatches = async (token: string) => {
    setIsLoadingLogs(true);
    setLogError(null);
    try {
      const queryStr = encodeURIComponent('subject:"ARGUS Decision"');
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${queryStr}&maxResults=5`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!listRes.ok) {
        throw new Error(`L'API Gmail a retourné le statut ${listRes.status}`);
      }

      const listData = await listRes.json();
      const messages = listData.messages || [];

      const details: GmailMessageDetail[] = await Promise.all(
        messages.map(async (msg: { id: string }) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          if (!detailRes.ok) return null;
          const data = await detailRes.json();

          const headers = data.payload.headers || [];
          const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
          const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
          const toHeader = headers.find((h: any) => h.name.toLowerCase() === 'to');

          return {
            id: msg.id,
            subject: subjectHeader ? subjectHeader.value : 'Envoi de décision ARGUS',
            date: dateHeader ? new Date(dateHeader.value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récent',
            snippet: data.snippet || '',
            to: toHeader ? toHeader.value : 'Inconnu'
          };
        })
      ).then(results => results.filter((r): r is GmailMessageDetail => r !== null));

      setSentLogs(details);
    } catch (err: any) {
      console.warn('Could not fetch sent Gmail dispatches: ', err);
      setLogError(err.message || 'Erreur lors de la récupération des historiques d\'envoi');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch real-time Inbox
  const fetchInbox = async (token: string) => {
    setIsLoadingInbox(true);
    setInboxError(null);
    try {
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:INBOX&maxResults=10`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!listRes.ok) {
        throw new Error(`L'API Gmail a retourné le statut ${listRes.status}`);
      }

      const listData = await listRes.json();
      const messages = listData.messages || [];

      const details: GmailMessageDetail[] = await Promise.all(
        messages.map(async (msg: { id: string }) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          if (!detailRes.ok) return null;
          const data = await detailRes.json();

          const headers = data.payload.headers || [];
          const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
          const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
          const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');

          return {
            id: msg.id,
            subject: subjectHeader ? subjectHeader.value : '(Sans objet)',
            date: dateHeader ? new Date(dateHeader.value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récent',
            snippet: data.snippet || '',
            from: fromHeader ? fromHeader.value : 'Inconnu',
            to: 'moi',
            isUnread: data.labelIds?.includes('UNREAD'),
            isImportant: data.labelIds?.includes('IMPORTANT')
          };
        })
      ).then(results => results.filter((r): r is GmailMessageDetail => r !== null));

      setInboxEmails(details);
      // Sync fetched real emails to Firestore
      details.forEach((email) => {
        saveEmailToFirestore(email);
      });
    } catch (err: any) {
      console.warn('Could not fetch Gmail Inbox: ', err);
      setInboxError(err.message || 'Erreur de connexion à la boîte de réception');
    } finally {
      setIsLoadingInbox(false);
    }
  };

  // Fetch real-time Important emails
  const fetchImportant = async (token: string) => {
    setIsLoadingImportant(true);
    setImportantError(null);
    try {
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:IMPORTANT&maxResults=10`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!listRes.ok) {
        throw new Error(`L'API Gmail a retourné le statut ${listRes.status}`);
      }

      const listData = await listRes.json();
      const messages = listData.messages || [];

      const details: GmailMessageDetail[] = await Promise.all(
        messages.map(async (msg: { id: string }) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          if (!detailRes.ok) return null;
          const data = await detailRes.json();

          const headers = data.payload.headers || [];
          const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
          const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
          const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');

          return {
            id: msg.id,
            subject: subjectHeader ? subjectHeader.value : '(Sans objet)',
            date: dateHeader ? new Date(dateHeader.value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récent',
            snippet: data.snippet || '',
            from: fromHeader ? fromHeader.value : 'Inconnu',
            to: 'moi',
            isUnread: data.labelIds?.includes('UNREAD'),
            isImportant: data.labelIds?.includes('IMPORTANT')
          };
        })
      ).then(results => results.filter((r): r is GmailMessageDetail => r !== null));

      setImportantEmails(details);
      // Sync fetched real emails to Firestore
      details.forEach((email) => {
        saveEmailToFirestore(email);
      });
    } catch (err: any) {
      console.warn('Could not fetch Important Gmails: ', err);
      setImportantError(err.message || 'Erreur de connexion aux messages importants');
    } finally {
      setIsLoadingImportant(false);
    }
  };

  // Trigger list refresh whenever token updates
  useEffect(() => {
    if (gmailToken) {
      fetchSentDispatches(gmailToken);
      fetchInbox(gmailToken);
      fetchImportant(gmailToken);

      // Setup a real-time polling synchronizer (every 15 seconds)
      const interval = setInterval(() => {
        fetchSentDispatches(gmailToken);
        fetchInbox(gmailToken);
        fetchImportant(gmailToken);
      }, 15000);

      return () => clearInterval(interval);
    } else {
      setSentLogs([]);
    }
  }, [gmailToken]);

  // Synchronise les messages enregistrés depuis Firestore quand l'opérateur est déconnecté (mode temps réel sans fiction)
  useEffect(() => {
    if (gmailToken) return;

    // Load from localStorage immediately so the UI is fully populated instantly with real offline-cached messages
    try {
      const cachedInbox = localStorage.getItem('argus_cached_inbox');
      const cachedImportant = localStorage.getItem('argus_cached_important');
      if (cachedInbox) {
        setInboxEmails(JSON.parse(cachedInbox));
      }
      if (cachedImportant) {
        setImportantEmails(JSON.parse(cachedImportant));
      }
    } catch (e) {
      console.warn('Failed to load offline cached emails from localStorage', e);
    }

    setIsLoadingInbox(true);
    setIsLoadingImportant(true);

    // Timeout safety fallback: If Firestore takes more than 2 seconds to respond (e.g. offline/network issue),
    // stop the loading spinner and use the cached local storage emails.
    const timeoutId = setTimeout(() => {
      setIsLoadingInbox(false);
      setIsLoadingImportant(false);
      console.info("Firestore response pending or offline; using local cached messages.");
    }, 2000);

    const q = query(
      collection(db, 'gmail_messages'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Clear the timeout as we received a Firestore response
      clearTimeout(timeoutId);

      const allEmails: GmailMessageDetail[] = [];
      snapshot.forEach((doc) => {
        allEmails.push(doc.data() as GmailMessageDetail);
      });

      if (allEmails.length > 0) {
        // Inbox: top 10 real messages
        setInboxEmails(allEmails.slice(0, 10));

        // Important: top 10 where isImportant is true
        const important = allEmails.filter(e => e.isImportant);
        setImportantEmails(important.slice(0, 10));
      }

      setIsLoadingInbox(false);
      setIsLoadingImportant(false);

      // Visual flash indicator for new incoming messages
      setNewMailAlert(true);
      setTimeout(() => setNewMailAlert(false), 2000);
    }, (error) => {
      clearTimeout(timeoutId);
      handleFirestoreError(error, OperationType.LIST, 'gmail_messages');
      setIsLoadingInbox(false);
      setIsLoadingImportant(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [gmailToken]);

  const handleOAuthConnect = async () => {
    if (isLinking) return;
    setIsLinking(true);
    setAuthError(null);
    try {
      const loginResult = await loginWithGoogle();
      if (loginResult && loginResult.accessToken) {
        onTokenUpdate(loginResult.accessToken);
      }
    } catch (err: any) {
      console.error('Failed to link Gmail credentials: ', err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setAuthError('Le bloqueur de popups de votre navigateur a bloqué la fenêtre d\'authentification Google (car l\'application s\'exécute dans l\'iframe sécurisé d\'AI Studio). Pour résoudre ce problème, autorisez les popups pour ce site dans votre navigateur ou ouvrez l\'application dans un nouvel onglet via le bouton en haut à droite d\'AI Studio.');
      } else {
        setAuthError(err.message || 'Impossible de lier vos identifiants Google.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  // Helper to build UTF-8 Base64URL-safe MIME raw message
  const buildRawMimeMessage = (to: string, subject: string, htmlContent: string) => {
    const fromLine = user?.email ? `From: ${user.displayName || 'Opérateur'} <${user.email}>` : '';
    const emailParts = [
      `To: ${to}`,
      fromLine,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      htmlContent
    ].filter(Boolean);

    const emailStr = emailParts.join('\r\n');
    
    // RFC 4648 Base64URL Encoding
    return btoa(unescape(encodeURIComponent(emailStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const initiateSendDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !currentResult) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAndSend = async () => {
    setIsConfirmModalOpen(false);
    if (!recipient || !currentResult || !gmailToken) return;

    setIsSending(true);
    setSendSuccess(false);
    setSendError(null);

    // Build Email HTML Template (with Gmail search subject prefix to retain indexing sync)
    const subject = `ARGUS Decision Dispatch: ${currentResult.feedType} - ${currentResult.id.toUpperCase()}`;
    const emailHtml = `
      <div style="background-color: #0b0f19; color: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #1e293b;">
        <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: bold; letter-spacing: -0.025em;">COMMUNIQUÉ DE DÉCISION PRÉDICTIVE ARGUS</h1>
          <p style="color: #818cf8; font-size: 11px; font-family: monospace; margin: 4px 0 0 0; text-transform: uppercase;">À : DESTINATAIRE DU SERVICE DE DÉCISION</p>
        </div>

        <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #1e293b;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #94a3b8; font-size: 11px; padding: 4px 0;">CODE DE L'INCIDENT</td>
              <td style="color: #f1f5f9; font-size: 11px; font-family: monospace; font-weight: bold; text-align: right; padding: 4px 0;">${currentResult.id.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 11px; padding: 4px 0;">SECTEUR / ID DE FLUX</td>
              <td style="color: #818cf8; font-size: 11px; font-weight: bold; text-align: right; padding: 4px 0;">${currentResult.feedType}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 11px; padding: 4px 0;">CONFIANCE LOGIQUE</td>
              <td style="color: #10b981; font-size: 11px; font-weight: bold; text-align: right; padding: 4px 0;">${((1 - currentResult.entropyScore) * 100).toFixed(0)}% NOMINALE</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 11px; padding: 4px 0;">SCORE D'ENTROPIE</td>
              <td style="color: #f59e0b; font-size: 11px; font-family: monospace; text-align: right; padding: 4px 0;">${currentResult.entropyScore}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">Choix stratégique consolidé</h2>
          <p style="font-size: 13px; line-height: 1.6; color: #e2e8f0; margin: 0; background-color: rgba(99, 102, 241, 0.05); padding: 12px; border-radius: 6px; border-left: 3px solid #6366f1; font-style: italic;">
            "${currentResult.finalDecision}"
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">Contre-mesures applicables</h2>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
            ${currentResult.branches.map(b => `<li style="margin-bottom: 6px; color: #cbd5e1;">${b.recommendation}</li>`).join('')}
          </ul>
        </div>

        ${customNotes ? `
        <div style="margin-bottom: 20px; border-top: 1px solid #1e293b; pt: 16px;">
          <h2 style="color: #94a3b8; font-size: 12px; margin: 12px 0 6px 0;">Commentaires de l'opérateur :</h2>
          <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0; background-color: #0f172a; padding: 10px; border-radius: 6px; border: 1px dashed #334155;">
            ${customNotes}
          </p>
        </div>
        ` : ''}

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 10px; color: #64748b; font-family: monospace;">
          <span>Cette notification est envoyée de manière autonome via l'intégration Gmail • CONSORTIUM ARGUS</span>
        </div>
      </div>
    `;

    try {
      const rawBase64 = buildRawMimeMessage(recipient, subject, emailHtml);

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${gmailToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: rawBase64 })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || `Erreur de l'API Gmail (${response.status})`);
      }

      setSendSuccess(true);
      setCustomNotes('');
      // Trigger sent log list refresh
      fetchSentDispatches(gmailToken);
    } catch (err: any) {
      console.error('Failed to dispatch alert: ', err);
      setSendError(err.message || 'Échec de l\'envoi du briefing');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      className="rounded-xl border border-slate-900 bg-slate-950/80 backdrop-blur-md text-slate-100 overflow-hidden shadow-2xl flex flex-col h-[600px] font-sans"
      id="gmail-integration-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-900 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Mail className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm tracking-wide text-slate-100 flex items-center gap-1.5">
              <span>MESSAGERIE LOGISTIQUE SÉCURISÉE GMAIL</span>
              <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold font-mono px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                <span>TEMPS RÉEL SÉCURISÉ</span>
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              CORRIDOR DE TRANSMISSION DES FLUX • SOPHIA & MICHAEL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton de test tactile et sonore */}
          <button
            onClick={() => triggerAlertNotification("ARGUS Alerte Tactile & Sonore (Test)")}
            title="Tester l'alerte de réception (Vibration & Son tactiques)"
            id="btn-test-tactile-alert"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-amber-400 hover:text-amber-300 text-[10px] font-semibold transition-all flex items-center gap-1.5 font-sans"
          >
            <Bell className="w-3 h-3 animate-pulse text-amber-400" />
            <span>Tester Alerte</span>
          </button>

          {gmailToken ? (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded">
                ● LIAISON ACTIVE : {user?.email}
              </span>
              <button
                onClick={async () => {
                  setIsLoadingLogs(true);
                  setIsLoadingInbox(true);
                  setIsLoadingImportant(true);
                  await Promise.all([
                    fetchSentDispatches(gmailToken),
                    fetchInbox(gmailToken),
                    fetchImportant(gmailToken)
                  ]);
                }}
                title="Actualiser les messages Gmail"
                id="btn-refresh-gmail-logs"
                className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-slate-100 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${(isLoadingLogs || isLoadingInbox || isLoadingImportant) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/60 px-2 py-0.5 rounded">
                ▲ MESSAGES FIRESTORE RÉELS (TEMPS RÉEL SANS FICTION)
              </span>
              <button
                onClick={handleOAuthConnect}
                disabled={isLinking}
                id="btn-connect-gmail-oauth-header"
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {isLinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                <span>Connexion</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-900 bg-slate-950/40">
        <button
          onClick={() => setActiveTab('realtime')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'realtime'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>BOÎTE GMAIL EN TEMPS RÉEL (10 DERNIERS)</span>
          {newMailAlert ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'dispatch'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>CONSOLE D'EXPÉDITION & LOGS D'ENVOIS ToT</span>
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto">
        {authError && (
          <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-xs text-amber-400 font-mono space-y-1.5 text-left relative">
            <button 
              onClick={() => setAuthError(null)}
              className="absolute top-1.5 right-1.5 text-slate-500 hover:text-slate-300 text-sm font-bold font-sans"
              title="Fermer l'alerte"
            >
              ×
            </button>
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>⚠️ ACTION REQUISE : Bloqueur de popups détecté</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-300 pl-5">
              {authError}
            </p>
          </div>
        )}
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-600" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Autorisation de session requise</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal font-mono">
                Connectez-vous ci-dessus en tant qu'opérateur autorisé pour lier vos identifiants Google et activer la télémétrie de messagerie ARGUS.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'realtime' ? (
              <motion.div 
                key="realtime-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col space-y-4 overflow-y-auto"
              >
                {/* Left Column: Inbox */}
                <div className="flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>📥 BOÎTE DE RÉCEPTION (10 DERNIERS)</span>
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">Mise à jour automatique</span>
                  </div>

                  {isLoadingInbox ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 bg-slate-900/10 rounded-xl border border-slate-900/60">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                      <span className="text-[9px] text-slate-500 font-mono mt-2">Récupération des emails...</span>
                    </div>
                  ) : inboxError ? (
                    <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-lg text-[9px] text-red-400 font-mono flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{inboxError}</span>
                    </div>
                  ) : inboxEmails.length === 0 ? (
                    <div className="p-8 rounded-xl border border-slate-900 bg-slate-900/10 text-center space-y-1.5 flex-1 flex flex-col items-center justify-center">
                      <Inbox className="w-6 h-6 text-slate-700" />
                      <span className="text-[10px] text-slate-500 font-mono">Aucun message trouvé</span>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[250px] pr-1">
                      {inboxEmails.map((email) => (
                        <div 
                          key={email.id} 
                          className={`p-2.5 rounded-lg border transition-all text-left flex flex-col space-y-1 ${
                            email.isUnread 
                              ? 'bg-slate-900/80 border-indigo-500/40 shadow-sm shadow-indigo-500/5 hover:bg-slate-900' 
                              : 'bg-slate-900/20 border-slate-900 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[10px] text-slate-200 truncate max-w-[170px] font-mono">
                              {email.from}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400 shrink-0 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900/80">
                              {email.date}
                            </span>
                          </div>
                          <h4 className="text-[9.5px] font-bold text-indigo-300 leading-tight">
                            {email.subject}
                          </h4>
                          <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">
                            {email.snippet}
                          </p>
                          <div className="flex items-center gap-1.5 pt-1 text-[8px] font-mono">
                            {email.isUnread && (
                              <span className="bg-emerald-950 text-emerald-400 px-1 py-0.2 rounded border border-emerald-800 text-[7px] font-bold">NON LU</span>
                            )}
                            {email.isImportant && (
                              <span className="bg-indigo-950 text-indigo-400 px-1 py-0.2 rounded border border-indigo-800 text-[7px] font-bold flex items-center gap-0.5">
                                <Star className="w-2 h-2 fill-indigo-400 text-indigo-400" />
                                <span>IMPORTANT</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Important Emails */}
                <div className="flex flex-col space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span>⭐ MESSAGES IMPORTANTS</span>
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 font-semibold text-indigo-400">Filtre prioritaire</span>
                  </div>

                  {isLoadingImportant ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 bg-slate-900/10 rounded-xl border border-slate-900/60">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                      <span className="text-[9px] text-slate-500 font-mono mt-2">Filtrage prioritaire...</span>
                    </div>
                  ) : importantError ? (
                    <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-lg text-[9px] text-red-400 font-mono flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{importantError}</span>
                    </div>
                  ) : importantEmails.length === 0 ? (
                    <div className="p-8 rounded-xl border border-slate-900 bg-slate-900/10 text-center space-y-1.5 flex-1 flex flex-col items-center justify-center">
                      <Star className="w-6 h-6 text-slate-700" />
                      <span className="text-[10px] text-slate-500 font-mono">Aucun e-mail important trouvé</span>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[250px] pr-1">
                      {importantEmails.map((email) => (
                        <div 
                          key={email.id} 
                          className={`p-2.5 rounded-lg border border-indigo-950/40 transition-all text-left flex flex-col space-y-1 bg-indigo-950/5 hover:bg-indigo-950/10`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[10px] text-slate-200 truncate max-w-[170px] font-mono flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                              <span>{email.from}</span>
                            </span>
                            <span className="text-[8px] font-mono text-indigo-300 shrink-0 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/40">
                              {email.date}
                            </span>
                          </div>
                          <h4 className="text-[9.5px] font-bold text-slate-200 leading-tight">
                            {email.subject}
                          </h4>
                          <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">
                            {email.snippet}
                          </p>
                          <div className="flex items-center gap-1.5 pt-1 text-[8px] font-mono">
                            {email.isUnread && (
                              <span className="bg-emerald-950 text-emerald-400 px-1 py-0.2 rounded border border-emerald-800 text-[7px] font-bold">NON LU</span>
                            )}
                            <span className="bg-indigo-950/80 text-indigo-400 px-1 py-0.2 rounded border border-indigo-800 text-[7px] font-bold">VIP INTERNE</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="dispatch-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:gap-4 lg:space-y-0 space-y-4"
              >
                {/* Form Column */}
                <div className="lg:col-span-7 flex flex-col space-y-3">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-900 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-800 pb-1.5">
                      <span className="text-slate-400">CONSOLE D'EXPÉDITION</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        OPÉRATEUR : {user.email}
                      </span>
                    </div>

                    {currentResult ? (
                      <form onSubmit={initiateSendDispatch} className="space-y-3">
                        <div>
                          <label htmlFor="input-gmail-recipient" className="block text-[10px] font-mono text-slate-400 mb-1">
                            ADRESSE EMAIL DU DESTINATAIRE
                          </label>
                          <input
                            type="email"
                            id="input-gmail-recipient"
                            required
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="Ex. operateur@argus-consortium.io"
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label htmlFor="textarea-gmail-notes" className="block text-[10px] font-mono text-slate-400 mb-1">
                            NOTES DE TERRAIN SUPPLÉMENTAIRES (OPTIONNEL)
                          </label>
                          <textarea
                            id="textarea-gmail-notes"
                            rows={3}
                            value={customNotes}
                            onChange={(e) => setCustomNotes(e.target.value)}
                            placeholder="Spécifiez les coordonnées d'acheminement, les actions à mener ou les priorités du système..."
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                          />
                        </div>

                        {sendError && (
                          <div className="p-2 bg-red-950/20 border border-red-900/40 rounded text-[10px] text-red-400 flex items-start gap-1.5 font-mono">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{sendError}</span>
                          </div>
                        )}

                        {sendSuccess && (
                          <div className="p-2 bg-emerald-950/20 border border-emerald-900/40 rounded text-[10px] text-emerald-400 flex items-start gap-1.5 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                            <span>Alerte expédiée avec succès ! Éléments envoyés consultés.</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          id="btn-dispatch-decision-gmail"
                          disabled={isSending || !gmailToken}
                          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Encodage MIME & Transfert...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Expédier l'alerte de décision par Gmail</span>
                            </>
                          )}
                        </button>
                        {!gmailToken && (
                          <p className="text-[9px] text-amber-400 font-mono text-center">
                            * Lier votre compte Gmail sécurisé ci-dessus pour activer les envois réels.
                          </p>
                        )}
                      </form>
                    ) : (
                      <div className="py-8 text-center space-y-1.5">
                        <p className="text-xs text-slate-500 font-medium">Aucune décision chargée pour l'expédition</p>
                        <p className="text-[10px] text-slate-600 max-w-xs mx-auto leading-normal font-mono">
                          Veuillez sélectionner un élément d'archive ou analyser un flux de télémétrie d'abord pour compiler le rapport de briefing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sent Logs Column */}
                <div className="lg:col-span-5 flex flex-col space-y-2.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                    LOGS RÉCENTS DES ENVOIS ARGUS
                  </span>

                  {isLoadingLogs ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                      <span className="text-[9px] text-slate-500 font-mono mt-2">Interrogation de la boîte d'envoi...</span>
                    </div>
                  ) : logError ? (
                    <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-lg text-[9px] text-red-400 font-mono flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Impossible de récupérer les messages envoyés.</span>
                    </div>
                  ) : sentLogs.length === 0 ? (
                    <div className="p-4 rounded-xl border border-slate-900/80 bg-slate-900/10 text-center space-y-1.5 flex-1 flex flex-col items-center justify-center min-h-[150px]">
                      <Inbox className="w-6 h-6 text-slate-700" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono block">Aucun envoi trouvé</span>
                        <span className="text-[8px] text-slate-600 max-w-[150px] mx-auto block leading-normal mt-0.5">
                          Les messages envoyés avec l'objet "ARGUS Decision" seront indexés ici automatiquement.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] pr-1">
                      {sentLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="p-2 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-900 rounded-lg transition-all flex flex-col space-y-1.5 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] text-indigo-400 font-bold max-w-[140px] truncate">
                              {log.subject.replace('ARGUS Decision Dispatch: ', '')}
                            </span>
                            <span className="text-[8px] font-mono text-slate-500">{log.date}</span>
                          </div>
                          <p className="text-[9.5px] text-slate-300 line-clamp-2 leading-relaxed">
                            {log.snippet}
                          </p>
                          <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 border-t border-slate-900/60 pt-1">
                            <span className="truncate max-w-[150px]">À : {log.to}</span>
                            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> ENVOYÉ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Explicit User Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && currentResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl font-sans"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span className="font-display font-bold text-xs tracking-wide text-slate-100">
                    CONFIRMER L'EXPÉDITION GMAIL
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-3.5">
                <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 flex gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">Autorisation d'envoi Gmail</p>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Cette action enverra un e-mail officiel d'expédition de décision au destinataire en votre nom en utilisant vos identifiants Gmail connectés.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-400">Compte expéditeur :</span>
                    <span className="text-slate-200 font-mono">{user?.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-400">Client destinataire :</span>
                    <span className="text-indigo-400 font-semibold font-mono">{recipient}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-400">Code de l'incident :</span>
                    <span className="text-slate-200 font-mono font-bold">{currentResult.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-[11px]">
                    <span className="text-slate-400">Sujet de la décision :</span>
                    <span className="text-slate-300 italic max-w-[200px] truncate">
                      "{currentResult.finalDecision}"
                    </span>
                  </div>
                  {customNotes && (
                    <div className="flex flex-col gap-1 pt-1.5 text-[11px]">
                      <span className="text-slate-400">Notes de l'opérateur :</span>
                      <p className="bg-slate-950 p-2 rounded text-slate-400 leading-normal border border-slate-800/50 italic">
                        {customNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  id="btn-cancel-dispatch"
                  className="px-3.5 py-1.5 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  id="btn-confirm-dispatch"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/15 transition-all flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Confirmer & Envoyer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
