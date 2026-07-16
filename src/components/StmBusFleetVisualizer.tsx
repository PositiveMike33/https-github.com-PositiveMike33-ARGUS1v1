import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Bus, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StmBusFleetVisualizerProps {
  stmLiveStatus: any;
}

interface SectorData {
  name: string;
  activeBuses: number;
  punctuality: number; // percentage
  status: 'NOMINAL' | 'SATURÉ' | 'PERTURBÉ';
  color: string;
}

export const StmBusFleetVisualizer: React.FC<StmBusFleetVisualizerProps> = () => {
  // Sector stats for Montreal Bus network
  const sectorData: SectorData[] = useMemo(() => {
    return [
      { name: 'Centre', activeBuses: 142, punctuality: 94, status: 'NOMINAL', color: '#3b82f6' }, // Blue
      { name: 'Est', activeBuses: 98, punctuality: 88, status: 'NOMINAL', color: '#10b981' },   // Green
      { name: 'Ouest', activeBuses: 76, punctuality: 91, status: 'NOMINAL', color: '#6366f1' },  // Indigo
      { name: 'Nord', activeBuses: 114, punctuality: 81, status: 'PERTURBÉ', color: '#f59e0b' }, // Amber
      { name: 'Sud', activeBuses: 54, punctuality: 95, status: 'NOMINAL', color: '#ec4899' },   // Pink
    ];
  }, []);

  const totalBuses = sectorData.reduce((acc, curr) => acc + curr.activeBuses, 0);
  const avgPunctuality = Math.round(
    sectorData.reduce((acc, curr) => acc + curr.punctuality, 0) / sectorData.length
  );

  return (
    <div 
      className="bg-slate-950/80 rounded-lg border border-slate-800 p-3.5 space-y-2 flex flex-col justify-between h-full min-h-[170px]"
      id="stm-bus-visualizer-container"
    >
      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Bus className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-300 tracking-wider">
            FLOTTE DE BUS & PONCTUALITÉ PAR SECTEUR
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {avgPunctuality < 90 ? (
            <span className="flex items-center gap-1 text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>PERTURBATIONS MÉTÉO</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>INTÉGRITÉ FLOTTE</span>
            </span>
          )}
        </div>
      </div>

      {/* Recharts Bar Chart representing performance */}
      <div className="h-[120px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sectorData} margin={{ top: 8, right: 8, bottom: 0, left: -25 }}>
            <XAxis 
              dataKey="name" 
              stroke="#475569" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#475569" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false} 
              domain={[0, 100]} 
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              cursor={{ fill: '#1e293b', opacity: 0.3 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as SectorData;
                  return (
                    <div className="bg-slate-950 border border-slate-800 rounded-md p-2 shadow-2xl text-[9px] font-mono space-y-1">
                      <div className="border-b border-slate-900 pb-1 font-bold text-slate-100 uppercase">
                        Secteur {data.name}
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Bus Actifs :</span>
                        <span className="text-white font-semibold">{data.activeBuses}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ponctualité :</span>
                        <span className="font-bold text-blue-400">{data.punctuality}%</span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span>Statut :</span>
                        <span className={`font-bold ${data.status === 'NOMINAL' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                          {data.status}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="punctuality" radius={[4, 4, 0, 0]}>
              {sectorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-slate-900 pt-1.5 text-[8px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span>Total Actifs : <strong className="text-slate-300">{totalBuses} Bus</strong></span>
          <span>Moy. Ponctualité : <strong className="text-blue-400">{avgPunctuality}%</strong></span>
        </div>
        <span className="text-blue-400 text-[7px] tracking-widest uppercase">MONITOR FLOTTE</span>
      </div>
    </div>
  );
};
