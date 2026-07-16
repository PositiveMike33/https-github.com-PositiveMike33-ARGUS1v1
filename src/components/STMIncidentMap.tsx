/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FeedItem } from '../types';
import { Shield, MapPin, ZoomIn, ZoomOut, Compass, Plane, Ship, Bus, Layers, Radio, Anchor, Info, RefreshCw, ChevronDown, ChevronUp, Crosshair } from 'lucide-react';

interface STMIncidentMapProps {
  feeds: FeedItem[];
  selectedFeed: FeedItem | null;
  onSelectFeed?: (feed: FeedItem | null) => void;
}

interface IncidentLocation {
  id: string;
  title: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lat: number;
  lng: number;
  stationName: string;
}

// Map key stations or features in Montreal to coordinates
const resolveIncidentCoordinates = (item: FeedItem): IncidentLocation => {
  const text = (item.title + ' ' + item.details).toLowerCase();
  
  let lat = 45.5088;
  let lng = -73.5540;
  let stationName = 'Réseau STM';

  if (text.includes('berri') || text.includes('uqam')) {
    lat = 45.5155;
    lng = -73.5606;
    stationName = 'Station Berri-UQAM';
  } else if (text.includes('saint-laurent') || text.includes('st-laurent')) {
    lat = 45.5124;
    lng = -73.5700;
    stationName = 'Boulevard Saint-Laurent';
  } else if (text.includes('jolicoeur')) {
    lat = 45.4568;
    lng = -73.5822;
    stationName = 'Station Jolicoeur';
  } else if (text.includes('rosemont')) {
    lat = 45.5313;
    lng = -73.5976;
    stationName = 'Station Rosemont';
  } else if (text.includes('snowdon')) {
    lat = 45.4855;
    lng = -73.6277;
    stationName = 'Station Snowdon';
  } else if (text.includes('saint-michel')) {
    lat = 45.5597;
    lng = -73.5997;
    stationName = 'Station Saint-Michel';
  } else if (text.includes('longueuil')) {
    lat = 45.5250;
    lng = -73.5218;
    stationName = 'Station Longueuil-Université-de-Sherbrooke';
  } else if (text.includes('747') || text.includes('aéroport') || text.includes('dorval') || text.includes('yul')) {
    lat = 45.4700;
    lng = -73.7400;
    stationName = 'Aéroport international Montréal-Trudeau (CYUL)';
  } else if (text.includes('sherbrooke')) {
    lat = 45.5188;
    lng = -73.5682;
    stationName = 'Rue Sherbrooke / St-Laurent';
  } else if (text.includes('papineau') || text.includes('rené-lévesque')) {
    lat = 45.5204;
    lng = -73.5518;
    stationName = 'Avenue Papineau / René-Lévesque';
  } else {
    // Generates slightly offset coordinates around Montreal to prevent overlapping markers
    const hash = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offsetLat = ((hash % 100) - 50) / 1500;
    const offsetLng = (((hash * 13) % 100) - 50) / 1500;
    lat = 45.5088 + offsetLat;
    lng = -73.5540 + offsetLng;
    
    if (text.includes('bus')) {
      stationName = 'Ligne de Bus locale';
    } else if (text.includes('ligne verte')) {
      stationName = 'Ligne Verte (Métro)';
    } else if (text.includes('ligne orange')) {
      stationName = 'Ligne Orange (Métro)';
    } else if (text.includes('ligne bleue')) {
      stationName = 'Ligne Bleue (Métro)';
    } else {
      stationName = 'Secteur Métropolitain';
    }
  }

  return {
    id: item.id,
    title: item.title,
    details: item.details,
    severity: item.severity,
    lat,
    lng,
    stationName
  };
};

