import demoSectorsData from './demo_sectors.json';

/**
 * SPHEREx ChronoSky - Mock Sectors & API Client
 * Adheres strictly to the Section A Canonical JSON Data Contract.
 */

// Generate 102 linearly spaced NIR wavelength centers from 0.75 μm to 5.0 μm
export const WAVELENGTH_CENTERS_102 = Array.from({ length: 102 }, (_, i) => {
  return Number((0.75 + (i * (5.0 - 0.75)) / 101).toFixed(3));
});

/**
 * Programmatically generates physically plausible 102-band spectra.
 * @param {'KBO' | 'BrownDwarf' | 'Comet' | 'Asteroid'} type 
 * @returns {number[]} 102 float flux values in microJanskys (μJy)
 */
export function generateSpectrum(type) {
  return WAVELENGTH_CENTERS_102.map((wl) => {
    let flux = 1.0;
    const noise = (Math.sin(wl * 37.0) * 0.02 + Math.cos(wl * 19.0) * 0.02);

    switch (type.toLowerCase()) {
      case 'kbo': {
        // Flat outer solar system icy reflectance with deep 3.1 μm H2O ice absorption dip
        const base = 0.45 + 0.05 * wl;
        const h2oDip = 0.35 * Math.exp(-Math.pow((wl - 3.1) / 0.22, 2));
        flux = Math.max(0.05, base - h2oDip + noise);
        break;
      }
      case 'browndwarf': {
        // Cool Y/T-dwarf SED with severe CH4 (methane) absorption at 1.66 μm and 3.3 μm, plus CO at 4.6 μm
        const blackbodyTail = 2.5 * Math.exp(-wl / 1.8);
        const ch4_1 = 0.8 * Math.exp(-Math.pow((wl - 1.66) / 0.15, 2));
        const ch4_2 = 1.1 * Math.exp(-Math.pow((wl - 3.32) / 0.28, 2));
        const coDip = 0.5 * Math.exp(-Math.pow((wl - 4.67) / 0.20, 2));
        flux = Math.max(0.04, blackbodyTail - ch4_1 - ch4_2 - coDip + noise * 0.5);
        break;
      }
      case 'comet': {
        // Solar reflection continuum + volatile cometary gas emissions: strong CO2 (4.26 μm) emission and H2O absorption (3.1 μm)
        const continuum = 0.3 + 0.15 * Math.log(wl + 0.5);
        const co2Emission = 0.95 * Math.exp(-Math.pow((wl - 4.26) / 0.12, 2));
        const h2oDip = 0.25 * Math.exp(-Math.pow((wl - 3.05) / 0.18, 2));
        flux = Math.max(0.08, continuum + co2Emission - h2oDip + noise);
        break;
      }
      case 'asteroid':
      default: {
        // Silicate (S-type) asteroid reflectance curve: rising in NIR with broad 1.0 μm & 2.0 μm pyroxene absorption bands
        const slope = 0.2 + 0.18 * wl;
        const pyroxene1 = 0.12 * Math.exp(-Math.pow((wl - 1.05) / 0.25, 2));
        const pyroxene2 = 0.10 * Math.exp(-Math.pow((wl - 2.00) / 0.35, 2));
        flux = Math.max(0.1, slope - pyroxene1 - pyroxene2 + noise);
        break;
      }
    }
    return Number(flux.toFixed(4));
  });
}

