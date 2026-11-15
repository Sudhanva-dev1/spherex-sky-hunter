"""
SPHEREx Sky Hunter — SQLite Database Module
NASA Space Apps Challenge 2026 - Member 5: Backend API, SQLite Database & Catalog Cross-Matching

Manages persistent SQLite database (backend/database.db) for:
- Survey sectors and celestial observation regions
- Citizen science anomalies and novel candidate discoveries
- Community upvotes/downvotes consensus logging
- Gaia DR3 catalog cross-matching
- IAU ADES 2.0 (Astrometry Data Exchange Standard) report generator
"""

import os
import json
import math
import sqlite3
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.db"
DEMO_SECTORS_PATH = BASE_DIR / "demo_sectors.json"
GAIA_CATALOG_PATH = BASE_DIR.parent / "frontend" / "src" / "data" / "realSpaceData.json"

# Standard 102-band SPHEREx wavelengths (0.75 um to 5.0 um)
WAVELENGTHS_102 = [round(0.75 + (i * (5.0 - 0.75)) / 101, 3) for i in range(102)]


def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with dict-like row access."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def generate_spectrum_102(classification: str) -> List[float]:
    """Generates a 102-band normalized NIR spectral curve for astronomical object classes."""
    classification = (classification or "KBO").lower()
    spectrum = []
    for wl in WAVELENGTHS_102:
        noise = (math.sin(wl * 37.0) * 0.02 + math.cos(wl * 19.0) * 0.02)
        if "kbo" in classification or "planet" in classification:
            base = 0.45 + 0.05 * wl
            h2o_dip = 0.35 * math.exp(-((wl - 3.1) / 0.22) ** 2)
            flux = max(0.05, base - h2o_dip + noise)
        elif "brown" in classification or "dwarf" in classification:
            blackbody = 2.5 * math.exp(-wl / 1.8)
            ch4_1 = 0.8 * math.exp(-((wl - 1.66) / 0.15) ** 2)
            ch4_2 = 1.1 * math.exp(-((wl - 3.32) / 0.28) ** 2)
            co_dip = 0.5 * math.exp(-((wl - 4.67) / 0.20) ** 2)
            flux = max(0.04, blackbody - ch4_1 - ch4_2 - co_dip + noise * 0.5)
        elif "comet" in classification:
            continuum = 0.3 + 0.15 * math.log(wl + 0.5)
            co2_em = 0.95 * math.exp(-((wl - 4.26) / 0.12) ** 2)
            h2o_dip = 0.25 * math.exp(-((wl - 3.05) / 0.18) ** 2)
            flux = max(0.08, continuum + co2_em - h2o_dip + noise)
        else:  # asteroid
            slope = 0.2 + 0.18 * wl
            pyr1 = 0.12 * math.exp(-((wl - 1.05) / 0.25) ** 2)
            pyr2 = 0.10 * math.exp(-((wl - 2.00) / 0.35) ** 2)
            flux = max(0.10, slope - pyr1 - pyr2 + noise)
        spectrum.append(round(flux, 4))
    return spectrum


