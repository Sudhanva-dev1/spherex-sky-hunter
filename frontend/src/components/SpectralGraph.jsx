import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot
} from 'recharts';
import {
  Activity,
  Sparkles,
  Download,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers
} from 'lucide-react';
import {
  HIGHLIGHTED_BANDS,
  getDetectorForWavelength,
  generateSpherex102Bands
} from '../utils/spectralData';

export default function SpectralGraph({
  anomaly,
  sector: _sector,
  data: customData,
  title: customTitle,
  subtitle: customSubtitle,
  target: _customTarget,
  onBandSelect,
  preset,
  onPresetChange
}) {
  const [activeRange, setActiveRange] = useState('full'); // 'full' | 'ice' | 'ch4' | 'co2'
  const [internalPreset, setInternalPreset] = useState('protostellar');
  const activePreset = preset !== undefined ? preset : internalPreset;

  const [activeFeatureFilter, setActiveFeatureFilter] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScanIndex, setCurrentScanIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedBand, setSelectedBand] = useState(null);

  // Audio Context & nodes references
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const scanTimerRef = useRef(null);

  // Derive state reset on anomaly or sector change (React 19 pattern)
  const currentKey = `${anomaly?.anomaly_id || 'none'}-${_sector?.sector_id || 'none'}`;
  const [prevKey, setPrevKey] = useState(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    if (isPlaying) setIsPlaying(false);
    if (currentScanIndex !== -1) setCurrentScanIndex(-1);
    if (selectedBand !== null) setSelectedBand(null);
  }

  // Unify data from props: anomaly.spectrum_102, anomaly.spectrum, customData, or activePreset generator
  const fullChartData = useMemo(() => {
    if (customData && Array.isArray(customData) && customData.length > 0) {
      return customData;
    }

    // Format A: anomaly.spectrum as array of objects [{ wavelength, flux, ... }]
    if (
      anomaly &&
      Array.isArray(anomaly.spectrum) &&
      anomaly.spectrum.length > 0 &&
      typeof anomaly.spectrum[0] === 'object' &&
      anomaly.spectrum[0] !== null
    ) {
      return anomaly.spectrum.map((point, i) => {
        const wl = Number((point.wavelength ?? 0.75 + (i * 4.25) / 101).toFixed(3));
        const fluxVal = Number((point.flux ?? 50.0).toFixed(4));
        const detector = getDetectorForWavelength(wl);
        let detectedFeature = null;
        for (const feat of HIGHLIGHTED_BANDS) {
          if (wl >= feat.range[0] && wl <= feat.range[1]) {
            detectedFeature = feat;
            break;
          }
        }
        return {
          bandIndex: point.band_index || i + 1,
          index: i + 1,
          wavelength: wl,
          flux: fluxVal,
          continuumFlux: Number((fluxVal * 1.15).toFixed(4)),
          opticalDepth: Number(Math.max(0.01, 1.2 - fluxVal / 100).toFixed(3)),
          channel: `CH-${(i + 1).toString().padStart(3, '0')}`,
          resolution_R: Math.round(40 + (i / 101) * 90),
          feature: point.feature || (detectedFeature ? detectedFeature.name : null),
          featureId: detectedFeature ? detectedFeature.id : null,
          featureColor: detectedFeature ? detectedFeature.color : null,
          detector: detector.name,
          detectorColor: detector.color
        };
      });
    }

    // Format B: anomaly.spectrum_102 or anomaly.spectrum as array of numbers
    const rawFluxes =
      (anomaly && Array.isArray(anomaly.spectrum_102) && anomaly.spectrum_102.length > 0 && anomaly.spectrum_102) ||
      (anomaly && Array.isArray(anomaly.spectrum) && typeof anomaly.spectrum[0] === 'number' && anomaly.spectrum);

    if (rawFluxes && rawFluxes.length > 0) {
      const rawWavelengths =
        (anomaly.spectral_bands_um && anomaly.spectral_bands_um.length === rawFluxes.length && anomaly.spectral_bands_um) ||
        Array.from({ length: rawFluxes.length }, (_, i) =>
          Number((0.75 + (i * 4.25) / Math.max(1, rawFluxes.length - 1)).toFixed(3))
        );

      return rawWavelengths.map((wl, i) => {
        const fluxVal = Number((rawFluxes[i] ?? 0).toFixed(4));
        const detector = getDetectorForWavelength(wl);
        let detectedFeature = null;
        for (const feat of HIGHLIGHTED_BANDS) {
          if (wl >= feat.range[0] && wl <= feat.range[1]) {
            detectedFeature = feat;
            break;
          }
        }
        return {
          bandIndex: i + 1,
          index: i + 1,
          wavelength: Number(wl.toFixed(3)),
          flux: fluxVal,
          continuumFlux: Number((fluxVal * 1.15).toFixed(4)),
          opticalDepth: Number(Math.max(0.01, 1.2 - fluxVal / 100).toFixed(3)),
          channel: `CH-${(i + 1).toString().padStart(3, '0')}`,
          resolution_R: Math.round(40 + (i / 101) * 90),
          feature: detectedFeature ? detectedFeature.name : null,
          featureId: detectedFeature ? detectedFeature.id : null,
          featureColor: detectedFeature ? detectedFeature.color : null,
          detector: detector.name,
          detectorColor: detector.color
        };
      });
    }

    return generateSpherex102Bands(activePreset);
  }, [customData, anomaly, activePreset]);

  // Windowed/range filtered data
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

  // Statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { min: '0', max: '0', avg: '0', snr: '0' };
    const fluxes = chartData.map((d) => d.flux);
    const min = Math.min(...fluxes);
    const max = Math.max(...fluxes);
    const avg = fluxes.reduce((a, b) => a + b, 0) / fluxes.length;
    const snr = avg > 0 ? (avg / Math.max(0.01, (max - min) * 0.08)).toFixed(1) : '24.5';
    return {
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
      snr
    };
  }, [chartData]);

  // Web Audio Context setup
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      const ctx = new AudioContextClass();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.35, ctx.currentTime);
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = master;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Web Audio Sonifier tone generation
  const playBandTone = useCallback(
    (band, durationMs = 85) => {
      if (isMuted || !band) return;
      const ctx = getOrCreateAudioContext();
      if (!ctx || !masterGainRef.current) return;

      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;
      const wlNorm = (band.wavelength - 0.75) / (5.0 - 0.75);
      const baseFreq = 220 + wlNorm * 380;
      const fluxFactor = Math.min(1.5, Math.max(0.2, band.flux / 100));
      const finalFreq = baseFreq * (0.65 + 0.45 * fluxFactor);

      const osc = ctx.createOscillator();
      osc.type = band.feature ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(finalFreq, now);

      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(band.feature ? finalFreq * 1.5 : finalFreq * 0.5, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const cutoff = Math.max(400, finalFreq * (1.2 + fluxFactor * 2.0));
      filter.frequency.setValueAtTime(cutoff, now);
      filter.Q.setValueAtTime(band.feature ? 6.5 : 2.0, now);

      let panner = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        const panVal = -0.85 + wlNorm * 1.7;
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal)), now);
      }

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(band.feature ? 0.45 : 0.28, now + durationSec * 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec * 0.98);

      osc.connect(gainNode);
      subOsc.connect(gainNode);
      gainNode.connect(filter);
      if (panner) {
        filter.connect(panner);
        panner.connect(masterGainRef.current);
      } else {
        filter.connect(masterGainRef.current);
      }

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + durationSec);
      subOsc.stop(now + durationSec);
    },
    [getOrCreateAudioContext, isMuted]
  );

  // Audition single molecule
  const auditionMolecule = useCallback(
    (feature) => {
      const targetBand = fullChartData.find(
        (b) => Math.abs(b.wavelength - feature.center) < 0.06
      );
      if (targetBand) {
        setSelectedBand(targetBand);
        setCurrentScanIndex(targetBand.bandIndex - 1);
        playBandTone(targetBand, 380);
        if (onBandSelect) onBandSelect(targetBand);
      }
    },
    [fullChartData, playBandTone, onBandSelect]
  );

  // Sonification play loop
  useEffect(() => {
    if (!isPlaying) {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      return;
    }

    const stepInterval = 70 / playbackSpeed;
    scanTimerRef.current = setInterval(() => {
      setCurrentScanIndex((prev) => {
        const next = prev + 1;
        if (next >= fullChartData.length) {
          setIsPlaying(false);
          clearInterval(scanTimerRef.current);
          return -1;
        }
        const currentBand = fullChartData[next];
        playBandTone(currentBand, stepInterval * 0.95);
        setSelectedBand(currentBand);
        return next;
      });
    }, stepInterval);

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, fullChartData, playBandTone]);

  // When selected anomaly or sector changes, cleanly clear sonification timer
  useEffect(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, [anomaly?.anomaly_id, _sector?.sector_id]);

  // Cleanup Web Audio nodes on unmount
  useEffect(() => {
    const timer = scanTimerRef.current;
    const ctx = audioCtxRef.current;
    return () => {
      if (timer) clearInterval(timer);
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    };
  }, []);

  const handleToggleSonification = () => {
    getOrCreateAudioContext();
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentScanIndex >= fullChartData.length - 1 || currentScanIndex === -1) {
        setCurrentScanIndex(0);
        playBandTone(fullChartData[0]);
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

  const handleExportCSV = () => {
    if (!fullChartData.length) return;
    const id = anomaly ? anomaly.anomaly_id : activePreset;
    const header = 'Channel,Wavelength_um,Flux_mJy,Continuum_mJy,OpticalDepth\n';
    const rows = fullChartData
      .map((d) => `${d.channel || `CH-${d.bandIndex}`},${d.wavelength},${d.flux},${d.continuumFlux || ''},${d.opticalDepth || ''}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_102Bands_${id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentWavelength =
    currentScanIndex >= 0 && currentScanIndex < fullChartData.length
      ? fullChartData[currentScanIndex].wavelength
      : null;

  const currentFlux =
    currentScanIndex >= 0 && currentScanIndex < fullChartData.length
      ? fullChartData[currentScanIndex].flux
      : null;

  const displayTitle = customTitle || (anomaly ? anomaly.designation : 'SPHEREx Near-Infrared Spectrum');
  const displaySubtitle = customSubtitle || (anomaly ? `Classification: ${anomaly.classification} • Mag AB: ${anomaly.magnitude_ab}` : '102 Spectrophotometric Bands (0.75 – 5.0 µm)');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col h-full shadow-lg backdrop-blur-sm space-y-2">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold tracking-wide text-slate-100 font-mono-telemetry">
                {displayTitle}
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                102 NIR BANDS (0.75-5.0μm)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">{displaySubtitle}</p>
          </div>
        </div>

        {/* Controls: Preset, Range, CSV Export */}
        <div className="flex items-center space-x-2">
          {/* Preset Selector */}
          <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px]">
            <Layers className="w-3 h-3 text-slate-400" />
            <select
              value={activePreset}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="bg-transparent text-slate-300 outline-none cursor-pointer font-mono text-[10px]"
            >
              <option value="protostellar" className="bg-slate-900">Protostellar Core (Ices)</option>
              <option value="disk" className="bg-slate-900">Protoplanetary Disk</option>
              <option value="atmosphere" className="bg-slate-900">Exoplanet Atmosphere</option>
              <option value="w33a" className="bg-slate-900">W33A (Deep CO₂/H₂O)</option>
              <option value="ngc-1333" className="bg-slate-900">NGC 1333 Envelope</option>
            </select>
          </div>

          {/* Spectral Range Zoom Filter */}
          <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
            {[
              { id: 'full', label: '0.75-5μm' },
              { id: 'ice', label: 'H₂O (3.1μm)' },
              { id: 'ch4', label: 'CH₄ (3.3μm)' },
              { id: 'co2', label: 'CO₂ (4.26μm)' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setActiveRange(btn.id)}
                className={`px-2 py-0.5 rounded transition ${
                  activeRange === btn.id
                    ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300 transition"
            title="Download 102-Band CSV"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights & Sonification Quick-Listen Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1 pr-1 font-mono">
            <Sparkles className="w-3 h-3 text-amber-400" />
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
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] font-mono transition cursor-pointer ${
                  isFilterActive ? feat.activeClass : feat.badgeClass
                }`}
                title={`Click to focus and audition ${feat.name} (${feat.center} µm)`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: feat.color }} />
                <span className="font-semibold">{feat.name}</span>
                <span className="opacity-75">{feat.center}µm</span>
                <Volume2 className="w-2.5 h-2.5 ml-0.5 opacity-80" />
              </button>
            );
          })}

          {activeFeatureFilter && (
            <button
              type="button"
              onClick={() => setActiveFeatureFilter(null)}
              className="text-[10px] text-slate-400 hover:text-white px-1 underline cursor-pointer font-mono"
            >
              Clear Focus
            </button>
          )}
        </div>

        {/* Sonify Spectrum Button, Reset & Audio Speed Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleToggleSonification}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-mono font-bold text-[10px] shadow transition active:scale-95 cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-400'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 ring-1 ring-cyan-300'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>Pause Sonification</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Sonify Spectrum (Web Audio)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetSonification}
            disabled={currentScanIndex === -1 && !isPlaying}
            className="p-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
            title="Reset Sonification Playhead"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[9px] font-mono">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  playbackSpeed === spd ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1 rounded-lg border text-[10px] transition cursor-pointer ${
              isMuted ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Recharts Area */}
      <div className="relative flex-1 w-full min-h-[160px] max-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload.length) {
                const clicked = e.activePayload[0].payload;
                setSelectedBand(clicked);
                setCurrentScanIndex(clicked.bandIndex ? clicked.bandIndex - 1 : 0);
                playBandTone(clicked, 250);
                if (onBandSelect) onBandSelect(clicked);
              }
            }}
          >
            <defs>
              <linearGradient id="fluxFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="h2oGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="ch4Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.8} />

            <XAxis
              dataKey="wavelength"
              domain={['auto', 'auto']}
              type="number"
              stroke="#64748b"
              tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v.toFixed(2)}μm`}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }}
              tickFormatter={(v) => v.toFixed(1)}
              domain={['auto', 'auto']}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-950/95 border border-cyan-500/40 p-2.5 rounded-lg shadow-2xl text-[11px] font-mono backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1 gap-2">
                      <span className="text-cyan-400 font-bold">Band #{d.bandIndex || d.index} of 102</span>
                      <span className="text-[10px] text-slate-400">{d.detector || `LVF Array`}</span>
                    </div>
                    <div className="space-y-0.5 text-slate-300">
                      <p>Wavelength: <strong className="text-white">{d.wavelength.toFixed(3)} μm</strong></p>
                      <p>Observed Flux: <strong className="text-cyan-300">{d.flux} mJy</strong></p>
                      {d.feature && (
                        <p className="text-amber-400 font-semibold pt-0.5 border-t border-slate-800 mt-1">
                          ✦ {d.feature} Absorption
                        </p>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            {/* Absorption Overlays: H2O Ice, CH4, CO2 */}
            <ReferenceArea
              x1={2.96}
              x2={3.24}
              stroke="#06b6d4"
              strokeOpacity={activeFeatureFilter && activeFeatureFilter !== 'h2o' ? 0.1 : 0.4}
              fill="url(#h2oGrad)"
            />
            <ReferenceLine
              x={3.10}
              stroke="#06b6d4"
              strokeDasharray="4 4"
              strokeWidth={activeFeatureFilter === 'h2o' ? 2 : 1.2}
              label={{ value: 'H₂O 3.1µm', fill: '#38bdf8', fontSize: 9, position: 'top', fontFamily: 'monospace' }}
            />

            <ReferenceArea
              x1={3.24}
              x2={3.38}
              stroke="#a855f7"
              strokeOpacity={activeFeatureFilter && activeFeatureFilter !== 'ch4' ? 0.1 : 0.4}
              fill="url(#ch4Grad)"
            />
            <ReferenceLine
              x={3.30}
              stroke="#a855f7"
              strokeDasharray="4 4"
              strokeWidth={activeFeatureFilter === 'ch4' ? 2 : 1.2}
              label={{ value: 'CH₄ 3.3µm', fill: '#c084fc', fontSize: 9, position: 'insideTopLeft', fontFamily: 'monospace' }}
            />

            <ReferenceArea
              x1={4.16}
              x2={4.36}
              stroke="#f43f5e"
              strokeOpacity={activeFeatureFilter && activeFeatureFilter !== 'co2' ? 0.1 : 0.4}
              fill="url(#co2Grad)"
            />
            <ReferenceLine
              x={4.26}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={activeFeatureFilter === 'co2' ? 2 : 1.2}
              label={{ value: 'CO₂ 4.26µm', fill: '#fb7185', fontSize: 9, position: 'top', fontFamily: 'monospace' }}
            />

            {/* Continuous NIR Spectrum Area */}
            <Area
              type="monotone"
              dataKey="flux"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#fluxFillGrad)"
              dot={{ r: 1.5, fill: '#0891b2', stroke: '#06b6d4' }}
              activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Dynamic Sonification Playhead */}
            {currentWavelength !== null && (
              <>
                <ReferenceLine x={currentWavelength} stroke="#facc15" strokeWidth={2} strokeDasharray="2 2" />
                {currentFlux !== null && (
                  <ReferenceDot x={currentWavelength} y={currentFlux} r={6} fill="#facc15" stroke="#ffffff" strokeWidth={2} />
                )}
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>

        {isPlaying && (
          <div className="absolute top-2 right-4 flex items-center space-x-1.5 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-yellow-300">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
            <span>SONIFYING: λ {currentWavelength?.toFixed(3)} µm ({currentFlux} mJy)</span>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 gap-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>TOTAL BANDS: <strong className="text-slate-200">102 NIR CHANNELS</strong></span>
          </span>
          <span>RANGE: <strong className="text-slate-200">0.75 – 5.00 μm</strong></span>
          <span>RES: <strong className="text-indigo-400">R = 40 to 130</strong></span>
        </div>

        <div className="flex items-center space-x-3">
          {selectedBand ? (
            <span className="text-cyan-300 font-bold">
              BAND #{selectedBand.bandIndex || selectedBand.index}: {selectedBand.wavelength.toFixed(3)} μm ({selectedBand.flux} mJy)
              {selectedBand.feature ? ` [${selectedBand.feature}]` : ''}
            </span>
          ) : (
            <span className="text-slate-400">
              S/N: <strong className="text-emerald-400">{stats.snr}</strong> | MIN: <strong className="text-slate-200">{stats.min}</strong> MAX: <strong className="text-slate-200">{stats.max}</strong> mJy
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
