import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Crosshair,
  RotateCcw,
  Layers
} from 'lucide-react';
import realSpaceStars from '../data/realSpaceData.json';

export default function BlinkComparator({
  sector,
  selectedAnomaly,
  onSelectAnomaly,
  onFlagCoordinate,
  showKnownObjects = true,
  activeBandPreset = 'full_nir'
}) {
  const [currentEpochIndex, setCurrentEpochIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [blinkSpeedMs, setBlinkSpeedMs] = useState(700);

  // New Modes: Real FITS images vs Canvas simulation, Difference Imaging, Invert colors
  const [viewMode, setViewMode] = useState('simulation'); // 'simulation' | 'fits'
  const [isDifferenceMode, setIsDifferenceMode] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [useGaiaCatalog] = useState(true);

  // Image load tracking
  const [imagesLoaded, setImagesLoaded] = useState([false, false, false, false]);
  const [imagesError, setImagesError] = useState(false);

  const canvasRef = useRef(null);
  const imgRefs = useRef([]);

  const epochsObserved = sector?.epoch_coverage?.epochs_observed || [
    '2025-02-01',
    '2025-08-01',
    '2026-02-01',
    '2026-08-01'
  ];
  const totalEpochs = epochsObserved.length;

  // Preload real astronomical images from /images/epoch_1.png to epoch_4.png
  useEffect(() => {
    let active = true;
    const loadedArr = [false, false, false, false];
    const imageObjects = [];

    for (let i = 1; i <= 4; i++) {
      const img = new Image();
      img.src = `/images/epoch_${i}.png`;
      img.onload = () => {
        if (!active) return;
        loadedArr[i - 1] = true;
        setImagesLoaded([...loadedArr]);
      };
      img.onerror = () => {
        if (!active) return;
        setImagesError(true);
      };
      imageObjects.push(img);
    }

    imgRefs.current = imageObjects;

    return () => {
      active = false;
    };
  }, []);

  // Auto-blink animation loop
  useEffect(() => {
    if (!isPlaying || totalEpochs <= 1) return;
    const interval = setInterval(() => {
      setCurrentEpochIndex((prev) => (prev + 1) % totalEpochs);
    }, blinkSpeedMs);
    return () => clearInterval(interval);
  }, [isPlaying, totalEpochs, blinkSpeedMs]);

  // False-color spectral tint based on activeBandPreset
  const spectralTint = useMemo(() => {
    switch (activeBandPreset) {
      case 'h2o_ice':
        return { r: 6, g: 182, b: 212, label: 'H2O Ice 3.1μm (Cyan)' };
      case 'ch4_dwarf':
        return { r: 217, g: 70, b: 239, label: 'CH4 Dwarf 3.3μm (Magenta)' };
      case 'co2_comet':
        return { r: 245, g: 158, b: 11, label: 'CO2 Comet 4.26μm (Amber)' };
      case 'full_nir':
      default:
        return { r: 56, g: 189, b: 248, label: 'Full NIR 0.75-5.0μm' };
    }
  }, [activeBandPreset]);

  // Main Canvas Rendering Engine (Simulated + FITS + Difference Imaging)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;

    // 1. CLEAR VIEWPORT
    ctx.fillStyle = '#020617'; // deep space slate-950
    ctx.fillRect(0, 0, width, height);

    const hasRealImages = imagesLoaded.every(Boolean) && !imagesError;

    // 2. RENDER REAL NASA SKYVIEW FITS IMAGES (If in FITS mode and loaded)
    if (viewMode === 'fits' && hasRealImages && imgRefs.current[currentEpochIndex]) {
      const activeImg = imgRefs.current[currentEpochIndex];
      const epoch1Img = imgRefs.current[0];

      if (isDifferenceMode && epoch1Img) {
        // True Pixel-Level Difference Imaging Mode:
        // Draw active epoch on an offscreen buffer, draw Epoch 1 on another, subtract pixel luminance
        const offCanvasActive = document.createElement('canvas');
        offCanvasActive.width = width;
        offCanvasActive.height = height;
        const offCtxActive = offCanvasActive.getContext('2d');
        offCtxActive.drawImage(activeImg, 0, 0, width, height);

        const offCanvasE1 = document.createElement('canvas');
        offCanvasE1.width = width;
        offCanvasE1.height = height;
        const offCtxE1 = offCanvasE1.getContext('2d');
        offCtxE1.drawImage(epoch1Img, 0, 0, width, height);

        const imgDataActive = offCtxActive.getImageData(0, 0, width, height);
        const imgDataE1 = offCtxE1.getImageData(0, 0, width, height);
        const diffData = ctx.createImageData(width, height);

        for (let i = 0; i < imgDataActive.data.length; i += 4) {
          // Stationary stars have equal brightness in both epochs, canceling out to zero
          const diff = Math.abs(imgDataActive.data[i] - imgDataE1.data[i]) * 2.5;
          diffData.data[i] = Math.min(255, diff * (spectralTint.r / 255));
          diffData.data[i + 1] = Math.min(255, diff * (spectralTint.g / 255));
          diffData.data[i + 2] = Math.min(255, diff * (spectralTint.b / 255));
          diffData.data[i + 3] = 255;
        }
        ctx.putImageData(diffData, 0, 0);
      } else {
        // Normal FITS image rendering
        ctx.drawImage(activeImg, 0, 0, width, height);

        // Apply subtle spectral tinting
        ctx.fillStyle = `rgba(${spectralTint.r}, ${spectralTint.g}, ${spectralTint.b}, 0.08)`;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // 3. RENDER SYNTHETIC STARFIELD SIMULATION WITH GAIA DR3 DATA
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        width / 1.5
      );
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Apply subtle false-color spectral tint in synthetic simulation mode too
      ctx.fillStyle = `rgba(${spectralTint.r}, ${spectralTint.g}, ${spectralTint.b}, 0.04)`;
      ctx.fillRect(0, 0, width, height);

      // Faint coordinate grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      for (let x = 40; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 40; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw real stars from Gaia DR3 catalog (realSpaceData.json)
      // Mapped relative to current active sector center (ra_center, dec_center)
      if (useGaiaCatalog && realSpaceStars && realSpaceStars.length > 0) {
        realSpaceStars.forEach((star, sIdx) => {
          // Offsets computed relative to sector center so stars align across any sky sector
          const offsetRa = ((star.x - 56.75) * 1.2);
          const offsetDec = ((star.y - 24.11) * 1.2);
          const starRa = (sector?.ra_center ?? 150.42) + offsetRa;
          const starDec = (sector?.dec_center ?? 2.18) + offsetDec;

          const sx = ((starRa - ((sector?.ra_center ?? 150.42) - 0.2)) / 0.4) * width;
          const sy = ((starDec - ((sector?.dec_center ?? 2.18) - 0.2)) / 0.4) * height;

          // Invert magnitude for display radius: brighter stars have lower magnitude numbers
          const radius = Math.max(0.9, Math.min(3.6, (22 - star.brightness) * 0.35));

          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, Math.PI * 2);
          ctx.fillStyle = sIdx % 4 === 0 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(226, 232, 240, 0.85)';
          ctx.shadowColor = '#94a3b8';
          ctx.shadowBlur = 4;
          ctx.fill();
        });
      } else {
        // Fallback procedural seed stars
        const seedStars = [
          { x: 0.22, y: 0.35, r: 2.2 },
          { x: 0.78, y: 0.25, r: 1.8 },
          { x: 0.45, y: 0.82, r: 2.6 },
          { x: 0.15, y: 0.75, r: 1.4 },
          { x: 0.88, y: 0.65, r: 1.9 },
          { x: 0.62, y: 0.40, r: 1.2 }
        ];
        seedStars.forEach((star) => {
          ctx.beginPath();
          ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
          ctx.shadowColor = '#94a3b8';
          ctx.shadowBlur = 4;
          ctx.fill();
        });
      }

      // Draw known objects overlay (Gaia DR3 / SIMBAD objects in current sector)
      if (showKnownObjects && sector?.known_objects) {
        sector.known_objects.forEach((obj) => {
          const ox = ((obj.ra - (sector.ra_center - 0.2)) / 0.4) * width;
          const oy = ((obj.dec - (sector.dec_center - 0.2)) / 0.4) * height;

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(ox - 8, oy - 8, 16, 16);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.font = '10px monospace';
          ctx.fillText(obj.name.slice(0, 14), ox + 10, oy + 4);
        });
      }

      // Draw moving anomalies (their position shifts per currentEpochIndex!)
      if (sector?.anomalies) {
        sector.anomalies.forEach((anom) => {
          const epochPos = anom.positions_by_epoch?.[currentEpochIndex] || {
            ra: anom.ra,
            dec: anom.dec
          };

          const ax = ((epochPos.ra - (sector.ra_center - 0.2)) / 0.4) * width;
          const ay = ((epochPos.dec - (sector.dec_center - 0.2)) / 0.4) * height;

          if (isDifferenceMode && currentEpochIndex > 0) {
            // Difference dipole rendering: positive peak (cyan) and negative ghost (dark red)
            const epoch1Pos = anom.positions_by_epoch?.[0] || epochPos;
            const e1x = ((epoch1Pos.ra - (sector.ra_center - 0.2)) / 0.4) * width;
            const e1y = ((epoch1Pos.dec - (sector.dec_center - 0.2)) / 0.4) * height;

            // Ghost of Epoch 1 (negative hole)
            ctx.beginPath();
            ctx.arc(e1x, e1y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#f43f5e';
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 6;
            ctx.fill();

            // Active Epoch candidate (positive excess)
            ctx.beginPath();
            ctx.arc(ax, ay, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#22d3ee';
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 8;
            ctx.fill();
          } else {
            // Standard moving candidate dot
            ctx.beginPath();
            ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#06b6d4';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 8;
            ctx.fill();
          }

          // Target Reticle if selected
          if (selectedAnomaly?.anomaly_id === anom.anomaly_id) {
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.arc(ax, ay, 16, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(ax - 22, ay);
            ctx.lineTo(ax - 18, ay);
            ctx.moveTo(ax + 18, ay);
            ctx.lineTo(ax + 22, ay);
            ctx.moveTo(ax, ay - 22);
            ctx.lineTo(ax, ay - 18);
            ctx.moveTo(ax, ay + 18);
            ctx.lineTo(ax, ay + 22);
            ctx.stroke();

            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(`TARGET: ${anom.designation}`, ax + 20, ay - 10);
            ctx.fillText(
              `MOTION: PM ${anom.proper_motion?.pm_ra ?? '—'}"/yr`,
              ax + 20,
              ay + 6
            );
          }
        });
      }
    }
  }, [
    sector,
    currentEpochIndex,
    selectedAnomaly,
    showKnownObjects,
    viewMode,
    isDifferenceMode,
    spectralTint,
    useGaiaCatalog,
    imagesLoaded,
    imagesError
  ]);

  // Handle canvas clicks: select existing anomaly or flag new coordinate
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !sector) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedRa = Number(
      (sector.ra_center - 0.2 + (x / rect.width) * 0.4).toFixed(4)
    );
    const clickedDec = Number(
      (sector.dec_center - 0.2 + (y / rect.height) * 0.4).toFixed(4)
    );

    const found = sector.anomalies?.find((anom) => {
      return (
        Math.abs(anom.ra - clickedRa) < 0.05 &&
        Math.abs(anom.dec - clickedDec) < 0.05
      );
    });

    if (found) {
      onSelectAnomaly?.(found);
    } else {
      onFlagCoordinate?.({ ra: clickedRa, dec: clickedDec });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-xs gap-2">
        {/* Left: Component Title & Sector Badge */}
        <div className="flex items-center space-x-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
            Blink Comparator & Difference Engine
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono-telemetry border border-cyan-800/40 text-[11px]">
            {sector?.sector_name || 'Loading Sector...'}
          </span>
        </div>

        {/* Center: Mode Toggles (FITS vs Simulation, Difference Mode, Invert Colors) */}
        <div className="flex items-center space-x-1.5 font-mono-telemetry text-[11px]">
          {/* Mode Switch: Simulation vs Real FITS Cutouts */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700/60 p-0.5">
            <button
              onClick={() => setViewMode('simulation')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                viewMode === 'simulation'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gaia Simulation
            </button>
            <button
              onClick={() => setViewMode('fits')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                viewMode === 'fits'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="NASA SkyView Real Optical/Infrared FITS Cutouts"
            >
              NASA SkyView FITS
            </button>
          </div>

          {/* Difference Mode Toggle */}
          <button
            onClick={() => setIsDifferenceMode(!isDifferenceMode)}
            className={`px-2 py-1 rounded text-[10px] border flex items-center space-x-1 transition ${
              isDifferenceMode
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Subtract Epoch 1 to highlight moving dipoles"
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Difference Mode</span>
          </button>

          {/* Astronomical Negative / Invert Colors */}
          <button
            onClick={() => setIsInverted(!isInverted)}
            className={`px-2 py-1 rounded text-[10px] border flex items-center space-x-1 transition ${
              isInverted
                ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Invert Luminance (Astronomical Negative View)"
          >
            <RotateCcw className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Invert</span>
          </button>
        </div>

        {/* Right: Blink Cadence & Epoch Switchers */}
        <div className="flex items-center space-x-2">
          {/* Epoch Selector Pills */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700/60 p-0.5">
            {epochsObserved.map((dateStr, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentEpochIndex(idx);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-telemetry transition ${
                  currentEpochIndex === idx
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                E{idx + 1}
              </button>
            ))}
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
            title={isPlaying ? 'Pause Blink' : 'Auto Blink'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() =>
              setBlinkSpeedMs((s) => (s === 700 ? 350 : s === 350 ? 1200 : 700))
            }
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[10px] font-mono-telemetry"
            title="Toggle Blink Cadence"
          >
            {blinkSpeedMs}ms
          </button>
        </div>
      </div>

      {/* Main Viewport Canvas */}
      <div
        className={`relative flex-1 bg-slate-950 min-h-[320px] flex items-center justify-center cursor-crosshair overflow-hidden transition-all duration-200 ${
          isInverted ? 'invert' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain"
        />

        {/* Realtime Telemetry HUD Overlays */}
        <div className="absolute top-3 left-3 pointer-events-none space-y-1 text-[11px] font-mono-telemetry">
          <div className="px-2 py-1 rounded bg-slate-950/85 border border-slate-800 text-cyan-300 backdrop-blur-sm flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              EPOCH {currentEpochIndex + 1} OF {totalEpochs} [
              {epochsObserved[currentEpochIndex]}]
            </span>
          </div>

          <div className="px-2 py-1 rounded bg-slate-950/85 border border-slate-800 text-slate-400 backdrop-blur-sm flex items-center space-x-2">
            <span>MODE: {viewMode.toUpperCase()}</span>
            <span>|</span>
            <span className="text-cyan-400">TINT: {spectralTint.label}</span>
          </div>
        </div>

        {/* Difference Mode Status Overlay */}
        {isDifferenceMode && (
          <div className="absolute top-3 right-3 pointer-events-none text-[11px] font-mono-telemetry">
            <div className="px-2.5 py-1 rounded bg-amber-950/90 border border-amber-500/60 text-amber-300 backdrop-blur-sm flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>DIFFERENCE SUBTRACTION: (E{currentEpochIndex + 1} − E1)</span>
            </div>
          </div>
        )}

        {/* Bottom Click to Flag Hint */}
        <div className="absolute bottom-3 right-3 pointer-events-none text-[10px] font-mono-telemetry">
          <div className="px-2.5 py-1 rounded bg-slate-950/85 border border-cyan-500/40 text-cyan-400 backdrop-blur-sm">
            CLICK TO SELECT OR FLAG COORDINATES
          </div>
        </div>
      </div>
    </div>
  );
}
