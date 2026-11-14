import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  Radio,
  Activity,
  Layers,
} from 'lucide-react';
import {
  HIGHLIGHTED_BANDS,
  LVF_DETECTORS,
  getDetectorForWavelength,
  generateSpherex102Bands,
} from '../utils/spectralData';

/**
 * Custom Tooltip for Recharts
 */
function CustomSpectrumTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const detector = getDetectorForWavelength(data.wavelength);

  return (
    <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[220px]">
      <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono font-bold text-cyan-300">
            Band #{data.bandIndex} of 102
          </span>
        </div>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider font-mono"
          style={{ backgroundColor: `${detector.color}22`, color: detector.color }}
        >
          {data.detector}
        </span>
      </div>

      <div className="space-y-1.5 font-mono">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Wavelength (λ):</span>
          <span className="font-semibold text-white text-sm">
            {data.wavelength.toFixed(3)} µm
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Observed Flux:</span>
          <span className="font-semibold text-emerald-400">
            {data.flux} mJy
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Continuum Level:</span>
          <span className="text-slate-400">
            {data.continuumFlux} mJy
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Optical Depth (τ):</span>
          <span className="text-amber-400 font-medium">
            {data.opticalDepth}
          </span>
        </div>
      </div>

      {data.feature && (
        <div
          className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between"
          style={{ color: data.featureColor || '#38bdf8' }}
        >
          <span className="flex items-center space-x-1 font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{data.feature} Absorption</span>
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10">
            Active Feature
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Main SpectralGraph Component
 */
export default function SpectralGraph({
  data: customData,
  title = 'SPHEREx Near-Infrared Spectrum',
  subtitle = '102 Spectrophotometric Bands (0.75 – 5.0 µm)',
  target = 'Protostellar Core IRAS 16293-2422',
  className = '',
  onBandSelect,
  preset,
  onPresetChange,
}) {
  const [internalPreset, setInternalPreset] = useState('protostellar');
  const activePreset = preset !== undefined ? preset : internalPreset;

  const [activeFeatureFilter, setActiveFeatureFilter] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScanIndex, setCurrentScanIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5x, 1x, 2x
  const [isMuted, setIsMuted] = useState(false);
  const [selectedBand, setSelectedBand] = useState(null);

  // Audio Context & nodes references
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const scanTimerRef = useRef(null);

  // Generate or use passed 102 bands
  const spectralData = useMemo(() => {
    if (customData && Array.isArray(customData) && customData.length > 0) {
      return customData;
    }
    return generateSpherex102Bands(activePreset);
  }, [customData, activePreset]);

  // Audio Context Initialization helper
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API is not supported in this browser.');
        return null;
      }
      const ctx = new AudioContextClass();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.35, ctx.currentTime);
      master.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = master;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    return audioCtxRef.current;
  }, []);

  /**
   * Synthesize tone for a single spectral band:
   * Maps Wavelength to carrier pitch & Stereo Pan (Left -> Right)
   * Maps Flux intensity to frequency modulation & filter cutoff.
   * Absorption dips (e.g. at 3.1µm H2O, 3.3µm CH4, 4.26µm CO2) produce a distinct, resonant drop in tone!
   */
  const playBandTone = useCallback(
    (band, durationMs = 85) => {
      if (isMuted) return;
      const ctx = getOrCreateAudioContext();
      if (!ctx || !masterGainRef.current) return;

      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;

      // Base frequency sweeps with wavelength (from 220Hz at 0.75µm to 680Hz at 5.0µm)
      const wlNorm = (band.wavelength - 0.75) / (5.0 - 0.75); // 0 to 1
      const baseFreq = 220 + wlNorm * 380; // 220Hz to 600Hz

      // Modulate frequency with flux:
      // When flux dips (absorption), tone deepens into resonant bass
      const fluxFactor = Math.min(1.5, Math.max(0.2, band.flux / 100));
      const finalFreq = baseFreq * (0.65 + 0.45 * fluxFactor);

      // 1. Primary Carrier Oscillator (Triangle for warm celestial timbre)
      const osc = ctx.createOscillator();
      osc.type = band.feature ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(finalFreq, now);

      // 2. Secondary Harmonic Oscillator (Sub/Harmonic overtone)
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(
        band.feature ? finalFreq * 1.5 : finalFreq * 0.5,
        now
      );

      // 3. Resonant Lowpass Filter (Modulated by Flux)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const cutoff = Math.max(400, finalFreq * (1.2 + fluxFactor * 2.0));
      filter.frequency.setValueAtTime(cutoff, now);
      filter.Q.setValueAtTime(band.feature ? 6.5 : 2.0, now);

      // 4. Stereo Panning from Left (-0.85) to Right (+0.85) across the spectrum
      let panner = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        const panValue = -0.85 + wlNorm * 1.7; // -0.85 to +0.85
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), now);
      }

      // 5. Volume Envelope (ADSR: quick attack, smooth exponential decay)
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(
        band.feature ? 0.45 : 0.28,
        now + durationSec * 0.2
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        now + durationSec * 0.98
      );

      // Graph Routing: [Oscs] -> [Gain] -> [Filter] -> [Panner] -> [Master]
      osc.connect(gainNode);
      subOsc.connect(gainNode);
      gainNode.connect(filter);

      if (panner) {
        filter.connect(panner);
        panner.connect(masterGainRef.current);
      } else {
        filter.connect(masterGainRef.current);
      }

      // Start & Stop
      osc.start(now);
      subOsc.start(now);
      osc.stop(now + durationSec);
      subOsc.stop(now + durationSec);
    },
    [getOrCreateAudioContext, isMuted]
  );

  // Single Molecule Chord / Audition
  const auditionMolecule = useCallback(
    (feature) => {
      const targetBand = spectralData.find(
        (b) => Math.abs(b.wavelength - feature.center) < 0.05
      );
      if (targetBand) {
        setSelectedBand(targetBand);
        setCurrentScanIndex(targetBand.bandIndex - 1);
        playBandTone(targetBand, 380);
        if (onBandSelect) onBandSelect(targetBand);
      }
    },
    [spectralData, playBandTone, onBandSelect]
  );

  // Play / Sonify Entire Spectrum Progression Loop
  useEffect(() => {
    if (!isPlaying) {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      return;
    }

    const baseIntervalMs = 70; // ~7 seconds total for 102 bands at 1x
    const stepInterval = baseIntervalMs / playbackSpeed;

    scanTimerRef.current = setInterval(() => {
      setCurrentScanIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= spectralData.length) {
          setIsPlaying(false);
          clearInterval(scanTimerRef.current);
          return -1;
        }

        const currentBand = spectralData[nextIndex];
        playBandTone(currentBand, stepInterval * 0.95);
        setSelectedBand(currentBand);
        return nextIndex;
      });
    }, stepInterval);

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, spectralData, playBandTone]);

  // Clean up Web Audio API nodes on component unmount
  useEffect(() => {
    const scanTimer = scanTimerRef.current;
    const audioCtx = audioCtxRef.current;
    return () => {
      if (scanTimer) clearInterval(scanTimer);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, []);

  // Handle Play / Pause / Replay toggle
  const handleToggleSonification = () => {
    getOrCreateAudioContext();
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentScanIndex >= spectralData.length - 1 || currentScanIndex === -1) {
        setCurrentScanIndex(0);
        playBandTone(spectralData[0]);
      }
      setIsPlaying(true);
    }
  };

  const handleResetSonification = () => {
    setIsPlaying(false);
    setCurrentScanIndex(-1);
    setSelectedBand(null);
  };

  const handlePresetSelect = (newPreset) => {
    if (onPresetChange) {
      onPresetChange(newPreset);
    } else {
      setInternalPreset(newPreset);
    }
    handleResetSonification();
  };

  const handleChartClick = (e) => {
    if (e && e.activePayload && e.activePayload.length) {
      const clickedBand = e.activePayload[0].payload;
      setSelectedBand(clickedBand);
      setCurrentScanIndex(clickedBand.bandIndex - 1);
      playBandTone(clickedBand, 250);
      if (onBandSelect) onBandSelect(clickedBand);
    }
  };

  const currentWavelength =
    currentScanIndex >= 0 && currentScanIndex < spectralData.length
      ? spectralData[currentScanIndex].wavelength
      : null;

  const currentFlux =
    currentScanIndex >= 0 && currentScanIndex < spectralData.length
      ? spectralData[currentScanIndex].flux
      : null;

  return (
    <div
      className={`bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 flex flex-col space-y-5 backdrop-blur-xl ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Radio className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>{title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                102 Bands (0.75 - 5.0 µm)
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
            <span>{subtitle}</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300 font-mono font-medium">{target}</span>
          </p>
        </div>

        {/* Target Presets Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Preset:</span>
          </span>
          <select
            value={activePreset}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
          >
            <option value="protostellar">Protostellar Cloud (High Ice Mantles)</option>
            <option value="disk">Protoplanetary Disk (Organics & Water)</option>
            <option value="atmosphere">Exoplanet Atmosphere (Volatiles)</option>
            <option value="w33a">W33A Massive Protostar (Extreme CO₂/H₂O)</option>
            <option value="ngc-1333">NGC 1333 Cold Ice Envelope</option>
          </select>
        </div>
      </div>

      {/* Feature Highlights & Sonification Quick-Listen Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/60 border border-slate-800/70 p-3 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1 pr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Target Bands:</span>
          </span>

          {HIGHLIGHTED_BANDS.map((feat) => {
            const isFilterActive = activeFeatureFilter === feat.id;
            return (
              <button
                key={feat.id}
                type="button"
                onClick={() => {
                  setActiveFeatureFilter(isFilterActive ? null : feat.id);
                  auditionMolecule(feat);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isFilterActive ? feat.activeClass : feat.badgeClass
                }`}
                title={`Click to focus and sonify ${feat.name} (${feat.center} µm)`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: feat.color }}
                />
                <span className="font-semibold">{feat.name}</span>
                <span className="text-[10px] opacity-80 font-mono">
                  {feat.center}µm
                </span>
                <Volume2 className="w-3 h-3 ml-1 opacity-70 group-hover:opacity-100" />
              </button>
            );
          })}

          {activeFeatureFilter && (
            <button
              type="button"
              onClick={() => setActiveFeatureFilter(null)}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 underline cursor-pointer"
            >
              Clear Focus
            </button>
          )}
        </div>

        {/* Audio Mute & Speed Quick Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Recharts Area */}
      <div className="relative w-full h-84 md:h-96 bg-slate-950/70 border border-slate-800/80 rounded-xl pt-4 pb-2 pr-3 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={spectralData}
            margin={{ top: 12, right: 20, left: 10, bottom: 25 }}
            onClick={handleChartClick}
          >
            <defs>
              <linearGradient id="fluxFillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="65%" stopColor="#0284c7" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#0f172a" stopOpacity={0.0} />
              </linearGradient>

              {/* Molecular Highlight Gradients */}
              <linearGradient id="h2oGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="ch4Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
              opacity={0.8}
            />

            {/* X Axis: Wavelength in Microns */}
            <XAxis
              dataKey="wavelength"
              type="number"
              domain={[0.75, 5.0]}
              ticks={[0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              label={{
                value: 'Wavelength λ (microns, µm)',
                position: 'insideBottom',
                offset: -16,
                fill: '#94a3b8',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            />

            {/* Y Axis: Flux Density (mJy) */}
            <YAxis
              dataKey="flux"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              label={{
                value: 'Flux Density Fλ (mJy)',
                angle: -90,
                position: 'insideLeft',
                offset: 6,
                fill: '#94a3b8',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            />

            <Tooltip content={<CustomSpectrumTooltip />} />

            {/* Highlighted Absorption Band 1: H2O Ice (3.1 µm) */}
            <ReferenceArea
              x1={2.96}
              x2={3.24}
              stroke="#06b6d4"
              strokeOpacity={activeFeatureFilter && activeFeatureFilter !== 'h2o' ? 0.1 : 0.4}
              strokeDasharray="2 2"
              fill="url(#h2oGradient)"
              fillOpacity={activeFeatureFilter && activeFeatureFilter !== 'h2o' ? 0.2 : 1}
            />
            <ReferenceLine
              x={3.10}
              stroke="#06b6d4"
              strokeDasharray="4 4"
              strokeWidth={activeFeatureFilter === 'h2o' ? 2.5 : 1.5}
              label={{
                value: 'H₂O Ice (3.1µm)',
                fill: '#38bdf8',
                position: 'top',
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            />

            {/* Highlighted Absorption Band 2: CH4 Methane (3.3 µm) */}
            <ReferenceArea
              x1={3.24}
              x2={3.38}
              stroke="#a855f7"
              strokeOpacity={activeFeatureFilter && activeFeatureFilter !== 'ch4' ? 0.1 : 0.4}
              strokeDasharray="2 2"
              fill="url(#ch4Gradient)"
              fillOpacity={activeFeatureFilter && activeFeatureFilter !== 'ch4' ? 0.2 : 1}
            />
            <ReferenceLine
              x={3.30}
              stroke="#a855f7"
              strokeDasharray="4 4"
              strokeWidth={activeFeatureFilter === 'ch4' ? 2.5 : 1.5}
              label={{
                value: 'CH₄ (3.3µm)',
                fill: '#c084fc',
                position: 'insideTopLeft',
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            />

            {/* Highlighted Absorption Band 3: CO2 Carbon Dioxide (4.26 µm) */}
            <ReferenceArea
              x1={4.16}
              x2={4.36}
              stroke="#f43f5e"
              strokeOpacity={activeFeatureFilter && activeFeatureFilter !== 'co2' ? 0.1 : 0.5}
              strokeDasharray="2 2"
              fill="url(#co2Gradient)"
              fillOpacity={activeFeatureFilter && activeFeatureFilter !== 'co2' ? 0.2 : 1}
            />
            <ReferenceLine
              x={4.26}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={activeFeatureFilter === 'co2' ? 2.5 : 1.5}
              label={{
                value: 'CO₂ Ice (4.26µm)',
                fill: '#fb7185',
                position: 'top',
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            />

            {/* Continuum Reference Line (Baseline) */}
            <Area
              type="monotone"
              dataKey="continuumFlux"
              stroke="#475569"
              strokeDasharray="4 4"
              strokeWidth={1}
              fill="none"
              isAnimationActive={false}
              dot={false}
            />

            {/* Observed SPHEREx Spectrum Area */}
            <Area
              type="monotone"
              dataKey="flux"
              stroke="#22d3ee"
              strokeWidth={2.2}
              fill="url(#fluxFillGradient)"
              dot={{
                r: 1.8,
                fill: '#06b6d4',
                stroke: '#083344',
                strokeWidth: 1,
              }}
              activeDot={{
                r: 6,
                fill: '#38bdf8',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />

            {/* Dynamic Sonification Playhead Cursor */}
            {currentWavelength !== null && (
              <>
                <ReferenceLine
                  x={currentWavelength}
                  stroke="#facc15"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                />
                {currentFlux !== null && (
                  <ReferenceDot
                    x={currentWavelength}
                    y={currentFlux}
                    r={7}
                    fill="#facc15"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="animate-ping"
                  />
                )}
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>

        {/* Live scanning HUD badge */}
        {isPlaying && (
          <div className="absolute top-4 right-6 flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            <span className="text-[11px] font-mono font-bold text-yellow-300">
              SONIFYING: λ {currentWavelength?.toFixed(3)} µm ({currentFlux} mJy)
            </span>
          </div>
        )}
      </div>

      {/* SPHEREx Detector Band Track & Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>SPHEREx 6-Channel Variable Linear Filter (LVF) Coverage:</span>
          </span>
          <span>
            {currentScanIndex >= 0
              ? `Channel ${spectralData[currentScanIndex]?.detector} • Band ${currentScanIndex + 1} / 102`
              : 'Interactive 102-Band Photometer'}
          </span>
        </div>

        {/* 6 LVF Detector Segment Bar */}
        <div className="grid grid-cols-6 gap-1 h-2 rounded-full overflow-hidden bg-slate-900 border border-slate-800">
          {LVF_DETECTORS.map((lvf) => {
            const isCurrentlyInLvf =
              currentWavelength &&
              currentWavelength >= lvf.min &&
              currentWavelength <= lvf.max;
            return (
              <div
                key={lvf.id}
                className="h-full relative group transition-all"
                style={{
                  backgroundColor: isCurrentlyInLvf ? lvf.color : `${lvf.color}40`,
                  boxShadow: isCurrentlyInLvf ? `0 0 10px ${lvf.color}` : 'none',
                }}
                title={`${lvf.name}: ${lvf.min} - ${lvf.max} µm`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
          <span>0.75 µm (LVF 1)</span>
          <span>1.64 µm (LVF 2/3)</span>
          <span>3.1 - 3.3 µm (H₂O/CH₄)</span>
          <span>4.26 µm (CO₂)</span>
          <span>5.00 µm (LVF 6)</span>
        </div>
      </div>

      {/* Audio Sonification Controller Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Primary Web Audio API Sonify Button */}
          <button
            type="button"
            onClick={handleToggleSonification}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all transform active:scale-95 cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 shadow-amber-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 ring-1 ring-cyan-400/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Sonification</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Sonify Spectrum (Web Audio)</span>
              </>
            )}
          </button>

          {/* Reset Playhead */}
          <button
            type="button"
            onClick={handleResetSonification}
            disabled={currentScanIndex === -1 && !isPlaying}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Reset Audio Playhead"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Sonification Scientific Explanation / Status Indicator */}
        <div className="flex items-center space-x-3 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-1.5 font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPlaying
                  ? 'bg-emerald-400 animate-ping'
                  : currentScanIndex >= 0
                  ? 'bg-yellow-400'
                  : 'bg-slate-600'
              }`}
            />
            <span className="text-slate-300">
              {isPlaying
                ? `Scanning Band ${currentScanIndex + 1}/102`
                : currentScanIndex >= 0
                ? `Paused at ${currentWavelength}µm`
                : 'Web Audio Synthesizer Ready'}
            </span>
          </div>

          <div
            className="hidden md:flex items-center space-x-1 text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800"
            title="Sonification algorithm maps wavelength to carrier pitch (220-600Hz) and stereo pan, while spectral flux controls acoustic resonance and amplitude."
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tone = λ (Wavelength) • Dip = Ice Absorption</span>
          </div>
        </div>
      </div>

      {/* Selected Band / Molecule Detail Card */}
      {selectedBand && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm font-mono">
                Band #{selectedBand.bandIndex}: {selectedBand.wavelength.toFixed(3)} µm
              </span>
              {selectedBand.feature ? (
                <span
                  className="px-2 py-0.5 rounded-md font-semibold text-[11px]"
                  style={{
                    backgroundColor: `${selectedBand.featureColor}25`,
                    color: selectedBand.featureColor,
                    border: `1px solid ${selectedBand.featureColor}50`,
                  }}
                >
                  Detected: {selectedBand.feature}
                </span>
              ) : (
                <span className="text-slate-400 font-mono">
                  Near-Infrared Continuum
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[11px]">
              Observed Flux: <strong className="text-emerald-400">{selectedBand.flux} mJy</strong> | Optical Depth τ:{' '}
              <strong className="text-amber-400">{selectedBand.opticalDepth}</strong> | SPHEREx Detector:{' '}
              <strong style={{ color: selectedBand.detectorColor }}>{selectedBand.detector}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => playBandTone(selectedBand, 300)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Play Tone ({selectedBand.wavelength} µm)</span>
            </button>
          </div>
        </div>
      )}

      {/* Target Feature Legend / Educational Dossier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {HIGHLIGHTED_BANDS.map((feat) => (
          <div
            key={feat.id}
            className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all text-xs flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className="font-bold flex items-center space-x-1.5"
                  style={{ color: feat.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: feat.color }}
                  />
                  <span>{feat.name}</span>
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  λ₀ = {feat.center} µm
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                {feat.description}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 italic">
                {feat.significance.slice(0, 48)}...
              </span>
              <button
                type="button"
                onClick={() => auditionMolecule(feat)}
                className="text-[11px] font-medium flex items-center space-x-1 hover:underline cursor-pointer"
                style={{ color: feat.color }}
              >
                <span>Audition</span>
                <Volume2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
