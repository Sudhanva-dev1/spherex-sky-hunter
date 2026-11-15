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
    fetchSectorData(activeSectorId).then(async ({ data, source }) => {
      if (!isCurrent) return;

      let anomalies = [...(data.anomalies || [])];

      // If connected live, try fetching SQLite anomalies directly
      if (source === 'live') {
        try {
          const dbRes = await fetch(`http://localhost:8000/api/db/anomalies?sector_id=${activeSectorId}`);
          if (dbRes.ok) {
            const dbData = await dbRes.json();
            if (dbData.anomalies && dbData.anomalies.length > 0) {
              anomalies = dbData.anomalies;
            }
          }
        } catch {
          // Keep fetched sector anomalies
        }
      }

      // Merge offline flagged candidates from localStorage
      try {
        const storedFlags = JSON.parse(localStorage.getItem('spherex_user_flags') || '[]');
        const sectorFlags = storedFlags.filter(
          (f) => f.sector_id === activeSectorId && !anomalies.some((a) => a.anomaly_id === f.anomaly_id)
        );
        anomalies = [...sectorFlags, ...anomalies];
      } catch {
        // ignore storage errors
      }

      const mergedPayload = { ...data, anomalies };
      setSectorData(mergedPayload);
      setDataSource(source);

      if (anomalies.length > 0) {
        setSelectedAnomaly(anomalies[0]);
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

  // Flag new coordinate from BlinkComparator or manual form with SQLite + Gaia DR3 cross-check
  const handleFlagCoordinate = async (newAnomaly) => {
    const payload = {
      sector_id: activeSectorId,
      ra: newAnomaly.ra,
      dec: newAnomaly.dec,
      classification: newAnomaly.classification || 'KBO',
      designation: newAnomaly.designation || `Citizen Candidate (${newAnomaly.classification || 'KBO'})`,
      pm_ra: newAnomaly.pm_ra ?? 0.05,
      pm_dec: newAnomaly.pm_dec ?? -0.02
    };

    let created = null;

    // 1. Attempt persistent insert via SQLite backend API
    try {
      const res = await fetch('http://localhost:8000/api/db/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.anomaly) {
          created = data.anomaly;
        }
      }
    } catch {
      // Backend offline, fallback to client-side generation
    }

    // 2. Client-side fallback if backend API is offline
    if (!created) {
      const customId = `FLAG-${Date.now().toString().slice(-4)}`;
      created = {
        anomaly_id: customId,
        id: customId,
        sector_id: activeSectorId,
        designation: payload.designation,
        classification: payload.classification,
        ra: payload.ra,
        dec: payload.dec,
        proper_motion: { pm_ra: payload.pm_ra, pm_dec: payload.pm_dec },
        catalog_status: 'Uncataloged Candidate (Offline)',
        positions_by_epoch: [
          { epoch: 1, ra: payload.ra - 0.005, dec: payload.dec + 0.005, date: '2025-02-01' },
          { epoch: 2, ra: payload.ra, dec: payload.dec, date: '2025-08-01' }
        ],
        spectrum_102: MOCK_SECTORS.kuiper_belt_04.anomalies[0].spectrum_102,
        spectral_bands_um: MOCK_SECTORS.kuiper_belt_04.anomalies[0].spectral_bands_um,
        spectral_features: [{ wavelength_um: 3.1, species: 'Candidate Ice', type: 'absorption' }],
        magnitude_ab: 23.4,
        confidence: 0.75,
        community_votes: { upvotes: 1, downvotes: 0, consensus_percentage: 100 },
        flagged_by_user: true
      };
    }

    // 3. Save to localStorage for instant offline recovery
    try {
      const stored = JSON.parse(localStorage.getItem('spherex_user_flags') || '[]');
      stored.unshift(created);
      localStorage.setItem('spherex_user_flags', JSON.stringify(stored.slice(0, 50)));
    } catch {
      // ignore storage failure
    }

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
          <div className="p-1.5 rounded-lg bg-linear-to-tr from-cyan-500 to-indigo-600 text-slate-950 shadow-md">
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
              {dataSource === 'live' ? 'SQLite DB Connected' : 'Local Simulation Mode'}
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
        onComplete={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
