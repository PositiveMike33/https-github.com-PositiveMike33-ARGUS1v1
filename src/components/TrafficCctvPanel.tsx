/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interactive Traffic CCTV Camera Panel for Argus Engine
 * Author: AI Coding Agent
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  MapPin, 
  Search, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Maximize2,
  Cpu,
  Car,
  Compass,
  Gauge,
  Sliders,
  Sparkles,
  Layers
} from 'lucide-react';

interface CctvCamera {
  id: string;
  name: string;
  highway: string;
  sector: string;
  lat: number;
  lng: number;
  status: 'nominal' | 'heavy' | 'incident' | 'offline';
  speed: number; // km/h
  count: number; // vehicles detected per minute
  lastUpdated: string;
}

// Actual working Quebec 511 coordinates and Camera IDs in Montreal
const CAMERAS_DATABASE: CctvCamera[] = [
  {
    id: "6001",
    name: "Pont Champlain - Vue vers l'Île de Montréal (A-10 / A-15)",
    highway: "A-15",
    sector: "Sud / Brossard",
    lat: 45.4745,
    lng: -73.5350,
    status: "nominal",
    speed: 78,
    count: 45,
    lastUpdated: "En direct"
  },
  {
    id: "1001",
    name: "Échangeur Turcot - A-20 Ouest / A-15 Nord",
    highway: "A-20 / A-15",
    sector: "Centre-Ouest / Sud-Ouest",
    lat: 45.4678,
    lng: -73.6012,
    status: "heavy",
    speed: 34,
    count: 72,
    lastUpdated: "En direct"
  },
  {
    id: "3015",
    name: "Autoroute 40 - Boul. Saint-Laurent / Secteur Métropolitain",
    highway: "A-40",
    sector: "Nord / Villeray",
    lat: 45.5410,
    lng: -73.6402,
    status: "incident",
    speed: 12,
    count: 88,
    lastUpdated: "En direct"
  },
  {
    id: "3061",
    name: "Autoroute Décarie (A-15) - Côte-Saint-Luc",
    highway: "A-15",
    sector: "Ouest / Notre-Dame-de-Grâce",
    lat: 45.4850,
    lng: -73.6335,
    status: "heavy",
    speed: 22,
    count: 65,
    lastUpdated: "En direct"
  },
  {
    id: "3050",
    name: "Pont Jacques-Cartier - Sortie Centre-Ville / R-134",
    highway: "R-134",
    sector: "Est / Longueuil",
    lat: 45.5222,
    lng: -73.5410,
    status: "nominal",
    speed: 65,
    count: 32,
    lastUpdated: "En direct"
  },
  {
    id: "3110",
    name: "Pont-tunnel Louis-Hippolyte-La Fontaine (A-25)",
    highway: "A-25",
    sector: "Est / Boucherville",
    lat: 45.5840,
    lng: -73.4980,
    status: "offline",
    speed: 0,
    count: 0,
    lastUpdated: "Hors ligne - Maintenance"
  },
  {
    id: "3022",
    name: "Échangeur Anjou - A-40 / A-25",
    highway: "A-40",
    sector: "Est / Anjou",
    lat: 45.5945,
    lng: -73.5650,
    status: "nominal",
    speed: 82,
    count: 28,
    lastUpdated: "En direct"
  },
  {
    id: "3004",
    name: "Autoroute 40 Ouest - Échangeur A-13 (Saint-Laurent)",
    highway: "A-40",
    sector: "Ouest / Saint-Laurent",
    lat: 45.4980,
    lng: -73.7485,
    status: "nominal",
    speed: 95,
    count: 18,
    lastUpdated: "En direct"
  },
  {
    id: "2042",
    name: "Autoroute 15 Nord - Boul. de la Concorde",
    highway: "A-15",
    sector: "Nord / Laval",
    lat: 45.5580,
    lng: -73.7290,
    status: "nominal",
    speed: 88,
    count: 30,
    lastUpdated: "En direct"
  },
  {
    id: "3070",
    name: "Boul. René-Lévesque / Boul. Saint-Laurent",
    highway: "Réseau Local",
    sector: "Centre-Ville / Quartier Chinois",
    lat: 45.5085,
    lng: -73.5615,
    status: "heavy",
    speed: 18,
    count: 40,
    lastUpdated: "En direct"
  }
];

