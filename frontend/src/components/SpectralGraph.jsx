/* MEMBER 3: Replace this entire file with your SpectralGraph implementation */
import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Activity, Flame, ShieldAlert, Sparkles } from 'lucide-react';

export default function SpectralGraph({ anomaly, sector }) {
  // Format 102 channels into recharts-compatible data points
  const chartData = useMemo(() => {
    if (!anomaly || !anomaly.spectrum_102 || !anomaly.spectral_bands_um) {
      return [];
    }
    return anomaly.spectral_bands_um.map((wl, i) => ({
      wavelength: wl,
      flux: anomaly.spectrum_102[i] ?? 0
    }));
  }, [anomaly]);

  if (!anomaly) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800">
        <Activity className="w-5 h-5 mr-2 animate-pulse text-cyan-400" />
        <span>Select an anomaly above to inspect 102-band spectrophotometric curve</span>
      </div>
    );
  }

  const features = anomaly.spectral_features || [];

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Header telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider">
            SPHEREx 102-Band Near-Infrared Spectrophotometry (0.75 - 5.0 μm)
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 font-mono-telemetry border border-cyan-800/40">
            {anomaly.designation}
          </span>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-mono-telemetry">
            m(AB): <strong className="text-slate-200">{anomaly.magnitude_ab ?? '—'}</strong>
          </span>
          {features.map((feat, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center space-x-1 ${
                feat.type === 'emission'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
              }`}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              <span>{feat.species} ({feat.wavelength_um} μm)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="wavelength"
              domain={[0.75, 5.0]}
              type="number"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => `${v.toFixed(1)}μm`}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 border border-cyan-500/40 p-2.5 rounded shadow-xl text-xs font-mono-telemetry">
                      <p className="text-cyan-300 font-bold">{data.wavelength} μm</p>
                      <p className="text-slate-300">Flux: {data.flux} μJy</p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Diagnostic Absorption Reference Markers */}
            <ReferenceLine x={1.66} stroke="#06b6d4" strokeDasharray="3 3" label={{ value: 'CH4 1.66μm', fill: '#06b6d4', fontSize: 10, position: 'top' }} />
            <ReferenceLine x={3.10} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: 'H2O 3.10μm', fill: '#38bdf8', fontSize: 10, position: 'top' }} />
            <ReferenceLine x={3.32} stroke="#818cf8" strokeDasharray="3 3" label={{ value: 'CH4 3.32μm', fill: '#818cf8', fontSize: 10, position: 'top' }} />
            <ReferenceLine x={4.26} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'CO2 4.26μm', fill: '#f59e0b', fontSize: 10, position: 'top' }} />

            <Line
              type="monotone"
              dataKey="flux"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#38bdf8', stroke: '#0891b2' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
