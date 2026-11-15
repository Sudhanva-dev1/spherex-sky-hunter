"""
NASA Data Pipeline & API Handler Module
NASA Space Apps Challenge 2026

Provides resilient fetching from NASA Open Data APIs (APOD, DONKI space weather,
Earthdata, and Near-Earth Objects) with automatic offline fallback to local cache.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
try:
    import requests
except ImportError:
    requests = None
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("NASA_API_Handler")

# Paths configuration
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
CACHE_DIR = DATA_DIR / "cache"

# Ensure directories exist
for folder in [RAW_DATA_DIR, PROCESSED_DATA_DIR, CACHE_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

# Default to DEMO_KEY if not provided
NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
NASA_API_BASE_URL = "https://api.nasa.gov"
DONKI_BASE_URL = f"{NASA_API_BASE_URL}/DONKI"
FALLBACK_CACHE_PATH = CACHE_DIR / "sample_data.json"


def load_fallback_cache(cache_filename: str = "sample_data.json") -> Dict[str, Any]:
    """Loads fallback data from data/cache/ directory."""
    cache_file = CACHE_DIR / cache_filename
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.warning(f"Using offline cached dataset from: {cache_file.name}")
                return data
        except Exception as e:
            logger.error(f"Error reading fallback cache {cache_file}: {e}")
    
    # Emergency fallback dictionary if cache file missing or corrupted
    logger.error("No valid fallback cache found. Returning emergency mock payload.")
    return {
        "status": "emergency_mock",
        "message": "Fallback cache unreachable. Check data/cache/ directory.",
        "environmental_metrics": [],
        "telemetry": {}
    }


def save_to_cache(filename: str, data: Any) -> None:
    """Helper to persist fresh responses to data/cache/ or data/raw/."""
    target_path = CACHE_DIR / filename
    try:
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Successfully cached response to: {target_path}")
    except Exception as e:
        logger.error(f"Failed to cache data to {target_path}: {e}")


def fetch_apod(date: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetches Astronomy Picture of the Day (APOD) from NASA API.
    Falls back to cached sample data on network or HTTP error.
    """
    url = f"{NASA_API_BASE_URL}/planetary/apod"
    params = {"api_key": NASA_API_KEY}
    if date:
        params["date"] = date

    try:
        response = requests.get(url, params=params, timeout=6)
        response.raise_for_status()
        data = response.json()
        save_to_cache("apod_latest.json", data)
        return data
    except Exception as e:
        logger.warning(f"Failed to fetch APOD from NASA API ({e}). Falling back to cache.")
        cached_apod = CACHE_DIR / "apod_latest.json"
        if cached_apod.exists():
            return load_fallback_cache("apod_latest.json")
        return load_fallback_cache("sample_data.json")


def fetch_space_weather_donki(event_type: str = "FLR", days_prior: int = 7) -> Dict[str, Any]:
    """
    Fetches Space Weather events from NASA DONKI (e.g. Solar Flares, CME, Geomagnetic Storms).
    event_type options: 'FLR' (Solar Flares), 'CME' (Coronal Mass Ejection), 'GST' (Geomagnetic Storm)
    """
    url = f"{DONKI_BASE_URL}/{event_type}"
    params = {
        "api_key": NASA_API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=7)
        response.raise_for_status()
        data = response.json()
        cache_name = f"donki_{event_type.lower()}_latest.json"
        save_to_cache(cache_name, data)
        return {
            "status": "live",
            "event_type": event_type,
            "count": len(data) if isinstance(data, list) else 0,
            "data": data
        }
    except Exception as e:
        logger.warning(f"Failed to fetch DONKI {event_type} data ({e}). Falling back to cache.")
        sample = load_fallback_cache("sample_data.json")
        return {
            "status": "cached_fallback",
            "event_type": event_type,
            "space_weather": sample.get("space_weather", {}),
            "source": "data/cache/sample_data.json"
        }


def fetch_near_earth_objects() -> Dict[str, Any]:
    """
    Fetches NeoWs (Near Earth Object Web Service) feed.
    Falls back to cached asteroids in sample_data.json.
    """
    url = f"{NASA_API_BASE_URL}/neo/rest/v1/feed/today"
    params = {"detailed": "false", "api_key": NASA_API_KEY}

    try:
        response = requests.get(url, params=params, timeout=7)
        response.raise_for_status()
        data = response.json()
        save_to_cache("neows_latest.json", data)
        return {"status": "live", "data": data}
    except Exception as e:
        logger.warning(f"Failed to fetch NeoWs ({e}). Falling back to cache.")
        sample = load_fallback_cache("sample_data.json")
        return {
            "status": "cached_fallback",
            "near_earth_objects": sample.get("near_earth_objects", []),
            "source": "data/cache/sample_data.json"
        }


def get_telemetry_and_metrics() -> Dict[str, Any]:
    """
    Returns current mission telemetry and environmental metrics.
    Can read from live streams/processed outputs or use the cached fallback.
    """
    processed_metric_file = PROCESSED_DATA_DIR / "current_metrics.json"
    if processed_metric_file.exists():
        try:
            with open(processed_metric_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return load_fallback_cache("sample_data.json")


if __name__ == "__main__":
    print("--- Testing API Handler with Automatic Fallback ---")
    telemetry = get_telemetry_and_metrics()
    print("Telemetry Altitude:", telemetry.get("telemetry", {}).get("altitude_km"))
    print("Status:", telemetry.get("status"))
    print("Space Weather Test:", fetch_space_weather_donki("FLR")["status"])
