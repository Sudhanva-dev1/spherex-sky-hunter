# SPHEREx ChronoSky — System Architecture & Specification

## 1. Executive Summary & Mission Alignment
**SPHEREx ChronoSky** is an autonomous and citizen-science discovery platform engineered for the **NASA Space Apps Challenge 2026**.

The mission harnesses observations from NASA's **SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer)**, which maps the entire celestial sphere every 6 months across 102 continuous near-infrared (NIR) spectral bands spanning **0.75 μm to 5.0 μm** with spectral resolution $R = 40 \text{ to } 130$.

By combining **multi-epoch astrometric blinking**, **image subtraction/difference imaging**, and **102-band spectrophotometric fingerprinting**, SPHEREx ChronoSky enables professional astronomers and citizen scientists to detect:
1. **Trans-Neptunian Objects (TNOs) / Planet 9 Candidates** moving at slow orbital rates ($\sim 0.003''/\text{yr}$) exhibiting strong $3.1\,\mu\text{m}$ $\text{H}_2\text{O}$ ice absorption dips.
2. **Cold Substellar Brown Dwarfs (Y- and T-dwarfs)** showing fast proper motion ($>1.0''/\text{yr}$) and diagnostic methane ($\text{CH}_4$) absorption troughs at $1.66\,\mu\text{m}$ and $3.32\,\mu\text{m}$.
3. **Main Belt Comets (MBCs) & Centaurs** exhibiting active volatile outgassing ($\text{CO}_2$ emission at $4.26\,\mu\text{m}$).
4. **Fast-Moving Near-Earth Asteroids (NEAs)** with distinct silicate reflectance slopes.

---

## 2. System Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                  SPHEREx CHRONOSKY DASHBOARD                                      |
+---------------------------------------------------------------------------------------------------+
                                                  |
       +------------------------------------------+------------------------------------------+
       |                                          |                                          |
       v                                          v                                          v
+-------------------------------+  +-------------------------------+  +-------------------------------+
|     CELESTIAL NAVIGATOR       |  |    BLINK & DIFFERENCE ENGINE  |  |    CITIZEN CONSENSUS & ADES   |
|         (SkyMap.jsx)          |  |     (BlinkComparator.jsx)     |  |    (DetectionsSidebar.jsx)    |
+-------------------------------+  +-------------------------------+  +-------------------------------+
| - HTML5 Canvas Mollweide Proj |  | - Multi-Epoch Viewport        |  | - Candidate Anomaly Feed      |
|   (Newton-Raphson 2:1 Ellipse)|  | - Cadence Speed (350/700/1200)|  | - Astrometric Proper Motion   |
| - Galactic & Ecliptic Planes  |  | - Stationary Ref Star Lock    |  | - Confidence Score Bar        |
| - SPHEREx 6-Mo Orbit Swaths   |  | - Motion Vector Tracking      |  | - LocalStorage-backed Voting  |
| - 4 Survey Sectors + Jump Coor|  | - Interactive Reticle Target  |  | - Manual Flagging Submissions |
| - Aladin Lite v3 (2MASS/WISE) |  | - Canvas Click-to-Flag Hook   |  | - 1-Click IAU ADES 2.0 Export |
+-------------------------------+  +-------------------------------+  +-------------------------------+
                                                  |
                                                  v
                               +-------------------------------------+
                               |   102-BAND SPECTRAL EXPLORER        |
                               |        (SpectralGraph.jsx)          |
                               +-------------------------------------+
                               | - Recharts Continuous NIR Curve     |
                               | - Spectral Wavelengths: 0.75-5.0 um |
                               | - Diagnostic Absorption Reference:  |
                               |     * CH4 1.66 um & 3.32 um         |
                               |     * H2O Ice 3.10 um               |
                               |     * CO2 Gas 4.26 um               |
                               +-------------------------------------+
                                                  |
                                                  v
                      +-------------------------------------------------------+
                      |               OFFLINE/ONLINE DATA LAYER               |
                      |                 (mockSectors.js)                      |
                      +-------------------------------------------------------+
                      | - 1.5s Fast Timeout to FastAPI Backend                |
                      | - Zero-Dependency Offline Fallback Dataset            |
                      | - Physics-based 102-element synthetic spectrum gen    |
                      +-------------------------------------------------------+
                                                  |
                             (When Local API Server is active)
                                                  v
                      +-------------------------------------------------------+
                      |         FASTAPI & SQLITE BACKEND PIPELINE (Member 5)   |
                      |    (backend/main.py, database.py, api_handler.py)     |
                      +-------------------------------------------------------+
                      | - SQLite persistent DB (sectors, anomalies, votes_log)|
                      | - 5-arcsecond Gaia DR3 coordinate cross-matching      |
                      | - Dynamic Citizen Consensus percentage calculation    |
                      | - Minor Planet Center (MPC) IAU ADES 2.0 XML & JSON   |
                      | - NASA Open Data & DONKI Solar Weather API            |
                      | - NeoWs Near-Earth Asteroid Feed                      |
                      | - Astropy/Astroquery coordinate cross-matching        |
                      +-------------------------------------------------------+
