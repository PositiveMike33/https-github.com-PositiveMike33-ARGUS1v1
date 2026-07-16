/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { FeedItem, RouteOption } from '../types';
import { AlertTriangle, Compass, Map, Radio, Navigation, Eye, Camera } from 'lucide-react';

interface D3TransitMapProps {
  origin: string;
  destination: string;
  selectedRoute: RouteOption;
  feeds: FeedItem[];
  calibratedOriginLat?: number;
  calibratedOriginLng?: number;
}

interface MapNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  type: 'HOME' | 'WORK' | 'FRIEND' | 'METRO' | 'HUB' | 'PORT' | 'AIRPORT' | 'HQ' | 'METRO_STATION';
}

interface MapLink {
  source: string;
  target: string;
  color: string;
  name: string;
  type: 'METRO' | 'BUS';
}

const NODES: MapNode[] = [
  { id: 'carrieres', name: '2200 Rue des Carrières', lat: 45.541, lng: -73.593, color: '#f43f5e', type: 'HOME' },
  { id: 'labatt', name: '50 Avenue Labatt (LaSalle)', lat: 45.4322, lng: -73.6521, color: '#3b82f6', type: 'WORK' },
  { id: 'veronique', name: 'Arrêt George-V (Lachine)', lat: 45.4357, lng: -73.6825, color: '#10b981', type: 'FRIEND' },
  { id: 'berri', name: 'Berri-UQAM', lat: 45.5155, lng: -73.5606, color: '#eab308', type: 'METRO' },
  { id: 'turcot', name: 'Échangeur Turcot', lat: 45.4697, lng: -73.6041, color: '#a855f7', type: 'HUB' },
  { id: 'port', name: 'Port de Montréal (Quai 52)', lat: 45.5390, lng: -73.5288, color: '#06b6d4', type: 'PORT' },
  { id: 'yul', name: 'Aéroport CYUL', lat: 45.4706, lng: -73.7408, color: '#ec4899', type: 'AIRPORT' },
  { id: 'centre', name: 'Station de métro Beaudry', lat: 45.5191, lng: -73.5568, color: '#6366f1', type: 'HQ' },
  { id: 'rosemont', name: 'Station Papineau', lat: 45.5244, lng: -73.5619, color: '#f97316', type: 'METRO_STATION' },
  { id: 'lionel_groulx', name: 'Station Lionel-Groulx', lat: 45.4830, lng: -73.5796, color: '#f97316', type: 'METRO_STATION' },
  { id: 'jolicoeur', name: 'Station Jolicoeur', lat: 45.4570, lng: -73.5822, color: '#10b981', type: 'METRO_STATION' },
  { id: 'angrignon', name: 'Station Angrignon', lat: 45.4462, lng: -73.6037, color: '#10b981', type: 'METRO_STATION' },

  // Montreal - Sorties Cultes & Tourisme
  { id: 'vieux_port', name: 'Vieux-Port de Montréal', lat: 45.5088, lng: -73.5540, color: '#06b6d4', type: 'HUB' },
  { id: 'notre_dame', name: 'Basilique Notre-Dame', lat: 45.5045, lng: -73.5560, color: '#eab308', type: 'HUB' },
  { id: 'mont_royal', name: 'Belvédère du Mont-Royal', lat: 45.5041, lng: -73.5875, color: '#22c55e', type: 'HUB' },
  { id: 'oratoire', name: 'Oratoire Saint-Joseph', lat: 45.4925, lng: -73.6186, color: '#3b82f6', type: 'HUB' },
  { id: 'banquise', name: 'La Banquise (Plateau)', lat: 45.5264, lng: -73.5747, color: '#f97316', type: 'HUB' },
  { id: 'schwartzs', name: 'Schwartz\'s Deli', lat: 45.5164, lng: -73.5779, color: '#f43f5e', type: 'HUB' },
  { id: 'stereobar', name: 'Stereo Nightclub / Stereobar', lat: 45.5212, lng: -73.5552, color: '#a855f7', type: 'HUB' },
  { id: 'mtelus', name: 'MTELUS', lat: 45.5105, lng: -73.5635, color: '#ec4899', type: 'HUB' },
  { id: 'newcitygas', name: 'New City Gas (Griffintown)', lat: 45.4957, lng: -73.5583, color: '#6366f1', type: 'HUB' },

  // Quebec - Tourisme
  { id: 'chateau_frontenac', name: 'Château Frontenac', lat: 46.8118, lng: -71.2050, color: '#eab308', type: 'HUB' },
  { id: 'petit_champlain', name: 'Quartier Petit Champlain', lat: 46.8105, lng: -71.2033, color: '#f97316', type: 'HUB' },
  { id: 'citadelle', name: 'Citadelle de Québec', lat: 46.8078, lng: -71.2075, color: '#f43f5e', type: 'HUB' },
  { id: 'gare_palais', name: 'Gare du Palais (Québec)', lat: 46.8172, lng: -71.2139, color: '#3b82f6', type: 'HUB' },

  // Toronto - Tourisme
  { id: 'cn_tower', name: 'Tour CN (Toronto)', lat: 43.6426, lng: -79.3871, color: '#ec4899', type: 'HUB' },
  { id: 'rom', name: 'Musée Royal de l\'Ontario', lat: 43.6677, lng: -79.3948, color: '#a855f7', type: 'HUB' },
  { id: 'ripleys', name: 'Aquarium Ripley de Toronto', lat: 43.6420, lng: -79.3860, color: '#06b6d4', type: 'HUB' },
  { id: 'union_station', name: 'Gare Union (Toronto)', lat: 43.6453, lng: -79.3806, color: '#3b82f6', type: 'HUB' },

  // New York - Tourisme
  { id: 'times_square', name: 'Times Square (New York)', lat: 40.7580, lng: -73.9855, color: '#f43f5e', type: 'HUB' },
  { id: 'central_park', name: 'Central Park (Manhattan)', lat: 40.7829, lng: -73.9654, color: '#22c55e', type: 'HUB' },
  { id: 'empire_state', name: 'Empire State Building', lat: 40.7484, lng: -73.9857, color: '#eab308', type: 'HUB' },
  { id: 'statue_liberty', name: 'Statue de la Liberté', lat: 40.6892, lng: -74.0445, color: '#06b6d4', type: 'HUB' },
  { id: 'penn_station', name: 'Penn Station (New York)', lat: 40.7505, lng: -73.9934, color: '#3b82f6', type: 'HUB' },

  // Additional Metro Line Stations for Orange, Blue, and Yellow lines
  { id: 'snowdon', name: 'Station Snowdon', lat: 45.4855, lng: -73.6277, color: '#3b82f6', type: 'METRO_STATION' },
  { id: 'jean_talon', name: 'Station Jean-Talon', lat: 45.5391, lng: -73.6130, color: '#f97316', type: 'METRO_STATION' },
  { id: 'saint_michel', name: 'Station Saint-Michel', lat: 45.5597, lng: -73.5997, color: '#3b82f6', type: 'METRO_STATION' },
  { id: 'longueuil', name: 'Station Longueuil-Université-de-Sherbrooke', lat: 45.5250, lng: -73.5218, color: '#eab308', type: 'METRO_STATION' }
];

