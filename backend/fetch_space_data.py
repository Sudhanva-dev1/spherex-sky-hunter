"""
NASA SkyView Multi-Epoch FITS & Optical/Infrared Cutout Fetcher
NASA Space Apps Challenge 2026 - SPHEREx ChronoSky

Queries NASA SkyView for multi-epoch survey cutouts (DSS1, DSS2, 2MASS, WISE),
applies professional astronomical contrast normalization (ZScaleInterval + AsinhStretch),
and outputs aligned PNG frames for the frontend Blink Comparator.
"""

import os
import sys
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg') # Headless rendering
import matplotlib.pyplot as plt

try:
    from astroquery.skyview import SkyView
    from astropy.visualization import ImageNormalize, ZScaleInterval, AsinhStretch
    ASTROPY_AVAILABLE = True
except ImportError:
    ASTROPY_AVAILABLE = False
    print("Warning: 'astroquery' or 'astropy' is not installed. Run 'pip install -r backend/requirements.txt'.")

# Output directory inside frontend public folder
BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "frontend" / "public" / "images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Survey designations spanning optical to near-infrared
# DSS1 Red (~1950s optical), DSS2 Red (~1990s optical), 2MASS-J (1.25um NIR), WISE 3.4 (3.4um MIR)
DEFAULT_SURVEYS = [
    ("DSS1 Red", "Epoch 1 (DSS1 Red 1954)"),
    ("DSS2 Red", "Epoch 2 (DSS2 Red 1993)"),
    ("2MASS-J", "Epoch 3 (2MASS-J 1.25um)"),
    ("WISE 3.4", "Epoch 4 (WISE 3.4um / W1)")
]

def generate_synthetic_epoch_images(output_dir: Path):
    """
    Fallback generator if offline or astroquery fails.
    Produces high-fidelity astronomical cutout images with simulated moving candidate.
    """
    print("Generating offline fallback astronomical epoch cutouts...")
    np.random.seed(42)
    size = 400
    
    # Static background stars (fixed across all epochs)
    base_stars = []
    for _ in range(45):
        sx = np.random.randint(20, size - 20)
        sy = np.random.randint(20, size - 20)
        brightness = np.random.uniform(0.4, 1.0)
        sigma = np.random.uniform(1.2, 3.5)
        base_stars.append((sx, sy, brightness, sigma))

    # Anomaly trajectory across the 4 epochs
    anomaly_positions = [
        (160, 200), # Epoch 1
        (190, 208), # Epoch 2
        (225, 218), # Epoch 3
        (260, 226), # Epoch 4
    ]

    x, y = np.meshgrid(np.arange(size), np.arange(size))

    for epoch_idx in range(4):
        # Cosmic background noise
        frame = np.random.normal(loc=0.08, scale=0.015, size=(size, size))
        
        # Add diffuse nebula background glow
        dist_center = np.sqrt((x - 200)**2 + (y - 200)**2)
        frame += 0.05 * np.exp(-dist_center / 120.0)

        # Render static stars
        for sx, sy, brightness, sigma in base_stars:
            star_profile = brightness * np.exp(-((x - sx)**2 + (y - sy)**2) / (2 * sigma**2))
            frame += star_profile

        # Render moving anomaly
        ax, ay = anomaly_positions[epoch_idx]
        anomaly_profile = 0.85 * np.exp(-((x - ax)**2 + (y - ay)**2) / (2 * 2.2**2))
        frame += anomaly_profile

        # Clip and normalize
        frame = np.clip(frame, 0.0, 1.0)

        # Save as grayscale PNG
        fig, ax_plot = plt.subplots(figsize=(5, 5), dpi=80)
        ax_plot.imshow(frame, cmap="gray", origin="lower", vmin=0, vmax=1)
        ax_plot.axis("off")
        
        filename = f"epoch_{epoch_idx + 1}.png"
        filepath = output_dir / filename
        plt.savefig(filepath, bbox_inches="tight", pad_inches=0, facecolor="black")
        plt.close()
        print(f"  [Fallback Generated] -> {filepath.name}")

def fetch_and_save_cutouts(
    position: str = "05h34m31.97s +22d00m52.1s",
    pixels: int = 400
):
    """
    Queries NASA SkyView for real multi-survey astronomical cutouts,
    normalizes with ZScaleInterval + AsinhStretch, and saves to frontend/public/images/.
    """
    if not ASTROPY_AVAILABLE:
        print("Astropy / Astroquery not available. Using synthetic generator.")
        generate_synthetic_epoch_images(OUTPUT_DIR)
        return

    survey_keys = [s[0] for s in DEFAULT_SURVEYS]
    print(f"Querying NASA SkyView for position: {position}")
    print(f"Target surveys: {survey_keys}")

    try:
        images = SkyView.get_images(position=position, survey=survey_keys, pixels=pixels)
        if not images:
            raise ValueError("No image cutouts returned from SkyView.")

        for i, img in enumerate(images):
            data = img[0].data
            survey_name = DEFAULT_SURVEYS[i][1] if i < len(DEFAULT_SURVEYS) else f"Epoch {i+1}"

            # Astronomical normalization: ZScaleInterval + AsinhStretch for crisp contrast
            norm = ImageNormalize(data, interval=ZScaleInterval(), stretch=AsinhStretch())

            fig, ax = plt.subplots(figsize=(5, 5), dpi=80)
            ax.imshow(data, cmap="gray", norm=norm, origin="lower")
            ax.axis("off")

            filename = f"epoch_{i+1}.png"
            filepath = OUTPUT_DIR / filename
            plt.savefig(filepath, bbox_inches="tight", pad_inches=0, facecolor="black")
            plt.close()
            print(f"Saved {survey_name} -> {filepath}")

        print("All NASA SkyView image cutouts successfully fetched and saved!")
    except Exception as e:
        print(f"SkyView fetch error ({e}). Generating high-contrast fallback cutouts...")
        generate_synthetic_epoch_images(OUTPUT_DIR)

if __name__ == "__main__":
    fetch_and_save_cutouts()

