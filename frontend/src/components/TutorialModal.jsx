import React, { useState, useEffect, useId, useCallback } from 'react';
import {
  Play,
  Pause,
  Sparkles,
  Crosshair,
  Info,
  X,
  ChevronRight,
  ChevronLeft,
  Eye,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Target,
  Compass,
  Check
} from 'lucide-react';

/**
 * Static astronomical star background coordinates for simulation.
 * High-magnitude and faint stars distributed across the 600x380 viewport.
 */
const STATIC_STARS = [
  { id: 1, x: 45, y: 50, r: 1.8, opacity: 0.9, color: '#e2e8f0' },
  { id: 2, x: 110, y: 85, r: 2.2, opacity: 0.95, color: '#bfdbfe' },
  { id: 3, x: 75, y: 195, r: 1.2, opacity: 0.7, color: '#cbd5e1' },
  { id: 4, x: 140, y: 280, r: 1.5, opacity: 0.8, color: '#fef08a' },
  { id: 5, x: 185, y: 65, r: 2.8, opacity: 1.0, color: '#ffffff' },
  { id: 6, x: 220, y: 140, r: 1.1, opacity: 0.65, color: '#94a3b8' },
  { id: 7, x: 270, y: 75, r: 1.6, opacity: 0.85, color: '#e2e8f0' },
  { id: 8, x: 310, y: 240, r: 2.4, opacity: 0.9, color: '#fed7aa' },
  { id: 9, x: 380, y: 60, r: 1.4, opacity: 0.75, color: '#e0e7ff' },
  { id: 10, x: 420, y: 190, r: 3.0, opacity: 1.0, color: '#ffffff' },
  { id: 11, x: 470, y: 110, r: 1.3, opacity: 0.7, color: '#94a3b8' },
  { id: 12, x: 530, y: 70, r: 2.1, opacity: 0.95, color: '#bfdbfe' },
  { id: 13, x: 550, y: 215, r: 1.7, opacity: 0.85, color: '#e2e8f0' },
  { id: 14, x: 510, y: 310, r: 2.0, opacity: 0.9, color: '#ffffff' },
  { id: 15, x: 410, y: 320, r: 1.2, opacity: 0.6, color: '#cbd5e1' },
  { id: 16, x: 250, y: 330, r: 1.9, opacity: 0.85, color: '#fed7aa' },
  { id: 17, x: 60, y: 340, r: 1.4, opacity: 0.75, color: '#e2e8f0' },
  { id: 18, x: 335, y: 125, r: 1.0, opacity: 0.55, color: '#94a3b8' },
  { id: 19, x: 190, y: 215, r: 1.3, opacity: 0.7, color: '#cbd5e1' },
  { id: 20, x: 460, y: 260, r: 1.6, opacity: 0.8, color: '#e0e7ff' },
  { id: 21, x: 30, y: 130, r: 1.0, opacity: 0.5, color: '#94a3b8' },
  { id: 22, x: 575, y: 150, r: 1.5, opacity: 0.8, color: '#fef08a' },
  { id: 23, x: 360, y: 345, r: 1.1, opacity: 0.6, color: '#cbd5e1' },
  { id: 24, x: 125, y: 160, r: 0.9, opacity: 0.5, color: '#64748b' },
  { id: 25, x: 490, y: 175, r: 1.4, opacity: 0.7, color: '#cbd5e1' }
];

/**
 * 3-Step Training Guide Content Configuration
 * Designed specifically for citizen scientists and non-astronomers.
 */
