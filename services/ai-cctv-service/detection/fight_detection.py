"""
SurakshaNet — Fight / Altercation Detection Module
detection/fight_detection.py

Detects possible physical altercations by analyzing how closely a group
of persons are clustered together.

Strategy:
  1. Extract the center-point of each person's bounding box.
  2. Build a proximity graph — connect pairs of persons whose centers
     are within `proximity_px` of each other (Euclidean distance).
  3. Find connected components (clusters) in the graph.
  4. If any cluster reaches `person_threshold`, flag as possible fight.

This lightweight approach requires no pose estimation and runs well
at real-time frame rates on CPU.
"""

import logging
import math
from typing import Optional

logger = logging.getLogger("SurakshaNet.FightDetection")


class FightDetector:
    """
    Detects possible fights or altercations based on person proximity clusters.

    Args:
        person_threshold (int): Minimum cluster size to trigger an alert.
        proximity_px (int): Max pixel distance between person centers to be
                            considered "in contact / very close".
    """

    def __init__(
        self,
        person_threshold: int = 2,
        proximity_px: int = 100,
    ):
        self.person_threshold = person_threshold
        self.proximity_px = proximity_px

    def analyze(
        self,
        person_detections: list[dict],
        frame_shape: tuple,
    ) -> Optional[dict]:
        """
        Check whether any cluster of persons indicates a possible fight.

        Args:
            person_detections: List of dicts with 'bbox' [x1,y1,x2,y2] and 'conf'.
            frame_shape: (height, width, channels) — for normalisation if needed.

        Returns:
            Incident dict with cluster info if fight detected, else None.
        """
        if len(person_detections) < self.person_threshold:
            return None  # Not enough persons to form a cluster

        centers = [self._bbox_center(d["bbox"]) for d in person_detections]
        clusters = self._find_clusters(centers)

        # Find the largest cluster
        largest = max(clusters, key=len)

        if len(largest) >= self.person_threshold:
            cluster_centers = [centers[i] for i in largest]
            centroid = self._centroid(cluster_centers)

            incident = {
                "type": "fight",
                "cluster_size": len(largest),
                "total_persons": len(person_detections),
                "cluster_indices": list(largest),
                "cluster_centroid": {"x": round(centroid[0]), "y": round(centroid[1])},
                "proximity_threshold_px": self.proximity_px,
            }
            logger.debug(
                "Fight cluster detected: %d persons within %dpx proximity",
                len(largest), self.proximity_px,
            )
            return incident

        return None

    # ──────────────────────────────────────────────
    # Proximity graph + Union-Find clustering
    # ──────────────────────────────────────────────
    def _find_clusters(self, centers: list[tuple[float, float]]) -> list[set[int]]:
        """
        Union-Find to group persons by proximity.
        Returns a list of index-sets, one per connected component.
        """
        n = len(centers)
        parent = list(range(n))

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]  # path compression
                x = parent[x]
            return x

        def union(a, b):
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[rb] = ra

        for i in range(n):
            for j in range(i + 1, n):
                dist = self._euclidean(centers[i], centers[j])
                if dist <= self.proximity_px:
                    union(i, j)

        # Group indices by root
        component_map: dict[int, set[int]] = {}
        for i in range(n):
            root = find(i)
            component_map.setdefault(root, set()).add(i)

        return list(component_map.values())

    # ──────────────────────────────────────────────
    # Geometry helpers
    # ──────────────────────────────────────────────
    @staticmethod
    def _bbox_center(bbox: list[int]) -> tuple[float, float]:
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    @staticmethod
    def _euclidean(
        a: tuple[float, float], b: tuple[float, float]
    ) -> float:
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

    @staticmethod
    def _centroid(points: list[tuple[float, float]]) -> tuple[float, float]:
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        return (sum(xs) / len(xs), sum(ys) / len(ys))

    def set_thresholds(
        self,
        person_threshold: Optional[int] = None,
        proximity_px: Optional[int] = None,
    ) -> None:
        """Dynamically update detection thresholds."""
        if person_threshold is not None:
            logger.info("FightDetector person_threshold: %d → %d",
                        self.person_threshold, person_threshold)
            self.person_threshold = person_threshold
        if proximity_px is not None:
            logger.info("FightDetector proximity_px: %d → %d",
                        self.proximity_px, proximity_px)
            self.proximity_px = proximity_px