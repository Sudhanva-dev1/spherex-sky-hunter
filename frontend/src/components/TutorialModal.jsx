/* MEMBER 6: Replace this entire file with your TutorialModal implementation */
import React from 'react';
import { X, HelpCircle, Eye, Compass, CheckCircle2, ChevronRight } from 'lucide-react';

export default function TutorialModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl p-6 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
              SPHEREx ChronoSky — Citizen Science Hunting Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="py-5 space-y-4 text-sm text-slate-300">
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="p-2 rounded-md bg-cyan-950/50 text-cyan-400 mt-0.5">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-cyan-300 mb-1">1. Navigate Sky Sectors</h3>
              <p className="text-slate-400 leading-relaxed">
                Use the Mollweide All-Sky Navigator on the left to select candidate survey fields (KBOs, Brown Dwarfs, Comets, Near-Earth Asteroids) or input custom (RA, Dec) coordinates.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="p-2 rounded-md bg-indigo-950/50 text-indigo-400 mt-0.5">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-indigo-300 mb-1">2. Blink Multi-Epoch Observations</h3>
              <p className="text-slate-400 leading-relaxed">
                In the central Blink Comparator, toggle between SPHEREx survey epochs (spaced 6 months apart). Stationary stars remain fixed; true solar-system bodies and high-proper-motion brown dwarfs visibly shift.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="p-2 rounded-md bg-amber-950/50 text-amber-400 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-amber-300 mb-1">3. Classify & Export ADES Report</h3>
              <p className="text-slate-400 leading-relaxed">
                Examine the 102-band near-infrared spectrum at the bottom for diagnostic absorption dips (H₂O ice at 3.1μm, CH₄ at 1.6 & 3.3μm, CO₂ at 4.26μm). Vote on consensus and export official IAU ADES candidate reports!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-500 font-mono-telemetry">
            SPHEREx CADENCE: 6 MONTHS | 102 NIR CHANNELS
          </span>
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
          >
            <span>Launch Mission Control</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