// Complete coordinate data for Ligne Verte, Orange, Bleue, and Jaune
const METRO_LINES_DATA = {
  verte: {
    color: '#10b981',
    name: 'Ligne Verte',
    stations: [
      { name: 'Angrignon', lat: 45.4462, lng: -73.6037 },
      { name: 'Monk', lat: 45.4511, lng: -73.6143 },
      { name: 'Jolicoeur', lat: 45.4568, lng: -73.5822 },
      { name: 'Verdun', lat: 45.4593, lng: -73.5717 },
      { name: 'De l\'Église', lat: 45.4627, lng: -73.5668 },
      { name: 'Lasalle', lat: 45.4711, lng: -73.5662 },
      { name: 'Charlevoix', lat: 45.4783, lng: -73.5696 },
      { name: 'Lionel-Groulx', lat: 45.4830, lng: -73.5796 },
      { name: 'Atwater', lat: 45.4897, lng: -73.5842 },
      { name: 'Guy-Concordia', lat: 45.4952, lng: -73.5793 },
      { name: 'Peel', lat: 45.5009, lng: -73.5747 },
      { name: 'McGill', lat: 45.5041, lng: -73.5716 },
      { name: 'Place-des-Arts', lat: 45.5075, lng: -73.5685 },
      { name: 'Saint-Laurent', lat: 45.5124, lng: -73.5700 },
      { name: 'Berri-UQAM', lat: 45.5155, lng: -73.5606 },
      { name: 'Beaudry', lat: 45.5191, lng: -73.5568 },
      { name: 'Papineau', lat: 45.5204, lng: -73.5518 },
      { name: 'Frontenac', lat: 45.5273, lng: -73.5432 },
      { name: 'Préfontaine', lat: 45.5416, lng: -73.5544 },
      { name: 'Joliette', lat: 45.5468, lng: -73.5518 },
      { name: 'Pie-IX', lat: 45.5538, lng: -73.5516 },
      { name: 'Viau', lat: 45.5608, lng: -73.5467 },
      { name: 'Assomption', lat: 45.5693, lng: -73.5434 },
      { name: 'Cadillac', lat: 45.5768, lng: -73.5467 },
      { name: 'Langelier', lat: 45.5827, lng: -73.5432 },
      { name: 'Radisson', lat: 45.5888, lng: -73.5397 },
      { name: 'Honoré-Beaugrand', lat: 45.5962, lng: -73.5352 }
    ]
  },
  orange: {
    color: '#f97316',
    name: 'Ligne Orange',
    stations: [
      { name: 'Côte-Vertu', lat: 45.5141, lng: -73.6826 },
      { name: 'Du Collège', lat: 45.5093, lng: -73.6750 },
      { name: 'De la Savane', lat: 45.4991, lng: -73.6601 },
      { name: 'Namur', lat: 45.4947, lng: -73.6528 },
      { name: 'Plamondon', lat: 45.4952, lng: -73.6402 },
      { name: 'Côte-Sainte-Catherine', lat: 45.4925, lng: -73.6329 },
      { name: 'Snowdon', lat: 45.4855, lng: -73.6277 },
      { name: 'Villa-Maria', lat: 45.4793, lng: -73.6190 },
      { name: 'Vendôme', lat: 45.4741, lng: -73.6037 },
      { name: 'Place-Saint-Henri', lat: 45.4771, lng: -73.5855 },
      { name: 'Lionel-Groulx', lat: 45.4830, lng: -73.5796 },
      { name: 'Georges-Vanier', lat: 45.4867, lng: -73.5762 },
      { name: 'Lucien-L\'Allier', lat: 45.4947, lng: -73.5711 },
      { name: 'Bonaventure', lat: 45.4982, lng: -73.5672 },
      { name: 'Square-Victoria-OACI', lat: 45.5015, lng: -73.5630 },
      { name: 'Place-d\'Armes', lat: 45.5061, lng: -73.5591 },
      { name: 'Champ-de-Mars', lat: 45.5101, lng: -73.5562 },
      { name: 'Berri-UQAM', lat: 45.5155, lng: -73.5606 },
      { name: 'Sherbrooke', lat: 45.5188, lng: -73.5682 },
      { name: 'Mont-Royal', lat: 45.5244, lng: -73.5815 },
      { name: 'Laurier', lat: 45.5277, lng: -73.5888 },
      { name: 'Rosemont', lat: 45.5313, lng: -73.5976 },
      { name: 'Beaubien', lat: 45.5350, lng: -73.6041 },
      { name: 'Jean-Talon', lat: 45.5391, lng: -73.6130 },
      { name: 'Jarry', lat: 45.5430, lng: -73.6293 },
      { name: 'Crémazie', lat: 45.5463, lng: -73.6382 },
      { name: 'Sauvé', lat: 45.5510, lng: -73.6555 },
      { name: 'Henri-Bourassa', lat: 45.5555, lng: -73.6677 },
      { name: 'Cartier', lat: 45.5601, lng: -73.6821 },
      { name: 'De la Concorde', lat: 45.5605, lng: -73.7001 },
      { name: 'Montmorency', lat: 45.5583, lng: -73.7211 }
    ]
  },
  bleue: {
    color: '#3b82f6',
    name: 'Ligne Bleue',
    stations: [
      { name: 'Snowdon', lat: 45.4855, lng: -73.6277 },
      { name: 'Côte-des-Neiges', lat: 45.4962, lng: -73.6231 },
      { name: 'Université-de-Montréal', lat: 45.5030, lng: -73.6180 },
      { name: 'Édouard-Montpetit', lat: 45.5101, lng: -73.6130 },
      { name: 'Outremont', lat: 45.5201, lng: -73.6150 },
      { name: 'Acadie', lat: 45.5235, lng: -73.6242 },
      { name: 'Parc', lat: 45.5301, lng: -73.6241 },
      { name: 'De Castelnau', lat: 45.5352, lng: -73.6201 },
      { name: 'Jean-Talon', lat: 45.5391, lng: -73.6130 },
      { name: 'Fabre', lat: 45.5471, lng: -73.6072 },
      { name: 'D\'Iberville', lat: 45.5531, lng: -73.6021 },
      { name: 'Saint-Michel', lat: 45.5597, lng: -73.5997 }
    ]
  },
  jaune: {
    color: '#eab308',
    name: 'Ligne Jaune',
    stations: [
      { name: 'Berri-UQAM', lat: 45.5155, lng: -73.5606 },
      { name: 'Jean-Drapeau', lat: 45.5131, lng: -73.5332 },
      { name: 'Longueuil-Université-de-Sherbrooke', lat: 45.5250, lng: -73.5218 }
    ]
  }
};

// --- SIMULATION DATA STRUCTURES ---
interface SimRouteNode {
  lat: number;
  lng: number;
}

interface SimTrain {
  id: string;
  lineId: 'verte' | 'orange' | 'bleue' | 'jaune';
  name: string;
  stationIdx: number;
  dir: 1 | -1;
  progress: number; // 0.0 to 1.0 between stations
  speed: number;
  status: 'en_route' | 'a_la_station';
  waitTime: number;
}

interface SimBus {
  id: string;
  routeId: string;
  routeName: string;
  points: SimRouteNode[];
  currentIdx: number;
  dir: 1 | -1;
  progress: number;
  speed: number;
  occupancy: number;
  speedKmh: number;
}

interface SimFlight {
  id: string;
  callsign: string;
  points: SimRouteNode[];
  currentIdx: number;
  progress: number;
  speed: number;
  altitudeM: number;
  speedKmh: number;
  aircraft: string;
  heading: number;
}

interface SimShip {
  id: string;
  name: string;
  points: SimRouteNode[];
  currentIdx: number;
  progress: number;
  speedKnots: number;
  cargo: string;
  heading: number;
}

// St. Lawrence shipping lane coordinates
const MARITIME_ROUTE: SimRouteNode[] = [
  { lat: 45.4204, lng: -73.6102 }, // Lachine
  { lat: 45.4510, lng: -73.5700 }, // Verdun channel
  { lat: 45.4880, lng: -73.5310 }, // Port entrance south
  { lat: 45.5120, lng: -73.5300 }, // Île Sainte-Hélène channel
  { lat: 45.5310, lng: -73.5390 }, // Vieux-Port docks
  { lat: 45.5650, lng: -73.5020 }, // Port de Montréal central
  { lat: 45.6010, lng: -73.4880 }, // Pointe-aux-Trembles riverbed
];

// Bus 139 Pie-IX route
const BUS_139_ROUTE: SimRouteNode[] = [
  { lat: 45.5538, lng: -73.5516 },
  { lat: 45.5615, lng: -73.5590 },
  { lat: 45.5710, lng: -73.5680 },
  { lat: 45.5800, lng: -73.5780 },
  { lat: 45.5940, lng: -73.5930 },
  { lat: 45.6150, lng: -73.6140 }
];

// Bus 24 Sherbrooke route
const BUS_24_ROUTE: SimRouteNode[] = [
  { lat: 45.4815, lng: -73.5912 },
  { lat: 45.4940, lng: -73.5810 },
  { lat: 45.5012, lng: -73.5750 },
  { lat: 45.5110, lng: -73.5670 },
  { lat: 45.5210, lng: -73.5590 },
  { lat: 45.5295, lng: -73.5512 },
  { lat: 45.5410, lng: -73.5415 }
];

// Bus 80 Avenue du Parc route
const BUS_80_ROUTE: SimRouteNode[] = [
  { lat: 45.5022, lng: -73.5682 },
  { lat: 45.5115, lng: -73.5815 },
  { lat: 45.5202, lng: -73.5975 },
  { lat: 45.5290, lng: -73.6130 },
  { lat: 45.5348, lng: -73.6212 }
];

// Aviation Routes
const FLIGHT_YUL_ARR: SimRouteNode[] = [
  { lat: 45.6500, lng: -73.3500 },
  { lat: 45.5800, lng: -73.4800 },
  { lat: 45.5100, lng: -73.5900 },
  { lat: 45.4750, lng: -73.7200 },
  { lat: 45.4700, lng: -73.7400 }
];

