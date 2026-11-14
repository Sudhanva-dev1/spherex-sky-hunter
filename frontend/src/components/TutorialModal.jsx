import React, { useState } from 'react';
import {
  X,
  Compass,
  Eye,
  Activity,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Crosshair,
  Flame,
  Orbit,
  ArrowRight
} from 'lucide-react';

export default function TutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'step-1',
      title: 'Step 1: Locate Survey Sectors & Sky Regions',
      icon: Compass,
      tag: 'CELESTIAL NAVIGATION',
      color: 'from-cyan-500 to-blue-600',
      badgeColor: 'bg-cyan-950 text-cyan-400 border-cyan-800/50',
      description:
        'SPHEREx performs a full-sky spectrophotometric survey every 6 months in a sun-synchronous Low Earth Orbit. Use the All-Sky Mollweide Map to select target sky fields or jump to custom celestial coordinates (RA / Dec).',
      visual: (
        <div className="w-full h-44 rounded-lg bg-slate-950 border border-slate-800 p-3 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono-telemetry text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>MOLLWEIDE CELESTIAL PROJECTION</span>
            </span>
            <span>R = 40-130 | 102 NIR BANDS</span>
          </div>

          {/* Simulated Sky Map Graphics */}
          <div className="relative flex-1 my-2 flex items-center justify-center">
            <div className="w-48 h-24 rounded-[100%] border border-cyan-500/40 relative flex items-center justify-center bg-linear-to-b from-slate-900 to-slate-950">
              {/* Coordinate grid */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-500/20" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-500/20" />
              {/* Galactic Plane */}
              <div className="absolute w-44 h-12 border-t border-amber-400/40 rounded-[100%] rotate-12" />
              {/* Sector Target Markers */}
              <div className="absolute left-10 top-6 flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
                <span className="text-[9px] font-mono-telemetry text-cyan-300">Kuiper Belt 04</span>
              </div>
              <div className="absolute right-8 bottom-6 flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50" />
                <span className="text-[9px] font-mono-telemetry text-amber-300">Brown Dwarf J14</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-telemetry">
            <span>EPOCHS: 1 TO 4 (6-MONTH CADENCE)</span>
            <span className="text-cyan-400">CLICK TARGET BEACONS TO LOAD SECTOR</span>
          </div>
        </div>
      ),
      keyTakeaways: [
        'Trans-Neptunian Objects (Planet 9 / KBOs) move slowly across multiple 6-month epochs (~0.003"/yr).',
        'Nearby cold Brown Dwarfs exhibit very fast proper motion (>1.0"/yr) across background stars.'
      ]
    },
    {
      id: 'step-2',
      title: 'Step 2: Blink & Difference Modes to Spot Moving Objects',
      icon: Eye,
      tag: 'MULTI-EPOCH BLINK DETECTION',
      color: 'from-indigo-500 to-cyan-500',
      badgeColor: 'bg-indigo-950 text-indigo-400 border-indigo-800/50',
      description:
        'Stationary stars and distant galaxies stay fixed between SPHEREx survey epochs. True solar-system bodies and high-proper-motion brown dwarfs visibly leap across frames when toggled in Blink Mode or revealed by subtraction in Difference Mode.',
      visual: (
        <div className="w-full h-44 rounded-lg bg-slate-950 border border-slate-800 p-3 relative overflow-hidden flex items-center justify-around">
          {/* Epoch 1 Box */}
          <div className="w-36 h-36 rounded border border-slate-700 bg-slate-900/90 relative p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono-telemetry text-slate-400">EPOCH 1 (T0)</span>
            <div className="relative w-full h-24">
              {/* Static Stars */}
              <span className="absolute left-4 top-4 w-1.5 h-1.5 rounded-full bg-slate-200" />
              <span className="absolute right-6 top-8 w-2 h-2 rounded-full bg-slate-200" />
              <span className="absolute left-10 bottom-4 w-1.5 h-1.5 rounded-full bg-slate-200" />
              {/* Moving Candidate Position 1 */}
              <div className="absolute left-8 top-12 flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[8px] font-mono-telemetry text-cyan-300">Pos 1</span>
              </div>
            </div>
            <span className="text-[8px] font-mono-telemetry text-slate-500">Ref: 2025-02-01</span>
          </div>

          {/* Motion Vector Arrow */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="p-1.5 rounded-full bg-slate-800 text-cyan-400">
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </div>
            <span className="text-[9px] font-mono-telemetry text-cyan-400 font-bold">BLINK (Δt: 6 mo)</span>
            <span className="text-[8px] font-mono-telemetry text-slate-500">Shift = Vector</span>
          </div>

          {/* Epoch 2 Box */}
          <div className="w-36 h-36 rounded border border-cyan-500/50 bg-slate-900/90 relative p-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono-telemetry text-cyan-400">EPOCH 2 (T0 + 6mo)</span>
            <div className="relative w-full h-24">
              {/* Static Stars remain identical */}
              <span className="absolute left-4 top-4 w-1.5 h-1.5 rounded-full bg-slate-200" />
              <span className="absolute right-6 top-8 w-2 h-2 rounded-full bg-slate-200" />
              <span className="absolute left-10 bottom-4 w-1.5 h-1.5 rounded-full bg-slate-200" />
              {/* Moving Candidate Shifted */}
              <div className="absolute left-20 top-16 flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[8px] font-mono-telemetry text-amber-300 font-bold">Shifted!</span>
              </div>
            </div>
            <span className="text-[8px] font-mono-telemetry text-cyan-500">Target: 2025-08-01</span>
          </div>
        </div>
      ),
      keyTakeaways: [
        'Blink Comparator toggles between 350ms, 700ms, and 1200ms cadences to spot pixel displacement.',
        'Objects in the Gaia DR3 / SIMBAD catalog are flagged with blue reticles to filter out known sources.'
      ]
    },
    {
      id: 'step-3',
      title: 'Step 3: Spectral Fingerprinting & IAU ADES Verification',
      icon: Activity,
      tag: 'SPECTROPHOTOMETRY & SUBMISSION',
      color: 'from-amber-500 to-rose-600',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800/50',
      description:
        'SPHEREx provides 102 continuous spectral channels from 0.75 to 5.0 μm. Check the spectrophotometric curve to identify molecular absorption signatures before confirming community consensus and generating an IAU ADES report.',
      visual: (
        <div className="w-full h-44 rounded-lg bg-slate-950 border border-slate-800 p-3 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono-telemetry">
            <span className="text-amber-400 font-semibold">DIAGNOSTIC ABSORPTION DIPS:</span>
            <span className="text-slate-400">WAVELENGTH: 0.75 - 5.0 μm</span>
          </div>

          {/* Molecular Signature Pills */}
          <div className="grid grid-cols-3 gap-2 my-2 text-xs">
            <div className="p-2 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-200">
              <div className="font-bold flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>H₂O Ice (3.1 μm)</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-1">Diagnostic dip for KBOs, TNOs & icy comet nuclei.</p>
            </div>

            <div className="p-2 rounded bg-indigo-950/60 border border-indigo-500/40 text-indigo-200">
              <div className="font-bold flex items-center space-x-1">
                <Flame className="w-3 h-3 text-indigo-400" />
                <span>CH₄ Methane (1.6 & 3.3 μm)</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-1">Definitive hallmark of cold Y & T-type Brown Dwarfs.</p>
            </div>

            <div className="p-2 rounded bg-amber-950/60 border border-amber-500/40 text-amber-200">
              <div className="font-bold flex items-center space-x-1">
                <Orbit className="w-3 h-3 text-amber-400" />
                <span>CO₂ Gas (4.26 μm)</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-1">Emission spike indicating active cometary outgassing.</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-telemetry">
            <span>COMMUNITY CONSENSUS: UPVOTE / CONFIRM</span>
            <span className="text-emerald-400 font-bold">ONE-CLICK IAU ADES 2.0 EXPORT</span>
          </div>
        </div>
      ),
      keyTakeaways: [
        'Inspect the 102-band curve at the bottom panel to verify molecular fingerprints.',
        'Click "Export IAU ADES Report" to package astrometry and photometry into standard format for NASA MPC submission.'
      ]
    }
  ];

  const current = steps[currentStep];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Progress Gradient Bar */}
        <div className="h-1.5 w-full bg-slate-800">
          <div
            className={`h-full bg-gradient-to-r ${current.color} transition-all duration-300`}
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gradient-to-tr ${current.color} text-slate-950 shadow-md`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono-telemetry font-bold border ${current.badgeColor}`}>
                  {current.tag}
                </span>
                <span className="text-xs text-slate-400 font-mono-telemetry">
                  PHASE {currentStep + 1} OF {steps.length}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 tracking-wide mt-0.5">
                {current.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-160px)]">
          {/* Main Description */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {current.description}
          </p>

          {/* Interactive Visual Graphic */}
          {current.visual}

          {/* Key Takeaways */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hunting Protocol & Rules</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {current.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          {/* Step Dots */}
          <div className="flex items-center space-x-2">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentStep === idx
                    ? 'w-6 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition"
              >
                <span>Next Phase</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md transition"
              >
                <Crosshair className="w-4 h-4" />
                <span>Start Hunting</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
