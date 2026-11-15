"""
backend/fits_processor.py
Member 4: Astrophysics & FITS Pipeline Backend
- Normalizes 32-bit FITS arrays into 8-bit Base64 PNGs using Astropy's ZScaleInterval and AsinhStretch.
- Generates backend/demo_sectors.json containing 4 realistic multi-epoch sky sectors 
  (Asteroid, Comet, Brown Dwarf, Kuiper Belt Object) with 102-band spectral arrays.
"""

import os
import json
import base64
import io
import numpy as np
from PIL import Image as PILImage

try:
    from astropy.visualization import ZScaleInterval, AsinhStretch, ImageNormalize
    HAS_ASTROPY = True
except ImportError:
    HAS_ASTROPY = False

def process_fits_array_to_png(image_data: np.ndarray) -> str:
    """
    Normalizes a 2D raw FITS data array into an 8-bit PNG encoded in Base64 
    using Astropy ZScaleInterval and AsinhStretch (or high-fidelity NumPy fallback).
    """
    cleaned_data = np.nan_to_num(image_data, nan=0.0, posinf=0.0, neginf=0.0)

    if HAS_ASTROPY:
        # 1. ZScale Interval for automatic background-subtracted black/white limits
        interval = ZScaleInterval()
        try:
            vmin, vmax = interval.get_limits(cleaned_data)
        except Exception:
            vmin, vmax = float(np.min(cleaned_data)), float(np.max(cleaned_data))
            if vmin == vmax:
                vmax = vmin + 1.0

        # 2. Asinh Stretch for dynamic range compression
        stretch = AsinhStretch(a=0.1)
        norm = ImageNormalize(vmin=vmin, vmax=vmin + (vmax - vmin), stretch=stretch, clip=True)
        normalized_array = norm(cleaned_data)
    else:
        # High-fidelity NumPy fallback for environments without Astropy
        vmin = float(np.percentile(cleaned_data, 1.0))
        vmax = float(np.percentile(cleaned_data, 99.5))
        if vmax <= vmin:
            vmax = vmin + 1.0
        norm_data = np.clip((cleaned_data - vmin) / (vmax - vmin), 0.0, 1.0)
        a = 0.1
        normalized_array = np.arcsinh(norm_data / a) / np.arcsinh(1.0 / a)

    scaled_8bit = np.uint8(np.clip(normalized_array * 255.0, 0, 255))
    
    # 3. Convert to PNG Base64 string
    img = PILImage.fromarray(scaled_8bit, mode='L')
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded_png = base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    return f"data:image/png;base64,{encoded_png}"


def generate_synthetic_cutout(shape=(64, 64), seed=42) -> np.ndarray:
    """Simulates a 2D astronomical FITS cutout with background noise and a moving PSF source."""
    try:
        h = max(16, min(512, int(shape[0])))
        w = max(16, min(512, int(shape[1])))
        safe_shape = (h, w)
    except Exception:
        safe_shape = (64, 64)
    try:
        safe_seed = max(0, min(2**31 - 1, int(seed)))
    except Exception:
        safe_seed = 42

    np.random.seed(safe_seed)
    background = np.random.normal(loc=100.0, scale=4.0, size=safe_shape)
    y, x = np.ogrid[:safe_shape[0], :safe_shape[1]]
    center_y, center_x = safe_shape[0] / 2.0, safe_shape[1] / 2.0
    psf = 1500.0 * np.exp(-((x - center_x)**2 + (y - center_y)**2) / (2.0 * 2.2**2))
    return background + psf


