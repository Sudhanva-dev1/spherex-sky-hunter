import React, { useMemo, useState } from 'react';
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
import {
  Activity,
  Sparkles,
  Download,
  Sliders
} from 'lucide-react';

// Key diagnostic molecular spectral markers across SPHEREx NIR range (0.75 - 5.0 μm)
const DIAGNOSTIC_SPECTRAL_LINES = [
  {
    wavelength_um: 1.05,
    species: 'Silicate / Pyroxene Band 1',
    type: 'absorption',
    color: '#f43f5e',
    dash: '3 3',
    description: 'Pyroxene crystal absorption band typical of S-type asteroids'
  },
  {
    wavelength_um: 1.66,
    species: 'CH₄ (Methane) Overtones',
    type: 'absorption',
    color: '#06b6d4',
    dash: '3 3',
    description: 'Methane vibrational overtone band in cold Y & T Brown Dwarfs'
  },
  {
    wavelength_um: 2.00,
    species: 'Silicate / Pyroxene Band 2',
    type: 'absorption',
    color: '#f43f5e',
    dash: '3 3',
    description: 'Secondary pyroxene absorption feature in stony minor bodies'
  },
  {
    wavelength_um: 3.05,
    species: 'H₂O Ice / Vapor',
    type: 'absorption',
    color: '#38bdf8',
    dash: '3 3',
    description: 'Fundamental OH stretching resonance in comets & TNOs'
  },
  {
    wavelength_um: 3.10,
    species: 'H₂O Water Ice',
    type: 'absorption',
    color: '#0284c7',
    dash: '4 4',
    description: 'Diagnostic deep surface frost absorption for Kuiper Belt Objects & Planet 9 candidates'
  },
  {
    wavelength_um: 3.32,
    species: 'CH₄ Fundamental ν₃',
    type: 'absorption',
    color: '#818cf8',
    dash: '3 3',
    description: 'Deep fundamental methane absorption signature in substellar atmospheres'
  },
  {
    wavelength_um: 4.26,
    species: 'CO₂ Outgassing ν₃',
    type: 'emission',
    color: '#f59e0b',
    dash: '2 2',
    description: 'Volatile carbon dioxide sublimation emission band in active comets'
  },
  {
    wavelength_um: 4.67,
    species: 'CO (Carbon Monoxide)',
    type: 'absorption',
    color: '#a855f7',
    dash: '3 3',
    description: 'Carbon monoxide absorption band in cool atmospheres'
  }
];

