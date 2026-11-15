import React, { useState, useEffect, useId } from 'react';
import {
  Sparkles,
  HelpCircle,
  Eye,
  Layers,
  Compass,
  Crosshair,
  BookOpen,
  Award,
  Target,
  Satellite,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Check
} from 'lucide-react';
import TutorialModal from './components/TutorialModal';

// Static astronomical stars for main hunting viewport
const MAIN_STARS = [
  { id: 1, x: 50, y: 40, r: 1.8, opacity: 0.9, color: '#e2e8f0' },
  { id: 2, x: 120, y: 70, r: 2.2, opacity: 0.95, color: '#bfdbfe' },
  { id: 3, x: 80, y: 180, r: 1.2, opacity: 0.7, color: '#cbd5e1' },
  { id: 4, x: 150, y: 260, r: 1.5, opacity: 0.8, color: '#fef08a' },
  { id: 5, x: 190, y: 60, r: 2.8, opacity: 1.0, color: '#ffffff' },
  { id: 6, x: 230, y: 130, r: 1.1, opacity: 0.65, color: '#94a3b8' },
  { id: 7, x: 280, y: 70, r: 1.6, opacity: 0.85, color: '#e2e8f0' },
  { id: 8, x: 320, y: 230, r: 2.4, opacity: 0.9, color: '#fed7aa' },
  { id: 9, x: 390, y: 55, r: 1.4, opacity: 0.75, color: '#e0e7ff' },
  { id: 10, x: 430, y: 180, r: 3.0, opacity: 1.0, color: '#ffffff' },
  { id: 11, x: 480, y: 100, r: 1.3, opacity: 0.7, color: '#94a3b8' },
  { id: 12, x: 540, y: 65, r: 2.1, opacity: 0.95, color: '#bfdbfe' },
  { id: 13, x: 560, y: 205, r: 1.7, opacity: 0.85, color: '#e2e8f0' },
  { id: 14, x: 520, y: 300, r: 2.0, opacity: 0.9, color: '#ffffff' },
  { id: 15, x: 420, y: 310, r: 1.2, opacity: 0.6, color: '#cbd5e1' },
  { id: 16, x: 260, y: 320, r: 1.9, opacity: 0.85, color: '#fed7aa' },
  { id: 17, x: 70, y: 330, r: 1.4, opacity: 0.75, color: '#e2e8f0' }
];

// Preloaded real candidate survey tiles
const CANDIDATE_TILES = [
  {
    id: "SPX-AST-2026-SP4",
    name: "Asteroid 2026-SP4 (Apollo NEO Candidate)",
    type: "asteroid",
    badgeText: "Fast Solar System Asteroid",
    ra: "09h 14m 02.4s",
    dec: "+21° 44' 30.1\"",
    magnitude: 16.8,
    speed: "1.82 arcsec/min",
    snr: "26.8 σ",
    baseline: "45 minutes",
    epoch1: { x: 160, y: 260, label: "E1 (t=0 min)" },
    epoch2: { x: 410, y: 115, label: "E2 (t=+45 min)" },
    spectral: [
      { band: "0.75µm", flux: 52 },
      { band: "1.25µm", flux: 64 },
      { band: "1.85µm", flux: 70 },
      { band: "2.40µm", flux: 68 },
      { band: "3.50µm", flux: 58 },
      { band: "4.50µm", flux: 49 }
    ],
    hint: "Notice the prominent jumping dot in Blink Mode, and widely separated dipole spots along a straight orbital trajectory.",
    stats: { asteroid: 28, brown_dwarf: 1, artifact: 0, total: 29, score: 0.965 }
  },
  {
    id: "SPX-BD-J1429-1834",
    name: "SPHEREx-BD J1429-1834 (Methane T-Dwarf)",
    type: "brown_dwarf",
    badgeText: "Ultracool Brown Dwarf",
    ra: "14h 29m 33.1s",
    dec: "-18° 34' 12.0\"",
    magnitude: 18.4,
    speed: "840 mas/yr (High Proper Motion)",
    snr: "14.2 σ",
    baseline: "6 months (Survey Pass 1 vs 2)",
    epoch1: { x: 300, y: 190, label: "E1 (Pass 1)" },
    epoch2: { x: 318, y: 185, label: "E2 (Pass 2)" },
    spectral: [
      { band: "0.75µm", flux: 4 },
      { band: "1.25µm", flux: 12 },
      { band: "1.85µm", flux: 18 },
      { band: "2.40µm", flux: 28 },
      { band: "3.50µm", flux: 55 },
      { band: "4.50µm", flux: 96 }
    ],
    hint: "Notice the subtle shift in Blink Mode, and the iconic tight yin-yang dipole in Difference Mode with extreme 4.5 µm infrared methane peak.",
    stats: { asteroid: 1, brown_dwarf: 34, artifact: 1, total: 36, score: 0.944 }
  },
  {
    id: "SPX-ART-089",
    name: "Artifact SPX-089 (Diffraction Residual)",
    type: "artifact",
    badgeText: "Optical Artifact Candidate",
    ra: "06h 45m 09.0s",
    dec: "-16° 42' 58.0\"",
    magnitude: 15.1,
    speed: "0.0 arcsec (Static)",
    snr: "8.1 σ",
    baseline: "6 months",
    epoch1: { x: 260, y: 195, label: "E1 (Pass 1)" },
    epoch2: { x: 260, y: 195, label: "E2 (Pass 2)" },
    spectral: [
      { band: "0.75µm", flux: 85 },
      { band: "1.25µm", flux: 82 },
      { band: "1.85µm", flux: 80 },
      { band: "2.40µm", flux: 79 },
      { band: "3.50µm", flux: 76 },
      { band: "4.50µm", flux: 75 }
    ],
    hint: "No displacement between epochs. Subtracting leaves an erratic smudge or spike, not a true moving point-source dipole.",
    stats: { asteroid: 1, brown_dwarf: 2, artifact: 31, total: 34, score: 0.912 }
  }
];

