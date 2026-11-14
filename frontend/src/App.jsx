import React, { useState, useMemo } from 'react';
import SpectralGraph from './components/SpectralGraph';
import SkyCanvas from './components/SkyCanvas';
import {
  CELESTIAL_TARGETS,
  generateSpherex102Bands,
} from './utils/spectralData';
import {
  Satellite,
  Radio,
  Sparkles,
  Database,
  Volume2,
  Atom,
  Crosshair,
  Info,
} from 'lucide-react';

export default function App() {
  const [selectedTarget, setSelectedTarget] = useState(CELESTIAL_TARGETS[0]);
  const [activeBandInfo, setActiveBandInfo] = useState(null);

  // Compute 102 bands whenever the user clicks an object in Member 2's canvas or switches presets
  const currentSpectrum = useMemo(() => {
    return generateSpherex102Bands(selectedTarget.generatorType);
  }, [selectedTarget]);

  const handleSelectTargetFromCanvas = (target) => {
    setSelectedTarget(target);
    setActiveBandInfo(null);
  };

  const handlePresetChange = (presetKey) => {
    // Find matching celestial target or construct target view
    const matched = CELESTIAL_TARGETS.find((t) => t.generatorType === presetKey);
    if (matched) {
      setSelectedTarget(matched);
    } else {
      // Fallback for custom or direct preset switch
      const presetNames = {
        protostellar: 'Protostellar Cloud (High Ice Mantles)',
        disk: 'Protoplanetary Disk (Organics & Water)',
        atmosphere: 'Exoplanet Atmosphere (Volatiles)',
        w33a: 'W33A Protostar (Extreme CO₂/H₂O)',
        'ngc-1333': 'NGC 1333 Cold Ice Envelope',
      };
      setSelectedTarget((prev) => ({
        ...prev,
        id: `preset-${presetKey}`,
        name: presetNames[presetKey] || 'SPHEREx Observation Target',
        generatorType: presetKey,
      }));
    }
    setActiveBandInfo(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Mission Navigation */}
      <header className="border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40">
              <Satellite className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base tracking-wide text-white">
                  SPHEREx SKY HUNTER
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                  NASA 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Survey Status: ACTIVE</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>102 NIR Bands (0.75 - 5.0 µm)</span>
            </div>
            {activeBandInfo && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                <span className="text-[11px]">Inspecting: {activeBandInfo.wavelength} µm</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-6 w-full space-y-5">
        {/* Hero Mission Brief */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>SPECTROPHOTOMETRIC ICE & VOLATILE DETECTION PIPELINE</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              102-Band Near-Infrared Spectrophotometry & Acoustic Sonification
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
              SPHEREx maps the entire sky in 102 continuous near-infrared bands (0.75 to 5.00 microns) using 6 Linear Variable Filter (LVF) detector arrays.
              Click any celestial object on <strong>Member 2's Canvas</strong> below to inspect its unique 102-band infrared fingerprint, highlight signature volatile ice dips (<span className="text-cyan-300 font-semibold font-mono">H₂O Ice 3.1µm</span>, <span className="text-purple-300 font-semibold font-mono">CH₄ 3.3µm</span>, <span className="text-rose-300 font-semibold font-mono">CO₂ Ice 4.26µm</span>), and sonify the spectrum into sound via the Web Audio API.
            </p>
          </div>

          {/* Quick Mission Stats Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-400 flex items-center space-x-1">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>INSTRUMENT MATRIX</span>
            </span>
            <div className="space-y-1.5 my-2 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">Spectral Bands:</span>
                <span className="text-cyan-300 font-bold">102 Channels</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">Coverage:</span>
                <span className="text-white font-bold">0.75 – 5.00 µm</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">Target Locked:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[120px]">{selectedTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sonification:</span>
                <span className="text-amber-400 font-bold flex items-center space-x-1">
                  <Volume2 className="w-3 h-3" />
                  <span>Web Audio API</span>
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Calibrated to NASA SPHEREx mission specifications.
            </div>
          </div>
        </div>

        {/* Member 2's Canvas: Interactive Celestial Sky View */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white uppercase">Member 2: Celestial Object Sky Canvas</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400">Interactive Target Lock</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Click any object to plot its 102 bands below</span>
            </div>
          </div>

          <SkyCanvas
            selectedTargetId={selectedTarget.id}
            onSelectTarget={handleSelectTargetFromCanvas}
          />
        </section>

        {/* Bottom Interactive SpectralGraph Component */}
        <main className="w-full">
          <SpectralGraph
            key={selectedTarget.id}
            data={currentSpectrum}
            title={`${selectedTarget.name} — SPHEREx 102-Band Spectrum`}
            subtitle={`${selectedTarget.type} • Distance: ${selectedTarget.distance_ly || 'Variable'} ly • RA ${selectedTarget.ra || 'N/A'} Dec ${selectedTarget.dec || 'N/A'}`}
            target={selectedTarget.name}
            preset={selectedTarget.generatorType}
            onPresetChange={handlePresetChange}
            onBandSelect={(band) => setActiveBandInfo(band)}
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SPHEREx Sky Hunter • NASA Space Apps Challenge 2026</span>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400 flex items-center space-x-1">
              <Atom className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recharts Visualization & Web Audio Sonification</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
