/**
 * SPHEREx Spectral Constants and Data Utilities
 * 102 Near-Infrared Bands (0.75 - 5.0 µm)
 * Mission specifications calibrated to NASA SPHEREx Linear Variable Filter (LVF) arrays
 */

export const HIGHLIGHTED_BANDS = [
  {
    id: 'h2o',
    name: 'H₂O Ice',
    formula: 'H₂O (Ice)',
    center: 3.10,
    range: [2.96, 3.24],
    color: '#06b6d4', // cyan-500
    fillColor: '#06b6d4',
    badgeClass: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25',
    activeClass: 'ring-2 ring-cyan-400 bg-cyan-500/30 text-cyan-100',
    description: 'Fundamental O-H stretching mode in amorphous & crystalline water ice mantles.',
    significance: 'Critical planetary ingredient and primary carrier of cosmic water to protoplanetary disks.',
  },
  {
    id: 'ch4',
    name: 'CH₄ (Methane)',
    formula: 'CH₄',
    center: 3.30,
    range: [3.24, 3.38],
    color: '#a855f7', // purple-500
    fillColor: '#a855f7',
    badgeClass: 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25',
    activeClass: 'ring-2 ring-purple-400 bg-purple-500/30 text-purple-100',
    description: 'C-H stretching vibrational band in organic ices and planetary atmospheres.',
    significance: 'Prebiotic organic chemistry precursor and major potential exoplanetary biosignature.',
  },
  {
    id: 'co2',
    name: 'CO₂ Ice',
    formula: 'CO₂',
    center: 4.26,
    range: [4.16, 4.36],
    color: '#f43f5e', // rose-500
    fillColor: '#f43f5e',
    badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25',
    activeClass: 'ring-2 ring-rose-400 bg-rose-500/30 text-rose-100',
    description: 'Deep asymmetric stretching absorption band (ν₃ vibrational mode).',
    significance: 'Primary carbon volatile reservoir across interstellar clouds and circumstellar envelopes.',
  },
];

export const LVF_DETECTORS = [
  { id: 1, name: 'LVF 1', min: 0.75, max: 1.11, color: '#38bdf8' },
  { id: 2, name: 'LVF 2', min: 1.11, max: 1.64, color: '#818cf8' },
  { id: 3, name: 'LVF 3', min: 1.64, max: 2.42, color: '#a78bfa' },
  { id: 4, name: 'LVF 4', min: 2.42, max: 3.82, color: '#c084fc' },
  { id: 5, name: 'LVF 5', min: 3.82, max: 4.42, color: '#f472b6' },
  { id: 6, name: 'LVF 6', min: 4.42, max: 5.00, color: '#fb7185' },
];

export const CELESTIAL_TARGETS = [
  {
    id: 'iras-16293',
    name: 'IRAS 16293-2422',
    type: 'Protostellar Binary Core',
    constellation: 'Ophiuchus',
    distance_ly: 460,
    ra: '16h 32m 23s',
    dec: '-24° 28′ 39″',
    canvasX: 0.28,
    canvasY: 0.58,
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    ice_richness: 'Very High',
    primary_features: ['H₂O Ice (3.1µm)', 'CH₄ (3.3µm)', 'CO₂ Ice (4.26µm)'],
    description: 'Solar-type protobinary embedded in dense molecular envelope rich in prebiotic volatiles.',
    generatorType: 'protostellar',
  },
  {
    id: 'tw-hydrae',
    name: 'TW Hydrae',
    type: 'Protoplanetary Disk',
    constellation: 'Hydra',
    distance_ly: 196,
    ra: '11h 01m 52s',
    dec: '-34° 42′ 17″',
    canvasX: 0.52,
    canvasY: 0.72,
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    ice_richness: 'Moderate',
    primary_features: ['H₂O Ice (3.1µm)', 'CH₄ (3.3µm)'],
    description: 'Closest known classical protoplanetary disk with concentric icy dust rings.',
    generatorType: 'disk',
  },
  {
    id: 'hd-209458b',
    name: 'HD 209458 b',
    type: 'Transiting Hot Jupiter',
    constellation: 'Pegasus',
    distance_ly: 159,
    ra: '22h 03m 11s',
    dec: '+18° 53′ 04″',
    canvasX: 0.82,
    canvasY: 0.32,
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.4)',
    ice_richness: 'Atmospheric Gas',
    primary_features: ['CH₄ (3.3µm)', 'H₂O Vapor (3.1µm)'],
    description: 'Benchmark exoplanet atmosphere displaying signature molecular volatile absorption.',
    generatorType: 'atmosphere',
  },
  {
    id: 'w33a',
    name: 'W33A Protostar',
    type: 'High-Mass Protostellar Core',
    constellation: 'Sagittarius',
    distance_ly: 12500,
    ra: '18h 14m 39s',
    dec: '-17° 52′ 01″',
    canvasX: 0.42,
    canvasY: 0.45,
    color: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.4)',
    ice_richness: 'Extreme (Deepest Known CO₂ Ice)',
    primary_features: ['CO₂ Ice (4.26µm)', 'H₂O Ice (3.1µm)'],
    description: 'Massive young stellar object showing deepest cosmic carbon dioxide and water ice absorptions.',
    generatorType: 'w33a',
  },
  {
    id: 'ngc-1333',
    name: 'NGC 1333 IRAS 4A',
    type: 'Interstellar Ice Envelope',
    constellation: 'Perseus',
    distance_ly: 980,
    ra: '03h 29m 10s',
    dec: '+31° 13′ 32″',
    canvasX: 0.15,
    canvasY: 0.25,
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    ice_richness: 'High',
    primary_features: ['H₂O Ice (3.1µm)', 'CO₂ Ice (4.26µm)'],
    description: 'Primordial stellar nursery in Perseus preserving cold interstellar ice grains.',
    generatorType: 'ngc-1333',
  },
];

