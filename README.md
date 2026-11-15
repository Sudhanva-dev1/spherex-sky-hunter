# SPHEREx Sky Hunter — NASA Space Apps Challenge 2026

**102-Band Near-Infrared Spectrophotometry, Ice Mantle Identification & Web Audio Sonification**

SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) maps the entire sky in 102 continuous near-infrared bands from **0.75 µm to 5.00 µm** using 6 Linear Variable Filter (LVF) detector arrays.

---

## 🌌 System Architecture

```
spherex-sky-hunter/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SpectralGraph.jsx     # Recharts 102-band flux chart + Web Audio API sonifier
│   │   │   └── SkyCanvas.jsx         # Member 2 Celestial Object Canvas (interactive starfield)
│   │   ├── utils/
│   │   │   └── spectralData.js       # 102-band physics generator, LVF channels & target catalog
│   │   ├── App.jsx                   # Mission control dashboard connecting Canvas & SpectralGraph
│   │   ├── main.jsx                  # React 19 entry
│   │   └── index.css                 # Tailwind CSS v4 styling
│   └── package.json
├── backend/
│   ├── main.py                       # FastAPI & fallback HTTP server with CORS enabled
│   ├── database.py                   # Member 5 SQLite persistence, Gaia DR3 cross-matcher & ADES 2.0
│   ├── database.db                   # Persistent SQLite DB (sectors, anomalies, votes_log)
│   ├── demo_sectors.json             # Demo sectors and multi-epoch synthetic cutouts
│   ├── api_handler.py                # NASA API fetcher (APOD, DONKI, NeoWs) with offline cache
│   └── requirements.txt
├── data/
│   └── cache/
│       └── sample_data.json          # Cached fallback telemetry and mission dataset
└── SPECTRAL_GRAPH_SPEC.md            # Verified component specification & blueprint
```

---

## 🚀 Quick Start Guide

### 1. Frontend (React 19 + Vite 8 + Recharts 3 + Tailwind 4)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start local development server
npm run dev
```

Open `http://localhost:5173` in your browser.

- **Member 2 Celestial Sky Canvas**: Click any celestial object (IRAS 16293-2422, TW Hydrae, HD 209458 b, W33A, NGC 1333) to lock target.
- **102-Band Spectral Fingerprint**: Inspect observed flux density, continuum baseline, and optical depth $\tau$.
- **Highlighted Ice Volatile Zones**:
  - 🧊 **$\text{H}_2\text{O}$ Ice (3.10 µm)** — Fundamental $\text{O-H}$ stretch absorption.
  - 🌌 **$\text{CH}_4$ Methane (3.30 µm)** — $\text{C-H}$ stretch absorption.
  - 🪐 **$\text{CO}_2$ Ice (4.26 µm)** — Deep $\nu_3$ asymmetric stretch.
- **Web Audio API Sonification**:
  - Click **Sonify Spectrum** to play the full 102-band progression.
  - Frequency sweeps with wavelength ($220\text{ Hz} \to 600\text{ Hz}$).
  - Absorption troughs trigger audible resonant drops in sound.
  - Stereo panning sweeps Left $\to$ Right.
  - Quick **Audition** buttons for individual molecules.

### 2. Backend (Python)

```bash
# Run backend self-test / API service
python backend/main.py
```

The backend supports both **FastAPI** (`/api/health`, `/api/sector/{id}`, `/api/db/anomalies`, `/api/db/flag`, `/api/db/vote`, `/api/export/ades`, `/api/targets`, `/api/spectrum/{target_id}`) and automatically falls back to an internal standard library HTTP server if external packages or network access are unavailable.

- **SQLite Citizen Database (`backend/database.db`)**: Auto-seeds survey sectors and candidate anomalies.
- **Gaia DR3 Cross-Matching**: Automatically verifies whether flagged coordinates are novel candidates or known static stars within a 5-arcsecond radius.
- **IAU ADES 2.0 Export**: One-click export of citizen discoveries formatted for the Minor Planet Center (MPC) in both JSON and XML standards.

---

## 🔍 Code Quality & Build Checks

```bash
# Lint frontend code (0 warnings, 0 errors)
npm --prefix frontend run lint

# Build production bundle
npm --prefix frontend run build
```
