import React, { useState, useEffect } from 'react';
import {
  Orbit,
  Search,
  HelpCircle
} from 'lucide-react';
import { MOCK_SECTORS, fetchSectorData } from './data/mockSectors';
import SkyMap from './components/SkyMap';
import BlinkComparator from './components/BlinkComparator';
import DetectionsSidebar from './components/DetectionsSidebar';
import SpectralGraph from './components/SpectralGraph';
import TutorialModal from './components/TutorialModal';

export default function App() {
  const [activeSectorId, setActiveSectorId] = useState('kuiper_belt_04');
  const [sectorData, setSectorData] = useState(MOCK_SECTORS.kuiper_belt_04);
  const [selectedAnomaly, setSelectedAnomaly] = useState(
    MOCK_SECTORS.kuiper_belt_04.anomalies[0]
  );
  const [showKnownObjects, setShowKnownObjects] = useState(true);
  const [activeBandPreset, setActiveBandPreset] = useState('full_nir');
  const [dataSource, setDataSource] = useState('mock'); // 'live' | 'mock'
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch sector data whenever activeSectorId changes
  useEffect(() => {
    let isCurrent = true;
    fetchSectorData(activeSectorId).then(({ data, source }) => {
      if (!isCurrent) return;
      setSectorData(data);
      setDataSource(source);
      if (data.anomalies && data.anomalies.length > 0) {
        setSelectedAnomaly(data.anomalies[0]);
      } else {
        setSelectedAnomaly(null);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [activeSectorId]);

  // Handle custom coordinate search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if query matches sector names or IDs
    const lower = searchQuery.toLowerCase();
    const matchedKey = Object.keys(MOCK_SECTORS).find((key) => {
      const sec = MOCK_SECTORS[key];
      return (
        key.toLowerCase().includes(lower) ||
        sec.sector_name.toLowerCase().includes(lower) ||
        sec.anomalies?.some((a) => a.classification.toLowerCase().includes(lower))
      );
    });

    if (matchedKey) {
      setActiveSectorId(matchedKey);
    }
  };

  // Flag new coordinate from BlinkComparator or manual form
  const handleFlagCoordinate = (newAnomaly) => {
    const customId = `FLAG-${Date.now().toString().slice(-4)}`;
    const created = {
      anomaly_id: customId,
      designation: newAnomaly.designation || `Citizen Candidate ${customId}`,
      classification: newAnomaly.classification || 'KBO',
      ra: newAnomaly.ra,
      dec: newAnomaly.dec,
      proper_motion: { pm_ra: 0.05, pm_dec: -0.02 },
      positions_by_epoch: [
        { epoch: 1, ra: newAnomaly.ra - 0.005, dec: newAnomaly.dec + 0.005, date: '2025-02-01' },
        { epoch: 2, ra: newAnomaly.ra, dec: newAnomaly.dec, date: '2025-08-01' }
      ],
      spectrum_102: MOCK_SECTORS.kuiper_belt_04.anomalies[0].spectrum_102,
      spectral_bands_um: MOCK_SECTORS.kuiper_belt_04.anomalies[0].spectral_bands_um,
      spectral_features: [{ wavelength_um: 3.1, species: 'Candidate Ice', type: 'absorption' }],
      magnitude_ab: 23.4,
      confidence: 0.75,
      community_votes: { upvotes: 1, downvotes: 0 },
      flagged_by_user: true
    };

    setSectorData((prev) => ({
      ...prev,
      anomalies: [created, ...(prev.anomalies || [])]
    }));
    setSelectedAnomaly(created);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-radar-grid selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
        {/* Branding */}
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-slate-950 shadow-md">
            <Orbit className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-wider text-slate-100">
                SPHEREx ChronoSky
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                Mission Control v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono-telemetry hidden sm:block">
              NASA Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer
            </p>
          </div>
        </div>

        {/* Center: Spectral Band Filters */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-mono-telemetry">
          <span className="text-[11px] text-slate-400 px-2 font-sans font-semibold">
            BAND PASS:
          </span>
          {[
            { id: 'full_nir', label: 'Full NIR 0.75-5.0μm' },
            { id: 'h2o_ice', label: 'H2O Ice 3.1μm' },
            { id: 'ch4_dwarf', label: 'CH4 Dwarf 3.3μm' },
            { id: 'co2_comet', label: 'CO2 Comet 4.26μm' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setActiveBandPreset(preset.id)}
              className={`px-2.5 py-1 rounded text-xs transition ${
                activeBandPreset === preset.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Right Actions & Status */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search RA, Dec or Sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 rounded-lg pl-7 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-400 outline-none w-44 lg:w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </form>

          {/* Backend Connection Pill */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-mono-telemetry border text-[11px] ${
              dataSource === 'live'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dataSource === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold">
              {dataSource === 'live' ? 'API Connected' : 'Local Simulation Mode'}
            </span>
          </div>

          {/* Tutorial Button */}
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">How to Hunt</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Grid + Bottom Drawer */}
      <main className="flex-1 p-3 grid grid-cols-12 gap-3 max-w-[1920px] mx-auto w-full">
        {/* Left Column: All-Sky Mollweide Map & Sector Selector */}
        <section className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col h-[480px] lg:h-[calc(100vh-22rem)] min-h-[420px]">
          <SkyMap
            sectors={MOCK_SECTORS}
            activeSectorId={activeSectorId}
            onSelectSector={(id) => setActiveSectorId(id)}
          />
        </section>

        {/* Center Viewport: Multi-Epoch Blink Comparator */}
        <section className="col-span-12 lg:col-span-8 xl:col-span-6 flex flex-col h-[480px] lg:h-[calc(100vh-22rem)] min-h-[420px]">
          <BlinkComparator
            sector={sectorData}
            selectedAnomaly={selectedAnomaly}
            onSelectAnomaly={(anom) => setSelectedAnomaly(anom)}
            onFlagCoordinate={handleFlagCoordinate}
            showKnownObjects={showKnownObjects}
            activeBandPreset={activeBandPreset}
          />
        </section>

        {/* Right Column: Detections & Citizen Consensus Sidebar */}
        <section className="col-span-12 lg:col-span-12 xl:col-span-3 flex flex-col h-[480px] lg:h-[calc(100vh-22rem)] min-h-[420px]">
          <DetectionsSidebar
            sector={sectorData}
            selectedAnomaly={selectedAnomaly}
            onSelectAnomaly={(anom) => setSelectedAnomaly(anom)}
            showKnownObjects={showKnownObjects}
            onToggleKnownObjects={() => setShowKnownObjects(!showKnownObjects)}
            onFlagCoordinate={handleFlagCoordinate}
          />
        </section>

        {/* Bottom Drawer: 102-Band Near-Infrared Spectrophotometry */}
        <section className="col-span-12 h-64 min-h-[240px]">
          <SpectralGraph
            anomaly={selectedAnomaly}
            sector={sectorData}
          />
        </section>
      </main>

      {/* Tutorial / Hunting Guide Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
