"""
SurakshaNet — Crowd Detection Module
detection/crowd_detection.py

Analyzes a list of 'person' detections in a single frame and determines
whether a crowd-level threshold has been breached.

Strategy:
  - Count total persons in frame.
  - Compare against a configurable threshold.
  - Optionally apply density analysis (persons per frame area).
  - Return an incident dict when triggered, or None when clear.
"""

import logging
from typing import Optional

logger = logging.getLogger("SurakshaNet.CrowdDetection")


class CrowdDetector:
    """
    Detects crowd conditions based on person count and optional density.

    Args:
        person_threshold (int): Minimum number of persons to trigger a crowd alert.
        density_threshold (float): Optional persons-per-10k-pixel threshold.
                                   Set to None to disable density check.
    """

    def __init__(
        self,
        person_threshold: int = 5,
        density_threshold: Optional[float] = None,
    ):
        self.person_threshold = person_threshold
        self.density_threshold = density_threshold
        self._last_count = 0

    def analyze(
        self,
        person_detections: list[dict],
        frame_shape: tuple,
    ) -> Optional[dict]:
        """
        Evaluate persons in the current frame for crowd conditions.

        Args:
            person_detections: List of detection dicts with keys 'bbox', 'conf'.
                               Each bbox is [x1, y1, x2, y2].
            frame_shape: (height, width, channels) — from frame.shape.

        Returns:
            Incident dict if crowd detected, else None.
        """
        count = len(person_detections)
        self._last_count = count

        # ── Primary check: raw count ──
        count_triggered = count >= self.person_threshold

        # ── Optional: density check ──
        density_triggered = False
        density_value = 0.0
        if self.density_threshold is not None and frame_shape:
            h, w = frame_shape[:2]
            frame_area = h * w
            if frame_area > 0:
                density_value = (count / frame_area) * 10_000  # persons per 10k px
                density_triggered = density_value >= self.density_threshold

        triggered = count_triggered or density_triggered

        if triggered:
            # Calculate the bounding region covering all detected persons
            region = self._compute_crowd_region(person_detections)
            incident = {
                "type": "crowd",
                "person_count": count,
                "density_per_10k_px": round(density_value, 4),
                "crowd_region": region,
                "trigger": "count" if count_triggered else "density",
            }
            logger.debug(
                "Crowd condition: %d persons (threshold=%d), density=%.4f",
                count, self.person_threshold, density_value,
            )
            return incident

        return None

    # ──────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────
    def _compute_crowd_region(self, detections: list[dict]) -> dict:
        """Return the bounding box that encompasses all person detections."""
        if not detections:
            return {}
        x1_vals = [d["bbox"][0] for d in detections]
        y1_vals = [d["bbox"][1] for d in detections]
        x2_vals = [d["bbox"][2] for d in detections]
        y2_vals = [d["bbox"][3] for d in detections]
        return {
            "x1": min(x1_vals),
            "y1": min(y1_vals),
            "x2": max(x2_vals),
            "y2": max(y2_vals),
        }

    def set_threshold(self, new_threshold: int) -> None:
        """Dynamically update the person count threshold."""
        logger.info(
            "CrowdDetector threshold updated: %d → %d",
            self.person_threshold, new_threshold,
        )
        self.person_threshold = new_threshold

    @property
    def last_count(self) -> int:
        """Returns the person count from the most recent analyze() call."""
        return self._last_count