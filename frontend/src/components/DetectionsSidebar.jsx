import React, { useState } from 'react';
import {
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Download,
  PlusCircle,
  Eye,
  EyeOff,
  Compass,
  ChevronDown
} from 'lucide-react';

export default function DetectionsSidebar({
  sector,
  selectedAnomaly,
  onSelectAnomaly,
  showKnownObjects,
  onToggleKnownObjects,
  onFlagCoordinate
}) {
  const [votesState, setVotesState] = useState({});
  const [isFlagFormOpen, setIsFlagFormOpen] = useState(false);
  const [manualRa, setManualRa] = useState('');
  const [manualDec, setManualDec] = useState('');
  const [manualType, setManualType] = useState('KBO');

  // Helper to read vote count with localStorage persistence
  const getAnomalyVotes = (anom) => {
    if (!anom) return { upvotes: 12, downvotes: 1 };
    if (votesState[anom.anomaly_id]) {
      return votesState[anom.anomaly_id];
    }
    const stored = localStorage.getItem(`spherex_votes_${anom.anomaly_id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // ignore corrupted storage
      }
    }
    return anom.community_votes || { upvotes: 12, downvotes: 1 };
  };

  // Vote handler with SQLite backend + localStorage fallback
  const handleVote = async (anomalyId, deltaUp, deltaDown, currentVotes) => {
    const voteType = deltaUp > 0 ? 'up' : 'down';
    const updated = {
      upvotes: Math.max(0, currentVotes.upvotes + deltaUp),
      downvotes: Math.max(0, currentVotes.downvotes + deltaDown)
    };

    // Optimistic local state update + localStorage persistence
    try {
      localStorage.setItem(`spherex_votes_${anomalyId}`, JSON.stringify(updated));
    } catch {
      // ignore storage failure
    }
    setVotesState((prev) => ({ ...prev, [anomalyId]: updated }));

    // Sync persistent vote to SQLite backend
    try {
      const res = await fetch('http://localhost:8000/api/db/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anomaly_id: anomalyId,
          vote: voteType,
          delta_up: deltaUp,
          delta_down: deltaDown
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.anomaly?.community_votes) {
          const serverVotes = {
            upvotes: data.anomaly.community_votes.upvotes,
            downvotes: data.anomaly.community_votes.downvotes
          };
          localStorage.setItem(`spherex_votes_${anomalyId}`, JSON.stringify(serverVotes));
          setVotesState((prev) => ({ ...prev, [anomalyId]: serverVotes }));
        }
      }
    } catch {
      // Offline fallback: already persisted in localStorage
    }
  };

  // Submit manual flag
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const raNum = parseFloat(manualRa);
    const decNum = parseFloat(manualDec);
    if (isNaN(raNum) || isNaN(decNum)) return;

    onFlagCoordinate?.({
      ra: Number(raNum.toFixed(4)),
      dec: Number(decNum.toFixed(4)),
      classification: manualType,
      designation: `Citizen Flag (${manualType})`
    });

    setManualRa('');
    setManualDec('');
    setIsFlagFormOpen(false);
  };

  // Export IAU ADES Standard Report (supports backend SQLite or client-side fallback, JSON or XML)
  const handleExportADES = async (format = 'json') => {
    // 1. Attempt export from SQLite backend
    try {
      const res = await fetch(`http://localhost:8000/api/export/ades?format=${format}`);
      if (res.ok) {
        if (format === 'xml') {
          const xmlText = await res.text();
          const blob = new Blob([xmlText], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `spherex_iau_ades_${sector?.sector_id || 'catalog'}_${Date.now()}.xml`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        } else {
          const jsonReport = await res.json();
          const blob = new Blob([JSON.stringify(jsonReport, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `spherex_iau_ades_${sector?.sector_id || 'catalog'}_${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      }
    } catch {
      // Backend offline: proceed to client-side fallback
    }

    // 2. Client-side fallback report
    if (!sector) return;

    const adesReport = {
      version: "ADES 2.0.0",
      observatory: {
        mpc_code: "C51",
        telescope: "SPHEREx 0.2m All-Sky Spectral Surveyor",
        survey: "SPHEREx ChronoSky Citizen Hunting Pipeline"
      },
      submission_time: new Date().toISOString(),
      sector_id: sector.sector_id,
      sector_center: { ra: sector.ra_center, dec: sector.dec_center },
      observations: (sector.anomalies || []).map((anom) => {
        const votes = getAnomalyVotes(anom);
        return {
          permID: anom.anomaly_id,
          provID: anom.designation,
          mode: "NIR_SPEC",
          band: "0.75-5.0um",
          ra: anom.ra,
          dec: anom.dec,
          rmsRA: 0.05,
          rmsDec: 0.05,
          astrometric_proper_motion: anom.proper_motion,
          classification: anom.classification,
          apparent_mag_ab: anom.magnitude_ab,
          detection_confidence: anom.confidence,
          catalog_status: anom.catalog_status || "Citizen Flagged",
          citizen_consensus: {
            upvotes: votes.upvotes,
            downvotes: votes.downvotes,
            consensus_rate: `${Math.round((votes.upvotes / Math.max(1, votes.upvotes + votes.downvotes)) * 100)}%`
          },
          spectral_signature: {
            features: anom.spectral_features,
            channels_sampled: 102
          }
        };
      })
    };

    const blob = new Blob([JSON.stringify(adesReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spherex_iau_ades_${sector.sector_id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper for classification badge colors
  const getBadgeStyle = (classification) => {
    switch (classification?.toLowerCase()) {
      case 'kbo':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
      case 'browndwarf':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'comet':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'asteroid':
      default:
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Sidebar Header */}
      <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Citizen Consensus & ADES
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono-telemetry bg-slate-800 text-slate-400 border border-slate-700">
          {sector?.anomalies?.length ?? 0} ANOMALIES
        </span>
      </div>

      {/* Catalog Layer Controls */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center space-x-1.5">
          <Compass className="w-3.5 h-3.5 text-slate-500" />
          <span>Gaia DR3 / SIMBAD Overlay</span>
        </span>
        <button
          onClick={onToggleKnownObjects}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium border transition ${
            showKnownObjects
              ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {showKnownObjects ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
          <span>{showKnownObjects ? 'Active' : 'Hidden'}</span>
        </button>
      </div>

      {/* Anomaly Feed (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {(sector?.anomalies || []).map((anom) => {
          const isSelected = selectedAnomaly?.anomaly_id === anom.anomaly_id;
          const votes = getAnomalyVotes(anom);
          const totalVotes = votes.upvotes + votes.downvotes;
          const upvotePct = totalVotes > 0 ? Math.round((votes.upvotes / totalVotes) * 100) : 50;

          return (
            <div
              key={anom.anomaly_id}
              onClick={() => onSelectAnomaly?.(anom)}
              className={`p-3 rounded-lg border transition cursor-pointer text-xs ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-400 glow-cyan shadow-lg'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm tracking-wide">
                    {anom.designation}
                  </h4>
                  <p className="text-[11px] font-mono-telemetry text-slate-400">
                    ID: {anom.anomaly_id}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(anom.classification)}`}>
                    {anom.classification}
                  </span>
                  {anom.catalog_status && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono-telemetry border max-w-[150px] truncate ${
                        anom.catalog_status.includes('Gaia DR3 Match')
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      }`}
                      title={anom.catalog_status}
                    >
                      {anom.catalog_status}
                    </span>
                  )}
                </div>
              </div>

              {/* Astrometric Coordinates */}
              <div className="grid grid-cols-2 gap-1 py-1.5 font-mono-telemetry text-[11px] text-slate-400 border-y border-slate-800/60 my-2">
                <div>RA: <span className="text-slate-200">{anom.ra}°</span></div>
                <div>DEC: <span className="text-slate-200">{anom.dec}°</span></div>
                <div>PM-RA: <span className="text-cyan-400">{anom.proper_motion?.pm_ra ?? anom.pm_ra ?? '—'}"</span></div>
                <div>PM-DEC: <span className="text-cyan-400">{anom.proper_motion?.pm_dec ?? anom.pm_dec ?? '—'}"</span></div>
              </div>

              {/* Confidence & Consensus Meter */}
              <div className="space-y-1.5 mt-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Detection Confidence:</span>
                  <span className="text-cyan-300 font-mono-telemetry font-bold">
                    {Math.round((anom.confidence || 0.9) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-cyan-500 to-indigo-500"
                    style={{ width: `${Math.round((anom.confidence || 0.9) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Community Consensus:</span>
                  <span className="text-[11px] font-mono-telemetry text-emerald-400 font-semibold">
                    {upvotePct}% Verified
                  </span>
                </div>

                {/* Vote Action Buttons */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(anom.anomaly_id, 1, 0, votes);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 py-1 rounded bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 text-slate-300 border border-slate-700/60 transition"
                  >
                    <ThumbsUp className="w-3 h-3 text-emerald-400" />
                    <span>Confirm ({votes.upvotes})</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(anom.anomaly_id, 0, 1, votes);
                    }}
                    className="flex items-center justify-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700/60 transition"
                  >
                    <ThumbsDown className="w-3 h-3 text-rose-400" />
                    <span>{votes.downvotes}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Flagging Form Collapsible */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800">
        <button
          onClick={() => setIsFlagFormOpen(!isFlagFormOpen)}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-300 hover:text-cyan-400 py-1 transition"
        >
          <span className="flex items-center space-x-1.5">
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manual Candidate Flagging</span>
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFlagFormOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFlagFormOpen && (
          <form onSubmit={handleManualSubmit} className="mt-2.5 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">RA (deg):</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 150.45"
                  value={manualRa}
                  onChange={(e) => setManualRa(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono-telemetry text-xs focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Dec (deg):</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 2.19"
                  value={manualDec}
                  onChange={(e) => setManualDec(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono-telemetry text-xs focus:border-cyan-400 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Class:</label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:border-cyan-400 outline-none"
              >
                <option value="KBO">Trans-Neptunian Object / KBO</option>
                <option value="BrownDwarf">Substellar Brown Dwarf</option>
                <option value="Comet">Main Belt Comet</option>
                <option value="Asteroid">Near-Earth Asteroid</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-medium text-xs transition"
            >
              Add Candidate Anomaly
            </button>
          </form>
        )}
      </div>

      {/* ADES Export Section */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-telemetry">
          <span>IAU ADES 2.0 EXPORT:</span>
          <span className="text-cyan-400">MPC Pipeline</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleExportADES('json')}
            className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ADES (JSON)</span>
          </button>
          <button
            onClick={() => handleExportADES('xml')}
            className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 text-xs font-semibold rounded-lg shadow-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ADES (XML)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

