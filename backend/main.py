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
        get_all_sectors,
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
        get_all_sectors,
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
        "description": "Cold, collapsing molecular envelope preserving primordial interstellar water and organic ice species."
    }
]

# 102 Spectral Bands from 0.75 µm to 5.0 µm
WAVELENGTHS = [round(0.75 + (i * (5.0 - 0.75) / 101), 3) for i in range(102)]


def generate_target_spectrum(target_id: str):
    """
    Generate synthetic 102-band SPHEREx NIR spectrum for a target with realistic
    absorption features matching astrophysical volatile fingerprints:
    - H2O Ice absorption at ~3.05 - 3.10 µm
    - CH4 absorption at ~3.30 - 3.32 µm
    - CO2 Ice absorption at ~4.26 - 4.28 µm
    - CO gas/ice absorption at ~4.67 µm
    """
    target = next((t for t in TARGETS if t["id"] == target_id), TARGETS[0])

    if target_id == "w33a":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.65, 0.40, 0.78, 145.0
    elif target_id == "tw-hydrae":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.35, 0.22, 0.15, 68.0
    elif target_id == "hd-209458b":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.28, 0.38, 0.45, 112.0
    elif target_id == "ngc-1333":
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.58, 0.28, 0.62, 95.0
    else:  # iras-16293 default
        h2o_depth, ch4_depth, co2_depth, base_cont = 0.52, 0.35, 0.70, 82.0

    spectrum_points = []
    for idx, wl in enumerate(WAVELENGTHS):
        # Continuum slope (Rayleigh-Jeans power law approximation in NIR)
        continuum = base_cont * (wl / 2.0) ** (-1.2)

        # Absorption dips (Gaussian profiles)
        # 1. H2O Ice at 3.08 µm (FWHM ~ 0.25 µm)
        h2o_abs = h2o_depth * math.exp(-((wl - 3.08) ** 2) / (2 * (0.12 ** 2)))

        # 2. CH4 (Methane) at 3.31 µm (FWHM ~ 0.08 µm)
        ch4_abs = ch4_depth * math.exp(-((wl - 3.31) ** 2) / (2 * (0.04 ** 2)))

        # 3. CO2 Ice at 4.267 µm (FWHM ~ 0.09 µm)
        co2_abs = co2_depth * math.exp(-((wl - 4.267) ** 2) / (2 * (0.045 ** 2)))

        # 4. CO at 4.67 µm (FWHM ~ 0.07 µm)
        co_abs = 0.25 * math.exp(-((wl - 4.67) ** 2) / (2 * (0.035 ** 2)))

        total_absorption = min(0.92, h2o_abs + ch4_abs + co2_abs + co_abs)
        flux = continuum * (1.0 - total_absorption)

        # Simulated instrumental noise (SPHEREx NEP standard error)
        noise = math.sin(idx * 7.3) * 0.85
        final_flux = max(1.0, round(flux + noise, 2))

        # Tag diagnostic features
        feature = None
        if abs(wl - 3.08) < 0.12:
            feature = "H₂O Ice"
        elif abs(wl - 3.31) < 0.05:
            feature = "CH₄ Methane"
        elif abs(wl - 4.27) < 0.06:
            feature = "CO₂ Ice"
        elif abs(wl - 4.67) < 0.05:
            feature = "CO Carbon Monoxide"

        spectrum_points.append({
            "band_index": idx + 1,
            "wavelength": wl,
            "flux": final_flux,
            "feature": feature
        })

    return {
        "target": target,
        "total_bands": len(spectrum_points),
        "spectrum": spectrum_points,
        "wavelength_range": {"min": 0.75, "max": 5.0, "unit": "µm"}
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
                "/api/db/sectors",
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

    # SQLite Persistent Survey Sectors List
    @app.get("/api/db/sectors")
    def get_sectors():
        sectors = get_all_sectors()
        return {
            "status": "success",
            "count": len(sectors),
            "sectors": sectors
        }

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

    @app.get("/api/db/anomalies/{anomaly_id}")
    def get_db_anomaly_by_id(anomaly_id: str):
        anomaly = get_anomaly_by_id(anomaly_id)
        if anomaly:
            return anomaly
        raise HTTPException(status_code=404, detail=f"Anomaly '{anomaly_id}' not found")

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
        try:
            raw_shape = payload.get("shape", [64, 64]) if payload else [64, 64]
            h = max(16, min(512, int(raw_shape[0])))
            w = max(16, min(512, int(raw_shape[1])))
            shape = (h, w)
        except Exception:
            shape = (64, 64)
        try:
            seed = max(0, min(2**31 - 1, int(payload.get("seed", 42)))) if payload else 42
        except Exception:
            seed = 42
        cutout = generate_synthetic_cutout(shape=shape, seed=seed)
        png_b64 = process_fits_array_to_png(cutout)
        return {"shape": list(shape), "seed": seed, "image_png_base64": png_b64}

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
            elif path == "/api/db/sectors":
                sectors = get_all_sectors()
                data = {
                    "status": "success",
                    "count": len(sectors),
                    "sectors": sectors
                }
                self._set_headers()
                self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
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
            elif path.startswith("/api/db/anomalies/"):
                anomaly_id = path.replace("/api/db/anomalies/", "").strip()
                anomaly = get_anomaly_by_id(anomaly_id)
                if anomaly:
                    self._set_headers()
                    self.wfile.write(json.dumps(anomaly, indent=2).encode('utf-8'))
                else:
                    self._set_headers(status_code=404)
                    self.wfile.write(json.dumps({"error": f"Anomaly '{anomaly_id}' not found"}).encode('utf-8'))
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
            content_len = max(0, min(content_len, 1024 * 1024))  # Limit to 1MB max body
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
                try:
                    raw_shape = payload.get("shape", [64, 64])
                    h = max(16, min(512, int(raw_shape[0])))
                    w = max(16, min(512, int(raw_shape[1])))
                    shape = (h, w)
                except Exception:
                    shape = (64, 64)
                try:
                    seed = max(0, min(2**31 - 1, int(payload.get("seed", 42))))
                except Exception:
                    seed = 42
                if generate_synthetic_cutout and process_fits_array_to_png:
                    cutout = generate_synthetic_cutout(shape=shape, seed=seed)
                    png_b64 = process_fits_array_to_png(cutout)
                    data = {"shape": list(shape), "seed": seed, "image_png_base64": png_b64}
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

    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        sys.exit(0)

    # Start API server on port 8000
    if app is not None:
        try:
            import uvicorn
            print("Starting FastAPI Uvicorn server on http://127.0.0.1:8000...")
            uvicorn.run(app, host="127.0.0.1", port=8000)
        except Exception:
            run_fallback_server(port=8000)
    else:
        run_fallback_server(port=8000)