def cross_match_gaia_catalog(ra: float, dec: float, radius_arcsec: float = 5.0) -> Tuple[bool, str, float]:
    """
    Cross-checks given (RA, Dec) coordinates against Gaia DR3 stars from realSpaceData.json.
    Returns (is_matched, catalog_status_description, min_separation_arcsec).
    """
    if not GAIA_CATALOG_PATH.exists():
        return False, "Uncataloged Candidate (Gaia offline)", 999.0

    try:
        with open(GAIA_CATALOG_PATH, "r", encoding="utf-8") as f:
            stars = json.load(f)
    except Exception:
        return False, "Uncataloged Candidate (Catalog read error)", 999.0

    min_sep_arcsec = 999999.0
    closest_star = None

    rad = math.pi / 180.0
    for star in stars:
        # realSpaceData.json has 'x' as RA and 'y' as Dec
        star_ra = star.get("x", 0.0)
        star_dec = star.get("y", 0.0)

        d_ra = (ra - star_ra) * math.cos(0.5 * (dec + star_dec) * rad)
        d_dec = dec - star_dec
        sep_deg = math.hypot(d_ra, d_dec)
        sep_arcsec = sep_deg * 3600.0

        if sep_arcsec < min_sep_arcsec:
            min_sep_arcsec = sep_arcsec
            closest_star = star

    if min_sep_arcsec <= radius_arcsec and closest_star:
        star_id = closest_star.get("id", "DR3")
        desc = f"Gaia DR3 Match (Star ID {star_id}, sep={min_sep_arcsec:.2f}\")"
        return True, desc, round(min_sep_arcsec, 2)
    else:
        desc = f"Novel Anomaly (Sep to nearest Gaia star: {min_sep_arcsec:.1f}\")"
        return False, desc, round(min_sep_arcsec, 2)


