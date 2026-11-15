# SPHEREx Sky Hunter — 7-Slide Pitch Deck
> **NASA Space Apps Challenge 2026**  
> **Challenge:** "How to Spot a Moving World"  
> **PowerPoint File:** [`presentation/SPHEREx_Sky_Hunter_Presentation.pptx`](./SPHEREx_Sky_Hunter_Presentation.pptx)  

---

## 📽️ Slide Breakdown & Script Notes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SLIDE DECK OVERVIEW                             │
│                                                                        │
│  [Slide 1] Project Identity: SPHEREx Sky Hunter                        │
│  [Slide 2] The Challenge: Optical Blind Spots vs. Infrared Solution    │
│  [Slide 3] Citizen Science Onboarding: Jumping Dots & Dipoles          │
│  [Slide 4] Science Engine: Astropy FITS & 102-Band Spectrogram         │
│  [Slide 5] Verification: Gaia DR3 Matching, Consensus & MPC ADES       │
│  [Slide 6] Full-Stack Architecture & Zero-Defect Reliability           │
│  [Slide 7] Impact, Mission Readiness & The Future of Discovery         │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Slide 1: Title & Project Identity (Name of the Project)
* **Title:** SPHEREx Sky Hunter
* **Subtitle:** Interactive Moving World Discovery Platform
* **Tagline:** Empowering Citizen Scientists to Spot Asteroids, Comets & Brown Dwarfs in NASA's 102-Band Infrared Sky
* **Pillars:**
  * **NASA SPHEREx Mission:** 102 Near-IR Spectral Channels ($0.75 - 5.0\,\mu\text{m}$) across 4 full-sky sweeps.
  * **Jumping Dot & Dipole:** Blink & ZOGY-inspired Difference Subtraction Engine.
  * **Planetary Defense:** Near-Earth Asteroid (NEO) Astrometric Tracking.
  * **Substellar Census:** Uncovering Cold Local Neighborhood Brown Dwarfs.
* **Speaker Script (0:00 - 0:15):**  
  *"Good morning judges. We are proud to present **SPHEREx Sky Hunter**—an interactive citizen science platform that turns NASA's 102-band infrared space survey into a real-time discovery engine for moving asteroids, icy comets, and hidden brown dwarfs."*

---

### Slide 2: The Challenge & Why SPHEREx Matters
* **The Problem: Blind Spots in Optical Surveys:**
  * **Cold Objects Emit No Visible Light:** Failed stars (brown dwarfs) and dark, low-albedo asteroids emit virtually zero optical light.
  * **Data Avalanche:** NASA’s SPHEREx mission will map the entire celestial sphere every 6 months, generating terabytes of high-cadence multispectral data.
  * **AI False Positives:** Automated algorithms struggle with diffraction spikes, cosmic rays, and detector noise.
* **The Solution: Infrared Vision + Human Eyes:**
  * **102 Infrared Bands:** Cold objects glow intensely in thermal infrared ($0.75 - 5.0\,\mu\text{m}$).
  * **Human Visual Pattern Recognition:** The human eye excels at distinguishing moving spatial coherence from random camera noise.
  * **Crowdsourced Verification:** Gamifying discovery brings millions of eyes to protect Earth and map our local galaxy.
* **Speaker Script (0:15 - 0:35):**  
  *"Optical telescopes only see the visible rainbow, but the coldest worlds in our solar neighborhood are completely dark. SPHEREx is humanity's heat-vision camera. Our platform pairs SPHEREx's 102 infrared colors with human visual pattern recognition to catch what automated algorithms miss."*

---

### Slide 3: Citizen Science Onboarding ("Flight School")
* **Step 1: The Core Tools:**
  * **Blink Mode ("The Jumping Dot"):** Rapidly toggling between multi-epoch frames reveals true movers hopping back and forth while distant stars stay frozen.
  * **Difference Mode ("The Dipole"):** Subtracting Epoch 1 from Epoch 2 ($E_2 - E_1$) erases static background stars, leaving a dark negative crater and glowing white beacon.
  * **Artifact Rejection:** Fast rejection of single-epoch cosmic rays and elongated satellite streaks.
* **Step 2: Fast Asteroids:**
  * **High Orbital Velocity:** Asteroids travel rapidly along the ecliptic plane over hours to days.
  * **Widely Spaced Dipoles:** Form straight, linear trails with distant dipole pairs.
* **Step 3: Cold Brown Dwarfs:**
  * **High Proper Motion (HPM):** Substellar failed stars drift slowly across 6-month survey sweeps.
  * **The "Yin-Yang" Tight Dipole:** Dark crater kissing the white beacon, with intense emission at $4.5\,\mu\text{m}$ (methane window).
