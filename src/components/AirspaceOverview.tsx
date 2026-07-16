/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FlightVector } from './OpenSkyTracker';
import { Layers, Maximize2, Compass, AlertCircle, HelpCircle } from 'lucide-react';

interface AirspaceOverviewProps {
  flights: FlightVector[];
  selectedFlight: FlightVector | null;
  onSelectFlight?: (flight: FlightVector | null) => void;
}

export function AirspaceOverview({ flights, selectedFlight, onSelectFlight }: AirspaceOverviewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Toggles and views
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [selectedAltLayer, setSelectedAltLayer] = useState<'all' | 'cruise' | 'approach' | 'ground'>('all');
  const [dimensions, setDimensions] = useState({ width: 600, height: 420 });

  // Handle ResizeObserver to keep canvas fluid
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 400),
          height: Math.max(height, 420)
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Airspace sector bounding box around Montreal / Ottawa FIR
  const bounds = {
    minLat: 44.0,
    maxLat: 47.5,
    minLon: -76.0,
    maxLon: -71.0
  };

  // Static elements of the sector map to draw (Approach lanes, CYUL airport, waypoints)
  const waypoints = [
    { name: 'YUL VOR', lat: 45.47, lon: -73.74, type: 'airport' },
    { name: 'MIRABEL', lat: 45.68, lon: -74.04, type: 'fix' },
    { name: 'HABBS', lat: 45.22, lon: -73.95, type: 'fix' },
    { name: 'ST-JEAN', lat: 45.30, lon: -73.28, type: 'fix' },
    { name: 'SCOTT', lat: 45.65, lon: -73.18, type: 'fix' },
    { name: 'OTTAWA', lat: 45.32, lon: -75.67, type: 'airport' }
  ];

  const airspaceLanes = [
    { from: { lat: 45.32, lon: -75.67 }, to: { lat: 45.47, lon: -73.74 }, label: 'V302' }, // Ottawa to CYUL
    { from: { lat: 45.68, lon: -74.04 }, to: { lat: 45.47, lon: -73.74 }, label: 'A88' },  // Mirabel to CYUL
    { from: { lat: 45.22, lon: -73.95 }, to: { lat: 45.47, lon: -73.74 }, label: 'STAR' }, // HABBS approach
    { from: { lat: 45.30, lon: -73.28 }, to: { lat: 45.47, lon: -73.74 }, label: 'J509' }, // St-Jean arrival
    { from: { lat: 45.65, lon: -73.18 }, to: { lat: 45.47, lon: -73.74 }, label: 'T208' }  // Scott lane
  ];

  // Helper to categorize flights into altitude buckets
  const getFlightAltitudeCategory = (altMeters: number, onGround: boolean): 'ground' | 'approach' | 'cruise' => {
    if (onGround || altMeters < 300) return 'ground'; // under ~1000 ft
    if (altMeters < 5000) return 'approach'; // ~1000 to ~16400 ft
    return 'cruise'; // above 16400 ft
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear canvas

    const { width, height } = dimensions;

    // Define 2D Scales
    const xScale = d3.scaleLinear()
      .domain([bounds.minLon, bounds.maxLon])
      .range([40, width - 40]);

    const yScale = d3.scaleLinear()
      .domain([bounds.minLat, bounds.maxLat])
      .range([height - 50, 40]); // inverted for SVG coordinates

    // 3D Isometric mapping helpers
    // Centers the layers in the canvas and gives them a angled look
    const project3D = (lat: number, lon: number, layer: 'ground' | 'approach' | 'cruise') => {
      // Scale coordinates to a normalized [0, 1] range relative to bounding box
      const pctX = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
      const pctY = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);

      // Card width/height inside the skewed grid
      const cardW = width * 0.55;
      const cardH = height * 0.28;

      // Base translation coordinates for each altitude shelf
      // Stacked vertically: Cruise is high, Approach is mid, Ground is bottom
      let baseCenterY = height * 0.5;
      let layerOffset = 0;

      if (layer === 'cruise') {
        layerOffset = -height * 0.23;
      } else if (layer === 'approach') {
        layerOffset = -height * 0.01;
      } else if (layer === 'ground') {
        layerOffset = height * 0.21;
      }

      // Isometric projection mathematics:
      // x increases to the right-down, y increases to the left-down
      const isoX = width * 0.5 + (pctX - 0.5) * cardW - (pctY - 0.5) * cardW * 0.5;
      const isoY = baseCenterY + (pctY - 0.5) * cardH + (pctX - 0.5) * cardH * 0.3 + layerOffset;

      return { x: isoX, y: isoY };
    };

    // Filters flights based on Selected Altitude Layer
    const filteredFlights = flights.filter(f => {
      if (selectedAltLayer === 'all') return true;
      const cat = getFlightAltitudeCategory(f.altitude, f.onGround);
      return cat === selectedAltLayer;
    });

    // 1. Draw Background Grid and Gradients
    const defs = svg.append('defs');
    
    // Ambient glow filters for aircraft and waypoints
    const glowFilter = defs.append('filter')
      .attr('id', 'radar-glow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    glowFilter.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    const blueGlow = defs.append('filter')
      .attr('id', 'blue-glow');
    blueGlow.append('feGaussianBlur')
      .attr('stdDeviation', '6')
      .attr('result', 'blur');

    // Layer card masks
    const layerGradient = defs.append('linearGradient')
      .attr('id', 'layer-glass')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    layerGradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(15, 23, 42, 0.4)');
    layerGradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(30, 41, 59, 0.1)');

    // Render Canvas depending on Mode (2D flat vs 3D isometric stacked)
    if (viewMode === '2d') {
      // RENDER FLAT 2D RADAR GRID
      
      // Airspace circles
      const radiusGroup = svg.append('g').attr('class', 'radar-circles');
      const centerX = xScale((bounds.minLon + bounds.maxLon) / 2);
      const centerY = yScale((bounds.minLat + bounds.maxLat) / 2);

      [80, 160, 240, 320].forEach(r => {
        radiusGroup.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(79, 70, 229, 0.15)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
          
        radiusGroup.append('text')
          .attr('x', centerX + r + 5)
          .attr('y', centerY - 4)
          .attr('fill', 'rgba(99, 102, 241, 0.35)')
          .attr('font-size', '8px')
          .attr('font-family', 'monospace')
          .text(`${r * 0.5} NM`);
      });

      // Axis lines
      radiusGroup.append('line')
        .attr('x1', 30).attr('y1', centerY)
        .attr('x2', width - 30).attr('y2', centerY)
        .attr('stroke', 'rgba(79, 70, 229, 0.1)')
        .attr('stroke-width', 1);

      radiusGroup.append('line')
        .attr('x1', centerX).attr('y1', 30)
        .attr('x2', centerX).attr('y2', height - 30)
        .attr('stroke', 'rgba(79, 70, 229, 0.1)')
        .attr('stroke-width', 1);

      // Airspace lanes
      const lanesG = svg.append('g').attr('class', 'airspace-lanes');
      airspaceLanes.forEach(lane => {
        const x1 = xScale(lane.from.lon);
        const y1 = yScale(lane.from.lat);
        const x2 = xScale(lane.to.lon);
        const y2 = yScale(lane.to.lat);

        lanesG.append('line')
          .attr('x1', x1).attr('y1', y1)
          .attr('x2', x2).attr('y2', y2)
          .attr('stroke', 'rgba(99, 102, 241, 0.22)')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5');

        // Draw lane midpoint label
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        lanesG.append('text')
          .attr('x', mx)
          .attr('y', my - 4)
          .attr('fill', 'rgba(99, 102, 241, 0.4)')
          .attr('font-size', '8px')
          .attr('font-family', 'monospace')
          .attr('text-anchor', 'middle')
          .text(lane.label);
      });

      // Airspace waypoints / airports
      const waypointsG = svg.append('g').attr('class', 'waypoints');
      waypoints.forEach(wp => {
        const x = xScale(wp.lon);
        const y = yScale(wp.lat);

        if (wp.type === 'airport') {
          waypointsG.append('rect')
            .attr('x', x - 6)
            .attr('y', y - 6)
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(14, 165, 233)')
            .attr('stroke-width', 1.5);
          waypointsG.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 2)
            .attr('fill', 'rgb(14, 165, 233)');
        } else {
          waypointsG.append('polygon')
            .attr('points', `${x},${y - 5} ${x - 4.5},${y + 3} ${x + 4.5},${y + 3}`)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(148, 163, 184, 0.5)')
            .attr('stroke-width', 1.2);
        }

        waypointsG.append('text')
          .attr('x', x)
          .attr('y', y + 15)
          .attr('fill', wp.type === 'airport' ? 'rgb(14, 165, 233)' : 'rgba(148, 163, 184, 0.6)')
          .attr('font-size', '8px')
          .attr('font-family', 'monospace')
          .attr('text-anchor', 'middle')
          .text(wp.name);
      });

      // Plot Flight Nodes
      const flightNodesG = svg.append('g').attr('class', 'flights');
      filteredFlights.forEach(flight => {
        const x = xScale(flight.longitude);
        const y = yScale(flight.latitude);
        const isSelected = selectedFlight?.icao24 === flight.icao24;

        // Visual indicator colors based on altitude
        const color = flight.onGround 
          ? 'rgb(154, 163, 177)' 
          : flight.altitude < 4000 
            ? 'rgb(244, 63, 94)'  // Rose red
            : 'rgb(99, 102, 241)';  // Indigo blue

        // Ripple glowing ring for selected flight
        if (isSelected) {
          flightNodesG.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 16)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.6)
            .attr('class', 'animate-ping')
            .style('transform-origin', `${x}px ${y}px`);
        }

        // Base anchor point
        flightNodesG.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', isSelected ? 5.5 : 4)
          .attr('fill', color)
          .attr('stroke', 'rgb(15, 23, 42)')
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#radar-glow)')
          .style('cursor', 'pointer')
          .on('click', () => onSelectFlight && onSelectFlight(isSelected ? null : flight));

        // Heading direction pointer line
        const headRad = ((flight.heading - 90) * Math.PI) / 180;
        const pointerLen = isSelected ? 16 : 10;
        flightNodesG.append('line')
          .attr('x1', x)
          .attr('y1', y)
          .attr('x2', x + Math.cos(headRad) * pointerLen)
          .attr('y2', y + Math.sin(headRad) * pointerLen)
          .attr('stroke', color)
          .attr('stroke-width', 1.5);

        // Text labels for flight tracking parameters
        const labelGroup = flightNodesG.append('g')
          .attr('transform', `translate(${x + 10}, ${y - 4})`)
          .style('cursor', 'pointer')
          .on('click', () => onSelectFlight && onSelectFlight(isSelected ? null : flight));

        labelGroup.append('text')
          .attr('x', 0)
          .attr('y', 0)
          .attr('fill', isSelected ? '#ffffff' : 'rgba(241, 245, 249, 0.85)')
          .attr('font-size', isSelected ? '10px' : '9px')
          .attr('font-family', 'sans-serif')
          .attr('font-weight', isSelected ? 'bold' : 'normal')
          .text(flight.callsign);

        labelGroup.append('text')
          .attr('x', 0)
          .attr('y', 9)
          .attr('fill', 'rgba(148, 163, 184, 0.7)')
          .attr('font-size', '8px')
          .attr('font-family', 'monospace')
          .text(`${Math.round(flight.altitude * 3.28084 / 100)}FL / ${Math.round(flight.velocity * 3.6)}kmh`);
      });

    } else {
      // RENDER STACKED ISOMETRIC 3D AIRSPACE SHELVES
      const layers: Array<'cruise' | 'approach' | 'ground'> = ['ground', 'approach', 'cruise'];
      
      // Bounding polygon skewed for each isometric card
      const getCardPoints = (layer: 'ground' | 'approach' | 'cruise') => {
        const p1 = project3D(bounds.minLat, bounds.minLon, layer);
        const p2 = project3D(bounds.minLat, bounds.maxLon, layer);
        const p3 = project3D(bounds.maxLat, bounds.maxLon, layer);
        const p4 = project3D(bounds.maxLat, bounds.minLon, layer);
        return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
      };

      // 1. Draw connecting vertical guides for bounding corners
      const cornerGuidGroup = svg.append('g').attr('class', 'guidelines');
      const corners = [
        { lat: bounds.minLat, lon: bounds.minLon },
        { lat: bounds.minLat, lon: bounds.maxLon },
        { lat: bounds.maxLat, lon: bounds.maxLon },
        { lat: bounds.maxLat, lon: bounds.minLon }
      ];

      corners.forEach(corner => {
        const pGround = project3D(corner.lat, corner.lon, 'ground');
        const pCruise = project3D(corner.lat, corner.lon, 'cruise');

        cornerGuidGroup.append('line')
          .attr('x1', pGround.x).attr('y1', pGround.y)
          .attr('x2', pCruise.x).attr('y2', pCruise.y)
          .attr('stroke', 'rgba(148, 163, 184, 0.12)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
      });

      // 2. Render each shelf card layer step-by-step
      layers.forEach((layer) => {
        const isLayerFilteredOut = selectedAltLayer !== 'all' && selectedAltLayer !== layer;
        
        const layerG = svg.append('g')
          .attr('class', `layer-${layer}`)
          .attr('opacity', isLayerFilteredOut ? 0.15 : 1.0);

        // Draw isometric skewed glass card
        layerG.append('polygon')
          .attr('points', getCardPoints(layer))
          .attr('fill', 'url(#layer-glass)')
          .attr('stroke', isLayerFilteredOut ? 'rgba(79, 70, 229, 0.1)' : 'rgba(99, 102, 241, 0.28)')
          .attr('stroke-width', isLayerFilteredOut ? 0.8 : 1.5)
          .attr('class', 'transition-all');

        // Draw small gridlines on the glass cards
        const cardG = layerG.append('g').attr('class', 'layer-grid');
        for (let l = 0.2; l < 1.0; l += 0.2) {
          const latL = bounds.minLat + l * (bounds.maxLat - bounds.minLat);
          const pStart1 = project3D(latL, bounds.minLon, layer);
          const pEnd1 = project3D(latL, bounds.maxLon, layer);

          cardG.append('line')
            .attr('x1', pStart1.x).attr('y1', pStart1.y)
            .attr('x2', pEnd1.x).attr('y2', pEnd1.y)
            .attr('stroke', 'rgba(99, 102, 241, 0.05)')
            .attr('stroke-width', 0.5);

          const lonL = bounds.minLon + l * (bounds.maxLon - bounds.minLon);
          const pStart2 = project3D(bounds.minLat, lonL, layer);
          const pEnd2 = project3D(bounds.maxLat, lonL, layer);

          cardG.append('line')
            .attr('x1', pStart2.x).attr('y1', pStart2.y)
            .attr('x2', pEnd2.x).attr('y2', pEnd2.y)
            .attr('stroke', 'rgba(99, 102, 241, 0.05)')
            .attr('stroke-width', 0.5);
        }

        // Draw Layer Labels in Isometric projection corners
        const labelP = project3D(bounds.minLat, bounds.minLon, layer);
        layerG.append('text')
          .attr('x', labelP.x - 14)
          .attr('y', labelP.y + 4)
          .attr('fill', layer === 'cruise' ? 'rgb(129, 140, 248)' : layer === 'approach' ? 'rgb(244, 63, 94)' : 'rgb(148, 163, 184)')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .attr('text-anchor', 'end')
          .text(
            layer === 'cruise' ? 'NIVEAU DE CROISIÈRE (>16k ft)' :
            layer === 'approach' ? 'SECTEUR D\'APPROCHE (1k-16k ft)' :
            'OPÉRATIONS AU SOL'
          );

        // Draw sector flight routes in 3D (Approach lanes drawn on mid/bottom card depending on route)
        if (layer === 'approach' || layer === 'ground') {
          airspaceLanes.forEach(lane => {
            const p1 = project3D(lane.from.lat, lane.from.lon, layer);
            const p2 = project3D(lane.to.lat, lane.to.lon, layer);

            layerG.append('line')
              .attr('x1', p1.x).attr('y1', p1.y)
              .attr('x2', p2.x).attr('y2', p2.y)
              .attr('stroke', 'rgba(99, 102, 241, 0.12)')
              .attr('stroke-width', 1)
              .attr('stroke-dasharray', '4,4');
          });

          waypoints.forEach(wp => {
            const p = project3D(wp.lat, wp.lon, layer);
            
            if (wp.type === 'airport') {
              layerG.append('polygon')
                .attr('points', `${p.x},${p.y - 3} ${p.x + 4.5},${p.y + 1} ${p.x},${p.y + 4} ${p.x - 4.5},${p.y + 1}`)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(14, 165, 233, 0.4)')
                .attr('stroke-width', 1.2);
            } else {
              layerG.append('circle')
                .attr('cx', p.x)
                .attr('cy', p.y)
                .attr('r', 1.5)
                .attr('fill', 'rgba(148, 163, 184, 0.3)');
            }
          });
        }
      });

      // 3. Draw Aircraft nodes onto their actual physical shelf layer based on their real altitude
      const flightNodesG = svg.append('g').attr('class', 'flights-3d');
      
      // Sort flights so ground flights draw first (back to front sorting prevents visual clipping issues)
      const sortedFlights = [...flights].sort((a, b) => {
        const catA = getFlightAltitudeCategory(a.altitude, a.onGround);
        const catB = getFlightAltitudeCategory(b.altitude, b.onGround);
        if (catA === catB) return 0;
        if (catA === 'ground') return -1;
        if (catB === 'ground') return 1;
        if (catA === 'approach') return -1;
        return 1;
      });

      sortedFlights.forEach(flight => {
        const isSelected = selectedFlight?.icao24 === flight.icao24;
        const flightLayer = getFlightAltitudeCategory(flight.altitude, flight.onGround);
        
        // Skip rendering if layer filter is selected and doesn't match
        if (selectedAltLayer !== 'all' && selectedAltLayer !== flightLayer) return;

        const pNode = project3D(flight.latitude, flight.longitude, flightLayer);
        
        // Calculate ground shadow point (projecting the plane onto the bottom ground sheet)
        const pShadow = project3D(flight.latitude, flight.longitude, 'ground');

        const color = flightLayer === 'ground' 
          ? 'rgb(154, 163, 177)' 
          : flightLayer === 'approach' 
            ? 'rgb(244, 63, 94)' 
            : 'rgb(99, 102, 241)';

        // Draw vertical dotted elevation line connecting the shadow position to the actual flight altitude node
        if (flightLayer !== 'ground') {
          flightNodesG.append('line')
            .attr('x1', pShadow.x).attr('y1', pShadow.y)
            .attr('x2', pNode.x).attr('y2', pNode.y)
            .attr('stroke', color)
            .attr('stroke-width', isSelected ? 1.5 : 0.8)
            .attr('stroke-dasharray', '2,2')
            .attr('opacity', isSelected ? 0.7 : 0.25);

          // Shadow on the ground layer
          flightNodesG.append('circle')
            .attr('cx', pShadow.x)
            .attr('cy', pShadow.y)
            .attr('r', 2)
            .attr('fill', 'rgba(15, 23, 42, 0.7)')
            .attr('stroke', 'rgba(148, 163, 184, 0.3)')
            .attr('stroke-width', 0.5);
        }

        // Ripple glowing ring for selected flight in 3D
        if (isSelected) {
          flightNodesG.append('circle')
            .attr('cx', pNode.x)
            .attr('cy', pNode.y)
            .attr('r', 14)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.7)
            .attr('class', 'animate-ping')
            .style('transform-origin', `${pNode.x}px ${pNode.y}px`);
        }

        // Active flight node ball
        flightNodesG.append('circle')
          .attr('cx', pNode.x)
          .attr('cy', pNode.y)
          .attr('r', isSelected ? 5.5 : 4)
          .attr('fill', color)
          .attr('stroke', 'rgb(15, 23, 42)')
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#radar-glow)')
          .style('cursor', 'pointer')
          .on('click', () => onSelectFlight && onSelectFlight(isSelected ? null : flight));

        // Display heading direction line skewed
        const headRad = ((flight.heading - 90) * Math.PI) / 180;
        const pointerLen = isSelected ? 14 : 9;
        
        // Calculate dynamic projection delta for heading vector in 3D
        const px = Math.cos(headRad) * pointerLen;
        const py = Math.sin(headRad) * pointerLen * 0.5; // squashed vertically for perspective
        
        flightNodesG.append('line')
          .attr('x1', pNode.x)
          .attr('y1', pNode.y)
          .attr('x2', pNode.x + px)
          .attr('y2', pNode.y + py)
          .attr('stroke', color)
          .attr('stroke-width', 1.5);

        // Aircraft tag description label
        const labelGroup = flightNodesG.append('g')
          .attr('transform', `translate(${pNode.x + 9}, ${pNode.y - 5})`)
          .style('cursor', 'pointer')
          .on('click', () => onSelectFlight && onSelectFlight(isSelected ? null : flight));

        labelGroup.append('text')
          .attr('x', 0)
          .attr('y', 0)
          .attr('fill', isSelected ? '#ffffff' : 'rgba(241, 245, 249, 0.85)')
          .attr('font-size', isSelected ? '10px' : '8.5px')
          .attr('font-family', 'sans-serif')
          .attr('font-weight', isSelected ? 'bold' : 'normal')
          .text(flight.callsign);

        labelGroup.append('text')
          .attr('x', 0)
          .attr('y', 8.5)
          .attr('fill', 'rgba(148, 163, 184, 0.65)')
          .attr('font-size', '7.5px')
          .attr('font-family', 'monospace')
          .text(`${Math.round(flight.altitude * 3.28084)}ft`);
      });
    }

  }, [flights, selectedFlight, viewMode, selectedAltLayer, dimensions]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full shadow-xl">
      {/* Header Panel */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-950 border border-indigo-800 rounded">
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-slate-200 font-display font-bold text-sm tracking-wide">MODÉLISATION DE L'ESPACE AÉRIEN D3</h3>
            <p className="text-[10px] text-slate-400 font-mono uppercase">PROJECTION GÉODÉSIQUE TERMINALE CYUL — {flights.length} TRACES</p>
          </div>
        </div>

        {/* Dimension / Perspective Controllers */}
        <div className="flex items-center gap-2">
          {/* Flat 2D Radar vs Stacked 3D Layer View */}
          <div className="bg-slate-900 border border-slate-800 p-0.5 rounded flex text-[10px] font-mono">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-0.5 rounded transition-colors ${viewMode === '2d' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              VUE RADAR 2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-0.5 rounded transition-colors ${viewMode === '3d' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              COUCHES 3D ISOMÉTRIQUES
            </button>
          </div>
        </div>
      </div>

      {/* Altitude Shelf Filters floating bar */}
      <div className="bg-slate-950/40 border-b border-slate-800 px-3 py-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-slate-600" />
          <span>CYUL TERMINAL TMA SECTOR STATUS</span>
        </div>

        <div className="flex gap-1.5 items-center">
          <span className="text-slate-500">FILTRER NIVEAU :</span>
          <button
            onClick={() => setSelectedAltLayer('all')}
            className={`px-1.5 py-0.5 rounded border ${selectedAltLayer === 'all' ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'}`}
          >
            TOUT
          </button>
          <button
            onClick={() => setSelectedAltLayer('cruise')}
            className={`px-1.5 py-0.5 rounded border ${selectedAltLayer === 'cruise' ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'}`}
          >
            HAUT
          </button>
          <button
            onClick={() => setSelectedAltLayer('approach')}
            className={`px-1.5 py-0.5 rounded border ${selectedAltLayer === 'approach' ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'}`}
          >
            MOYEN
          </button>
          <button
            onClick={() => setSelectedAltLayer('ground')}
            className={`px-1.5 py-0.5 rounded border ${selectedAltLayer === 'ground' ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'}`}
          >
            SOL
          </button>
        </div>
      </div>

      {/* Main D3 Graphic Visualizer */}
      <div 
        ref={containerRef} 
        className="flex-1 relative bg-slate-950 flex items-center justify-center p-2 min-h-[380px]"
        style={{ height: '420px' }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        />

        {/* 3D Hint overlay */}
        {viewMode === '3d' && (
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded p-2 text-[9px] font-mono text-slate-500 pointer-events-none max-w-[170px] space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-300 mb-0.5">
              <Layers className="w-2.5 h-2.5 text-indigo-400" />
              <span>COUCHES COGNITIVES :</span>
            </div>
            <div>- <span className="text-indigo-400 font-bold">Bleu</span>: Altitude Croisière</div>
            <div>- <span className="text-rose-400 font-bold">Rose</span>: Approches / Lancements</div>
            <div>- <span className="text-slate-400 font-bold">Gris</span>: Véhicules au sol</div>
            <div className="text-[8px] text-slate-600 mt-1 leading-normal">
              Les lignes pointillées représentent la projection verticale d'altitude de l'aéronef sur le sol.
            </div>
          </div>
        )}

        {/* Selected Flight Quick Read HUD overlay */}
        {selectedFlight && (
          <div className="absolute bottom-3 right-3 bg-slate-900/95 border border-indigo-500/30 rounded p-2.5 text-[10px] font-mono text-slate-300 max-w-[210px] shadow-lg flex flex-col gap-1 z-20">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
              <span className="font-bold text-slate-100 flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-indigo-400" />
                {selectedFlight.callsign}
              </span>
              <span className="text-[8px] text-slate-500 uppercase">TRACE ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ORIGINE :</span>
              <span className="text-slate-200">{selectedFlight.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ALTITUDE :</span>
              <span className="text-emerald-400 font-bold">{Math.round(selectedFlight.altitude * 3.28084).toLocaleString()} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VITESSE :</span>
              <span className="text-sky-400 font-bold">{Math.round(selectedFlight.velocity * 3.6)} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SQUAWK :</span>
              <span className="text-indigo-400">{selectedFlight.squawk || '7000'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom informational bar */}
      <div className="bg-slate-950 p-2 border-t border-slate-800 text-[9px] font-mono text-slate-600 flex items-center justify-between px-4">
        <span>VECTEURS PROJETÉS PAR D3 GEO-MAP PROJECTION</span>
        <span className="text-slate-500">DÉFILEZ POUR COMPARER LES COULOIRS LOGISTIQUES</span>
      </div>
    </div>
  );
}
