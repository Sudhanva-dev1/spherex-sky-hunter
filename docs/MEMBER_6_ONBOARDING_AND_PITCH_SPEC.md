# Member 6: Citizen Science UX, Onboarding & Pitch Deck — Specification & Prompt Blueprint

> **Role Focus:** Project Lead, Citizen Science UX, Onboarding & Presentation Lead  
> **Mission:** NASA Space Apps Challenge 2026 — SPHEREx Sky Hunter  
> **Key Challenge Criteria:** User Experience (UX), Public Engagement, Scientific Storytelling, and Judging Impact.

---

## 1. Critical Analysis: What Was Missing in the Original Prompt?

### Original Prompt Evaluation
> *"Create TutorialModal.jsx with a 3-step visual onboarding guide teaching regular users how to spot asteroids vs brown dwarfs using blink and difference modes. Also generate a comprehensive README.md with system architecture diagrams in Mermaid.js."*

### Identified Flaws & Necessary Corrections

| Dimension | Original Statement / Prompt Gap | Corrective Solution |
| :--- | :--- | :--- |
| **1. The Core Metaphor & Terminology** | Used technical jargon ("blink and difference modes") without the non-astronomer visual anchors. | Must explicitly incorporate **"The Jumping Dot"** (Blink Mode) and **"The Dipole / Yin-Yang"** (Difference Mode: bright beacon + dark crater). Non-astronomers grasp visual shapes faster than data subtraction math. |
| **2. The "Why SPHEREx Matters" Hook** | Omitted the mission purpose. Judges penalize projects where users don't understand the real-world significance. | Onboarding must explain: **SPHEREx captures 102 infrared colors** ($0.75 - 5.0\,\mu\text{m}$) across 4 full-sky sweeps. Cold worlds (brown dwarfs) and dark asteroids emit virtually no optical light—SPHEREx is humanity's heat-vision camera for our solar neighborhood. |
| **3. Demo Script & Pitch Deck Deliverable** | The task description explicitly said *"and record the demo script"*, but the prompt completely omitted it! | The prompt must mandate a **timecoded 30-second elevator pitch and a 2-minute video presentation script** formatted with camera directions, visual cues, and rubric punchlines. |
| **4. Space Apps Judging Rubric Alignment** | A generic README misses the scoring rubric (Impact, Feasibility, Creativity, Clarity, Product/UX Readiness). | The `README.md` structure must explicitly mirror the NASA Space Apps Challenge evaluation matrix so judges can check off high-score criteria immediately. |
| **5. Technical Execution Safeguards** | Open-ended prompt invites broken external image dependencies or placeholder JSX buttons. | Mandate self-contained SVG/Canvas rendering, zero missing asset dependencies, keyboard accessibility (`Space`, `D`, `Esc`), and `localStorage` persistence. |

---

## 2. The Optimized Master Prompt for Gemini

Use the structured, prompt below when asking Gemini (or executing as an agent) to generate or refine the project code:

```markdown
### MASTER PROMPT: Member 6 (Citizen Science UX, Onboarding & NASA Presentation Lead)

You are Member 6 (Project Lead, Citizen Science UX & Presentation Lead) for the NASA Space Apps Challenge 2026 project "SPHEREx Sky Hunter".

TASK OBJECTIVE:
NASA judges score heavily on whether a non-astronomer can intuitively understand why SPHEREx matters, learn how to spot moving celestial targets in under 60 seconds, and immediately contribute to science.

DELIVERABLE 1: `frontend/src/components/TutorialModal.jsx`
Create a high-polish, interactive 3-step modal titled "How to Spot a Moving World: Citizen Science Guide":
1. Step 1: "The Core Tools — Jumping Dots & Dipoles"
   - Explain why SPHEREx matters: 102 near-infrared bands (0.75 - 5.0 µm) surveying the entire sky every 6 months to detect cold, dark objects invisible in optical light.
   - Explain Blink Mode: Rapidly alternating time steps (Epoch 1 vs Epoch 2) reveals moving objects as "Jumping Dots" while distant stars remain stationary.
   - Explain Difference Mode [Epoch 2 - Epoch 1]: Subtracts away static background stars, leaving a signature "Dipole" (a dark negative crater where the object was, and a glowing white beacon where it arrived).
2. Step 2: "Target 1 — Fast-Moving Solar System Asteroids"
   - Show how nearby asteroids travel fast across short intervals (minutes to hours).
   - Visualize straight linear tracks, high displacement jumps, and widely spaced dipole pairs along the ecliptic plane.
   - Provide a false-positive rejection guide (distinguishing true circular asteroid PSFs from continuous satellite streaks and single-pixel cosmic rays).
3. Step 3: "Target 2 — Cold Brown Dwarfs (Failed Stars)"
   - Show how cold, substellar brown dwarfs exhibit slow High Proper Motion (HPM) across 6-month survey sweeps.
   - Visualize the iconic "Tight Dipole" (dark crater kissing the bright beacon like a yin-yang pair).
   - Explain their infrared signature: bright in SPHEREx Band 5/6 (4.5 µm methane absorption window) and totally invisible in visible light.
4. Interactive & Technical Requirements:
   - Self-contained SVG/HTML5 sky canvas with 25+ background stars, subtle thermal IR noise, and interactive clickable targets.
   - Real-time controls: Blink playback (Play/Pause, Slow/Normal/Fast rates), manual frame stepper (E1 / E2), Difference mode toggle, and HUD crosshairs.
   - Clicking a candidate activates a Candidate Telemetry HUD (RA/Dec, apparent speed, SNR, spectral band).
   - Accessibility: Keyboard shortcuts (Space = Blink, D = Difference, Esc = Close, Arrow keys = Step navigation) and localStorage persistence ("Don't show again on startup").
   - Dark aerospace UI styled with Tailwind CSS v4 and Lucide React icons.

DELIVERABLE 2: Root `README.md`
Generate a comprehensive, hackathon-winning README.md containing:
1. Project Title, Mission Statement, and NASA Space Apps Challenge Category.
2. System Architecture Diagram rendered in Mermaid.js (Data Ingestion, Astrometric Subtraction Pipeline, Frontend UI, Consensus Engine).
3. "Why SPHEREx Matters" scientific context (102 infrared spectral channels, planetary defense, cold brown dwarf census).
4. The 3-Step Detection Methodology (Blink vs Difference, Dipole Physics).
5. 6-Agent Multi-Agent Squad Protocol Mapping (from learn.md).
6. 2-Minute Video Demo Script & 30-Second Elevator Pitch with timecodes and speaker prompts.
7. NASA Space Apps Judging Rubric Alignment Matrix.
8. Quickstart Guide (Frontend & Backend execution commands with offline fallback guarantee).
```