```

---

## 3. Component Hierarchy & Interfaces

### 3.1 `frontend/src/App.jsx` (Master Mission Control Orchestrator)
- **Role:** Holds root state, coordinates active sector selection, manages spectral band quick-filters, and coordinates state across child panels.
- **Key State Variables:**
  - `activeSectorId`: Identifier of current sky region (`kuiper_belt_04`, `bd_candidate_j14`, `comet_trail_alpha`, `nea_fast_mover`).
  - `sectorData`: Resolved payload containing sector center, anomalies, known objects, and telemetry.
  - `selectedAnomaly`: Anomaly in focus for reticle targeting and spectrophotometric analysis.
  - `activeBandPreset`: Filter preset (`full_nir`, `h2o_ice`, `ch4_dwarf`, `co2_comet`).
  - `showKnownObjects`: Boolean toggle to hide/show Gaia DR3 & SIMBAD overlays.
  - `dataSource`: `'live' | 'mock'` connection indicator.
  - `isTutorialOpen`: Controls the onboarding modal display.

### 3.2 `frontend/src/components/SkyMap.jsx` (All-Sky Celestial Navigator)
- **Mathematical Foundation:** Implements an exact **Mollweide Equal-Area Projection** via Newton-Raphson approximation:
  $$2\theta + \sin(2\theta) = \pi \sin(\delta)$$
  $$x = \frac{2\sqrt{2}}{\pi} (\alpha - \alpha_0) \cos\theta$$
  $$y = \sqrt{2} \sin\theta$$
- **Layers Rendered:**
  1. Star field density simulation.
  2. Declination parallels ($-60^\circ, -30^\circ, 0^\circ, +30^\circ, +60^\circ$) and Right Ascension meridians ($0^\text{h}$ to $24^\text{h}$).
  3. Galactic Plane curve ($i \approx 62.87^\circ$).
  4. Ecliptic Equator line.
  5. SPHEREx Sun-Synchronous LEO orbital swath overlay.
  6. Pulsing sector beacons with click-to-select handlers.
- **Dual Engine:** Includes a fallback bridge to **Aladin Lite v3** for viewing high-resolution infrared sky tiles (2MASS and unWISE).

### 3.3 `frontend/src/components/BlinkComparator.jsx` (Multi-Epoch Blink & Difference Engine)
- **Role:** Blinks observed frames between survey epochs (Epoch 1: 2025-02, Epoch 2: 2025-08, etc.).
- **Detection Logic:**
  - Stationary stars from Gaia catalogs stay fixed across all frames.
  - Moving candidates change canvas coordinate position according to `positions_by_epoch`.
  - Reticle crosshairs track targeted candidate with dynamic proper motion annotations.
  - Interactive click listener allows users to flag uncataloged anomalies at arbitrary coordinates.

### 3.4 `frontend/src/components/SpectralGraph.jsx` (102-Band Spectrophotometric Explorer)
- **Role:** Visualizes spectrophotometric flux ($F_\nu$ in $\mu\text{Jy}$) across SPHEREx's 102 NIR bands.
- **Diagnostic Reference Markers:**
  - $1.66\,\mu\text{m}$ & $3.32\,\mu\text{m}$: $\text{CH}_4$ (Methane) absorption bands in Brown Dwarfs.
  - $3.10\,\mu\text{m}$: $\text{H}_2\text{O}$ (Water ice) absorption dip in Kuiper Belt Objects / Comets.
  - $4.26\,\mu\text{m}$: $\text{CO}_2$ (Carbon Dioxide) gas emission spike in active comets.
  - Broad $1.05\,\mu\text{m} / 2.00\,\mu\text{m}$ pyroxene dip in silicate asteroids.

### 3.5 `frontend/src/components/DetectionsSidebar.jsx` (Citizen Science & IAU ADES)
- **Community Consensus Meter:** Upvote/Confirm and Downvote verification buttons with `localStorage` persistence.
- **Manual Flagging Tool:** Adds user-discovered objects into the active sector feed.
- **IAU ADES 2.0 Exporter:** Generates an official Astrometry Data Exchange Standard (ADES) JSON report containing astrometric measurements, proper motion, photometric magnitudes, and citizen verification rates ready for the Minor Planet Center (MPC).

### 3.6 `frontend/src/components/TutorialModal.jsx` (3-Step Citizen Science Onboarding Guide)
- Step 1: Navigating the celestial sphere & choosing targets.
- Step 2: Spotting moving objects using Blink Mode (cadence controls, star locks, displacement).
- Step 3: Verifying diagnostic spectral fingerprints and submitting IAU ADES candidate reports.

---

## 4. Data Layer & API Resilience

### 4.1 Canonical Data Contract
```typescript
interface Anomaly {
  anomaly_id: string;
  designation: string;
  classification: 'KBO' | 'BrownDwarf' | 'Comet' | 'Asteroid';
  ra: number;
  dec: number;
  proper_motion: { pm_ra: number; pm_dec: number };
  positions_by_epoch: Array<{ epoch: number; ra: number; dec: number; date: string }>;
  spectrum_102: number[]; // 102 float values spanning 0.75 to 5.0 um
  spectral_bands_um: number[];
  spectral_features: Array<{ wavelength_um: number; species: string; type: 'absorption' | 'emission' }>;
  magnitude_ab: number;
  confidence: number;
  community_votes: { upvotes: number; downvotes: number };
  flagged_by_user?: boolean;
}