export default function App() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [completedTutorial, setCompletedTutorial] = useState(false);

  // Active hunting station state
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [viewMode, setViewMode] = useState('blink'); // 'blink' | 'difference'
  const [isBlinking, setIsBlinking] = useState(true);
  const [blinkEpoch, setBlinkEpoch] = useState(1);
  const [blinkSpeed, setBlinkSpeed] = useState(700);
  const [showReticle, setShowReticle] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  // Gamification & Volunteer Voting State
  const [volunteerXP, setVolunteerXP] = useState(150);
  const [submittedVotes, setSubmittedVotes] = useState({});
  const [submissionFeedback, setSubmissionFeedback] = useState(null);

  const activeCandidate = CANDIDATE_TILES[selectedCandidateIndex];
  const noiseFilterId = useId();
  const starGlowId = useId();

  // Check onboarding on initial load
  useEffect(() => {
    try {
      const stored = localStorage.getItem('spherex_tutorial_completed');
      if (stored === 'true') {
        setCompletedTutorial(true);
      } else {
        setShowTutorial(true);
      }
    } catch (_) {
      setShowTutorial(true);
    }
  }, []);

  // Blink comparator timer
  useEffect(() => {
    if (viewMode !== 'blink' || !isBlinking) return;
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 1 ? 2 : 1));
    }, blinkSpeed);
    return () => clearInterval(interval);
  }, [viewMode, isBlinking, blinkSpeed]);

  const openTutorialAtStep = (step) => {
    setTutorialStep(step);
    setShowTutorial(true);
  };

  const handleClassify = (voteType) => {
    const isCorrect = voteType === activeCandidate.type;
    const xpGain = isCorrect ? 50 : 25;

    setVolunteerXP((xp) => xp + xpGain);
    setSubmittedVotes((prev) => ({
      ...prev,
      [activeCandidate.id]: {
        vote: voteType,
        isCorrect
      }
    }));

    setSubmissionFeedback({
      candidateId: activeCandidate.id,
      voteType,
      isCorrect,
      message: isCorrect
        ? `Consensus Match! You correctly identified ${activeCandidate.name} as a ${voteType.replace('_', ' ')}. (+${xpGain} XP)`
        : `Vote registered. Your classification was logged for multi-volunteer consensus review. (+${xpGain} XP)`
    });
  };

  const displayEpoch = viewMode === 'blink' ? blinkEpoch : 2;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 flex flex-col">
      {/* Top Mission Telemetry Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)]">
              <Satellite className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-bold">
                  NASA SPHEREx Mission
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Cadence: 6-Month Sweep
                </span>
              </div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                SPHEREx Sky Hunter <span className="text-xs font-normal text-slate-400 font-mono">v1.0.0</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Volunteer Discovery XP Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-700/50 text-xs font-mono text-indigo-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>XP:</span>
              <span className="font-bold text-amber-300">{volunteerXP}</span>
            </div>

            {/* Tutorial Launcher Button */}
            <button
              onClick={() => openTutorialAtStep(1)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>How to Spot a Moving World</span>
              {completedTutorial && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">STATUS:</span>
              <span className="text-emerald-400 font-bold">ALL-SKY PASS 2 LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner with Quick Visual Tutorial Access */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Citizen Science Discovery Platform
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Hunt moving asteroids & cold brown dwarfs in NASA SPHEREx infrared surveys.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Every 6 months, SPHEREx maps the entire celestial sphere across 102 near-infrared bands (0.75 – 5.0 µm).
              By comparing multi-epoch survey tiles with <strong className="text-cyan-300">Blink Mode (Jumping Dots)</strong> and{' '}
              <strong className="text-amber-300">Difference Mode (Yin-Yang Dipoles)</strong>, citizen scientists detect Solar System asteroids
              and discover elusive nearby ultracool brown dwarfs that machine pipelines overlook.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => openTutorialAtStep(1)}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                How to Spot a Moving World (Tutorial)
              </button>
              <button
                onClick={() => openTutorialAtStep(2)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2 border border-slate-700"
              >
                <Target className="w-4 h-4 text-amber-400" />
                Asteroid Guide
              </button>
              <button
                onClick={() => openTutorialAtStep(3)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2 border border-slate-700"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Brown Dwarf Dipoles
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            LIVE HUNTING STATION: Active Sky Viewport & Citizen Science Classifier
            ========================================================================= */}
        <section className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Citizen Science Workbench
                </span>
                <span className="text-xs text-slate-400">Active Multi-Epoch Inspection Tile</span>
              </div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Candidate Inspection Station: {activeCandidate.name}
              </h3>
            </div>

            {/* Candidate Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {CANDIDATE_TILES.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCandidateIndex(idx);
                    setSubmissionFeedback(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    selectedCandidateIndex === idx
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {c.type === 'asteroid' ? 'Asteroid' : c.type === 'brown_dwarf' ? 'Brown Dwarf' : 'Artifact'} #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Viewport & Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Viewport Canvas (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner relative">
              {/* Top Viewport HUD Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">MODE:</span>
                  <span className="font-bold text-cyan-400 uppercase">
                    {viewMode === 'difference' ? 'Difference Subtraction [E2 − E1]' : `Blink Mode (${displayEpoch === 1 ? activeCandidate.epoch1.label : activeCandidate.epoch2.label})`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReticle((r) => !r)}
                    title="Toggle Reticle Overlay"
                    className={`p-1.5 rounded transition-colors ${
                      showReticle ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowGrid((g) => !g)}
                    title="Toggle Coordinate Grid"
                    className={`p-1.5 rounded transition-colors ${
                      showGrid ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Graphic Sky Canvas (SVG) */}
              <div className="relative aspect-[16/10] w-full select-none cursor-crosshair overflow-hidden bg-[#040711]">
                <svg className="w-full h-full" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <radialGradient id="spaceGradientMain" cx="50%" cy="50%" r="70%">
                      <stop offset="0%" stopColor="#091328" />
                      <stop offset="60%" stopColor="#040814" />
                      <stop offset="100%" stopColor="#020409" />
                    </radialGradient>

                    <filter id={noiseFilterId} x="0%" y="0%" width="100%" height="100%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.04 0" />
                    </filter>

                    <filter id={starGlowId} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <rect width="600" height="380" fill="url(#spaceGradientMain)" />

                  {viewMode === 'difference' && (
                    <rect width="600" height="380" fill="#030816" fillOpacity="0.65" />
                  )}

                  <rect width="600" height="380" filter={`url(#${noiseFilterId})`} opacity={viewMode === 'difference' ? 0.35 : 0.6} />

                  {/* Optional Grid */}
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

                  {/* Background Stars */}
                  {MAIN_STARS.map((s) => {
                    if (viewMode === 'difference') {
                      return <circle key={s.id} cx={s.x} cy={s.y} r={s.r * 0.8} fill="#475569" opacity={0.08} />;
                    }
                    return (
                      <g key={s.id}>
                        {s.r > 2.0 && (
                          <circle cx={s.x} cy={s.y} r={s.r * 2.2} fill={s.color} opacity={s.opacity * 0.25} filter={`url(#${starGlowId})`} />
                        )}
                        <circle cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity={s.opacity} />
                      </g>
                    );
                  })}

                  {/* ACTIVE CANDIDATE RENDERING */}
                  {viewMode === 'blink' ? (
                    <g>
                      {displayEpoch === 1 ? (
                        <g>
                          <circle
                            cx={activeCandidate.epoch1.x}
                            cy={activeCandidate.epoch1.y}
                            r={activeCandidate.type === 'brown_dwarf' ? 3.2 : 4.0}
                            fill={activeCandidate.type === 'brown_dwarf' ? '#fb923c' : '#38bdf8'}
                            filter={`url(#${starGlowId})`}
                          />
                          <circle cx={activeCandidate.epoch1.x} cy={activeCandidate.epoch1.y} r={2.5} fill="#ffffff" />
                          {showReticle && (
                            <g>
                              <circle
                                cx={activeCandidate.epoch1.x}
                                cy={activeCandidate.epoch1.y}
                                r="16"
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="1.2"
                                strokeDasharray="3 2"
                              />
                              <text
                                x={activeCandidate.epoch1.x + 20}
                                y={activeCandidate.epoch1.y + 4}
                                fill="#38bdf8"
                                fontSize="10"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {activeCandidate.epoch1.label}
                              </text>
                            </g>
                          )}
                        </g>
                      ) : (
                        <g>
                          <circle
                            cx={activeCandidate.epoch2.x}
                            cy={activeCandidate.epoch2.y}
                            r={activeCandidate.type === 'brown_dwarf' ? 3.2 : 4.0}
                            fill={activeCandidate.type === 'brown_dwarf' ? '#f97316' : '#f59e0b'}
                            filter={`url(#${starGlowId})`}
                          />
                          <circle cx={activeCandidate.epoch2.x} cy={activeCandidate.epoch2.y} r={2.5} fill="#ffffff" />
                          {showReticle && (
                            <g>
                              <circle
                                cx={activeCandidate.epoch2.x}
                                cy={activeCandidate.epoch2.y}
                                r="16"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.2"
                                strokeDasharray="3 2"
                              />
                              <text
                                x={activeCandidate.epoch2.x + 20}
                                y={activeCandidate.epoch2.y + 4}
                                fill="#f59e0b"
                                fontSize="10"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {activeCandidate.epoch2.label}
                              </text>
                            </g>
                          )}
                        </g>
                      )}

                      {/* Motion line */}
                      {showReticle && activeCandidate.type !== 'artifact' && (
                        <line
                          x1={activeCandidate.epoch1.x}
                          y1={activeCandidate.epoch1.y}
                          x2={activeCandidate.epoch2.x}
                          y2={activeCandidate.epoch2.y}
                          stroke="#64748b"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                          opacity="0.6"
                        />
                      )}
                    </g>
                  ) : (
                    /* DIFFERENCE MODE DIPOLE */
                    <g>
                      {activeCandidate.type !== 'artifact' ? (
                        <>
                          {/* Negative Crater (t=0) */}
                          <circle
                            cx={activeCandidate.epoch1.x}
                            cy={activeCandidate.epoch1.y}
                            r="11"
                            fill="#020617"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeDasharray="2 2"
                            opacity="0.8"
                          />
                          <circle cx={activeCandidate.epoch1.x} cy={activeCandidate.epoch1.y} r="4.5" fill="#000000" />
                          <text
                            x={activeCandidate.epoch1.x - (activeCandidate.type === 'brown_dwarf' ? 35 : 0)}
                            y={activeCandidate.epoch1.y + (activeCandidate.type === 'brown_dwarf' ? 20 : 24)}
                            fill="#f87171"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            (-) CRATER
                          </text>

                          {/* Motion Vector */}
                          <line
                            x1={activeCandidate.epoch1.x}
                            y1={activeCandidate.epoch1.y}
                            x2={activeCandidate.epoch2.x}
                            y2={activeCandidate.epoch2.y}
                            stroke="#38bdf8"
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                            opacity="0.8"
                          />

                          {/* Positive Beacon (t=1) */}
                          <circle
                            cx={activeCandidate.epoch2.x}
                            cy={activeCandidate.epoch2.y}
                            r="11"
                            fill="#38bdf8"
                            fillOpacity="0.2"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                          />
                          <circle cx={activeCandidate.epoch2.x} cy={activeCandidate.epoch2.y} r="5.5" fill="#ffffff" filter={`url(#${starGlowId})`} />
                          <circle cx={activeCandidate.epoch2.x} cy={activeCandidate.epoch2.y} r="2.5" fill="#ffffff" />
                          <text
                            x={activeCandidate.epoch2.x + (activeCandidate.type === 'brown_dwarf' ? 35 : 0)}
                            y={activeCandidate.epoch2.y - (activeCandidate.type === 'brown_dwarf' ? 12 : 16)}
                            fill="#38bdf8"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            (+) BEACON
                          </text>
                        </>
                      ) : (
                        /* Artifact smudge */
                        <g>
                          <circle cx={activeCandidate.epoch1.x} cy={activeCandidate.epoch1.y} r="14" fill="#f43f5e" fillOpacity="0.15" stroke="#f43f5e" strokeDasharray="3 3" />
                          <line x1={activeCandidate.epoch1.x - 18} y1={activeCandidate.epoch1.y - 18} x2={activeCandidate.epoch1.x + 18} y2={activeCandidate.epoch1.y + 18} stroke="#f43f5e" strokeWidth="1.5" />
                          <line x1={activeCandidate.epoch1.x - 18} y1={activeCandidate.epoch1.y + 18} x2={activeCandidate.epoch1.x + 18} y2={activeCandidate.epoch1.y - 18} stroke="#f43f5e" strokeWidth="1.5" />
                          <text x={activeCandidate.epoch1.x} y={activeCandidate.epoch1.y - 24} fill="#fda4af" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                            STATIC ARTIFACT (NO DIPOLE)
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </svg>
              </div>

              {/* Viewport Bottom Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border-t border-slate-800">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => {
                      setViewMode('blink');
                      setIsBlinking(true);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                      viewMode === 'blink'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Blink Mode (Jumping Dot)
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('difference');
                      setIsBlinking(false);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                      viewMode === 'difference'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Difference Mode (Dipole)
                  </button>
                </div>

                {viewMode === 'blink' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBlinking(!isBlinking)}
                      className="p-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                      title={isBlinking ? 'Pause Blinking' : 'Resume Blinking'}
                    >
                      {isBlinking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <span>Speed:</span>
                      {[
                        { label: 'Slow', ms: 1200 },
                        { label: 'Norm', ms: 700 },
                        { label: 'Fast', ms: 350 }
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
              </div>
            </div>

            {/* Classification & Telemetry Side Panel (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              {/* Telemetry Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Candidate Astrometry HUD
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {activeCandidate.badgeText}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px]">COORDINATES (RA/DEC)</span>
                    <span className="text-slate-200">{activeCandidate.ra}</span>
                    <span className="text-slate-400 block text-[10px]">{activeCandidate.dec}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">APPARENT VELOCITY</span>
                    <span className="text-cyan-300 font-semibold">{activeCandidate.speed}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SIGNAL-TO-NOISE</span>
                    <span className="text-emerald-400 font-semibold">{activeCandidate.snr}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">BASELINE CADENCE</span>
                    <span className="text-amber-300">{activeCandidate.baseline}</span>
                  </div>
                </div>

                {/* 102-Band Photometric Flux Bar Visualizer */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                    <span>SPHEREx Infrared Spectrum (0.75 - 4.5 µm)</span>
                    <span className="text-cyan-400">Relative Flux</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 h-12 items-end bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    {activeCandidate.spectral.map((b) => (
                      <div key={b.band} className="flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          className={`w-full rounded-t transition-all ${
                            b.band.includes('4.50') && activeCandidate.type === 'brown_dwarf'
                              ? 'bg-gradient-to-t from-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                              : 'bg-cyan-600/70'
                          }`}
                          style={{ height: `${b.flux}%` }}
                          title={`${b.band}: ${b.flux}% flux`}
                        />
                        <span className="text-[8px] font-mono text-slate-400 truncate w-full text-center">
                          {b.band.split('µm')[0]}µm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-400 italic">
                  💡 <strong>Observer Note:</strong> {activeCandidate.hint}
                </p>
              </div>

              {/* Citizen Scientist Voting Console */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Submit Citizen Science Classification
                  </h4>
                  {submittedVotes[activeCandidate.id] && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> CLASSIFIED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleClassify('asteroid')}
                    className="p-2.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all flex flex-col items-center gap-1.5 text-center group focus:ring-2 focus:ring-amber-500/50"
                  >
                    <Target className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Asteroid</span>
                  </button>

                  <button
                    onClick={() => handleClassify('brown_dwarf')}
                    className="p-2.5 rounded-xl text-xs font-mono font-bold bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 transition-all flex flex-col items-center gap-1.5 text-center group focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>Brown Dwarf</span>
                  </button>

                  <button
                    onClick={() => handleClassify('artifact')}
                    className="p-2.5 rounded-xl text-xs font-mono font-bold bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition-all flex flex-col items-center gap-1.5 text-center group focus:ring-2 focus:ring-rose-500/50"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                    <span>Artifact / Noise</span>
                  </button>
                </div>

                {/* Feedback Toast */}
                {submissionFeedback && submissionFeedback.candidateId === activeCandidate.id && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-mono border transition-all ${
                      submissionFeedback.isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                    }`}
                  >
                    {submissionFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3 Interactive Cards Linking Directly to Steps */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div
            onClick={() => openTutorialAtStep(1)}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Step 01
                </span>
                <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Eye className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                Jumping Dots & Dipoles
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Learn the Clyde Tombaugh blink comparator method and modern image subtraction [Epoch 2 − Epoch 1] to strip away stationary stars.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-cyan-400">
              <span>Launch Step 1</span>
              <span>→</span>
            </div>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => openTutorialAtStep(2)}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Step 02
                </span>
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                  <Target className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors mb-2">
                Tracking Fast Asteroids
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Spot fast-moving Near-Earth Objects tracing linear tracks across consecutive exposures, and recognize widely spaced dipole pairs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-amber-400">
              <span>Launch Step 2</span>
              <span>→</span>
            </div>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => openTutorialAtStep(3)}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                  Step 03
                </span>
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">
                Unveiling Cold Brown Dwarfs
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Identify High Proper Motion (HPM) ultracool drifters via their iconic tight negative/positive dipole signature and infrared methane excess.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-indigo-400">
              <span>Launch Step 3</span>
              <span>→</span>
            </div>
          </div>
        </section>

        {/* Survey Telemetry Overview Grid */}
        <section className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live SPHEREx Survey Matrix & Scientific Impact
            </h3>
            <span className="text-xs font-mono text-slate-400">Updated: Orbit 2,194</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Spectral Bands</span>
              <span className="text-2xl font-mono font-bold text-cyan-400">102</span>
              <span className="text-[11px] text-slate-500 block mt-1">0.75 - 5.0 µm Range</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Survey Cadence</span>
              <span className="text-2xl font-mono font-bold text-indigo-400">6 Mo</span>
              <span className="text-[11px] text-slate-500 block mt-1">All-Sky Sweep Period</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Asteroid Candidates</span>
              <span className="text-2xl font-mono font-bold text-amber-400">3,482</span>
              <span className="text-[11px] text-slate-500 block mt-1">Minor Planet Center Feeds</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Brown Dwarf Dipoles</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">419</span>
              <span className="text-[11px] text-slate-500 block mt-1">L/T/Y Dwarf Candidates</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500 text-center font-mono">
        <p>NASA Space Apps Challenge 2026 // SPHEREx Sky Hunter Citizen Science Consortium</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Powered by React 19, Tailwind CSS v4 & NASA Open Data APIs
        </p>
      </footer>

      {/* The 3-Step Interactive Tutorial Modal Component */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        initialStep={tutorialStep}
        onComplete={() => {
          setCompletedTutorial(true);
          setShowTutorial(false);
        }}
      />
    </div>
  );
}
