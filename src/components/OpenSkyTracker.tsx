/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { 
  Plane, 
  RefreshCw, 
  Compass, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  Pause, 
  Play, 
  SlidersHorizontal 
} from 'lucide-react';

export interface FlightVector {
  icao24: string;
  callsign: string;
  country: string;
  longitude: number;
  latitude: number;
  altitude: number; // meters
  onGround: boolean;
  velocity: number; // m/s
  heading: number; // degrees
  verticalRate: number; // m/s
  squawk: string;
}

interface OpenSkyTrackerProps {
  onSelectFlight?: (flight: FlightVector | null) => void;
  selectedFlight: FlightVector | null;
  onFlightsUpdate?: (flights: FlightVector[]) => void;
}

export function OpenSkyTracker({ onSelectFlight, selectedFlight, onFlightsUpdate }: OpenSkyTrackerProps) {
  const [flights, setFlights] = useState<FlightVector[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('Initialization...');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(15);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAltitudeFilter, setSelectedAltitudeFilter] = useState<'all' | 'ground' | 'low' | 'high'>('all');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vectors/live');
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        const flightList = result.flights || [];
        setFlights(flightList);
        if (onFlightsUpdate) {
          onFlightsUpdate(flightList);
        }
        setDataSource(result.source || 'OpenSky Network');
        setLastUpdated(new Date());
        setError(null);
        setRefreshCountdown(refreshIntervalSec);
      } else {
        throw new Error(result.error || 'Impossible de charger les données OpenSky');
      }
    } catch (err: any) {
      console.warn('Error fetching flights, utilizing local high-fidelity fallback simulator:', err);
      // Fallback locally to client-side flight simulation to avoid black/broken screen if iframe proxy fails
      const localFallbackFlights: FlightVector[] = [
        { icao24: "a0c000", callsign: "ACA345", country: "Canada", longitude: -73.61396, latitude: 45.54013, altitude: 11200, onGround: false, velocity: 220, heading: 65, verticalRate: -1.24, squawk: "1240" },
        { icao24: "a0c001", callsign: "AFR347", country: "France", longitude: -73.70354, latitude: 45.42532, altitude: 9400, onGround: false, velocity: 240, heading: 245, verticalRate: -2.96, squawk: "4502" },
        { icao24: "a0c002", callsign: "WJA104", country: "Canada", longitude: -73.52067, latitude: 45.48432, altitude: 3200, onGround: false, velocity: 120, heading: 60, verticalRate: -1.96, squawk: "7100" },
        { icao24: "a0c003", callsign: "DAL1422", country: "United States", longitude: -73.6547, latitude: 45.39652, altitude: 1220, onGround: false, velocity: 85, heading: 240, verticalRate: 0.84, squawk: "1200" },
        { icao24: "a0c004", callsign: "BAW94A", country: "United Kingdom", longitude: -73.58753, latitude: 45.518, altitude: 10400, onGround: false, velocity: 215, heading: 90, verticalRate: 2.87, squawk: "2114" }
      ];
      setFlights(localFallbackFlights);
      if (onFlightsUpdate) {
        onFlightsUpdate(localFallbackFlights);
      }
      setDataSource('Client-Side Simulation (Network offline)');
      setLastUpdated(new Date());
      setError(null);
      setRefreshCountdown(refreshIntervalSec);
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual refresh
  const handleManualRefresh = () => {
    fetchFlights();
  };

  // Manage Auto-Refresh Loop
  useEffect(() => {
    if (isAutoRefresh) {
      fetchFlights(); // initial fetch
      
      timerRef.current = setInterval(() => {
        fetchFlights();
      }, refreshIntervalSec * 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoRefresh, refreshIntervalSec]);

  // Manage Countdown Timer
  useEffect(() => {
    if (isAutoRefresh) {
      setRefreshCountdown(refreshIntervalSec);
      
      countdownRef.current = setInterval(() => {
        setRefreshCountdown((prev) => {
          if (prev <= 1) return refreshIntervalSec;
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isAutoRefresh, refreshIntervalSec]);

  // Flight Statistics Calculations
  const stats = {
    total: flights.length,
    onGround: flights.filter(f => f.onGround).length,
    airborne: flights.filter(f => !f.onGround).length,
    climbing: flights.filter(f => f.verticalRate > 0.5).length,
    descending: flights.filter(f => f.verticalRate < -0.5).length,
    avgVelocity: flights.length > 0 
      ? Math.round(flights.reduce((acc, f) => acc + f.velocity, 0) / flights.length * 3.6) // convert to km/h
      : 0,
    maxAltitude: flights.length > 0
      ? Math.round(Math.max(...flights.map(f => f.altitude)) * 3.28084) // convert to feet
      : 0
  };

  // Filter Flights
  const filteredFlights = flights.filter(flight => {
    // Search query
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === '' || 
      flight.callsign.toLowerCase().includes(query) ||
      flight.country.toLowerCase().includes(query) ||
      flight.squawk.includes(query) ||
      flight.icao24.toLowerCase().includes(query);

    // Altitude filter
    // high >= 6000m (~19,600 ft), low < 6000m, ground = onGround
    let matchesAlt = true;
    if (selectedAltitudeFilter === 'ground') {
      matchesAlt = flight.onGround || flight.altitude < 100;
    } else if (selectedAltitudeFilter === 'low') {
      matchesAlt = !flight.onGround && flight.altitude >= 100 && flight.altitude < 4000;
    } else if (selectedAltitudeFilter === 'high') {
      matchesAlt = !flight.onGround && flight.altitude >= 4000;
    }

    return matchesSearch && matchesAlt;
  });

  const getFlightStatusBadge = (flight: FlightVector) => {
    if (flight.onGround) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
          SOL
        </span>
      );
    }
    if (flight.verticalRate > 0.5) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-0.5">
          <ArrowUpRight className="w-2.5 h-2.5" /> MONTÉE
        </span>
      );
    }
    if (flight.verticalRate < -0.5) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
          <ArrowDownRight className="w-2.5 h-2.5" /> DESCENTE
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        CROISIÈRE
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full shadow-xl">
      {/* Header Panel */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-950 border border-sky-800 rounded">
              <Plane className="w-4 h-4 text-sky-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-slate-200 font-display font-bold text-sm tracking-wide">SUIVI OPENSKY TEMPS RÉEL</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase">{dataSource}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Play/Pause Auto-Refresh */}
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`p-1.5 rounded border transition-colors ${
                isAutoRefresh 
                  ? 'bg-slate-900 border-indigo-500/40 hover:bg-slate-800 text-indigo-400' 
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-500'
              }`}
              title={isAutoRefresh ? "Pause auto-refresh" : "Play auto-refresh"}
            >
              {isAutoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className={`p-1.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all flex items-center gap-1 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Rafraîchir maintenant"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sync Metadata & Countdown Bar */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-600" />
            <span>MÀJ: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}</span>
          </div>
          {isAutoRefresh && (
            <div className="flex items-center gap-1.5">
              <span>PROCHAIN CYCLE:</span>
              <span className="font-bold text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{refreshCountdown}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Mini KPIs Bar */}
      <div className="grid grid-cols-4 bg-slate-950/40 border-b border-slate-800 text-[10px] font-mono py-2 divide-x divide-slate-800 text-center">
        <div className="px-1.5">
          <p className="text-slate-500 leading-none">AÉRONEFS</p>
          <p className="text-sm font-bold text-slate-200 mt-1">{stats.total}</p>
        </div>
        <div className="px-1.5">
          <p className="text-slate-500 leading-none">VOLS ACTIFS</p>
          <p className="text-sm font-bold text-sky-400 mt-1">{stats.airborne}</p>
        </div>
        <div className="px-1.5">
          <p className="text-slate-500 leading-none">VIT. MOY</p>
          <p className="text-sm font-bold text-indigo-400 mt-1">{stats.avgVelocity} <span className="text-[8px] font-normal text-slate-500">km/h</span></p>
        </div>
        <div className="px-1.5">
          <p className="text-slate-500 leading-none">ALT. MAX</p>
          <p className="text-sm font-bold text-emerald-400 mt-1">{(stats.maxAltitude / 1000).toFixed(1)}k <span className="text-[8px] font-normal text-slate-500">ft</span></p>
        </div>
      </div>

      {/* Control Toggles: Search & Altitude */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtrer indicatif, pays, squawk..."
          className="w-full bg-slate-950 rounded border border-slate-800 focus:border-indigo-500 focus:outline-none py-1 px-2.5 text-xs text-slate-200 font-sans"
        />

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-500 flex items-center gap-1"><SlidersHorizontal className="w-2.5 h-2.5 text-slate-600" /> ALTITUDES:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedAltitudeFilter('all')}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                selectedAltitudeFilter === 'all' 
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' 
                  : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'
              }`}
            >
              TOUT
            </button>
            <button
              onClick={() => setSelectedAltitudeFilter('ground')}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                selectedAltitudeFilter === 'ground' 
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' 
                  : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'
              }`}
            >
              SOL
            </button>
            <button
              onClick={() => setSelectedAltitudeFilter('low')}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                selectedAltitudeFilter === 'low' 
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' 
                  : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'
              }`}
            >
              BASSE
            </button>
            <button
              onClick={() => setSelectedAltitudeFilter('high')}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                selectedAltitudeFilter === 'high' 
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-bold' 
                  : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-400'
              }`}
            >
              HAUTE
            </button>
          </div>
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-950/25 space-y-1.5 custom-scrollbar" style={{ minHeight: '200px', maxHeight: '420px' }}>
        {loading && flights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 font-mono text-xs gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
            <span>ACQUISITION DES SIGNAUX OPENSKY...</span>
          </div>
        ) : error && flights.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 py-8 text-center bg-slate-950/50 rounded border border-slate-900 text-slate-400 font-mono text-[10px] gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="text-slate-200 font-bold">ÉCHEC DE SYNCHRONISATION OPENSKY</span>
            <span>{error}</span>
            <button
              onClick={handleManualRefresh}
              className="mt-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
            >
              RÉESSAYER LA RECONNEXION
            </button>
          </div>
        ) : filteredFlights.length === 0 ? (
          <div className="text-center py-10 text-slate-600 font-mono text-[10px] uppercase">
            Aucun appareil ne correspond aux filtres
          </div>
        ) : (
          filteredFlights.map((flight) => {
            const isSelected = selectedFlight?.icao24 === flight.icao24;
            return (
              <div
                key={flight.icao24}
                onClick={() => onSelectFlight && onSelectFlight(isSelected ? null : flight)}
                className={`p-2.5 rounded-md border text-left cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-100 shadow-lg shadow-indigo-600/5' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                }`}
              >
                {/* Flight callsign and country */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <Plane className={`w-3.5 h-3.5 transform ${isSelected ? 'text-indigo-400 rotate-45 scale-110' : 'text-slate-500'} transition-transform`} />
                    <span className="font-display font-bold text-xs tracking-wider text-slate-100">{flight.callsign}</span>
                    <span className="text-[9px] font-mono text-slate-500">({flight.icao24.toUpperCase()})</span>
                  </div>
                  {getFlightStatusBadge(flight)}
                </div>

                {/* Country subtitle */}
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">{flight.country}</div>

                {/* Vector Metrics */}
                <div className="grid grid-cols-3 gap-1.5 mt-2 pt-1.5 border-t border-slate-950 text-[10px] font-mono text-slate-400">
                  <div>
                    <span className="text-[9px] text-slate-600 block leading-none">ALTITUDE :</span>
                    <span className="font-bold text-slate-300">
                      {flight.onGround ? '0 ft' : `${Math.round(flight.altitude * 3.28084).toLocaleString()} ft`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-600 block leading-none">VITESSE :</span>
                    <span className="font-bold text-slate-300">
                      {Math.round(flight.velocity * 3.6)} <span className="text-[8px] font-normal text-slate-500">km/h</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-600 block leading-none">CAP (DIR) :</span>
                    <span className="font-bold text-slate-300 flex items-center gap-0.5">
                      <Compass className="w-2.5 h-2.5 text-slate-500" style={{ transform: `rotate(${flight.heading}deg)` }} />
                      {flight.heading}°
                    </span>
                  </div>
                </div>

                {/* Expanded Details when selected */}
                {isSelected && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono space-y-1 text-slate-400 bg-slate-950/20 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="text-slate-600">SQUAWK CODE :</span>
                      <span className="text-slate-300 font-bold">{flight.squawk || '0000'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">VITESSE VERTICALE :</span>
                      <span className={`font-bold ${flight.verticalRate > 0 ? 'text-green-400' : flight.verticalRate < 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {flight.verticalRate > 0 ? '+' : ''}{flight.verticalRate.toFixed(1)} m/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">LATITUDE :</span>
                      <span className="text-slate-300">{flight.latitude.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">LONGITUDE :</span>
                      <span className="text-slate-300">{flight.longitude.toFixed(5)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Help */}
      <div className="bg-slate-950 p-2.5 border-t border-slate-800 text-center text-[9px] font-mono text-slate-600">
        CLIQUER SUR UN APPAREIL POUR L'ANALYSER OU LE CIBLER
      </div>
    </div>
  );
}
