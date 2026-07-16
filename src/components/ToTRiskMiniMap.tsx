/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ToTBranch, FeedType } from '../types';
import { Compass, ShieldAlert, Navigation, AlertTriangle } from 'lucide-react';

interface ToTRiskMiniMapProps {
  branches: ToTBranch[];
  feedType: FeedType;
  weightedGlobalScore: number;
}

export const ToTRiskMiniMap: React.FC<ToTRiskMiniMapProps> = ({
  branches,
  feedType,
  weightedGlobalScore,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<ToTBranch | null>(null);

  // Helper to resolve coordinates based on feed type and branch index
  const getBranchCoordinates = (type: FeedType, index: number): { lat: number; lng: number; locationName: string } => {
    const idx = index % 3;
    if (type === 'STM') {
      const locations = [
        { lat: 45.4855, lng: -73.6277, locationName: 'Station Snowdon (STM)' },
        { lat: 45.5155, lng: -73.5606, locationName: 'Hub Berri-UQAM (STM)' },
        { lat: 45.5597, lng: -73.5997, locationName: 'Station Saint-Michel (STM)' },
      ];
      return locations[idx];
    } else if (type === 'AVIATION') {
      const locations = [
        { lat: 45.4800, lng: -73.7500, locationName: 'Couloir de Vol Nord YUL (Airspace)' },
        { lat: 45.4600, lng: -73.7300, locationName: 'Couloir de Vol Sud YUL (Airspace)' },
        { lat: 45.5100, lng: -73.6200, locationName: 'Secteur d\'Approche Est (Airspace)' },
      ];
      return locations[idx];
    } else if (type === 'MARITIME') {
      const locations = [
        { lat: 45.5250, lng: -73.5350, locationName: 'Port de Montréal - Secteur Est' },
        { lat: 45.5080, lng: -73.5480, locationName: 'Bassin d\'Arrimage Vieux-Port' },
        { lat: 45.4780, lng: -73.5780, locationName: 'Canal de Lachine - Hub Logistique' },
      ];
      return locations[idx];
    } else {
      const locations = [
        { lat: 45.5090, lng: -73.5620, locationName: 'Caméra CCTV - St-Laurent / René-Lévesque' },
        { lat: 45.5190, lng: -73.5660, locationName: 'Caméra CCTV - Berri / Sherbrooke' },
        { lat: 45.5075, lng: -73.5685, locationName: 'Caméra CCTV - Place des Arts' },
      ];
      return locations[idx];
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center coordinates based on feed type
    let center: [number, number] = [45.5088, -73.5540];
    if (feedType === 'AVIATION') {
      center = [45.4700, -73.7400];
    } else if (feedType === 'MARITIME') {
      center = [45.5050, -73.5450];
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // Dark Mode CartoDB TileLayer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.featureGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [feedType]);

  // Update Markers
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    branches.forEach((branch, index) => {
      const { lat, lng, locationName } = getBranchCoordinates(feedType, index);

      // Pulse color matches evaluationScore (criticality threat)
      const severityColor =
        branch.evaluationScore > 75 ? 'rgb(239, 68, 68)' : // red
        branch.evaluationScore > 50 ? 'rgb(249, 115, 22)' : // orange
        branch.evaluationScore > 30 ? 'rgb(234, 179, 8)' :  // yellow
        'rgb(59, 130, 246)';                                // blue

      const severityBorderClass =
        branch.evaluationScore > 75 ? 'bg-red-600' :
        branch.evaluationScore > 50 ? 'bg-orange-600' :
        branch.evaluationScore > 30 ? 'bg-yellow-600' :
        'bg-blue-600';

      const customIcon = L.divIcon({
        className: 'custom-tot-risk-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 group">
            <div class="absolute w-full h-full rounded-full opacity-45 animate-ping" style="background-color: ${severityColor}; animation-duration: 2.2s;"></div>
            <div class="absolute w-6 h-6 rounded-full opacity-20" style="background-color: ${severityColor}"></div>
            <div class="relative w-4.5 h-4.5 ${severityBorderClass} border-2 border-slate-900 rounded-full shadow-lg flex items-center justify-center">
              <span class="text-[8px] font-mono font-bold text-white">${index + 1}</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const risksList = branch.cascadingRisks
        ? branch.cascadingRisks.map(r => `<li class="text-[9.5px] text-slate-300 leading-tight mb-0.5">• ${r}</li>`).join('')
        : '';

      const popupContent = `
        <div class="p-3 bg-slate-950 text-slate-200 rounded-lg border border-slate-800 font-sans max-w-[260px] shadow-2xl">
          <div class="flex items-center justify-between gap-1.5 mb-1.5 border-b border-slate-900 pb-1.5">
            <span class="text-[9px] font-mono text-indigo-400 font-bold uppercase">Branche B-0${index + 1}</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase" style="background-color: ${severityColor}20; color: ${severityColor}; border: 1px solid ${severityColor}40">
              Menace : ${branch.evaluationScore}%
            </span>
          </div>
          <h4 class="font-bold text-xs text-slate-100 mb-1 leading-snug">${branch.name}</h4>
          <p class="text-[10px] text-slate-400 mb-2 leading-relaxed font-mono">${locationName}</p>
          
          <div class="mb-2">
            <span class="text-[9px] font-mono text-red-400 uppercase font-semibold block mb-1">Risques identifiés:</span>
            <ul class="pl-1 list-none">${risksList || '<li class="text-slate-500 italic">Aucun risque critique direct</li>'}</ul>
          </div>
          
          <div class="mt-2 pt-2 border-t border-slate-900 flex justify-between items-center text-[8px] text-slate-500 font-mono">
            <span>Bruit : ${branch.uncertainty}%</span>
            <span>Coord: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-tot-popup',
      });

      marker.on('click', () => {
        setSelectedBranch(branch);
        map.flyTo([lat, lng], 13.5, { duration: 1.2 });
      });

      marker.addTo(markersLayer);
    });

    // Fit bounds
    if (branches.length > 0) {
      const bounds = markersLayer.getBounds();
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [branches, feedType]);

  const handleRecenter = () => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (map && markersLayer && branches.length > 0) {
      map.fitBounds(markersLayer.getBounds(), { padding: [30, 30] });
      setSelectedBranch(null);
    }
  };

  return (
    <div className="relative border border-slate-900 bg-slate-950 rounded-xl overflow-hidden shadow-xl flex flex-col md:flex-row h-[280px]">
      
      {/* Side HUD panel inside mini-map */}
      <div className="w-full md:w-1/3 p-4 bg-slate-950/90 border-b md:border-b-0 md:border-r border-slate-900/60 flex flex-col justify-between font-mono z-10">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Focalisation Géospatiale</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal mb-3">
            Localisation géospatiale active des vecteurs de décision de secours probabilistes en temps réel.
          </p>
          
          {selectedBranch ? (
            <div className="space-y-2 p-2 rounded border border-indigo-900/40 bg-indigo-950/10 animate-fade-in text-[10px]">
              <div className="flex justify-between font-bold">
                <span className="text-indigo-300">SÉLECTIONNÉE</span>
                <span className="text-indigo-400 uppercase">B-0{branches.indexOf(selectedBranch) + 1}</span>
              </div>
              <p className="text-slate-300 font-sans leading-tight font-semibold">{selectedBranch.name}</p>
              <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-500 pt-1 border-t border-slate-900">
                <div>Menace : <span className="text-red-400 font-bold">{selectedBranch.evaluationScore}%</span></div>
                <div>Bruit : <span className="text-amber-400 font-bold">{selectedBranch.uncertainty}%</span></div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded border border-slate-900 bg-slate-950 text-[9.5px] text-slate-500 italic leading-snug">
              Cliquez sur un indicateur de branche sur la carte pour isoler et projeter ses variables locales.
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[10px]">
          <span className="text-slate-400">Total : {branches.length} branches</span>
          <button
            onClick={handleRecenter}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Navigation className="w-3 h-3 rotate-45" />
            <span>Recadrer la carte</span>
          </button>
        </div>
      </div>

      {/* Leaflet map frame */}
      <div className="flex-1 relative min-h-[160px] md:min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />
        
        {/* Subtle dynamic overlay info */}
        <div className="absolute top-2.5 right-2.5 z-10 bg-slate-950/95 border border-slate-800/80 px-2.5 py-1.5 rounded shadow-xl pointer-events-none flex items-center gap-1.5 font-mono text-[9px]">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-slate-400 uppercase font-bold">{feedType} Live Grid • SLA OK</span>
        </div>
      </div>
    </div>
  );
};
