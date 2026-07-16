/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { FeedItem, ToTAnalysisResult, APIIntegrationLog } from './types';
import { initialFeedItems } from './data/mockFeeds';
import { FeedCard } from './components/FeedCard';
import { ToTReasoner } from './components/ToTReasoner';
import { QuantumEntropyGauge } from './components/QuantumEntropyGauge';
import { EliteMonetization } from './components/EliteMonetization';
import { DecisionArchive } from './components/DecisionArchive';
import { PredictiveKPIs } from './components/PredictiveKPIs';
import { EntropyTrendVisualizer } from './components/EntropyTrendVisualizer';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { ExecutiveSummaryDashboard } from './components/ExecutiveSummaryDashboard';
import { CriticalRouteTimeline } from './components/CriticalRouteTimeline';
import { StmHealthTrendVisualizer } from './components/StmHealthTrendVisualizer';
import { StmNetworkTopology } from './components/StmNetworkTopology';
import { StmDecisionCorrelationVisualizer } from './components/StmDecisionCorrelationVisualizer';
import { PredictiveAlertEngine } from './components/PredictiveAlertEngine';
import { DecisionInsights } from './components/DecisionInsights';
import { ArgusStreamDashboard } from './components/ArgusStreamDashboard';
import { ApiTester } from './components/ApiTester';
import { ArgusMarketingCampaign } from './components/ArgusMarketingCampaign';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  Shield, 
  Activity, 
  Plus, 
  CheckCircle, 
  X,
  Sparkles,
  AlertOctagon,
  Clock,
  ExternalLink,
  LogIn,
  LogOut,
  RefreshCw,
  Shuffle,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  TrendingUp,
  TrendingDown,
  Mail,
  Calendar,
  Folder,
  FileSpreadsheet,
  BookOpen,
  Grid,
  FileText
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser, handleFirestoreError, OperationType, getCachedAccessToken } from './lib/firebase';
import { GmailIntegration } from './components/GmailIntegration';
import { GoogleCalendarIntegration } from './components/GoogleCalendarIntegration';
import { GoogleKeepIntegration } from './components/GoogleKeepIntegration';
import { GoogleDriveIntegration } from './components/GoogleDriveIntegration';
import { GoogleSheetsIntegration } from './components/GoogleSheetsIntegration';
import { STMIncidentMap } from './components/STMIncidentMap';
import { OpenSkyTracker, FlightVector } from './components/OpenSkyTracker';
import { AirspaceOverview } from './components/AirspaceOverview';
import { GoogleFormsIntegration } from './components/GoogleFormsIntegration';
import { TrafficCctvPanel } from './components/TrafficCctvPanel';
import { StmRealTimeTracker } from './components/StmRealTimeTracker';