const STEPS_DATA = [
  {
    step: 1,
    title: "The Core Tools: Jumping Dots & Dipoles",
    badge: "Step 1 of 3: How to Spot Changes",
    subtitle: "Understanding why SPHEREx matters and how to spot moving targets against static stars.",
    concept:
      "Why SPHEREx Matters: SPHEREx scans the sky in 102 infrared colors (0.75 - 5.0 µm) every 6 months. Cold asteroids and brown dwarfs glow in heat rather than visible light. Because stars are trillions of miles away, they remain frozen in place across survey sweeps. Only nearby objects move!",
    blinkExplanation:
      "THE JUMPING DOT: Rapidly toggles between Epoch 1 and Epoch 2. Static stars freeze still, while moving objects hop back and forth like a jumping dot.",
    diffExplanation:
      "THE DIPOLE (YIN-YANG): Pixel subtraction [Epoch 2 − Epoch 1] erases all static stars. A moving body leaves a signature Dipole: a dark negative crater (where it used to be) and a glowing white beacon (where it moved).",
    tip: "Use Blink Mode to see the 'Jumping Dot' in natural sky context; switch to Difference Mode to see the clean 'Dipole' with all distracting stars wiped clean.",
    target: {
      type: "sample",
      name: "Demo Candidate SPX-001 (Training Target)",
      epoch1: { x: 240, y: 200 },
      epoch2: { x: 330, y: 165 },
      description: "Sample moving point source demonstrating the Jumping Dot and Dipole signatures.",
      raDec: "RA 14h 29m 42s, Dec -15° 12' 04\"",
      motion: "42.8 arcsec/yr",
      snr: "18.4 σ",
      spectralBand: "SPHEREx Band 3 (1.5 - 2.4 µm)"
    }
  },
  {
    step: 2,
    title: "Target 1: Hunting Fast-Moving Asteroids",
    badge: "Step 2 of 3: Solar System Asteroids",
    subtitle: "Tracking high-velocity Near-Earth Objects (NEOs) and Main Belt Asteroids along the ecliptic.",
    concept:
      "Asteroids orbit our Sun in close proximity compared to background stars. Over observation cadences of minutes to hours, they trace clear, straight linear trajectories across the field of view.",
    blinkExplanation:
      "In Blink Mode, asteroids show a large, unmistakable spatial jump between frames. They maintain a consistent point-spread function (circular dot) rather than an elongated blur.",
    diffExplanation:
      "In Difference Mode, fast asteroids produce widely separated dipoles: a distinct negative dark hole (t=0) and a glowing bright white crest (t=1) separated by a clear motion vector along their orbital plane.",
    tip: "Check that the motion is strictly linear across 3+ exposures. Satellite glints streak across the entire detector, while true asteroids appear as point-like discs.",
    target: {
      type: "asteroid",
      name: "Asteroid 2026-SP4 (NEO Candidate)",
      epoch1: { x: 160, y: 270 },
      epoch2: { x: 420, y: 110 },
      description: "Fast-moving Apollo-class Near-Earth Asteroid traveling at 24.6 km/s relative to Earth.",
      raDec: "RA 09h 14m 02s, Dec +21° 44' 30\"",
      motion: "1.82 arcsec/min (Rapid Ecliptic)",
      snr: "26.8 σ",
      spectralBand: "SPHEREx Bands 1-3 (0.75 - 2.4 µm)"
    }
  },
  {
    step: 3,
    title: "Target 2: Uncovering Cold Brown Dwarfs",
    badge: "Step 3 of 3: Ultracool Brown Dwarfs",
    subtitle: "Spotting substellar 'failed stars' in our solar neighborhood via High Proper Motion.",
    concept:
      "Brown dwarfs (L, T, and Y spectral types) emit almost exclusively in infrared wavelengths due to surface temperatures under 1,000 K. They are nearby in the solar neighborhood, exhibiting slow High Proper Motion (HPM) over 6-month SPHEREx survey sweeps.",
    blinkExplanation:
      "In Blink Mode, brown dwarfs only shift slightly (a few arcseconds / pixels). In dense star fields, this tiny jitter can be difficult for the human eye to isolate without subtraction.",
    diffExplanation:
      "In Difference Mode, brown dwarfs reveal the iconic 'TIGHT DIPOLE' — an adjacent yin-yang pair where the negative dark crater directly touches the bright positive peak. This is the gold standard fingerprint of a cold nearby drifter!",
    tip: "Brown dwarfs glow brightly in SPHEREx Band 5 & 6 (3.5 - 5.0 µm) due to methane absorption windows, but disappear completely in optical wavelengths.",
    target: {
      type: "brown_dwarf",
      name: "SPHEREx-BD J1429-1834 (Methane T-Dwarf)",
      epoch1: { x: 300, y: 190 },
      epoch2: { x: 318, y: 185 },
      description: "Ultracool T-type brown dwarf (Teff ≈ 720 K) with prominent 4.5 µm methane signature.",
      raDec: "RA 14h 29m 33s, Dec -18° 34' 12\"",
      motion: "840 mas/yr (High Proper Motion)",
      snr: "14.2 σ",
      spectralBand: "SPHEREx Band 6 (4.2 - 5.0 µm peak)"
    }
  }
];

