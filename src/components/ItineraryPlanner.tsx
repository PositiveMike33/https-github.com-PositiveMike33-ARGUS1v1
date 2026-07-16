/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FeedItem, RouteOption, RouteStep } from '../types';
import { 
  Navigation, 
  MapPin, 
  ArrowRight, 
  Clock, 
  Compass, 
  AlertTriangle, 
  Check, 
  Zap, 
  RefreshCw,
  TrendingDown,
  Activity,
  Shield,
  Shuffle,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { D3TransitMap } from './D3TransitMap';

interface ItineraryPlannerProps {
  feeds: FeedItem[];
  onSimulateUpdate: (updatedFeeds: FeedItem[]) => void;
}

interface Location {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  city: 'Montreal' | 'Quebec' | 'Toronto' | 'New York';
  category?: 'hotspot' | 'standard';
}

// Pre-defined key locations in Michael's logistical corridor including his primary home and workplace
const LOCATIONS: Location[] = [
  // Montréal - Classiques et Logistiques
  { id: 'carrieres', name: '2200 Rue des Carrières', description: 'Point de départ primordial (Bus 45 Papineau / Bus 94 d\'Iberville)', lat: 45.541, lng: -73.593, city: 'Montreal' },
  { id: 'labatt', name: '50 Avenue Labatt (LaSalle)', description: 'Lieu de travail critique / Cible stratégique de Michael', lat: 45.4322, lng: -73.6521, city: 'Montreal' },
  { id: 'veronique', name: 'Arrêt George-V (Lachine)', description: 'Résidence de son amie Véronique (Lachine, QC H8S 4L3, Bus 496)', lat: 45.4357, lng: -73.6825, city: 'Montreal' },
  { id: 'berri', name: 'Station Berri-UQAM', description: 'Centre névralgique de transit STM (Lignes Verte / Orange / Jaune)', lat: 45.5155, lng: -73.5606, city: 'Montreal' },
  { id: 'turcot', name: 'Échangeur Turcot', description: 'Point de convergence CCTV & Routier à proximité de Place-Saint-Henri', lat: 45.4697, lng: -73.6041, city: 'Montreal' },
  { id: 'port', name: 'Port de Montréal (Quai 52)', description: 'Terminal de déchargement Maritime (Bus 185 / Métro Préfontaine)', lat: 45.5390, lng: -73.5288, city: 'Montreal' },
  { id: 'yul', name: 'Aéroport Pierre-Elliott-Trudeau (CYUL)', description: 'Aérogare Cargo & Aviation (Navette Express 747)', lat: 45.4706, lng: -73.7408, city: 'Montreal' },
  { id: 'centre', name: 'Station de métro Beaudry (HQ)', description: 'Quartier général tactique (Sophia / Ligne Verte)', lat: 45.5191, lng: -73.5568, city: 'Montreal' },

  // --- CULTURAL & TOURIST HOTSPOTS ---
  { id: 'vieux_port', name: 'Vieux-Port de Montréal', description: 'Cultural & Tourist Hotspot : Quais historiques et promenade fluviale d\'élite', lat: 45.5088, lng: -73.5540, city: 'Montreal', category: 'hotspot' },
  { id: 'plateau', name: 'Plateau Mont-Royal', description: 'Cultural & Tourist Hotspot : Ruelles vertes, maisons colorées et cafés branchés', lat: 45.5236, lng: -73.5747, city: 'Montreal', category: 'hotspot' },
  { id: 'mont_royal', name: 'Belvédère du Mont-Royal', description: 'Cultural & Tourist Hotspot : Vue panoramique incontournable sur la métropole', lat: 45.5041, lng: -73.5875, city: 'Montreal', category: 'hotspot' },
  { id: 'chateau_frontenac', name: 'Château Frontenac & Vieux-Québec', description: 'Cultural & Tourist Hotspot : L\'hôtel légendaire dominant le fleuve Saint-Laurent', lat: 46.8118, lng: -71.2050, city: 'Quebec', category: 'hotspot' },
  { id: 'petit_champlain', name: 'Quartier Petit Champlain', description: 'Cultural & Tourist Hotspot : Plus vieilles rues piétonnes pavées d\'Amérique du Nord', lat: 46.8105, lng: -71.2033, city: 'Quebec', category: 'hotspot' },
  { id: 'cn_tower', name: 'Tour CN (Toronto)', description: 'Cultural & Tourist Hotspot : Structure autoportante iconique dominant le lac Ontario', lat: 43.6426, lng: -79.3871, city: 'Toronto', category: 'hotspot' },
  { id: 'rom', name: 'Musée Royal de l\'Ontario', description: 'Cultural & Tourist Hotspot : Musée d\'histoire naturelle, cristal architectural', lat: 43.6677, lng: -79.3948, city: 'Toronto', category: 'hotspot' },
  { id: 'times_square', name: 'Times Square (New York)', description: 'Cultural & Tourist Hotspot : Le carrefour mondial illuminé de néons au cœur de Broadway', lat: 40.7580, lng: -73.9855, city: 'New York', category: 'hotspot' },
  { id: 'central_park', name: 'Central Park (Manhattan)', description: 'Cultural & Tourist Hotspot : L\'immense oasis de verdure légendaire au cœur de Manhattan', lat: 40.7829, lng: -73.9654, city: 'New York', category: 'hotspot' },

  // Montréal - Sorties Cultes & Tourisme (Autres)
  { id: 'notre_dame', name: 'Basilique Notre-Dame', description: 'Tourisme : Joyau néo-gothique du Vieux-Montréal sur la Place d\'Armes', lat: 45.5045, lng: -73.5560, city: 'Montreal' },
  { id: 'oratoire', name: 'Oratoire Saint-Joseph', description: 'Tourisme : Plus grand sanctuaire d\'Amérique, dôme majestueux', lat: 45.4925, lng: -73.6186, city: 'Montreal' },
  { id: 'banquise', name: 'La Banquise', description: 'Sortie Culte : Restaurant de poutines mythiques ouvert 24h/24', lat: 45.5264, lng: -73.5747, city: 'Montreal' },
  { id: 'schwartzs', name: 'Schwartz\'s Deli', description: 'Sortie Culte : L\'incontournable smoked meat montréalais depuis 1928', lat: 45.5164, lng: -73.5779, city: 'Montreal' },
  { id: 'stereobar', name: 'Stereo Nightclub / Stereobar', description: 'Sortie Culte : Temple de la musique électronique, acoustics légendaires', lat: 45.5212, lng: -73.5552, city: 'Montreal' },
  { id: 'mtelus', name: 'MTELUS', description: 'Sortie Culte : Salle de concerts iconique du Quartier des Spectacles', lat: 45.5105, lng: -73.5635, city: 'Montreal' },
  { id: 'newcitygas', name: 'New City Gas (Griffintown)', description: 'Sortie Culte : Complexe festif géant dans une ancienne usine à gaz', lat: 45.4957, lng: -73.5583, city: 'Montreal' },

  // Québec - Tourisme (Autres)
  { id: 'citadelle', name: 'Citadelle de Québec', description: 'Tourisme : Forteresse historique active de l\'UNESCO', lat: 46.8078, lng: -71.2075, city: 'Quebec' },
  { id: 'gare_palais', name: 'Gare du Palais (Québec)', description: 'Hub de transit : Gare ferroviaire néo-gothique historique', lat: 46.8172, lng: -71.2139, city: 'Quebec' },

  // Toronto - Tourisme (Autres)
  { id: 'ripleys', name: 'Aquarium Ripley de Toronto', description: 'Tourisme : Tunnel sous-marin spectaculaire avec requins', lat: 43.6420, lng: -79.3860, city: 'Toronto' },
  { id: 'union_station', name: 'Gare Union (Toronto)', description: 'Hub de transit : Point central des trains VIA Rail, GO et TTC', lat: 43.6453, lng: -79.3806, city: 'Toronto' },

  // New York - Tourisme (Autres)
  { id: 'empire_state', name: 'Empire State Building', description: 'Tourisme : Gratte-ciel Art déco mondialement célèbre', lat: 40.7484, lng: -73.9857, city: 'New York' },
  { id: 'statue_liberty', name: 'Statue de la Liberté', description: 'Tourisme : Symbole universel d\'espoir sur Liberty Island', lat: 40.6892, lng: -74.0445, city: 'New York' },
  { id: 'penn_station', name: 'Penn Station (New York)', description: 'Hub de transit : Centre névralgique ferroviaire Amtrak et métro MTA', lat: 40.7505, lng: -73.9934, city: 'New York' },
];

const addMinutesToTime = (timeStr: string, mins: number): string => {
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

const getMinutesDifference = (start: string, end: string): number => {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60; // handle cross-midnight
  return diff;
};

export const isWeekend = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
};

export const getDayOfWeek = (dateStr: string): number => {
  if (!dateStr) return -1;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return -1;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return d.getDay(); // 0 = Sunday, 6 = Saturday, etc.
};

export const getHistoricalPeriodDetails = (timeStr: string, isWeekendVal: boolean = false) => {
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return { label: 'Inconnu', multiplier: 1.0, riskAdd: 0, desc: 'Analyse temporelle non disponible.', peakType: 'NONE' };
  
  const totalMins = h * 60 + (m || 0);
  
  if (isWeekendVal) {
    if (totalMins >= 300 && totalMins <= 450) { // 05:00 - 07:30
      return {
        label: 'Transit Week-end Matinal (05h00 - 07h30)',
        multiplier: 0.7,
        riskAdd: -10,
        desc: 'Créneau optimal demandé pour le week-end. Trafic routier extrêmement fluide, réseau STM en service minimal de nuit/matin.',
        peakType: 'WEEKEND_EARLY'
      };
    }
    return {
      label: 'Temps de Week-end',
      multiplier: 0.8,
      riskAdd: -5,
      desc: 'Période de week-end calme et fluide. Risque global de congestion réduit.',
      peakType: 'WEEKEND'
    };
  }
  
  if (totalMins >= 450 && totalMins <= 570) { // 07:30 - 09:30
    return {
      label: 'Pointe Matin (07h30 - 09h30)',
      multiplier: 1.35,
      riskAdd: 25,
      desc: 'Période critique. Congestion routière élevée (Turcot) et forte affluence STM.',
      peakType: 'AM_PEAK'
    };
  } else if (totalMins >= 930 && totalMins <= 1140) { // 15:30 - 19:00
    return {
      label: 'Pointe Soir (15h30 - 19h00)',
      multiplier: 1.45,
      riskAdd: 30,
      desc: 'Surcharge maximale du réseau routier et du métro (Ligne Verte saturée).',
      peakType: 'PM_PEAK'
    };
  } else if (totalMins >= 1320 || totalMins <= 300) { // 22:00 - 05:00
    return {
      label: 'Heures de Nuit (22h00 - 05h00)',
      multiplier: 0.6,
      riskAdd: -5,
      desc: 'Opérations de maintenance STM. Risque routier très bas mais effectifs de secours limités.',
      peakType: 'NIGHT'
    };
  } else {
    return {
      label: 'Heures Creuses (09h30 - 15h30, 19h00 - 22h00)',
      multiplier: 0.95,
      riskAdd: 0,
      desc: 'Trafic nominal fluide. Conditions idéales pour le transit de Michael.',
      peakType: 'OFF_PEAK'
    };
  }
};

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({ feeds, onSimulateUpdate }) => {
  // Obtenir l'Heure de l'Est (Montréal) en temps réel au format HH:MM
  const getEstTimeHHMM = (): string => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Montreal',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(new Date());
      const hour = parts.find(p => p.type === 'hour')?.value || '12';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      return `${hour}:${minute}`;
    } catch (e) {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
  };

  const getEstDateYYYYMMDD = (): string => {
    try {
      const formatter = new Intl.DateTimeFormat('fr-CA', {
        timeZone: 'America/Montreal',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(new Date());
    } catch (e) {
      const now = new Date();
      return now.toISOString().split('T')[0];
    }
  };

  const [origin, setOrigin] = useState<string>('carrieres');
  const [destination, setDestination] = useState<string>('labatt');

  // Geolocation & Manual input state for Origin calibration (Protocol DRIFT-V2)
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [manualLatitude, setManualLatitude] = useState<string>('45.541');
  const [manualLongitude, setManualLongitude] = useState<string>('-73.593');
  const [isManualActive, setIsManualActive] = useState<boolean>(false);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);

  // Trigger navigator.geolocation integration on component mount
  useEffect(() => {
    requestGPSLocation(false);
  }, []);

  const requestGPSLocation = (isManualTrigger = false) => {
    setIsGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par ce navigateur.");
      setIsGpsLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: false, // Low accuracy is much faster and highly robust against iframe timeout errors
      timeout: 15000,            // Increased timeout to prevent premature "Délai d'attente dépassé" errors
      maximumAge: 60000          // Accept cached positions up to 1 minute to avoid redundant hardware queries
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLatitude(position.coords.latitude);
        setGpsLongitude(position.coords.longitude);
        setIsGpsActive(true);
        setIsManualActive(false);
        setIsGpsLoading(false);
      },
      (error) => {
        let msg = "Erreur de géolocalisation.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Permission refusée par l'utilisateur ou l'iframe.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Position indisponible.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Délai d'attente dépassé.";
        }
        
        // Only set the UI error if the user triggered it manually, or if they explicitly choose it
        if (isManualTrigger) {
          setGpsError(msg);
        } else {
          console.warn("Auto GPS on-mount failed/timed out. Utilizing default coordinates.", error);
        }
        setIsGpsLoading(false);
      },
      options
    );
  };

  const getDynamicLocations = (): Location[] => {
    return LOCATIONS.map(loc => {
      // Geo-validation step that prevents the use of 'Domicile' labels
      let cleanedName = loc.name.replace(/\(Domicile\)/gi, '').replace(/\bDomicile\b/gi, "Point de Départ").trim();
      let cleanedDesc = loc.description.replace(/\(Domicile\)/gi, '').replace(/\bDomicile\b/gi, "Point de Départ").trim();

      if (loc.id === 'carrieres') {
        let calibratedLat = 45.541; // locked to these exact coordinates for accurate routing
        let calibratedLng = -73.593; // locked to these exact coordinates for accurate routing
        let desc = cleanedDesc;
        
        if (isGpsActive && gpsLatitude !== null && gpsLongitude !== null) {
          calibratedLat = gpsLatitude;
          calibratedLng = gpsLongitude;
          desc = `Recalibré par GPS réel : ${gpsLatitude.toFixed(4)}, ${gpsLongitude.toFixed(4)}`;
        } else if (isManualActive && manualLatitude && manualLongitude) {
          const parsedLat = parseFloat(manualLatitude);
          const parsedLng = parseFloat(manualLongitude);
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            calibratedLat = parsedLat;
            calibratedLng = parsedLng;
            desc = `Calibré manuellement : ${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}`;
          }
        }
        return {
          ...loc,
          name: '2200 Rue des Carrières',
          lat: calibratedLat,
          lng: calibratedLng,
          description: desc
        };
      }
      return {
        ...loc,
        name: cleanedName,
        description: cleanedDesc
      };
    });
  };

  const [activeRouteId, setActiveRouteId] = useState<string>('tot_optimal');
  const [isLiveAutoUpdate, setIsLiveAutoUpdate] = useState<boolean>(true);
  const [autoBackupRecalc, setAutoBackupRecalc] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [lastRecalculateTime, setLastRecalculateTime] = useState<Date>(new Date());
  const [recalculateReason, setRecalculateReason] = useState<string>('');
  const [departureTime, setDepartureTime] = useState<string>(getEstTimeHHMM());
  const [arrivalTime, setArrivalTime] = useState<string>('08:48');
  const [selectedDate, setSelectedDate] = useState<string>(getEstDateYYYYMMDD());
  const [allowedModes, setAllowedModes] = useState<{ bus: boolean; metro: boolean; walk: boolean }>({
    bus: true,
    metro: true,
    walk: true
  });

  // Dynamic dates for real-time presets
  const getDynamicDateForPreset = (targetType: 'weekday' | 'saturday' | 'sunday'): string => {
    const today = new Date();
    const resultDate = new Date();
    const day = today.getDay(); // 0 is Sunday, 6 is Saturday, 1-5 are weekdays

    const formatCanadaDate = (d: Date) => {
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const dayNum = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${dayNum}`;
    };

    if (targetType === 'weekday') {
      if (day >= 1 && day <= 5) {
        return formatCanadaDate(today);
      }
      const daysToAdd = day === 0 ? 1 : 2;
      resultDate.setDate(today.getDate() + daysToAdd);
      return formatCanadaDate(resultDate);
    } else if (targetType === 'saturday') {
      if (day === 6) return formatCanadaDate(today);
      const daysToAdd = (6 - day + 7) % 7;
      resultDate.setDate(today.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
      return formatCanadaDate(resultDate);
    } else { // 'sunday'
      if (day === 0) return formatCanadaDate(today);
      const daysToAdd = (7 - day) % 7;
      resultDate.setDate(today.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
      return formatCanadaDate(resultDate);
    }
  };

  const dynamicWeekday = getDynamicDateForPreset('weekday');
  const dynamicSaturday = getDynamicDateForPreset('saturday');
  const dynamicSunday = getDynamicDateForPreset('sunday');

  // Synchroniser automatiquement l'heure de départ avec l'heure réelle en temps réel si synchronisation live active
  useEffect(() => {
    if (!isLiveAutoUpdate) return;
    
    // Mettre à jour immédiatement
    setDepartureTime(getEstTimeHHMM());

    const timer = setInterval(() => {
      setDepartureTime(getEstTimeHHMM());
    }, 15000); // toutes les 15 secondes

    return () => clearInterval(timer);
  }, [isLiveAutoUpdate]);

  // Adapter to dynamically refine steps, safety and durations according to selected transport modes
  const adaptStepsAndMetrics = (rawSteps: RouteStep[], baseSafety: number) => {
    const adaptedSteps: RouteStep[] = [];
    let extraDuration = 0;
    let safetyPenalty = 0;
    const warnings: string[] = [];

    rawSteps.forEach(step => {
      const stepLower = step.instruction.toLowerCase();
      const isBusStep = stepLower.includes('bus') || stepLower.includes('747');
      const isMetroStep = (stepLower.includes('métro') || stepLower.includes('ligne orange') || stepLower.includes('ligne verte') || stepLower.includes('station')) && !isBusStep;
      const isWalkStep = stepLower.includes('marche') || stepLower.includes('à pied') || stepLower.includes('approche');

      if (isBusStep && !allowedModes.bus) {
        const altDuration = Math.round(step.durationMin * 3.5);
        adaptedSteps.push({
          instruction: `🚶 MARCHE PIÉTONNE D'URGENCE (Bus exclu) : Contournement à pied de ${step.instruction.split(':')[0]}`,
          sector: 'ROUTE',
          durationMin: altDuration
        });
        extraDuration += (altDuration - step.durationMin);
        safetyPenalty += 20;
        warnings.push('Bus exclu.');
      } else if (isMetroStep && !allowedModes.metro) {
        const altDuration = Math.round(step.durationMin * 2.5);
        adaptedSteps.push({
          instruction: `🚌 NAVETTE ROUTIÈRE / BUS DE SECOURS (Métro exclu) : Déviation par le réseau de surface`,
          sector: 'STM',
          durationMin: altDuration
        });
        extraDuration += (altDuration - step.durationMin);
        safetyPenalty += 25;
        warnings.push('Métro exclu.');
      } else if (isWalkStep && !allowedModes.walk) {
        const altDuration = Math.round(step.durationMin * 1.5 + 4);
        adaptedSteps.push({
          instruction: `🚖 ACCÈS ROUTIER SÉCURISÉ / TAXI (Marche exclue) : Approche motorisée sans effort`,
          sector: 'CCTV',
          durationMin: altDuration
        });
        extraDuration += (altDuration - step.durationMin);
        safetyPenalty += 10;
        warnings.push('Marche exclue.');
      } else {
        adaptedSteps.push({ ...step });
      }
    });

    const finalDuration = rawSteps.reduce((acc, step) => acc + step.durationMin, 0) + extraDuration;

    // Issue 3: Dynamically penalize safety based on active high or critical severity feeds in the crossed sectors
    feeds.forEach(feed => {
      const titleLower = feed.title.toLowerCase();
      const valLower = feed.value.toLowerCase();
      const isResolved = titleLower.includes('dissipée') || titleLower.includes('dissipé') || 
                        titleLower.includes('résorbé') || titleLower.includes('résolu') || 
                        valLower.includes('dissipée') || valLower.includes('dissipé') || 
                        valLower.includes('résorbé') || valLower.includes('résolu') ||
                        valLower.includes('nominal');
      
      const realSeverity = isResolved ? 'low' : feed.severity;
      const isSevere = realSeverity === 'high' || realSeverity === 'critical';
      if (!isSevere) return;

      const sectorMatched = rawSteps.some(step => step.sector === feed.type);
      if (sectorMatched) {
        // High alert penalty = -15%, Critical alert penalty = -30%
        const penalty = realSeverity === 'critical' ? 30 : 15;
        safetyPenalty += penalty;

        // Specific checks for direct impacts on transport methods in the instructions
        const hasMetroStep = rawSteps.some(step => {
          const sLower = step.instruction.toLowerCase();
          return sLower.includes('métro') || sLower.includes('ligne orange') || sLower.includes('ligne verte');
        });

        if (hasMetroStep && feed.type === 'STM') {
          if (titleLower.includes('métro') || titleLower.includes('orange') || titleLower.includes('verte') || valLower.includes('métro')) {
            safetyPenalty += 10; // Additional 10% penalty for direct metro disruptions
          }
        }
      }
    });

    const hasActiveSevereStmAlert = feeds.some(f => {
      if (f.type !== 'STM') return false;
      const titleLower = f.title.toLowerCase();
      const valLower = f.value.toLowerCase();
      const isResolved = titleLower.includes('dissipée') || titleLower.includes('dissipé') || 
                        titleLower.includes('résorbé') || titleLower.includes('résolu') || 
                        valLower.includes('dissipée') || valLower.includes('dissipé') || 
                        valLower.includes('résorbé') || valLower.includes('résolu') ||
                        valLower.includes('nominal');
      const realSeverity = isResolved ? 'low' : f.severity;
      return realSeverity === 'high' || realSeverity === 'critical';
    });

    const usesStm = rawSteps.some(step => step.sector === 'STM');

    let finalSafety = Math.max(5, Math.min(100, baseSafety - safetyPenalty));

    // Dynamic cap below 3/5 (60%) if the route contains STM transit and is affected by high/critical STM alerts
    if (usesStm && hasActiveSevereStmAlert) {
      finalSafety = Math.min(finalSafety, 58); // Automatically capped strictly below 3/5 (60%)
    }

    return {
      steps: adaptedSteps,
      totalDurationMin: finalDuration,
      safetyScore: finalSafety,
      warnings
    };
  };

  // Extract risk metrics for STM, AVIATION, MARITIME, and CCTV based on feeds and historical peaks
  const getSectorMetrics = () => {
    let stmRisk = 10;
    let aviationRisk = 5;
    let maritimeRisk = 12;
    let cctvRisk = 15;

    feeds.forEach(f => {
      let weight = 0;
      if (f.severity === 'low') weight = 5;
      else if (f.severity === 'medium') weight = 12;
      else if (f.severity === 'high') weight = 25;
      else if (f.severity === 'critical') weight = 45;

      if (f.type === 'STM') stmRisk = Math.min(100, stmRisk + weight);
      else if (f.type === 'AVIATION') aviationRisk = Math.min(100, aviationRisk + weight);
      else if (f.type === 'MARITIME') maritimeRisk = Math.min(100, maritimeRisk + weight);
      else if (f.type === 'CCTV') cctvRisk = Math.min(100, cctvRisk + weight);
    });

    // Apply historical time-of-day peak adjustments
    const isWknd = isWeekend(selectedDate);
    const period = getHistoricalPeriodDetails(departureTime, isWknd);
    if (period.peakType === 'AM_PEAK' || period.peakType === 'PM_PEAK') {
      stmRisk = Math.min(100, stmRisk + period.riskAdd);
      cctvRisk = Math.min(100, cctvRisk + period.riskAdd);
      maritimeRisk = Math.min(100, maritimeRisk + Math.round(period.riskAdd * 0.4));
      aviationRisk = Math.min(100, aviationRisk + Math.round(period.riskAdd * 0.3));
    } else if (period.peakType === 'NIGHT') {
      stmRisk = Math.max(5, Math.round(stmRisk * 0.8));
      cctvRisk = Math.max(5, Math.round(cctvRisk * 0.7));
    } else if (period.peakType === 'WEEKEND_EARLY') {
      stmRisk = Math.max(5, Math.round(stmRisk * 0.6));
      cctvRisk = Math.max(5, Math.round(cctvRisk * 0.5));
    } else {
      stmRisk = Math.max(8, Math.round(stmRisk * 0.95));
      cctvRisk = Math.max(10, Math.round(cctvRisk * 0.95));
    }

    if (isWknd) {
      stmRisk = Math.max(5, Math.round(stmRisk * 0.85));
      cctvRisk = Math.max(5, Math.round(cctvRisk * 0.7));
      maritimeRisk = Math.max(5, Math.round(maritimeRisk * 0.75));
      aviationRisk = Math.max(5, Math.round(aviationRisk * 0.8));
    }

    return {
      STM: { risk: stmRisk, fluidity: 100 - stmRisk },
      AVIATION: { risk: aviationRisk, fluidity: 100 - aviationRisk },
      MARITIME: { risk: maritimeRisk, fluidity: 100 - maritimeRisk },
      CCTV: { risk: cctvRisk, fluidity: 100 - cctvRisk }
    };
  };

  const metrics = getSectorMetrics();

  // Generator: Dynamically build routes based on current sector metrics
  const getRoutes = (): RouteOption[] => {
    const stmF = metrics.STM.fluidity;
    const cctvF = metrics.CCTV.fluidity;

    const dynamicLocations = getDynamicLocations();
    const originLoc = dynamicLocations.find(l => l.id === origin) || dynamicLocations[0];
    const destLoc = dynamicLocations.find(l => l.id === destination) || dynamicLocations[4];

    // Calculate real-time STM live alerts penalty to prevent 5/5 or 100% safety score during disruptions (Protocol REALTIME-STM-V4)
    const activeStmAlerts = feeds.filter(f => {
      if (f.type !== 'STM') return false;
      const tLower = f.title.toLowerCase();
      const dLower = f.details.toLowerCase();
      const vLower = f.value.toLowerCase();
      const isResolved = tLower.includes('dissipé') || tLower.includes('dissipée') ||
                          dLower.includes('dissipé') || dLower.includes('dissipée') ||
                          vLower.includes('dissipé') || vLower.includes('dissipée') ||
                          tLower.includes('résorbé') || tLower.includes('résorbée') ||
                          tLower.includes('résolu') || tLower.includes('résolue') ||
                          vLower.includes('nominal');
      return !isResolved;
    });

    let stmAlertPenalty = 0;
    activeStmAlerts.forEach(alert => {
      if (alert.severity === 'critical') {
        stmAlertPenalty += 40;
      } else if (alert.severity === 'high') {
        stmAlertPenalty += 25;
      } else if (alert.severity === 'medium') {
        stmAlertPenalty += 10;
      }
    });
    stmAlertPenalty = Math.min(stmAlertPenalty, 65);

    // Basic travel durations scaled by sector fluidity (Bus, Metro & Walking)
    const stmFactor = 1 + (100 - stmF) / 50; // scales transit time
    const roadFactor = 1 + (100 - cctvF) / 60; // represents surface congestion for buses

    const isStandardPair = 
      (origin === 'carrieres' && destination === 'labatt') ||
      (origin === 'labatt' && destination === 'carrieres') ||
      (origin === 'carrieres' && destination === 'veronique') ||
      (origin === 'veronique' && destination === 'carrieres') ||
      (origin === 'yul' && destination === 'centre') ||
      (origin === 'port' && destination === 'centre') ||
      (origin === 'berri' && destination === 'yul');

    if (!isStandardPair) {
      const originCity = originLoc.city || 'Montreal';
      const destCity = destLoc.city || 'Montreal';

      if (originCity !== destCity) {
        // --- INTER-CITY ROUTING ---
        const getDistanceMinFactor = (c1: string, c2: string) => {
          const pair = [c1, c2].sort().join('-');
          if (pair.includes('Quebec') && pair.includes('Montreal')) return { train: 180, flight: 45, road: 160 };
          if (pair.includes('Toronto') && pair.includes('Montreal')) return { train: 290, flight: 70, road: 320 };
          if (pair.includes('New York') && pair.includes('Montreal')) return { train: 540, flight: 90, road: 380 };
          
          if (pair.includes('Quebec') && pair.includes('Toronto')) return { train: 450, flight: 100, road: 480 };
          if (pair.includes('Quebec') && pair.includes('New York')) return { train: 620, flight: 110, road: 520 };
          if (pair.includes('Toronto') && pair.includes('New York')) return { train: 480, flight: 95, road: 440 };
          
          return { train: 240, flight: 60, road: 220 }; // Fallback
        };

        const factors = getDistanceMinFactor(originCity, destCity);

        // 1. VIA Rail / Amtrak Elite Corridor
        const r1Dur = Math.round(20 + factors.train * stmFactor + 15);
        const r1Sps: RouteStep[] = [
          { instruction: `Départ de ${originLoc.name} (${originCity}) : Liaison rapide vers la gare centrale de départ`, sector: 'ROUTE', durationMin: 20 },
          { instruction: `Voyage inter-cités d'élite : Gare d'origine ➔ Gare de destination (Facteur ponctualité: ${Math.round(stmF)}%)`, sector: 'STM', durationMin: Math.round(factors.train * stmFactor) },
          { instruction: `Arrivée et transit final de la gare d'arrivée vers ${destLoc.name} (${destCity})`, sector: 'ROUTE', durationMin: 15 }
        ];

        // 2. Air Cargo / Priority Charter Flight
        const r2Dur = Math.round(35 + factors.flight * 1.1 + 30);
        const r2Sps: RouteStep[] = [
          { instruction: `Transit motorisé tactique de ${originLoc.name} vers l'aéroport d'origine`, sector: 'ROUTE', durationMin: 35 },
          { instruction: `Liaison aérienne directe : Vol prioritaire sous surveillance ARGUS (Facteur d'espace aérien: ${Math.round(metrics.AVIATION?.fluidity || 90)}%)`, sector: 'AVIATION', durationMin: Math.round(factors.flight * 1.1) },
          { instruction: `Transfert final de la piste d'atterrissage sécurisée vers ${destLoc.name}`, sector: 'ROUTE', durationMin: 30 }
        ];

        // 3. Tactical Surface Driving
        const r3Dur = Math.round(15 + factors.road * roadFactor + 10);
        const r3Sps: RouteStep[] = [
          { instruction: `Préparation du véhicule à ${originLoc.name} : Insertion immédiate sur le corridor routier national`, sector: 'ROUTE', durationMin: 15 },
          { instruction: `Transit de surface en temps réel : Surveillance CCTV active et guidage anti-congestion (Fluidité: ${Math.round(cctvF)}%)`, sector: 'CCTV', durationMin: Math.round(factors.road * roadFactor) },
          { instruction: `Entrée sécurisée par le périmètre secondaire vers ${destLoc.name}`, sector: 'ROUTE', durationMin: 10 }
        ];

        return [
          {
            id: 'tot_optimal',
            name: '🚆 Corridor Ferroviaire Inter-Cités d\'élite',
            type: 'tot_optimal',
            totalDurationMin: r1Dur,
            safetyScore: Math.round(stmF * 0.98),
            steps: r1Sps,
            description: "Transit ferroviaire confortable, écologique et immunisé contre les aléas routiers. Solution idéale recommandée pour Michael."
          },
          {
            id: 'high_speed',
            name: '✈️ Pont Aérien Express d\'Élite',
            type: 'high_speed',
            totalDurationMin: r2Dur,
            safetyScore: Math.round((metrics.AVIATION?.fluidity || 90) * 0.95),
            steps: r2Sps,
            description: "Vol aérien optimisé en temps réel. Liaison directe de tarmac à tarmac pour minimiser la durée brute."
          },
          {
            id: 'backup_safe',
            name: '🚗 Transit Tactique Autonome de Surface',
            type: 'backup_safe',
            totalDurationMin: r3Dur,
            safetyScore: Math.round(cctvF * 0.94),
            steps: r3Sps,
            description: "Déplacement par autoroutes de surface. Totale autonomie opérationnelle de Michael avec communication cryptée."
          }
        ];
      } else {
        // --- INTRA-CITY LOCAL ROUTING (e.g. Montreal outings or NY local) ---
        // 1. Subway/Metro
        const r1Dur = Math.round(6 + 18 * stmFactor + 4);
        const r1Sps: RouteStep[] = [
          { instruction: `Approche pédestre de ${originLoc.name} vers le réseau souterrain rapide`, sector: 'ROUTE', durationMin: 6 },
          { instruction: `Transit en rame de métro : Navigation souterraine directe (Efficacité: ${Math.round(stmF)}%)`, sector: 'STM', durationMin: Math.round(18 * stmFactor) },
          { instruction: `Sortie de station et marche d'approche finale vers ${destLoc.name}`, sector: 'ROUTE', durationMin: 4 }
        ];

        // 2. Taxi/Surface Shuttle
        const r2Dur = Math.round(3 + 16 * roadFactor + 2);
        const r2Sps: RouteStep[] = [
          { instruction: `Prise en charge immédiate à ${originLoc.name} par véhicule motorisé de surface`, sector: 'ROUTE', durationMin: 3 },
          { instruction: `Transit routier optimisé : Surveillance CCTV de la congestion en temps réel (Fluidité: ${Math.round(cctvF)}%)`, sector: 'CCTV', durationMin: Math.round(16 * roadFactor) },
          { instruction: `Dépose et entrée principale sécurisée à ${destLoc.name}`, sector: 'ROUTE', durationMin: 2 }
        ];

        // 3. Multimodal Contournement
        const r3Dur = Math.round(12 + 10 * roadFactor + 14);
        const r3Sps: RouteStep[] = [
          { instruction: `Contournement préventif : Itinéraire d'évitement en bus local`, sector: 'STM', durationMin: 12 },
          { instruction: `Segment pédestre tactique à travers les parcs et passages couverts sécurisés`, sector: 'ROUTE', durationMin: 14 },
          { instruction: `Approche par le point d'accès secondaire sécurisé de ${destLoc.name}`, sector: 'ROUTE', durationMin: 5 }
        ];

        return [
          {
            id: 'tot_optimal',
            name: `🚇 Métro local en Temps Réel (${originCity})`,
            type: 'tot_optimal',
            totalDurationMin: r1Dur,
            safetyScore: Math.round(stmF * 0.99),
            steps: r1Sps,
            description: `Le moyen le plus fiable de naviguer dans ${originCity} sans se soucier du trafic de surface ou des accidents.`
          },
          {
            id: 'high_speed',
            name: `🚖 Approche Motorisée / Taxi de Surface`,
            type: 'high_speed',
            totalDurationMin: r2Dur,
            safetyScore: Math.round(cctvF * 0.95),
            steps: r2Sps,
            description: `Déplacement direct par les boulevards et autoroutes urbaines de ${originCity}, optimisé pour la vitesse de transit brut.`
          },
          {
            id: 'backup_safe',
            name: `🛡️ Itinéraire de Contournement Sécuritaire`,
            type: 'backup_safe',
            totalDurationMin: r3Dur,
            safetyScore: Math.round((stmF + 95) / 2),
            steps: r3Sps,
            description: "Axe secondaire multimodal conçu pour esquiver les points chauds de congestion et assurer une discrétion totale."
          }
        ];
      }
    }

    // Default names and descriptions
    let r1Name = 'Axe Ligne Verte via Jolicoeur (Bus 112)';
    let r1Desc = "Transit privilégié en métro jusqu'à Jolicoeur, suivi de la ligne de bus 112. Vitesse nominale optimisée en temps réel.";
    let r2Name = 'Axe Ligne Verte via Angrignon (Bus 106)';
    let r2Desc = 'Transit rapide via le terminus Angrignon puis la ligne à haute fréquence 106. Maximise la fréquence de passage.';
    let r3Name = 'Axe Ligne Verte via Angrignon (Bus 113)';
    let r3Desc = 'Transit de secours via le terminus Angrignon puis la ligne locale 113. Recommandé en cas de saturation ou retard de la 106 ou 112.';

    // Option 1: ToT Optimal
    let r1Duration = 25;
    let r1Steps: RouteStep[] = [];
    let r1Safety = Math.round(stmF);

    if (origin === 'carrieres' && destination === 'labatt' && (departureTime === '05:15' || departureTime === '09:15') && isWeekend(selectedDate)) {
      const formatEstTimeFr = (timeStr: string): string => {
        return timeStr.replace(':', 'h');
      };

      r1Steps = [
        { instruction: `${formatEstTimeFr(addMinutesToTime(departureTime, 0))} - Départ du 2200 Rue des Carrières`, sector: 'ROUTE', durationMin: 2 },
        { instruction: `${formatEstTimeFr(addMinutesToTime(departureTime, 2))} - Bus 45 Sud : Papineau / Carrières ➔ Métro Papineau`, sector: 'STM', durationMin: 8 },
        { instruction: `${formatEstTimeFr(addMinutesToTime(departureTime, 10))} - Métro Papineau (Ligne Verte) vers Angrignon`, sector: 'STM', durationMin: 20 },
        { instruction: `${formatEstTimeFr(addMinutesToTime(departureTime, 30))} - Transit direct vers Angrignon`, sector: 'STM', durationMin: 20 },
        { instruction: `${formatEstTimeFr(addMinutesToTime(departureTime, 50))} - Bus 106 Angrignon ➔ Newman / Labatt`, sector: 'STM', durationMin: 35 },
        { instruction: `${formatEstTimeFr(addMinutesToTime(departureTime, 85))} - Arrêt Newman / Labatt ➔ Approche finale 50 Avenue Labatt`, sector: 'ROUTE', durationMin: 10 }
      ];
      r1Duration = 95;
      r1Safety = 98; // Haute fiabilité le week-end matin
    } else if (origin === 'carrieres' && destination === 'labatt') {
      const wait112 = Math.round(5 * stmFactor);
      const transit112 = Math.round(12 * roadFactor);
      r1Duration = 8 + 16 + wait112 + transit112 + 2;
      r1Steps = [
        { instruction: "Départ du 2200 Rue des Carrières : Prendre le Bus 45 Sud sur l'Axe Papineau vers Métro Papineau", sector: 'ROUTE', durationMin: 8 },
        { instruction: "Métro STM Ligne Verte : Transit direct de Station Papineau à Station Jolicoeur", sector: 'STM', durationMin: 16 },
        { instruction: `Bus STM 112 Ouest : Arrêt Jolicoeur ➔ Newman / Labatt (Attente: ${wait112}m | Trajet: ${transit112}m)`, sector: 'STM', durationMin: wait112 + transit112 },
        { instruction: "Marche d'approche finale : Arrêt Newman/Labatt ➔ 50 Avenue Labatt", sector: 'ROUTE', durationMin: 2 }
      ];
      r1Safety = Math.round(stmF * 0.98);
    } else if (origin === 'labatt' && destination === 'carrieres') {
      const isLateWknd = (departureTime === '23:00' || departureTime === '23h00' || departureTime >= '22:00') && isWeekend(selectedDate);
      const wait112 = isLateWknd ? Math.round(15 * stmFactor) : Math.round(6 * stmFactor);
      const transit112 = Math.round(14 * roadFactor);
      r1Duration = 2 + wait112 + transit112 + 16 + 8;
      r1Steps = [
        { instruction: "Départ de 50 Avenue Labatt ➔ Newman / Labatt", sector: 'ROUTE', durationMin: 2 },
        { instruction: `Bus STM 112 Est : Newman/Labatt ➔ Station Jolicoeur (${isLateWknd ? 'RETOUR CRITIQUE WEEK-END 23h - Attente' : 'Attente'}: ${wait112}m | Trajet: ${transit112}m)`, sector: 'STM', durationMin: wait112 + transit112 },
        { instruction: "Métro Ligne Verte : Station Jolicoeur ➔ Station Papineau", sector: 'STM', durationMin: 16 },
        { instruction: "Bus STM 45 Nord : Station Papineau ➔ 2200 Rue des Carrières", sector: 'STM', durationMin: 8 }
      ];
      r1Safety = isLateWknd ? 95 : Math.round(stmF * 0.97);
      r1Name = isLateWknd ? '💼 Retour Week-end 23h via Jolicoeur (Bus 112)' : 'Axe Retour via Jolicoeur (Bus 112)';
      r1Desc = isLateWknd 
        ? "Trajet spécifique de retour le week-end à 23h00 avec prise en compte de la baisse de fréquence nocturne."
        : "Trajet de retour nominal via la ligne de bus 112 Est et les correspondances de métro.";
    } else if (origin === 'carrieres' && destination === 'veronique') {
      const wait496 = Math.round(8 * stmFactor);
      const transit496 = Math.round(20 * roadFactor);
      r1Duration = 8 + 12 + wait496 + transit496 + 3;
      r1Steps = [
        { instruction: "Départ du 2200 Rue des Carrières : Prendre le Bus 45 Sud sur l'Axe Papineau vers Métro Papineau", sector: 'ROUTE', durationMin: 8 },
        { instruction: "Métro Ligne Verte : Papineau ➔ Lionel-Groulx", sector: 'STM', durationMin: 12 },
        { instruction: `Bus STM Express 496 Ouest : Lionel-Groulx ➔ Victoria / George-V (Attente: ${wait496}m | Trajet: ${transit496}m)`, sector: 'STM', durationMin: wait496 + transit496 },
        { instruction: "Marche finale : Arrêt Victoria/George-V ➔ 365 Av. George-V (Chez Véronique)", sector: 'ROUTE', durationMin: 3 }
      ];
      r1Safety = Math.round(stmF * 0.96);
      r1Name = 'Axe Express 496 Ouest (Lachine)';
      r1Desc = "Ligne express reliant directement Lionel-Groulx à Lachine (Avenue George-V). Vitesse maximale.";
    } else if (origin === 'veronique' && destination === 'carrieres') {
      const wait496 = Math.round(8 * stmFactor);
      const transit496 = Math.round(20 * roadFactor);
      r1Duration = 3 + wait496 + transit496 + 12 + 8;
      r1Steps = [
        { instruction: "Départ de 365 Av. George-V (Véronique) ➔ Arrêt Victoria / George-V", sector: 'ROUTE', durationMin: 3 },
        { instruction: `Bus STM Express 496 Est : Victoria/George-V ➔ Station Lionel-Groulx (Attente: ${wait496}m | Trajet: ${transit496}m)`, sector: 'STM', durationMin: wait496 + transit496 },
        { instruction: "Métro Ligne Verte : Lionel-Groulx ➔ Station Papineau", sector: 'STM', durationMin: 12 },
        { instruction: "Bus STM 45 Nord : Station Papineau ➔ 2200 Rue des Carrières", sector: 'ROUTE', durationMin: 8 }
      ];
      r1Safety = Math.round(stmF * 0.96);
      r1Name = 'Axe Retour Express 496 (Lachine ➔ Carrières)';
      r1Desc = "Retour express direct depuis Lachine via le bus 496 Est et la Ligne Verte du métro.";
    } else if (origin === 'yul' && destination === 'centre') {
      r1Duration = Math.round(25 * roadFactor + 10);
      r1Steps = [
        { instruction: "Départ de l'Aéroport CYUL : Bus Express 747 Est vers Lionel-Groulx", sector: 'STM', durationMin: Math.round(25 * roadFactor) },
        { instruction: "Métro Ligne Verte : Transit direct de Lionel-Groulx à Square-Victoria-OACI", sector: 'STM', durationMin: 8 },
        { instruction: "Arrivée à pied au Centre de Commande ARGUS par le corridor protégé", sector: 'ROUTE', durationMin: 2 }
      ];
    } else if (origin === 'port' && destination === 'centre') {
      r1Duration = Math.round(15 * roadFactor + 10 * stmFactor + 5);
      r1Steps = [
        { instruction: "Départ du Quai 52 : Marche vers l'arrêt de Bus 185 Notre-Dame Est", sector: 'ROUTE', durationMin: 5 },
        { instruction: "Bus 185 Ouest : Transit de Notre-Dame vers la Station de métro Frontenac", sector: 'STM', durationMin: Math.round(15 * roadFactor) },
        { instruction: "Métro Ligne Verte : De Frontenac à la Station Berri-UQAM", sector: 'STM', durationMin: Math.round(10 * stmFactor) }
      ];
    } else if (origin === 'berri' && destination === 'yul') {
      r1Duration = Math.round(10 * stmFactor + 25 * roadFactor + 3);
      r1Steps = [
        { instruction: "Départ de Berri-UQAM : Ligne Verte du métro vers la station Lionel-Groulx", sector: 'STM', durationMin: Math.round(10 * stmFactor) },
        { instruction: "Station Lionel-Groulx : Correspondance Bus Express 747 Ouest vers l'Aéroport", sector: 'STM', durationMin: Math.round(25 * roadFactor) },
        { instruction: "Arrivée sécurisée au terminal CYUL par le trottoir piéton", sector: 'ROUTE', durationMin: 3 }
      ];
    } else {
      r1Duration = Math.round(8 + 15 * stmFactor + 10 * roadFactor + 4);
      r1Steps = [
        { instruction: `Départ de ${originLoc.name} : Marche vers la station de métro la plus proche`, sector: 'ROUTE', durationMin: 8 },
        { instruction: `Métro STM : Transit principal pour contourner les ralentissements`, sector: 'STM', durationMin: Math.round(15 * stmFactor) },
        { instruction: `Bus STM local : Liaison vers l'arrêt de destination`, sector: 'STM', durationMin: Math.round(10 * roadFactor) },
        { instruction: `Marche d'approche finale vers ${destLoc.name}`, sector: 'ROUTE', durationMin: 4 }
      ];
    }

    // Option 2: High Speed Route
    let r2Duration = 20;
    let r2Steps: RouteStep[] = [];
    let r2Safety = Math.round(stmF * 0.95);

    if (origin === 'carrieres' && destination === 'labatt') {
      const wait106 = Math.round(3 * stmFactor);
      const transit106 = Math.round(10 * roadFactor);
      r2Duration = 8 + 18 + wait106 + transit106 + 2;
      r2Steps = [
        { instruction: "Départ du 2200 Rue des Carrières : Marcher vers l'Axe d'Iberville et prendre le Bus 94 Sud vers Métro Frontenac", sector: 'ROUTE', durationMin: 8 },
        { instruction: "Métro STM Ligne Verte : Transit direct de Station Frontenac à Station Angrignon", sector: 'STM', durationMin: 18 },
        { instruction: `Bus STM 106 Ouest : Arrêt Angrignon ➔ Newman / Labatt (Attente: ${wait106}m | Trajet: ${transit106}m)`, sector: 'STM', durationMin: wait106 + transit106 },
        { instruction: "Marche d'approche finale : Arrêt Newman/Labatt ➔ 50 Avenue Labatt", sector: 'ROUTE', durationMin: 2 }
      ];
      r2Safety = Math.round(stmF * 0.95);
    } else if (origin === 'labatt' && destination === 'carrieres') {
      const isLateWknd = (departureTime === '23:00' || departureTime === '23h00' || departureTime >= '22:00') && isWeekend(selectedDate);
      const wait106 = isLateWknd ? Math.round(10 * stmFactor) : Math.round(4 * stmFactor);
      const transit106 = Math.round(11 * roadFactor);
      r2Duration = 2 + wait106 + transit106 + 18 + 8;
      r2Steps = [
        { instruction: "Départ de 50 Avenue Labatt ➔ Newman / Labatt", sector: 'ROUTE', durationMin: 2 },
        { instruction: `Bus STM 106 Est : Newman/Labatt ➔ Station Angrignon (${isLateWknd ? 'Retour Week-end 23h' : 'Attente'}: ${wait106}m | Trajet: ${transit106}m)`, sector: 'STM', durationMin: wait106 + transit106 },
        { instruction: "Métro Ligne Verte : Station Angrignon ➔ Station Frontenac", sector: 'STM', durationMin: 18 },
        { instruction: "Bus STM 94 Nord : Station Frontenac ➔ 2200 Rue des Carrières (sur l'Axe Iberville)", sector: 'STM', durationMin: 8 }
      ];
      r2Safety = isLateWknd ? 92 : Math.round(stmF * 0.94);
      r2Name = isLateWknd ? '💼 Retour Week-end 23h via Angrignon & d\'Iberville (Bus 94)' : 'Retour Ligne Verte via Angrignon & d\'Iberville (Bus 94)';
      r2Desc = "Retour express par le terminus Angrignon puis transit Métro Frontenac et Bus 94 Nord.";
    } else if (origin === 'carrieres' && destination === 'veronique') {
      const wait195 = Math.round(6 * stmFactor);
      const transit195 = Math.round(18 * roadFactor);
      r2Duration = 8 + 18 + wait195 + transit195 + 4;
      r2Steps = [
        { instruction: "Départ du 2200 Rue des Carrières : Marcher vers l'Axe d'Iberville et prendre le Bus 94 Sud vers Métro Frontenac", sector: 'ROUTE', durationMin: 8 },
        { instruction: "Métro Ligne Verte : Frontenac ➔ Angrignon", sector: 'STM', durationMin: 18 },
        { instruction: `Bus STM 195 Ouest : Station Angrignon ➔ Notre-Dame / George-V (Attente: ${wait195}m | Trajet: ${transit195}m)`, sector: 'STM', durationMin: wait195 + transit195 },
        { instruction: "Marche d'approche : Arrêt Notre-Dame/George-V ➔ 365 Av. George-V (Chez Véronique)", sector: 'ROUTE', durationMin: 4 }
      ];
      r2Safety = Math.round(stmF * 0.94);
      r2Name = 'Axe Ligne Verte & Bus 195 Ouest via Iberville';
      r2Desc = "Liaison via d'Iberville, le terminus métro Angrignon puis la ligne de bus locale 195 Ouest.";
    } else if (origin === 'veronique' && destination === 'carrieres') {
      const wait195 = Math.round(6 * stmFactor);
      const transit195 = Math.round(18 * roadFactor);
      r2Duration = 4 + wait195 + transit195 + 18 + 8;
      r2Steps = [
        { instruction: "Départ de 365 Av. George-V (Véronique) ➔ Arrêt Notre-Dame / George-V", sector: 'ROUTE', durationMin: 4 },
        { instruction: `Bus STM 195 Est : Notre-Dame/George-V ➔ Station Angrignon (Attente: ${wait195}m | Trajet: ${transit195}m)`, sector: 'STM', durationMin: wait195 + transit195 },
        { instruction: "Métro Ligne Verte : Angrignon ➔ Station Frontenac", sector: 'STM', durationMin: 18 },
        { instruction: "Bus STM 94 Nord : Station Frontenac ➔ 2200 Rue des Carrières (sur l'Axe Iberville)", sector: 'ROUTE', durationMin: 8 }
      ];
      r2Safety = Math.round(stmF * 0.94);
      r2Name = 'Retour via Bus 195 Est & Bus 94 Nord';
      r2Desc = "Retour secondaire via le terminus Angrignon, Métro Frontenac puis la ligne 94 Nord d'Iberville.";
    } else if (origin === 'yul' && destination === 'centre') {
      r2Duration = Math.round(22 * roadFactor + 5);
      r2Steps = [
        { instruction: "Départ de l'Aéroport CYUL : Prendre l'express 747 en heures de pointe", sector: 'STM', durationMin: Math.round(22 * roadFactor) },
        { instruction: "Arrivée à pied au Centre de Commande par le hall d'entrée principal", sector: 'ROUTE', durationMin: 5 }
      ];
    } else if (origin === 'port' && destination === 'centre') {
      r2Duration = Math.round(18 * roadFactor + 5);
      r2Steps = [
        { instruction: "Départ du Quai 52 : Marche rapide vers le Bus 185 Notre-Dame", sector: 'ROUTE', durationMin: 5 },
        { instruction: "Bus 185 Ouest direct jusqu'au hub de transit principal", sector: 'STM', durationMin: Math.round(18 * roadFactor) }
      ];
    } else {
      r2Duration = Math.round(12 * stmFactor + 10 * roadFactor + 5);
      r2Steps = [
        { instruction: `Transit direct en bus STM de ${originLoc.name} vers ${destLoc.name}`, sector: 'STM', durationMin: Math.round(12 * stmFactor + 10 * roadFactor) },
        { instruction: `Approche par le hall principal de ${destLoc.name}`, sector: 'ROUTE', durationMin: 5 }
      ];
    }

    // Option 3: Backup Safe Route
    let r3Duration = 45;
    let r3Steps: RouteStep[] = [];
    let r3Safety = 95;

    if (origin === 'carrieres' && destination === 'labatt') {
      const wait113 = Math.round(7 * stmFactor);
      const transit113 = Math.round(13 * roadFactor);
      r3Duration = 8 + 18 + wait113 + transit113 + 2;
      r3Steps = [
        { instruction: "Départ du 2200 Rue des Carrières : Prendre le Bus 45 Sud sur l'Axe Papineau vers Métro Papineau", sector: 'ROUTE', durationMin: 8 },
        { instruction: "Métro STM Ligne Verte : Transit direct de Station Papineau à Station Angrignon", sector: 'STM', durationMin: 18 },
        { instruction: `Bus STM 113 Ouest : Arrêt Angrignon ➔ Newman / Labatt (Attente: ${wait113}m | Trajet: ${transit113}m)`, sector: 'STM', durationMin: wait113 + transit113 },
        { instruction: "Marche d'approche finale : Arrêt Newman/Labatt ➔ 50 Avenue Labatt", sector: 'ROUTE', durationMin: 2 }
      ];
      r3Safety = Math.round(stmF * 0.99);
    } else if (origin === 'labatt' && destination === 'carrieres') {
      const isLateWknd = (departureTime === '23:00' || departureTime === '23h00' || departureTime >= '22:00') && isWeekend(selectedDate);
      const wait113 = isLateWknd ? Math.round(18 * stmFactor) : Math.round(8 * stmFactor);
      const transit113 = Math.round(14 * roadFactor);
      r3Duration = 2 + wait113 + transit113 + 18 + 8;
      r3Steps = [
        { instruction: "Départ de 50 Avenue Labatt ➔ Newman / Labatt", sector: 'ROUTE', durationMin: 2 },
        { instruction: `Bus STM 113 Est : Newman/Labatt ➔ Station Angrignon (${isLateWknd ? 'Retour Week-end 23h' : 'Attente'}: ${wait113}m | Trajet: ${transit113}m)`, sector: 'STM', durationMin: wait113 + transit113 },
        { instruction: "Métro Ligne Verte : Station Angrignon ➔ Station Papineau", sector: 'STM', durationMin: 18 },
        { instruction: "Bus STM 45 Nord : Station Papineau ➔ 2200 Rue des Carrières", sector: 'STM', durationMin: 8 }
      ];
      r3Safety = isLateWknd ? 96 : Math.round(stmF * 0.98);
      r3Name = isLateWknd ? '💼 Retour Week-end 23h de Secours (Bus 113)' : 'Retour Ligne Verte de Secours (Bus 113)';
      r3Desc = "Retour sécurisé de secours via la ligne de bus locale 113 Est vers Angrignon, Métro Papineau et Bus 45 Nord.";
    } else if (origin === 'carrieres' && destination === 'veronique') {
      const wait191 = Math.round(12 * stmFactor);
      const transit191 = Math.round(30 * roadFactor);
      r3Duration = 8 + 12 + wait191 + transit191 + 3;
      r3Steps = [
        { instruction: "Départ du 2200 Rue des Carrières : Prendre le Bus 45 Sud sur l'Axe Papineau vers Métro Papineau", sector: 'ROUTE', durationMin: 8 },
        { instruction: "Métro Ligne Verte : Papineau ➔ Lionel-Groulx", sector: 'STM', durationMin: 12 },
        { instruction: `Bus STM 191 Ouest : Lionel-Groulx ➔ Victoria / George-V (Attente: ${wait191}m | Trajet: ${transit191}m)`, sector: 'STM', durationMin: wait191 + transit191 },
        { instruction: "Marche d'approche finale : Arrêt Victoria/George-V ➔ 365 Av. George-V (Chez Véronique)", sector: 'ROUTE', durationMin: 3 }
      ];
      r3Safety = Math.round(stmF * 0.97);
      r3Name = 'Backup Axe Bus 191 Ouest via Papineau';
      r3Desc = "Itinéraire de rechange complet utilisant le bus 45 Sud, la Ligne Verte, puis le bus 191 Ouest depuis Lionel-Groulx.";
    } else if (origin === 'veronique' && destination === 'carrieres') {
      const wait191 = Math.round(12 * stmFactor);
      const transit191 = Math.round(30 * roadFactor);
      r3Duration = 3 + wait191 + transit191 + 12 + 8;
      r3Steps = [
        { instruction: "Départ de 365 Av. George-V (Véronique) ➔ Arrêt Victoria / George-V", sector: 'ROUTE', durationMin: 3 },
        { instruction: `Bus STM 191 Est : Victoria/George-V ➔ Station Lionel-Groulx (Attente: ${wait191}m | Trajet: ${transit191}m)`, sector: 'STM', durationMin: wait191 + transit191 },
        { instruction: "Métro Ligne Verte : Lionel-Groulx ➔ Station Papineau", sector: 'STM', durationMin: 12 },
        { instruction: "Bus STM 45 Nord : Station Papineau ➔ 2200 Rue des Carrières", sector: 'ROUTE', durationMin: 8 }
      ];
      r3Safety = Math.round(stmF * 0.97);
      r3Name = 'Backup Retour via Bus 191 Est & Bus 45 Nord';
      r3Desc = "Retour de secours nominal par la ligne de bus 191 Est, le métro jusqu'à Papineau et la ligne 45 Nord.";
    } else {
      r3Duration = Math.round(20 * stmFactor + 15);
      r3Steps = [
        { instruction: `Évitement complet des axes saturés : Départ de ${originLoc.name} par les lignes de bus locales`, sector: 'STM', durationMin: Math.round(20 * stmFactor) },
        { instruction: "Liaisons piétonnes à travers les parcs publics et zones d'accès restreintes", sector: 'ROUTE', durationMin: 15 }
      ];
      r3Safety = Math.round((stmF + 95) / 2);
    }

    const rawRoutes = [
      {
        id: 'tot_optimal',
        name: r1Name,
        type: 'tot_optimal' as const,
        totalDurationMin: r1Duration,
        safetyScore: r1Safety,
        steps: r1Steps,
        description: r1Desc
      },
      {
        id: 'high_speed',
        name: r2Name,
        type: 'high_speed' as const,
        totalDurationMin: r2Duration,
        safetyScore: r2Safety,
        steps: r2Steps,
        description: r2Desc
      },
      {
        id: 'backup_safe',
        name: r3Name,
        type: 'backup_safe' as const,
        totalDurationMin: r3Duration,
        safetyScore: r3Safety,
        steps: r3Steps,
        description: r3Desc
      }
    ];

    // Strict enforcement: Bus 94 (Iberville) and Bus 45 (Papineau) operate on distinct, parallel North-South axes.
    // Prohibit any route calculation that suggests a cross-street intersection between these specific lines.
    rawRoutes.forEach(route => {
      const usesBus45 = route.steps.some(step => step.instruction.includes('Bus 45') || step.instruction.includes('45 Nord') || step.instruction.includes('45 Sud'));
      const usesBus94 = route.steps.some(step => step.instruction.includes('Bus 94') || step.instruction.includes('94 Nord') || step.instruction.includes('94 Sud'));
      if (usesBus45 && usesBus94) {
        throw new Error(`POLITIQUES DE SÉCURITÉ ARGUS : Conflit d'interconnexion détecté. Bus 45 (Axe Papineau) et Bus 94 (Axe Iberville) sont deux axes parallèles Nord-Sud et ne doivent en aucun cas être croisés.`);
      }
    });

    return rawRoutes.map(route => {
      // Apply the dynamic real-time STM alert penalty if the route utilizes STM transit
      let baseSafety = route.safetyScore;
      const usesStm = route.steps.some(step => step.sector === 'STM');
      if (usesStm && stmAlertPenalty > 0) {
        baseSafety = Math.max(15, baseSafety - stmAlertPenalty);
      }

      const adapted = adaptStepsAndMetrics(route.steps, baseSafety);
      return {
        ...route,
        steps: adapted.steps,
        totalDurationMin: adapted.totalDurationMin,
        safetyScore: adapted.safetyScore,
        description: adapted.warnings.length > 0 
          ? `${route.description} (Modes limités: ${adapted.warnings.join(' ')})`
          : route.description
      };
    });
  };

  const currentRoutes = getRoutes();
  const selectedRoute = currentRoutes.find(r => r.id === activeRouteId) || currentRoutes[0];

  const activeAlertsOnInitialRoute = feeds.filter(feed => {
    const isSevere = feed.severity === 'high' || feed.severity === 'critical';
    const crossesSector = selectedRoute.steps.some(step => step.sector === feed.type);
    return isSevere && crossesSector;
  });

  const alternativeRoutes = currentRoutes.filter(r => r.id !== activeRouteId);
  const safestAlternative = alternativeRoutes.length > 0
    ? alternativeRoutes.reduce((prev: RouteOption, curr: RouteOption) => (curr.safetyScore > prev.safetyScore ? curr : prev), alternativeRoutes[0])
    : null;

  // Automatically sync arrival time when departure time or selected route duration changes
  useEffect(() => {
    const calculatedArrival = addMinutesToTime(departureTime, selectedRoute.totalDurationMin);
    setArrivalTime(calculatedArrival);
  }, [departureTime, selectedRoute.totalDurationMin]);

  // Real-time STM Bus variables for the Lionel-Groulx connection
  const stmF = metrics.STM.fluidity;
  const stmFactor = 1 + (100 - stmF) / 50;
  const cctvF = metrics.CCTV.fluidity;
  const roadFactor = 1 + (100 - cctvF) / 60;

  const wait112 = Math.round(5 * stmFactor);
  const transit112 = Math.round(12 * roadFactor);
  const total112 = 8 + wait112 + transit112;

  const wait106 = Math.round(3 * stmFactor);
  const transit106 = Math.round(10 * roadFactor);
  const total106 = 11 + wait106 + transit106;

  const wait113 = Math.round(7 * stmFactor);
  const transit113 = Math.round(13 * roadFactor);
  const total113 = 11 + wait113 + transit113;

  const bestIs112 = total112 <= Math.min(total106, total113);
  const fastestBusOption = bestIs112 ? '112' : (total106 <= total113 ? '106' : '113');

  // Simulator interval: slightly adjust the metrics every 8 seconds to demonstrate real-time reactivity
  // and force the synchronization with the user's real geolocation before each calculation
  useEffect(() => {
    if (!isLiveAutoUpdate) return;

    const interval = setInterval(() => {
      setRecalculating(true);
      
      // Force synchronization with the user's real geolocation before every calculation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGpsLatitude(position.coords.latitude);
            setGpsLongitude(position.coords.longitude);
            setIsGpsActive(true);
            setIsManualActive(false);
          },
          (err) => {
            console.warn("Forced GPS auto-synchronization failed. Utilizing default coordinates.", err);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      }

      // Randomly select one feed to modify slightly
      const updatedFeeds = [...feeds];
      const randomIndex = Math.floor(Math.random() * updatedFeeds.length);
      const feedToUpdate = { ...updatedFeeds[randomIndex] };

      // Change values or severity slightly according to category to prevent duplication
      let fluctuations = ['SLA nominal'];
      
      if (feedToUpdate.type === 'STM') {
        const isBusIncident = feedToUpdate.title.toLowerCase().includes('bus') || feedToUpdate.id.includes('bus');
        fluctuations = isBusIncident
          ? ['Retard de bus de 12m', 'Vitesse -65% par rapport à la référence', 'Boul. Saint-Laurent saturé', 'Retard de bus de 5m', 'SLA nominal bus']
          : ['Retard de métro de 15m', 'Retard de métro de 28m', 'Ralentissement -20%', 'Retard de métro de 5m', 'Ligne fluide (SLA nominal)'];
      } else if (feedToUpdate.type === 'AVIATION') {
        fluctuations = ['Bruit en bande L +38dB', 'Interférence de signal faible', 'Bruit en bande L +45dB', 'Correction INS active', 'SLA nominal'];
      } else if (feedToUpdate.type === 'MARITIME') {
        fluctuations = ['Draft -1.0m', 'Draft -1.5m', 'Perte de paquets AIS 35%', 'Canal maritime dégagé', 'SLA nominal'];
      } else if (feedToUpdate.type === 'CCTV') {
        fluctuations = ['Fumée blanche dissipée', 'Panache dense', 'Ralentissement résorbé', 'Intrusion résolue', 'SLA nominal'];
      }

      const newMetricValue = fluctuations[Math.floor(Math.random() * fluctuations.length)];
      
      let newSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (
        newMetricValue.includes('SLA nominal') || 
        newMetricValue.includes('résolu') || 
        newMetricValue.includes('dégagé') ||
        newMetricValue.includes('dissipée') ||
        newMetricValue.includes('résorbé') ||
        newMetricValue.includes('nominal')
      ) {
        newSeverity = 'low';
      } else if (newMetricValue.includes('dense') || newMetricValue.includes('+45dB') || newMetricValue.includes('28m')) {
        newSeverity = 'critical';
      } else if (newMetricValue.includes('15m') || newMetricValue.includes('35%') || newMetricValue.includes('12m')) {
        newSeverity = 'high';
      }

      feedToUpdate.value = newMetricValue;
      feedToUpdate.severity = newSeverity;
      feedToUpdate.timestamp = new Date().toISOString();
      updatedFeeds[randomIndex] = feedToUpdate;

      // Update the parent state
      onSimulateUpdate(updatedFeeds);
      setLastRecalculateTime(new Date());
      setRecalculateReason(`Mise à jour télémétrique reçue pour le secteur ${feedToUpdate.type} : ${newMetricValue}`);

      setTimeout(() => {
        setRecalculating(false);
      }, 900);

    }, 8000);

    return () => clearInterval(interval);
  }, [isLiveAutoUpdate, feeds, onSimulateUpdate]);

  // Automatic Backup Recalculation Effect
  useEffect(() => {
    if (!autoBackupRecalc || activeAlertsOnInitialRoute.length === 0 || !safestAlternative) return;

    // If an alternative route is safer than the current compromised one, trigger automatic switch
    if (safestAlternative.safetyScore > selectedRoute.safetyScore) {
      setRecalculating(true);
      setActiveRouteId(safestAlternative.id);
      setLastRecalculateTime(new Date());
      setRecalculateReason(`RECALCUL DE SECOURS AUTOMATIQUE : Alerte active de niveau ${activeAlertsOnInitialRoute[0].severity.toUpperCase()} sur l'itinéraire d'origine ("${selectedRoute.name}"). Transition autonome immédiate vers l'itinéraire alternatif le plus sûr: "${safestAlternative.name}" (Fiabilité : ${safestAlternative.safetyScore}%).`);
      
      const timer = setTimeout(() => {
        setRecalculating(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [feeds, autoBackupRecalc, activeRouteId, activeAlertsOnInitialRoute, safestAlternative, selectedRoute]);

  const getSectorIcon = (sector: string) => {
    switch (sector) {
      case 'STM':
        return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono px-1.5 py-0.5 rounded">STM</span>;
      case 'AVIATION':
        return <span className="bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-mono px-1.5 py-0.5 rounded">AIR</span>;
      case 'MARITIME':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono px-1.5 py-0.5 rounded">MER</span>;
      case 'CCTV':
        return <span className="bg-purple-950 text-purple-400 border border-purple-800 text-[10px] font-mono px-1.5 py-0.5 rounded">CCTV</span>;
      default:
        return <span className="bg-slate-850 text-slate-400 border border-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded">ROUTE</span>;
    }
  };

  const exportToJSON = () => {
    // Detect blockages from active feeds (high or critical severity), filtering out resolved/dissipated states
    const blockages = feeds.filter(f => {
      const titleLower = f.title.toLowerCase();
      const valLower = f.value.toLowerCase();
      const isResolved = titleLower.includes('dissipée') || titleLower.includes('dissipé') || 
                        titleLower.includes('résorbé') || titleLower.includes('résolu') || 
                        valLower.includes('dissipée') || valLower.includes('dissipé') || 
                        valLower.includes('résorbé') || valLower.includes('résolu') ||
                        valLower.includes('nominal');
      
      const realSeverity = isResolved ? 'low' : f.severity;
      return realSeverity === 'high' || realSeverity === 'critical';
    }).map(f => ({
      id: f.id,
      secteur: f.type,
      titre: f.title,
      source: f.source,
      severite: f.severity.toUpperCase(),
      valeurTelemetrie: f.value,
      details: f.details,
      horodatage: f.timestamp
    }));

    const exportData = {
      rapportId: `REP-ARGUS-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      generateur: "Console de Commande de Michael",
      dateGeneration: new Date().toISOString(),
      statutGlobalCorridor: blockages.length > 0 ? "ALERTES DE TRANSIT ACTIVES" : "CORRIDOR NOMINAL FLUIDE",
      parametresDeRecherche: {
        origine: LOCATIONS.find(l => l.id === origin)?.name || origin,
        destination: LOCATIONS.find(l => l.id === destination)?.name || destination,
        heureDepart: departureTime,
        heureArriveeEstimee: arrivalTime,
        dateTrajet: selectedDate || "Aujourd'hui"
      },
      filtresModesDeTransport: {
        busAutorise: allowedModes.bus,
        metroAutorise: allowedModes.metro,
        marcheAutorisee: allowedModes.walk
      },
      itineraireOptimalSelectionne: {
        id: selectedRoute.id,
        nom: selectedRoute.name,
        description: selectedRoute.description,
        scoreFiabiliteCorridor: selectedRoute.safetyScore,
        dureeTotaleMinutes: selectedRoute.totalDurationMin,
        feuilleDeRouteDetaillee: selectedRoute.steps.map((s, idx) => ({
          ordre: idx + 1,
          secteur: s.sector,
          instruction: s.instruction,
          dureeMinutes: s.durationMin
        }))
      },
      pointsDeBlocageDetectes: blockages,
      contexteTousIncidents: feeds.map(f => {
        const titleLower = f.title.toLowerCase();
        const valLower = f.value.toLowerCase();
        const isResolved = titleLower.includes('dissipée') || titleLower.includes('dissipé') || 
                          titleLower.includes('résorbé') || titleLower.includes('résolu') || 
                          valLower.includes('dissipée') || valLower.includes('dissipé') || 
                          valLower.includes('résorbé') || valLower.includes('résolu') ||
                          valLower.includes('nominal');
        const realSeverity = isResolved ? 'low' : f.severity;
        return {
          secteur: f.type,
          titre: f.title,
          severite: realSeverity.toUpperCase(),
          valeur: f.value
        };
      })
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `rapport_itineraires_michael_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Ordre,Secteur,Instruction,Duree (Minutes)\n";
    
    selectedRoute.steps.forEach((step, idx) => {
      csvContent += `${idx + 1},"${step.sector}","${step.instruction.replace(/"/g, '""')}",${step.durationMin}\n`;
    });
    
    csvContent += `\nMetriques Globales,,,\n`;
    csvContent += `Nom Itineraire,"${selectedRoute.name.replace(/"/g, '""')}",,\n`;
    csvContent += `Origine,"${LOCATIONS.find(l => l.id === origin)?.name.replace(/"/g, '""')}",,\n`;
    csvContent += `Destination,"${LOCATIONS.find(l => l.id === destination)?.name.replace(/"/g, '""')}",,\n`;
    csvContent += `Duree Totale,${selectedRoute.totalDurationMin} minutes,,\n`;
    csvContent += `Fiabilite,${selectedRoute.safetyScore}%,,\n`;
    csvContent += `Date Export,${new Date().toLocaleString('fr-CA')},,\n`;

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `itineraire_michael_${selectedRoute.id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Remaining logic for widget display follows below

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 p-5 space-y-6"
      id="michael-itinerary-finder-widget"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-400">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm tracking-wide text-white">
              PLANIFICATEUR D'ITINÉRAIRE MULTI-MODAL DE MICHAEL
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              CONTOURNEMENT INTELLIGENT DE TOUT RISQUE SÉCTORIEL ET CALCUL DE TRAJECTOIRE EN TEMPS RÉEL
            </p>
          </div>
        </div>

        {/* Live status with toggle */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          {/* Date Selector (pointed by green arrow) */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-[10px] font-mono hover:border-slate-700 transition-colors">
            <span className="text-indigo-400 font-bold">DATE :</span>
            <input
              id="itinerary-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const dateVal = e.target.value;
                setSelectedDate(dateVal);
                if (isWeekend(dateVal)) {
                  setOrigin('carrieres');
                  setDestination('labatt');
                  const day = getDayOfWeek(dateVal);
                  if (day === 0) { // Dimanche
                    setDepartureTime('09:15');
                    setArrivalTime('11:00');
                  } else { // Samedi ou autre
                    setDepartureTime('05:15');
                    setArrivalTime('07:00');
                  }
                }
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer placeholder-slate-600 border-none p-0 text-[10px] font-mono outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <button
            onClick={() => setIsLiveAutoUpdate(!isLiveAutoUpdate)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono border flex items-center gap-1.5 transition-all ${
              isLiveAutoUpdate 
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isLiveAutoUpdate && recalculating ? 'animate-spin' : ''}`} />
            <span>{isLiveAutoUpdate ? 'SYNCHRONISATION LIVE ACTIVE (8s)' : 'SYNCHRONISATION PAUSE'}</span>
          </button>

          <button
            onClick={() => setAutoBackupRecalc(!autoBackupRecalc)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono border flex items-center gap-1.5 transition-all ${
              autoBackupRecalc 
                ? 'bg-amber-950/80 border-amber-800 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Activer la détection automatique de crise et la suggestion d'itinéraires de déviation"
          >
            <Zap className={`w-3 h-3 ${autoBackupRecalc ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
            <span>RECALCUL SECOURS : {autoBackupRecalc ? 'ACTIF' : 'INACTIF'}</span>
          </button>
        </div>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Origin Selector */}
        <div className="space-y-1.5 font-mono text-xs md:col-span-1">
          <label className="text-slate-400 font-semibold block text-[10px] uppercase">POINT A (ORIGINE LOGISTIQUE) :</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400" />
            <select
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                // Prevent choosing identical origin and destination
                if (e.target.value === destination) {
                  setDestination(LOCATIONS.find(l => l.id !== e.target.value)?.id || 'centre');
                }
              }}
              className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none py-2 pl-9 pr-3 text-slate-200 text-xs cursor-pointer"
            >
              <optgroup label="Montréal - Logistique & Classiques" className="text-indigo-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Montreal' && l.category !== 'hotspot' && !['vieux_port', 'notre_dame', 'mont_royal', 'oratoire', 'banquise', 'schwartzs', 'stereobar', 'mtelus', 'newcitygas'].includes(l.id)).map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Montréal - Sorties Cultes & Tourisme" className="text-pink-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Montreal' && l.category !== 'hotspot' && ['vieux_port', 'notre_dame', 'mont_royal', 'oratoire', 'banquise', 'schwartzs', 'stereobar', 'mtelus', 'newcitygas'].includes(l.id)).map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="✨ Cultural & Tourist Hotspots" className="text-amber-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.category === 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Québec - Tourisme" className="text-orange-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Quebec' && l.category !== 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Toronto - Tourisme" className="text-emerald-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Toronto' && l.category !== 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="New York - Tourisme" className="text-blue-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'New York' && l.category !== 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Destination Selector */}
        <div className="space-y-1.5 font-mono text-xs md:col-span-1">
          <label className="text-slate-400 font-semibold block text-[10px] uppercase">POINT B (CIBLE STRATÉGIQUE) :</label>
          <div className="relative">
            <Navigation className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400" />
            <select
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                if (e.target.value === origin) {
                  setOrigin(LOCATIONS.find(l => l.id !== e.target.value)?.id || 'yul');
                }
              }}
              className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none py-2 pl-9 pr-3 text-slate-200 text-xs cursor-pointer"
            >
              <optgroup label="Montréal - Logistique & Classiques" className="text-indigo-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Montreal' && l.category !== 'hotspot' && !['vieux_port', 'notre_dame', 'mont_royal', 'oratoire', 'banquise', 'schwartzs', 'stereobar', 'mtelus', 'newcitygas'].includes(l.id)).map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Montréal - Sorties Cultes & Tourisme" className="text-pink-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Montreal' && l.category !== 'hotspot' && ['vieux_port', 'notre_dame', 'mont_royal', 'oratoire', 'banquise', 'schwartzs', 'stereobar', 'mtelus', 'newcitygas'].includes(l.id)).map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="✨ Cultural & Tourist Hotspots" className="text-amber-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.category === 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Québec - Tourisme" className="text-orange-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Quebec' && l.category !== 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Toronto - Tourisme" className="text-emerald-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'Toronto' && l.category !== 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
              <optgroup label="New York - Tourisme" className="text-blue-400 bg-slate-950 font-bold">
                {LOCATIONS.filter(l => l.city === 'New York' && l.category !== 'hotspot').map(loc => (
                  <option key={loc.id} value={loc.id} className="text-slate-200 font-sans font-normal">{loc.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Heure de Départ */}
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-semibold block text-[10px] uppercase">HEURE DE DÉPART :</label>
            <button
              type="button"
              onClick={() => {
                const realTime = getEstTimeHHMM();
                setDepartureTime(realTime);
                setIsLiveAutoUpdate(true);
              }}
              className="text-[9px] text-yellow-500 hover:text-yellow-400 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Synchroniser avec l'heure de l'Est actuelle"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>TEMPS RÉEL ({getEstTimeHHMM()})</span>
            </button>
          </div>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400" />
            <input
              type="time"
              value={departureTime}
              onChange={(e) => {
                setDepartureTime(e.target.value);
                // Si l'utilisateur change l'heure à la main, on désactive la mise à jour continue pour ne pas écraser son choix
                setIsLiveAutoUpdate(false);
              }}
              className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none py-2 pl-9 pr-3 text-slate-200 text-xs cursor-pointer"
            />
          </div>
        </div>

        {/* Heure d'Arrivée Souhaitée */}
        <div className="space-y-1.5 font-mono text-xs">
          <label className="text-slate-400 font-semibold block text-[10px] uppercase">HEURE D'ARRIVÉE SOUHAITÉE :</label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-emerald-400" />
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => {
                setArrivalTime(e.target.value);
              }}
              className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none py-2 pl-9 pr-3 text-slate-200 text-xs cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Real-time Departure Point Calibration (Protocol DRIFT-V2) */}
      <div className="bg-slate-950/40 p-4 rounded-xl border border-indigo-950/60 font-mono text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-950/60 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400 animate-spin-slow" />
            <div>
              <span className="text-indigo-400 font-bold block uppercase tracking-wider text-[10.5px]">CALIBRATEUR POINT DE DÉPART (DRIFT-V2)</span>
              <span className="text-[9px] text-slate-500 font-sans">Ajustez la position physique brute de votre point d'origine (2200 Rue des Carrières)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isGpsActive ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold animate-pulse">
                GPS ACTIF • DRIFT CORRIGÉ
              </span>
            ) : isManualActive ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-bold">
                MANUEL ACTIF • DRIFT CORRIGÉ
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                COORDONNÉES PAR DÉFAUT
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Method 1: Geolocation */}
          <div 
            onClick={() => {
              setRecalculating(true);
              if (gpsLatitude === null) {
                requestGPSLocation(true);
              } else {
                setIsGpsActive(true);
                setIsManualActive(false);
              }
              setLastRecalculateTime(new Date());
              setRecalculateReason("SYNCHRONISATION GÉOLOCALISATION : Alignement physique forcé avec le capteur GPS réel pour supprimer l'écart de départ.");
              setTimeout(() => {
                setRecalculating(false);
              }, 800);
            }}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              isGpsActive 
                ? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                : 'border-slate-900 bg-slate-950/20 hover:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[10px] uppercase text-indigo-400">Option A : Géolocalisation Réelle GPS</span>
              <input 
                type="radio" 
                name="calibration-method"
                checked={isGpsActive}
                onChange={() => {}} // handled by parent div click
                className="accent-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400 mb-3 font-sans leading-relaxed">
              Interroge le capteur GPS réel pour calibrer précisément votre départ. Parfait pour éliminer l'écart géolocalisé.
            </p>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setRecalculating(true);
                  requestGPSLocation(true);
                  setLastRecalculateTime(new Date());
                  setRecalculateReason("SYNCHRONISATION GÉOLOCALISATION : Alignement physique forcé avec le capteur GPS réel pour supprimer l'écart de départ.");
                  setTimeout(() => {
                    setRecalculating(false);
                  }, 800);
                }}
                disabled={isGpsLoading}
                className="px-3 py-1.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-200 border border-indigo-800/50 hover:border-indigo-700 transition-all font-bold text-[10px] cursor-pointer flex items-center gap-1"
              >
                {isGpsLoading ? "Synchronisation..." : "Forcer Synchro & Calculer"}
              </button>
              {gpsLatitude !== null && (
                <div className="text-[9px] text-slate-300 font-mono">
                  {gpsLatitude.toFixed(5)}, {gpsLongitude?.toFixed(5)}
                </div>
              )}
            </div>
            {gpsError && (
              <div className="text-[9px] text-red-400 font-sans mt-2" onClick={(e) => e.stopPropagation()}>
                ⚠️ {gpsError}
              </div>
            )}
          </div>

          {/* Method 2: Manual Coords */}
          <div 
            onClick={() => {
              setIsManualActive(true);
              setIsGpsActive(false);
            }}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              isManualActive 
                ? 'border-amber-500 bg-amber-950/10 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                : 'border-slate-900 bg-slate-950/20 hover:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[10px] uppercase text-amber-400">Option B : Saisie Manuelle de Précision</span>
              <input 
                type="radio" 
                name="calibration-method"
                checked={isManualActive}
                onChange={() => {}} // handled by parent div click
                className="accent-amber-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400 mb-2 font-sans leading-relaxed">
              Saisissez manuellement des coordonnées géographiques précises pour repositionner votre Point A.
            </p>
            <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className="text-[8px] text-slate-500 uppercase block mb-0.5">Latitude :</label>
                <input 
                  type="text"
                  value={manualLatitude}
                  onChange={(e) => {
                    setManualLatitude(e.target.value);
                    setIsManualActive(true);
                    setIsGpsActive(false);
                  }}
                  placeholder="45.5348"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-[10px] font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[8px] text-slate-500 uppercase block mb-0.5">Longitude :</label>
                <input 
                  type="text"
                  value={manualLongitude}
                  onChange={(e) => {
                    setManualLongitude(e.target.value);
                    setIsManualActive(true);
                    setIsGpsActive(false);
                  }}
                  placeholder="-73.5852"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-[10px] font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transport Mode Selector */}
      <div 
        className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs animate-fade-in" 
        id="itinerary-modes-control-panel"
      >
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-indigo-400" />
          <div>
            <span className="text-indigo-400 font-bold block uppercase tracking-wider text-[10.5px]">MODES DE TRANSPORT AUTORISÉS :</span>
            <span className="text-[9.5px] text-slate-500 font-sans">Activez/Désactivez les modes pour affiner la feuille de route en temps réel</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer select-none group text-slate-300 hover:text-slate-100 transition-colors" id="mode-bus-checkbox-label">
            <input
              type="checkbox"
              checked={allowedModes.bus}
              onChange={(e) => setAllowedModes({ ...allowedModes, bus: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4 transition-all hover:border-indigo-500"
            />
            <span className="text-[11px] font-semibold tracking-wide">🚍 Bus STM</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer select-none group text-slate-300 hover:text-slate-100 transition-colors" id="mode-metro-checkbox-label">
            <input
              type="checkbox"
              checked={allowedModes.metro}
              onChange={(e) => setAllowedModes({ ...allowedModes, metro: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4 transition-all hover:border-indigo-500"
            />
            <span className="text-[11px] font-semibold tracking-wide">🚇 Métro</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer select-none group text-slate-300 hover:text-slate-100 transition-colors" id="mode-walk-checkbox-label">
            <input
              type="checkbox"
              checked={allowedModes.walk}
              onChange={(e) => setAllowedModes({ ...allowedModes, walk: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4 transition-all hover:border-indigo-500"
            />
            <span className="text-[11px] font-semibold tracking-wide">🚶 Marche à pied</span>
          </label>
        </div>
      </div>

      {/* Historical Peak Presets & Assessment */}
      <div className="p-4 rounded-xl border border-slate-850 bg-slate-950/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
            SÉLECTEURS DE TEMPS PRÉDÉFINIS & FILTRES DE TRAFIC HISTORIQUES (ToT Filter) :
          </span>
          <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900">
            Filtre l'Arbre de Pensées
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 animate-fade-in">
          {[
            { label: '🌅 Pointe Matin', time: '08:00', desc: '07h30 - 09h30', originId: 'carrieres', destId: 'labatt', isWkndPreset: false, date: dynamicWeekday },
            { label: '☀️ Heures Creuses', time: '11:00', desc: '09h30 - 15h30', originId: 'carrieres', destId: 'labatt', isWkndPreset: false, date: dynamicWeekday },
            { label: '🌆 Pointe Soir', time: '17:15', desc: '15h30 - 19h00', originId: 'carrieres', destId: 'labatt', isWkndPreset: false, date: dynamicWeekday },
            { label: '🌃 Heures de Nuit', time: '02:30', desc: '22h00 - 05h00', originId: 'carrieres', destId: 'labatt', isWkndPreset: false, date: dynamicWeekday },
            { 
              label: '🏠 Aller Véronique (Semaine)', 
              time: '18:30', 
              desc: '18h30 Carrières ➔ Lachine', 
              isWkndPreset: false, 
              originId: 'carrieres', 
              destId: 'veronique', 
              date: dynamicWeekday 
            },
            { 
              label: '🚗 Retour Véronique (Semaine)', 
              time: '22:30', 
              desc: '22h30 Lachine ➔ Carrières', 
              isWkndPreset: false, 
              originId: 'veronique', 
              destId: 'carrieres', 
              date: dynamicWeekday 
            },
            { 
              label: '💼 Samedi/Dimanche 5h15', 
              time: '05:15', 
              desc: '5h15 Carrières ➔ 7h00 Labatt', 
              isWkndPreset: true, 
              originId: 'carrieres', 
              destId: 'labatt', 
              date: dynamicSaturday 
            },
            { 
              label: '💼 Dimanche Matin (Labatt)', 
              time: '09:15', 
              desc: '9h15 Carrières ➔ 11h00 Labatt', 
              isWkndPreset: true, 
              originId: 'carrieres', 
              destId: 'labatt', 
              date: dynamicSunday 
            },
            { 
              label: '🌙 Retour Samedi/Dimanche 23h', 
              time: '23:00', 
              desc: '23h00 Labatt ➔ 23h50 Carrières', 
              isWkndPreset: true, 
              originId: 'labatt', 
              destId: 'carrieres', 
              date: dynamicSaturday 
            }
          ].filter(preset => preset.isWkndPreset === isWeekend(selectedDate))
          .map(preset => {
            const isSelected = departureTime === preset.time && 
                               origin === preset.originId && 
                               destination === preset.destId && 
                               (preset.isWkndPreset ? isWeekend(selectedDate) : !isWeekend(selectedDate));
            return (
              <button
                type="button"
                key={preset.label}
                onClick={() => {
                  setDepartureTime(preset.time);
                  setOrigin(preset.originId);
                  setDestination(preset.destId);
                  setSelectedDate(preset.date);
                  if (preset.isWkndPreset) {
                    setArrivalTime(preset.time === '05:15' ? '07:00' : (preset.time === '23:00' ? '23:50' : '11:00'));
                  } else {
                    if (preset.destId === 'veronique') {
                      setArrivalTime('19:30');
                    } else if (preset.originId === 'veronique') {
                      setArrivalTime('23:30');
                    }
                  }
                }}
                className={`p-2.5 rounded-lg border text-left transition-all duration-200 ${
                  isSelected 
                    ? 'bg-indigo-950 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.15)]' 
                    : 'bg-slate-950/80 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-[11px] font-bold font-sans">{preset.label}</div>
                <div className="text-[9px] font-mono opacity-80 mt-0.5">{preset.time} ({preset.desc})</div>
              </button>
            );
          })}
        </div>

        {/* Temporal Assessment Info Box */}
        {(() => {
          const period = getHistoricalPeriodDetails(departureTime, isWeekend(selectedDate));
          let bannerColor = 'border-emerald-900/40 bg-emerald-950/10 text-emerald-400';
          if (period.peakType === 'AM_PEAK' || period.peakType === 'PM_PEAK') {
            bannerColor = 'border-red-950/40 bg-red-950/10 text-red-400';
          } else if (period.peakType === 'NIGHT') {
            bannerColor = 'border-sky-950/40 bg-sky-950/10 text-sky-400';
          } else if (period.peakType === 'WEEKEND_EARLY') {
            bannerColor = 'border-indigo-950/40 bg-indigo-950/10 text-indigo-400';
          }
          return (
            <div className={`p-3 rounded-lg border font-mono text-[10.5px] leading-relaxed space-y-1 ${bannerColor}`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Activity className="w-4.5 h-4.5 animate-pulse" />
                <span>FILTRE ToT ACTIF : {period.label}</span>
              </div>
              <p className="text-slate-300 font-sans text-xs">
                {period.desc} 
                {period.riskAdd > 0 ? (
                  <span> • Impact d'Arbre de Pensées (ToT) : <strong className="text-red-400">+{period.riskAdd}% de congestion</strong> injectée sur l'axe terrestre STM/Réseau. Les temps de parcours sont ajustés à la hausse.</span>
                ) : period.peakType === 'WEEKEND_EARLY' ? (
                  <span> • Impact d'Arbre de Pensées (ToT) : <strong className="text-indigo-400">Transit optimal de week-end (-10% de risque)</strong>. Le corridor routier et le métro sont extrêmement fluides tôt le matin de week-end.</span>
                ) : period.peakType === 'NIGHT' ? (
                  <span> • Impact d'Arbre de Pensées (ToT) : <strong className="text-sky-400">Maintenance active (-20% de congestion)</strong>. L'axe routier est dégagé mais l'offre de bus/métro de secours peut être ralentie.</span>
                ) : (
                  <span> • Impact d'Arbre de Pensées (ToT) : <strong className="text-emerald-400">Trafic nominal fluide</strong>. Marge de sécurité idéale et absence de pic de congestion historique.</span>
                )}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Time Margin Alert */}
      {(() => {
        const diff = getMinutesDifference(departureTime, arrivalTime);
        const reqDuration = selectedRoute.totalDurationMin;
        const margin = diff - reqDuration;
        
        if (margin < 0) {
          return (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-red-400 font-mono text-[10.5px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
              <span>
                <strong>ALERTE HORAIRE :</strong> Durée configurée ({diff} min) insuffisante pour cet itinéraire ({reqDuration} min requis). Arrivée estimée : <strong>{addMinutesToTime(departureTime, reqDuration)}</strong>.
              </span>
            </div>
          );
        } else {
          return (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-emerald-400 font-mono text-[10.5px] flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>HORAIRE NOMINAL :</strong> Transit faisable sous {reqDuration} min. Heure d'arrivée nominale : <strong>{addMinutesToTime(departureTime, reqDuration)}</strong> (Marge de sécurité : {margin} min).
              </span>
            </div>
          );
        }
      })()}

      {/* Recalcul automatique de secours alert */}
      {autoBackupRecalc && activeAlertsOnInitialRoute.length > 0 && safestAlternative && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-amber-950/30 border-2 border-amber-600/70 rounded-xl text-amber-300 font-mono text-xs space-y-3 relative overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.15)] text-left"
        >
          {/* Pulsing glow background element */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl animate-pulse" />
          
          <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
            <Zap className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
            <span>⚡ CONTOURNEMENT DE CRISE ACTIVÉ : ALERTE INTERCEPTÉE SUR L'AXE SÉLECTIONNÉ</span>
          </div>
          
          <p className="text-[11px] leading-relaxed text-slate-300">
            Une alerte de niveau <strong className="text-red-400 uppercase">{activeAlertsOnInitialRoute[0].severity}</strong> a été interceptée sur le parcours initial pour le secteur <strong className="text-white">{activeAlertsOnInitialRoute[0].type}</strong>.
            <br />
            <span className="text-amber-400 font-semibold">Incident :</span> "{activeAlertsOnInitialRoute[0].title}" — <span className="italic">{activeAlertsOnInitialRoute[0].value}</span>.
          </p>
          
          <div className="p-2.5 bg-slate-950/95 border border-amber-900/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Trajet de déviation suggéré :</span>
              <strong className="text-white font-sans text-xs">{safestAlternative.name}</strong>
              <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                Fiabilité : <span className="text-emerald-400 font-bold">{safestAlternative.safetyScore}%</span> (contre {selectedRoute.safetyScore}% sur l'axe compromis) • Durée : {safestAlternative.totalDurationMin} min
              </div>
            </div>
            <button
              onClick={() => {
                setActiveRouteId(safestAlternative.id);
                setRecalculateReason(`Déviation d'urgence appliquée vers ${safestAlternative.name} suite à alerte sectorielle.`);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] uppercase rounded border border-amber-400 shadow-md transition-all shrink-0 hover:scale-[1.02] cursor-pointer"
            >
              Basculer sur l'axe de rechange
            </button>
          </div>
        </motion.div>
      )}

      {/* Real-time Recalculation Alert */}
      <AnimatePresence>
        {recalculateReason && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-lg flex items-start gap-2 text-xs"
          >
            <Activity className="w-4 h-4 text-indigo-400 mt-0.5 animate-pulse shrink-0" />
            <div className="font-mono text-[10.5px]">
              <span className="text-indigo-300 font-bold">MOTEUR ToT SYNC : </span>
              <span className="text-slate-300">{recalculateReason}</span>
              <span className="text-slate-500 block text-[9px] mt-1 font-mono uppercase">
                CHEMINS COGNITIFS RECALCULÉS À {lastRecalculateTime.toLocaleTimeString('fr-CA', { hour12: false })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentRoutes.map(route => {
          const isActive = route.id === activeRouteId;
          
          let scoreColor = 'text-emerald-400';
          let scoreBg = 'bg-emerald-950/50 border-emerald-800/40';
          if (route.safetyScore < 75) {
            scoreColor = 'text-yellow-400';
            scoreBg = 'bg-yellow-950/50 border-yellow-800/40';
          }
          if (route.safetyScore < 50) {
            scoreColor = 'text-red-400';
            scoreBg = 'bg-red-950/50 border-red-800/40';
          }

          return (
            <div
              key={route.id}
              onClick={() => setActiveRouteId(route.id)}
              className={`p-4 rounded-xl border bg-slate-950/80 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                isActive 
                  ? 'border-indigo-500 bg-slate-950 shadow-[0_0_15px_rgba(99,102,241,0.12)]' 
                  : 'border-slate-850 hover:border-slate-700'
              }`}
              id={`route-card-${route.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                    route.type === 'tot_optimal' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                    route.type === 'high_speed' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                    'bg-slate-900 text-slate-300 border border-slate-700'
                  }`}>
                    {route.type === 'tot_optimal' ? 'ToT Élite' : route.type === 'high_speed' ? 'Vitesse' : 'Anti-Crise'}
                  </span>
                  
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${scoreBg} ${scoreColor}`}>
                    Fiabilité : {route.safetyScore}%
                  </span>
                </div>

                <h3 className="font-display font-semibold text-xs text-slate-100 mb-1">
                  {route.name}
                </h3>
                
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  {route.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-900 mt-2">
                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Durée estimée :</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {route.totalDurationMin} minutes
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lionel-Groulx Connection Decision Hub (Highly specific user constraint) */}
      {origin === 'carrieres' && destination === 'labatt' && (
        <div className="p-4 rounded-xl border border-indigo-900/40 bg-slate-950/80 space-y-3" id="lionel-groulx-aiguillage-hub">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-2 gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
              <h3 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wide">
                AIGUILLAGE DÉCISIONNEL MÉTRO LIONEL-GROULX
              </h3>
            </div>
            <span className="text-[9px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded uppercase self-start sm:self-auto">
              Triangulation Bus & Métro STM
            </span>
          </div>
          
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Analyse comparative en temps réel de votre transit de Lionel-Groulx vers le <strong className="text-slate-300">50 Avenue Labatt</strong>. Itinéraires adaptés exclusivement pour le métro, le bus, et la marche.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Option A: Via Jolicoeur & Bus 112 */}
            <div className={`p-3 rounded-lg border transition-all ${
              fastestBusOption === '112' 
                ? 'border-emerald-500/60 bg-emerald-950/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
                : 'border-slate-850 bg-slate-950/40 opacity-70 hover:opacity-100'
            }`}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-xs font-sans font-bold text-slate-200">
                  Option A : Via Ligne Verte ➔ Jolicoeur & Bus 112
                </span>
                {fastestBusOption === '112' ? (
                  <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded-full animate-pulse font-bold whitespace-nowrap">
                    ★ MEILLEURE DISPOSITION
                  </span>
                ) : (
                  <span className="text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    DISPOSITION SATISFAISANTE
                  </span>
                )}
              </div>
              <ul className="space-y-1 text-[10px] text-slate-400 font-mono">
                <li>• Métro : Ligne Verte (Lionel-Groulx ➔ Jolicoeur) : <strong className="text-slate-300">8 min</strong></li>
                <li>• Attente estimée Bus 112 : <strong className="text-amber-400">{wait112} min</strong></li>
                <li>• Transit Bus 112 Ouest : <strong className="text-slate-300">{transit112} min</strong></li>
                <li className="pt-1.5 border-t border-slate-900 mt-1.5 flex justify-between">
                  <span>Temps total de Lionel-Groulx :</span>
                  <strong className={fastestBusOption === '112' ? "text-emerald-400 font-bold" : "text-slate-200"}>
                    {total112} minutes
                  </strong>
                </li>
              </ul>
            </div>

            {/* Option B: Via Angrignon & Bus 106 / 113 */}
            <div className={`p-3 rounded-lg border transition-all ${
              fastestBusOption !== '112' 
                ? 'border-emerald-500/60 bg-emerald-950/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
                : 'border-slate-850 bg-slate-950/40 opacity-70 hover:opacity-100'
            }`}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-xs font-sans font-bold text-slate-200">
                  Option B : Via Ligne Verte ➔ Angrignon & Bus 106 / 113
                </span>
                {fastestBusOption !== '112' ? (
                  <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded-full animate-pulse font-bold whitespace-nowrap">
                    ★ MEILLEURE DISPOSITION
                  </span>
                ) : (
                  <span className="text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    DISPOSITION SATISFAISANTE
                  </span>
                )}
              </div>
              <ul className="space-y-1 text-[10px] text-slate-400 font-mono">
                <li>• Métro : Ligne Verte (Lionel-Groulx ➔ Angrignon) : <strong className="text-slate-300">11 min</strong></li>
                <li>
                  • Bus 106 (Fréquent) : Attente <strong className="text-amber-400">{wait106} min</strong> | Transit <strong className="text-slate-300">{transit106} min</strong>
                </li>
                <li>
                  • Bus 113 (Secours) : Attente <strong className="text-amber-400">{wait113} min</strong> | Transit <strong className="text-slate-300">{transit113} min</strong>
                </li>
                <li className="pt-1.5 border-t border-slate-900 mt-1.5 flex justify-between">
                  <span>Temps total via Bus 106 :</span>
                  <strong className={fastestBusOption === '106' ? "text-emerald-400 font-bold" : "text-slate-200"}>
                    {total106} minutes
                  </strong>
                </li>
                <li className="flex justify-between">
                  <span>Temps total via Bus 113 :</span>
                  <strong className={fastestBusOption === '113' ? "text-emerald-400 font-bold" : "text-slate-200"}>
                    {total113} minutes
                  </strong>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-2.5 bg-indigo-950/30 border border-indigo-900/40 rounded text-[10px] font-mono text-indigo-300 flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>RECOMMANDATION MOTEUR ARGUS :</strong> Vous devez continuer en métro via la Ligne Verte jusqu'à{" "}
              {fastestBusOption === '112' ? (
                <span>
                  <strong>Jolicoeur</strong> car la ligne de <strong>Bus 112</strong> offre actuellement la meilleure disposition pour arriver plus vite au 50 Avenue Labatt.
                </span>
              ) : (
                <span>
                  <strong>Angrignon</strong> et prendre le <strong>Bus {fastestBusOption}</strong> car sa fréquence et sa fluidité de passage sont à leur meilleur.
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Interactive D3 Real-Time Route Map with Overlay Alerts */}
      <D3TransitMap 
        origin={origin} 
        destination={destination} 
        selectedRoute={selectedRoute} 
        feeds={feeds} 
        calibratedOriginLat={origin === 'carrieres' ? (isGpsActive ? (gpsLatitude || undefined) : isManualActive ? (parseFloat(manualLatitude) || undefined) : undefined) : undefined}
        calibratedOriginLng={origin === 'carrieres' ? (isGpsActive ? (gpsLongitude || undefined) : isManualActive ? (parseFloat(manualLongitude) || undefined) : undefined) : undefined}
      />

      {/* Selected Route Step-by-Step Timeline */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all hover:border-slate-700/60" id="selected-route-step-by-step-timeline">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-900 pb-3">
          <div className="space-y-1">
            <h3 className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
              <Shuffle className="w-4 h-4 text-indigo-400" />
              <span>Feuille de Route Détaillée pour Michael (Point A ➔ Point B)</span>
            </h3>
            <p className="text-[9px] text-slate-400 font-mono">
              {selectedRoute.steps.length} étapes de transit • Profil : {selectedRoute.name}
            </p>
          </div>
          
          {/* Action export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToJSON}
              className="px-2.5 py-1.5 bg-indigo-950/80 border border-indigo-800 hover:border-indigo-600 rounded text-[10px] font-mono text-indigo-300 transition-colors flex items-center gap-1.5 shadow-[0_0_8px_rgba(99,102,241,0.1)]"
              title="Générer un fichier JSON contenant l'itinéraire optimal actuel et les points de blocage détectés"
              id="export-report-json-button"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORTER RAPPORT</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-mono text-slate-300 transition-colors flex items-center gap-1.5"
              title="Exporter l'itinéraire complet au format CSV"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>EXPORT CSV</span>
            </button>
          </div>
        </div>

        {/* Visual Timeline Nodes */}
        <div className="relative pl-6 space-y-5 border-l-2 border-slate-800/80 ml-2">
          {selectedRoute.steps.map((step, idx) => {
            const isLast = idx === selectedRoute.steps.length - 1;
            
            // Highlight color based on sector danger level
            let badgeBg = 'bg-slate-900 border-slate-800 text-slate-300';
            if (step.sector !== 'ROUTE' && step.sector !== 'CCTV') {
              const secFluid = metrics[step.sector]?.fluidity;
              if (secFluid < 75) {
                badgeBg = 'bg-yellow-950 text-yellow-400 border border-yellow-800/50';
              }
              if (secFluid < 50) {
                badgeBg = 'bg-red-950 text-red-400 border border-red-800/50 animate-pulse';
              }
            }

            return (
              <div key={idx} className="relative">
                {/* Visual node circle */}
                <div className={`absolute -left-[32px] top-0.5 w-3.5 h-3.5 rounded-full border-2 bg-slate-950 ${
                  isLast ? 'border-emerald-500' : 'border-indigo-500'
                }`} />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getSectorIcon(step.sector)}
                      <span className="text-xs font-sans font-semibold text-slate-200">
                        {step.instruction}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-900 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
                    {step.durationMin} min
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety Warning Indicator for the selected route */}
        {selectedRoute.safetyScore < 70 && (
          <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="font-mono text-[10.5px] text-red-300">
              <strong>ATTENTION OPÉRATEUR : </strong> 
              <span>Cet itinéraire traverse des secteurs de transit lourd avec une fluidité dégradée ({100 - selectedRoute.safetyScore}% de risque). Suivez scrupuleusement les directives du protocol D.U.R.</span>
            </div>
          </div>
        )}
        
        {selectedRoute.safetyScore >= 70 && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-start gap-2 text-xs">
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="font-mono text-[10.5px] text-emerald-300">
              <strong>AXE DE CONFIANCE SÉCURISÉ : </strong> 
              <span>Cet itinéraire respecte les seuils de fluidité opérationnelle et garantit un transit sans perturbation majeure pour Michael.</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
