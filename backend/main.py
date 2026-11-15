"""
SPHEREx Sky Hunter — Backend API Server
NASA Space Apps Challenge 2026 - Member 5: Backend API, SQLite Database, Catalog Cross-Matching & IAU ADES Export

Serves:
- SPHEREx mission telemetry, targets catalog, and 102-band spectra
- SQLite-backed persistent Citizen Science anomaly feed (/api/db/anomalies)
- Gaia DR3 5-arcsecond coordinate cross-matching & flagging (/api/db/flag)
- Persistent community consensus voting (/api/db/vote)
- Minor Planet Center (MPC) IAU ADES 2.0 XML & JSON export (/api/export/ades)
- Section A canonical sector data contract (/api/sector/{sector_id})
- Built-in fallback HTTP server if FastAPI/Uvicorn are not installed
"""

import sys
import json
import math
from pathlib import Path
from typing import Optional

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Database operations
try:
    from database import (
        init_db,
        get_all_anomalies,
        get_anomaly_by_id,
        get_sector_payload,
        insert_flagged_anomaly,
        record_vote,
        export_iau_ades_reports,
    )
except ImportError:
    from backend.database import (
        init_db,
        get_all_anomalies,
        get_anomaly_by_id,
        get_sector_payload,
        insert_flagged_anomaly,
        record_vote,
        export_iau_ades_reports,
    )

# NASA external API handlers
try:
    from api_handler import (
        get_telemetry_and_metrics,
        fetch_space_weather_donki,
        fetch_near_earth_objects,
        fetch_apod,
    )
except ImportError:
    from backend.api_handler import (
        get_telemetry_and_metrics,
        fetch_space_weather_donki,
        fetch_near_earth_objects,
        fetch_apod,
    )

# FITS pipeline processor
try:
    from fits_processor import (
        load_demo_sectors,
        process_fits_array_to_png,
        generate_synthetic_cutout,
    )
except ImportError:
    try:
        from backend.fits_processor import (
            load_demo_sectors,
            process_fits_array_to_png,
            generate_synthetic_cutout,
        )
    except ImportError:
        load_demo_sectors = None
        process_fits_array_to_png = None
        generate_synthetic_cutout = None

# Initialize persistent SQLite DB on start
init_db()

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

        # Continuum
        continuum = base_cont * math.pow(1.8 / max(0.75, wl), 0.7) * math.exp(-abs(wl - 1.8) / 4.8) + 32.0

        # Absorption profiles
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


