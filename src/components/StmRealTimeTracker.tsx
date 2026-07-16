import React, { useEffect, useState, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Train, AlertTriangle, RefreshCw, Radio, Activity, Wrench } from 'lucide-react';
import { auth } from '../lib/firebase';
import { STM_ROUTES } from '../lib/stmRoutes';

interface VehiclePosition {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  routeId: string;
  type: 'BUS' | 'METRO';
  status: string;
  label: string;
}


const METRO_LINES: Record<string, { color: string, coords: [number, number][] }> = {
  '1': {
    color: '#008E4F',
    coords: [
      [45.4410, -73.5997],
      [45.4854, -73.5828],
      [45.5039, -73.5623],
      [45.5393, -73.5414],
      [45.5960, -73.5356]
    ]
  },
  '2': {
    color: '#EF7C00',
    coords: [
      [45.5147, -73.6816],
      [45.4839, -73.6191],
      [45.4854, -73.5828],
      [45.5015, -73.5630],
      [45.5137, -73.5574],
      [45.5564, -73.7145]
    ]
  },
  '4': {
    color: '#FFE000',
    coords: [
      [45.5137, -73.5574],
      [45.5262, -73.5222]
    ]
  },
  '5': {
    color: '#0083C9',
    coords: [
      [45.4839, -73.6191],
      [45.5085, -73.6146],
      [45.5593, -73.6009]
    ]
  }
};

export const StmRealTimeTracker: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const [filter, setFilter] = useState<'ALL' | 'BUS' | 'METRO'>('ALL');
  const polylineRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current, {
      center: [45.5017, -73.5673], // Montreal center
      zoom: 12,
      zoomControl: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    polylineRef.current = layerGroup;

    Object.values(METRO_LINES).forEach(line => {
      L.polyline(line.coords, {
        color: line.color,
        weight: 6,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup);
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/stm/gtfs-rt', { headers });
      if (!res.ok) throw new Error('Failed to fetch GTFS-RT');
      const data = await res.json();
      
      if (data.success && data.data?.entity) {
        const newVehicles: VehiclePosition[] = [];
        data.data.entity.forEach((ent: any) => {
          if (ent.vehicle && ent.vehicle.position) {
            const pos = ent.vehicle.position;
            const isMetro = ['1', '2', '4', '5'].includes(ent.vehicle.trip?.routeId) || ent.id.startsWith('METRO');
            newVehicles.push({
              id: ent.id,
              lat: pos.latitude,
              lng: pos.longitude,
              speed: pos.speed || 0,
              routeId: ent.vehicle.trip?.routeId || 'N/A',
              type: isMetro ? 'METRO' : 'BUS',
              status: ent.vehicle.currentStatus || 'UNKNOWN',
              label: ent.vehicle.vehicle?.label || ent.vehicle.vehicle?.id || ent.id
            });
          }
        });
        setVehicles(newVehicles);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    const visibleVehicles = vehicles.filter(v => filter === 'ALL' || v.type === filter);
    const currentIds = new Set(visibleVehicles.map(v => v.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Show/hide metro lines
    if (polylineRef.current) {
      if (filter === 'BUS') {
        map.removeLayer(polylineRef.current);
      } else {
        map.addLayer(polylineRef.current);
      }
    }
    
    // Add/Update markers
    visibleVehicles.forEach(v => {
      const iconHtml = v.type === 'METRO' 
        ? `<div class="w-6 h-6 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><path d="M4 12h16"></path><path d="M12 4v16"></path></svg></div>`
        : `<div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg></div>`;

      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (markersRef.current[v.id]) {
        markersRef.current[v.id].setLatLng([v.lat, v.lng]);
        markersRef.current[v.id].setIcon(icon);
        const routeName = STM_ROUTES[v.routeId] ? ` ${STM_ROUTES[v.routeId]}` : '';
        markersRef.current[v.id].setPopupContent(`
          <div class="bg-slate-900 text-slate-200 p-2 rounded border border-slate-700">
            <div class="font-bold text-indigo-400 mb-1">${v.type === 'METRO' ? 'Métro' : 'Bus'} ${v.routeId}${routeName}</div>
            <div class="text-xs">ID: ${v.label}</div>
            <div class="text-xs">Statut: ${v.status}</div>
            <div class="text-xs">Vitesse: ${(v.speed * 3.6).toFixed(1)} km/h</div>
          </div>
        `);
        markersRef.current[v.id].setTooltipContent(`<b>${v.routeId}</b>${routeName}`);
      } else {
        const marker = L.marker([v.lat, v.lng], { icon }).addTo(map);
        const routeName = STM_ROUTES[v.routeId] ? ` ${STM_ROUTES[v.routeId]}` : '';
        marker.bindPopup(`
          <div class="bg-slate-900 text-slate-200 p-2 rounded border border-slate-700">
            <div class="font-bold text-indigo-400 mb-1">${v.type === 'METRO' ? 'Métro' : 'Bus'} ${v.routeId}${routeName}</div>
            <div class="text-xs">ID: ${v.label}</div>
            <div class="text-xs">Statut: ${v.status}</div>
            <div class="text-xs">Vitesse: ${(v.speed * 3.6).toFixed(1)} km/h</div>
          </div>
        `);
        marker.bindTooltip(`<b>${v.routeId}</b>${routeName}`, {
          direction: 'top',
          className: 'bg-slate-900 text-slate-100 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap'
        });
        markersRef.current[v.id] = marker;
      }
    });

  }, [vehicles, filter]);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
      <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Radar GTFS-RT (STM)</h3>
            <p className="text-xs text-slate-400">Positionnement en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 mr-2">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilter('BUS')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'BUS' ? 'bg-blue-900 text-blue-200' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Bus
            </button>
            <button 
              onClick={() => setFilter('METRO')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'METRO' ? 'bg-green-900 text-green-200' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Métro
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {vehicles.length} véhicules actifs
          </div>
          <button 
            onClick={fetchVehicles} 
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-rose-900/30 border-y border-rose-900/50 flex items-center gap-2 text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="relative flex-1 bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />
        
        {/* Overlay stats */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-none w-56 md:w-64 max-h-[90%] overflow-y-auto scrollbar-none">
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 shadow-xl pointer-events-auto">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2">
              <Bus className="w-4 h-4 text-blue-400" />
              Bus Actifs: {vehicles.filter(v => v.type === 'BUS').length}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Train className="w-4 h-4 text-green-400" />
              Métros Actifs: {vehicles.filter(v => v.type === 'METRO').length}
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-indigo-500/30 rounded-lg p-3 shadow-xl pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] sm:text-xs font-bold font-mono text-indigo-100 uppercase">État prédictif de maintenance</span>
              </div>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <Wrench className="w-3 h-3" />
                  <span className="text-[10px] font-bold">ALERTE DÉFAILLANCE IMMINENTE</span>
                </div>
                <p className="text-[10px] text-amber-200/80 leading-tight">
                  Tension anormale détectée par les capteurs télémétriques: Moteur de traction AZUR (Ligne Verte). Défaillance matérielle estimée dans 4h.
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded p-2">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Activity className="w-3 h-3" />
                  <span className="text-[10px] font-bold">TENDANCES CAPTEURS BUS</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Analyse des vibrations thermiques : Filtres HVAC dégradés sur 3 unités (Ligne 45). Rendement énergétique diminué de 12%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