export default function SpectralGraph({ anomaly, sector: _sector }) {
  const [showAllLines, setShowAllLines] = useState(true);
  const [activeRange, setActiveRange] = useState('full'); // 'full' | 'ice' | 'ch4' | 'co2'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Format 102 channels into recharts-compatible data points
  const fullChartData = useMemo(() => {
    if (!anomaly || !anomaly.spectrum_102 || !anomaly.spectral_bands_um) {
      return [];
    }
    return anomaly.spectral_bands_um.map((wl, i) => {
      const fluxVal = anomaly.spectrum_102[i] ?? 0;
      return {
        index: i + 1,
        wavelength: wl,
        flux: Number(fluxVal.toFixed(4)),
        channel: `CH-${(i + 1).toString().padStart(3, '0')}`,
        resolution_R: Math.round(40 + (i / 101) * 90) // R = 40 to 130
      };
    });
  }, [anomaly]);

  // Filter or window data based on spectral range selector
  const chartData = useMemo(() => {
    if (activeRange === 'ice') {
      return fullChartData.filter((d) => d.wavelength >= 2.5 && d.wavelength <= 3.8);
    }
    if (activeRange === 'ch4') {
      return fullChartData.filter((d) => d.wavelength >= 1.2 && d.wavelength <= 3.8);
    }
    if (activeRange === 'co2') {
      return fullChartData.filter((d) => d.wavelength >= 3.8 && d.wavelength <= 5.0);
    }
    return fullChartData;
  }, [fullChartData, activeRange]);

  // Min and max flux calculations for stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, avg: 0, snr: 0 };
    const fluxes = chartData.map((d) => d.flux);
    const min = Math.min(...fluxes);
    const max = Math.max(...fluxes);
    const avg = fluxes.reduce((a, b) => a + b, 0) / fluxes.length;
    const snr = avg > 0 ? (avg / Math.max(0.01, (max - min) * 0.08)).toFixed(1) : '24.5';
    return {
      min: min.toFixed(3),
      max: max.toFixed(3),
      avg: avg.toFixed(3),
      snr
    };
  }, [chartData]);

  // Export spectrum to CSV for researchers
  const handleExportCSV = () => {
    if (!anomaly || fullChartData.length === 0) return;
    const header = 'Channel,Wavelength_um,Flux_uJy,Resolution_R\n';
    const rows = fullChartData
      .map((d) => `${d.channel},${d.wavelength},${d.flux},${d.resolution_R}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_Spectrum_${anomaly.anomaly_id}_102Bands.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!anomaly) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800"
        role="region"
        aria-label="Spectrophotometry Viewer"
      >
        <Activity className="w-6 h-6 mb-2 animate-pulse text-cyan-400" aria-hidden="true" />
        <p className="font-semibold text-slate-300 text-sm">SPHEREx Spectrophotometer Offline</p>
        <p className="text-xs text-slate-500 mt-1">Select an anomaly from the sky sector or catalog to inspect its 102-band NIR curve.</p>
      </div>
    );
  }

  const features = anomaly.spectral_features || [];

  return (
    <div
      className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl focus-within:ring-1 focus-within:ring-cyan-500/50"
      role="region"
      aria-label={`Spectrophotometry graph for ${anomaly.designation}`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-800 text-xs">
        {/* Title & Anomaly Identification */}
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40" aria-hidden="true">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="font-semibold text-slate-100 uppercase tracking-wider text-xs">
                102-Band Spectrophotometric Curve
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-cyan-300 font-mono-telemetry border border-slate-700">
                0.75 – 5.0 μm
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono-telemetry">
              Target: <strong className="text-slate-200">{anomaly.designation}</strong> ({anomaly.anomaly_id})
            </p>
          </div>
        </div>

        {/* Feature Badges & Diagnostic Highlights */}
        <div className="flex items-center flex-wrap gap-1.5">
          {features.map((feat, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center space-x-1 ${
                feat.type === 'emission'
                  ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                  : 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
              }`}
              title={`${feat.species} (${feat.type}) at ${feat.wavelength_um} μm`}
            >
              <Sparkles className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
              <span>{feat.species} ({feat.wavelength_um} μm)</span>
            </span>
          ))}

          <span className="text-slate-400 font-mono-telemetry text-[11px] px-1.5 py-0.5 bg-slate-800/80 rounded border border-slate-700">
            m<sub>AB</sub>: <strong className="text-slate-200">{anomaly.magnitude_ab ?? '—'}</strong>
          </span>
        </div>

        {/* Controls: Range Filter, Overlay Toggle, CSV Export */}
        <div className="flex items-center space-x-1.5 font-mono-telemetry text-[11px]">
          {/* Zoom / Range Filter */}
          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700/60 p-0.5" role="group" aria-label="Wavelength range selector">
            {[
              { id: 'full', label: '0.75-5.0μm' },
              { id: 'ice', label: 'H₂O (2.5-3.8μm)' },
              { id: 'ch4', label: 'CH₄ (1.2-3.8μm)' },
              { id: 'co2', label: 'CO₂ (3.8-5.0μm)' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRange(r.id)}
                className={`px-2 py-0.5 rounded text-[10px] transition ${
                  activeRange === r.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-pressed={activeRange === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Toggle Reference Lines */}
          <button
            onClick={() => setShowAllLines(!showAllLines)}
            className={`px-2 py-1 rounded text-[10px] flex items-center space-x-1 border transition ${
              showAllLines
                ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Molecular Markers"
            aria-pressed={showAllLines}
          >
            <Sliders className="w-3 h-3" aria-hidden="true" />
            <span className="hidden sm:inline">Lines</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Download 102-Band Spectrum CSV"
            aria-label="Export spectrum CSV data"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div className="flex-1 w-full min-h-[170px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 24, left: -5, bottom: 0 }}
            onMouseMove={(e) => {
              if (e && e.activePayload && e.activePayload.length) {
                setHoveredPoint(e.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.8} />

            <XAxis
              dataKey="wavelength"
              domain={['auto', 'auto']}
              type="number"
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v.toFixed(2)}μm`}
              label={{
                value: 'Wavelength λ (μm)',
                position: 'insideBottomRight',
                offset: -4,
                fill: '#64748b',
                fontSize: 10,
                fontFamily: 'monospace'
              }}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
              tickFormatter={(v) => v.toFixed(2)}
              domain={['auto', 'auto']}
              label={{
                value: 'Flux Fν (μJy)',
                angle: -90,
                position: 'insideLeft',
                offset: 14,
                fill: '#64748b',
                fontSize: 10,
                fontFamily: 'monospace'
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 border border-cyan-500/50 p-2.5 rounded-lg shadow-2xl text-xs font-mono-telemetry backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                        <span className="text-cyan-400 font-bold">{data.channel}</span>
                        <span className="text-[10px] text-slate-400">R ≈ {data.resolution_R}</span>
                      </div>
                      <div className="space-y-0.5 text-slate-300">
                        <p>λ: <span className="text-slate-100 font-semibold">{data.wavelength.toFixed(3)} μm</span></p>
                        <p>Flux: <span className="text-cyan-300 font-semibold">{data.flux.toFixed(4)} μJy</span></p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Diagnostic Absorption Reference Markers */}
            {showAllLines &&
              DIAGNOSTIC_SPECTRAL_LINES.map((line, idx) => (
                <ReferenceLine
                  key={idx}
                  x={line.wavelength_um}
                  stroke={line.color}
                  strokeDasharray={line.dash}
                  strokeWidth={1.5}
                  label={{
                    value: `${line.species} (${line.wavelength_um}μm)`,
                    fill: line.color,
                    fontSize: 9,
                    position: 'top',
                    fontFamily: 'monospace'
                  }}
                />
              ))}

            {/* Continuous NIR Spectrum Line */}
            <Line
              type="monotone"
              dataKey="flux"
              stroke="#06b6d4"
              strokeWidth={2.2}
              dot={{ r: 1.5, fill: '#0891b2', stroke: '#06b6d4' }}
              activeDot={{ r: 5, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Telemetry Footer: Channels, SNR, Resolution, Wavelength Range */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono-telemetry text-slate-400 gap-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>TOTAL BANDS: <strong className="text-slate-200">102 NIR CHANNELS</strong></span>
          </span>
          <span className="hidden sm:inline">RANGE: <strong className="text-slate-200">0.75 – 5.00 μm</strong></span>
          <span>SPECTRAL RES: <strong className="text-indigo-400">R = 40 to 130</strong></span>
        </div>

        {/* Live Hover Readout or Aggregate Stats */}
        <div className="flex items-center space-x-3">
          {hoveredPoint ? (
            <span className="text-cyan-300 font-bold">
              HOVER: {hoveredPoint.wavelength.toFixed(3)} μm | {hoveredPoint.flux.toFixed(3)} μJy (CH-{hoveredPoint.index}/102)
            </span>
          ) : (
            <span className="text-slate-400">
              EST. S/N: <strong className="text-emerald-400">{stats.snr}</strong> | MIN: <strong className="text-slate-200">{stats.min}</strong> MAX: <strong className="text-slate-200">{stats.max}</strong> μJy
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
