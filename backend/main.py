"""
SPHEREx Sky Hunter — Unified Backend API Server
NASA Space Apps Challenge 2026

Serves:
1. SPHEREx 102-band near-infrared spectra and celestial ice mantles catalog.
2. Candidate survey tiles, difference imaging metadata, and citizen science consensus voting.
3. Resilient NASA Open API feeds (APOD, DONKI space weather, NeoWs Near-Earth Objects).
4. Dual runtime: FastAPI (high-performance) + built-in standard library HTTP server fallback.
"""

import sys
import os
import json
import math
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    from api_handler import (
        get_telemetry_and_metrics,
        fetch_space_weather_donki,
        fetch_near_earth_objects,
        fetch_apod,
        CACHE_DIR,
        load_fallback_cache
    )
except ImportError:
    from backend.api_handler import (
        get_telemetry_and_metrics,
        fetch_space_weather_donki,
        fetch_near_earth_objects,
        fetch_apod,
        CACHE_DIR,
        load_fallback_cache
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SPHEREx_Backend")

# SPHEREx Observation Targets Catalog
TARGETS = [
    {
        "id": "iras-16293",
        "name": "IRAS 16293-2422",
        "type": "Protostellar Binary Core",
        "constellation": "Ophiuchus",
        "distance_ly": 460,
        "ra": 247.33,
        "dec": -24.48,
        "ice_richness": "Very High",
        "primary_features": ["H₂O Ice (3.1µm)", "CH₄ (3.3µm)", "CO₂ Ice (4.26µm)", "CO (4.67µm)"],
        "description": "Solar-type protobinary embedded in dense molecular envelope rich in prebiotic volatiles and interstellar ice mantles."
    },
    {
        "id": "tw-hydrae",
        "name": "TW Hydrae",
        "type": "Protoplanetary Disk",
        "constellation": "Hydra",
        "distance_ly": 196,
        "ra": 165.46,
        "dec": -34.70,
        "ice_richness": "Moderate",
        "primary_features": ["H₂O Ice (3.1µm)", "CH₄ (3.3µm)", "CO (4.67µm)"],
        "description": "Closest known classical protoplanetary disk to Earth, actively forming planetesimals within icy dust rings."
    },
    {
        "id": "hd-209458b",
        "name": "HD 209458 b (Osiris)",
        "type": "Transiting Exoplanet Atmosphere",
        "constellation": "Pegasus",
        "distance_ly": 159,
        "ra": 330.79,
        "dec": 18.88,
        "ice_richness": "Gaseous Volatiles",
        "primary_features": ["CH₄ (3.3µm)", "H₂O Vapor (3.0-3.2µm)", "CO₂ (4.26µm)"],
        "description": "Atmospheric transmission benchmark showing strong molecular gas absorption in infrared transmission spectra."
    },
    {
        "id": "w33a",
        "name": "W33A",
        "type": "High-Mass Protostellar Core",
        "constellation": "Sagittarius",
        "distance_ly": 12500,
        "ra": 273.65,
        "dec": -17.87,
        "ice_richness": "Extreme (Deepest Known Ices)",
        "primary_features": ["CO₂ Ice (4.26µm)", "H₂O Ice (3.1µm)", "CH₄ (3.3µm)"],
        "description": "Benchmark massive protostar with record-depth carbon dioxide and water ice column densities."
    },
    {
        "id": "ngc-1333",
        "name": "NGC 1333 IRAS 4A",
        "type": "Interstellar Ice Cloud & Class 0 Protostar",
        "constellation": "Perseus",
        "distance_ly": 980,
        "ra": 52.28,
        "dec": 31.22,
        "ice_richness": "High",
        "primary_features": ["H₂O Ice (3.1µm)", "CO₂ Ice (4.26µm)"],
        "description": "Cold, collapsing molecular envelope preserving primordial interstellar water and organic ices."
    }
]


def generate_target_spectrum(target_id: str):
    """
    Computes calibrated 102 SPHEREx near-infrared bands (0.75 - 5.0 µm)
    matching the physics model of the target.
    """
    target = next((t for t in TARGETS if t["id"] == target_id), TARGETS[0])

    if target_id == "w33a":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.65, 0.40, 0.78, 145.0
    elif target_id == "tw-hydrae":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.42, 0.28, 0.50, 120.0
    elif target_id == "hd-209458b":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.35, 0.50, 0.62, 110.0
    elif target_id == "ngc-1333":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.55, 0.32, 0.60, 125.0
    else:  # iras-16293
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.58, 0.36, 0.68, 135.0

    total_bands = 102
    bands = []
    for i in range(total_bands):
        wl = round(0.75 + (i / (total_bands - 1)) * (5.0 - 0.75), 3)

        continuum = base_cont * math.pow(1.8 / max(0.75, wl), 0.7) * math.exp(-abs(wl - 1.8) / 4.8) + 32.0

        h2o = h2o_depth * math.exp(-math.pow(wl - 3.10, 2) / (2 * math.pow(0.11, 2)))
        ch4 = ch4_depth * math.exp(-math.pow(wl - 3.30, 2) / (2 * math.pow(0.048, 2)))
        co2 = co2_depth * math.exp(-math.pow(wl - 4.26, 2) / (2 * math.pow(0.058, 2)))
        co = 0.18 * math.exp(-math.pow(wl - 4.67, 2) / (2 * math.pow(0.04, 2)))

        trans = max(0.12, (1 - h2o) * (1 - ch4) * (1 - co2) * (1 - co))
        noise = (math.sin(i * 12.7) * 0.5 + math.cos(i * 3.1) * 0.5) * 1.6
        flux = round(max(12.0, continuum * trans + noise), 2)
        opt_depth = round(-math.log(max(0.08, trans)), 3)

        feature = None
        if 2.96 <= wl <= 3.24:
            feature = "H₂O Ice (3.1µm)"
        elif 3.24 <= wl <= 3.38:
            feature = "CH₄ (3.3µm)"
        elif 4.16 <= wl <= 4.36:
            feature = "CO₂ Ice (4.26µm)"

        bands.append({
            "bandIndex": i + 1,
            "wavelength": wl,
            "flux": flux,
            "continuumFlux": round(continuum, 2),
            "opticalDepth": opt_depth,
            "feature": feature
        })

    return {
        "target": target,
        "total_bands": total_bands,
        "wavelength_range_microns": [0.75, 5.0],
        "spectrum": bands
    }


CANDIDATES_CACHE_FILE = CACHE_DIR / "candidates.json"


def load_candidates() -> List[Dict[str, Any]]:
    """Loads candidate tiles from cache or returns fallback list."""
    if CANDIDATES_CACHE_FILE.exists():
        try:
            with open(CANDIDATES_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading candidates from {CANDIDATES_CACHE_FILE}: {e}")

    return [
        {
            "id": "SPX-AST-2026-SP4",
            "name": "Asteroid 2026-SP4 (Apollo NEO Candidate)",
            "type": "asteroid",
            "status": "under_review",
            "ra": "09h 14m 02.4s",
            "dec": "+21° 44' 30.1\"",
            "apparent_magnitude": 16.8,
            "apparent_motion": "1.82 arcsec/min",
            "snr": "26.8 σ",
            "epoch1": { "x": 160, "y": 270, "timestamp": "2026-11-14T02:15:00Z" },
            "epoch2": { "x": 420, "y": 110, "timestamp": "2026-11-14T03:00:00Z" },
            "consensus": { "asteroid_votes": 28, "brown_dwarf_votes": 1, "artifact_votes": 0, "total_votes": 29 }
        }
    ]


def save_candidates(candidates: List[Dict[str, Any]]) -> None:
    """Persists updated consensus votes to cache."""
    try:
        with open(CANDIDATES_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(candidates, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to persist candidate votes: {e}")


# FastAPI Implementation
try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn

    class VoteSubmission(BaseModel):
        candidate_id: str
        vote: str  # 'asteroid' | 'brown_dwarf' | 'artifact'
        volunteer_id: Optional[str] = "citizen_observer_alpha"
        confidence: Optional[int] = 5

    app = FastAPI(
        title="SPHEREx Sky Hunter API",
        description="NASA Space Apps Challenge 2026 — 102-Band NIR Spectrum, Transients & Moving Object Consensus",
        version="1.0.0"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {
            "mission": "SPHEREx Sky Hunter",
            "challenge": "NASA Space Apps Challenge 2026",
            "status": "online",
            "bands": "102 Near-Infrared Spectral Channels (0.75 - 5.0 µm)",
            "endpoints": [
                "/api/health",
                "/api/targets",
                "/api/spectrum/{target_id}",
                "/api/telemetry",
                "/api/candidates",
                "/api/candidates/{candidate_id}",
                "/api/classify",
                "/api/space-weather",
                "/api/neo",
                "/api/near-earth-objects",
                "/api/apod"
            ]
        }

    @app.get("/api/health")
    def health():
        return {
            "status": "ok",
            "service": "SPHEREx Mission API",
            "cache_available": CANDIDATES_CACHE_FILE.exists(),
            "mission_cadence": "6-Month All-Sky Sweep"
        }

    @app.get("/api/targets")
    def get_targets():
        return {"targets": TARGETS, "count": len(TARGETS)}

    @app.get("/api/spectrum/{target_id}")
    def get_spectrum(target_id: str):
        return generate_target_spectrum(target_id)

    @app.get("/api/telemetry")
    def get_telemetry():
        base_data = get_telemetry_and_metrics()
        return {
            "orbit_pass": "All-Sky Pass 2",
            "coverage_percentage": 98.4,
            "spectral_channels": 102,
            "active_volunteers": 1842,
            "candidates_classified": 14291,
            "confirmed_asteroids": 3482,
            "confirmed_brown_dwarfs": 419,
            "spacecraft": base_data.get("telemetry", {}),
            "status": "NOMINAL"
        }

    @app.get("/api/candidates")
    def list_candidates(target_type: Optional[str] = Query(None, description="Filter by asteroid, brown_dwarf, or artifact")):
        candidates = load_candidates()
        if target_type:
            candidates = [c for c in candidates if c.get("type") == target_type]
        return {
            "count": len(candidates),
            "candidates": candidates
        }

    @app.get("/api/candidates/{candidate_id}")
    def get_candidate(candidate_id: str):
        candidates = load_candidates()
        for c in candidates:
            if c.get("id") == candidate_id:
                return c
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    @app.post("/api/classify")
    def submit_classification(submission: VoteSubmission):
        valid_votes = ["asteroid", "brown_dwarf", "artifact"]
        vote = submission.vote.lower()
        if vote not in valid_votes:
            raise HTTPException(status_code=400, detail=f"Invalid vote. Must be one of: {valid_votes}")

        candidates = load_candidates()
        matched = None
        for c in candidates:
            if c.get("id") == submission.candidate_id:
                matched = c
                break

        if not matched:
            raise HTTPException(status_code=404, detail=f"Candidate {submission.candidate_id} not found")

        consensus = matched.setdefault("consensus", {
            "asteroid_votes": 0,
            "brown_dwarf_votes": 0,
            "artifact_votes": 0,
            "total_votes": 0,
            "consensus_score": 0.0,
            "status": "PENDING"
        })

        if vote == "asteroid":
            consensus["asteroid_votes"] = consensus.get("asteroid_votes", 0) + 1
        elif vote == "brown_dwarf":
            consensus["brown_dwarf_votes"] = consensus.get("brown_dwarf_votes", 0) + 1
        elif vote == "artifact":
            consensus["artifact_votes"] = consensus.get("artifact_votes", 0) + 1

        consensus["total_votes"] = (
            consensus["asteroid_votes"] +
            consensus["brown_dwarf_votes"] +
            consensus["artifact_votes"]
        )

        max_votes = max(
            consensus["asteroid_votes"],
            consensus["brown_dwarf_votes"],
            consensus["artifact_votes"]
        )
        score = round(max_votes / consensus["total_votes"], 3) if consensus["total_votes"] > 0 else 0.0
        consensus["consensus_score"] = score

        if consensus["total_votes"] >= 3 and score >= 0.85:
            if max_votes == consensus["asteroid_votes"]:
                consensus["status"] = "ESCALATED_TO_MINOR_PLANET_CENTER"
            elif max_votes == consensus["brown_dwarf_votes"]:
                consensus["status"] = "ESCALATED_TO_IRSA_SUBSTELLAR_ARCHIVE"
            else:
                consensus["status"] = "CONFIRMED_ARTIFACT"

        save_candidates(candidates)

        return {
            "success": True,
            "candidate_id": submission.candidate_id,
            "vote_registered": vote,
            "volunteer_points_awarded": 25,
            "updated_consensus": consensus,
            "feedback": (
                "Congratulations! Your vote aligned with high-confidence consensus."
                if (vote == matched.get("type"))
                else "Vote recorded for consensus review."
            )
        }

    @app.get("/api/space-weather")
    def get_space_weather(event_type: str = "FLR"):
        return fetch_space_weather_donki(event_type)

    @app.get("/api/neo")
    @app.get("/api/near-earth-objects")
    def get_neo():
        return fetch_near_earth_objects()

    @app.get("/api/apod")
    def get_apod(date: Optional[str] = None):
        return fetch_apod(date)

except ImportError:
    app = None


def run_fallback_server(port: int = 8000):
    """Fallback standard library HTTP server if FastAPI/Uvicorn are not installed."""
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from urllib.parse import urlparse

    class APIRequestHandler(BaseHTTPRequestHandler):
        def _set_headers(self):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.end_headers()

        def do_OPTIONS(self):
            self._set_headers()

        def do_GET(self):
            parsed = urlparse(self.path)
            path = parsed.path

            if path in ["/", "/api", "/api/health"]:
                self._set_headers()
                self.wfile.write(json.dumps({"status": "ok", "service": "SPHEREx Fallback Server"}).encode())
            elif path == "/api/targets":
                self._set_headers()
                self.wfile.write(json.dumps({"targets": TARGETS, "count": len(TARGETS)}).encode())
            elif path.startswith("/api/spectrum/"):
                target_id = path.split("/api/spectrum/")[-1]
                self._set_headers()
                self.wfile.write(json.dumps(generate_target_spectrum(target_id)).encode())
            elif path == "/api/candidates":
                self._set_headers()
                self.wfile.write(json.dumps({"count": len(load_candidates()), "candidates": load_candidates()}).encode())
            elif path == "/api/telemetry":
                self._set_headers()
                self.wfile.write(json.dumps(get_telemetry_and_metrics()).encode())
            else:
                self.send_response(404)
                self.end_headers()

    server = HTTPServer(('0.0.0.0', port), APIRequestHandler)
    print(f"Fallback HTTP server running on port {port}...")
    server.serve_forever()


if __name__ == "__main__":
    if app:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    else:
        run_fallback_server(8000)