const METRO_LINKS: MapLink[] = [
  // Ligne Verte (Green)
  { source: 'rosemont', target: 'centre', color: '#10b981', name: 'Métro Ligne Verte', type: 'METRO' },
  { source: 'centre', target: 'berri', color: '#10b981', name: 'Métro Ligne Verte', type: 'METRO' },
  { source: 'berri', target: 'lionel_groulx', color: '#10b981', name: 'Métro Ligne Verte', type: 'METRO' },
  { source: 'lionel_groulx', target: 'jolicoeur', color: '#10b981', name: 'Métro Ligne Verte', type: 'METRO' },
  { source: 'jolicoeur', target: 'angrignon', color: '#10b981', name: 'Métro Ligne Verte', type: 'METRO' },

  // Ligne Orange (Orange)
  { source: 'snowdon', target: 'lionel_groulx', color: '#f97316', name: 'Métro Ligne Orange', type: 'METRO' },
  { source: 'lionel_groulx', target: 'berri', color: '#f97316', name: 'Métro Ligne Orange', type: 'METRO' },
  { source: 'berri', target: 'rosemont', color: '#f97316', name: 'Métro Ligne Orange', type: 'METRO' },
  { source: 'rosemont', target: 'jean_talon', color: '#f97316', name: 'Métro Ligne Orange', type: 'METRO' },

  // Ligne Bleue (Blue)
  { source: 'snowdon', target: 'jean_talon', color: '#3b82f6', name: 'Métro Ligne Bleue', type: 'METRO' },
  { source: 'jean_talon', target: 'saint_michel', color: '#3b82f6', name: 'Métro Ligne Bleue', type: 'METRO' },

  // Ligne Jaune (Yellow)
  { source: 'berri', target: 'longueuil', color: '#eab308', name: 'Métro Ligne Jaune', type: 'METRO' }
];

const BUS_ROAD_LINKS: MapLink[] = [
  { source: 'carrieres', target: 'rosemont', color: '#475569', name: 'Marche d\'approche', type: 'BUS' },
  { source: 'jolicoeur', target: 'labatt', color: '#6366f1', name: 'Ligne Bus 112', type: 'BUS' },
  { source: 'angrignon', target: 'labatt', color: '#8b5cf6', name: 'Ligne Bus 106/113', type: 'BUS' },
  { source: 'lionel_groulx', target: 'veronique', color: '#3b82f6', name: 'Bus Express 496', type: 'BUS' },
  { source: 'veronique', target: 'carrieres', color: '#475569', name: 'Liaison Lachine ➔ Lorimier / Holt', type: 'BUS' },
  { source: 'lionel_groulx', target: 'yul', color: '#ec4899', name: 'Bus Express 747', type: 'BUS' },
  { source: 'port', target: 'berri', color: '#06b6d4', name: 'Bus local 185', type: 'BUS' },
  { source: 'turcot', target: 'centre', color: '#a855f7', name: 'Liaison Échangeur ➔ Station Beaudry', type: 'BUS' },

  // Local Montreal Sorties/Tourisme links
  { source: 'berri', target: 'vieux_port', color: '#06b6d4', name: 'Liaison Vieux-Port', type: 'BUS' },
  { source: 'berri', target: 'notre_dame', color: '#eab308', name: 'Liaison Basilique', type: 'BUS' },
  { source: 'centre', target: 'mont_royal', color: '#22c55e', name: 'Liaison Mont-Royal', type: 'BUS' },
  { source: 'centre', target: 'oratoire', color: '#3b82f6', name: 'Liaison Oratoire', type: 'BUS' },
  { source: 'berri', target: 'banquise', color: '#f97316', name: 'Liaison La Banquise', type: 'BUS' },
  { source: 'berri', target: 'schwartzs', color: '#f43f5e', name: 'Liaison Schwartz\'s', type: 'BUS' },
  { source: 'centre', target: 'stereobar', color: '#a855f7', name: 'Liaison Stereobar', type: 'BUS' },
  { source: 'berri', target: 'mtelus', color: '#ec4899', name: 'Liaison MTELUS', type: 'BUS' },
  { source: 'berri', target: 'newcitygas', color: '#6366f1', name: 'Liaison New City Gas', type: 'BUS' },

  // Local Quebec links
  { source: 'gare_palais', target: 'chateau_frontenac', color: '#eab308', name: 'Liaison RTC Frontenac', type: 'BUS' },
  { source: 'gare_palais', target: 'petit_champlain', color: '#f97316', name: 'Liaison RTC Champlain', type: 'BUS' },
  { source: 'gare_palais', target: 'citadelle', color: '#f43f5e', name: 'Liaison RTC Citadelle', type: 'BUS' },

  // Local Toronto links
  { source: 'union_station', target: 'cn_tower', color: '#ec4899', name: 'Liaison TTC CN Tower', type: 'BUS' },
  { source: 'union_station', target: 'rom', color: '#a855f7', name: 'Liaison TTC ROM', type: 'BUS' },
  { source: 'union_station', target: 'ripleys', color: '#06b6d4', name: 'Liaison TTC Ripley\'s', type: 'BUS' },

  // Local New York links
  { source: 'penn_station', target: 'times_square', color: '#f43f5e', name: 'Métro MTA Times Square', type: 'BUS' },
  { source: 'penn_station', target: 'central_park', color: '#22c55e', name: 'Métro MTA Central Park', type: 'BUS' },
  { source: 'penn_station', target: 'empire_state', color: '#eab308', name: 'Métro MTA Empire State', type: 'BUS' },
  { source: 'penn_station', target: 'statue_liberty', color: '#06b6d4', name: 'Ferry Statue de la Liberté', type: 'BUS' },

  // Inter-city corridors (connecting Montreal HQ/Berri to regional hubs)
  { source: 'berri', target: 'gare_palais', color: '#3b82f6', name: 'Corridor VIA Rail / Orléans Express (Mtl-Qc)', type: 'BUS' },
  { source: 'berri', target: 'union_station', color: '#8b5cf6', name: 'Corridor VIA Rail / Vol CYUL-YYZ (Mtl-Tor)', type: 'BUS' },
  { source: 'berri', target: 'penn_station', color: '#ec4899', name: 'Corridor Amtrak / Vol CYUL-JFK (Mtl-NYC)', type: 'BUS' },
];

