import React, { useState, useEffect, useRef } from 'react';
import { Globe, Radio, Navigation } from 'lucide-react';

/**
 * Solves the Mollweide projection auxiliary angle theta using Newton-Raphson:
 * 2*theta + sin(2*theta) = PI * sin(dec_rad)
 */
function mollweideTheta(decRad) {
  let theta = decRad;
  const target = Math.PI * Math.sin(decRad);
  for (let i = 0; i < 10; i++) {
    const num = 2 * theta + Math.sin(2 * theta) - target;
    const den = 2 + 2 * Math.cos(2 * theta);
    const delta = num / den;
    theta -= delta;
    if (Math.abs(delta) < 1e-6) break;
  }
  return theta;
}

/**
 * Projects celestial coordinates (RA, Dec in degrees) to normalized Mollweide coordinates:
 * x in [-1, 1], y in [-1, 1] within the 2:1 ellipse
 */
function projectMollweide(raDeg, decDeg, centerRaDeg = 180) {
  // Normalize RA relative to central meridian (-180 to +180 deg)
  let deltaRa = (raDeg - centerRaDeg) % 360;
  if (deltaRa > 180) deltaRa -= 360;
  if (deltaRa < -180) deltaRa += 360;

  const lambda = (deltaRa * Math.PI) / 180;
  const phi = (decDeg * Math.PI) / 180;
  const theta = mollweideTheta(phi);

  const xNorm = (2 * Math.SQRT2 * lambda * Math.cos(theta)) / (Math.PI * Math.PI);
  const yNorm = (Math.SQRT2 * Math.sin(theta)) / Math.PI;

  return { xNorm, yNorm };
}