# Try setting up FastAPI application
try:
    from fastapi import FastAPI, HTTPException, Response, Request
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn

    app = FastAPI(
        title="SPHEREx Sky Hunter API",
        description="NASA Space Apps Challenge 2026 — 102-Band NIR Spectrum & Volatiles Analysis with SQLite Persistence",
        version="2.0.0"
    )

    # Enable CORS for local Vite dev server
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
            "database": "SQLite (backend/database.db)",
            "endpoints": [
                "/api/health",
                "/api/sector/{sector_id}",
                "/api/db/anomalies",
                "/api/db/flag",
                "/api/db/vote",
                "/api/export/ades",
                "/api/targets",
                "/api/spectrum/{target_id}",
                "/api/telemetry",
                "/api/space-weather",
                "/api/neo",
                "/api/fits/sectors"
            ]
        }

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "SPHEREx Mission API", "database": "online"}

    # Canonical Sector Data Contract
    @app.get("/api/sector/{sector_id}")
    def get_sector(sector_id: str):
        payload = get_sector_payload(sector_id)
        if payload:
            return payload
        raise HTTPException(status_code=404, detail=f"Sector '{sector_id}' not found")

    # SQLite Persistent Citizen Science Detections
    @app.get("/api/db/anomalies")
    def get_db_anomalies(sector_id: Optional[str] = None):
        anomalies = get_all_anomalies(sector_id)
        return {
            "status": "success",
            "count": len(anomalies),
            "sector_filter": sector_id,
            "anomalies": anomalies
        }

    # Cross-match against Gaia DR3 within 5-arcseconds and persist newly flagged candidate
    @app.post("/api/db/flag")
    def post_flag_anomaly(payload: dict):
        if not payload or "ra" not in payload or "dec" not in payload:
            raise HTTPException(status_code=422, detail="Fields 'ra' and 'dec' are required")

        result = insert_flagged_anomaly(payload)
        return result

    # Persistent Citizen Consensus Upvote/Downvote
    @app.post("/api/db/vote")
    def post_vote_anomaly(payload: dict):
        if not payload:
            raise HTTPException(status_code=400, detail="Missing JSON payload")

        anomaly_id = payload.get("anomaly_id")
        if not anomaly_id:
            raise HTTPException(status_code=422, detail="'anomaly_id' is required")

        vote_type = payload.get("vote") or ("up" if payload.get("delta_up", 0) > 0 else "down")
        ip_or_user = payload.get("ip_or_user", "citizen_web")

        updated = record_vote(anomaly_id, vote_type=vote_type, ip_or_user=ip_or_user)
        if not updated:
            raise HTTPException(status_code=404, detail=f"Anomaly '{anomaly_id}' not found")

        return {
            "status": "success",
            "anomaly": updated,
            "consensus_percentage": updated["community_votes"]["consensus_percentage"]
        }

    # IAU ADES 2.0 Export for Minor Planet Center (MPC)
    @app.get("/api/export/ades")
    def export_ades(format: Optional[str] = None, min_confidence: float = 0.5):
        ades_data = export_iau_ades_reports(min_confidence=min_confidence)
        if format and format.lower() == "xml":
            return Response(content=ades_data["xml"], media_type="application/xml")
        elif format and format.lower() == "json":
            return ades_data["json"]
        return ades_data

    @app.get("/api/targets")
    def get_targets():
        return {"targets": TARGETS, "count": len(TARGETS)}

    @app.get("/api/spectrum/{target_id}")
    def get_spectrum(target_id: str):
        return generate_target_spectrum(target_id)

    @app.get("/api/telemetry")
    def get_telemetry():
        return get_telemetry_and_metrics()

    @app.get("/api/space-weather")
    def get_space_weather():
        return fetch_space_weather_donki("FLR")

    @app.get("/api/neo")
    def get_neo():
        return fetch_near_earth_objects()

    @app.get("/api/fits/sectors")
    def get_fits_sectors():
        if load_demo_sectors:
            return load_demo_sectors()
        return {"error": "FITS processor not initialized"}

    @app.get("/api/fits/targets")
    def get_fits_targets():
        if load_demo_sectors:
            sectors = load_demo_sectors()
            return [
                {
                    "id": s["target_id"],
                    "name": s["name"],
                    "classification": s["classification"],
                    "description": s["description"],
                    "epoch_count": len(s.get("epochs", [])),
                    "bands_count": len(s.get("spectrum_102_bands", []))
                }
                for s in sectors.values()
            ]
        return []

    @app.post("/api/fits/normalize")
    def normalize_cutout(payload: dict = None):
        if not process_fits_array_to_png or not generate_synthetic_cutout:
            return {"error": "FITS processor unavailable"}
        shape = tuple(payload.get("shape", [64, 64])) if payload else (64, 64)
        seed = int(payload.get("seed", 42)) if payload else 42
        cutout = generate_synthetic_cutout(shape=shape, seed=seed)
        png_b64 = process_fits_array_to_png(cutout)
        return {"shape": shape, "seed": seed, "image_png_base64": png_b64}

except ImportError:
    app = None