* **Speaker Script (0:35 - 0:55):**  
  *"We built 'Flight School' (`TutorialModal.jsx`) which teaches anyone to identify moving worlds in under 60 seconds. Asteroids hop across the sky as Jumping Dots, while drifting Brown Dwarfs leave an iconic Yin-Yang Dipole in difference mode."*

---

### Slide 4: Scientific Engine & 102-Band Spectrogram
* **Astropy FITS Processing Pipeline:**
  * **32-Bit FITS Normalization:** Converts floating point telescope arrays into web-ready 8-bit PNG Base64 data URIs.
  * **ZScale & AsinhStretch:** Automatically sets astronomical noise floors and stretches dynamic contrast ($a=0.1$).
* **102-Band Volatile Spectrogram ($0.75 - 5.0\,\mu\text{m}$):**
  * **Comet Volatiles:** Identifies sharp Water-Ice ($H_2O$) absorption dips at **$2.01\,\mu\text{m}$** and **$3.00\,\mu\text{m}$**.
  * **Brown Dwarf Methane:** Uncovers atmospheric Methane ($CH_4$) absorption dips at **$1.65\,\mu\text{m}$** and **$2.20\,\mu\text{m}$**.
  * **Web Audio API Sonification:** Translates 102 spectral flux values into real-time synthesized acoustic tones so users can *hear* the chemistry of moving worlds.
* **Speaker Script (0:55 - 1:15):**  
  *"Under the hood, our Astropy pipeline normalizes raw 32-bit FITS cutouts for smooth 60 FPS canvas blinking. Users can inspect full 102-band spectra—verifying water-ice dips in comets and methane dips in brown dwarfs—and even listen to them with Web Audio sonification."*

---

### Slide 5: Gaia DR3 Cross-Matching, Consensus & ADES Export
* **Gaia DR3 Real-Time Cross-Match:**
  * **5-Arcsecond Spatial Cone:** Real-time query against the Gaia DR3 catalog.
  * **Motion Classification:** Distinguishes fixed stars, known high-proper-motion stars, and completely **Uncatalogued Moving Candidates**.
* **Crowdsourced Bayesian Consensus:**
  * **Persistent SQLite Database:** ACID-compliant storage in `backend/database.db`.
  * **Confidence Weighting:** Upvotes and downvotes establish statistical confidence to prioritize follow-up.
* **Minor Planet Center (MPC) ADES Export:**
  * **International Standard:** Exports candidate astrometric observations in official **ADES XML & JSON** formats.
  * **Ground-Telescope Ready:** Includes observatory codes, MJD timestamps, RA/Dec coordinates, and photometric bands.
* **Speaker Script (1:15 - 1:35):**  
  *"Every clicked coordinate queries Gaia DR3 within 5 arcseconds to verify if it's a known star or an uncatalogued discovery. Discoveries are vetted through Bayesian consensus voting and exported into official Minor Planet Center ADES format for rapid telescope recovery."*

---

### Slide 6: Full-Stack Architecture & Zero-Defect Reliability
* **Frontend UI (React 19 + Tailwind CSS v4):**
  * Hardware-accelerated Canvas Blinker, interactive SkyMap, and tutorial modals.
  * 0 console errors, 0 linter warnings, instant responsive layout.
* **Backend Services (FastAPI + SQLite):**
  * 14 REST API endpoints for sectors, anomalies, votes, FITS normalization, and ADES telemetry.
  * ACID-compliant SQLite persistence with auto-seeding.
* **Resilience & Offline Guarantee:**
  * 100% offline fallback cache ensuring zero-failure live demos even with no internet connection.
* **Speaker Script (1:35 - 1:50):**  
  *"ChronoSky is built with React 19, Tailwind CSS v4, and FastAPI backed by SQLite. With 14 REST endpoints, Astropy cutouts, and a 100% offline-cached fallback, our application guarantees zero-defect performance under live demo conditions."*

---

### Slide 7: Impact, Mission Readiness & The Future of Discovery
* **Key Mission Metrics:**
  * **102** Near-Infrared Spectral Channels.
  * **4** Full All-Sky Survey Sweeps every 6 months.
  * **5 Arcsec** Gaia DR3 Astrometric Cross-Matching.
  * **0 Errors** Production-grade build & lint verification.
* **Real-World Impact:**
  * **Planetary Defense Vanguard:** Early detection of low-albedo, sun-approaching Near-Earth Asteroids.
  * **Cosmic Census:** Uncovering the coldest Y-type brown dwarfs lurking within a few light-years.
  * **Democratizing Space Exploration:** Open-source platform welcoming students and amateur astronomers worldwide.
* **Speaker Script (1:50 - 2:00):**  
  *"SPHEREx Sky Hunter turns everyday citizens into planetary defenders and cosmic explorers. Join the hunt, and help humanity spot the next moving world. Thank you!"*