export default function SkyMap({ sectors, activeSectorId, onSelectSector }) {
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'aladin'
  const [customRa, setCustomRa] = useState('');
  const [customDec, setCustomDec] = useState('');
  const [aladinStatus, setAladinStatus] = useState('uninitialized');
  const canvasRef = useRef(null);
  const aladinContainerRef = useRef(null);

  const sectorList = Object.values(sectors || {});
  const activeSector = sectors?.[activeSectorId] || sectorList[0];

  // Draw Mollweide Projection Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'canvas') return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const rx = width * 0.46; // semi-major axis (2:1 ratio)
    const ry = height * 0.44; // semi-minor axis

    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Mollweide Boundary Ellipse Clipping & Gradient
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
    bgGrad.addColorStop(0, '#0c1527');
    bgGrad.addColorStop(0.8, '#040915');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Background star density (fixed seed simulation)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 180; i++) {
      const seedRa = (i * 137.5) % 360;
      const seedDec = (((i * 47.3) % 180) - 90);
      const { xNorm, yNorm } = projectMollweide(seedRa, seedDec, 180);
      const sx = cx + xNorm * rx;
      const sy = cy - yNorm * ry;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0) ? 1.5 : 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coordinate Grid: Declination Parallels (-60, -30, 0, 30, 60)
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 4]);
    [-60, -30, 0, 30, 60].forEach((dec) => {
      ctx.beginPath();
      if (dec === 0) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)'; // Equator in cyan
      } else {
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      }
      for (let ra = 0; ra <= 360; ra += 4) {
        const { xNorm, yNorm } = projectMollweide(ra, dec, 180);
        const px = cx + xNorm * rx;
        const py = cy - yNorm * ry;
        if (ra === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Coordinate Grid: Right Ascension Meridians
    [0, 60, 120, 180, 240, 300].forEach((ra) => {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      for (let dec = -90; dec <= 90; dec += 4) {
        const { xNorm, yNorm } = projectMollweide(ra, dec, 180);
        const px = cx + xNorm * rx;
        const py = cy - yNorm * ry;
        if (dec === -90) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Galactic Plane overlay (inclination ~62.87°)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)'; // amber
    ctx.lineWidth = 1.2;
    for (let l = 0; l <= 360; l += 5) {
      const bRad = 0;
      const lRad = (l * Math.PI) / 180;
      const decApprox = Math.asin(Math.cos(bRad) * Math.sin(lRad) * Math.sin(0.478) + Math.sin(bRad) * Math.cos(0.478));
      const { xNorm, yNorm } = projectMollweide(l, (decApprox * 180) / Math.PI, 180);
      const gx = cx + xNorm * rx;
      const gy = cy - yNorm * ry;
      if (l === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();

    // SPHEREx Sun-Synchronous Orbital Swath Overlay
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.25)'; // indigo
    ctx.lineWidth = 16;
    for (let s = 0; s <= 360; s += 6) {
      const swathDec = Math.sin((s * Math.PI) / 180) * 88;
      const { xNorm, yNorm } = projectMollweide(s, swathDec, 180);
      const sx = cx + xNorm * rx;
      const sy = cy - yNorm * ry;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.restore(); // Remove clipping

    // Outer Ellipse Border with glowing edge
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Sector Pulsing Beacons
    sectorList.forEach((sec) => {
      const { xNorm, yNorm } = projectMollweide(sec.ra_center, sec.dec_center, 180);
      const bx = cx + xNorm * rx;
      const by = cy - yNorm * ry;
      const isSelected = sec.sector_id === activeSectorId;

      // Outer beacon pulse
      ctx.beginPath();
      ctx.arc(bx, by, isSelected ? 12 : 7, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(99, 102, 241, 0.2)';
      ctx.fill();

      // Core beacon dot
      ctx.beginPath();
      ctx.arc(bx, by, isSelected ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#22d3ee' : '#a5b4fc';
      ctx.shadowColor = isSelected ? '#22d3ee' : '#818cf8';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sector Label
      ctx.fillStyle = isSelected ? '#22d3ee' : '#94a3b8';
      ctx.font = isSelected ? 'bold 10px monospace' : '9px monospace';
      ctx.fillText(sec.sector_name.slice(0, 16), bx + 8, by - 6);
    });
  }, [sectors, sectorList, activeSectorId, activeTab]);

  // Switch tab and handle Aladin Lite loading safely
  const handleTabSwitch = (mode) => {
    setActiveTab(mode);
    if (mode === 'aladin') {
      setAladinStatus('loading');
    }
  };

  // Aladin Lite v3 dynamic CDN loader (guarded with offline fallback)
  useEffect(() => {
    if (activeTab !== 'aladin') return;

    let isMounted = true;
    const scriptId = 'aladin-lite-v3-script';
    const script = document.getElementById(scriptId);

    const initAladin = () => {
      if (!window.A || !aladinContainerRef.current || !isMounted) return;
      try {
        aladinContainerRef.current.innerHTML = '';
        window.A.init.then(() => {
          if (!isMounted) return;
          window.A.aladin(aladinContainerRef.current, {
            survey: 'P/2MASS/color',
            fov: activeSector?.fov_deg || 3.5,
            target: `${activeSector?.ra_center} ${activeSector?.dec_center}`,
            showReticle: true
          });
          setAladinStatus('ready');
        });
      } catch (err) {
        console.warn('Aladin Lite initialization failed:', err);
        if (isMounted) setAladinStatus('error');
      }
    };

    if (!script) {
      const newScript = document.createElement('script');
      newScript.id = scriptId;
      newScript.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js';
      newScript.async = true;
      newScript.onload = () => initAladin();
      newScript.onerror = () => {
        if (isMounted) setAladinStatus('error');
      };
      document.body.appendChild(newScript);
    } else if (window.A) {
      initAladin();
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, activeSector]);

  // Handle clicking on the Mollweide canvas to find nearest sector
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = rect.width * 0.46;
    const ry = rect.height * 0.44;

    let closestSector = null;
    let minDistance = 25; // 25px radius

    sectorList.forEach((sec) => {
      const { xNorm, yNorm } = projectMollweide(sec.ra_center, sec.dec_center, 180);
      const bx = cx + xNorm * rx;
      const by = cy - yNorm * ry;
      const dist = Math.hypot(clickX - bx, clickY - by);
      if (dist < minDistance) {
        minDistance = dist;
        closestSector = sec;
      }
    });

    if (closestSector) {
      onSelectSector(closestSector.sector_id);
    }
  };

  // Custom coordinate jump
  const handleJump = (e) => {
    e.preventDefault();
    const r = parseFloat(customRa);
    const d = parseFloat(customDec);
    if (!isNaN(r) && !isNaN(d)) {
      // Find nearest sector to requested coordinates
      let closest = sectorList[0];
      let minAng = Infinity;
      sectorList.forEach((sec) => {
        const ang = Math.hypot(sec.ra_center - r, sec.dec_center - d);
        if (ang < minAng) {
          minAng = ang;
          closest = sec;
        }
      });
      if (closest) {
        onSelectSector(closest.sector_id);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header & Tabs */}
      <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-slate-200 uppercase tracking-wider">
            All-Sky Celestial Navigator
          </h2>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700/60 p-0.5">
          <button
            onClick={() => handleTabSwitch('canvas')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              activeTab === 'canvas'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mollweide All-Sky
          </button>
          <button
            onClick={() => handleTabSwitch('aladin')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              activeTab === 'aladin'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Aladin 2MASS / WISE
          </button>
        </div>
      </div>

      {/* Main Celestial Viewport */}
      <div className="relative flex-1 bg-slate-950 min-h-[220px] flex items-center justify-center overflow-hidden">
        {activeTab === 'canvas' ? (
          <canvas
            ref={canvasRef}
            width={520}
            height={260}
            onClick={handleCanvasClick}
            className="w-full h-full object-contain cursor-pointer"
          />
        ) : (
          <div className="w-full h-full relative">
            <div ref={aladinContainerRef} className="w-full h-full min-h-[240px]" />
            {aladinStatus === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-cyan-400 text-xs">
                Connecting to CDS Aladin Lite v3...
              </div>
            )}
            {aladinStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 text-xs p-4 text-center">
                <Radio className="w-6 h-6 text-amber-400 mb-2 animate-pulse" />
                <p className="font-semibold text-amber-300">Aladin Live Sky Offline</p>
                <p className="text-slate-400 mt-1 max-w-xs">
                  Network connection to CDS Strasbourg server unavailable. Using native Mollweide canvas.
                </p>
                <button
                  onClick={() => handleTabSwitch('canvas')}
                  className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs"
                >
                  Return to Mollweide Projection
                </button>
              </div>
            )}
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-2 left-2 flex items-center space-x-3 text-[10px] font-mono-telemetry bg-slate-950/85 px-2 py-1 rounded border border-slate-800">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-0.5 bg-amber-400" />
            <span className="text-slate-400">Galactic</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-0.5 bg-cyan-400" />
            <span className="text-slate-400">Ecliptic</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-1 bg-indigo-400/60" />
            <span className="text-slate-400">Swath</span>
          </span>
        </div>
      </div>

      {/* Coordinate Jump Form */}
      <form onSubmit={handleJump} className="px-3 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center space-x-2 text-xs">
        <span className="text-[10px] font-mono-telemetry text-slate-400 uppercase">Target:</span>
        <input
          type="number"
          step="any"
          placeholder="RA (0-360)"
          value={customRa}
          onChange={(e) => setCustomRa(e.target.value)}
          className="w-24 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-[11px] font-mono-telemetry text-slate-200 outline-none focus:border-cyan-400"
        />
        <input
          type="number"
          step="any"
          placeholder="Dec (-90-+90)"
          value={customDec}
          onChange={(e) => setCustomDec(e.target.value)}
          className="w-24 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-[11px] font-mono-telemetry text-slate-200 outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          className="flex items-center space-x-1 px-2.5 py-0.5 bg-slate-800 hover:bg-cyan-950/70 hover:text-cyan-300 text-slate-300 border border-slate-700 rounded text-[11px] transition"
        >
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>Pan</span>
        </button>
      </form>

      {/* Sector Selection List */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Target Sky Sectors ({sectorList.length})</span>
          <span className="font-mono-telemetry text-cyan-400">0.75 - 5.0 μm</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sectorList.map((sec) => {
            const isSelected = sec.sector_id === activeSectorId;
            return (
              <button
                key={sec.sector_id}
                onClick={() => onSelectSector(sec.sector_id)}
                className={`text-left p-2 rounded-lg border transition text-xs ${
                  isSelected
                    ? 'bg-cyan-950/50 border-cyan-400 text-cyan-200 glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold truncate">{sec.sector_name}</div>
                <div className="text-[10px] font-mono-telemetry text-slate-400 mt-0.5">
                  RA: {sec.ra_center}° | DEC: {sec.dec_center}°
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Mission Telemetry Cards */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 border-t border-slate-800 text-[11px] font-mono-telemetry">
        <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
          <div className="text-slate-500 text-[10px]">CURRENT EPOCH</div>
          <div className="text-cyan-400 font-bold mt-0.5">
            E{activeSector?.epoch_coverage?.current_epoch || 2} / {activeSector?.epoch_coverage?.total_epochs || 4}
          </div>
          <div className="text-[9px] text-slate-500">6-mo Cadence</div>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
          <div className="text-slate-500 text-[10px]">RESOLUTION</div>
          <div className="text-indigo-400 font-bold mt-0.5">R = 40 - 130</div>
          <div className="text-[9px] text-slate-500">102 NIR Bands</div>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
          <div className="text-slate-500 text-[10px]">CATALOG CROSS</div>
          <div className="text-emerald-400 font-bold mt-0.5">
            {activeSector?.known_objects?.length || 3} Objects
          </div>
          <div className="text-[9px] text-slate-500">Gaia / SIMBAD</div>
        </div>
      </div>
    </div>
  );
}
