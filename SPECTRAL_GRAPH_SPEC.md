# SpectralGraph — 102-Band NIR Spectral Fingerprint & Sonification

## Component Blueprint for AI Code Generation (Corrected & Verified)

> **Project:** SPHEREx Sky Hunter — NASA Space Apps Challenge 2026
> **Component:** `frontend/src/components/SpectralGraph.jsx`
> **Status:** ✅ Built, linted (0 errors), production-compiled

---

## 1. Corrected AI Prompt

> [!IMPORTANT]
> The original prompt had minor scientific inaccuracies and was missing critical integration, file-structure, and browser-API details. Below is the **corrected, production-ready prompt** that will produce a working component on the first generation pass.

```text
Build `frontend/src/components/SpectralGraph.jsx` — a React component using
Recharts (already installed, v3.10+) to plot SPHEREx's 102 near-infrared
spectrophotometric bands spanning 0.75 µm to 5.0 µm.

SCIENTIFIC REQUIREMENTS:
- Generate exactly 102 linearly-spaced wavelength channels from 0.75 to 5.00 µm
  (matching SPHEREx's 6 Linear Variable Filter detector arrays).
- Model a realistic Planck-like dust/stellar continuum peaking near 1.6–1.8 µm
  with gentle long-wavelength decline.
- Superimpose Gaussian absorption features at these three molecular bands:
    1. H₂O Ice — center: 3.10 µm, FWHM ≈ 0.26 µm (broad O-H stretch)
    2. CH₄ Methane — center: 3.30 µm, FWHM ≈ 0.11 µm (sharp C-H stretch)
    3. CO₂ Ice — center: 4.26 µm, FWHM ≈ 0.14 µm (deep ν₃ asymmetric stretch)
- Add deterministic pseudo-noise for realism (NOT Math.random — must be
  reproducible across renders).

CHART REQUIREMENTS (Recharts):
- Use <AreaChart> with <ResponsiveContainer>, NOT a bare Canvas.
- X-axis: wavelength λ in µm (numeric, domain [0.75, 5.0]).
- Y-axis: flux density Fλ in mJy.
- Draw a dashed continuum baseline as a second <Area> with fill="none".
- Add <ReferenceArea> shaded overlays for each of the 3 absorption bands
  (cyan for H₂O, purple for CH₄, rose for CO₂).
- Add <ReferenceLine> at each band center with a label.
- Add a yellow <ReferenceLine> + <ReferenceDot> "playhead" that tracks the
  current sonification position.
- Custom tooltip showing: band index, wavelength, flux, continuum level,
  optical depth τ, detected molecule (if any), and LVF detector channel.
- The chart must be clickable — clicking a data point sonifies that single band.

SONIFICATION REQUIREMENTS (Web Audio API):
- "Sonify Spectrum" button that sequentially plays all 102 bands as tones.
- Wavelength → carrier frequency mapping (220 Hz at 0.75 µm → 600 Hz at 5.0 µm).
- Flux intensity → frequency modulation depth + lowpass filter cutoff.
  Absorption dips produce audibly deeper, more resonant tones.
- Dual-oscillator synthesis: primary triangle wave + sine sub-harmonic (or
  harmonic overtone at 1.5× for detected molecular bands).
- Stereo panning: left-to-right sweep across the spectrum.
- ADSR envelope: fast attack (20%), exponential decay to silence.
- BiquadFilter with higher Q resonance at molecular absorption bands.
- Playback speed control: 0.5×, 1×, 2× buttons.
- Mute toggle.
- Must call AudioContext inside a user-gesture handler to satisfy browser
  autoplay policy (create on first button click, not on mount).
- Individual molecule "Audition" buttons that play the single nearest band
  with a longer sustained tone.

INTEGRATION REQUIREMENTS:
- Accept an optional `data` prop — an array of 102 objects with at minimum
  { wavelength: number, flux: number }. When provided, use it instead of
  the internal generator. This is how Member 2's sky-map canvas will feed
  real object spectra into this chart.
- Expose `onBandSelect(band)` callback prop so the parent can react to
  user clicks on individual bands.
- Accept `title`, `subtitle`, `target`, and `className` props.
- Extract all constants (HIGHLIGHTED_BANDS, LVF_DETECTORS, and the
  generateSpherex102Bands function) into a separate utility file at
  `frontend/src/utils/spectralData.js` so other components can reuse them.

UI / STYLING:
- Use Tailwind CSS v4 (already configured via @tailwindcss/vite plugin).
- Dark-mode aerospace aesthetic: slate-950 backgrounds, cyan/purple/rose
  accent palette matching SPHEREx mission branding.
- Use lucide-react icons (already installed).
- Fully responsive: stacked layout on mobile, side-by-side on desktop.

CONSTRAINTS:
- React 19, Vite 8, Recharts 3, Tailwind 4 — all already in package.json.
- No additional npm dependencies.
- Must pass `oxlint src` with 0 errors and 0 warnings.
- Must produce a clean `vite build` with no errors.
```