interface TrafficCctvPanelProps {
  onInjectFeedAlert?: (alert: {
    title: string;
    details: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'CCTV' | 'STM';
  }) => void;
}

export const TrafficCctvPanel: React.FC<TrafficCctvPanelProps> = ({ onInjectFeedAlert }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  
  const [selectedCamera, setSelectedCamera] = useState<CctvCamera>(CAMERAS_DATABASE[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highwayFilter, setHighwayFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeTheme, setActiveTheme] = useState<'dark' | 'voyager'>('dark');
  const [aiOverlay, setAiOverlay] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Simulated traffic updates
  const [speeds, setSpeeds] = useState<{ [key: string]: number }>({});
  const [counts, setCounts] = useState<{ [key: string]: number }>({});

  // Auto refresh live CCTV snapshots from Quebec 511
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      forceRefreshImage();
    }, 15000); // Snapshots on server update around every 15-30s
    return () => clearInterval(interval);
  }, [autoRefresh, selectedCamera]);

  // Traffic AI fluctuation simulation
  useEffect(() => {
    const timer = setInterval(() => {
      // Small fluctuation
      setSpeeds(prev => {
        const updated = { ...prev };
        CAMERAS_DATABASE.forEach(cam => {
          if (cam.status === 'offline') {
            updated[cam.id] = 0;
            return;
          }
          const baseSpeed = cam.speed;
          const fluctuation = Math.floor((Math.random() - 0.5) * 8);
          updated[cam.id] = Math.max(5, Math.min(120, baseSpeed + fluctuation));
        });
        return updated;
      });

      setCounts(prev => {
        const updated = { ...prev };
        CAMERAS_DATABASE.forEach(cam => {
          if (cam.status === 'offline') {
            updated[cam.id] = 0;
            return;
          }
          const baseCount = cam.count;
          const fluctuation = Math.floor((Math.random() - 0.5) * 6);
          updated[cam.id] = Math.max(2, Math.min(150, baseCount + fluctuation));
        });
        return updated;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center map on Montreal (slightly offset to accommodate cameras)
    const map = L.map(mapContainerRef.current, {
      center: [45.5188, -73.5740],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;

    // Scale overlay
    L.control.scale({ position: 'bottomright' }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Map Tile Layer with Active Theme
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing tile layers
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = activeTheme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);
  }, [activeTheme]);

  // Sync Camera Markers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    CAMERAS_DATABASE.forEach(cam => {
      // Determine color based on status
      let pulseColor = 'bg-emerald-500 shadow-emerald-500/50';
      if (cam.status === 'heavy') pulseColor = 'bg-amber-500 shadow-amber-500/50';
      if (cam.status === 'incident') pulseColor = 'bg-red-500 shadow-red-500/50';
      if (cam.status === 'offline') pulseColor = 'bg-slate-600 shadow-slate-600/50';

      const isSelected = selectedCamera.id === cam.id;
      const ringPulse = isSelected ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-slate-950 scale-125 z-[1000]' : 'hover:scale-110';

      const customIcon = L.divIcon({
        className: 'cctv-camera-map-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer transition-all ${ringPulse}">
            <div class="absolute w-6 h-6 rounded-full ${pulseColor} opacity-20 animate-ping"></div>
            <div class="relative w-3.5 h-3.5 ${pulseColor} rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold shadow-lg">
              ${isSelected ? '★' : ''}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([cam.lat, cam.lng], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedCamera(cam);
        });

      // Bind simple tooltip
      marker.bindTooltip(
        `<div class="font-mono text-[9px] font-bold uppercase text-slate-100">${cam.highway} • ${cam.name.split(' - ')[0]}</div>`,
        { direction: 'top', className: 'bg-slate-950 text-slate-200 border border-slate-900 rounded px-1.5 font-mono' }
      );

      markersRef.current[cam.id] = marker;
    });
  }, [selectedCamera]);

  // Center map on selected camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCamera) return;
    map.setView([selectedCamera.lat, selectedCamera.lng], 13, {
      animate: true,
      duration: 0.8
    });
  }, [selectedCamera]);

  const forceRefreshImage = () => {
    setIsRefreshing(true);
    setRefreshKey(Date.now());
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Filter cameras
  const filteredCameras = CAMERAS_DATABASE.filter(cam => {
    const matchesSearch = cam.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cam.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cam.highway.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesHighway = highwayFilter === 'ALL' || cam.highway === highwayFilter;
    const matchesStatus = statusFilter === 'ALL' || cam.status === statusFilter;

    return matchesSearch && matchesHighway && matchesStatus;
  });

  // Unique highways for filtering list
  const uniqueHighways = Array.from(new Set(CAMERAS_DATABASE.map(c => c.highway)));

  // Trigger high latency / accident injection into Argus Engine parent
  const handleInjectHazard = () => {
    if (!onInjectFeedAlert || !selectedCamera) return;

    let alertTitle = `⚠️ CCTV INDENT : Congestion critique sur ${selectedCamera.highway}`;
    let alertDetails = `Le système de vision artificielle d'Argus Engine signale une baisse de vitesse critique (${speeds[selectedCamera.id] || selectedCamera.speed} km/h) à l'emplacement ${selectedCamera.name}. Flux visuel CCTV ${selectedCamera.id} corroboré.`;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

    if (selectedCamera.status === 'incident') {
      alertTitle = `🚨 ACCIDENT CCTV : Collision routière détectée sur ${selectedCamera.highway}`;
      alertDetails = `Intrusion de voie de circulation majeure détectée par caméra thermique ${selectedCamera.id} sur la zone ${selectedCamera.name}. Déviation recommandée via les axes secondaires STM.`;
      severity = 'critical';
    }

    onInjectFeedAlert({
      title: alertTitle,
      details: alertDetails,
      severity,
      type: 'CCTV'
    });

    alert("Alerte de trafic injectée avec succès dans l'arbre décisionnel (ToT) d'Argus Engine ! Le système va immédiatement recalculer le graphe de transit.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="interactive-cctv-cameras-panel">
      
      {/* SIDEBAR: Search and List (Grid 4) */}
      <div className="lg:col-span-4 flex flex-col space-y-4 text-left">
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider font-mono uppercase flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Filtres Caméras CCTV
            </h3>
            <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{filteredCameras.length} TROUVÉES</span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher une autoroute, pont, secteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-900 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-300 font-sans focus:outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Highway selector */}
            <div className="space-y-1">
              <label className="text-[8px] font-mono font-bold text-slate-500 uppercase">Autoroutes</label>
              <select
                value={highwayFilter}
                onChange={(e) => setHighwayFilter(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-900 text-slate-300 rounded px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">TOUTES</option>
                {uniqueHighways.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Status selector */}
            <div className="space-y-1">
              <label className="text-[8px] font-mono font-bold text-slate-500 uppercase">Statut Routier</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-900 text-slate-300 rounded px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">TOUS</option>
                <option value="nominal">Nominal</option>
                <option value="heavy">Ralentissement</option>
                <option value="incident">Accident/Incident</option>
                <option value="offline">Hors-ligne</option>
              </select>
            </div>
          </div>
        </div>

        {/* Camera Scrollable List */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-900 overflow-hidden flex-1 flex flex-col h-[340px] lg:h-[420px]">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-900 flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold text-slate-400">FLUX ACTIFS QUEBEC 511</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-[8px] font-bold text-emerald-400">LIVE SYNC</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-950 p-2 space-y-1.5">
            {filteredCameras.map((cam) => {
              const isSelected = selectedCamera.id === cam.id;
              
              // Status Styling
              let statusLabel = 'Nominal';
              let statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
              if (cam.status === 'heavy') {
                statusLabel = 'Ralenti';
                statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
              } else if (cam.status === 'incident') {
                statusLabel = 'Incident';
                statusClass = 'text-red-400 bg-red-500/10 border-red-500/20';
              } else if (cam.status === 'offline') {
                statusLabel = 'Offline';
                statusClass = 'text-slate-500 bg-slate-800 border-slate-700';
              }

              return (
                <button
                  key={cam.id}
                  onClick={() => setSelectedCamera(cam)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/80 text-white shadow-md'
                      : 'bg-slate-950/40 border-slate-900/60 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 truncate">
                    <span className={`p-1.5 rounded ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'} transition-colors mt-0.5`}>
                      <Video className="w-3.5 h-3.5" />
                    </span>
                    <div className="truncate font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">{cam.highway}</span>
                        <span className="text-[8px] font-mono text-slate-500">• ID: {cam.id}</span>
                      </div>
                      <p className="text-[11px] font-semibold truncate leading-tight mt-0.5">{cam.name.split(' - ')[0]}</p>
                      <p className="text-[9px] text-slate-500 font-mono leading-none mt-1 uppercase">{cam.sector}</p>
                    </div>
                  </div>

                  <span className={`px-1.5 py-0.5 rounded border font-mono text-[8px] font-bold shrink-0 ${statusClass}`}>
                    {statusLabel}
                  </span>
                </button>
              );
            })}

            {filteredCameras.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <Video className="w-8 h-8 text-slate-700 animate-pulse mb-2" />
                <p className="text-xs font-mono">Aucun flux de caméra ne correspond à vos critères.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAP & CCTV FEED VIEWER (Grid 8) */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        
        {/* UPPER PART: Leaflet Map */}
        <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-900 overflow-hidden h-[260px] lg:h-[300px] flex flex-col relative">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-900 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400 animate-bounce" />
              <span className="font-mono text-[9px] font-bold text-slate-200 uppercase">Repérage des caméras CCTV sur la carte de Montréal</span>
            </div>
            
            {/* Map theme controls */}
            <div className="flex items-center gap-1 font-mono text-[8px] font-bold">
              <button 
                onClick={() => setActiveTheme('dark')}
                className={`px-2 py-0.5 rounded ${activeTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                CARTE SOMBRE
              </button>
              <button 
                onClick={() => setActiveTheme('voyager')}
                className={`px-2 py-0.5 rounded ${activeTheme === 'voyager' ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                CARTE CLAIRE
              </button>
            </div>
          </div>

          <div ref={mapContainerRef} className="flex-1 w-full h-full z-0 bg-slate-950" />
        </div>

        {/* LOWER PART: Active Camera Feed Frame */}
        {selectedCamera && (
          <div className="bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-900 overflow-hidden grid grid-cols-1 md:grid-cols-12">
            
            {/* Left side: Actual image stream from Quebec 511 */}
            <div className="md:col-span-7 bg-black flex flex-col relative group h-[280px] md:h-auto">
              
              <div className="absolute top-3 left-3 px-2 py-1 rounded bg-slate-950/80 backdrop-blur-md border border-slate-900 text-left font-mono text-[9px] font-bold text-white uppercase z-10 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedCamera.status === 'offline' ? 'bg-slate-500' : 'bg-emerald-400 animate-pulse'}`} />
                <span>SNAP SHOT EN DIRECT</span>
              </div>

              {selectedCamera.status !== 'offline' ? (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-950">
                  <img
                    src={`https://www.quebec511.info/map/gmap/camera.ashx?id=${selectedCamera.id}&t=${refreshKey}`}
                    alt={selectedCamera.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-[1.01]"
                    onLoad={() => setIsRefreshing(false)}
                  />
                  
                  {/* Computer Vision AI Overlay Box */}
                  <AnimatePresence>
                    {aiOverlay && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none border border-indigo-500/30 font-mono text-[8px] text-indigo-400 flex flex-col justify-between p-3.5"
                      >
                        {/* Camera details and coordinates bounding box */}
                        <div className="flex justify-between items-start">
                          <div className="border-l-2 border-t-2 border-indigo-400 p-1 bg-slate-950/60 backdrop-blur-sm max-w-[150px]">
                            <p className="font-bold">ARGUS CV-MODEL v3.2</p>
                            <p className="text-slate-400 text-[7px] mt-0.5">CAMERA_STATION: {selectedCamera.id}</p>
                            <p className="text-slate-400 text-[7px]">GPS: {selectedCamera.lat.toFixed(4)}, {selectedCamera.lng.toFixed(4)}</p>
                          </div>
                          
                          <div className="border-r-2 border-t-2 border-indigo-400 p-1 bg-slate-950/60 backdrop-blur-sm">
                            <p className="font-bold text-emerald-400">FPS: 15 (STATIC SNAP)</p>
                            <p className="text-slate-400 text-[7px] mt-0.5">EST. LATENCY: 220ms</p>
                          </div>
                        </div>

                        {/* Artificial Bounding boxes on screen to show AI computer vision targeting cars! */}
                        <div className="absolute top-[40%] left-[30%] w-10 h-6 border border-emerald-400 bg-emerald-400/10 flex items-center justify-center text-[7px] font-bold text-emerald-400">
                          CAR_DET [94%]
                        </div>
                        <div className="absolute top-[55%] left-[50%] w-8 h-5 border border-emerald-400 bg-emerald-400/10 flex items-center justify-center text-[7px] font-bold text-emerald-400">
                          CAR_DET [89%]
                        </div>
                        <div className="absolute top-[65%] left-[20%] w-12 h-8 border border-emerald-400 bg-emerald-400/10 flex items-center justify-center text-[7px] font-bold text-emerald-400">
                          BUS_DET [98%]
                        </div>

                        {/* Bottom stats boxes */}
                        <div className="flex justify-between items-end">
                          <div className="border-l-2 border-b-2 border-indigo-400 p-1.5 bg-slate-950/70 backdrop-blur-sm">
                            <p className="font-bold text-slate-100 flex items-center gap-1">
                              <Car className="w-3 h-3 text-indigo-400" />
                              DÉBIT : {counts[selectedCamera.id] !== undefined ? counts[selectedCamera.id] : selectedCamera.count} vh/min
                            </p>
                          </div>
                          <div className="border-r-2 border-b-2 border-indigo-400 p-1.5 bg-slate-950/70 backdrop-blur-sm">
                            <p className="font-bold text-slate-100 flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-indigo-400" />
                              VITESSE : {speeds[selectedCamera.id] !== undefined ? speeds[selectedCamera.id] : selectedCamera.speed} km/h
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-500">
                  <WifiOff className="w-10 h-10 text-slate-800 mb-2 animate-pulse" />
                  <p className="text-xs font-mono font-bold text-slate-400 uppercase">FLUX CCTV HORS LIGNE</p>
                  <p className="text-[10px] text-slate-600 font-sans mt-1">Maintenance programmée par le MTMD sur ce capteur routier.</p>
                </div>
              )}
            </div>

            {/* Right side: CCTV stats, Vision model controls, Inject alerts */}
            <div className="md:col-span-5 p-5 flex flex-col justify-between text-left border-t md:border-t-0 md:border-l border-slate-900">
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[8px] font-bold uppercase">
                      Vision d'Infrastructure MTMD
                    </span>
                    <span className="text-[8.5px] font-mono text-slate-500 font-bold uppercase">Secteur {selectedCamera.highway}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 font-display leading-tight mt-1.5">{selectedCamera.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">{selectedCamera.sector}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 bg-slate-950/80 border border-slate-900 rounded-lg">
                    <p className="text-[8px] font-mono font-bold text-slate-500 uppercase">Vitesse Moyenne</p>
                    <p className="text-lg font-bold text-slate-100 mt-0.5 font-mono">
                      {speeds[selectedCamera.id] !== undefined ? speeds[selectedCamera.id] : selectedCamera.speed}
                      <span className="text-[10px] font-normal text-slate-500 font-sans ml-1">km/h</span>
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950/80 border border-slate-900 rounded-lg">
                    <p className="text-[8px] font-mono font-bold text-slate-500 uppercase">Véhicules Détectés</p>
                    <p className="text-lg font-bold text-slate-100 mt-0.5 font-mono">
                      {counts[selectedCamera.id] !== undefined ? counts[selectedCamera.id] : selectedCamera.count}
                      <span className="text-[10px] font-normal text-slate-500 font-sans ml-1">/min</span>
                    </p>
                  </div>
                </div>

                {/* Camera controls */}
                <div className="space-y-2 border-t border-slate-900/80 pt-3 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      Overlay Vision Artificielle
                    </span>
                    <button
                      onClick={() => setAiOverlay(!aiOverlay)}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        aiOverlay 
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/30' 
                          : 'bg-slate-900 text-slate-500 border border-slate-900 hover:text-slate-400'
                      }`}
                    >
                      {aiOverlay ? "ACTIF" : "INACTIF"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                      Auto-Rafraîchissement (15s)
                    </span>
                    <button
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        autoRefresh 
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' 
                          : 'bg-slate-900 text-slate-500 border border-slate-900'
                      }`}
                    >
                      {autoRefresh ? "ACTIF" : "INACTIF"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Force snapshot manual, Inject incident */}
              <div className="space-y-2 border-t border-slate-900/80 pt-4 mt-4">
                <button
                  onClick={forceRefreshImage}
                  disabled={isRefreshing || selectedCamera.status === 'offline'}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>Rafraîchir Instantanément</span>
                </button>

                {onInjectFeedAlert && selectedCamera.status !== 'offline' && (
                  <button
                    onClick={handleInjectHazard}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Calculer Transit via ToT</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