def init_db():
    """Initializes SQLite schema and automatically seeds out-of-the-box data."""
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Sectors table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sectors (
        sector_id TEXT PRIMARY KEY,
        sector_name TEXT NOT NULL,
        ra_center REAL NOT NULL,
        dec_center REAL NOT NULL,
        fov_deg REAL DEFAULT 3.5,
        epoch_data_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Anomalies table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        sector_id TEXT NOT NULL,
        designation TEXT,
        ra REAL NOT NULL,
        dec REAL NOT NULL,
        pm_ra REAL DEFAULT 0.0,
        pm_dec REAL DEFAULT 0.0,
        classification TEXT NOT NULL,
        catalog_status TEXT DEFAULT 'Uncataloged Candidate',
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        confidence REAL DEFAULT 0.75,
        magnitude_ab REAL DEFAULT 22.0,
        spectrum_json TEXT,
        features_json TEXT,
        positions_json TEXT,
        flagged_by_user INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sector_id) REFERENCES sectors(sector_id)
    )
    """)

    # 3. Votes log table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS votes_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anomaly_id TEXT NOT NULL,
        vote_type TEXT NOT NULL,
        ip_or_user TEXT DEFAULT 'citizen_anonymous',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()

    # Check if database has been seeded
    cur.execute("SELECT COUNT(*) as count FROM sectors")
    row = cur.fetchone()
    if row["count"] == 0:
        seed_database(conn)

    conn.close()


def seed_database(conn: sqlite3.Connection):
    """Seeds default sectors and anomalies from demo_sectors.json and canonical data contract."""
    cur = conn.cursor()

    # Canonical default survey sectors
    initial_sectors = [
        {
            "sector_id": "kuiper_belt_04",
            "sector_name": "Kuiper Belt Sector 04",
            "ra_center": 150.42,
            "dec_center": 2.18,
            "fov_deg": 3.5,
            "epoch_data": {
                "current_epoch": 2,
                "total_epochs": 4,
                "cadence_months": 6,
                "mission_start": "2025-02-01",
                "epochs_observed": ["2025-02-01", "2025-08-01"]
            }
        },
        {
            "sector_id": "bd_candidate_j14",
            "sector_name": "WISE Brown Dwarf Search J14",
            "ra_center": 215.82,
            "dec_center": -14.25,
            "fov_deg": 3.5,
            "epoch_data": {
                "current_epoch": 2,
                "total_epochs": 4,
                "cadence_months": 6,
                "mission_start": "2025-02-01",
                "epochs_observed": ["2025-02-01", "2025-08-01"]
            }
        },
        {
            "sector_id": "comet_trail_alpha",
            "sector_name": "Comet 133P / Elst-Pizarro Arc",
            "ra_center": 72.15,
            "dec_center": 31.42,
            "fov_deg": 3.5,
            "epoch_data": {
                "current_epoch": 2,
                "total_epochs": 4,
                "cadence_months": 6,
                "mission_start": "2025-02-01",
                "epochs_observed": ["2025-02-01", "2025-08-01"]
            }
        },
        {
            "sector_id": "nea_fast_mover",
            "sector_name": "Atira Asteroid Twilight Swath",
            "ra_center": 334.12,
            "dec_center": 12.85,
            "fov_deg": 3.5,
            "epoch_data": {
                "current_epoch": 2,
                "total_epochs": 4,
                "cadence_months": 6,
                "mission_start": "2025-02-01",
                "epochs_observed": ["2025-02-01", "2025-08-01"]
            }
        }
    ]

    for s in initial_sectors:
        cur.execute("""
        INSERT OR IGNORE INTO sectors (sector_id, sector_name, ra_center, dec_center, fov_deg, epoch_data_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            s["sector_id"],
            s["sector_name"],
            s["ra_center"],
            s["dec_center"],
            s["fov_deg"],
            json.dumps(s["epoch_data"])
        ))

    initial_anomalies = [
        {
            "id": "KBO-2026-X9",
            "sector_id": "kuiper_belt_04",
            "designation": "Candidate TNO / Planet 9",
            "ra": 150.42,
            "dec": 2.18,
            "pm_ra": 0.003,
            "pm_dec": -0.001,
            "classification": "KBO",
            "catalog_status": "Novel Anomaly (No Gaia DR3 Match)",
            "upvotes": 42,
            "downvotes": 2,
            "confidence": 0.95,
            "magnitude_ab": 24.5,
            "features": [{"wavelength_um": 3.1, "species": "H2O Ice", "type": "absorption"}],
            "positions": [
                {"epoch": 1, "ra": 150.418, "dec": 2.181, "date": "2025-02-01"},
                {"epoch": 2, "ra": 150.420, "dec": 2.179, "date": "2025-08-01"}
            ]
        },
        {
            "id": "BD-WISE-J14",
            "sector_id": "bd_candidate_j14",
            "designation": "Substellar Y-Dwarf Candidate",
            "ra": 215.82,
            "dec": -14.25,
            "pm_ra": -1.250,
            "pm_dec": -0.840,
            "classification": "BrownDwarf",
            "catalog_status": "High Proper Motion Novelty",
            "upvotes": 68,
            "downvotes": 4,
            "confidence": 0.94,
            "magnitude_ab": 19.8,
            "features": [
                {"wavelength_um": 1.66, "species": "CH4", "type": "absorption"},
                {"wavelength_um": 3.32, "species": "CH4", "type": "absorption"}
            ],
            "positions": [
                {"epoch": 1, "ra": 215.825, "dec": -14.246, "date": "2025-02-01"},
                {"epoch": 2, "ra": 215.820, "dec": -14.250, "date": "2025-08-01"}
            ]
        },
        {
            "id": "MBC-CHRONO-77",
            "sector_id": "comet_trail_alpha",
            "designation": "Active Centaur Volatiles Outburst",
            "ra": 72.15,
            "dec": 31.42,
            "pm_ra": 0.045,
            "pm_dec": 0.012,
            "classification": "Comet",
            "catalog_status": "Uncataloged Volatile Emission",
            "upvotes": 31,
            "downvotes": 3,
            "confidence": 0.91,
            "magnitude_ab": 18.2,
            "features": [
                {"wavelength_um": 4.26, "species": "CO2 Gas", "type": "emission"},
                {"wavelength_um": 3.05, "species": "H2O Ice", "type": "absorption"}
            ],
            "positions": [
                {"epoch": 1, "ra": 72.145, "dec": 31.418, "date": "2025-02-01"},
                {"epoch": 2, "ra": 72.150, "dec": 31.420, "date": "2025-08-01"}
            ]
        },
        {
            "id": "NEA-2026-SP1",
            "sector_id": "nea_fast_mover",
            "designation": "Inner-Earth Fast Asteroid",
            "ra": 334.12,
            "dec": 12.85,
            "pm_ra": 2.450,
            "pm_dec": -1.820,
            "classification": "Asteroid",
            "catalog_status": "Near-Earth Object (Uncataloged)",
            "upvotes": 53,
            "downvotes": 5,
            "confidence": 0.91,
            "magnitude_ab": 16.4,
            "features": [
                {"wavelength_um": 1.05, "species": "Pyroxene", "type": "absorption"},
                {"wavelength_um": 2.00, "species": "Pyroxene", "type": "absorption"}
            ],
            "positions": [
                {"epoch": 1, "ra": 334.108, "dec": 12.859, "date": "2025-02-01"},
                {"epoch": 2, "ra": 334.120, "dec": 12.850, "date": "2025-08-01"}
            ]
        }
    ]

    # Also seed backend/demo_sectors.json if available
    if DEMO_SECTORS_PATH.exists():
        try:
            with open(DEMO_SECTORS_PATH, "r", encoding="utf-8") as f:
                demo_data = json.load(f)
                for target_id, d in demo_data.items():
                    epochs = d.get("epochs", [])
                    first_epoch = epochs[0] if epochs else {"ra": 0.0, "dec": 0.0}
                    last_epoch = epochs[-1] if epochs else first_epoch

                    # Add target sector
                    cur.execute("""
                    INSERT OR IGNORE INTO sectors (sector_id, sector_name, ra_center, dec_center, fov_deg, epoch_data_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        target_id,
                        d.get("name", target_id),
                        first_epoch.get("ra", 0.0),
                        first_epoch.get("dec", 0.0),
                        3.5,
                        json.dumps({
                            "current_epoch": len(epochs),
                            "total_epochs": len(epochs),
                            "cadence_months": 6,
                            "mission_start": "2025-02-01",
                            "epochs_observed": [f"Epoch {ep.get('epoch', i+1)}" for i, ep in enumerate(epochs)]
                        })
                    ))

                    # Calculate proper motion from epoch 1 to epoch N
                    time_span_yr = max(0.5, (len(epochs) - 1) * 0.5)
                    pm_ra = round((last_epoch.get("ra", 0.0) - first_epoch.get("ra", 0.0)) * 3600.0 / time_span_yr, 3)
                    pm_dec = round((last_epoch.get("dec", 0.0) - first_epoch.get("dec", 0.0)) * 3600.0 / time_span_yr, 3)

                    # Extract raw spectrum float values
                    spec_bands = d.get("spectrum_102_bands", [])
                    spec_vals = [b.get("flux_mjy", 100.0) for b in spec_bands] if spec_bands else generate_spectrum_102(d.get("classification", "Asteroid"))

                    initial_anomalies.append({
                        "id": target_id,
                        "sector_id": target_id,
                        "designation": d.get("name", target_id),
                        "ra": first_epoch.get("ra", 0.0),
                        "dec": first_epoch.get("dec", 0.0),
                        "pm_ra": pm_ra,
                        "pm_dec": pm_dec,
                        "classification": d.get("classification", "Asteroid"),
                        "catalog_status": "Demo Target Astrometry",
                        "upvotes": 25,
                        "downvotes": 1,
                        "confidence": 0.96,
                        "magnitude_ab": 19.5,
                        "spectrum": spec_vals,
                        "features": [{"wavelength_um": 3.1, "species": "Ice Mantle", "type": "absorption"}],
                        "positions": [
                            {"epoch": ep.get("epoch", i+1), "ra": ep.get("ra", 0.0), "dec": ep.get("dec", 0.0), "date": f"2025-0{i+1}-01"}
                            for i, ep in enumerate(epochs)
                        ]
                    })
        except Exception as e:
            print(f"Warning loading demo_sectors.json: {e}")

    # Insert all anomalies
    for anom in initial_anomalies:
        spectrum = anom.get("spectrum") or generate_spectrum_102(anom["classification"])
        cur.execute("""
        INSERT OR IGNORE INTO anomalies (
            id, sector_id, designation, ra, dec, pm_ra, pm_dec,
            classification, catalog_status, upvotes, downvotes, confidence,
            magnitude_ab, spectrum_json, features_json, positions_json, flagged_by_user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            anom["id"],
            anom["sector_id"],
            anom["designation"],
            anom["ra"],
            anom["dec"],
            anom["pm_ra"],
            anom["pm_dec"],
            anom["classification"],
            anom["catalog_status"],
            anom["upvotes"],
            anom["downvotes"],
            anom["confidence"],
            anom["magnitude_ab"],
            json.dumps(spectrum),
            json.dumps(anom.get("features", [])),
            json.dumps(anom.get("positions", [])),
            0
        ))

    conn.commit()