export const MOCK_SECTORS = {
  kuiper_belt_04: {
    sector_id: "kuiper_belt_04",
    sector_name: "Kuiper Belt Sector 04",
    ra_center: 150.42,
    dec_center: 2.18,
    fov_deg: 3.5,
    epoch_coverage: {
      current_epoch: 2,
      total_epochs: 4,
      cadence_months: 6,
      mission_start: "2025-02-01",
      epochs_observed: ["2025-02-01", "2025-08-01"]
    },
    anomalies: [
      {
        anomaly_id: "KBO-2026-X9",
        designation: "Candidate TNO / Planet 9",
        classification: "KBO",
        ra: 150.42,
        dec: 2.18,
        proper_motion: {
          pm_ra: 0.003,
          pm_dec: -0.001
        },
        positions_by_epoch: [
          { epoch: 1, ra: 150.418, dec: 2.181, date: "2025-02-01" },
          { epoch: 2, ra: 150.420, dec: 2.179, date: "2025-08-01" }
        ],
        spectrum_102: generateSpectrum("KBO"),
        spectral_bands_um: WAVELENGTH_CENTERS_102,
        spectral_features: [
          { wavelength_um: 3.1, species: "H2O Ice", type: "absorption" }
        ],
        magnitude_ab: 24.5,
        confidence: 0.88,
        community_votes: { upvotes: 42, downvotes: 2 },
        flagged_by_user: false
      }
    ],
    known_objects: [
      {
        catalog: "Gaia DR3",
        object_id: "Gaia DR3 3102345678",
        name: "TYC 1234-567-1",
        ra: 150.38,
        dec: 2.22,
        object_type: "star",
        magnitude: 14.2
      },
      {
        catalog: "SIMBAD",
        object_id: "2MASX J10014234+0210543",
        name: "NGC 3104 Background Galaxy",
        ra: 150.49,
        dec: 2.12,
        object_type: "galaxy",
        magnitude: 17.8
      },
      {
        catalog: "Gaia DR3",
        object_id: "Gaia DR3 3102345999",
        name: "HD 86940 (Ref Star)",
        ra: 150.32,
        dec: 2.15,
        object_type: "star",
        magnitude: 11.5
      }
    ],
    telemetry: {
      spectral_resolution_range: [40, 130],
      wavelength_range_um: [0.75, 5.0],
      total_bands: 102,
      survey_mode: "all-sky",
      orbit: "Sun-synchronous LEO 700km"
    }
  },

  bd_candidate_j14: {
    sector_id: "bd_candidate_j14",
    sector_name: "High-Proper-Motion J1402",
    ra_center: 210.65,
    dec_center: -14.82,
    fov_deg: 3.5,
    epoch_coverage: {
      current_epoch: 3,
      total_epochs: 4,
      cadence_months: 6,
      mission_start: "2025-02-01",
      epochs_observed: ["2025-02-01", "2025-08-01", "2026-02-01"]
    },
    anomalies: [
      {
        anomaly_id: "BD-J1402-2026",
        designation: "Sub-stellar Y-Dwarf Candidate",
        classification: "BrownDwarf",
        ra: 210.65,
        dec: -14.82,
        proper_motion: {
          pm_ra: 1.420,
          pm_dec: -0.890
        },
        positions_by_epoch: [
          { epoch: 1, ra: 210.635, dec: -14.810, date: "2025-02-01" },
          { epoch: 2, ra: 210.650, dec: -14.820, date: "2025-08-01" },
          { epoch: 3, ra: 210.665, dec: -14.830, date: "2026-02-01" }
        ],
        spectrum_102: generateSpectrum("BrownDwarf"),
        spectral_bands_um: WAVELENGTH_CENTERS_102,
        spectral_features: [
          { wavelength_um: 1.66, species: "CH4 Overtones", type: "absorption" },
          { wavelength_um: 3.32, species: "Fundamental CH4", type: "absorption" }
        ],
        magnitude_ab: 21.8,
        confidence: 0.94,
        community_votes: { upvotes: 89, downvotes: 5 },
        flagged_by_user: false
      }
    ],
    known_objects: [
      {
        catalog: "Gaia DR3",
        object_id: "Gaia DR3 6298102341",
        name: "HIP 68912",
        ra: 210.58,
        dec: -14.78,
        object_type: "star",
        magnitude: 9.8
      },
      {
        catalog: "SIMBAD",
        object_id: "WISEA J140238.1-144912",
        name: "Background M-Dwarf",
        ra: 210.72,
        dec: -14.85,
        object_type: "star",
        magnitude: 18.2
      }
    ],
    telemetry: {
      spectral_resolution_range: [40, 130],
      wavelength_range_um: [0.75, 5.0],
      total_bands: 102,
      survey_mode: "all-sky",
      orbit: "Sun-synchronous LEO 700km"
    }
  },

  comet_trail_alpha: {
    sector_id: "comet_trail_alpha",
    sector_name: "Main Belt Comet P/2026-S1",
    ra_center: 84.19,
    dec_center: 22.05,
    fov_deg: 3.5,
    epoch_coverage: {
      current_epoch: 2,
      total_epochs: 4,
      cadence_months: 6,
      mission_start: "2025-02-01",
      epochs_observed: ["2025-02-01", "2025-08-01"]
    },
    anomalies: [
      {
        anomaly_id: "CMT-2026-S1",
        designation: "Activated MBC Nucleus",
        classification: "Comet",
        ra: 84.19,
        dec: 22.05,
        proper_motion: {
          pm_ra: 0.125,
          pm_dec: 0.084
        },
        positions_by_epoch: [
          { epoch: 1, ra: 84.175, dec: 22.040, date: "2025-02-01" },
          { epoch: 2, ra: 84.190, dec: 22.050, date: "2025-08-01" }
        ],
        spectrum_102: generateSpectrum("Comet"),
        spectral_bands_um: WAVELENGTH_CENTERS_102,
        spectral_features: [
          { wavelength_um: 4.26, species: "CO2 Outgassing", type: "emission" },
          { wavelength_um: 3.05, species: "H2O Vapor/Ice", type: "absorption" }
        ],
        magnitude_ab: 19.4,
        confidence: 0.91,
        community_votes: { upvotes: 61, downvotes: 3 },
        flagged_by_user: false
      }
    ],
    known_objects: [
      {
        catalog: "Gaia DR3",
        object_id: "Gaia DR3 341029481",
        name: "HD 37210",
        ra: 84.12,
        dec: 22.01,
        object_type: "star",
        magnitude: 8.4
      },
      {
        catalog: "MPC",
        object_id: "MPC-4821",
        name: "Asteroid 4821 Bianchini",
        ra: 84.28,
        dec: 22.11,
        object_type: "asteroid",
        magnitude: 16.5
      }
    ],
    telemetry: {
      spectral_resolution_range: [40, 130],
      wavelength_range_um: [0.75, 5.0],
      total_bands: 102,
      survey_mode: "all-sky",
      orbit: "Sun-synchronous LEO 700km"
    }
  },

  nea_fast_mover: {
    sector_id: "nea_fast_mover",
    sector_name: "Near-Earth Asteroid 2026-KX",
    ra_center: 312.88,
    dec_center: -4.11,
    fov_deg: 3.5,
    epoch_coverage: {
      current_epoch: 4,
      total_epochs: 4,
      cadence_months: 6,
      mission_start: "2025-02-01",
      epochs_observed: ["2025-02-01", "2025-08-01", "2026-02-01", "2026-08-01"]
    },
    anomalies: [
      {
        anomaly_id: "NEA-2026-KX",
        designation: "Fast-Mover Apollo Candidate",
        classification: "Asteroid",
        ra: 312.88,
        dec: -4.11,
        proper_motion: {
          pm_ra: 4.850,
          pm_dec: -2.710
        },
        positions_by_epoch: [
          { epoch: 1, ra: 312.810, dec: -4.060, date: "2025-02-01" },
          { epoch: 2, ra: 312.855, dec: -4.090, date: "2025-08-01" },
          { epoch: 3, ra: 312.880, dec: -4.110, date: "2026-02-01" },
          { epoch: 4, ra: 312.915, dec: -4.135, date: "2026-08-01" }
        ],
        spectrum_102: generateSpectrum("Asteroid"),
        spectral_bands_um: WAVELENGTH_CENTERS_102,
        spectral_features: [
          { wavelength_um: 1.05, species: "Pyroxene/Silicate Band 1", type: "absorption" },
          { wavelength_um: 2.00, species: "Pyroxene/Silicate Band 2", type: "absorption" }
        ],
        magnitude_ab: 18.2,
        confidence: 0.96,
        community_votes: { upvotes: 114, downvotes: 4 },
        flagged_by_user: false
      }
    ],
    known_objects: [
      {
        catalog: "Gaia DR3",
        object_id: "Gaia DR3 689102481",
        name: "BD-04 5219",
        ra: 312.81,
        dec: -4.05,
        object_type: "star",
        magnitude: 10.1
      },
      {
        catalog: "SIMBAD",
        object_id: "LEDA 891024",
        name: "Faint Compact Galaxy",
        ra: 312.95,
        dec: -4.18,
        object_type: "galaxy",
        magnitude: 18.9
      }
    ],
    telemetry: {
      spectral_resolution_range: [40, 130],
      wavelength_range_um: [0.75, 5.0],
      total_bands: 102,
      survey_mode: "all-sky",
      orbit: "Sun-synchronous LEO 700km"
    }
  }
};