export default function TutorialModal({
  isOpen = true,
  onClose = () => {},
  onComplete = () => {},
  initialStep = 1
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [mode, setMode] = useState('blink'); // 'blink' | 'difference' | 'epoch1' | 'epoch2'
  const [isBlinking, setIsBlinking] = useState(true);
  const [blinkEpoch, setBlinkEpoch] = useState(1); // 1 or 2
  const [blinkSpeed, setBlinkSpeed] = useState(750); // ms per frame
  const [showReticle, setShowReticle] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [inspectedTarget, setInspectedTarget] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({ 1: false, 2: false, 3: false });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);

  // Generate unique IDs for SVG filters and gradients to prevent collisions
  const noiseFilterId = useId();
  const dipoleGradientId = useId();
  const starGlowId = useId();

  const stepInfo = STEPS_DATA[currentStep - 1];

  // Synchronize initialStep if changed from outside
  useEffect(() => {
    if (initialStep >= 1 && initialStep <= 3) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  // Blink comparator timer
  useEffect(() => {
    if (mode !== 'blink' || !isBlinking) return;

    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 1 ? 2 : 1));
    }, blinkSpeed);

    return () => clearInterval(interval);
  }, [mode, isBlinking, blinkSpeed]);

  // Reset inspected target when changing steps
  useEffect(() => {
    setInspectedTarget(null);
  }, [currentStep]);

  // Keyboard navigation & accessibility shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && currentStep < 3) {
        setCurrentStep((s) => s + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep((s) => s - 1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (mode === 'blink') {
          setIsBlinking((prev) => !prev);
        } else {
          setMode('blink');
          setIsBlinking(true);
        }
      } else if (e.key === 'd' || e.key === 'D') {
        setMode('difference');
      } else if (e.key === 'b' || e.key === 'B') {
        setMode('blink');
      }
    },
    [isOpen, currentStep, mode, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  // Active target coordinates based on current active step
  const activeTarget = stepInfo.target;

  // Determine current display epoch for viewport
  const displayEpoch = mode === 'blink' ? blinkEpoch : mode === 'epoch1' ? 1 : 2;

  const handleNextStep = () => {
    setCompletedSteps((prev) => ({ ...prev, [currentStep]: true }));
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setTrainingComplete(true);
      if (dontShowAgain) {
        try {
          localStorage.setItem('spherex_tutorial_completed', 'true');
        } catch (_) {}
      }
      onComplete();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTargetClick = () => {
    setInspectedTarget(activeTarget);
    setCompletedSteps((prev) => ({ ...prev, [currentStep]: true }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.18)] text-slate-100 overflow-hidden font-sans">
        {/* Glow Header Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-semibold">
                  NASA SPHEREx Citizen Science Training
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Infrared 0.75 - 5.0 µm
                </span>
              </div>
              <h2 id="tutorial-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                How to Spot a Moving World
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
              <span className="text-cyan-400 font-bold">Space</span> Blink
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-bold">D</span> Difference
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-bold">Esc</span> Close
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Close tutorial modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/40 text-xs sm:text-sm font-medium">
          {STEPS_DATA.map((s) => {
            const isActive = currentStep === s.step;
            const isDone = completedSteps[s.step];
            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={`py-3 px-3 sm:px-4 flex items-center justify-center gap-2 border-b-2 transition-all text-left ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-950/20 text-cyan-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                    isActive
                      ? 'bg-cyan-400 text-slate-950 shadow-sm'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone && !isActive ? <Check className="w-3 h-3" /> : s.step}
                </span>
                <span className="truncate">
                  {s.step === 1 ? '1. Jumping Dots & Dipoles' : s.step === 2 ? '2. Fast Asteroids' : '3. Cold Brown Dwarfs'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Step Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {stepInfo.badge}
                </span>
                <span className="text-xs text-slate-400">{stepInfo.subtitle}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">{stepInfo.title}</h3>
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Interactive Viewport
            </div>
          </div>

          {/* Interactive Celestial Viewport & Controls Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Viewport (Canvas / SVG) - 7 cols on large screens */}
            <div className="lg:col-span-7 flex flex-col rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl relative">
              {/* Viewport Top HUD Overlay */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">VIEW:</span>
                  <span className="font-bold uppercase tracking-wider text-cyan-400">
                    {mode === 'difference' ? 'Difference Subtraction [E2 - E1]' : `Blink Mode (Epoch ${displayEpoch})`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {mode === 'blink' && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">CADENCE:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          displayEpoch === 1
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {displayEpoch === 1 ? 'Epoch 1 (t=0)' : 'Epoch 2 (t=+6m)'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowReticle((r) => !r)}
                      title="Toggle Target Reticle"
                      className={`p-1 rounded transition-colors ${
                        showReticle ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowGrid((g) => !g)}
                      title="Toggle Coordinate Grid"
                      className={`p-1 rounded transition-colors ${
                        showGrid ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Graphic Scene (SVG) */}
              <div className="relative aspect-[16/10] w-full select-none cursor-crosshair overflow-hidden bg-[#040711]">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 600 380"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    {/* Deep Space Background Radial Gradient */}
                    <radialGradient id="spaceGradient" cx="50%" cy="50%" r="70%">
                      <stop offset="0%" stopColor="#091328" />
                      <stop offset="60%" stopColor="#040814" />
                      <stop offset="100%" stopColor="#020409" />
                    </radialGradient>

                    {/* Subtle IR Detector Thermal Background Noise */}
                    <filter id={noiseFilterId} x="0%" y="0%" width="100%" height="100%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.04 0" />
                    </filter>

                    {/* Star Glow Filter */}
                    <filter id={starGlowId} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Dipole Glow Gradient */}
                    <radialGradient id={dipoleGradientId}>
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Sky Background */}
                  <rect width="600" height="380" fill="url(#spaceGradient)" />

                  {/* Difference Mode Background Residual Tint */}
                  {mode === 'difference' && (
                    <rect width="600" height="380" fill="#030816" fillOpacity="0.65" />
                  )}

                  {/* Detector Noise Texture */}
                  <rect width="600" height="380" filter={`url(#${noiseFilterId})`} opacity={mode === 'difference' ? 0.35 : 0.6} />

                  {/* Coordinate Grid (Toggled) */}
                  {showGrid && (
                    <g stroke="#1e293b" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.6">
                      <line x1="100" y1="0" x2="100" y2="380" />
                      <line x1="200" y1="0" x2="200" y2="380" />
                      <line x1="300" y1="0" x2="300" y2="380" />
                      <line x1="400" y1="0" x2="400" y2="380" />
                      <line x1="500" y1="0" x2="500" y2="380" />
                      <line x1="0" y1="95" x2="600" y2="95" />
                      <line x1="0" y1="190" x2="600" y2="190" />
                      <line x1="0" y1="285" x2="600" y2="285" />
                    </g>
                  )}

                  {/* STATIC STARS:
                      In Blink Mode or Epoch 1/2: Fully visible at fixed coordinates.
                      In Difference Mode: Subtract to zero (extremely faint residual cancellation). */}
                  {STATIC_STARS.map((s) => {
                    if (mode === 'difference') {
                      // Subtraction cancellation residual (almost invisible)
                      return (
                        <circle
                          key={s.id}
                          cx={s.x}
                          cy={s.y}
                          r={s.r * 0.8}
                          fill="#475569"
                          opacity={0.08}
                        />
                      );
                    }
                    return (
                      <g key={s.id}>
                        {s.r > 2.0 && (
                          <circle
                            cx={s.x}
                            cy={s.y}
                            r={s.r * 2.2}
                            fill={s.color}
                            opacity={s.opacity * 0.25}
                            filter={`url(#${starGlowId})`}
                          />
                        )}
                        <circle
                          cx={s.x}
                          cy={s.y}
                          r={s.r}
                          fill={s.color}
                          opacity={s.opacity}
                        />
                      </g>
                    );
                  })}

                  {/* CANDIDATE TARGET RENDERING */}
                  {mode !== 'difference' ? (
                    /* BLINK MODE: Render single object at current active epoch position */
                    <g
                      className="cursor-pointer group"
                      onClick={handleTargetClick}
                      tabIndex={0}
                      role="button"
                      aria-label={`Target candidate ${activeTarget.name}`}
                    >
                      {/* Animated Epoch Position */}
                      {displayEpoch === 1 ? (
                        <g>
                          <circle
                            cx={activeTarget.epoch1.x}
                            cy={activeTarget.epoch1.y}
                            r={currentStep === 3 ? 3.2 : 3.8}
                            fill={currentStep === 3 ? '#fb923c' : '#38bdf8'}
                            filter={`url(#${starGlowId})`}
                          />
                          <circle
                            cx={activeTarget.epoch1.x}
                            cy={activeTarget.epoch1.y}
                            r={currentStep === 3 ? 2.0 : 2.5}
                            fill="#ffffff"
                          />
                          {showReticle && (
                            <g>
                              <circle
                                cx={activeTarget.epoch1.x}
                                cy={activeTarget.epoch1.y}
                                r="14"
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="1.2"
                                strokeDasharray="3 2"
                                className="animate-spin-slow origin-[center]"
                              />
                              <text
                                x={activeTarget.epoch1.x + 18}
                                y={activeTarget.epoch1.y + 4}
                                fill="#38bdf8"
                                fontSize="10"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                E1 (t=0)
                              </text>
                            </g>
                          )}
                        </g>
                      ) : (
                        <g>
                          <circle
                            cx={activeTarget.epoch2.x}
                            cy={activeTarget.epoch2.y}
                            r={currentStep === 3 ? 3.2 : 3.8}
                            fill={currentStep === 3 ? '#f97316' : '#f59e0b'}
                            filter={`url(#${starGlowId})`}
                          />
                          <circle
                            cx={activeTarget.epoch2.x}
                            cy={activeTarget.epoch2.y}
                            r={currentStep === 3 ? 2.0 : 2.5}
                            fill="#ffffff"
                          />
                          {showReticle && (
                            <g>
                              <circle
                                cx={activeTarget.epoch2.x}
                                cy={activeTarget.epoch2.y}
                                r="14"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.2"
                                strokeDasharray="3 2"
                              />
                              <text
                                x={activeTarget.epoch2.x + 18}
                                y={activeTarget.epoch2.y + 4}
                                fill="#f59e0b"
                                fontSize="10"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                E2 (t=+6m)
                              </text>
                            </g>
                          )}
                        </g>
                      )}

                      {/* Trajectory Guide Vector (Toggled or in Step 2) */}
                      {showReticle && (
                        <line
                          x1={activeTarget.epoch1.x}
                          y1={activeTarget.epoch1.y}
                          x2={activeTarget.epoch2.x}
                          y2={activeTarget.epoch2.y}
                          stroke="#64748b"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                          opacity="0.6"
                        />
                      )}
                    </g>
                  ) : (
                    /* DIFFERENCE MODE: Signature DIPOLE (Negative dark trough + Positive bright crest) */
                    <g
                      className="cursor-pointer"
                      onClick={handleTargetClick}
                      role="button"
                      tabIndex={0}
                      aria-label="Inspect dipole candidate"
                    >
                      {/* 1. Negative Trough (Epoch 1 location - Flux Subtraction "Black Hole") */}
                      <g>
                        <circle
                          cx={activeTarget.epoch1.x}
                          cy={activeTarget.epoch1.y}
                          r="10"
                          fill="#020617"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                          opacity="0.8"
                        />
                        <circle
                          cx={activeTarget.epoch1.x}
                          cy={activeTarget.epoch1.y}
                          r="4.5"
                          fill="#000000"
                        />
                        <text
                          x={activeTarget.epoch1.x - (currentStep === 3 ? 35 : 0)}
                          y={activeTarget.epoch1.y + (currentStep === 3 ? 20 : 22)}
                          fill="#f87171"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          (-) NEGATIVE
                        </text>
                      </g>

                      {/* 2. Motion Vector connecting Epoch 1 and Epoch 2 */}
                      <line
                        x1={activeTarget.epoch1.x}
                        y1={activeTarget.epoch1.y}
                        x2={activeTarget.epoch2.x}
                        y2={activeTarget.epoch2.y}
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.8"
                      />

                      {/* 3. Positive Peak (Epoch 2 location - New Flux "White Beacon") */}
                      <g>
                        <circle
                          cx={activeTarget.epoch2.x}
                          cy={activeTarget.epoch2.y}
                          r="10"
                          fill="#38bdf8"
                          fillOpacity="0.2"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={activeTarget.epoch2.x}
                          cy={activeTarget.epoch2.y}
                          r="5.5"
                          fill="#ffffff"
                          filter={`url(#${starGlowId})`}
                        />
                        <circle
                          cx={activeTarget.epoch2.x}
                          cy={activeTarget.epoch2.y}
                          r="2.5"
                          fill="#ffffff"
                        />
                        <text
                          x={activeTarget.epoch2.x + (currentStep === 3 ? 35 : 0)}
                          y={activeTarget.epoch2.y - (currentStep === 3 ? 12 : 16)}
                          fill="#38bdf8"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          (+) POSITIVE
                        </text>
                      </g>

                      {/* HUD Dipole Callout Box */}
                      {showReticle && (
                        <g>
                          <rect
                            x={Math.min(activeTarget.epoch1.x, activeTarget.epoch2.x) - 18}
                            y={Math.min(activeTarget.epoch1.y, activeTarget.epoch2.y) - 26}
                            width={Math.abs(activeTarget.epoch2.x - activeTarget.epoch1.x) + 36}
                            height={Math.abs(activeTarget.epoch2.y - activeTarget.epoch1.y) + 48}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                            rx="6"
                            opacity="0.5"
                          />
                          <text
                            x={
                              (activeTarget.epoch1.x + activeTarget.epoch2.x) / 2
                            }
                            y={Math.min(activeTarget.epoch1.y, activeTarget.epoch2.y) - 30}
                            fill="#67e8f9"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {currentStep === 3 ? '★ TIGHT DIPOLE (Brown Dwarf)' : '★ DIPOLE PAIR (Moving Target)'}
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </svg>

                {/* Interactive Click Invitation Badge */}
                {!inspectedTarget && (
                  <div
                    onClick={handleTargetClick}
                    className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-lg backdrop-blur-sm cursor-pointer hover:bg-slate-800 transition-colors animate-bounce"
                  >
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Click candidate in sky to inspect telemetry</span>
                  </div>
                )}
              </div>

              {/* Viewport Bottom Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border-t border-slate-800">
                {/* Mode Selector Buttons */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => {
                      setMode('blink');
                      setIsBlinking(true);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                      mode === 'blink'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Blink Mode
                  </button>
                  <button
                    onClick={() => {
                      setMode('difference');
                      setIsBlinking(false);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                      mode === 'difference'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Difference [E2 - E1]
                  </button>
                </div>

                {/* Blink Controls (When in Blink Mode) */}
                {mode === 'blink' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBlinking(!isBlinking)}
                      className="p-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                      title={isBlinking ? 'Pause Blinking' : 'Resume Blinking'}
                    >
                      {isBlinking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <span>Rate:</span>
                      {[
                        { label: 'Slow', ms: 1200 },
                        { label: 'Norm', ms: 750 },
                        { label: 'Fast', ms: 400 }
                      ].map((rate) => (
                        <button
                          key={rate.label}
                          onClick={() => setBlinkSpeed(rate.ms)}
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            blinkSpeed === rate.ms
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {rate.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Frame Stepper */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setMode('epoch1');
                      setIsBlinking(false);
                    }}
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      mode === 'epoch1'
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
                    }`}
                  >
                    E1
                  </button>
                  <button
                    onClick={() => {
                      setMode('epoch2');
                      setIsBlinking(false);
                    }}
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      mode === 'epoch2'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
                    }`}
                  >
                    E2
                  </button>
                </div>
              </div>
            </div>

            {/* Explanation & Target Telemetry Sidebar - 5 cols on large screens */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Scientific Concept Explainer Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase">
                  <Info className="w-4 h-4" />
                  Visual Analysis Principles
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {stepInfo.concept}
                </p>

                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-cyan-300">Blink Mode: </span>
                      <span className="text-xs text-slate-400">{stepInfo.blinkExplanation}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-amber-300">Difference Mode: </span>
                      <span className="text-xs text-slate-400">{stepInfo.diffExplanation}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Inspection Telemetry Card */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 shadow-inner flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-cyan-400" />
                      Candidate Telemetry HUD
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold ${
                        inspectedTarget
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {inspectedTarget ? 'TARGET LOCKED' : 'AWAITING SELECTION'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    {activeTarget.name}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">COORDINATES</span>
                      <span className="text-slate-200">{activeTarget.raDec}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">APPARENT MOTION</span>
                      <span className="text-cyan-300 font-semibold">{activeTarget.motion}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SIGNAL-TO-NOISE</span>
                      <span className="text-emerald-400 font-semibold">{activeTarget.snr}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SPECTRAL REGION</span>
                      <span className="text-amber-300">{activeTarget.spectralBand}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 italic">
                    "{activeTarget.description}"
                  </p>
                </div>

                {/* Pro Tip Box */}
                <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-cyan-200 leading-normal">
                    <strong className="text-cyan-300">Observer Pro-Tip: </strong>
                    {stepInfo.tip}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* False-Positive Rejection Guide Grid */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              How to Avoid Common False Positives
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-rose-300 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Cosmic Ray Hits
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Single sharp, ultra-bright pixel spikes with no dipole companion in Difference Mode and zero displacement between exposures.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Diffraction Spikes
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Cross-like rays surrounding saturated stars. Subtracting them leaves quadrupole butterfly noise, not a clean moving point-source dipole.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  True Candidate Gold Standard
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Consistent circular PSF, clean positive/negative dipole matching in Difference Mode, and linear displacement vectors across epochs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-slate-950/90">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/30"
            />
            Don't show this guide on startup
          </label>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Step
              </button>
            )}

            <button
              onClick={handleNextStep}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5"
            >
              {currentStep < 3 ? (
                <>
                  Next: {currentStep === 1 ? 'Asteroids' : 'Brown Dwarfs'}
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Field Training & Hunt Sky
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