export const D3TransitMap: React.FC<D3TransitMapProps> = ({
  origin,
  destination,
  selectedRoute,
  feeds,
  calibratedOriginLat,
  calibratedOriginLng
}) => {
  const NODES = useMemo(() => {
    const rawNodes = [
      { id: 'carrieres', name: '2200 Rue des Carrières', lat: calibratedOriginLat || 45.541, lng: calibratedOriginLng || -73.593, color: '#f43f5e', type: 'HOME' as const },
      { id: 'labatt', name: '50 Avenue Labatt (LaSalle)', lat: 45.4322, lng: -73.6521, color: '#3b82f6', type: 'WORK' as const },
      { id: 'veronique', name: 'Arrêt George-V (Lachine)', lat: 45.4357, lng: -73.6825, color: '#10b981', type: 'FRIEND' as const },
      { id: 'berri', name: 'Berri-UQAM', lat: 45.5155, lng: -73.5606, color: '#eab308', type: 'METRO' as const },
      { id: 'turcot', name: 'Échangeur Turcot', lat: 45.4697, lng: -73.6041, color: '#a855f7', type: 'HUB' as const },
      { id: 'port', name: 'Port de Montréal (Quai 52)', lat: 45.5390, lng: -73.5288, color: '#06b6d4', type: 'PORT' as const },
      { id: 'yul', name: 'Aéroport CYUL', lat: 45.4706, lng: -73.7408, color: '#ec4899', type: 'AIRPORT' as const },
      { id: 'centre', name: 'Station de métro Beaudry', lat: 45.5191, lng: -73.5568, color: '#6366f1', type: 'HQ' as const },
      { id: 'rosemont', name: 'Station Papineau', lat: 45.5244, lng: -73.5619, color: '#f97316', type: 'METRO_STATION' as const },
      { id: 'lionel_groulx', name: 'Station Lionel-Groulx', lat: 45.4830, lng: -73.5796, color: '#f97316', type: 'METRO_STATION' as const },
      { id: 'jolicoeur', name: 'Station Jolicoeur', lat: 45.4570, lng: -73.5822, color: '#10b981', type: 'METRO_STATION' as const },
      { id: 'angrignon', name: 'Station Angrignon', lat: 45.4462, lng: -73.6037, color: '#10b981', type: 'METRO_STATION' as const },

      // Montreal - Sorties Cultes & Tourisme
      { id: 'vieux_port', name: 'Vieux-Port de Montréal', lat: 45.5088, lng: -73.5540, color: '#06b6d4', type: 'HUB' as const },
      { id: 'notre_dame', name: 'Basilique Notre-Dame', lat: 45.5045, lng: -73.5560, color: '#eab308', type: 'HUB' as const },
      { id: 'mont_royal', name: 'Belvédère du Mont-Royal', lat: 45.5041, lng: -73.5875, color: '#22c55e', type: 'HUB' as const },
      { id: 'oratoire', name: 'Oratoire Saint-Joseph', lat: 45.4925, lng: -73.6186, color: '#3b82f6', type: 'HUB' as const },
      { id: 'banquise', name: 'La Banquise (Plateau)', lat: 45.5264, lng: -73.5747, color: '#f97316', type: 'HUB' as const },
      { id: 'schwartzs', name: 'Schwartz\'s Deli', lat: 45.5164, lng: -73.5779, color: '#f43f5e', type: 'HUB' as const },
      { id: 'stereobar', name: 'Stereo Nightclub / Stereobar', lat: 45.5212, lng: -73.5552, color: '#a855f7', type: 'HUB' as const },
      { id: 'mtelus', name: 'MTELUS', lat: 45.5105, lng: -73.5635, color: '#ec4899', type: 'HUB' as const },
      { id: 'newcitygas', name: 'New City Gas (Griffintown)', lat: 45.4957, lng: -73.5583, color: '#6366f1', type: 'HUB' as const },

      // Quebec - Tourisme
      { id: 'chateau_frontenac', name: 'Château Frontenac', lat: 46.8118, lng: -71.2050, color: '#eab308', type: 'HUB' as const },
      { id: 'petit_champlain', name: 'Quartier Petit Champlain', lat: 46.8105, lng: -71.2033, color: '#f97316', type: 'HUB' as const },
      { id: 'citadelle', name: 'Citadelle de Québec', lat: 46.8078, lng: -71.2075, color: '#f43f5e', type: 'HUB' as const },
      { id: 'gare_palais', name: 'Gare du Palais (Québec)', lat: 46.8172, lng: -71.2139, color: '#3b82f6', type: 'HUB' as const },

      // Toronto - Tourisme
      { id: 'cn_tower', name: 'Tour CN (Toronto)', lat: 43.6426, lng: -79.3871, color: '#ec4899', type: 'HUB' as const },
      { id: 'rom', name: 'Musée Royal de l\'Ontario', lat: 43.6677, lng: -79.3948, color: '#a855f7', type: 'HUB' as const },
      { id: 'ripleys', name: 'Aquarium Ripley de Toronto', lat: 43.6420, lng: -79.3860, color: '#06b6d4', type: 'HUB' as const },
      { id: 'union_station', name: 'Gare Union (Toronto)', lat: 43.6453, lng: -79.3806, color: '#3b82f6', type: 'HUB' as const },

      // New York - Tourisme
      { id: 'times_square', name: 'Times Square (New York)', lat: 40.7580, lng: -73.9855, color: '#f43f5e', type: 'HUB' as const },
      { id: 'central_park', name: 'Central Park (Manhattan)', lat: 40.7829, lng: -73.9654, color: '#22c55e', type: 'HUB' as const },
      { id: 'empire_state', name: 'Empire State Building', lat: 40.7484, lng: -73.9857, color: '#eab308', type: 'HUB' as const },
      { id: 'statue_liberty', name: 'Statue de la Liberté', lat: 40.6892, lng: -74.0445, color: '#06b6d4', type: 'HUB' as const },
      { id: 'penn_station', name: 'Penn Station (New York)', lat: 40.7505, lng: -73.9934, color: '#3b82f6', type: 'HUB' as const }
    ];

    if (calibratedOriginLat && calibratedOriginLng) {
      return rawNodes.map(node => {
        if (node.id === origin) {
          return {
            ...node,
            lat: calibratedOriginLat,
            lng: calibratedOriginLng
          };
        }
        return node;
      });
    }
    return rawNodes;
  }, [calibratedOriginLat, calibratedOriginLng, origin]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [hoveredAlert, setHoveredAlert] = useState<FeedItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [activeLayer, setActiveLayer] = useState<'traffic' | 'infra' | 'congestion'>('traffic');
  const [tooltipZoom, setTooltipZoom] = useState({ x: 0, y: 0, k: 1 });
  const zoomTransformRef = useRef({ x: 0, y: 0, k: 1 });

  // Handle ResizeObserver for fully fluid design
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({
          width: Math.max(300, width),
          height: 380
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Determine path of nodes corresponding to active selection
  const activePathNodes = useMemo<string[]>(() => {
    if (!selectedRoute) return [origin, destination];
    const routeId = selectedRoute.id.toLowerCase();
    
    if (origin === 'carrieres' && destination === 'labatt') {
      if (routeId.includes('112') || routeId.includes('jolicoeur')) {
        return ['carrieres', 'rosemont', 'centre', 'berri', 'lionel_groulx', 'jolicoeur', 'labatt'];
      } else {
        return ['carrieres', 'rosemont', 'centre', 'berri', 'lionel_groulx', 'angrignon', 'labatt'];
      }
    }
    if (origin === 'labatt' && destination === 'carrieres') {
      if (routeId.includes('112') || routeId.includes('jolicoeur')) {
        return ['labatt', 'jolicoeur', 'lionel_groulx', 'berri', 'centre', 'rosemont', 'carrieres'];
      } else {
        return ['labatt', 'angrignon', 'lionel_groulx', 'berri', 'centre', 'rosemont', 'carrieres'];
      }
    }
    if (origin === 'carrieres' && destination === 'veronique') {
      return ['carrieres', 'rosemont', 'centre', 'berri', 'lionel_groulx', 'veronique'];
    }
    if (origin === 'veronique' && destination === 'carrieres') {
      return ['veronique', 'lionel_groulx', 'berri', 'centre', 'rosemont', 'carrieres'];
    }
    if (origin === 'yul' && destination === 'centre') {
      return ['yul', 'lionel_groulx', 'berri', 'centre'];
    }
    if (origin === 'port' && destination === 'centre') {
      return ['port', 'berri', 'centre'];
    }
    if (origin === 'berri' && destination === 'yul') {
      return ['berri', 'lionel_groulx', 'yul'];
    }

    // Dynamic routing fallback helper based on city boundaries
    const getCityOfNode = (nodeId: string): string => {
      if (['chateau_frontenac', 'petit_champlain', 'citadelle', 'gare_palais'].includes(nodeId)) return 'Quebec';
      if (['cn_tower', 'rom', 'ripleys', 'union_station'].includes(nodeId)) return 'Toronto';
      if (['times_square', 'central_park', 'empire_state', 'statue_liberty', 'penn_station'].includes(nodeId)) return 'New York';
      return 'Montreal';
    };

    const originCity = getCityOfNode(origin);
    const destCity = getCityOfNode(destination);

    if (originCity !== destCity) {
      // Inter-city path! Connect origin -> origin's hub -> destination's hub -> destination
      const getHubOfCity = (city: string): string => {
        if (city === 'Quebec') return 'gare_palais';
        if (city === 'Toronto') return 'union_station';
        if (city === 'New York') return 'penn_station';
        return 'berri'; // default Montreal hub
      };

      const originHub = getHubOfCity(originCity);
      const destHub = getHubOfCity(destCity);

      const path = [origin];
      if (origin !== originHub) path.push(originHub);
      if (originHub !== destHub) {
        if (originHub !== 'berri' && destHub !== 'berri') {
          path.push('berri');
        }
        path.push(destHub);
      }
      if (destination !== destHub) path.push(destination);
      return path;
    } else {
      // Intra-city path!
      const hub = originCity === 'Quebec' ? 'gare_palais' : originCity === 'Toronto' ? 'union_station' : originCity === 'New York' ? 'penn_station' : 'berri';
      const path = [origin];
      if (origin !== hub) path.push(hub);
      if (destination !== hub) path.push(destination);
      return path;
    }
  }, [origin, destination, selectedRoute]);

  // Check which feeds constitute active alerts affecting each node or line
  const activeAlertsByNode = useMemo(() => {
    const alerts: Record<string, FeedItem> = {};
    NODES.forEach(node => {
      const match = feeds.find(f => {
        if (f.severity === 'low') return false; // only show significant alerts on the map
        const text = (f.title + ' ' + f.details + ' ' + f.value).toLowerCase();
        
        if (node.id === 'yul' && (text.includes('yul') || text.includes('aéroport') || text.includes('747'))) return true;
        if (node.id === 'port' && (text.includes('port') || text.includes('maritime') || text.includes('quai 52') || text.includes('185'))) return true;
        if (node.id === 'turcot' && text.includes('turcot')) return true;
        if (node.id === 'labatt' && (text.includes('labatt') || text.includes('lasalle') || text.includes('112') || text.includes('106'))) return true;
        if (node.id === 'jolicoeur' && (text.includes('jolicoeur') || text.includes('verte'))) return true;
        if (node.id === 'angrignon' && (text.includes('angrignon') || text.includes('verte'))) return true;
        if (node.id === 'rosemont' && (text.includes('rosemont') || text.includes('orange'))) return true;
        if (node.id === 'berri' && (text.includes('berri') || text.includes('verte') || text.includes('orange'))) return true;
        if (node.id === 'lionel_groulx' && (text.includes('lionel-groulx') || text.includes('verte') || text.includes('orange'))) return true;
        return false;
      });
      if (match) alerts[node.id] = match;
    });
    return alerts;
  }, [feeds]);

  // Main D3 Drawing logic
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear SVG before redrawing

    const { width, height } = dimensions;

    // Define scales to project lat/lng onto SVG coordinates dynamically based on visible route nodes
    const activeNodesData = NODES.filter(n => activePathNodes.includes(n.id) || n.id === origin || n.id === destination);
    let lats = activeNodesData.map(n => n.lat);
    let lngs = activeNodesData.map(n => n.lng);

    let minLat = 45.41;
    let maxLat = 45.56;
    let minLng = -73.76;
    let maxLng = -73.50;

    if (lats.length > 0 && lngs.length > 0) {
      const computedMinLat = Math.min(...lats);
      const computedMaxLat = Math.max(...lats);
      const computedMinLng = Math.min(...lngs);
      const computedMaxLng = Math.max(...lngs);

      // Enforce a minimum window size for a single city view so we do not zoom in too tight
      const minSpanLat = 0.12;
      const minSpanLng = 0.20;

      minLat = computedMinLat;
      maxLat = computedMaxLat;
      minLng = computedMinLng;
      maxLng = computedMaxLng;

      if (maxLat - minLat < minSpanLat) {
        const midLat = (minLat + maxLat) / 2;
        minLat = midLat - minSpanLat / 2;
        maxLat = midLat + minSpanLat / 2;
      }
      if (maxLng - minLng < minSpanLng) {
        const midLng = (minLng + maxLng) / 2;
        minLng = midLng - minSpanLng / 2;
        maxLng = midLng + minSpanLng / 2;
      }

      // Add a 15% geographical padding margin
      const latPadding = (maxLat - minLat) * 0.15;
      const lngPadding = (maxLng - minLng) * 0.15;
      minLat -= latPadding;
      maxLat += latPadding;
      minLng -= lngPadding;
      maxLng += lngPadding;
    }

    const xScale = d3.scaleLinear()
      .domain([minLng, maxLng])
      .range([40, width - 40]);

    const yScale = d3.scaleLinear()
      .domain([minLat, maxLat])
      .range([height - 50, 40]); // Inverted for SVG coords

    // SVG Filters for glowing styles (appended to root SVG)
    const defs = svg.append('defs');
    
    // Active path glow filter
    const activeFilter = defs.append('filter')
      .attr('id', 'glow-active')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    activeFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    activeFilter.append('feMerge')
      .append('feMergeNode').attr('in', 'blur');
    activeFilter.select('feMerge')
      .append('feMergeNode').attr('in', 'SourceGraphic');

    // Alert glow filter
    const alertFilter = defs.append('filter')
      .attr('id', 'glow-alert')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    alertFilter.append('feGaussianBlur')
      .attr('stdDeviation', '6')
      .attr('result', 'blur');
    alertFilter.append('feComponentTransfer')
      .append('feFuncA').attr('type', 'linear').attr('slope', '1.5');
    const merge = alertFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create the master content group for panning/zooming
    const g = svg.append('g').attr('class', 'map-content');

    // Configure D3 zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        zoomTransformRef.current = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        };
        setTooltipZoom({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        });
      });

    svg.call(zoomBehavior);

    // Restore previous zoom/pan transform to maintain view during redraws
    const currentTransform = d3.zoomIdentity
      .translate(zoomTransformRef.current.x, zoomTransformRef.current.y)
      .scale(zoomTransformRef.current.k);
    svg.call(zoomBehavior.transform, currentTransform);
    g.attr('transform', currentTransform.toString());

    // 1. Draw geographic context accents (St. Lawrence River & Island bounds)
    // Draw highly stylized background shape for St. Lawrence River
    const riverCoords: [number, number][] = [
      [-73.68, 45.41],
      [-73.62, 45.42],
      [-73.58, 45.44],
      [-73.54, 45.48],
      [-73.51, 45.51],
      [-73.49, 45.54],
      [-73.47, 45.56],
      [-73.45, 45.56],
      [-73.47, 45.51],
      [-73.50, 45.46],
      [-73.54, 45.42],
      [-73.60, 45.41],
    ];

    const riverLine = d3.line<[number, number]>()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .curve(d3.curveBasis);

    g.append('path')
      .attr('d', riverLine(riverCoords))
      .attr('fill', '#1e293b')
      .attr('opacity', 0.25)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2);

    g.append('text')
      .attr('x', xScale(-73.52))
      .attr('y', yScale(45.44))
      .attr('fill', '#475569')
      .attr('font-size', '8px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', 'bold')
      .attr('transform', `rotate(-30, ${xScale(-73.52)}, ${yScale(45.44)})`)
      .text('▲ FLEUVE SAINT-LAURENT');

    // 2. Compile background grids & telemetry lines
    const allLinks = [...METRO_LINKS, ...BUS_ROAD_LINKS];

    // Draw all base links
    allLinks.forEach((link) => {
      const srcNode = NODES.find(n => n.id === link.source);
      const tgtNode = NODES.find(n => n.id === link.target);
      if (!srcNode || !tgtNode) return;

      const x1 = xScale(srcNode.lng);
      const y1 = yScale(srcNode.lat);
      const x2 = xScale(tgtNode.lng);
      const y2 = yScale(tgtNode.lat);

      // Check if this specific link is part of the ACTIVE PATH
      const srcIdx = activePathNodes.indexOf(link.source);
      const tgtIdx = activePathNodes.indexOf(link.target);
      const isActiveLink = srcIdx !== -1 && tgtIdx !== -1 && Math.abs(srcIdx - tgtIdx) === 1;

      if (isActiveLink) {
        // Draw glow path
        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', '#6366f1')
          .attr('stroke-width', 6)
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0.4)
          .attr('filter', 'url(#glow-active)');

        // Draw core animated dash path
        const animatedLine = g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', '#818cf8')
          .attr('stroke-width', 2.5)
          .attr('stroke-linecap', 'round');

        // Check if direction goes source ➔ target
        if (srcIdx < tgtIdx) {
          animatedLine
            .attr('stroke-dasharray', '8 5')
            .style('animation', 'd3-map-dash 1.5s linear infinite');
        } else {
          animatedLine
            .attr('stroke-dasharray', '8 5')
            .style('animation', 'd3-map-dash-reverse 1.5s linear infinite');
        }

      } else {
        // Draw standard inactive background lines if the layer permits it
        const color = link.type === 'METRO' ? link.color : '#334155';
        const opacity = link.type === 'METRO' ? 0.35 : 0.15;
        const width = link.type === 'METRO' ? 2.5 : 1.2;

        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', color)
          .attr('stroke-dasharray', link.type === 'BUS' ? '3 3' : 'none')
          .attr('stroke-width', width)
          .attr('stroke-linecap', 'round')
          .attr('opacity', opacity);
      }
    });

    // 3. Render Custom Layer overlays based on active state selection
    // LAYER A: Live Transit Traffic is rendered as animated dots along the links (default view)
    if (activeLayer === 'traffic') {
      allLinks.forEach((link) => {
        const srcNode = NODES.find(n => n.id === link.source);
        const tgtNode = NODES.find(n => n.id === link.target);
        if (!srcNode || !tgtNode) return;

        const x1 = xScale(srcNode.lng);
        const y1 = yScale(srcNode.lat);
        const x2 = xScale(tgtNode.lng);
        const y2 = yScale(tgtNode.lat);

        const srcIdx = activePathNodes.indexOf(link.source);
        const tgtIdx = activePathNodes.indexOf(link.target);
        const isActiveLink = srcIdx !== -1 && tgtIdx !== -1 && Math.abs(srcIdx - tgtIdx) === 1;

        if (isActiveLink) {
          // Add discrete traffic particle dots floating on active link to symbolize telemetry flow
          g.append('circle')
            .attr('r', 2)
            .attr('fill', '#c7d2fe')
            .style('transform-origin', `${x1}px ${y1}px`)
            .append('animateMotion')
            .attr('path', `M ${x1} ${y1} L ${x2} ${y2}`)
            .attr('dur', '3s')
            .attr('repeatCount', 'indefinite');
        }
      });
    }

    // LAYER B: Critical Infrastructure Nodes radar rings & diagnostic metrics
    if (activeLayer === 'infra') {
      const criticalHubIds = ['yul', 'port', 'turcot', 'centre'];
      criticalHubIds.forEach(nodeId => {
        const node = NODES.find(n => n.id === nodeId);
        if (!node) return;
        const cx = xScale(node.lng);
        const cy = yScale(node.lat);

        // Add visual rotating radar rings for critical systems
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 18)
          .attr('fill', 'none')
          .attr('stroke', '#10b981')
          .attr('stroke-width', 0.8)
          .attr('stroke-dasharray', '3 3')
          .attr('opacity', 0.85)
          .style('transform-origin', `${cx}px ${cy}px`)
          .style('animation', 'spin 12s linear infinite');

        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 24)
          .attr('fill', 'none')
          .attr('stroke', '#34d399')
          .attr('stroke-width', 0.4)
          .attr('opacity', 0.35);

        // Subtitle status tag
        const capText = 
          nodeId === 'yul' ? 'SYS: ACTIVE • VOLS NOMINAUX' :
          nodeId === 'port' ? 'STABLE • FLUX FLUIDE' :
          nodeId === 'turcot' ? 'RADAR TÉLÉMÉTRIE' :
          'SOPHIA_MAIN_NODE_ONLINE';

        g.append('text')
          .attr('x', cx)
          .attr('y', cy + 18)
          .attr('text-anchor', 'middle')
          .attr('fill', '#34d399')
          .attr('font-size', '6px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('font-weight', 'bold')
          .text(capText);
      });
    }

    // LAYER C: Historical Congestion Zones red/orange overlays
    if (activeLayer === 'congestion') {
      const congestionPoints = [
        { id: 'turcot', radius: 42, label: 'ÉCHANGEUR TURCOT (ENGORGEMENT MOYEN)', factor: '1.6x' },
        { id: 'berri', radius: 34, label: 'BERRI-UQAM (HEURES DE POINTE)', factor: '1.9x' },
        { id: 'labatt', radius: 36, label: 'BOTTLE-NECK AVENUES LASALLE', factor: '1.4x' },
      ];

      congestionPoints.forEach(pt => {
        const node = NODES.find(n => n.id === pt.id);
        if (!node) return;
        const cx = xScale(node.lng);
        const cy = yScale(node.lat);

        // Translucent congestion circle bounds
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', pt.radius)
          .attr('fill', '#f97316')
          .attr('fill-opacity', 0.12)
          .attr('stroke', '#ea580c')
          .attr('stroke-width', 1.2)
          .attr('stroke-dasharray', '5 4')
          .attr('opacity', 0.8);

        // Small indicator pill
        g.append('rect')
          .attr('x', cx - 25)
          .attr('y', cy - pt.radius - 8)
          .attr('width', 50)
          .attr('height', 11)
          .attr('rx', 2)
          .attr('fill', '#7c2d12')
          .attr('stroke', '#ea580c')
          .attr('stroke-width', 0.8)
          .attr('opacity', 0.95);

        g.append('text')
          .attr('x', cx)
          .attr('y', cy - pt.radius)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fdba74')
          .attr('font-size', '6.5px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('font-weight', 'bold')
          .text(`DÉLAI ${pt.factor}`);
      });
    }

    // 4. Render all nodes in place
    NODES.forEach((node) => {
      const cx = xScale(node.lng);
      const cy = yScale(node.lat);

      const isActive = activePathNodes.includes(node.id);
      const isStart = node.id === origin;
      const isEnd = node.id === destination;
      const hasAlert = activeAlertsByNode[node.id];

      // Draw background pulse if has alert or is start/end
      if (hasAlert) {
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 16)
          .attr('fill', 'none')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.75)
          .attr('filter', 'url(#glow-alert)')
          .style('animation', 'd3-alert-pulse 2s infinite ease-in-out');
      } else if (isStart || isEnd) {
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 12)
          .attr('fill', 'none')
          .attr('stroke', isStart ? '#ef4444' : '#10b981')
          .attr('stroke-width', 1)
          .attr('opacity', 0.5)
          .style('animation', 'd3-alert-pulse 3s infinite ease-in-out');
      }

      // Base node circle
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', isStart || isEnd ? 6.5 : isActive ? 4.5 : 3.5)
        .attr('fill', hasAlert ? '#ef4444' : isStart ? '#f43f5e' : isEnd ? '#10b981' : node.color)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .attr('class', 'transition-all duration-200 hover:scale-125')
        .on('mouseenter', (event) => {
          setHoveredNode(node);
          if (hasAlert) {
            setHoveredAlert(hasAlert);
          }
          const screenX = zoomTransformRef.current.k * cx + zoomTransformRef.current.x;
          const screenY = zoomTransformRef.current.k * cy + zoomTransformRef.current.y;
          setTooltipPos({ x: screenX, y: screenY - 10 });
        })
        .on('mouseleave', () => {
          setHoveredNode(null);
          setHoveredAlert(null);
        });

      // Label text for primary locations
      const showLabel = isStart || isEnd || node.type === 'HQ' || node.type === 'PORT' || node.type === 'AIRPORT' || hasAlert;
      if (showLabel) {
        g.append('text')
          .attr('x', cx)
          .attr('y', cy - (isStart || isEnd || hasAlert ? 10 : 7))
          .attr('text-anchor', 'middle')
          .attr('fill', isStart ? '#f43f5e' : isEnd ? '#10b981' : hasAlert ? '#ef4444' : '#94a3b8')
          .attr('font-size', isStart || isEnd ? '9px' : '7.5px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('font-weight', isStart || isEnd || hasAlert ? 'bold' : 'normal')
          .text(
            node.id === 'carrieres' ? 'ARRÊT LORIMIER / HOLT' : 
            node.id === 'labatt' ? '50 AVENUE LABATT' : 
            node.id === 'veronique' ? 'ARRÊT GEORGE-V (LACHINE)' : 
            node.id === 'centre' ? 'STATION BEAUDRY' : 
            node.id === 'yul' ? 'AÉROPORT TRUDEAU (YUL)' :
            node.id === 'port' ? 'PORT DE MONTRÉAL' :
            node.id === 'rosemont' ? 'STATION PAPINEAU' :
            node.id === 'berri' ? 'STATION BERRI-UQAM' :
            node.id === 'lionel_groulx' ? 'STATION LIONEL-GROULX' :
            node.id === 'jolicoeur' ? 'STATION JOLICOEUR' :
            node.id === 'angrignon' ? 'STATION ANGRIGNON' :
            node.name.toUpperCase()
          );
      }

      // Alert Warning Triangle overlaid
      if (hasAlert) {
        const triangleGroup = g.append('g')
          .attr('transform', `translate(${cx + 6}, ${cy - 6}) scale(0.65)`)
          .attr('cursor', 'pointer')
          .on('mouseenter', () => {
            setHoveredNode(node);
            setHoveredAlert(hasAlert);
            const screenX = zoomTransformRef.current.k * cx + zoomTransformRef.current.x;
            const screenY = zoomTransformRef.current.k * cy + zoomTransformRef.current.y;
            setTooltipPos({ x: screenX, y: screenY - 10 });
          })
          .on('mouseleave', () => {
            setHoveredNode(null);
            setHoveredAlert(null);
          });

        triangleGroup.append('path')
          .attr('d', 'M 0 -10 L 10 10 L -10 10 Z')
          .attr('fill', '#ef4444')
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 1.5);

        triangleGroup.append('text')
          .attr('x', 0)
          .attr('y', 8)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '8px')
          .attr('font-weight', 'bold')
          .text('!');
      }
    });

    // 5. Inject Dynamic CSS animation rules specifically for the dashboard paths
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @keyframes d3-map-dash {
        to {
          stroke-dashoffset: -20;
        }
      }
      @keyframes d3-map-dash-reverse {
        to {
          stroke-dashoffset: 20;
        }
      }
      @keyframes d3-alert-pulse {
        0% {
          transform: scale(0.9);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.15);
          opacity: 0.15;
          stroke-width: 3px;
        }
        100% {
          transform: scale(0.9);
          opacity: 0.8;
        }
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };

  }, [dimensions, activePathNodes, activeAlertsByNode, origin, destination, activeLayer]);

  // Method to capture map as high-resolution PNG image
  const captureMapAsPng = (downloadNow = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        if (!svgRef.current) return reject('No SVG found');
        const svgEl = svgRef.current;

        // Clone SVG to modify style for printing securely
        const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
        
        // Add solid dark background rect to avoid transparency
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', '#090d16');
        clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

        // Append explicit CSS styling inside cloned svg to ensure correct raster render
        const styleText = `
          @keyframes d3-map-dash { to { stroke-dashoffset: -20; } }
          @keyframes d3-map-dash-reverse { to { stroke-dashoffset: 20; } }
          @keyframes d3-alert-pulse {
            0% { transform: scale(0.9); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 0.15; stroke-width: 3px; }
            100% { transform: scale(0.9); opacity: 0.8; }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          text { font-family: 'JetBrains Mono', monospace; font-size: 7px; fill: #94a3b8; }
        `;
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = styleText;
        clonedSvg.appendChild(styleEl);

        const svgSerializer = new XMLSerializer();
        const svgString = svgSerializer.serializeToString(clonedSvg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        
        const blobURL = URL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
          try {
            const scaleMultiplier = 2; // High-resolution scale
            const canvas = document.createElement('canvas');
            canvas.width = dimensions.width * scaleMultiplier;
            canvas.height = dimensions.height * scaleMultiplier;
            const context = canvas.getContext('2d');
            
            if (context) {
              context.fillStyle = '#090d16';
              context.fillRect(0, 0, canvas.width, canvas.height);
              context.scale(scaleMultiplier, scaleMultiplier);
              context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
              
              const pngDataUrl = canvas.toDataURL('image/png');
              
              // Persist in localStorage for ToTReasoner PDF assembly
              localStorage.setItem('argus_last_map_png', pngDataUrl);
              
              if (downloadNow) {
                const downloadLink = document.createElement('a');
                downloadLink.href = pngDataUrl;
                downloadLink.download = `ARGUS-Map-Export-${Date.now()}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
              }
              
              resolve(pngDataUrl);
            } else {
              reject('Failed to initialize canvas 2D context');
            }
          } catch (err) {
            reject(err);
          } finally {
            URL.revokeObjectURL(blobURL);
          }
        };
        image.onerror = () => {
          reject('Rasterizing error');
          URL.revokeObjectURL(blobURL);
        };
        image.src = blobURL;
      } catch (e) {
        reject(e);
      }
    });
  };

  // Method to automatically Reset View (re-center & scale to envelope active route)
  const resetView = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const activeNodes = NODES.filter(n => activePathNodes.includes(n.id));
    if (activeNodes.length === 0) return;

    const { width, height } = dimensions;
    const minLng = -73.76;
    const maxLng = -73.50;
    const minLat = 45.41;
    const maxLat = 45.56;

    const xScale = d3.scaleLinear()
      .domain([minLng, maxLng])
      .range([40, width - 40]);

    const yScale = d3.scaleLinear()
      .domain([minLat, maxLat])
      .range([height - 50, 40]);

    const coords = activeNodes.map(n => [xScale(n.lng), yScale(n.lat)]);
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const dx = maxX - minX;
    const dy = maxY - minY;
    const x = (minX + maxX) / 2;
    const y = (minY + maxY) / 2;

    const scale = Math.max(0.6, Math.min(3, 0.85 / Math.max(dx / width, dy / height)));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        d3.select(svgRef.current).select('.map-content').attr('transform', event.transform);
        zoomTransformRef.current = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        };
        setTooltipZoom({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        });
      });

    svg.transition()
      .duration(900)
      .call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
  };

  // Keep background cache updated automatically whenever nodes or layer changes
  useEffect(() => {
    const timer = setTimeout(() => {
      captureMapAsPng(false).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [dimensions, activePathNodes, activeAlertsByNode, activeLayer, origin, destination]);

  return (
    <div 
      className="bg-slate-900/40 rounded-xl border border-slate-900 p-4 flex flex-col space-y-4 shadow-lg overflow-hidden font-sans relative"
      ref={containerRef}
      id="d3-transit-route-map-wrapper"
    >
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Visualisation Géospatiale D3
            </h3>
            <p className="text-[9.5px] text-slate-500 font-mono">
              CORRIDOR DE TRANSIT & SUPERPOSITION DES COMPOSANTS EN TEMPS RÉEL
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono">
          <div className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>ORIGINE</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>CIBLE</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-400">
            <span className="w-4 h-0.5 border-b border-dashed border-indigo-400" />
            <span>ITINÉRAIRE</span>
          </div>
        </div>
      </div>

      {/* Segmented Layer Toggle Bar & Action Commands */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-900/80 p-2 rounded-lg">
        <div className="flex flex-wrap items-center gap-1 text-[9.5px] font-mono">
          <span className="text-slate-500 mr-1">CALQUE :</span>
          <button
            onClick={() => setActiveLayer('traffic')}
            className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold transition-all border cursor-pointer ${
              activeLayer === 'traffic'
                ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-300'
            }`}
          >
            Trafic Transit
          </button>
          <button
            onClick={() => setActiveLayer('infra')}
            className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold transition-all border cursor-pointer ${
              activeLayer === 'infra'
                ? 'bg-emerald-600/15 border-emerald-500 text-emerald-300'
                : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-300'
            }`}
          >
            Infrastructures
          </button>
          <button
            onClick={() => setActiveLayer('congestion')}
            className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold transition-all border cursor-pointer ${
              activeLayer === 'congestion'
                ? 'bg-amber-600/15 border-amber-500 text-amber-300'
                : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-300'
            }`}
          >
            Surcharges Hist.
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={resetView}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded text-[9.5px] font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Recentre et zoome sur les trajectoires actives"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '7s' }} />
            <span>RESET VUE</span>
          </button>

          <button
            onClick={() => captureMapAsPng(true)}
            className="px-2.5 py-1 bg-indigo-950/50 hover:bg-indigo-950 border border-indigo-900/60 hover:border-indigo-800 text-indigo-300 hover:text-indigo-200 rounded text-[9.5px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Capturer l'état actuel de la carte en haute résolution PNG"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span>CAPTURE PNG</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative bg-slate-950/80 rounded-xl border border-slate-900 overflow-hidden flex items-center justify-center">
        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={dimensions.height}
          className="block select-none cursor-grab active:cursor-grabbing"
        />

        {/* Floating Controls Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 bg-slate-950/90 border border-slate-800 p-2 rounded-lg pointer-events-none font-mono text-[9px]">
          <div className="text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1 text-[8.5px]">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> FILTRE ACTIF : <span className="text-indigo-400 font-bold">{activeLayer.toUpperCase()}</span>
          </div>
          <div className="text-slate-300">Total Nœuds : <strong className="text-slate-100">{NODES.length}</strong></div>
          <div className="text-slate-300">Tronçons : <strong className="text-slate-100">{METRO_LINKS.length + BUS_ROAD_LINKS.length}</strong></div>
          <div className="text-slate-300">Alertes Actives : <strong className={Object.keys(activeAlertsByNode).length > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>{Object.keys(activeAlertsByNode).length}</strong></div>
        </div>

        {/* Live Vector Compass Icon Decoration */}
        <div className="absolute bottom-3 right-3 p-1.5 bg-slate-900/60 border border-slate-800/60 rounded-full text-slate-500">
          <Eye className="w-3.5 h-3.5 animate-pulse" />
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div 
            className="absolute bg-slate-950 border border-slate-800 rounded-lg p-2.5 shadow-2xl font-mono text-[10px] text-left pointer-events-none z-30"
            style={{
              left: `${Math.min(dimensions.width - 150, Math.max(10, tooltipPos.x - 70))}px`,
              top: `${Math.max(10, tooltipPos.y - 85)}px`,
              transform: 'translateY(-10px)'
            }}
          >
            <div className="font-bold text-slate-200 border-b border-slate-900 pb-1 mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hoveredNode.color }} />
              {hoveredNode.name}
            </div>
            
            {hoveredAlert ? (
              <div className="space-y-1 bg-rose-950/20 border border-rose-900/30 p-1.5 rounded">
                <div className="text-rose-400 font-bold flex items-center gap-1 text-[9px]">
                  <AlertTriangle className="w-3 h-3 shrink-0 text-rose-400" />
                  INCIDENT DÉTECTÉ :
                </div>
                <div className="text-rose-200 font-sans text-[10px] leading-tight">{hoveredAlert.title}</div>
                <div className="text-slate-400 text-[8.5px] mt-0.5 font-mono">{hoveredAlert.value}</div>
              </div>
            ) : (
              <div className="text-slate-400 text-[8.5px]">
                Coordonnées : {hoveredNode.lat.toFixed(4)}N, {hoveredNode.lng.toFixed(4)}W
                <div className="text-emerald-500 font-bold mt-1 uppercase text-[8px] tracking-wider">▲ STATUT SÉCURISÉ</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Narrative Footer */}
      <div className="bg-slate-950/25 border border-slate-900/60 rounded-xl p-3 flex items-start gap-2 text-left">
        <Navigation className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
          <strong className="text-indigo-300">Observation Réseau :</strong> Cette carte vectorielle D3 projette les corridors de transit de Montréal. Faites glisser pour vous déplacer et utilisez la molette pour zoomer. Les calques vous permettent de commuter entre le trafic actif, les infrastructures critiques et les congestions historiques.
        </p>
      </div>
    </div>
  );
};
