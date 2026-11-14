# SPHEREx ChronoSky — Canonical JSON Data Contract

This document specifies the exact JSON contract implemented by Member 1 (Frontend Lead) in `frontend/src/data/mockSectors.js`.
Backend engineers (Member 5) and Algorithm specialists (Member 2 & 3) should adhere to this schema when implementing `/api/sector/{sector_id}`.

## API Endpoint
`GET /api/sector/{sector_id}`

### Response Schema
```json
{
  "sector_id": "kuiper_belt_04",
  "sector_name": "Kuiper Belt Sector 04",
  "ra_center": 150.42,
  "dec_center": 2.18,
  "fov_deg": 3.5,
  "epoch_coverage": {
    "current_epoch": 2,
    "total_epochs": 4,
    "cadence_months": 6,
    "mission_start": "2025-02-01",
    "epochs_observed": ["2025-02-01", "2025-08-01"]
  },
  "anomalies": [
    {
      "anomaly_id": "KBO-2026-X9",
      "designation": "Candidate TNO / Planet 9",
      "classification": "KBO",
      "ra": 150.42,
      "dec": 2.18,
      "proper_motion": {
        "pm_ra": 0.003,
        "pm_dec": -0.001
      },
      "positions_by_epoch": [
        { "epoch": 1, "ra": 150.418, "dec": 2.181, "date": "2025-02-01" },
        { "epoch": 2, "ra": 150.420, "dec": 2.179, "date": "2025-08-01" }
      ],
      "spectrum_102": [0.45, 0.46, 0.32, 0.12, "... 102 float values spanning 0.75 to 5.0 μm ..."],
      "spectral_bands_um": [0.75, 0.792, "... 102 float wavelengths ...", 5.0],
      "spectral_features": [
        { "wavelength_um": 3.1, "species": "H2O Ice", "type": "absorption" }
      ],
      "magnitude_ab": 24.5,
      "confidence": 0.88,
      "community_votes": { "upvotes": 42, "downvotes": 2 },
      "flagged_by_user": false
    }
  ],
  "known_objects": [
    {
      "catalog": "Gaia DR3",
      "object_id": "Gaia DR3 3102345678",
      "name": "TYC 1234-567-1",
      "ra": 150.38,
      "dec": 2.22,
      "object_type": "star",
      "magnitude": 14.2
    }
  ],
  "telemetry": {
    "spectral_resolution_range": [40, 130],
    "wavelength_range_um": [0.75, 5.0],
    "total_bands": 102,
    "survey_mode": "all-sky",
    "orbit": "Sun-synchronous LEO 700km"
  }
}
```