const FLIGHT_YUL_DEP: SimRouteNode[] = [
  { lat: 45.4700, lng: -73.7400 },
  { lat: 45.4650, lng: -73.7150 },
  { lat: 45.4950, lng: -73.6200 },
  { lat: 45.5400, lng: -73.5100 },
  { lat: 45.6200, lng: -73.3000 }
];

const FLIGHT_OVERHEAD: SimRouteNode[] = [
  { lat: 45.3500, lng: -73.9000 },
  { lat: 45.4900, lng: -73.6000 },
  { lat: 45.6500, lng: -73.2800 }
];

// Haversine formula to compute distance in km between two coordinates
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function STMIncidentMap({ feeds, selectedFeed, onSelectFeed }: STMIncidentMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const metroLayerRef = useRef<L.FeatureGroup | null>(null);
  
  // Real-time overlay layers refs
  const trainsLayerRef = useRef<L.FeatureGroup | null>(null);
  const busesLayerRef = useRef<L.FeatureGroup | null>(null);
  const aviationLayerRef = useRef<L.FeatureGroup | null>(null);
  const maritimeLayerRef = useRef<L.FeatureGroup | null>(null);
  
  const [activeTab, setActiveTab] = useState<'carto' | 'dark' | 'satellite'>('dark');
  const [showVerte, setShowVerte] = useState<boolean>(true);
  const [showOrange, setShowOrange] = useState<boolean>(true);
  const [showBleue, setShowBleue] = useState<boolean>(true);
  const [showJaune, setShowJaune] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);

  // User Geolocation & Radar de proximité states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 45.5088, lng: -73.5540 }); // Fallback to Montreal center
  const [isRealGPS, setIsRealGPS] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showRadarWindow, setShowRadarWindow] = useState<boolean>(true);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const radarCircleRef = useRef<L.Circle | null>(null);

  // New layers toggle states
  const [showMetroTrains, setShowMetroTrains] = useState<boolean>(true);
  const [showBuses, setShowBuses] = useState<boolean>(true);
  const [showAviation, setShowAviation] = useState<boolean>(true);
  const [showMaritime, setShowMaritime] = useState<boolean>(true);

  // Simulation State Datasets
  const [trains, setTrains] = useState<SimTrain[]>([
    { id: 'T-V1', lineId: 'verte', name: 'Rame Verte 101', stationIdx: 2, dir: 1, progress: 0, speed: 0.12, status: 'en_route', waitTime: 0 },
    { id: 'T-V2', lineId: 'verte', name: 'Rame Verte 108', stationIdx: 18, dir: -1, progress: 0, speed: 0.15, status: 'en_route', waitTime: 0 },
    { id: 'T-O1', lineId: 'orange', name: 'Rame Orange 204', stationIdx: 4, dir: 1, progress: 0, speed: 0.1, status: 'en_route', waitTime: 0 },
    { id: 'T-O2', lineId: 'orange', name: 'Rame Orange 215', stationIdx: 22, dir: -1, progress: 0, speed: 0.11, status: 'en_route', waitTime: 0 },
    { id: 'T-B1', lineId: 'bleue', name: 'Rame Bleue 302', stationIdx: 1, dir: 1, progress: 0, speed: 0.14, status: 'en_route', waitTime: 0 },
    { id: 'T-B2', lineId: 'bleue', name: 'Rame Bleue 309', stationIdx: 8, dir: -1, progress: 0, speed: 0.13, status: 'en_route', waitTime: 0 },
    { id: 'T-J1', lineId: 'jaune', name: 'Rame Jaune 401', stationIdx: 0, dir: 1, progress: 0, speed: 0.18, status: 'en_route', waitTime: 0 },
  ]);

  const [buses, setBuses] = useState<SimBus[]>([
    { id: 'B-139A', routeId: '139', routeName: '139 Pie-IX Nord', points: BUS_139_ROUTE, currentIdx: 0, dir: 1, progress: 0, speed: 0.04, occupancy: 42, speedKmh: 35 },
    { id: 'B-139B', routeId: '139', routeName: '139 Pie-IX Sud', points: BUS_139_ROUTE, currentIdx: 4, dir: -1, progress: 0, speed: 0.05, occupancy: 78, speedKmh: 28 },
    { id: 'B-24A', routeId: '24', routeName: '24 Sherbrooke Est', points: BUS_24_ROUTE, currentIdx: 1, dir: 1, progress: 0, speed: 0.06, occupancy: 15, speedKmh: 42 },
    { id: 'B-24B', routeId: '24', routeName: '24 Sherbrooke Ouest', points: BUS_24_ROUTE, currentIdx: 5, dir: -1, progress: 0, speed: 0.04, occupancy: 56, speedKmh: 31 },
    { id: 'B-80A', routeId: '80', routeName: '80 du Parc Nord', points: BUS_80_ROUTE, currentIdx: 0, dir: 1, progress: 0, speed: 0.05, occupancy: 85, speedKmh: 22 },
  ]);

  const [aviation, setAviation] = useState<SimFlight[]>([
    { id: 'A-ACA124', callsign: 'ACA124', points: FLIGHT_YUL_ARR, currentIdx: 0, progress: 0, speed: 0.03, altitudeM: 3000, speedKmh: 480, aircraft: 'Boeing 787-9', heading: 245 },
    { id: 'A-AFR344', callsign: 'AFR344', points: FLIGHT_YUL_DEP, currentIdx: 0, progress: 0, speed: 0.04, altitudeM: 40, speedKmh: 250, aircraft: 'Airbus A350-900', heading: 60 },
    { id: 'A-WJA562', callsign: 'WJA562', points: FLIGHT_OVERHEAD, currentIdx: 0, progress: 0, speed: 0.02, altitudeM: 10800, speedKmh: 820, aircraft: 'Boeing 737 MAX 8', heading: 45 },
  ]);

  const [ships, setShips] = useState<SimShip[]>([
    { id: 'S-MTLEXP', name: 'MTL EXPRESS', points: MARITIME_ROUTE, currentIdx: 0, progress: 0, speedKnots: 11.4, cargo: 'Porte-conteneurs', heading: 55 },
    { id: 'S-LAUR', name: 'LAURENTIAN III', points: MARITIME_ROUTE, currentIdx: 4, progress: 0, speedKnots: 8.2, cargo: 'Vraquier (Grains)', heading: 235 },
  ]);

  // Filter only STM feeds
  const stmIncidents = feeds
    .filter(f => f.type === 'STM')
    .map(resolveIncidentCoordinates);

  // Run the Real-Time Geospatial Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Metro trains progression
      setTrains(prev => prev.map(train => {
        const lineData = METRO_LINES_DATA[train.lineId];
        const stations = lineData.stations;
        if (train.status === 'a_la_station') {
          if (train.waitTime > 1) {
            return { ...train, waitTime: train.waitTime - 1 };
          } else {
            return { ...train, status: 'en_route', waitTime: 0, progress: 0 };
          }
        } else {
          const nextProgress = train.progress + train.speed;
          if (nextProgress >= 1.0) {
            const nextIdx = train.stationIdx + train.dir;
            if (nextIdx + train.dir < 0 || nextIdx + train.dir >= stations.length) {
              return {
                ...train,
                stationIdx: nextIdx,
                dir: (train.dir === 1 ? -1 : 1) as 1 | -1,
                progress: 0,
                status: 'a_la_station',
                waitTime: 3
              };
            } else {
              return {
                ...train,
                stationIdx: nextIdx,
                progress: 0,
                status: 'a_la_station',
                waitTime: 2
              };
            }
          } else {
            return { ...train, progress: nextProgress };
          }
        }
      }));

      // 2. Bus positions update
      setBuses(prev => prev.map(bus => {
        const nextProgress = bus.progress + bus.speed;
        if (nextProgress >= 1.0) {
          const nextIdx = bus.currentIdx + bus.dir;
          if (nextIdx < 0 || nextIdx >= bus.points.length - 1) {
            return {
              ...bus,
              currentIdx: nextIdx < 0 ? 0 : bus.points.length - 2,
              dir: (bus.dir === 1 ? -1 : 1) as 1 | -1,
              progress: 0,
              speedKmh: Math.floor(25 + Math.random() * 20)
            };
          } else {
            return {
              ...bus,
              currentIdx: nextIdx,
              progress: 0,
              speedKmh: Math.floor(25 + Math.random() * 20)
            };
          }
        } else {
          return { ...bus, progress: nextProgress };
        }
      }));

      // 3. Flights navigation
      setAviation(prev => prev.map(flight => {
        const nextProgress = flight.progress + flight.speed;
        if (nextProgress >= 1.0) {
          const nextIdx = (flight.currentIdx + 1) % (flight.points.length - 1);
          let nextAlt = flight.altitudeM;
          if (flight.id.includes('ARR')) {
            nextAlt = Math.max(30, flight.altitudeM - 600);
          } else if (flight.id.includes('DEP')) {
            nextAlt = Math.min(11000, flight.altitudeM + 1200);
          }
          return {
            ...flight,
            currentIdx: nextIdx,
            progress: 0,
            altitudeM: nextAlt,
            speedKmh: Math.floor(400 + Math.random() * 100)
          };
        } else {
          return { ...flight, progress: nextProgress };
        }
      }));

      // 4. St. Lawrence cargo vessels
      setShips(prev => prev.map(ship => {
        const nextProgress = ship.progress + 0.05; // steady cruising speed
        if (nextProgress >= 1.0) {
          const nextIdx = (ship.currentIdx + 1) % (ship.points.length - 1);
          return {
            ...ship,
            currentIdx: nextIdx,
            progress: 0,
            speedKnots: parseFloat((8 + Math.random() * 5).toFixed(1))
          };
        } else {
          return { ...ship, progress: nextProgress };
        }
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Montreal coordinates [45.5017, -73.5673]
    const map = L.map(mapContainerRef.current, {
      center: [45.5088, -73.5540],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;

    // Create markers groups
    const markersLayer = L.featureGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    const metroLayer = L.featureGroup().addTo(map);
    metroLayerRef.current = metroLayer;

    // Add new real-time layers
    const trainsLayer = L.featureGroup().addTo(map);
    trainsLayerRef.current = trainsLayer;

    const busesLayer = L.featureGroup().addTo(map);
    busesLayerRef.current = busesLayer;

    const aviationLayer = L.featureGroup().addTo(map);
    aviationLayerRef.current = aviationLayer;

    const maritimeLayer = L.featureGroup().addTo(map);
    maritimeLayerRef.current = maritimeLayer;

    // Add Scale Control
    L.control.scale({ position: 'bottomright' }).addTo(map);

    // Register click event to move user radar center
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setUserLocation({ lat, lng });
      setIsRealGPS(false);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Try to quietly fetch real geolocation on mount (if permission was already granted)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsRealGPS(true);
        },
        () => {
          // Quietly ignore and stay with default Montreal center
        },
        { timeout: 3000 }
      );
    }
  }, []);

  // Render user location marker and 5km radar zone circle on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    // Clean up old marker and circle
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }
    if (radarCircleRef.current) {
      map.removeLayer(radarCircleRef.current);
    }

    // Custom user marker with cool pulsing radar ping styling
    const userIcon = L.divIcon({
      className: 'user-radar-center-marker',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full bg-indigo-500 opacity-20 animate-ping"></div>
          <div class="absolute w-5 h-5 rounded-full bg-indigo-500 opacity-40 animate-pulse"></div>
          <div class="relative w-3.5 h-3.5 bg-indigo-600 rounded-full border border-white shadow-lg"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(
        `
        <div class="p-2.5 bg-slate-950 text-slate-200 rounded border border-slate-800 font-sans text-xs max-w-[200px]">
          <h4 class="font-bold text-indigo-400">Position du Radar</h4>
          <p class="text-[10px] text-slate-400 font-mono mt-1">
            Lat : ${userLocation.lat.toFixed(4)}<br/>
            Lng : ${userLocation.lng.toFixed(4)}
          </p>
          <p class="text-[9px] text-slate-500 mt-1.5 leading-snug">Cliquez n'importe où sur la carte pour déplacer le centre du radar de proximité.</p>
        </div>
        `,
        { className: 'custom-dashboard-popup', closeButton: false }
      );
    userMarkerRef.current = marker;

    // Draw the 5km circle overlay
    const circle = L.circle([userLocation.lat, userLocation.lng], {
      radius: 5000, // 5000 meters = 5km
      color: '#6366f1', // indigo-500
      weight: 1.5,
      opacity: 0.4,
      fillColor: '#6366f1',
      fillOpacity: activeTab === 'dark' ? 0.04 : 0.02,
      dashArray: '5, 5',
    }).addTo(map);
    radarCircleRef.current = circle;

    return () => {
      if (userMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
      }
      if (radarCircleRef.current && mapRef.current) {
        mapRef.current.removeLayer(radarCircleRef.current);
      }
    };
  }, [userLocation, activeTab]);

  // Set Tile Layers based on Theme
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove any existing tile layers
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Tile URLs
    const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    let tileUrl = darkTileUrl;
    if (activeTab === 'carto') {
      tileUrl = lightTileUrl;
    } else if (activeTab === 'satellite') {
      tileUrl = satelliteTileUrl;
    }
    
    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: activeTab === 'satellite' 
        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
        : '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapRef.current);
  }, [activeTab]);

  // Update Metro Lines overlay
  useEffect(() => {
    const map = mapRef.current;
    const metroLayer = metroLayerRef.current;
    if (!map || !metroLayer) return;

    // Clear previous drawing
    metroLayer.clearLayers();

    // Map configuration
    const linesToDraw = [
      { id: 'verte', visible: showVerte, data: METRO_LINES_DATA.verte },
      { id: 'orange', visible: showOrange, data: METRO_LINES_DATA.orange },
      { id: 'bleue', visible: showBleue, data: METRO_LINES_DATA.bleue },
      { id: 'jaune', visible: showJaune, data: METRO_LINES_DATA.jaune },
    ];

    linesToDraw.forEach(({ visible, data }) => {
      if (!visible) return;

      const latlngs = data.stations.map(st => [st.lat, st.lng] as [number, number]);

      // Draw Polyline for the line
      const linePoly = L.polyline(latlngs, {
        color: data.color,
        weight: 3.5,
        opacity: activeTab === 'dark' ? 0.9 : 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(metroLayer);

      // Optionally add interactive tooltips or hover effects on the line itself
      linePoly.bindTooltip(data.name, { sticky: true, className: 'bg-slate-950 text-slate-100 border border-slate-800 font-mono text-[10px] rounded px-1.5' });

      // Draw individual Stations as circular markers if toggled
      if (showStations) {
        data.stations.forEach(station => {
          const stationMarker = L.circleMarker([station.lat, station.lng], {
            radius: 4,
            fillColor: data.color,
            color: '#0f172a',
            weight: 1.5,
            fillOpacity: 1,
          }).addTo(metroLayer);

          const popupContent = `
            <div class="p-2 bg-slate-950 text-slate-200 rounded border border-slate-800 font-sans text-xs max-w-[200px]">
              <div class="flex items-center gap-1 mb-1">
                <span class="w-2 h-2 rounded-full" style="background-color: ${data.color}"></span>
                <span class="font-bold text-[10px] font-mono text-slate-400 uppercase">${data.name}</span>
              </div>
              <h4 class="font-semibold text-slate-100 leading-tight">${station.name}</h4>
              <p class="text-[9px] text-slate-500 font-mono mt-1">Secteur STM Métro • Normal</p>
            </div>
          `;

          stationMarker.bindPopup(popupContent, {
            closeButton: false,
            className: 'custom-dashboard-popup'
          });

          // Show station name tooltip on hover
          stationMarker.bindTooltip(station.name, {
            direction: 'top',
            offset: [0, -4],
            className: 'bg-slate-950 text-slate-200 border-slate-800 font-mono text-[9px] px-1 py-0.5 rounded shadow-lg'
          });
        });
      }
    });

  }, [showVerte, showOrange, showBleue, showJaune, showStations, activeTab]);

  // Render Real-Time Metro Trains
  useEffect(() => {
    const map = mapRef.current;
    const layer = trainsLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!showMetroTrains) return;

    trains.forEach(train => {
      const lineData = METRO_LINES_DATA[train.lineId];
      const stations = lineData.stations;
      
      // Calculate interpolation coordinates
      let lat = 45.5088;
      let lng = -73.5540;
      let targetStationName = '';

      if (train.status === 'a_la_station') {
        const station = stations[train.stationIdx];
        if (station) {
          lat = station.lat;
          lng = station.lng;
          targetStationName = station.name;
        }
      } else {
        const stationA = stations[train.stationIdx];
        const nextIdx = train.stationIdx + train.dir;
        const stationB = stations[nextIdx] || stationA;
        if (stationA && stationB) {
          lat = stationA.lat + (stationB.lat - stationA.lat) * train.progress;
          lng = stationA.lng + (stationB.lng - stationA.lng) * train.progress;
          targetStationName = stationB.name;
        }
      }

      // Terminal Name
      const terminalName = train.lineId === 'verte' 
        ? (train.dir === 1 ? 'Honoré-Beaugrand' : 'Angrignon')
        : train.lineId === 'orange'
        ? (train.dir === 1 ? 'Montmorency' : 'Côte-Vertu')
        : train.lineId === 'bleue'
        ? (train.dir === 1 ? 'Saint-Michel' : 'Snowdon')
        : (train.dir === 1 ? 'Longueuil' : 'Berri-UQAM');

      const statusText = train.status === 'a_la_station' 
        ? `À quai à la station ${targetStationName}` 
        : `En transit vers ${targetStationName}`;

      const icon = L.divIcon({
        className: 'realtime-train-marker',
        html: `
          <div class="relative flex items-center justify-center w-7 h-7">
            <div class="absolute w-6 h-6 rounded-full opacity-40 animate-ping" style="background-color: ${lineData.color}"></div>
            <div class="relative w-4.5 h-4.5 bg-slate-950 rounded border-2 border-slate-100 flex items-center justify-center shadow-lg" style="box-shadow: 0 0 8px ${lineData.color}">
              <span class="text-[8px] font-black text-white font-mono">${train.lineId[0].toUpperCase()}</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([lat, lng], { icon });

      const popupContent = `
        <div class="p-3 bg-slate-950 text-slate-200 rounded border border-slate-800 font-sans max-w-[240px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${lineData.color}"></span>
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">${lineData.name}</span>
          </div>
          <h4 class="font-bold text-xs text-slate-100 mb-1 leading-tight">${train.name}</h4>
          <p class="text-[11px] text-slate-400 leading-normal mb-1.5">${statusText}</p>
          <div class="space-y-1 text-[9px] font-mono border-t border-slate-900 pt-1.5 text-slate-500">
            <div>Destination: <span class="text-indigo-400">${terminalName}</span></div>
            <div>Vitesse: <span class="text-indigo-400">55 km/h</span></div>
            <div>Statut: <span class="text-emerald-400">Télémétrie Active</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false, className: 'custom-dashboard-popup' });
      marker.addTo(layer);
    });

  }, [trains, showMetroTrains]);

  // Render Real-Time STM Buses
  useEffect(() => {
    const map = mapRef.current;
    const layer = busesLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!showBuses) return;

    buses.forEach(bus => {
      const currentIdx = bus.currentIdx;
      let nextIdx = currentIdx + bus.dir;
      if (nextIdx < 0) nextIdx = 0;
      if (nextIdx >= bus.points.length) nextIdx = bus.points.length - 1;
      const nodeA = bus.points[currentIdx];
      const nodeB = bus.points[nextIdx];

      if (!nodeA || !nodeB) return;

      const lat = nodeA.lat + (nodeB.lat - nodeA.lat) * bus.progress;
      const lng = nodeA.lng + (nodeB.lng - nodeA.lng) * bus.progress;

      const icon = L.divIcon({
        className: 'realtime-bus-marker',
        html: `
          <div class="relative flex items-center justify-center w-7 h-7">
            <div class="absolute w-5 h-5 bg-blue-600 rounded-full border border-slate-950 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.7)]">
              <span class="text-[8px] font-black text-white font-mono">${bus.routeId}</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([lat, lng], { icon });

      const popupContent = `
        <div class="p-3 bg-slate-950 text-slate-200 rounded border border-slate-800 font-sans max-w-[240px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold font-mono">STM BUS</span>
            <span class="text-xs text-slate-400 font-medium">Ligne ${bus.routeId}</span>
          </div>
          <h4 class="font-bold text-xs text-slate-100 mb-1 leading-tight">${bus.routeName}</h4>
          <div class="space-y-1 text-[9px] font-mono border-t border-slate-900 pt-1.5 text-slate-500">
            <div>Vitesse: <span class="text-indigo-400">${bus.speedKmh} km/h</span></div>
            <div>Taux d'occupation: <span class="text-indigo-400">${bus.occupancy}%</span></div>
            <div>Régulation: <span class="text-emerald-400">À l'heure</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false, className: 'custom-dashboard-popup' });
      marker.addTo(layer);
    });

  }, [buses, showBuses]);

  // Render Real-Time Aviation Flights
  useEffect(() => {
    const map = mapRef.current;
    const layer = aviationLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!showAviation) return;

    aviation.forEach(flight => {
      const currentIdx = flight.currentIdx;
      const nextIdx = (currentIdx + 1) % flight.points.length;
      const nodeA = flight.points[currentIdx];
      const nodeB = flight.points[nextIdx];

      if (!nodeA || !nodeB) return;

      const lat = nodeA.lat + (nodeB.lat - nodeA.lat) * flight.progress;
      const lng = nodeA.lng + (nodeB.lng - nodeA.lng) * flight.progress;

      // Custom Plane HTML marker rotated towards direction
      const icon = L.divIcon({
        className: 'realtime-flight-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8" style="transform: rotate(${flight.heading}deg)">
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon });

      const popupContent = `
        <div class="p-3 bg-slate-950 text-slate-200 rounded border border-slate-800 font-sans max-w-[240px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[9px] font-bold font-mono">YUL RADAR</span>
            <span class="text-xs text-slate-400 font-medium">Vol ${flight.callsign}</span>
          </div>
          <h4 class="font-bold text-xs text-slate-100 mb-1 leading-tight">${flight.aircraft}</h4>
          <div class="space-y-1 text-[9px] font-mono border-t border-slate-900 pt-1.5 text-slate-500">
            <div>Altitude: <span class="text-purple-300">${flight.altitudeM.toLocaleString()} m (${Math.round(flight.altitudeM * 3.28084).toLocaleString()} ft)</span></div>
            <div>Vitesse Sol: <span class="text-purple-300">${flight.speedKmh} km/h</span></div>
            <div>Cap: <span class="text-purple-300">${flight.heading}°</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false, className: 'custom-dashboard-popup' });
      marker.addTo(layer);
    });

  }, [aviation, showAviation]);

  // Render Real-Time Maritime Vessels
  useEffect(() => {
    const map = mapRef.current;
    const layer = maritimeLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!showMaritime) return;

    ships.forEach(ship => {
      const currentIdx = ship.currentIdx;
      const nextIdx = (currentIdx + 1) % ship.points.length;
      const nodeA = ship.points[currentIdx];
      const nodeB = ship.points[nextIdx];

      if (!nodeA || !nodeB) return;

      const lat = nodeA.lat + (nodeB.lat - nodeA.lat) * ship.progress;
      const lng = nodeA.lng + (nodeB.lng - nodeA.lng) * ship.progress;

      const icon = L.divIcon({
        className: 'realtime-ship-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8" style="transform: rotate(${ship.heading}deg)">
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]">
              <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.93 11l.49-3h15.16l.49 3H3.93zm17.6 2c-.14-.07-.3-.11-.47-.11H2.94c-.17 0-.33.04-.47.11L1 19h22l-1.47-6z"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon });

      const popupContent = `
        <div class="p-3 bg-slate-950 text-slate-200 rounded border border-slate-800 font-sans max-w-[240px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-[9px] font-bold font-mono">AIS MARITIME</span>
            <span class="text-xs text-slate-400 font-medium">AIS: ${ship.name}</span>
          </div>
          <h4 class="font-bold text-xs text-slate-100 mb-1 leading-tight">Cargaison: ${ship.cargo}</h4>
          <div class="space-y-1 text-[9px] font-mono border-t border-slate-900 pt-1.5 text-slate-500">
            <div>Vitesse: <span class="text-cyan-300">${ship.speedKnots} nœuds</span></div>
            <div>Voie de Transit: <span class="text-cyan-300">Chenal du Saint-Laurent</span></div>
            <div>Statut AIS: <span class="text-emerald-400">En route</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false, className: 'custom-dashboard-popup' });
      marker.addTo(layer);
    });

  }, [ships, showMaritime]);

  // Update Markers when stmIncidents changes
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear previous markers
    markersLayer.clearLayers();

    stmIncidents.forEach(incident => {
      // Create a gorgeous custom pulsing Tailwind marker based on severity
      const severityColor = 
        incident.severity === 'critical' ? 'rgb(239, 68, 68)' : // red
        incident.severity === 'high' ? 'rgb(249, 115, 22)' :    // orange
        incident.severity === 'medium' ? 'rgb(234, 179, 8)' :   // yellow
        'rgb(59, 130, 246)';                                    // blue

      const severityBg = 
        incident.severity === 'critical' ? 'bg-red-500' :
        incident.severity === 'high' ? 'bg-orange-500' :
        incident.severity === 'medium' ? 'bg-yellow-500' :
        'bg-blue-500';

      const severityBorder = 
        incident.severity === 'critical' ? 'bg-red-600' :
        incident.severity === 'high' ? 'bg-orange-600' :
        incident.severity === 'medium' ? 'bg-yellow-600' :
        'bg-blue-600';

      const customIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 group">
            <div class="absolute w-full h-full rounded-full opacity-40 animate-ping" style="background-color: ${severityColor}"></div>
            <div class="absolute w-6 h-6 rounded-full opacity-20" style="background-color: ${severityColor}"></div>
            <div class="relative w-4 h-4 ${severityBorder} border-2 border-slate-900 rounded-full shadow-lg flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([incident.lat, incident.lng], { icon: customIcon });

      // Build a beautiful dark dashboard style popup
      const popupContent = `
        <div class="p-3 bg-slate-950 text-slate-200 rounded border border-slate-800 font-sans max-w-[260px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              incident.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              incident.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
              incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }">${incident.severity}</span>
            <span class="text-xs text-slate-400 font-medium">${incident.stationName}</span>
          </div>
          <h4 class="font-semibold text-sm text-slate-100 mb-1 leading-tight">${incident.title}</h4>
          <p class="text-xs text-slate-400 leading-normal line-clamp-3">${incident.details}</p>
          <div class="mt-2 pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
            <span>Lat: ${incident.lat.toFixed(4)}</span>
            <span>Lon: ${incident.lng.toFixed(4)}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-dashboard-popup'
      });

      // Handle marker selection / click
      marker.on('click', () => {
        if (onSelectFeed) {
          const matchedItem = feeds.find(f => f.id === incident.id);
          if (matchedItem) onSelectFeed(matchedItem);
        }
      });

      marker.addTo(markersLayer);
    });

    // If there is any incident, fit map boundaries safely so all fit
    if (stmIncidents.length > 0 && !selectedFeed) {
      const bounds = markersLayer.getBounds();
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [feeds]);

  // Handle fly-to-location when selectedFeed changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFeed || selectedFeed.type !== 'STM') return;

    const loc = resolveIncidentCoordinates(selectedFeed);
    map.flyTo([loc.lat, loc.lng], 15, {
      animate: true,
      duration: 1.5
    });

    // Find and open popup of that specific incident
    const markersLayer = markersLayerRef.current;
    if (markersLayer) {
      markersLayer.eachLayer((layer: any) => {
        const latLng = layer.getLatLng();
        if (Math.abs(latLng.lat - loc.lat) < 0.0001 && Math.abs(latLng.lng - loc.lng) < 0.0001) {
          layer.openPopup();
        }
      });
    }
  }, [selectedFeed]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (map && markersLayer && stmIncidents.length > 0) {
      map.fitBounds(markersLayer.getBounds(), { padding: [40, 40] });
    } else if (map) {
      map.setView([45.5088, -73.5540], 12);
    }
  };

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });
        setIsRealGPS(true);
        setIsLocating(false);
        mapRef.current?.flyTo([lat, lng], 13);
      },
      (error) => {
        console.error("Error fetching location:", error);
        setIsLocating(false);
        setIsRealGPS(false);
        alert("Impossible de récupérer votre position réelle (accès refusé ou bloqué). Utilisation de la position simulée.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Compute nearby incidents within a 5km radius around user location
  const nearbyIncidents = stmIncidents
    .map((incident) => {
      const distance = getDistanceKm(userLocation.lat, userLocation.lng, incident.lat, incident.lng);
      return { ...incident, distance };
    })
    .filter((incident) => incident.distance <= 5)
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col shadow-xl">
      {/* Header bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-950 border border-indigo-800 rounded animate-pulse">
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-slate-200 font-display font-bold text-sm tracking-wide">CARTOGRAPHIE GEOSPATIALE INTERACTIVE — ARGUS PC</h3>
            <p className="text-[10px] text-slate-400 font-mono">RADAR MULTIMODAL EN TEMPS REEL — STM, SATELLITE, COULOIRS AERIENS & VOIE MARITIME</p>
          </div>
        </div>

        {/* Tile Provider Toggles */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 p-0.5 rounded flex text-[10px] font-mono">
            <button
              onClick={() => setActiveTab('satellite')}
              className={`px-2 py-1 rounded transition-all duration-150 flex items-center gap-1 ${activeTab === 'satellite' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <span>VUE SATELLITE</span>
            </button>
            <button
              onClick={() => setActiveTab('dark')}
              className={`px-2 py-1 rounded transition-all duration-150 ${activeTab === 'dark' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              SOMBRE
            </button>
            <button
              onClick={() => setActiveTab('carto')}
              className={`px-2 py-1 rounded transition-all duration-150 ${activeTab === 'carto' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              CLAIRE
            </button>
          </div>
        </div>
      </div>

      {/* Multimodal Layers Selector Dashboard */}
      <div className="bg-slate-950/90 backdrop-blur-sm px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 z-10 text-[10px] font-mono">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            Superpositions :
          </span>

          {/* Rames de Métro */}
          <label className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={showMetroTrains}
              onChange={(e) => setShowMetroTrains(e.target.checked)}
              className="accent-emerald-500 rounded border-slate-700 bg-slate-900"
            />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Métros actifs</span>
          </label>

          {/* Bus de la STM */}
          <label className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={showBuses}
              onChange={(e) => setShowBuses(e.target.checked)}
              className="accent-blue-500 rounded border-slate-700 bg-slate-900"
            />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Autobus (GPS)</span>
          </label>

          {/* Aviation */}
          <label className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={showAviation}
              onChange={(e) => setShowAviation(e.target.checked)}
              className="accent-purple-500 rounded border-slate-700 bg-slate-900"
            />
            <Plane className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-300 font-medium">Trafic Aérien</span>
          </label>

          {/* Maritime */}
          <label className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={showMaritime}
              onChange={(e) => setShowMaritime(e.target.checked)}
              className="accent-cyan-500 rounded border-slate-700 bg-slate-900"
            />
            <Anchor className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Maritime AIS</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend toggle */}
          <span className="text-slate-500">Mise à jour : 1.5s</span>
        </div>
      </div>

      {/* Filters Sub-header */}
      <div className="bg-slate-950/80 backdrop-blur-sm px-4 py-2 border-b border-slate-800 flex flex-wrap items-center gap-2.5 z-10 text-[10px] font-mono">
        <span className="text-slate-500 font-bold uppercase tracking-wider">Filtres Métro :</span>
        <div className="flex flex-wrap items-center gap-2">
          {/* Ligne Verte */}
          <label className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800/80 px-2 py-0.5 rounded cursor-pointer hover:border-slate-700 transition-colors text-slate-300">
            <input
              type="checkbox"
              checked={showVerte}
              onChange={(e) => setShowVerte(e.target.checked)}
              className="accent-emerald-500 rounded border-slate-700 bg-slate-900 w-3 h-3"
            />
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            <span>Verte</span>
          </label>
          
          {/* Ligne Orange */}
          <label className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800/80 px-2 py-0.5 rounded cursor-pointer hover:border-slate-700 transition-colors text-slate-300">
            <input
              type="checkbox"
              checked={showOrange}
              onChange={(e) => setShowOrange(e.target.checked)}
              className="accent-orange-500 rounded border-slate-700 bg-slate-900 w-3 h-3"
            />
            <span className="w-2 h-2 rounded-full bg-[#f97316]"></span>
            <span>Orange</span>
          </label>
          
          {/* Ligne Bleue */}
          <label className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800/80 px-2 py-0.5 rounded cursor-pointer hover:border-slate-700 transition-colors text-slate-300">
            <input
              type="checkbox"
              checked={showBleue}
              onChange={(e) => setShowBleue(e.target.checked)}
              className="accent-blue-500 rounded border-slate-700 bg-slate-900 w-3 h-3"
            />
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
            <span>Bleue</span>
          </label>
          
          {/* Ligne Jaune */}
          <label className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800/80 px-2 py-0.5 rounded cursor-pointer hover:border-slate-700 transition-colors text-slate-300">
            <input
              type="checkbox"
              checked={showJaune}
              onChange={(e) => setShowJaune(e.target.checked)}
              className="accent-yellow-500 rounded border-slate-700 bg-slate-900 w-3 h-3"
            />
            <span className="w-2 h-2 rounded-full bg-[#eab308]"></span>
            <span>Jaune</span>
          </label>

          {/* Stations Toggle */}
          <label className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-800/80 px-2 py-0.5 rounded cursor-pointer hover:border-slate-700 transition-colors text-slate-300">
            <input
              type="checkbox"
              checked={showStations}
              onChange={(e) => setShowStations(e.target.checked)}
              className="accent-slate-400 rounded border-slate-700 bg-slate-900 w-3 h-3"
            />
            <span>Gares</span>
          </label>
        </div>
      </div>

      {/* Map body wrapper */}
      <div className="relative flex-1 bg-slate-950" style={{ minHeight: '380px' }}>
        {/* Leaflet instance container */}
        <div id="stm-leaflet-map-element" ref={mapContainerRef} className="w-full h-full" style={{ outline: 'none' }} />

        {/* Floating Radar de proximité window */}
        <div 
          id="proximity-radar-panel"
          className={`absolute top-4 left-4 z-[400] max-w-[325px] w-80 bg-slate-950/95 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-md text-slate-200 flex flex-col font-sans overflow-hidden transition-all duration-300 ${
            showRadarWindow ? 'max-h-[360px]' : 'max-h-[38px] w-auto max-w-[240px]'
          }`}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 cursor-pointer select-none" 
            onClick={() => setShowRadarWindow(!showRadarWindow)}
          >
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="absolute w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
              </div>
              <span className="font-bold text-xs tracking-wide uppercase font-mono text-slate-100 flex items-center gap-1.5">
                Radar de proximité
                <span className="px-1.5 py-0.2 bg-indigo-900/60 border border-indigo-700/50 rounded-full text-[9px] font-mono text-indigo-300">
                  5 km
                </span>
              </span>
            </div>
            <button 
              className="text-slate-400 hover:text-slate-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowRadarWindow(!showRadarWindow);
              }}
            >
              {showRadarWindow ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expanded panel body */}
          {showRadarWindow && (
            <div className="p-3 flex flex-col flex-1 min-h-0 text-xs">
              {/* Coordinates details and action row */}
              <div className="flex items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/60 rounded p-2 mb-2.5 font-mono text-[10px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${isRealGPS ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                    <span>Mode : {isRealGPS ? 'GPS Réel' : 'Cible Manuelle'}</span>
                  </div>
                  <div className="text-slate-300">
                    Lat : <span className="text-indigo-400 font-bold">{userLocation.lat.toFixed(4)}</span>
                  </div>
                  <div className="text-slate-300">
                    Lng : <span className="text-indigo-400 font-bold">{userLocation.lng.toFixed(4)}</span>
                  </div>
                </div>

                <button
                  onClick={requestUserLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-600/25 border border-indigo-500/40 hover:bg-indigo-600/40 disabled:opacity-50 text-[9px] text-indigo-300 hover:text-indigo-200 font-bold rounded transition-colors"
                  title="Actualiser ma position réelle"
                >
                  <Crosshair className={`w-3 h-3 ${isLocating ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>{isLocating ? 'Détection...' : 'GPS'}</span>
                </button>
              </div>

              {/* Nearest incidents list header */}
              <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                <span>Incidents proches ({nearbyIncidents.length})</span>
                {nearbyIncidents.length > 0 && <span className="text-slate-500 text-[9px] lowercase font-normal">Triés par distance</span>}
              </div>

              {/* Scrollable list */}
              <div className="flex-1 max-h-[180px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                {nearbyIncidents.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 border border-dashed border-slate-800 rounded bg-slate-900/20">
                    <Info className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                    <p className="text-[10px] italic">Aucun incident STM détecté<br />dans un rayon de 5 km.</p>
                  </div>
                ) : (
                  nearbyIncidents.map((incident) => {
                    const severityColors = {
                      critical: 'bg-red-500/25 text-red-400 border-red-500/30',
                      high: 'bg-orange-500/25 text-orange-400 border-orange-500/30',
                      medium: 'bg-yellow-500/25 text-yellow-400 border-yellow-500/30',
                      low: 'bg-blue-500/25 text-blue-400 border-blue-500/30'
                    };
                    const colorClass = severityColors[incident.severity] || severityColors.low;

                    return (
                      <div
                        key={incident.id}
                        id={`radar-incident-${incident.id}`}
                        onClick={() => {
                          if (onSelectFeed) {
                            const matched = feeds.find(f => f.id === incident.id);
                            if (matched) onSelectFeed(matched);
                          }
                        }}
                        className={`group p-2 bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-800/60 rounded cursor-pointer transition-all flex flex-col gap-1 ${
                          selectedFeed?.id === incident.id ? 'ring-1 ring-indigo-500 border-indigo-500 bg-slate-900/80' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-semibold text-[10.5px] leading-tight text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {incident.stationName}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-indigo-400 shrink-0 bg-indigo-950/40 border border-indigo-900/30 px-1.5 py-0.2 rounded-full">
                            {incident.distance.toFixed(2)} km
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                          {incident.title}
                        </p>
                        <div className="flex items-center justify-between text-[9px] mt-0.5">
                          <span className={`px-1 py-0.2 border rounded text-[8px] uppercase font-mono font-bold tracking-wider ${colorClass}`}>
                            {incident.severity}
                          </span>
                          <span className="text-slate-500 group-hover:text-slate-400 font-mono flex items-center gap-0.5">
                            Localiser &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Info footer tips */}
              <div className="mt-2 pt-1.5 border-t border-slate-900 text-[9px] text-slate-500 italic text-center font-mono flex items-center justify-center gap-1 select-none">
                <span>💡</span>
                <span>Cliquez sur la carte pour déplacer le radar</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating map HUD overlay */}
        <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-1.5 bg-slate-950/90 backdrop-blur-sm border border-slate-800 rounded-md p-2 shadow-lg text-[10px] font-mono text-slate-400 max-w-[200px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span className="text-slate-200 font-bold">Légende Multimodale :</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-b border-slate-900 pb-1.5 mb-1.5 text-[9px]">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-slate-300">Incident</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-md bg-emerald-500"></span>
              <span className="text-slate-300">Métro Actif</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-slate-300">Autobus</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rotate-45 transform"></span>
              <span className="text-slate-300">Aéronef</span>
            </div>
            <div className="flex items-center gap-1 col-span-2">
              <span className="w-2.5 h-2 bg-cyan-500"></span>
              <span className="text-slate-300 text-[9px]">Cargo Maritime AIS</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Réseau souterrain :</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#10b981] rounded-full"></span>
              <span>Ligne Verte</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#f97316] rounded-full"></span>
              <span>Ligne Orange</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#3b82f6] rounded-full"></span>
              <span>Ligne Bleue</span>
            </div>
          </div>
        </div>

        {/* Map Control Buttons floating overlay */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-md"
            title="Zoom +"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-md"
            title="Zoom -"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            className="w-8 h-8 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-md"
            title="Recadrer la vue"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Styled inline leaf CSS fixes because React leaf bundles sometimes can miss classes */}
      <style>{`
        .leaflet-pane {
          z-index: 1 !important;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 2 !important;
        }
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip-container {
          display: none !important;
        }
        .custom-dashboard-popup .leaflet-popup-content {
          margin: 0 !important;
        }
      `}</style>
    </div>
  );
}
