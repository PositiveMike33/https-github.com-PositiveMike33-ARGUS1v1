/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { GitCommit, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface StmNetworkTopologyProps {
  stmLiveStatus: any;
}

interface StationNode {
  id: string;
  name: string;
  x: number;
  y: number;
  line: 'verte' | 'orange' | 'bleue' | 'jaune';
  isHub?: boolean;
  isCritical?: boolean;
  statusMessage?: string;
}

export const StmNetworkTopology: React.FC<StmNetworkTopologyProps> = ({ stmLiveStatus }) => {
  // Extract active statuses for lines
  const lineStatuses = useMemo(() => {
    return {
      verte: stmLiveStatus?.lines?.verte?.status || 'normal',
      orange: stmLiveStatus?.lines?.orange?.status || 'normal',
      bleue: stmLiveStatus?.lines?.bleue?.status || 'normal',
      jaune: stmLiveStatus?.lines?.jaune?.status || 'normal',
    };
  }, [stmLiveStatus]);

  // Define color mapping
  const colors = {
    verte: '#10b981', // Emerald
    orange: '#f97316', // Orange
    bleue: '#3b82f6', // Blue
    jaune: '#eab308', // Yellow
  };

  // Define stations with normalized topological coordinates
  const stationsData = useMemo(() => {
    // Check if lines are degraded
    const isVerteDegraded = lineStatuses.verte !== 'normal';
    const isOrangeDegraded = lineStatuses.orange !== 'normal';
    const isBleueDegraded = lineStatuses.bleue !== 'normal';
    const isJauneDegraded = lineStatuses.jaune !== 'normal';

    const rawNodes: StationNode[] = [
      // Ligne Verte (Green)
      { id: 'v1', name: 'Angrignon', x: 1.0, y: 1.5, line: 'verte', isCritical: isVerteDegraded },
      { id: 'v2', name: 'Jolicoeur', x: 2.0, y: 2.5, line: 'verte', isCritical: isVerteDegraded, statusMessage: isVerteDegraded ? 'Zone perturbée (Ralentissement Jolicoeur)' : undefined },
      { id: 'v3', name: 'Lionel-Groulx', x: 3.0, y: 3.5, line: 'verte', isHub: true, isCritical: isVerteDegraded || isOrangeDegraded },
      { id: 'v4', name: 'Place-des-Arts', x: 5.0, y: 4.5, line: 'verte', isCritical: isVerteDegraded },
      { id: 'v5', name: 'Berri-UQAM', x: 6.2, y: 5.0, line: 'verte', isHub: true, isCritical: isVerteDegraded || isOrangeDegraded || isJauneDegraded },
      { id: 'v6', name: 'Honoré-Beaugrand', x: 9.0, y: 6.8, line: 'verte', isCritical: isVerteDegraded },

      // Ligne Orange (Orange)
      { id: 'o1', name: 'Côte-Vertu', x: 1.0, y: 7.0, line: 'orange', isCritical: isOrangeDegraded },
      { id: 'o2', name: 'Snowdon', x: 1.8, y: 5.5, line: 'orange', isHub: true, isCritical: isOrangeDegraded || isBleueDegraded },
      { id: 'o3', name: 'Lionel-Groulx (Hub)', x: 3.0, y: 3.5, line: 'orange', isHub: true, isCritical: isVerteDegraded || isOrangeDegraded },
      { id: 'o4', name: 'Square-Victoria', x: 4.8, y: 3.8, line: 'orange', isCritical: isOrangeDegraded },
      { id: 'o5', name: 'Berri-UQAM (Hub)', x: 6.2, y: 5.0, line: 'orange', isHub: true, isCritical: isVerteDegraded || isOrangeDegraded || isJauneDegraded },
      { id: 'o6', name: 'Jean-Talon', x: 5.8, y: 7.5, line: 'orange', isHub: true, isCritical: isOrangeDegraded || isBleueDegraded },
      { id: 'o7', name: 'Montmorency', x: 4.2, y: 9.5, line: 'orange', isCritical: isOrangeDegraded },

      // Ligne Bleue (Blue)
      { id: 'b1', name: 'Snowdon (Hub)', x: 1.8, y: 5.5, line: 'bleue', isHub: true, isCritical: isOrangeDegraded || isBleueDegraded },
      { id: 'b2', name: 'Université-de-Montréal', x: 3.5, y: 6.5, line: 'bleue', isCritical: isBleueDegraded },
      { id: 'b3', name: 'Jean-Talon (Hub)', x: 5.8, y: 7.5, line: 'bleue', isHub: true, isCritical: isOrangeDegraded || isBleueDegraded },
      { id: 'b4', name: 'Saint-Michel', x: 7.8, y: 8.5, line: 'bleue', isCritical: isBleueDegraded },

      // Ligne Jaune (Yellow)
      { id: 'j1', name: 'Berri-UQAM (Hub)', x: 6.2, y: 5.0, line: 'jaune', isHub: true, isCritical: isVerteDegraded || isOrangeDegraded || isJauneDegraded },
      { id: 'j2', name: 'Longueuil-Uni-Sherbrooke', x: 8.2, y: 3.8, line: 'jaune', isCritical: isJauneDegraded },
    ];

    return rawNodes;
  }, [lineStatuses]);

  // Group stations by line for individual track plotting
  const lineTracks = useMemo(() => {
    return {
      verte: stationsData.filter(s => s.line === 'verte'),
      orange: stationsData.filter(s => s.line === 'orange'),
      bleue: stationsData.filter(s => s.line === 'bleue'),
      jaune: stationsData.filter(s => s.line === 'jaune'),
    };
  }, [stationsData]);

  // Determine if there is any critical alert in the network
  const networkHasCritical = useMemo(() => {
    return Object.values(lineStatuses).some(status => status !== 'normal');
  }, [lineStatuses]);

  // Custom Node shape renderer
  const renderNodeShape = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    const isHub = payload.isHub;
    const isCritical = payload.isCritical;
    const lineColor = colors[payload.line as keyof typeof colors] || '#94a3b8';

    if (isHub) {
      return (
        <g>
          {/* Pulsing indicator for degraded Hubs */}
          {isCritical && (
            <circle
              cx={cx}
              cy={cy}
              r={11}
              fill="none"
              stroke="#ef4444"
              strokeWidth={1.5}
              className="animate-ping opacity-65"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          )}
          <circle
            cx={cx}
            cy={cy}
            r={7.5}
            fill="#0f172a"
            stroke={isCritical ? '#f97316' : '#ffffff'}
            strokeWidth={2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={3.5}
            fill={isCritical ? '#ef4444' : '#6366f1'}
          />
        </g>
      );
    }

    return (
      <g>
        {isCritical && (
          <circle
            cx={cx}
            cy={cy}
            r={7}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1}
            className="animate-pulse"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={lineColor}
          stroke="#0f172a"
          strokeWidth={1.5}
          className={isCritical ? 'animate-pulse' : ''}
        />
      </g>
    );
  };

  return (
    <div 
      className="bg-slate-950/80 rounded-lg border border-slate-800 p-3.5 space-y-2 flex flex-col justify-between h-full min-h-[170px]"
      id="stm-network-topology-container"
    >
      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
        <div className="flex items-center gap-1.5">
          <GitCommit className={`w-3.5 h-3.5 ${networkHasCritical ? 'text-amber-500 animate-spin' : 'text-emerald-400'}`} style={{ animationDuration: networkHasCritical ? '10s' : '0s' }} />
          <span className="text-[10px] font-mono font-bold text-slate-300 tracking-wider">
            TOPOLOGIE DU RÉSEAU & FLUX LIVE
          </span>
        </div>
        
        {/* Network global health status badge */}
        <div className="flex items-center gap-1">
          {networkHasCritical ? (
            <span className="flex items-center gap-1 text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-2.5 h-2.5" />
              <span>NŒUDS CRITIQUES</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>INTÉGRITÉ 100%</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Graph Visualization using Recharts */}
      <div className="h-[120px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <XAxis type="number" dataKey="x" name="X" domain={[0, 10]} hide />
            <YAxis type="number" dataKey="y" name="Y" domain={[0, 10]} hide />
            <ZAxis type="number" range={[10, 10]} />
            
            {/* Tooltip with custom styling */}
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#334155', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as StationNode;
                  const lineColor = colors[data.line] || '#94a3b8';
                  const lineLabel = `Ligne ${data.line.charAt(0).toUpperCase() + data.line.slice(1)}`;
                  const nodeStatus = lineStatuses[data.line];
                  
                  return (
                    <div className="bg-slate-950 border border-slate-800 rounded-md p-2 shadow-2xl text-[9px] font-mono max-w-[190px] space-y-1">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1 font-bold text-slate-100">
                        <span>{data.name}</span>
                        {data.isHub && <span className="text-[7px] bg-indigo-950 text-indigo-400 border border-indigo-500/20 px-1 rounded">HUB</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lineColor }} />
                        <span>{lineLabel}</span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-slate-500">Statut :</span>
                        <span className={`font-bold ${nodeStatus === 'normal' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                          {nodeStatus === 'normal' ? 'NOMINAL' : nodeStatus === 'delay' ? 'RALENTISSEMENT' : 'PERTURBATION'}
                        </span>
                      </div>
                      {data.statusMessage && (
                        <div className="text-[8px] text-red-400 border-t border-slate-900 pt-1 mt-1 leading-normal italic">
                          {data.statusMessage}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Tracks / Connected lines */}
            <Scatter
              name="Ligne Verte"
              data={lineTracks.verte}
              fill={colors.verte}
              line={{ stroke: colors.verte, strokeWidth: 2, strokeOpacity: lineStatuses.verte === 'normal' ? 0.7 : 0.9 }}
              lineType="joint"
              shape={renderNodeShape}
            />
            <Scatter
              name="Ligne Orange"
              data={lineTracks.orange}
              fill={colors.orange}
              line={{ stroke: colors.orange, strokeWidth: 2, strokeOpacity: lineStatuses.orange === 'normal' ? 0.7 : 0.9 }}
              lineType="joint"
              shape={renderNodeShape}
            />
            <Scatter
              name="Ligne Bleue"
              data={lineTracks.bleue}
              fill={colors.bleue}
              line={{ stroke: colors.bleue, strokeWidth: 2, strokeOpacity: lineStatuses.bleue === 'normal' ? 0.7 : 0.9 }}
              lineType="joint"
              shape={renderNodeShape}
            />
            <Scatter
              name="Ligne Jaune"
              data={lineTracks.jaune}
              fill={colors.jaune}
              line={{ stroke: colors.jaune, strokeWidth: 2, strokeOpacity: lineStatuses.jaune === 'normal' ? 0.7 : 0.9 }}
              lineType="joint"
              shape={renderNodeShape}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Mini interactive legend */}
      <div className="flex items-center justify-between border-t border-slate-900 pt-1.5 text-[8px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Verte</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-slate-400">Orange</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-slate-400">Bleue</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="text-slate-400">Jaune</span>
          </span>
        </div>
        <span className="text-indigo-400 text-[7px] tracking-widest uppercase">HUD TÉLÉMÉTRIQUE</span>
      </div>
    </div>
  );
};