/**
 * Builds canonical sector structures from Member 4's demo_sectors.json
 */
function buildAstrophysicsSectors(rawBundle) {
  const sectors = {};
  if (!rawBundle) return sectors;

  for (const [key, target] of Object.entries(rawBundle)) {
    const slug = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const wlArray = target.spectrum_102_bands?.map((b) => b.wavelength_um) || WAVELENGTH_CENTERS_102;
    const fluxArray = target.spectrum_102_bands?.map((b) => b.flux_mjy) || generateSpectrum(target.classification);

    let features = [];
    if (target.classification === 'Comet') {
      features = [
        { wavelength_um: 2.01, species: 'H2O Ice (2.01μm)', type: 'absorption' },
        { wavelength_um: 3.00, species: 'H2O Ice (3.00μm)', type: 'absorption' }
      ];
    } else if (target.classification === 'Brown Dwarf') {
      features = [
        { wavelength_um: 1.65, species: 'Methane CH4 (1.65μm)', type: 'absorption' },
        { wavelength_um: 2.20, species: 'Methane CH4 (2.20μm)', type: 'absorption' }
      ];
    } else if (target.classification === 'Kuiper Belt Object') {
      features = [
        { wavelength_um: 2.27, species: 'Hydrocarbon (2.27μm)', type: 'absorption' }
      ];
    } else {
      features = [
        { wavelength_um: 1.60, species: 'Silicate (1.60μm)', type: 'absorption' }
      ];
    }

    const positions = (target.epochs || []).map((ep) => ({
      epoch: ep.epoch,
      ra: ep.ra,
      dec: ep.dec,
      date: `2025-0${ep.epoch * 3}-01`,
      mjd: ep.mjd,
      image_png_base64: ep.image_png_base64
    }));

    const sectorObj = {
      sector_id: slug,
      target_id: key,
      sector_name: `${target.name} (${key})`,
      ra_center: target.epochs?.[0]?.ra ?? 142.23,
      dec_center: target.epochs?.[0]?.dec ?? 23.41,
      fov_deg: 0.25,
      epoch_coverage: {
        current_epoch: 4,
        total_epochs: 4,
        cadence_months: 3,
        mission_start: '2025-01-15',
        epochs_observed: ['2025-01-15', '2025-04-15', '2025-07-15', '2025-10-15']
      },
      anomalies: [
        {
          anomaly_id: key,
          designation: `${target.name} [FITS Pipeline]`,
          classification: target.classification,
          ra: target.epochs?.[0]?.ra ?? 142.23,
          dec: target.epochs?.[0]?.dec ?? 23.41,
          proper_motion: {
            pm_ra: 0.002,
            pm_dec: 0.001
          },
          positions_by_epoch: positions,
          cutout_epochs: target.epochs || [],
          spectrum_102: fluxArray,
          spectral_bands_um: wlArray,
          spectral_features: features,
          magnitude_ab: target.classification === 'Asteroid' ? 17.5 : 21.0,
          confidence: 0.98,
          community_votes: { upvotes: 68, downvotes: 1 },
          flagged_by_user: false,
          astrophysics_pipeline: true,
          description: target.description
        }
      ],
      known_objects: [
        {
          catalog: 'Astropy FITS',
          object_id: `REF-${key}`,
          name: `${target.name} Reference`,
          ra: (target.epochs?.[0]?.ra ?? 142.23) + 0.012,
          dec: (target.epochs?.[0]?.dec ?? 23.41) - 0.010,
          object_type: 'star',
          magnitude: 14.5
        }
      ],
      telemetry: {
        spectral_resolution_range: [40, 130],
        wavelength_range_um: [0.75, 5.0],
        total_bands: 102,
        survey_mode: 'Astropy ZScale FITS Pipeline',
        normalization: 'ZScaleInterval + AsinhStretch'
      }
    };

    sectors[slug] = sectorObj;
    sectors[key] = sectorObj; // allow lookup by key e.g. AST-2026-01
  }

  return sectors;
}

// Merge demo_sectors.json into MOCK_SECTORS
const astroSectors = buildAstrophysicsSectors(demoSectorsData);
Object.assign(MOCK_SECTORS, astroSectors);

export { demoSectorsData };

/**
 * Robust async fetcher that queries backend API with a 1.5s timeout.
 * Seamlessly falls back to MOCK_SECTORS when backend is offline.
 * @param {string} sectorId 
 * @returns {Promise<{ data: typeof MOCK_SECTORS[string], source: 'live' | 'mock' }>}
 */
export async function fetchSectorData(sectorId) {
  const fallback = MOCK_SECTORS[sectorId] || MOCK_SECTORS.kuiper_belt_04;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`http://localhost:8000/api/sector/${sectorId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return { data: json, source: 'live' };
  } catch {
    clearTimeout(timeoutId);
    return { data: fallback, source: 'mock' };
  }
}