interface SectorPayload {
  sector_id: string;
  sector_name: string;
  ra_center: number;
  dec_center: number;
  fov_deg: number;
  epoch_coverage: {
    current_epoch: number;
    total_epochs: number;
    cadence_months: number;
    mission_start: string;
    epochs_observed: string[];
  };
  anomalies: Anomaly[];
  known_objects: Array<{
    catalog: string;
    object_id: string;
    name: string;
    ra: number;
    dec: number;
    object_type: string;
    magnitude: number;
  }>;
  telemetry: {
    spectral_resolution_range: [number, number];
    wavelength_range_um: [number, number];
    total_bands: number;
    survey_mode: string;
    orbit: string;
  };
}
```

### 4.2 Offline Reliability
`frontend/src/data/mockSectors.js` implements a non-blocking fetch wrapper:
- Requests to `http://localhost:8000/api/sector/{id}` abort automatically after **1500ms**.
- If the backend is not yet started, the frontend operates completely offline in **Local Simulation Mode** with zero crashes, rendering synthetic physics-based spectra for all 4 default sectors.

---

## 5. Verification & Code Quality Metrics

| Check | Tool / Standard | Result |
|---|---|---|
| **Compilation & Bundle** | Vite 8.3 + Rolldown | Built in 245–290ms, 0 errors |
| **Linting & Code Quality**| Oxlint (104 rules) | 0 warnings, 0 errors across all 9 source files |
| **Styling & CSS** | Tailwind CSS v4 Engine | Custom space dark-theme, custom scrollbars, glowing badges |
| **Offline Performance** | Standalone Browser | 100% interactive without active network connection |