---

## 2. What the Original Prompt Got Wrong (and Fixes Applied)

| # | Original Issue | Why It Matters | Fix Applied |
|---|---------------|----------------|-------------|
| 1 | Said "Recharts/Canvas" — conflating two different approaches | Recharts renders SVG via React components; raw `<canvas>` is a different paradigm. Mixing them breaks Recharts' declarative model. | Used pure Recharts `<AreaChart>` + `<ResponsiveContainer>`. |
| 2 | Didn't specify **how many microns per band** or the exact grid | Without specifying linear spacing across 102 points from 0.75→5.0, an LLM might generate random or log-spaced channels. | Exact formula: `λᵢ = 0.75 + (i/101) × 4.25` for i = 0..101. |
| 3 | Said "shaded overlays" without specifying Recharts component | An LLM might try CSS `position: absolute` divs on top of the chart (fragile, won't align). | Used `<ReferenceArea>` with `<linearGradient>` SVG fills — the Recharts-native way. |
| 4 | No absorption band widths (FWHM / σ) specified | Without Gaussian widths, the LLM would guess. H₂O ice is **broad** (σ≈0.11 µm), CH₄ is **narrow** (σ≈0.048 µm), CO₂ is **deep and medium** (σ≈0.058 µm). | Specified σ values matched to actual laboratory ice spectra from Hudgins et al. (1993) and Gerakines et al. (1995). |
| 5 | "Web Audio API button that converts 102 data points into frequency tones" — too vague | No mapping algorithm specified. An LLM might naively map `flux → frequency` (backwards — you hear the data shape, not its physical meaning). | Wavelength → pitch (physical analogy: shorter λ = lower pitch sweeping upward). Flux → filter cutoff + modulation depth (absorption dips = audible resonant drops). |
| 6 | No mention of browser autoplay policy | Creating `AudioContext` on component mount (before user gesture) causes it to start in `suspended` state. The sonification silently fails. | AudioContext created lazily inside the button's `onClick` handler. |
| 7 | No file structure for reusability | Putting 139 lines of constants + data generators inside the 893-line component makes it unreusable by Member 2's sky map or Member 4's state manager. | Extracted to `src/utils/spectralData.js`: exports `HIGHLIGHTED_BANDS`, `LVF_DETECTORS`, `getDetectorForWavelength()`, `generateSpherex102Bands()`. |
| 8 | No integration contract with other team members | The chart was described as standalone. But the task says "show spectrum when user clicks an object in Member 2's canvas" — that needs a props interface. | Added `data` prop (optional external spectrum array) and `onBandSelect` callback. |

---

## 3. File Structure (Current — Verified)

```
frontend/src/
├── components/
│   └── SpectralGraph.jsx       ← Main 893-line component (chart + sonification)
├── utils/
│   └── spectralData.js         ← 139 lines: constants, LVF table, band generator
├── assets/
│   ├── hero.png
│   ├── react.svg
│   └── vite.svg
├── App.jsx                     ← Root layout with header, hero, SpectralGraph, footer
├── App.css                     ← Legacy Vite template styles
├── index.css                   ← Tailwind v4 entry (@import "tailwindcss")
└── main.jsx                    ← React 19 createRoot entry
```

---

## 4. Component Props API

```jsx
<SpectralGraph
  // Optional: external 102-band data from sky-map click or API
  // If omitted, uses internal synthetic generator
  data={[
    { wavelength: 0.750, flux: 142.5 },
    { wavelength: 0.792, flux: 148.3 },
    // ... 102 objects total
  ]}

  // Display strings
  title="SPHEREx Near-Infrared Spectrum"
  subtitle="Spectrophotometric Flux Density & Absorption Profiles"
  target="Protostellar Ice Mantle Envelope (IRAS 16293-2422)"

  // CSS class passthrough
  className="mt-4"

  // Callback fired when user clicks a band dot or auditions a molecule
  onBandSelect={(band) => {
    // band = { bandIndex, wavelength, flux, continuumFlux, opticalDepth,
    //          feature, featureId, featureColor, detector, detectorColor }
  }}
/>
```

---

## 5. Data Shape Reference

Each of the 102 band objects produced by `generateSpherex102Bands()`:

```js
{
  bandIndex: 1,              // 1-indexed position (1..102)
  wavelength: 0.750,         // µm, linearly spaced
  flux: 142.53,              // mJy, observed (continuum × transmission + noise)
  continuumFlux: 153.21,     // mJy, unabsorbed baseline
  opticalDepth: 0.072,       // τ = -ln(transmission)
  feature: "H₂O Ice",       // null if outside all 3 absorption ranges
  featureId: "h2o",          // null, "h2o", "ch4", or "co2"
  featureColor: "#06b6d4",   // null or hex color of the feature
  detector: "LVF 1",         // which of SPHEREx's 6 detector arrays
  detectorColor: "#38bdf8",  // color assigned to the detector channel
}
```

---

## 6. Absorption Band Science (Corrected Values)

| Molecule | Center λ₀ | Range (chart overlay) | Gaussian σ | Physical Mode |
|----------|-----------|----------------------|------------|---------------|
| H₂O Ice | 3.10 µm | 2.96 – 3.24 µm | 0.11 µm | O-H fundamental stretch (amorphous + crystalline ice mantles on interstellar dust grains) |
| CH₄ | 3.30 µm | 3.24 – 3.38 µm | 0.048 µm | C-H symmetric stretching ν₃ mode (frozen organic ices in protoplanetary disks and Titan-like atmospheres) |
| CO₂ Ice | 4.26 µm | 4.16 – 4.36 µm | 0.058 µm | Asymmetric stretching ν₃ vibrational mode (dominant carbon volatile in dense molecular clouds) |

> [!NOTE]
> A minor CO gas band at 4.67 µm (σ = 0.04 µm, depth 18%) is also included
> in the generator for added realism but is not highlighted in the UI since
> SPHEREx's primary ice-detection science focuses on the three bands above.

---

## 7. Sonification Algorithm

```
Audio Signal Chain (per band):

  ┌─────────────┐   ┌─────────────┐
  │ Triangle Osc │   │  Sine Osc   │
  │ (primary)    │   │ (sub/harm.) │
  └──────┬───────┘   └──────┬──────┘
         └────────┬─────────┘
              ┌───┴────┐
              │  Gain  │  ← ADSR envelope
              │  Node  │
              └───┬────┘
              ┌───┴────────┐
              │ BiquadFilter│  ← LP cutoff modulated by flux
              │ (lowpass)   │    Q boosted at absorption bands
              └───┬────────┘
              ┌───┴──────┐
              │  Stereo   │  ← Pan L→R across spectrum
              │  Panner   │
              └───┬──────┘
              ┌───┴──────┐
              │  Master   │  ← Global volume (0.35)
              │  Gain     │
              └───┬──────┘
                  │
              [speakers]

Mappings:
  λ → baseFreq       : 220 + normalize(λ, 0.75, 5.0) × 380  →  220–600 Hz
  flux → fluxFactor   : clamp(flux / 100, 0.2, 1.5)
  finalFreq           : baseFreq × (0.65 + 0.45 × fluxFactor)
  filter cutoff       : max(400, finalFreq × (1.2 + fluxFactor × 2.0))
  filter Q            : 6.5 at molecular bands, 2.0 otherwise
  pan                 : -0.85 + normalize(λ) × 1.7
  osc type            : sine at molecular bands (purer), triangle elsewhere (warmer)
  sub-osc freq        : 1.5× at molecular bands (overtone), 0.5× elsewhere (sub)
```

---

## 8. Integration Guide — Connecting to Member 2's Sky Map

When Member 2 builds the interactive sky-map canvas, the parent component
should lift the selected object's spectrum into SpectralGraph:

```jsx
// In the parent layout (e.g., App.jsx or a Dashboard component):

const [selectedSpectrum, setSelectedSpectrum] = useState(null);
const [selectedObject, setSelectedObject] = useState(null);

const handleObjectClick = (skyObject) => {
  setSelectedObject(skyObject);
  // skyObject.spectrum should be an array of 102 {wavelength, flux} objects
  // from the backend API or from generateSpherex102Bands()
  setSelectedSpectrum(skyObject.spectrum || null);
};

return (
  <>
    <SkyMapCanvas onObjectClick={handleObjectClick} />

    <SpectralGraph
      data={selectedSpectrum}   {/* null → uses internal demo data */}
      target={selectedObject?.name || "Select an object above"}
      onBandSelect={(band) => console.log("Inspecting:", band)}
    />
  </>
);
```

---

## 9. Build & Lint Verification

```bash
# From project root:

# Install dependencies (first time only)
npm --prefix frontend install

# Lint (must show 0 errors, 0 warnings)
npm --prefix frontend run lint
# → Found 0 warnings and 0 errors.
# → Finished in 73ms on 4 files with 104 rules using 8 threads.

# Production build (must exit 0)
npm --prefix frontend run build
# → ✓ 2460 modules transformed.
# → ✓ built in 2.03s
```

---

## 10. Dependencies (All Pre-Installed — No New Packages Needed)

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.3.1 | UI framework |
| react-dom | ^19.3.1 | DOM renderer |
| recharts | ^3.10.1 | SVG charting (AreaChart, ReferenceArea, etc.) |
| lucide-react | ^1.73.0 | Icons (Play, Pause, Volume2, etc.) |
| tailwindcss | ^4.3.5 | Utility-first CSS |
| @tailwindcss/vite | ^4.3.5 | Vite plugin for Tailwind |
| vite | ^8.3.6 | Build tool & dev server |
| @vitejs/plugin-react | ^6.1.2 | React JSX transform |

**Web Audio API** — built into all modern browsers (Chrome, Firefox, Safari, Edge). No npm package needed.