---

## 3. Structural Blueprint of Deliverables

### File Tree Layout
```
spherex-sky-hunter/
├── README.md                          # Master NASA Challenge & Architectural Documentation
├── learn.md                           # 6-Agent Multi-Agent Operational Protocol
├── docs/
│   ├── ARCHITECTURE.md                # In-depth technical specification & mathematical equations
│   └── MEMBER_6_ONBOARDING_AND_PITCH_SPEC.md  # This prompt analysis and execution blueprint
├── backend/
│   ├── api_handler.py                 # Resilient NASA API fetcher (APOD, NeoWs, DONKI, IRSA)
│   └── requirements.txt               # Backend dependencies
├── data/
│   └── cache/
│       └── sample_data.json           # Offline fallback dataset for zero-failure demos
└── frontend/
    ├── src/
    │   ├── App.jsx                    # Mission Control Interface & Tutorial Launcher
    │   ├── components/
    │   │   └── TutorialModal.jsx      # "How to Spot a Moving World" 3-Step Visual Modal
    │   ├── index.css                  # Tailwind CSS v4 directives
    │   └── main.jsx                   # React 19 entry point
    └── package.json                   # React 19, Tailwind v4, Lucide React, Recharts
```

---

## 4. Key Terminology Cheat Sheet (Layperson vs. Astrophysics)

To ensure high scores in **Clarity and User Experience**, the UI and documentation map technical astrophysics terms into accessible everyday language:

| Technical Concept | Citizen Scientist Term | Visual Mental Anchor |
| :--- | :--- | :--- |
| **Blink Comparator** | *Blink Mode* | **"The Jumping Dot"** — stationary stars stay frozen while the moving world hops back and forth. |
| **Image Subtraction $[E_2 - E_1]$** | *Difference Mode* | **"The Eraser Filter"** — eliminates motionless stars, turning the black background into a clear radar screen. |
| **Subtracted Residual Polarity** | *The Dipole* | **"The Yin-Yang Pair"** — a dark crater (where it was) paired with a bright beacon (where it moved). |
| **High Proper Motion ($\mu$)** | *Cosmic Drift* | Nearby substellar neighbors crawling slowly across our solar neighborhood over months. |
| **Near-Earth Object (NEO)** | *Fast Asteroid* | Solar system rocky bodies streaking quickly across exposures in straight lines. |
| **$4.5\,\mu\text{m}$ Methane Band** | *Infrared Heat Glow* | Cold worlds invisible to human eyes that glow like beacons in SPHEREx's thermal bands. |

---

## 5. Official NASA Space Apps Challenge Judging Rubric Alignment

Every section of the documentation and onboarding modal maps to the 5 official scoring pillars:

1. **Impact (20%):** Expands NASA planetary defense against Near-Earth Asteroids and accelerates discovery of brown dwarfs bridging the gap between stars and giant gas planets.
2. **Creativity (20%):** Interactive dual-mode simulation (Blink + Difference) turning complex FITS subtraction into an intuitive, gamified citizen science tool.
3. **Validity & Feasibility (20%):** Mathematically grounded in WCS affine alignment and PSF convolution, backed by `api_handler.py` with 100% offline fallback reliability.
4. **Relevance (20%):** Directly leverages the upcoming NASA SPHEREx mission's unique 102-channel infrared spectroscopy and 6-month survey cadence.
5. **Clarity & Presentation (20%):** Self-explanatory "How to Spot a Moving World" modal, clear non-astronomer language, timecoded demo script, and complete architecture diagrams.
