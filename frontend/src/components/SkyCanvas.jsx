import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { CELESTIAL_TARGETS } from '../utils/spectralData';
import { Crosshair, Eye, Compass } from 'lucide-react';

export default function SkyCanvas({ selectedTargetId, onSelectTarget, className = '' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [containerWidth, setContainerWidth] = useState(600);

  // Generate a static starfield for consistency using useMemo
  const stars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => ({
        x: Math.sin(i * 997.1) * 0.5 + 0.5,
        y: Math.cos(i * 613.3) * 0.5 + 0.5,
        radius: i % 5 === 0 ? 1.8 : i % 2 === 0 ? 1.2 : 0.8,
        alpha: 0.3 + (i % 7) * 0.1,
        twinkleSpeed: 0.02 + (i % 4) * 0.015,
      })),
    []
  );

  // Handle canvas rendering and animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const render = () => {
      time += 0.025;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // 2. Cosmic Galactic Dust Clouds Gradient
      const dustGradient = ctx.createLinearGradient(0, height * 0.85, width, height * 0.15);
      dustGradient.addColorStop(0, 'rgba(6, 182, 212, 0.03)');
      dustGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.05)');
      dustGradient.addColorStop(1, 'rgba(244, 63, 94, 0.03)');
      ctx.fillStyle = dustGradient;
      ctx.fillRect(0, 0, width, height);

      // 3. Celestial Coordinate Grid (RA & Dec Lines)
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      // Vertical RA lines
      for (let i = 1; i <= 5; i++) {
        const x = (width / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal Dec lines
      for (let j = 1; j <= 3; j++) {
        const y = (height / 4) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 4. Background Twinkling Stars
      stars.forEach((star) => {
        const currentAlpha = star.alpha * (0.7 + 0.3 * Math.sin(time * star.twinkleSpeed * 100));
        ctx.fillStyle = `rgba(226, 232, 240, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Constellation Guide Link Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < CELESTIAL_TARGETS.length - 1; k++) {
        const t1 = CELESTIAL_TARGETS[k];
        const t2 = CELESTIAL_TARGETS[k + 1];
        ctx.moveTo(t1.canvasX * width, t1.canvasY * height);
        ctx.lineTo(t2.canvasX * width, t2.canvasY * height);
      }
      ctx.stroke();

      // 6. Draw Celestial Targets (Member 2's Celestial Objects)
      CELESTIAL_TARGETS.forEach((target) => {
        const cx = target.canvasX * width;
        const cy = target.canvasY * height;
        const isSelected = target.id === selectedTargetId;
        const isHovered = hoveredTarget && hoveredTarget.id === target.id;

        // Outer Pulsing Radar Halo
        const pulse = (Math.sin(time * 2 + target.canvasX * 10) + 1) * 0.5;
        const haloRadius = isSelected ? 22 + pulse * 6 : isHovered ? 18 + pulse * 4 : 14;

        ctx.strokeStyle = target.color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Soft Radial Glow
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, haloRadius * 1.5);
        glow.addColorStop(0, target.glowColor);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, haloRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core Node
        ctx.fillStyle = target.color;
        ctx.beginPath();
        ctx.arc(cx, cy, isSelected ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();

        // Targeting Reticle for Selected Object
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          const reticleSize = haloRadius + 5;
          ctx.beginPath();
          ctx.moveTo(cx - reticleSize, cy); ctx.lineTo(cx - reticleSize + 4, cy);
          ctx.moveTo(cx + reticleSize, cy); ctx.lineTo(cx + reticleSize - 4, cy);
          ctx.moveTo(cx, cy - reticleSize); ctx.lineTo(cx, cy - reticleSize + 4);
          ctx.moveTo(cx, cy + reticleSize); ctx.lineTo(cx, cy + reticleSize - 4);
          ctx.stroke();
        }

        // Label
        ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace';
        ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(target.name, cx, cy + haloRadius + 14);

        ctx.font = '9px monospace';
        ctx.fillStyle = target.color;
        ctx.fillText(target.type.split(' ')[0], cx, cy + haloRadius + 26);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stars, selectedTargetId, hoveredTarget]);

  // Handle Resize for sharp canvas rendering
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    setContainerWidth(rect.width);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Hit test for mouse hover & clicks
  const getTargetAtCoords = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const hitRadius = 28;
      for (const target of CELESTIAL_TARGETS) {
        const tx = target.canvasX * rect.width;
        const ty = target.canvasY * rect.height;
        const dist = Math.hypot(x - tx, y - ty);
        if (dist <= hitRadius) {
          return target;
        }
      }
      return null;
    },
    []
  );

  const handleMouseMove = (e) => {
    const target = getTargetAtCoords(e.clientX, e.clientY);
    setHoveredTarget(target);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleClick = (e) => {
    const target = getTargetAtCoords(e.clientX, e.clientY);
    if (target && onSelectTarget) {
      onSelectTarget(target);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-72 md:h-80 bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredTarget(null)}
        onClick={handleClick}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Header Badge */}
      <div className="absolute top-3 left-4 flex items-center space-x-2 pointer-events-none">
        <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Compass className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs font-mono font-bold text-white tracking-wide">
          CELESTIAL OBSERVATION SPHERE (MEMBER 2 CANVAS)
        </span>
        <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          Click an object to plot 102-band spectrum
        </span>
      </div>

      {/* Hover Floating Tooltip HUD */}
      {hoveredTarget && (
        <div
          className="absolute pointer-events-none z-20 bg-slate-900/95 border border-cyan-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs min-w-[200px]"
          style={{
            left: Math.min(mousePos.x + 15, containerWidth - 220),
            top: Math.max(10, mousePos.y - 75),
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-1.5">
            <span className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredTarget.color }} />
              <span>{hoveredTarget.name}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">{hoveredTarget.constellation}</span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-slate-300">
            <div>Type: <strong className="text-white">{hoveredTarget.type}</strong></div>
            <div>Coordinates: <span className="text-cyan-300">RA {hoveredTarget.ra} | Dec {hoveredTarget.dec}</span></div>
            <div>Distance: <span className="text-amber-300">{hoveredTarget.distance_ly} ly</span></div>
            <div>Ice Mantle: <span className="text-emerald-400">{hoveredTarget.ice_richness}</span></div>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-cyan-400 flex items-center space-x-1">
            <Crosshair className="w-3 h-3" />
            <span>Click to lock & sonify spectrum</span>
          </div>
        </div>
      )}

      {/* Quick Target Selector Strip at Bottom */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 pointer-events-auto overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center space-x-2">
          {CELESTIAL_TARGETS.map((t) => {
            const isSelected = t.id === selectedTargetId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTarget && onSelectTarget(t)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-cyan-500/25 border border-cyan-400 text-white font-bold ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden lg:flex items-center space-x-1 text-[10px] font-mono text-slate-500">
          <Eye className="w-3 h-3 text-slate-400" />
          <span>Interactive RA/Dec Canvas</span>
        </div>
      </div>
    </div>
  );
}