export const getDetectorForWavelength = (wl) => {
  return (
    LVF_DETECTORS.find((d) => wl >= d.min && wl <= d.max) ||
    LVF_DETECTORS[LVF_DETECTORS.length - 1]
  );
};

export const generateSpherex102Bands = (targetType = 'protostellar') => {
  const TOTAL_BANDS = 102;
  const MIN_WL = 0.75;
  const MAX_WL = 5.00;
  const bands = [];

  const multipliers = {
    protostellar: { h2o: 0.58, ch4: 0.36, co2: 0.68, continuumBase: 135 },
    disk: { h2o: 0.42, ch4: 0.28, co2: 0.50, continuumBase: 120 },
    atmosphere: { h2o: 0.35, ch4: 0.48, co2: 0.62, continuumBase: 110 },
    w33a: { h2o: 0.66, ch4: 0.38, co2: 0.78, continuumBase: 145 },
    'ngc-1333': { h2o: 0.54, ch4: 0.32, co2: 0.60, continuumBase: 125 },
  }[targetType] || { h2o: 0.55, ch4: 0.35, co2: 0.65, continuumBase: 130 };

  for (let i = 0; i < TOTAL_BANDS; i++) {
    const lambda = MIN_WL + (i / (TOTAL_BANDS - 1)) * (MAX_WL - MIN_WL);
    const wl = parseFloat(lambda.toFixed(3));

    const continuum =
      multipliers.continuumBase *
        Math.pow(1.8 / Math.max(0.75, wl), 0.7) *
        Math.exp(-Math.abs(wl - 1.8) / 4.8) +
      32;

    const h2oAbs =
      multipliers.h2o *
      Math.exp(-Math.pow(wl - 3.10, 2) / (2 * Math.pow(0.11, 2)));

    const ch4Abs =
      multipliers.ch4 *
      Math.exp(-Math.pow(wl - 3.30, 2) / (2 * Math.pow(0.048, 2)));

    const co2Abs =
      multipliers.co2 *
      Math.exp(-Math.pow(wl - 4.26, 2) / (2 * Math.pow(0.058, 2)));

    const coAbs =
      0.18 * Math.exp(-Math.pow(wl - 4.67, 2) / (2 * Math.pow(0.04, 2)));

    const transmission = Math.max(
      0.12,
      (1 - h2oAbs) * (1 - ch4Abs) * (1 - co2Abs) * (1 - coAbs)
    );

    const noise = (Math.sin(i * 12.7) * 0.5 + Math.cos(i * 3.1) * 0.5) * 1.6;

    const rawFlux = continuum * transmission + noise;
    const flux = parseFloat(Math.max(12, rawFlux).toFixed(2));
    const continuumFlux = parseFloat(continuum.toFixed(2));
    const opticalDepth = parseFloat((-Math.log(Math.max(0.08, transmission))).toFixed(3));

    let detectedFeature = null;
    for (const feat of HIGHLIGHTED_BANDS) {
      if (wl >= feat.range[0] && wl <= feat.range[1]) {
        detectedFeature = feat;
        break;
      }
    }

    const detector = getDetectorForWavelength(wl);

    bands.push({
      bandIndex: i + 1,
      wavelength: wl,
      flux,
      continuumFlux,
      opticalDepth,
      feature: detectedFeature ? detectedFeature.name : null,
      featureId: detectedFeature ? detectedFeature.id : null,
      featureColor: detectedFeature ? detectedFeature.color : null,
      detector: detector.name,
      detectorColor: detector.color,
    });
  }

  return bands;
};