def generate_102_band_spectrum(target_type: str) -> list:
    """Generates a 102-band spectral array (0.75 - 5.0 µm) matching SPHEREx channel resolution."""
    wavelengths = np.linspace(0.75, 5.0, 102)
    base_flux = 60.0 + 12.0 * np.sin(wavelengths * 1.2) + np.random.normal(0, 1.2, 102)
    
    if target_type == "Asteroid":
        flux = base_flux + 220.0 * np.exp(-((wavelengths - 1.6)**2) / 0.5)
    elif target_type == "Comet":
        flux = base_flux + 190.0 * np.exp(-((wavelengths - 2.0)**2) / 0.4)
        flux -= 45.0 * np.exp(-((wavelengths - 2.01)**2) / 0.05) # Water ice dip
        flux -= 70.0 * np.exp(-((wavelengths - 3.00)**2) / 0.08) # Water ice dip
    elif target_type == "Brown Dwarf":
        flux = base_flux * (wavelengths / 1.5)**-1.4 + 90.0
        flux -= 35.0 * np.exp(-((wavelengths - 1.65)**2) / 0.03) # Methane dip
        flux -= 50.0 * np.exp(-((wavelengths - 2.20)**2) / 0.04) # Methane dip
    elif target_type == "Kuiper Belt Object (KBO)":
        flux = base_flux * 0.45 + 35.0 * np.exp(-((wavelengths - 1.5)**2) / 0.8)
        flux -= 28.0 * np.exp(-((wavelengths - 2.27)**2) / 0.04)
    else:
        flux = base_flux

    return [{"wavelength_um": round(float(w), 3), "flux_mjy": round(float(f), 2)} for w, f in zip(wavelengths, flux)]


def generate_demo_sectors_json():
    """Generates backend/demo_sectors.json with 4 targets, 4 epochs, and 102-band spectra."""
    targets = [
        {"id": "AST-2026-01", "name": "Near-Earth Asteroid", "classification": "Asteroid", "ra": 142.23, "dec": 23.41, "desc": "Silicate-rich asteroid tracking across 4 time epochs."},
        {"id": "COM-2026-02", "name": "Comet Hale-Observed", "classification": "Comet", "ra": 210.54, "dec": -12.87, "desc": "Active comet exhibiting prominent water-ice absorption bands."},
        {"id": "BD-2026-03", "name": "T-Type Brown Dwarf", "classification": "Brown Dwarf", "ra": 63.12, "dec": 20.11, "desc": "Substellar cool dwarf with deep atmospheric methane features."},
        {"id": "KBO-2026-04", "name": "Trans-Neptunian KBO", "classification": "Kuiper Belt Object", "ra": 305.89, "dec": -45.32, "desc": "Faint outer solar system icy body with complex hydrocarbons."}
    ]

    sectors_output = {}

    for idx, target in enumerate(targets):
        epochs = []
        for ep in range(1, 5):
            cutout = generate_synthetic_cutout(shape=(64, 64), seed=200 + idx * 10 + ep)
            png_b64 = process_fits_array_to_png(cutout)
            
            epochs.append({
                "epoch": ep,
                "mjd": 60600.0 + (ep * 3.2),
                "ra": round(target["ra"] + (ep * 0.002), 4),
                "dec": round(target["dec"] + (ep * 0.001), 4),
                "image_png_base64": png_b64
            })

        spectrum = generate_102_band_spectrum(target["classification"])

        sectors_output[target["id"]] = {
            "target_id": target["id"],
            "name": target["name"],
            "classification": target["classification"],
            "description": target["desc"],
            "epochs": epochs,
            "spectrum_102_bands": spectrum
        }

    output_path = os.path.join(os.path.dirname(__file__), "demo_sectors.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sectors_output, f, indent=2)
        
    print(f"Successfully generated: {os.path.abspath(output_path)}")
    return sectors_output


def load_demo_sectors():
    """Loads cached demo_sectors.json, or generates it if missing."""
    demo_path = os.path.join(os.path.dirname(__file__), "demo_sectors.json")
    if os.path.exists(demo_path):
        try:
            with open(demo_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return generate_demo_sectors_json()


if __name__ == "__main__":
    print("Running Member 4 FITS Normalization & Demo Sector Generator...")
    generate_demo_sectors_json()