def row_to_anomaly_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Serializes a SQLite anomaly row to standard frontend JSON contract."""
    spectrum = []
    if row["spectrum_json"]:
        try:
            spectrum = json.loads(row["spectrum_json"])
        except Exception:
            spectrum = generate_spectrum_102(row["classification"])
    else:
        spectrum = generate_spectrum_102(row["classification"])

    features = []
    if row["features_json"]:
        try:
            features = json.loads(row["features_json"])
        except Exception:
            features = []

    positions = []
    if row["positions_json"]:
        try:
            positions = json.loads(row["positions_json"])
        except Exception:
            positions = []

    upvotes = row["upvotes"]
    downvotes = row["downvotes"]
    total = upvotes + downvotes
    consensus_rate = round((upvotes / max(1, total)) * 100)

    return {
        "anomaly_id": row["id"],
        "id": row["id"],
        "sector_id": row["sector_id"],
        "designation": row["designation"] or f"Candidate {row['id']}",
        "classification": row["classification"],
        "ra": row["ra"],
        "dec": row["dec"],
        "proper_motion": {
            "pm_ra": row["pm_ra"],
            "pm_dec": row["pm_dec"]
        },
        "catalog_status": row["catalog_status"],
        "confidence": row["confidence"],
        "magnitude_ab": row["magnitude_ab"],
        "community_votes": {
            "upvotes": upvotes,
            "downvotes": downvotes,
            "consensus_percentage": consensus_rate
        },
        "spectrum_102": spectrum,
        "spectral_bands_um": WAVELENGTHS_102,
        "spectral_features": features,
        "positions_by_epoch": positions,
        "flagged_by_user": bool(row["flagged_by_user"]),
        "created_at": row["created_at"]
    }


def get_all_anomalies(sector_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves anomalies, optionally filtered by sector_id."""
    conn = get_db_connection()
    cur = conn.cursor()
    if sector_id:
        cur.execute("SELECT * FROM anomalies WHERE sector_id = ? ORDER BY created_at DESC", (sector_id,))
    else:
        cur.execute("SELECT * FROM anomalies ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [row_to_anomaly_dict(r) for r in rows]


def get_anomaly_by_id(anomaly_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single anomaly by its unique ID."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM anomalies WHERE id = ?", (anomaly_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return row_to_anomaly_dict(row)
    return None


def get_sector_payload(sector_id: str) -> Optional[Dict[str, Any]]:
    """Builds a complete Section A canonical JSON contract payload for a sector."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM sectors WHERE sector_id = ?", (sector_id,))
    sector_row = cur.fetchone()
    if not sector_row:
        conn.close()
        return None

    epoch_data = {}
    if sector_row["epoch_data_json"]:
        try:
            epoch_data = json.loads(sector_row["epoch_data_json"])
        except Exception:
            pass

    cur.execute("SELECT * FROM anomalies WHERE sector_id = ? ORDER BY created_at DESC", (sector_id,))
    anomaly_rows = cur.fetchall()
    conn.close()

    anomalies = [row_to_anomaly_dict(r) for r in anomaly_rows]

    # Load Gaia DR3 known objects for this sector
    known_objects = []
    if GAIA_CATALOG_PATH.exists():
        try:
            with open(GAIA_CATALOG_PATH, "r", encoding="utf-8") as f:
                all_stars = json.load(f)
                known_objects = [
                    {
                        "catalog": "Gaia DR3",
                        "object_id": f"Gaia DR3 {s.get('id', 0)}",
                        "name": f"TYC {s.get('id', 0)}-Gaia",
                        "ra": round(s.get("x", 0.0), 4),
                        "dec": round(s.get("y", 0.0), 4),
                        "object_type": "star",
                        "magnitude": round(s.get("brightness", 15.0), 2)
                    }
                    for s in all_stars[:15]
                ]
        except Exception:
            pass

    return {
        "sector_id": sector_row["sector_id"],
        "sector_name": sector_row["sector_name"],
        "ra_center": sector_row["ra_center"],
        "dec_center": sector_row["dec_center"],
        "fov_deg": sector_row["fov_deg"],
        "epoch_coverage": epoch_data,
        "anomalies": anomalies,
        "known_objects": known_objects,
        "telemetry": {
            "spectral_resolution_range": [40, 130],
            "wavelength_range_um": [0.75, 5.0],
            "total_bands": 102,
            "survey_mode": "all-sky",
            "orbit": "Sun-synchronous LEO 700km",
            "database_source": "SQLite persistent database.db"
        }
    }


def insert_flagged_anomaly(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inserts a newly flagged (RA, Dec) candidate into SQLite.
    Cross-checks against Gaia DR3 within 5-arcseconds radius.
    """
    ra = float(data.get("ra", 0.0))
    dec = float(data.get("dec", 0.0))
    sector_id = data.get("sector_id", "kuiper_belt_04")
    classification = data.get("classification", "KBO")
    
    # 5-arcsecond Gaia DR3 cross-match
    is_known, status_desc, sep_arcsec = cross_match_gaia_catalog(ra, dec, radius_arcsec=5.0)

    confidence = 0.25 if is_known else 0.88
    custom_id = data.get("anomaly_id") or f"FLAG-{int(datetime.datetime.now().timestamp() * 1000) % 1000000:06d}"
    designation = data.get("designation") or f"Citizen Flag ({classification})"

    # Generate multi-epoch positions
    positions = [
        {"epoch": 1, "ra": round(ra - 0.004, 4), "dec": round(dec + 0.003, 4), "date": "2025-02-01"},
        {"epoch": 2, "ra": round(ra, 4), "dec": round(dec, 4), "date": "2025-08-01"}
    ]

    spectrum = generate_spectrum_102(classification)
    features = [{"wavelength_um": 3.1, "species": f"{classification} Signature", "type": "absorption"}]

    conn = get_db_connection()
    cur = conn.cursor()

    # Ensure sector exists
    cur.execute("SELECT sector_id FROM sectors WHERE sector_id = ?", (sector_id,))
    if not cur.fetchone():
        cur.execute("""
        INSERT INTO sectors (sector_id, sector_name, ra_center, dec_center, fov_deg, epoch_data_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            sector_id,
            f"Sector {sector_id}",
            ra,
            dec,
            3.5,
            json.dumps({"current_epoch": 2, "total_epochs": 4, "cadence_months": 6})
        ))

    cur.execute("""
    INSERT INTO anomalies (
        id, sector_id, designation, ra, dec, pm_ra, pm_dec,
        classification, catalog_status, upvotes, downvotes, confidence,
        magnitude_ab, spectrum_json, features_json, positions_json, flagged_by_user
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        custom_id,
        sector_id,
        designation,
        ra,
        dec,
        float(data.get("pm_ra", 0.05)),
        float(data.get("pm_dec", -0.02)),
        classification,
        status_desc,
        1,  # initial citizen upvote
        0,
        confidence,
        float(data.get("magnitude_ab", 23.0)),
        json.dumps(spectrum),
        json.dumps(features),
        json.dumps(positions),
        1
    ))

    # Log the initial flag vote
    cur.execute("""
    INSERT INTO votes_log (anomaly_id, vote_type, ip_or_user)
    VALUES (?, ?, ?)
    """, (custom_id, "up", data.get("ip_or_user", "citizen_flag_creator")))

    conn.commit()
    conn.close()

    created = get_anomaly_by_id(custom_id)
    return {
        "status": "success",
        "anomaly": created,
        "cross_match": {
            "matched_known_star": is_known,
            "separation_arcsec": sep_arcsec,
            "catalog_status": status_desc
        }
    }


def record_vote(anomaly_id: str, vote_type: str, ip_or_user: str = "citizen_web") -> Optional[Dict[str, Any]]:
    """
    Increments upvotes or downvotes in SQLite, logs to votes_log,
    and recalculates confidence percentage.
    """
    vote_type = vote_type.lower().strip()
    if vote_type not in ["up", "down"]:
        vote_type = "up"

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, upvotes, downvotes, catalog_status FROM anomalies WHERE id = ?", (anomaly_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    upvotes = row["upvotes"] + (1 if vote_type == "up" else 0)
    downvotes = row["downvotes"] + (1 if vote_type == "down" else 0)
    total_votes = upvotes + downvotes

    # Calculate updated consensus confidence
    consensus_ratio = upvotes / max(1, total_votes)
    # If it is a known static star, confidence stays suppressed
    if "Gaia DR3 Match" in (row["catalog_status"] or ""):
        confidence = round(min(0.40, consensus_ratio * 0.4), 2)
    else:
        confidence = round(min(0.99, max(0.20, consensus_ratio)), 2)

    cur.execute("""
    UPDATE anomalies 
    SET upvotes = ?, downvotes = ?, confidence = ?
    WHERE id = ?
    """, (upvotes, downvotes, confidence, anomaly_id))

    cur.execute("""
    INSERT INTO votes_log (anomaly_id, vote_type, ip_or_user)
    VALUES (?, ?, ?)
    """, (anomaly_id, vote_type, ip_or_user))

    conn.commit()
    conn.close()

    return get_anomaly_by_id(anomaly_id)


def export_iau_ades_reports(min_confidence: float = 0.5) -> Dict[str, Any]:
    """
    Exports high-confidence discoveries in official IAU ADES 2.0 JSON and XML formats
    for the Minor Planet Center (MPC).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
    SELECT * FROM anomalies 
    WHERE confidence >= ? 
    ORDER BY confidence DESC, upvotes DESC
    """, (min_confidence,))
    rows = cur.fetchall()
    conn.close()

    anomalies = [row_to_anomaly_dict(r) for r in rows]
    now_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. ADES 2.0 JSON structure
    ades_json = {
        "version": "ADES 2.0.0",
        "observatory": {
            "mpcCode": "C51",
            "name": "SPHEREx All-Sky Near-Infrared Spectral Surveyor",
            "telescope": "0.2m f/3.0 All-Sky LVF Infrared Telescope",
            "survey": "SPHEREx ChronoSky Citizen Science Pipeline"
        },
        "submitter": {
            "name": "SPHEREx Citizen Science Consortium",
            "institution": "NASA Space Apps Challenge 2026",
            "contact": "citizenscience@spherex.nasa.gov"
        },
        "submissionTime": now_utc,
        "count": len(anomalies),
        "observations": [
            {
                "permID": anom["anomaly_id"],
                "provID": anom["designation"],
                "mode": "NIR_SPEC",
                "stn": "C51",
                "obsTime": now_utc,
                "ra": anom["ra"],
                "dec": anom["dec"],
                "rmsRA": 0.05,
                "rmsDec": 0.05,
                "astCat": "Gaia3",
                "properMotion": anom["proper_motion"],
                "classification": anom["classification"],
                "apparentMagAB": anom["magnitude_ab"],
                "detectionConfidence": anom["confidence"],
                "catalogCrossMatch": anom["catalog_status"],
                "citizenConsensus": anom["community_votes"],
                "spectroscopy": {
                    "bandsSampled": 102,
                    "spectralRangeUm": [0.75, 5.0],
                    "features": anom["spectral_features"]
                }
            }
            for anom in anomalies
        ]
    }

    # 2. ADES 2.0 XML structure
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<ades version="2017">',
        '  <obsContext>',
        '    <observatory>',
        '      <mpcCode>C51</mpcCode>',
        '      <name>SPHEREx All-Sky Spectral Surveyor</name>',
        '      <telescope>0.2m All-Sky LVF Near-Infrared Surveyor</telescope>',
        '    </observatory>',
        '    <submitter>',
        '      <name>SPHEREx Citizen Science Consortium</name>',
        '      <institution>NASA Space Apps Challenge 2026</institution>',
        '    </submitter>',
        f'    <comment>SPHEREx ChronoSky ADES 2.0 Pipeline Export generated {now_utc}</comment>',
        '  </obsContext>',
        '  <obsBlock>',
        '    <obsData>'
    ]

    for anom in anomalies:
        xml_lines.extend([
            '      <optical>',
            f'        <permID>{anom["anomaly_id"]}</permID>',
            f'        <provID>{anom["designation"]}</provID>',
            '        <mode>NIR</mode>',
            '        <stn>C51</stn>',
            f'        <obsTime>{now_utc}</obsTime>',
            f'        <ra>{anom["ra"]:.5f}</ra>',
            f'        <dec>{anom["dec"]:.5f}</dec>',
            '        <rmsRA>0.05</rmsRA>',
            '        <rmsDec>0.05</rmsDec>',
            '        <astCat>Gaia3</astCat>',
            f'        <mag>{anom["magnitude_ab"]:.1f}</mag>',
            '        <band>NIR</band>',
            '        <photCat>SPHEREx</photCat>',
            f'        <class>{anom["classification"]}</class>',
            f'        <confidence>{anom["confidence"]:.2f}</confidence>',
            f'        <notes>Consensus: {anom["community_votes"]["consensus_percentage"]}% upvoted ({anom["catalog_status"]})</notes>',
            '      </optical>'
        ])

    xml_lines.extend([
        '    </obsData>',
        '  </obsBlock>',
        '</ades>'
    ])

    ades_xml = "\n".join(xml_lines)

    return {
        "count": len(anomalies),
        "submission_time": now_utc,
        "json": ades_json,
        "xml": ades_xml
    }


# Automatically initialize schema and seed on module import
init_db()

if __name__ == "__main__":
    print("--- Initializing & Testing SPHEREx SQLite Database ---")
    init_db()
    anomalies = get_all_anomalies()
    print(f"Total Anomalies in DB: {len(anomalies)}")
    for a in anomalies[:3]:
        print(f" - [{a['anomaly_id']}] {a['designation']} ({a['classification']}) @ ({a['ra']}, {a['dec']}) Votes: +{a['community_votes']['upvotes']}/-{a['community_votes']['downvotes']}")

    print("\n--- Testing Gaia DR3 Cross-Matching ---")
    matched, status, sep = cross_match_gaia_catalog(56.753, 24.108, radius_arcsec=5.0)
    print(f"Close to known star: Matched={matched}, Status={status}, Sep={sep}\"")

    novel_matched, novel_status, novel_sep = cross_match_gaia_catalog(150.42, 2.18, radius_arcsec=5.0)
    print(f"Novel candidate: Matched={novel_matched}, Status={novel_status}, Sep={novel_sep}\"")

    print("\n--- Testing IAU ADES Export ---")
    ades = export_iau_ades_reports()
    print(f"Exported ADES count: {ades['count']}")
    print("ADES XML preview (first 10 lines):")
    print("\n".join(ades["xml"].splitlines()[:10]))
    print("Database self-test complete!")