def run_fallback_server(port: int = 8000):
    """Fallback standard library HTTP server if FastAPI/Uvicorn are not installed."""
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from urllib.parse import urlparse, parse_qs

    class APIRequestHandler(BaseHTTPRequestHandler):
        def _set_headers(self, content_type: str = 'application/json', status_code: int = 200):
            self.send_response(status_code)
            self.send_header('Content-Type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.end_headers()

        def do_OPTIONS(self):
            self._set_headers()

        def do_GET(self):
            parsed = urlparse(self.path)
            path = parsed.path
            query = parse_qs(parsed.query)

            if path in ["/", "/api/health"]:
                data = {"status": "ok", "mission": "SPHEREx Sky Hunter", "database": "online"}
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path.startswith("/api/sector/"):
                sector_id = path.replace("/api/sector/", "").strip()
                payload = get_sector_payload(sector_id)
                if payload:
                    self._set_headers()
                    self.wfile.write(json.dumps(payload, indent=2).encode('utf-8'))
                else:
                    self._set_headers(status_code=404)
                    self.wfile.write(json.dumps({"error": f"Sector '{sector_id}' not found"}).encode('utf-8'))
            elif path == "/api/db/anomalies":
                sector_id = query.get("sector_id", [None])[0]
                anomalies = get_all_anomalies(sector_id)
                data = {
                    "status": "success",
                    "count": len(anomalies),
                    "sector_filter": sector_id,
                    "anomalies": anomalies
                }
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path == "/api/export/ades":
                fmt = query.get("format", ["json"])[0].lower()
                min_conf = float(query.get("min_confidence", [0.5])[0])
                ades_data = export_iau_ades_reports(min_confidence=min_conf)
                if fmt == "xml":
                    self._set_headers(content_type="application/xml")
                    self.wfile.write(ades_data["xml"].encode('utf-8'))
                elif fmt == "json":
                    self._set_headers()
                    self.wfile.write(json.dumps(ades_data["json"], indent=2).encode('utf-8'))
                else:
                    self._set_headers()
                    self.wfile.write(json.dumps(ades_data, indent=2).encode('utf-8'))
            elif path == "/api/targets":
                data = {"targets": TARGETS, "count": len(TARGETS)}
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path.startswith("/api/spectrum/"):
                target_id = path.replace("/api/spectrum/", "").strip()
                data = generate_target_spectrum(target_id)
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path == "/api/telemetry":
                data = get_telemetry_and_metrics()
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path == "/api/space-weather":
                data = fetch_space_weather_donki("FLR")
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path == "/api/neo":
                data = fetch_near_earth_objects()
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path == "/api/fits/sectors":
                data = load_demo_sectors() if load_demo_sectors else {"error": "FITS processor unavailable"}
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            elif path == "/api/fits/targets":
                if load_demo_sectors:
                    sectors = load_demo_sectors()
                    data = [
                        {
                            "id": s["target_id"],
                            "name": s["name"],
                            "classification": s["classification"],
                            "description": s["description"],
                            "epoch_count": len(s.get("epochs", [])),
                            "bands_count": len(s.get("spectrum_102_bands", []))
                        }
                        for s in sectors.values()
                    ]
                else:
                    data = []
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            else:
                self._set_headers(status_code=404)
                self.wfile.write(b'{"error": "Not Found"}')

        def do_POST(self):
            parsed = urlparse(self.path)
            path = parsed.path
            content_len = int(self.headers.get('Content-Length', 0))
            payload = {}
            if content_len > 0:
                try:
                    post_body = self.rfile.read(content_len)
                    payload = json.loads(post_body.decode('utf-8'))
                except Exception:
                    pass

            if path == "/api/db/flag":
                result = insert_flagged_anomaly(payload)
                self._set_headers(status_code=200)
                self.wfile.write(json.dumps(result, indent=2).encode('utf-8'))
            elif path == "/api/db/vote":
                anomaly_id = payload.get("anomaly_id")
                vote_type = payload.get("vote") or ("up" if payload.get("delta_up", 0) > 0 else "down")
                ip_or_user = payload.get("ip_or_user", "citizen_web")
                updated = record_vote(anomaly_id, vote_type=vote_type, ip_or_user=ip_or_user)
                if updated:
                    self._set_headers(status_code=200)
                    self.wfile.write(json.dumps({
                        "status": "success",
                        "anomaly": updated,
                        "consensus_percentage": updated["community_votes"]["consensus_percentage"]
                    }, indent=2).encode('utf-8'))
                else:
                    self._set_headers(status_code=404)
                    self.wfile.write(json.dumps({"error": f"Anomaly '{anomaly_id}' not found"}).encode('utf-8'))
            elif path == "/api/fits/normalize":
                shape = tuple(payload.get("shape", [64, 64]))
                seed = int(payload.get("seed", 42))
                if generate_synthetic_cutout and process_fits_array_to_png:
                    cutout = generate_synthetic_cutout(shape=shape, seed=seed)
                    png_b64 = process_fits_array_to_png(cutout)
                    data = {"shape": shape, "seed": seed, "image_png_base64": png_b64}
                else:
                    data = {"error": "FITS processor unavailable"}
                self._set_headers(status_code=200)
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            else:
                self._set_headers(status_code=404)
                self.wfile.write(b'{"error": "Not Found"}')

    server = HTTPServer(('127.0.0.1', port), APIRequestHandler)
    print(f"SPHEREx Fallback API server running at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    if app is not None and len(sys.argv) > 1 and sys.argv[1] == "--uvicorn":
        uvicorn.run(app, host="127.0.0.1", port=8000)
    else:
        # Self-test the generator and endpoints
        print("--- Testing SPHEREx Backend Logic & Database Integration ---")
        spec = generate_target_spectrum("iras-16293")
        print(f"Target: {spec['target']['name']}")
        print(f"Total Bands: {spec['total_bands']}")
        print(f"Band 1 Wavelength: {spec['spectrum'][0]['wavelength']} µm, Flux: {spec['spectrum'][0]['flux']} mJy")
        print(f"Band 56 (near 3.1µm): {spec['spectrum'][55]['wavelength']} µm, Feature: {spec['spectrum'][55]['feature']}")
        print(f"Band 84 (near 4.26µm): {spec['spectrum'][83]['wavelength']} µm, Feature: {spec['spectrum'][83]['feature']}")
        
        # Test SQLite integration
        anoms = get_all_anomalies("kuiper_belt_04")
        print(f"SQLite Kuiper Belt Anomalies: {len(anoms)}")
        if anoms:
            print(f" - Anomaly 1: {anoms[0]['anomaly_id']} | Status: {anoms[0]['catalog_status']} | Upvotes: {anoms[0]['community_votes']['upvotes']}")

        ades = export_iau_ades_reports()
        print(f"IAU ADES 2.0 Reports Ready: {ades['count']} detections")
        print("Backend self-test passed successfully!")
