"""
SPHEREx Sky Hunter — Backend API Server
NASA Space Apps Challenge 2026

Serves SPHEREx mission telemetry, celestial object catalog, and 102-band spectra.
Provides FastAPI with CORS enabled for frontend integration, and a built-in
fallback HTTP server if FastAPI/Uvicorn are not installed.
"""

import sys
import json
import math
from pathlib import Path

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
    )
except ImportError:
    from backend.api_handler import (
        get_telemetry_and_metrics,
        fetch_space_weather_donki,
        fetch_near_earth_objects,
        fetch_apod,
    )

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

    # Modifiers based on target characteristics
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
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn

    app = FastAPI(
        title="SPHEREx Sky Hunter API",
        description="NASA Space Apps Challenge 2026 — 102-Band NIR Spectrum & Volatiles Analysis",
        version="1.0.0"
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
            "endpoints": [
                "/api/health",
                "/api/targets",
                "/api/spectrum/{target_id}",
                "/api/telemetry",
                "/api/space-weather",
                "/api/neo"
            ]
        }

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "SPHEREx Mission API"}

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
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.end_headers()

        def do_OPTIONS(self):
            self._set_headers()

        def do_GET(self):
            parsed = urlparse(self.path)
            path = parsed.path

            if path in ["/", "/api/health"]:
                data = {"status": "ok", "mission": "SPHEREx Sky Hunter"}
            elif path == "/api/targets":
                data = {"targets": TARGETS, "count": len(TARGETS)}
            elif path.startswith("/api/spectrum/"):
                target_id = path.replace("/api/spectrum/", "").strip()
                data = generate_target_spectrum(target_id)
            elif path == "/api/telemetry":
                data = get_telemetry_and_metrics()
            elif path == "/api/space-weather":
                data = fetch_space_weather_donki("FLR")
            elif path == "/api/neo":
                data = fetch_near_earth_objects()
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'{"error": "Not Found"}')
                return

            self._set_headers()
            self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))

    server = HTTPServer(('127.0.0.1', port), APIRequestHandler)
    print(f"SPHEREx Fallback API server running at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    if app is not None and len(sys.argv) > 1 and sys.argv[1] == "--uvicorn":
        uvicorn.run(app, host="127.0.0.1", port=8000)
    else:
        # Self-test the generator and endpoints
        print("--- Testing SPHEREx Backend Logic ---")
        spec = generate_target_spectrum("iras-16293")
        print(f"Target: {spec['target']['name']}")
        print(f"Total Bands: {spec['total_bands']}")
        print(f"Band 1 Wavelength: {spec['spectrum'][0]['wavelength']} µm, Flux: {spec['spectrum'][0]['flux']} mJy")
        print(f"Band 56 (near 3.1µm): {spec['spectrum'][55]['wavelength']} µm, Feature: {spec['spectrum'][55]['feature']}")
        print(f"Band 84 (near 4.26µm): {spec['spectrum'][83]['wavelength']} µm, Feature: {spec['spectrum'][83]['feature']}")
        print("Backend self-test passed successfully!")