export default function App() {
  // Application state with offline caching fallbacks
  const [feeds, setFeeds] = useState<FeedItem[]>(() => {
    try {
      const cached = localStorage.getItem('argus_cached_feeds');
      return cached ? JSON.parse(cached) : initialFeedItems;
    } catch (e) {
      return initialFeedItems;
    }
  });
  const [selectedFeed, setSelectedFeed] = useState<FeedItem | null>(null);
  const [flights, setFlights] = useState<FlightVector[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightVector | null>(null);
  const [activeGeospatialTab, setActiveGeospatialTab] = useState<'map' | 'airspace' | 'cctv' | 'gtfs'>('map');
  const [analysisResult, setAnalysisResult] = useState<ToTAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [decisionsArchive, setDecisionsArchive] = useState<ToTAnalysisResult[]>(() => {
    try {
      const cached = localStorage.getItem('argus_cached_decisions');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [apiLogs, setApiLogs] = useState<APIIntegrationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [sectorFilter, setSectorFilter] = useState<'ALL' | 'STM' | 'AVIATION' | 'MARITIME' | 'CCTV'>('ALL');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);

  // Authenticated fetch helper for secured Cloud SQL API endpoints
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = { ...options.headers } as Record<string, string>;
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.warn('Error getting Auth ID token:', err);
      }
    }
    return fetch(url, { ...options, headers });
  };

  // Alerts Mute State (silences pulsing line status animations & notification alerts)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('argus_alerts_muted') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('argus_alerts_muted', String(isMuted));
  }, [isMuted]);

  // Sync state changes with localStorage for offline resiliency
  useEffect(() => {
    if (decisionsArchive && decisionsArchive.length > 0) {
      localStorage.setItem('argus_cached_decisions', JSON.stringify(decisionsArchive));
    }
  }, [decisionsArchive]);

  useEffect(() => {
    if (feeds && feeds.length > 0) {
      localStorage.setItem('argus_cached_feeds', JSON.stringify(feeds));
    }
  }, [feeds]);

  // System theme auto-detection (via matchMedia) to force dark mode by default if operador system is dark
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        // We still keep our beautiful slate dark theme as the master style, but we align classes
        document.documentElement.classList.add('dark');
      }
    };
    
    // Initial evaluation
    handleSystemThemeChange(mediaQuery);
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // STM Real-Time Telemetry States
  const [stmLiveStatus, setStmLiveStatus] = useState<any>(null);
  const [isFetchingStm, setIsFetchingStm] = useState<boolean>(false);
  const [lastStmFetchTime, setLastStmFetchTime] = useState<Date | null>(null);

  // Correlation Analysis & Next-Hour Fluidity Trend Prediction
  const predictedFluidityTrend = useMemo(() => {
    // 1. Calculate current STM fluidity score
    let stmFluidity = 95;
    feeds.forEach(f => {
      let weight = 0;
      if (f.severity === 'low') weight = 5;
      else if (f.severity === 'medium') weight = 12;
      else if (f.severity === 'high') weight = 25;
      else if (f.severity === 'critical') weight = 45;

      if (f.type === 'STM') {
        stmFluidity = Math.max(20, stmFluidity - weight * 0.8);
      }
    });
    const currentStmFluidity = Math.round(stmFluidity);

    // 2. Re-create the last 24-hour historical progression (8 points, every 3 hours)
    const hoursBack = [21, 18, 15, 12, 9, 6, 3, 0];
    const points = hoursBack.map((hours, index) => {
      const pointTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      let fluidity = 95;
      if (hours === 0) {
        fluidity = currentStmFluidity;
      } else {
        const hourOfDay = pointTime.getHours();
        let commuteImpact = 0;
        if (hourOfDay >= 7 && hourOfDay <= 9) commuteImpact = 12;
        else if (hourOfDay >= 16 && hourOfDay <= 18) commuteImpact = 15;
        
        const currentDeviation = 95 - currentStmFluidity;
        const historyRatio = hours / 24;
        fluidity = Math.max(25, Math.round(
          95 - commuteImpact - (currentDeviation * (1 - historyRatio)) + (Math.sin(index * 2) * 4)
        ));
      }
      return { x: -hours, y: fluidity };
    });

    // 3. Compute Pearson correlation coefficient (r) between x (time offset) and y (fluidity)
    const n = points.length;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);
    const sumY2 = points.reduce((acc, p) => acc + p.y * p.y, 0);
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);

    const meanX = sumX / n;
    const meanY = sumY / n;

    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = den !== 0 ? num / den : 0;

    // Variance & Slope
    const varX = sumX2 / n - meanX * meanX;
    const covXY = sumXY / n - meanX * meanY;
    const slope = varX !== 0 ? covXY / varX : 0;
    const intercept = meanY - slope * meanX;

    // Next hour prediction (x = 1)
    const predictedValue = Math.min(100, Math.max(20, Math.round(slope * 1 + intercept)));
    const correlationCoefficient = parseFloat(Math.min(1, Math.max(-1, r)).toFixed(3));

    // Determine status & trend
    let direction: 'up' | 'down' | 'stable' = 'stable';
    let label = 'STABLE';
    let colorClass = 'text-slate-400';
    let bgClass = 'bg-slate-950/80';
    let borderClass = 'border-slate-800';

    if (slope > 0.1) {
      direction = 'up';
      label = 'AMÉLIORATION';
      colorClass = 'text-emerald-400';
      bgClass = 'bg-emerald-950/30';
      borderClass = 'border-emerald-500/30';
    } else if (slope < -0.1) {
      direction = 'down';
      label = 'DÉGRADATION';
      colorClass = 'text-red-400';
      bgClass = 'bg-red-950/30';
      borderClass = 'border-red-500/30';
    }

    return {
      predictedValue,
      correlationCoefficient,
      direction,
      label,
      colorClass,
      bgClass,
      borderClass,
      slope: parseFloat(slope.toFixed(3)),
      currentStmFluidity
    };
  }, [feeds]);

  const fetchStmLive = async () => {
    setIsFetchingStm(true);
    try {
      const res = await fetchWithAuth('/api/stm/realtime');
      
      if (!res.ok) {
        console.warn('STM live status sync returned non-OK status:', res.status);
        setIsFetchingStm(false);
        return;
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('STM live status sync returned non-JSON content-type:', contentType);
        setIsFetchingStm(false);
        return;
      }

      const result = await res.json();
      if (result.success && result.data) {
        const liveData = {
          ...result.data,
          apiKeyActive: result.apiKeyActive
        };
        setStmLiveStatus(liveData);
        setLastStmFetchTime(new Date());

        // Transform real-time statuses/alerts into FeedItems
        const newLiveFeeds: FeedItem[] = [];

        // Add line-by-line feeds if they are not "normal"
        const lines = result.data.lines;
        if (lines) {
          Object.entries(lines).forEach(([lineKey, info]: [string, any]) => {
            if (info.status !== 'normal') {
              newLiveFeeds.push({
                id: `live-stm-line-${lineKey}`,
                type: 'STM',
                title: `Métro Ligne ${lineKey.charAt(0).toUpperCase() + lineKey.slice(1)} : ${info.status === 'delay' ? 'Retards signalés' : 'Interruption de service'}`,
                source: 'stm.info (Temps Réel)',
                severity: info.status === 'delay' ? 'medium' : 'high',
                timestamp: new Date().toISOString(),
                value: info.status === 'delay' ? 'Retard de ligne' : 'Interruption',
                details: info.message || 'Problème technique signalé sur la ligne.',
                mcpStandardized: true
              });
            }
          });
        }

        // Add major alerts if any
        if (Array.isArray(result.data.majorAlerts)) {
          result.data.majorAlerts.forEach((alert: any, index: number) => {
            newLiveFeeds.push({
              id: `live-stm-alert-${index}`,
              type: 'STM',
              title: alert.title || 'Alerte réseau STM',
              source: 'stm.info (Temps Réel)',
              severity: alert.severity || 'medium',
              timestamp: new Date().toISOString(),
              value: alert.lineAffected ? `Secteur ${alert.lineAffected.toUpperCase()}` : 'Alerte Live',
              details: alert.details || '',
              mcpStandardized: true
            });
          });
        }

        // Update feeds: remove old live feeds and prepend new ones
        setFeeds(prev => {
          const staticFeeds = prev.filter(f => !f.id.startsWith('live-stm-'));
          return [...newLiveFeeds, ...staticFeeds];
        });

        // Trigger telemetry log update
        fetchTelemetryLogs();
      }
    } catch (err) {
      console.warn('Failed to sync STM live status gracefully:', err);
    } finally {
      setIsFetchingStm(false);
    }
  };

  // Automated 60-second polling for real-time STM telemetry
  useEffect(() => {
    fetchStmLive();
    const interval = setInterval(() => {
      fetchStmLive();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Incident state cleaning & de-duplication logic (Protocol CLEANUP-V2)
  useEffect(() => {
    let hasChanged = false;
    const cleanedFeeds = feeds.map(feed => {
      const titleLower = feed.title.toLowerCase();
      const valLower = feed.value.toLowerCase();
      const detLower = feed.details.toLowerCase();
      
      const isDissipated = titleLower.includes('dissipé') || titleLower.includes('dissipée') ||
                            valLower.includes('dissipé') || valLower.includes('dissipée') ||
                            detLower.includes('dissipé') || detLower.includes('dissipée') ||
                            titleLower.includes('résorbé') || titleLower.includes('résorbée') ||
                            valLower.includes('résorbé') || valLower.includes('résorbée') ||
                            titleLower.includes('résolu') || titleLower.includes('résolue') ||
                            valLower.includes('nominal');
                            
      if (isDissipated && feed.severity !== 'low') {
        hasChanged = true;
        return {
          ...feed,
          severity: 'low' as const,
          value: feed.value.toLowerCase().includes('nominal') ? feed.value : 'Nominal (Dissipé)'
        };
      }
      return feed;
    });

    // De-duplicate feeds by ID
    const uniqueFeeds: FeedItem[] = [];
    const seenIds = new Set<string>();
    cleanedFeeds.forEach(f => {
      if (!seenIds.has(f.id)) {
        seenIds.add(f.id);
        uniqueFeeds.push(f);
      } else {
        hasChanged = true;
      }
    });

    if (hasChanged) {
      setFeeds(uniqueFeeds);
      localStorage.setItem('argus_cached_feeds', JSON.stringify(uniqueFeeds));
    }
  }, [feeds]);

  // Telemetry logs de-duplication
  useEffect(() => {
    let hasLogDuplicates = false;
    const uniqueLogs: APIIntegrationLog[] = [];
    const seenLogKeys = new Set<string>();

    apiLogs.forEach(log => {
      const key = log.id || `${log.endpoint}-${log.timestamp}-${log.status}`;
      if (!seenLogKeys.has(key)) {
        seenLogKeys.add(key);
        uniqueLogs.push(log);
      } else {
        hasLogDuplicates = true;
      }
    });

    if (hasLogDuplicates) {
      setApiLogs(uniqueLogs);
    }
  }, [apiLogs]);
  
  // Incident simulator form state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [simTitle, setSimTitle] = useState<string>('');
  const [simType, setSimType] = useState<'STM' | 'AVIATION' | 'MARITIME' | 'CCTV'>('STM');
  const [simSeverity, setSimSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [simValue, setSimValue] = useState<string>('');
  const [simDetails, setSimDetails] = useState<string>('');
  const [simImage, setSimImage] = useState<string>('');
  const [simSuccessMsg, setSimSuccessMsg] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Clock state for real-time UTC log synchrony
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Tooltip and Last Sync states
  const [isTooltipOpen, setIsTooltipOpen] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [operatorAuthError, setOperatorAuthError] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'gmail' | 'calendar' | 'drive' | 'sheets' | 'keep' | 'forms' | 'grid'>('grid');
  const [activeMainTab, setActiveMainTab] = useState<'supervision' | 'tot' | 'stats' | 'planner' | 'workspace' | 'api-test' | 'marketing'>('supervision');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setGmailToken(getCachedAccessToken());
      } else {
        setGmailToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAppLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setOperatorAuthError(null);
    try {
      const res = await loginWithGoogle();
      if (res && res.accessToken) {
        setGmailToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setOperatorAuthError('Le bloqueur de popups de votre navigateur a bloqué la fenêtre d\'authentification Google (car l\'application s\'exécute dans l\'iframe d\'AI Studio). Veuillez autoriser les popups pour ce site dans votre navigateur, ou ouvrez l\'application dans un nouvel onglet en cliquant sur le bouton en haut à droite d\'AI Studio pour contourner les restrictions d\'iframe.');
      } else {
        setOperatorAuthError(err.message || 'Impossible de lier vos identifiants Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAppLogout = async () => {
    try {
      await logoutUser();
      setGmailToken(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // User configuration and subscription states (for Elite Monetization integrations)
  const [alertThreshold, setAlertThreshold] = useState<number>(75);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(true);
  const [twilioEnabled, setTwilioEnabled] = useState<boolean>(() => {
    return localStorage.getItem('argus_twilio_enabled') === 'true';
  });
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState<string>(() => {
    return localStorage.getItem('argus_twilio_phone_number') || '';
  });

  // Sync operator subscription and alert configs from Firestore in real-time
  useEffect(() => {
    if (!user) return;

    const subDocRef = doc(db, 'subscriptions', user.uid);
    const unsubscribe = onSnapshot(subDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.alertThreshold !== undefined) {
          setAlertThreshold(data.alertThreshold);
        }
        if (data.isSubscribed !== undefined) {
          setIsSubscribed(data.isSubscribed);
        }
        if (data.twilioEnabled !== undefined) {
          setTwilioEnabled(data.twilioEnabled);
          localStorage.setItem('argus_twilio_enabled', String(data.twilioEnabled));
        }
        if (data.twilioPhoneNumber !== undefined) {
          setTwilioPhoneNumber(data.twilioPhoneNumber);
          localStorage.setItem('argus_twilio_phone_number', data.twilioPhoneNumber);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `subscriptions/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Handler to update Twilio configuration
  const handleUpdateTwilio = async (enabled: boolean, phoneNumber: string) => {
    setTwilioEnabled(enabled);
    setTwilioPhoneNumber(phoneNumber);
    localStorage.setItem('argus_twilio_enabled', String(enabled));
    localStorage.setItem('argus_twilio_phone_number', phoneNumber);

    if (user) {
      try {
        const subDocRef = doc(db, 'subscriptions', user.uid);
        await setDoc(subDocRef, {
          twilioEnabled: enabled,
          twilioPhoneNumber: phoneNumber
        }, { merge: true });
        setLastSyncTime(new Date());
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `subscriptions/${user.uid}`);
      }
    }
  };

  // Synchronize DaaS telemetry logs from Firestore in real-time
  useEffect(() => {
    if (!user) {
      fetchTelemetryLogs();
      return;
    }

    const q = query(
      collection(db, 'telemetry_logs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: APIIntegrationLog[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as APIIntegrationLog);
      });
      // Sort reverse-chronologically
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (items.length > 0) {
        setApiLogs(items);
      } else {
        fetchTelemetryLogs();
      }
      setLastSyncTime(new Date());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'telemetry_logs');
    });

    return () => unsubscribe();
  }, [user]);

  // Handler to update the subscription configuration in Firestore
  const handleUpdateSubscription = async (newThreshold: number, newSubscribed: boolean) => {
    setAlertThreshold(newThreshold);
    setIsSubscribed(newSubscribed);

    if (user) {
      try {
        const subDocRef = doc(db, 'subscriptions', user.uid);
        await setDoc(subDocRef, {
          email: user.email || 'operator@argus.io',
          alertThreshold: newThreshold,
          customBriefing: true,
          registeredAt: new Date().toISOString(),
          userId: user.uid,
          isSubscribed: newSubscribed
        }, { merge: true });
        setLastSyncTime(new Date());
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `subscriptions/${user.uid}`);
      }
    }
  };

  // Real-time synchronization of decisions archive when user is logged in
  useEffect(() => {
    if (!user) {
      // Fetch default/fallback global decisions from backend
      fetchArchive();
      return;
    }

    const q = query(
      collection(db, 'decisions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: ToTAnalysisResult[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as ToTAnalysisResult);
        });
        // Sort reverse-chronologically
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setDecisionsArchive(items);
        setLastSyncTime(new Date());
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'decisions');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const fetchArchive = async () => {
    try {
      const res = await fetchWithAuth('/api/decisions/archive');
      const data = await res.json();
      if (data.success && data.archive) {
        setDecisionsArchive(data.archive);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('Failed to fetch decisions archive from server. Falling back to local state.', err);
    }
  };

  // Fetch telemetry logs on mount
  useEffect(() => {
    fetchTelemetryLogs();
  }, []);

  const fetchTelemetryLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetchWithAuth('/api/telemetry/logs');
      const data = await res.json();
      if (data.success && data.logs) {
        setApiLogs(data.logs);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('Failed to fetch telemetry logs.', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Handler: Standardize via MCP
  const handleStandardize = (id: string) => {
    setFeeds(prev => 
      prev.map(f => f.id === id ? { ...f, mcpStandardized: !f.mcpStandardized } : f)
    );
  };

  // Handler: Batch Standardize currently filtered feeds via MCP
  const handleBatchStandardize = () => {
    if (filteredFeeds.length === 0) return;
    const allStandardized = filteredFeeds.every(f => f.mcpStandardized);
    const filteredIds = new Set(filteredFeeds.map(f => f.id));
    
    setFeeds(prev => 
      prev.map(f => filteredIds.has(f.id) ? { ...f, mcpStandardized: !allStandardized } : f)
    );
  };

  const generateClientMockToT = (feed: FeedItem): ToTAnalysisResult => {
    const isCCTV = feed.type === 'CCTV' || !!feed.image;
    return {
      id: `mock-tot-${Math.random().toString(36).substring(2, 11)}`,
      feedId: feed.id,
      feedTitle: feed.title,
      feedType: feed.type,
      timestamp: new Date().toISOString(),
      entropyScore: 0.1245,
      finalDecision: isCCTV 
        ? `[SIMULATION ACTIVE] Menace potentielle écartée. Déploiement préventif des équipes de maintenance de la STM pour inspection optique directe. Les capteurs infra-rouges locaux confirment l'absence d'incendie.`
        : `[SIMULATION ACTIVE] Trafic nominal rétabli sur le secteur ${feed.title}. Optimisation dynamique des temps d'espacement des rames de métro selon la directive D.U.R. standard.`,
      branches: [
        {
          id: `mock-b-1`,
          name: "Branch 1: Architecture & Operations",
          description: `[MOCK] Restructuration du tracé opérationnel du secteur ${feed.title}. Analyse et reroutage d'urgence via des sections adjacentes de secours pour maintenir le flux de transit fluide.`,
          evaluationScore: 12,
          uncertainty: 8,
          recommendation: "Maintenir la fréquence nominale avec un ajustement d'aiguillage préventif.",
          cascadingRisks: ["Retard d'exploitation de 1.5 minutes", "Surcharges ponctuelles aux stations de transfert"]
        },
        {
          id: `mock-b-2`,
          name: "Branch 2: Recursion & Safety",
          description: "[MOCK] Simulation récursive des boucles de rétroaction sur les commutateurs de signaux. Isolation électrique du tronçon affecté sans perturber le réseau métropolitain global.",
          evaluationScore: 15,
          uncertainty: 5,
          recommendation: "Mise sous tension automatique de la ligne de secours secondaire.",
          cascadingRisks: ["Perte transitoire de la télémétrie redondante pendant 200ms"]
        },
        {
          id: `mock-b-3`,
          name: "Branch 3: ROI & Economic Impact",
          description: "[MOCK] Simulation des pénalités d'interruption commerciale selon les accords contractuels d'exploitation de la STM. Préservation de l'intégrité financière du segment.",
          evaluationScore: 5,
          uncertainty: 12,
          recommendation: "Poursuivre le transit commercial sans interruption de service.",
          cascadingRisks: ["Surconsommation mineure des batteries de réserve thermique localisées"]
        }
      ],
      cached: false,
      durationMs: 450,
      specializedAgent: feed.type === 'STM' ? {
        name: "Sentinelle Transit",
        codename: "SENTINELLE-TRANSIT" as const,
        status: "OPTIMIZED" as const,
        interpretation: `[SIMULATION] Analyse active du métro de Montréal pour le tronçon ${feed.title}. Les sous-stations d'alimentation Berri-UQAM montrent une charge thermique nominale de 74%, sous contrôle automatique.`,
        confidenceScore: 98,
        metrics: [
          { label: "Charge de sous-station", value: "74% (Nominal)", status: "NORMAL" as const },
          { label: "Intervalle de service", value: "3.5 min", status: "NORMAL" as const },
          { label: "Variation thermique", value: "+1.2°C/heure", status: "NORMAL" as const }
        ],
        contributionToToT: `[SIMULATION] Recommandation d'optimisation préventive de la ventilation tunnel pour le secteur ${feed.title} pour éviter la dégradation thermique.`
      } : feed.type === 'AVIATION' ? {
        name: "Aéro-Vigil",
        codename: "AERO-VIGIL" as const,
        status: "MONITORING" as const,
        interpretation: `[SIMULATION] Surveillance de l'espace aérien CYUL pour l'alerte ${feed.title}. Détection de légères anomalies radar d'arrière-plan résorbées par l'unité de fusion de données secondaire.`,
        confidenceScore: 94,
        metrics: [
          { label: "Déviations radar", value: "2.4% (Faible)", status: "NORMAL" as const },
          { label: "Interférences GPS", value: "-110 dBm (Aucune)", status: "NORMAL" as const },
          { label: "Couverture antenne", value: "100%", status: "NORMAL" as const }
        ],
        contributionToToT: `[SIMULATION] Validation de la stabilité de la trajectoire sur CYUL et orientation des priorités de l'analyse ToT vers la vérification météorologique.`
      } : feed.type === 'MARITIME' ? {
        name: "Aqua-Garde",
        codename: "AQUA-GARDE" as const,
        status: "MONITORING" as const,
        interpretation: `[SIMULATION] Surveillance hydrographique du corridor fluvial LaSalle. Hauteur de marée stable pour le transit, vitesse d'écoulement de 3.2 noeuds enregistrée.`,
        confidenceScore: 96,
        metrics: [
          { label: "Niveau marée LaSalle", value: "+0.1m", status: "NORMAL" as const },
          { label: "Tirant d'eau effectif", value: "11.8m", status: "NORMAL" as const },
          { label: "Débit Saint-Laurent", value: "7100 m³/s", status: "NORMAL" as const }
        ],
        contributionToToT: `[SIMULATION] Confirmation de la navigabilité du corridor fluvial LaSalle pour toutes les cargaisons régulières.`
      } : {
        name: "Scout Omni-Vision",
        codename: "OMNI-VISION" as const,
        status: "ACTIVE" as const,
        interpretation: `[SIMULATION] Traitement visuel Scout Omni-Vision de l'alerte ${feed.title}. Classification et pistage d'arrière-plan des signatures de pixels de mouvement de trafic routier régulier.`,
        confidenceScore: 97,
        metrics: [
          { label: "Pixels actifs", value: "4.8%", status: "NORMAL" as const },
          { label: "Mouvement anormal", value: "Aucun", status: "NORMAL" as const },
          { label: "Perte de trames", value: "0%", status: "NORMAL" as const }
        ],
        contributionToToT: `[SIMULATION] Élimination probabiliste de toute anomalie de périmètre visuelle, recentrant l'évaluation ToT sur l'état électrique grid.`
      },
      tripleBlindVerification: {
        consensusAchieved: true,
        isVerifiedTrue100Percent: true,
        verificationSteps: [
          "[MOCK] 1. Collecte instantanée des paquets de télémétrie STM et des logs d'incidents.",
          "[MOCK] 2. Croisement probabiliste automatique avec les bases historiques opérationnelles.",
          "[MOCK] 3. Triangulation finale par le module Scout Omni-Vision."
        ],
        agentA_Finding: "[MOCK] Télémétrie brute nominale, aucun court-circuit ni écart de tension détecté.",
        agentB_Finding: "[MOCK] Schéma de congestion standard conforme aux flux saisonniers.",
        agentC_Finding: "[MOCK] Flux CCTV stable et régulier, absence d'anomalies visuelles sur le secteur.",
        dataSegment1_Name: "Physical Telemetry & Sensor Feeds",
        dataSegment1_Status: "VALIDATED",
        dataSegment1_Details: "[MOCK] Capteurs de contact physique validés à 100%.",
        dataSegment2_Name: "Historical Baselines & Congestion Context",
        dataSegment2_Status: "VALIDATED",
        dataSegment2_Details: "[MOCK] Courbe d'affluence normale sans anomalie statistique.",
        dataSegment3_Name: "Official External Regional Reports",
        dataSegment3_Status: "VALIDATED",
        dataSegment3_Details: "[MOCK] Base régionale de transport de Montréal synchronisée."
      },
      ...(isCCTV ? {
        cctvParsing: "[MOCK] Analyse visuelle : Rames de métro Azur circulantes. Densité de voyageurs stable, aucun colis suspect ou débris ferroviaire.",
        cctvIdentification: "[MOCK] Acteurs identifiés : Rame STM standard, 42 voyageurs de quai, signalisation lumineuse active.",
        cctvJudgment: "[MOCK] Intégrité de la zone ferroviaire préservée. Absence totale de comportement ou d'objet déviant.",
        cctvTriangulationStatus: "Validé",
        cctvFinalClassification: "NORMAL",
        cctvActionRecommandee: "[MOCK] Recommandation CCTV : Maintien de l'analyse périodique d'arrière-plan sans alerte critique."
      } : {})
    };
  };

  // Handler: Analyze Feed via Tree of Thoughts (ToT)
  const handleAnalyzeFeed = async (item: FeedItem, weights?: { transit: number; safety: number; uncertainty: number }) => {
    setSelectedFeed(item);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    // 1. COURT-CIRCUIT : Si le quota est déjà épuisé, on ne tente même plus l'appel API
    if (isMockMode) {
      console.warn("🛡️ ARGUS ENGINE : Mode Simulation actif. Simulation de l'IA...");
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simuler le temps de réflexion
      const mockResult = generateClientMockToT(item);
      setAnalysisResult(mockResult);
      setDecisionsArchive(prev => [mockResult, ...prev]);
      setLastSyncTime(new Date());
      setIsAnalyzing(false);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/tot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedId: item.id,
          type: item.type,
          title: item.title,
          source: item.source,
          severity: item.severity,
          value: item.value,
          details: item.details,
          image: item.image,
          model: selectedModel,
          transitWeight: weights?.transit,
          safetyWeight: weights?.safety,
          uncertaintyWeight: weights?.uncertainty
        }),
      });

      // Interception explicite du 429 avant d'essayer de parser le JSON
      if (res.status === 429) {
        throw new Error("QUOTA_EXCEEDED");
      }

      const data = await res.json();
      if (!res.ok) {
        if (data && data.error && (data.error.includes('429') || data.error.includes('Quota') || data.error.includes('EXHAUSTED'))) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      if (data.success && data.result) {
        setAnalysisResult(data.result);
        
        // Save to cloud database if user is authenticated
        if (user) {
          try {
            const decisionDocRef = doc(db, 'decisions', data.result.id);
            await setDoc(decisionDocRef, {
              ...data.result,
              userId: user.uid
            });

            // Write telemetry transaction log to Firestore for real-time persistent monitoring
            const telemetryId = `log-${Math.random().toString(36).substr(2, 9)}`;
            const telemetryDocRef = doc(db, 'telemetry_logs', telemetryId);
            await setDoc(telemetryDocRef, {
              id: telemetryId,
              endpoint: '/api/tot/analyze',
              status: 200,
              responseSize: `${(JSON.stringify(data.result).length / 1024).toFixed(2)} KB`,
              timestamp: new Date().toISOString(),
              userId: user.uid
            });

            setLastSyncTime(new Date());
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, `decisions/${data.result.id}`);
          }
        } else {
          // Fallback to local update if unauthenticated
          setDecisionsArchive(prev => [data.result, ...prev]);
          setLastSyncTime(new Date());
        }

        // Twilio SMS critical alert dispatch check based on Firebase/local threshold
        if (twilioEnabled && twilioPhoneNumber) {
          const branches = data.result.branches || [];
          const maxScore = Math.max(...branches.map((b: any) => b.evaluationScore || 0), 0);
          
          if (maxScore >= alertThreshold) {
            try {
              const smsRes = await fetchWithAuth('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phoneNumber: twilioPhoneNumber,
                  title: item.title,
                  severity: item.severity,
                  score: maxScore,
                  threshold: alertThreshold,
                  decision: data.result.finalDecision
                }),
              });
              
              if (smsRes.ok) {
                const smsData = await smsRes.json();
                console.log('Twilio alert processed:', smsData.message);
              } else {
                console.warn('Twilio alert request returned non-OK status:', smsRes.status);
              }
            } catch (smsErr) {
              console.error('Failed to dispatch Twilio SMS alert through proxy:', smsErr);
            }
          }
        }

        fetchTelemetryLogs();
      } else {
        throw new Error(data.error || 'Server rejected evaluation');
      }
    } catch (err: any) {
      console.error('ToT synthesis failed:', err);
      if (err.message === "QUOTA_EXCEEDED" || err.status === 429 || String(err).includes('429') || String(err).includes('Quota') || String(err).includes('EXHAUSTED')) {
        console.error("🛑 Erreur 429 : Quota IA journalier atteint. Activation du Mode Simulation.");
        setIsMockMode(true);
        const mockResult = generateClientMockToT(item);
        setAnalysisResult(mockResult);
        setDecisionsArchive(prev => [mockResult, ...prev]);
        setLastSyncTime(new Date());
      } else {
        setAnalysisError(err.message || String(err));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler: Select historical decision to view in visualizer
  const handleSelectArchiveItem = (result: ToTAnalysisResult) => {
    setAnalysisResult(result);
    const originalFeed = feeds.find(f => f.id === result.feedId);
    if (originalFeed) {
      setSelectedFeed(originalFeed);
    } else {
      // Re-create a mock feed representation
      setSelectedFeed({
        id: result.feedId,
        type: result.feedType,
        title: result.feedTitle,
        source: 'Trace journal archivé',
        severity: 'high',
        timestamp: result.timestamp,
        value: 'État restauré',
        details: 'Cet élément de flux a été rechargé depuis l\'archive centrale des décisions.',
        mcpStandardized: true
      });
    }
  };

  // Handler: Clear current active visualizer selection
  const handleClearAnalysis = () => {
    setAnalysisResult(null);
    setSelectedFeed(null);
  };

  // Handler: Clear entire decision history
  const handleWipeHistory = () => {
    setDecisionsArchive([]);
  };

  // Handler: Inject custom simulated incident telemetry
  const handleSimulateIncident = async (e: FormEvent) => {
    e.preventDefault();
    if (!simTitle || !simValue || !simDetails) return;

    const newFeed: FeedItem = {
      id: `sim-${Math.random().toString(36).substr(2, 9)}`,
      type: simType,
      title: simTitle,
      source: `Contournement Simulateur ARGUS`,
      severity: simSeverity,
      timestamp: new Date().toISOString(),
      value: simValue,
      details: simDetails,
      mcpStandardized: false,
      image: simImage || undefined
    };

    setFeeds(prev => [newFeed, ...prev]);
    setSimSuccessMsg(`Incident diffusé avec succès sur la file ARGUS ${simType} !`);
    
    // Write simulator incident log to Firestore for real-time telemetry if user is authenticated
    if (user) {
      try {
        const telemetryId = `log-${Math.random().toString(36).substr(2, 9)}`;
        const telemetryDocRef = doc(db, 'telemetry_logs', telemetryId);
        await setDoc(telemetryDocRef, {
          id: telemetryId,
          endpoint: `/api/simulate/incident/${simType.toLowerCase()}`,
          status: 200,
          responseSize: '0.45 KB',
          timestamp: new Date().toISOString(),
          userId: user.uid
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `telemetry_logs`);
      }
    }

    // Clear form
    setSimTitle('');
    setSimValue('');
    setSimDetails('');
    setSimImage('');

    setTimeout(() => {
      setSimSuccessMsg('');
      setIsSimulatorOpen(false);
    }, 2000);
  };

  // Filters calculation and search filtering
  const filteredFeeds = feeds.filter(f => {
    const matchesSector = sectorFilter === 'ALL' || f.type === sectorFilter;
    const matchesSearch = globalSearch.trim() === '' || 
      f.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
      f.value.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (f.details && f.details.toLowerCase().includes(globalSearch.toLowerCase())) ||
      f.type.toLowerCase().includes(globalSearch.toLowerCase());
    return matchesSector && matchesSearch;
  });

  // Dynamic calculation for custom system health overview
  const calculateSystemHealth = () => {
    let stmFluidity = 95;
    let aviationFluidity = 98;
    let maritimeFluidity = 94;

    feeds.forEach(f => {
      let weight = 0;
      if (f.severity === 'low') weight = 5;
      else if (f.severity === 'medium') weight = 12;
      else if (f.severity === 'high') weight = 25;
      else if (f.severity === 'critical') weight = 45;

      if (f.type === 'STM') {
        stmFluidity = Math.max(20, stmFluidity - weight * 0.8);
      } else if (f.type === 'AVIATION') {
        aviationFluidity = Math.max(15, aviationFluidity - weight * 0.9);
      } else if (f.type === 'MARITIME') {
        maritimeFluidity = Math.max(20, maritimeFluidity - weight * 0.7);
      }
    });

    const averageFluidity = (stmFluidity + aviationFluidity + maritimeFluidity) / 3;
    return {
      average: Math.round(averageFluidity),
      stm: Math.round(stmFluidity),
      aviation: Math.round(aviationFluidity),
      maritime: Math.round(maritimeFluidity)
    };
  };

  const systemHealth = calculateSystemHealth();

  // Format specifically in Montreal/Eastern Time for the user (Heure de l'Est / 7H01:23)
  const formatEstTime = (date: Date, includeSeconds: boolean = true) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Montreal',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const second = parts.find(p => p.type === 'second')?.value || '00';
      return includeSeconds ? `${hour}H${minute}:${second}` : `${hour}H${minute}`;
    } catch (e) {
      return date.toLocaleTimeString('fr-CA', { hour12: false });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased justify-center items-center p-6" id="argus-skeleton-loader">
        <div className="w-full max-w-4xl space-y-6 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900" />
              <div className="space-y-2">
                <div className="h-5 w-48 bg-slate-900 rounded" />
                <div className="h-3 w-32 bg-slate-900 rounded" />
              </div>
            </div>
            <div className="h-8 w-40 bg-slate-900 rounded" />
          </div>

          {/* Grid Layout Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column Skeleton */}
            <div className="md:col-span-2 space-y-6">
              <div className="h-48 bg-slate-900/60 rounded-xl border border-slate-900 p-5 space-y-4">
                <div className="h-4 w-1/3 bg-slate-900 rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-900 rounded" />
                  <div className="h-3 w-5/6 bg-slate-900 rounded" />
                  <div className="h-3 w-2/3 bg-slate-900 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-slate-900/40 rounded-xl border border-slate-900/60 p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-4 w-1/2 bg-slate-900 rounded" />
                      <div className="h-4 w-1/4 bg-slate-900 rounded" />
                    </div>
                    <div className="h-3 w-3/4 bg-slate-900 rounded" />
                    <div className="h-2 w-full bg-slate-900 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column Skeleton */}
            <div className="space-y-6">
              <div className="h-80 bg-slate-900/80 rounded-xl border border-slate-900 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-4 w-2/3 bg-slate-900 rounded" />
                  <div className="h-3 w-1/2 bg-slate-900 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-10 bg-slate-900 rounded" />
                  <div className="h-10 bg-slate-900 rounded" />
                </div>
                <div className="h-10 bg-slate-900 rounded" />
              </div>
            </div>
          </div>

          {/* Footer status loading message */}
          <div className="flex flex-col items-center justify-center pt-8 space-y-2 border-t border-slate-900/40">
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>CONNEXION INITIALE À L'INFRASTRUCTURE SÉCURISÉE FIREBASE...</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">SYS_STATUS: ETABLISHING CRYPTOGRAPHIC LIAISON WITH CLOUD DATASTORE (US-WEST1)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* 1. Header (Aesthetic display typography, UTC Clock, status indicator) */}
      <header className="p-4 bg-slate-900/60 border-b border-slate-900/80 md:sticky md:top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/15">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg tracking-tight text-white">
                  MOTEUR DE DÉCISION ARGUS
                </h1>
                <span 
                  className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 cursor-help relative"
                  onMouseEnter={() => setIsTooltipOpen(true)}
                  onMouseLeave={() => setIsTooltipOpen(false)}
                  onTouchStart={() => setIsTooltipOpen(!isTooltipOpen)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CŒUR ACTIF</span>

                  <AnimatePresence>
                    {isTooltipOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 shadow-2xl shadow-black/85 rounded-xl p-4 text-left z-50 backdrop-blur-md font-sans text-xs normal-case text-slate-200 pointer-events-none"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                          <span className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            État de santé du système
                          </span>
                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50 font-bold">
                            {systemHealth.average}% NOMINAL
                          </span>
                        </div>

                        <div className="space-y-2 text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Fluidité STM :</span>
                            <span className="font-mono text-[11px] font-bold text-slate-200">{systemHealth.stm}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Fluidité Aviation :</span>
                            <span className="font-mono text-[11px] font-bold text-slate-200">{systemHealth.aviation}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Fluidité Maritime :</span>
                            <span className="font-mono text-[11px] font-bold text-slate-200">{systemHealth.maritime}%</span>
                          </div>
                          
                          <div className="border-t border-slate-800 pt-2.5 mt-2.5 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Logs de télémétrie actifs :</span>
                              <span className="font-mono text-indigo-400 font-bold">{apiLogs.length} Entrées</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Dernier ToT évalué :</span>
                              <span className="font-mono text-purple-400 font-bold">{decisionsArchive.length} DÉC</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/40 pt-2 mt-1">
                              <span>Dernière synchro (Est) :</span>
                              <span className="font-mono text-slate-300 font-semibold">
                                {formatEstTime(lastSyncTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                OPTIMISATEUR DE TRANSIT ToT MULTIDISCIPLINAIRE (STM / AVIATION / MARITIME)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono">
            {/* Eastern Time (Montreal) synchrony */}
            <div className="bg-slate-950 px-3.5 py-1.5 rounded border border-slate-900 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-[10px]">HEURE DE L'EST (MTR) :</span>
              <span className="text-slate-200 font-semibold">{formatEstTime(currentTime)}</span>
            </div>

            {/* Custom incident simulator launcher */}
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md hover:shadow-indigo-600/10 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Simuler une alerte</span>
            </button>

            {/* Firebase Google Auth Panel */}
            {authLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-slate-800 border-t-indigo-500 animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-900">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Opérateur'} className="w-5 h-5 rounded-full ring-1 ring-indigo-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold text-[9px]">
                    {user.displayName?.slice(0, 2).toUpperCase() || 'OP'}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-slate-300 font-medium leading-none">{user.displayName || 'Opérateur'}</span>
                  <span className="text-[7px] text-emerald-400 font-mono leading-none mt-0.5">AUTORISÉ</span>
                </div>
                <button
                  onClick={handleAppLogout}
                  title="Déconnecter la session opérateur"
                  className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-red-400 transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAppLogin}
                disabled={isLoggingIn}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-900 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-800 border-t-indigo-500 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>{isLoggingIn ? 'Connexion...' : 'Connexion Opérateur'}</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Navigation principale par onglets */}
      <div className="bg-slate-900/60 border-b border-slate-900/80 py-3 md:sticky md:top-[73px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex overflow-x-auto md:flex-wrap gap-2.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {([
            { key: 'supervision', label: 'Supervision Live', icon: '🗺️', desc: 'Cartographie & Radar' },
            { key: 'tot', label: 'Décisions ToT', icon: '🧠', desc: 'Arbre de Pensées' },
            { key: 'stats', label: 'Analyses & KPIs', icon: '📊', desc: 'Corrélations STM' },
            { key: 'planner', label: 'Planificateur', icon: '📅', desc: 'Itinéraires & SMS' },
            { key: 'workspace', label: 'Workspace', icon: '💼', desc: 'Command Center' },
            { key: 'api-test', label: 'Test d\'API REST', icon: '🧪', desc: 'Vérification Argus' },
            { key: 'marketing', label: 'Campagne SaaS', icon: '🚀', desc: 'Impact Québec' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={`flex-1 min-w-[140px] shrink-0 text-left p-2.5 rounded-xl border transition-all cursor-pointer relative group ${
                activeMainTab === tab.key
                  ? 'bg-indigo-600/10 border-indigo-500/80 text-white shadow-lg shadow-indigo-500/5'
                  : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              {activeMainTab === tab.key && (
                <span className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}
              <div className="flex items-center gap-2 font-display font-bold text-[11px] tracking-wide uppercase">
                <span className="text-xs">{tab.icon}</span>
                <span className={activeMainTab === tab.key ? 'text-white' : 'text-slate-300 group-hover:text-white'}>
                  {tab.label}
                </span>
              </div>
              <div className="text-[8.5px] font-mono text-slate-500 mt-1 uppercase">
                {tab.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {operatorAuthError && (
        <div className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-4">
          <div className="p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl text-xs text-amber-400 font-mono space-y-2.5 text-left relative shadow-lg">
            <button 
              onClick={() => setOperatorAuthError(null)}
              className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 text-base font-bold font-sans"
              title="Fermer l'alerte"
            >
              ×
            </button>
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
              <span>⚠️ ALERTE : Bloqueur de popups détecté</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300 pl-7">
              {operatorAuthError}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1.5 pl-7 pt-1 font-sans text-[10px] text-amber-500 font-semibold">
              <span>• Option 1: Autorisez les popups dans la barre d'adresse de votre navigateur</span>
              <span>• Option 2: Recommandé - Ouvrez l'application dans un nouvel onglet</span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Main Workspace Content */}
      <div className="flex-1 w-full flex flex-col">
        <AnimatePresence mode="wait">
          {activeMainTab === 'supervision' && (
            <motion.div
              key="supervision-tab-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-6"
            >
              {/* Real-Time STM Telemetry Monitoring Banner */}
              <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col lg:flex-row lg:items-stretch justify-between gap-5 transition-all hover:border-slate-700/60" id="stm-realtime-monitoring-banner">
                <div className="space-y-1.5 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold border border-emerald-500/20">
                        <Wifi className="w-3 h-3 animate-pulse text-emerald-400" />
                        <span>FLUX LIVE STM</span>
                      </div>
                      <h3 className="font-display font-bold text-xs text-slate-100 tracking-wide uppercase">
                        Console de Contrôle et Télémétrie Métro de Montréal
                      </h3>
                      {stmLiveStatus?.grounded ? (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[8px] font-semibold">
                          GROUNDED AI (STM.INFO)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[8px] font-semibold animate-pulse">
                            MODE HAUTE DISPONIBILITÉ ACTIVE
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[8px] font-semibold">
                            DISJONCTEUR RÉSILIENT
                          </span>
                        </div>
                      )}
                      {stmLiveStatus?.apiKeyActive && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[8px] font-bold tracking-wide flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          API PROD ACTIVE (l77d0e05...)
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-sans max-w-2xl leading-relaxed mt-2">
                      Mises à jour directes par analyse récursive en temps réel du réseau de la STM. En cas d'anomalie de service (retards, pannes ou interruptions), les alertes s'injectent automatiquement dans le moteur décisionnel Tree of Thoughts (ToT) pour recalculer instantanément les trajets critiques. {stmLiveStatus?.cooldown && "⚠️ Système en dégradation gracieuse suite à des limitations de quota sur l'API externe (cooldown intelligent actif)."}
                    </p>
                  </div>

                  {/* Metro Lines status indicators */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0">
                    {/* Verte */}
                    <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-900 text-[10px] font-mono">
                      <span className={`w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]`} />
                      <span className="text-slate-300 font-medium">Ligne Verte :</span>
                      <span className={`font-bold uppercase ${
                        (stmLiveStatus?.lines?.verte?.status || 'normal') === 'normal' 
                          ? 'text-emerald-400' 
                          : (stmLiveStatus?.lines?.verte?.status === 'delay' ? `text-amber-400 ${isMuted ? '' : 'animate-pulse'}` : `text-red-400 ${isMuted ? '' : 'animate-pulse'}`)
                      }`}>
                        {(stmLiveStatus?.lines?.verte?.status || 'normal') === 'normal' ? 'nominal' : (stmLiveStatus?.lines?.verte?.status === 'delay' ? 'ralentissement' : 'interruption')}
                      </span>
                    </div>
                    {/* Orange */}
                    <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-900 text-[10px] font-mono">
                      <span className={`w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]`} />
                      <span className="text-slate-300 font-medium">Ligne Orange :</span>
                      <span className={`font-bold uppercase ${
                        (stmLiveStatus?.lines?.orange?.status || 'normal') === 'normal' 
                          ? 'text-emerald-400' 
                          : (stmLiveStatus?.lines?.orange?.status === 'delay' ? `text-amber-400 ${isMuted ? '' : 'animate-pulse'}` : `text-red-400 ${isMuted ? '' : 'animate-pulse'}`)
                      }`}>
                        {(stmLiveStatus?.lines?.orange?.status || 'normal') === 'normal' ? 'nominal' : (stmLiveStatus?.lines?.orange?.status === 'delay' ? 'ralentissement' : 'interruption')}
                      </span>
                    </div>
                    {/* Bleue */}
                    <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-900 text-[10px] font-mono">
                      <span className={`w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]`} />
                      <span className="text-slate-300 font-medium">Ligne Bleue :</span>
                      <span className={`font-bold uppercase ${
                        (stmLiveStatus?.lines?.bleue?.status || 'normal') === 'normal' 
                          ? 'text-emerald-400' 
                          : (stmLiveStatus?.lines?.bleue?.status === 'delay' ? `text-amber-400 ${isMuted ? '' : 'animate-pulse'}` : `text-red-400 ${isMuted ? '' : 'animate-pulse'}`)
                      }`}>
                        {(stmLiveStatus?.lines?.bleue?.status || 'normal') === 'normal' ? 'nominal' : (stmLiveStatus?.lines?.bleue?.status === 'delay' ? 'ralentissement' : 'interruption')}
                      </span>
                    </div>
                    {/* Jaune */}
                    <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-900 text-[10px] font-mono">
                      <span className={`w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]`} />
                      <span className="text-slate-300 font-medium">Ligne Jaune :</span>
                      <span className={`font-bold uppercase ${
                        (stmLiveStatus?.lines?.jaune?.status || 'normal') === 'normal' 
                          ? 'text-emerald-400' 
                          : (stmLiveStatus?.lines?.jaune?.status === 'delay' ? `text-amber-400 ${isMuted ? '' : 'animate-pulse'}` : `text-red-400 ${isMuted ? '' : 'animate-pulse'}`)
                      }`}>
                        {(stmLiveStatus?.lines?.jaune?.status || 'normal') === 'normal' ? 'nominal' : (stmLiveStatus?.lines?.jaune?.status === 'delay' ? 'ralentissement' : 'interruption')}
                      </span>
                    </div>

                    {/* Tendance de fluidité prédite (Analyse de Corrélation) */}
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-all duration-300 ${predictedFluidityTrend.bgClass} ${predictedFluidityTrend.borderClass}`} title="Tendance de fluidité du réseau prédite pour l'heure suivante par analyse de corrélation de Pearson">
                      {predictedFluidityTrend.direction === 'up' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                      ) : predictedFluidityTrend.direction === 'down' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-red-400 animate-bounce" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-slate-300 font-medium">Tendance H+1 :</span>
                      <span className={`font-bold uppercase ${predictedFluidityTrend.colorClass}`}>
                        {predictedFluidityTrend.predictedValue}% ({predictedFluidityTrend.label})
                      </span>
                      <span className="text-[8.5px] text-slate-500 font-normal pl-1 border-l border-slate-800">
                        r = {predictedFluidityTrend.correlationCoefficient}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Recharts Network Topology Middle Visualizer */}
                <div className="w-full lg:w-[340px] xl:w-[400px]">
                  <StmNetworkTopology stmLiveStatus={stmLiveStatus} />
                </div>

                <div className="flex flex-col items-end justify-center gap-2 border-t border-slate-800 lg:border-t-0 pt-3 lg:pt-0 min-w-[200px]">
                  <button
                    onClick={() => setIsMuted(prev => !prev)}
                    className={`w-full py-2 px-4 rounded-lg border transition-all text-xs font-mono font-medium flex items-center justify-center gap-2 shadow-inner cursor-pointer ${
                      isMuted 
                        ? 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-950/60' 
                        : 'bg-slate-950 hover:bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                    id="mute-alerts-toggle-btn"
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                        <span>ALERTES MUTÉES</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>MUTE ALERTS</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={fetchStmLive}
                    disabled={isFetchingStm}
                    className="w-full py-2 px-4 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-950 text-slate-200 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all text-xs font-mono font-medium flex items-center justify-center gap-2 shadow-inner disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isFetchingStm ? 'animate-spin' : ''}`} />
                    <span>{isFetchingStm ? 'Interrogation IA...' : 'SYNCHRONISER LIVE'}</span>
                  </button>
                  <div className="text-[9px] text-slate-500 font-mono leading-none">
                    Dernière synchro : {lastStmFetchTime ? lastStmFetchTime.toLocaleTimeString('fr-FR') : 'Jamais'}
                  </div>
                </div>
              </div>

              {/* 1.5 Geospatial & Aviation Intelligence Command Center */}
              <div className="bg-slate-950 rounded-xl border border-slate-900 p-5 space-y-4" id="geospatial-aviation-intelligence-center">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3 text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse" />
                    <h2 className="font-display font-bold text-sm tracking-widest text-slate-200 uppercase">
                      RÉGIME DE CONTRÔLE GÉOSPATIAL & SURVEILLANCE AÉRIENNE
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveGeospatialTab('map')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border cursor-pointer ${
                        activeGeospatialTab === 'map'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      🗺️ CARTOGRAPHIE DES INCIDENTS STM
                    </button>
                    <button
                      onClick={() => setActiveGeospatialTab('airspace')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border cursor-pointer ${
                        activeGeospatialTab === 'airspace'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      📡 RADAR D3 DE L'ESPACE AÉRIEN
                    </button>
                    <button
                      onClick={() => setActiveGeospatialTab('cctv')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border cursor-pointer ${
                        activeGeospatialTab === 'cctv'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      📷 CAMÉRAS CCTV TRAFIC (QUEBEC 511)
                    </button>
                    <button
                      onClick={() => setActiveGeospatialTab('gtfs')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border cursor-pointer ${
                        activeGeospatialTab === 'gtfs'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      🚇 STM EN DIRECT (GTFS-RT)
                    </button>
                  </div>
                </div>

                {activeGeospatialTab === 'gtfs' ? (
                  <div className="w-full h-[600px]">
                    <StmRealTimeTracker />
                  </div>
                ) : activeGeospatialTab === 'cctv' ? (
                  <div className="w-full">
                    <TrafficCctvPanel
                      onInjectFeedAlert={(alert) => {
                        const newAlertItem: FeedItem = {
                          id: `live-cctv-alert-${Date.now()}`,
                          type: 'CCTV',
                          title: alert.title,
                          source: 'Argus CCTV Vision (Temps Réel)',
                          severity: alert.severity,
                          timestamp: new Date().toISOString(),
                          value: 'Trafic CCTV',
                          details: alert.details,
                          mcpStandardized: true
                        };
                        setFeeds(prev => [newAlertItem, ...prev]);
                      }}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    <div className="lg:col-span-8 flex flex-col h-[520px]">
                      {activeGeospatialTab === 'map' ? (
                        <STMIncidentMap
                          feeds={feeds}
                          selectedFeed={selectedFeed}
                          onSelectFeed={(feed) => setSelectedFeed(feed)}
                        />
                      ) : (
                        <AirspaceOverview
                          flights={flights}
                          selectedFlight={selectedFlight}
                          onSelectFlight={(flight) => setSelectedFlight(flight)}
                        />
                      )}
                    </div>

                    <div className="lg:col-span-4 flex flex-col h-[520px]">
                      <OpenSkyTracker
                        selectedFlight={selectedFlight}
                        onSelectFlight={(flight) => {
                          setSelectedFlight(flight);
                          if (flight) {
                            setActiveGeospatialTab('airspace');
                          }
                        }}
                        onFlightsUpdate={(updatedFlights) => setFlights(updatedFlights)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeMainTab === 'tot' && (
            <motion.div
              key="tot-tab-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* LEFT SECTION: FEEDS LIST (Grid columns 7) */}
              <section className="lg:col-span-7 flex flex-col space-y-4">
                {/* Global Search Bar */}
                <div className="relative bg-slate-900/40 rounded-xl border border-slate-900 p-3 text-left" id="global-search-container">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" id="search-icon-svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      id="global-search-input"
                      type="text"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      placeholder="Filtrer les incidents en temps réel par mot-clé (ex: retard, panne, voie, signal)..."
                      className="block w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono transition-colors duration-150 text-left"
                    />
                    {globalSearch && (
                      <button
                        id="global-search-clear-btn"
                        type="button"
                        onClick={() => setGlobalSearch('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Controls & Filter bar */}
                <div className="flex items-center justify-between bg-slate-900/40 p-2.5 rounded-xl border border-slate-900 text-left">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-slate-400 ml-1">Secteurs :</span>
                    {([
                      { key: 'ALL', label: 'TOUS' },
                      { key: 'STM', label: 'STM' },
                      { key: 'AVIATION', label: 'AVIATION' },
                      { key: 'MARITIME', label: 'MARITIME' },
                      { key: 'CCTV', label: 'CCTV' }
                    ] as const).map((sect) => (
                      <button
                        key={sect.key}
                        onClick={() => setSectorFilter(sect.key as any)}
                        className={`px-3 py-1 rounded transition-all cursor-pointer ${
                          sectorFilter === sect.key 
                            ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sect.label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBatchStandardize}
                      disabled={filteredFeeds.length === 0}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all border flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        filteredFeeds.length > 0 && filteredFeeds.every(f => f.mcpStandardized)
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/60'
                          : 'bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                      title="Standardiser ou réinitialiser le format MCP pour tous les éléments de flux filtrés"
                    >
                      <Shuffle className={`w-3 h-3 ${filteredFeeds.length > 0 && filteredFeeds.every(f => f.mcpStandardized) ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>BATCH STANDARDIZE</span>
                    </button>

                    <div className="text-[10px] font-mono text-slate-400 mr-1 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{filteredFeeds.length} files surveillées</span>
                    </div>
                  </div>
                </div>

                {/* Telemetry card lists */}
                <LayoutGroup>
                  <motion.div 
                    layout 
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 content-start"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredFeeds.map((feed) => (
                        <motion.div
                          key={feed.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -15 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 350,
                            damping: 26,
                            mass: 0.8
                          }}
                        >
                          <FeedCard
                            item={feed}
                            onStandardize={handleStandardize}
                            onAnalyze={handleAnalyzeFeed}
                            isAnalyzing={isAnalyzing && selectedFeed?.id === feed.id}
                            hasBeenAnalyzed={decisionsArchive.some(d => d.feedId === feed.id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </LayoutGroup>
              </section>

              {/* RIGHT SECTION: ToT REASONER ENGINE (Grid columns 5) */}
              <section className="lg:col-span-5 flex flex-col space-y-6">
                <div className="flex-1">
                  <ToTReasoner
                    result={analysisResult}
                    isAnalyzing={isAnalyzing}
                    onAnalyze={(weights) => selectedFeed && handleAnalyzeFeed(selectedFeed, weights)}
                    onClear={handleClearAnalysis}
                    archive={decisionsArchive}
                    selectedModel={selectedModel}
                    onUpdateSelectedModel={setSelectedModel}
                    analysisError={analysisError}
                    onClearError={() => setAnalysisError(null)}
                    isMockMode={isMockMode}
                    onToggleMockMode={setIsMockMode}
                  />
                </div>

                <QuantumEntropyGauge
                  selectedResult={analysisResult}
                  archive={decisionsArchive}
                  onSelectActive={handleSelectArchiveItem}
                />

                <ExecutiveSummaryDashboard archive={decisionsArchive} />

                <EntropyTrendVisualizer
                  selectedResult={analysisResult}
                  archive={decisionsArchive}
                />

                <div className="h-[250px]">
                  <DecisionArchive
                    archive={decisionsArchive}
                    onSelect={handleSelectArchiveItem}
                    onClearAll={handleWipeHistory}
                    selectedId={analysisResult?.id}
                  />
                </div>
              </section>
            </motion.div>
          )}

          {activeMainTab === 'stats' && (
            <motion.div
              key="stats-tab-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-6"
            >
              <StmHealthTrendVisualizer feeds={feeds} />
              
              <StmDecisionCorrelationVisualizer feeds={feeds} decisionsArchive={decisionsArchive} />
              
              <DecisionInsights decisionsArchive={decisionsArchive} />
              
              <PredictiveKPIs feeds={feeds} user={user} decisionsArchive={decisionsArchive} />
              
              <PredictiveAlertEngine apiLogs={apiLogs} user={user} />
            </motion.div>
          )}

          {activeMainTab === 'planner' && (
            <motion.div
              key="planner-tab-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-6"
            >
              <ItineraryPlanner feeds={feeds} onSimulateUpdate={setFeeds} />
              
              <CriticalRouteTimeline feeds={feeds} />

              <ArgusStreamDashboard
                activeFeeds={feeds}
                archive={decisionsArchive}
                isSubscribed={isSubscribed}
                alertThreshold={alertThreshold}
                twilioEnabled={twilioEnabled}
                twilioPhoneNumber={twilioPhoneNumber}
                onUpdateSubscription={handleUpdateSubscription}
                onUpdateTwilio={handleUpdateTwilio}
                onAnalyzeFeed={handleAnalyzeFeed}
                isAnalyzing={isAnalyzing}
              />
            </motion.div>
          )}

          {activeMainTab === 'workspace' && (
            <motion.div
              key="workspace-tab-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl w-full mx-auto px-4 md:px-6 pb-6 space-y-4"
              id="google-workspace-command-center"
            >
              <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div className="text-left font-sans">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>CENTRE DE COMMANDE GOOGLE WORKSPACE</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    SYNCHRONISATION ET AUTOMATISATION MULTI-PLATEFORME • GMAIL, CALENDAR, DRIVE, SHEETS & KEEP
                  </p>
                </div>

                {/* Workspace subtabs */}
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] font-bold">
                  {([
                    { key: 'grid', label: 'VUE GRILLE', icon: Grid },
                    { key: 'gmail', label: 'GMAIL', icon: Mail },
                    { key: 'calendar', label: 'CALENDAR', icon: Calendar },
                    { key: 'drive', label: 'DRIVE', icon: Folder },
                    { key: 'sheets', label: 'SHEETS', icon: FileSpreadsheet },
                    { key: 'keep', label: 'KEEP', icon: BookOpen },
                    { key: 'forms', label: 'FORMS', icon: FileText }
                  ] as const).map((tab) => {
                    const IconComp = tab.icon;
                    const isActive = workspaceTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setWorkspaceTab(tab.key)}
                        className={`px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                            : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                        }`}
                      >
                        <IconComp className="w-3 h-3" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <AnimatePresence mode="wait">
                {workspaceTab === 'grid' ? (
                  <motion.div 
                    key="workspace-grid-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    <GmailIntegration
                      user={user}
                      gmailToken={gmailToken}
                      onTokenUpdate={setGmailToken}
                      currentResult={analysisResult}
                      isMuted={isMuted}
                    />
                    <GoogleCalendarIntegration
                      user={user}
                      calendarToken={gmailToken}
                      onTokenUpdate={setGmailToken}
                      isMuted={isMuted}
                    />
                    <GoogleKeepIntegration
                      user={user}
                      keepToken={gmailToken}
                      decisionsArchive={decisionsArchive}
                    />
                    <div className="md:col-span-2 lg:col-span-1">
                      <GoogleDriveIntegration
                        user={user}
                        driveToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                        currentResult={analysisResult}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <GoogleSheetsIntegration
                        user={user}
                        sheetsToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                        decisionsArchive={decisionsArchive}
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <GoogleFormsIntegration
                        user={user}
                        formsToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`workspace-tab-${workspaceTab}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full max-w-4xl mx-auto"
                  >
                    {workspaceTab === 'gmail' && (
                      <GmailIntegration
                        user={user}
                        gmailToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                        currentResult={analysisResult}
                        isMuted={isMuted}
                      />
                    )}
                    {workspaceTab === 'calendar' && (
                      <GoogleCalendarIntegration
                        user={user}
                        calendarToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                        isMuted={isMuted}
                      />
                    )}
                    {workspaceTab === 'keep' && (
                      <GoogleKeepIntegration
                        user={user}
                        keepToken={gmailToken}
                        decisionsArchive={decisionsArchive}
                      />
                    )}
                    {workspaceTab === 'drive' && (
                      <GoogleDriveIntegration
                        user={user}
                        driveToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                        currentResult={analysisResult}
                      />
                    )}
                    {workspaceTab === 'sheets' && (
                      <GoogleSheetsIntegration
                        user={user}
                        sheetsToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                        decisionsArchive={decisionsArchive}
                      />
                    )}
                    {workspaceTab === 'forms' && (
                      <GoogleFormsIntegration
                        user={user}
                        formsToken={gmailToken}
                        onTokenUpdate={setGmailToken}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeMainTab === 'api-test' && (
            <motion.div
              key="api-test-tab-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-6"
            >
              <ApiTester user={user} />
            </motion.div>
          )}

          {activeMainTab === 'marketing' && (
            <motion.div
              key="marketing-tab-content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col"
            >
              <ArgusMarketingCampaign />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Footer Business Integration & API Logs section */}
      <footer className="bg-slate-900/40 border-t border-slate-900/80 p-4 md:p-6 mt-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-2 font-display">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>Régime Décisionnel Elite: ARGUS-DaaS</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-2xl">
                L'intégration de la récursion ToT avec un score d'entropie quantique transforme une application de monitoring passive en un moteur de décision haute précision auto-amélioré. En standardisant les flux avec l'architecture MCP, les opérateurs logistiques sécurisent une efficacité de transit maximale.
              </p>
            </div>

            {/* Citations of Authority */}
            <div className="border-l-2 border-indigo-500/50 pl-4 py-1 italic font-mono text-[10px] text-slate-500">
              <p>"La complexité doit être transmutée en intelligence structurée."</p>
              <p className="mt-1">"Le gain d'efficacité est proportionnel à la réduction du bruit informationnel."</p>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900">
              <span>© 2026 Consortium ARGUS. Tous droits réservés.</span>
              <span>•</span>
              <a href="https://argus-decision.io" target="_blank" rel="noreferrer" className="hover:text-slate-300 flex items-center gap-0.5">
                <span>Documentation</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 h-[520px]">
            <EliteMonetization
              apiLogs={apiLogs}
              onRefreshLogs={fetchTelemetryLogs}
              isLoadingLogs={isLoadingLogs}
              alertThreshold={alertThreshold}
              isSubscribed={isSubscribed}
              onUpdateSubscription={handleUpdateSubscription}
              twilioEnabled={twilioEnabled}
              twilioPhoneNumber={twilioPhoneNumber}
              onUpdateTwilio={handleUpdateTwilio}
            />
          </div>

        </div>
      </footer>

      {/* 4. Overlay: Incident Simulator Modal */}
      <AnimatePresence>
        {isSimulatorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl font-sans"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-display font-semibold text-sm tracking-wide text-slate-100">
                    SIMULATEUR DE SURCHARGE DE SIGNAL ARGUS
                  </h3>
                </div>
                <button
                  onClick={() => setIsSimulatorOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSimulateIncident} className="p-5 space-y-4 font-mono text-xs text-slate-300">
                
                {simSuccessMsg ? (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                    <p className="text-emerald-300 font-semibold">{simSuccessMsg}</p>
                  </div>
                ) : (
                  <>
                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-semibold">TITRE DE L'INCIDENT :</label>
                      <input 
                        type="text" 
                        required
                        value={simTitle}
                        onChange={(e) => setSimTitle(e.target.value)}
                        placeholder="Ex. retard de signalisation sur la ligne verte"
                        className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none p-2 text-slate-200"
                      />
                    </div>

                    {/* Sector and Severity Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 block font-semibold">SECTEUR DE TRANSIT :</label>
                        <select
                          value={simType}
                          onChange={(e) => {
                            setSimType(e.target.value as any);
                            // Auto-set title and value recommendations for ease of use
                            if (e.target.value === 'CCTV') {
                              setSimTitle('Détection anomalie optique CCTV - Zone 405');
                              setSimValue('Fumée suspecte / Intrusion');
                            }
                          }}
                          className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none p-2 text-slate-200"
                        >
                          <option value="STM">STM (Transport urbain)</option>
                          <option value="AVIATION">Couloir aérien</option>
                          <option value="MARITIME">Port maritime</option>
                          <option value="CCTV">Flux Optique CCTV</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 block font-semibold">NIVEAU DE GRAVITÉ :</label>
                        <select
                          value={simSeverity}
                          onChange={(e) => setSimSeverity(e.target.value as any)}
                          className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none p-2 text-slate-200 text-orange-400 font-bold"
                        >
                          <option value="low">Niveau bas</option>
                          <option value="medium">Avertissement moyen</option>
                          <option value="high">Urgence élevée</option>
                          <option value="critical">Désastre critique</option>
                        </select>
                      </div>
                    </div>

                    {/* File Upload Zone for CCTV (Supports drag & drop + manual select via click) */}
                    {simType === 'CCTV' && (
                      <div className="space-y-2">
                        <label className="text-slate-400 block font-semibold">CAPTURE IMAGE / VISUELLE CCTV :</label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              const file = files[0];
                              if (file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setSimImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                            simImage 
                              ? 'border-emerald-500/50 bg-emerald-950/10' 
                              : isDragging 
                              ? 'border-indigo-500 bg-indigo-950/20' 
                              : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            id="cctv-file-upload"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                const file = files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setSimImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <label htmlFor="cctv-file-upload" className="cursor-pointer space-y-2 block">
                            {simImage ? (
                              <div className="space-y-2">
                                <div className="flex justify-center">
                                  <img 
                                    src={simImage} 
                                    alt="Aperçu CCTV" 
                                    className="max-h-24 rounded border border-slate-700 shadow"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <p className="text-[11px] text-emerald-400 font-bold">Image chargée. Cliquez pour changer.</p>
                              </div>
                            ) : (
                              <div className="space-y-1 py-1">
                                <p className="text-slate-300 font-bold">Glissez-déposez une image CCTV ici</p>
                                <p className="text-[10px] text-slate-500">ou cliquez pour parcourir vos fichiers</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Metric Value */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-semibold">VALEUR CLÉ DE TÉLÉMÉTRIE (MÉTRIQUE) :</label>
                      <input 
                        type="text" 
                        required
                        value={simValue}
                        onChange={(e) => setSimValue(e.target.value)}
                        placeholder="Ex. perte de vitesse -60 %, perte de paquets 42dB"
                        className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none p-2 text-slate-200"
                      />
                    </div>

                    {/* Detailed description */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-semibold">LOG DÉTAILLÉ DE L'INCIDENT :</label>
                      <textarea
                        required
                        rows={3}
                        value={simDetails}
                        onChange={(e) => setSimDetails(e.target.value)}
                        placeholder="Fournir des indicateurs de télémétrie concrets (niveaux thermiques, codes de transpondeur, tirant d'eau, itinéraires de déviation)..."
                        className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none p-2 text-slate-200 font-sans text-xs leading-normal resize-none"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsSimulatorOpen(false)}
                        className="px-4 py-2 hover:bg-slate-800 border border-transparent rounded transition-colors text-slate-400 hover:text-slate-200"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold transition-colors"
                      >
                        Diffuser le signal
                      </button>
                    </div>
                  </>
                )}

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
