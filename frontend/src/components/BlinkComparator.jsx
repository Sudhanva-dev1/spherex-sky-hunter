/* MEMBER 2: Replace this entire file with your BlinkComparator implementation */
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Crosshair, Layers, ZoomIn, Info } from 'lucide-react';

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
  const canvasRef = useRef(null);

  const epochsObserved = sector?.epoch_coverage?.epochs_observed || ['2025-02-01', '2025-08-01'];
  const totalEpochs = epochsObserved.length;

  // Auto-blink loop
  useEffect(() => {
    if (!isPlaying || totalEpochs <= 1) return;
    const interval = setInterval(() => {
      setCurrentEpochIndex((prev) => (prev + 1) % totalEpochs);
    }, blinkSpeedMs);
    return () => clearInterval(interval);
  }, [isPlaying, totalEpochs, blinkSpeedMs]);

  // Canvas renderer for multi-epoch visual simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#020617'; // deep space slate-950
    ctx.fillRect(0, 0, width, height);

    // Subtle cosmic noise / background gradient
    const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width / 1.5);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Coordinate grid overlay
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

    // Static background reference stars (fixed between epochs)
    const seedStars = [
      { x: 0.22, y: 0.35, r: 2.2, mag: 11.2 },
      { x: 0.78, y: 0.25, r: 1.8, mag: 12.8 },
      { x: 0.45, y: 0.82, r: 2.6, mag: 10.5 },
      { x: 0.15, y: 0.75, r: 1.4, mag: 14.1 },
      { x: 0.88, y: 0.65, r: 1.9, mag: 12.0 },
      { x: 0.62, y: 0.40, r: 1.2, mag: 15.2 }
    ];

    seedStars.forEach((star) => {
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.shadowColor = '#94a3b8';
      ctx.shadowBlur = 4;
      ctx.fill();
    });

    // Draw catalog known objects if enabled
    if (showKnownObjects && sector?.known_objects) {
      sector.known_objects.forEach((obj, idx) => {
        const ox = ((obj.ra - (sector.ra_center - 0.2)) / 0.4) * width;
        const oy = ((obj.dec - (sector.dec_center - 0.2)) / 0.4) * height;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.strokeRect(ox - 8, oy - 8, 16, 16);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.font = '10px monospace';
        ctx.fillText(obj.name.slice(0, 12), ox + 10, oy + 4);
      });
    }

    // Draw moving anomalies (their position shifts per currentEpochIndex!)
    if (sector?.anomalies) {
      sector.anomalies.forEach((anom) => {
        const epochPos = anom.positions_by_epoch?.[currentEpochIndex] || {
          ra: anom.ra,
          dec: anom.dec
        };

        // Relative coordinate mapping to canvas
        const ax = ((epochPos.ra - (sector.ra_center - 0.2)) / 0.4) * width;
        const ay = ((epochPos.dec - (sector.dec_center - 0.2)) / 0.4) * height;

        // Draw moving candidate dot
        ctx.beginPath();
        ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4'; // cyan
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fill();

        // If selected, draw animated reticle crosshair
        if (selectedAnomaly?.anomaly_id === anom.anomaly_id) {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.5;

          // Circular reticle
          ctx.beginPath();
          ctx.arc(ax, ay, 16, 0, Math.PI * 2);
          ctx.stroke();

          // Crosshairs
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
          ctx.fillText(`MOTION: PM ${anom.proper_motion?.pm_ra ?? '—'} "/yr`, ax + 20, ay + 6);
        }
      });
    }
  }, [sector, currentEpochIndex, selectedAnomaly, showKnownObjects]);

  // Handle click on canvas for selection or flagging
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !sector) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedRa = Number((sector.ra_center - 0.2 + (x / rect.width) * 0.4).toFixed(4));
    const clickedDec = Number((sector.dec_center - 0.2 + (y / rect.height) * 0.4).toFixed(4));

    // Check if clicked near an existing anomaly
    const found = sector.anomalies?.find((anom) => {
      return Math.abs(anom.ra - clickedRa) < 0.05 && Math.abs(anom.dec - clickedDec) < 0.05;
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
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider">
            Multi-Epoch Blink Comparator
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono-telemetry border border-cyan-800/40">
            {sector?.sector_name || 'Loading Sector...'}
          </span>
        </div>

        {/* Blink Controls */}
        <div className="flex items-center space-x-2">
          {/* Active Band Indicator */}
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono-telemetry text-[11px]">
            BAND: {activeBandPreset.toUpperCase()}
          </span>

          {/* Epoch Selector Pills */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700/60 p-0.5">
            {epochsObserved.map((dateStr, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentEpochIndex(idx);
                }}
                className={`px-2 py-1 rounded text-[11px] font-mono-telemetry transition ${
                  currentEpochIndex === idx
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                E{idx + 1} ({dateStr.slice(0, 7)})
              </button>
            ))}
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
            title={isPlaying ? 'Pause Blink' : 'Auto Blink'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => setBlinkSpeedMs((s) => (s === 700 ? 350 : s === 350 ? 1200 : 700))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px] font-mono-telemetry"
            title="Toggle Blink Cadence"
          >
            {blinkSpeedMs}ms
          </button>
        </div>
      </div>

      {/* Main Viewport Canvas */}
      <div className="relative flex-1 bg-slate-950 min-h-[320px] flex items-center justify-center cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain"
        />

        {/* Realtime Telemetry HUD Overlays */}
        <div className="absolute top-3 left-3 pointer-events-none space-y-1 text-[11px] font-mono-telemetry">
          <div className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-cyan-300 backdrop-blur-sm">
            EPOCH {currentEpochIndex + 1} OF {totalEpochs} [{epochsObserved[currentEpochIndex]}]
          </div>
          <div className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-400 backdrop-blur-sm">
            FOV: {sector?.fov_deg ?? 3.5}° | RA: {sector?.ra_center ?? 0}° DEC: {sector?.dec_center ?? 0}°
          </div>
        </div>

        <div className="absolute bottom-3 right-3 pointer-events-none text-[11px] font-mono-telemetry">
          <div className="px-2.5 py-1 rounded bg-slate-950/85 border border-cyan-500/40 text-cyan-400 backdrop-blur-sm flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>CLICK TO SELECT OR FLAG COORDINATES</span>
          </div>
        </div>
      </div>
    </div>
  );
}
