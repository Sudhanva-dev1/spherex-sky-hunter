"""
SPHEREx Sky Hunter - FastAPI Backend Server
NASA Space Apps Challenge 2026

Serves mission telemetry, multi-epoch candidate sky tiles, image subtraction data,
and crowdsourced citizen science consensus voting with 100% resilient offline fallback.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Try importing from api_handler
try:
    from backend.api_handler import (
        fetch_apod,
        fetch_space_weather_donki,
        fetch_near_earth_objects,
        get_telemetry_and_metrics,
        load_fallback_cache,
        CACHE_DIR
    )
except ImportError:
    from api_handler import (
        fetch_apod,
        fetch_space_weather_donki,
        fetch_near_earth_objects,
        get_telemetry_and_metrics,
        load_fallback_cache,
        CACHE_DIR
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SPHEREx_Backend")

app = FastAPI(
    title="SPHEREx Sky Hunter API",
    description="Citizen Science Infrared Transient & Moving Object Pipeline for NASA Space Apps 2026",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CANDIDATES_CACHE_FILE = CACHE_DIR / "candidates.json"


def load_candidates() -> List[Dict[str, Any]]:
    """Loads candidate tiles from cache or returns fallback list."""
    if CANDIDATES_CACHE_FILE.exists():
        try:
            with open(CANDIDATES_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading candidates from {CANDIDATES_CACHE_FILE}: {e}")

    # Fallback in-memory list if file missing
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


# Pydantic Vote Schema
class VoteSubmission(BaseModel):
    candidate_id: str
    vote: str  # 'asteroid' | 'brown_dwarf' | 'artifact'
    volunteer_id: Optional[str] = "citizen_observer_alpha"
    confidence: Optional[int] = 5


@app.get("/")
def root():
    return {
        "mission": "NASA SPHEREx Sky Hunter",
        "challenge": "NASA Space Apps Challenge 2026",
        "status": "OPERATIONAL",
        "documentation": "/docs",
        "bands": "102 Near-Infrared Spectral Channels (0.75 - 5.0 µm)"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "cache_available": CANDIDATES_CACHE_FILE.exists(),
        "mission_cadence": "6-Month All-Sky Sweep"
    }


@app.get("/api/telemetry")
def get_mission_telemetry():
    """Returns real-time and cached SPHEREx spacecraft telemetry."""
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
    """Returns curated candidate survey tiles for citizen science inspection."""
    candidates = load_candidates()
    if target_type:
        candidates = [c for c in candidates if c.get("type") == target_type]
    return {
        "count": len(candidates),
        "candidates": candidates
    }


@app.get("/api/candidates/{candidate_id}")
def get_candidate(candidate_id: str):
    """Retrieves a single candidate tile with full multi-epoch coordinates and photometry."""
    candidates = load_candidates()
    for c in candidates:
        if c.get("id") == candidate_id:
            return c
    raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")


@app.post("/api/classify")
def submit_classification(submission: VoteSubmission):
    """
    Submits a citizen science classification vote.
    Calculates updated consensus score and thresholding escalation.
    """
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

    # Check escalation threshold (C >= 0.85)
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


@app.get("/api/near-earth-objects")
def get_near_earth_objects():
    """Returns NASA NeoWs asteroid feed with automatic offline fallback."""
    return fetch_near_earth_objects()


@app.get("/api/space-weather")
def get_space_weather(event_type: str = "FLR"):
    """Returns NASA DONKI space weather flare events."""
    return fetch_space_weather_donki(event_type)


@app.get("/api/apod")
def get_apod(date: Optional[str] = None):
    """Returns NASA Astronomy Picture of the Day with fallback."""
    return fetch_apod(date)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
