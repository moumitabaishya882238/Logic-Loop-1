"""
SurakshaNet — Alert Sender Utility
utils/alert_sender.py

Handles formatting and HTTP delivery of CCTV_ALERT incident payloads
to the SurakshaNet central backend API.

Features:
  - Per-subtype cooldown timer to avoid alert flooding
  - Retry logic with exponential back-off (up to MAX_RETRIES)
  - Structured payload matching the SurakshaNet API contract
  - Non-blocking: send() returns True/False rather than raising
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

import requests

logger = logging.getLogger("SurakshaNet.AlertSender")


class AlertSender:
    """
    Sends incident alerts to the SurakshaNet backend.

    Args:
        backend_url: Base URL of the Node.js backend, e.g. "http://localhost:5000".
        camera_id: Identifier for this camera, e.g. "CAM_01".
        location: Dict with 'lat' and 'lng' float values.
        cooldown_seconds: Minimum interval between alerts of the same subtype.
        max_retries: Number of retry attempts on HTTP failure.
        timeout_seconds: Per-request HTTP timeout.
    """

    ALERT_ENDPOINT = "/api/cctv-alert"

    def __init__(
        self,
        backend_url: str = "http://localhost:5000",
        camera_id: str = "CAM_01",
        location: Optional[dict] = None,
        cooldown_seconds: int = 10,
        max_retries: int = 3,
        timeout_seconds: int = 5,
    ):
        self.backend_url = backend_url.rstrip("/")
        self.camera_id = camera_id
        self.location = location or {"lat": 0.0, "lng": 0.0}
        self.cooldown_seconds = cooldown_seconds
        self.max_retries = max_retries
        self.timeout_seconds = timeout_seconds

        # Track last alert time per subtype to enforce cooldowns
        self._last_alert_time: dict[str, float] = {}

        # Running totals for observability
        self._sent_count: int = 0
        self._failed_count: int = 0

    # ──────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────
    def send_alert(
        self,
        subtype: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> bool:
        """
        Send a CCTV_ALERT to the backend API.

        Args:
            subtype: Incident sub-category, e.g. 'crowd', 'fight', 'suspicious'.
            metadata: Optional extra fields merged into the payload.

        Returns:
            True if the alert was delivered, False if suppressed or failed.
        """
        # ── Cooldown guard ──
        if self._is_on_cooldown(subtype):
            remaining = self._cooldown_remaining(subtype)
            logger.debug(
                "Alert [%s] suppressed — cooldown %.1fs remaining",
                subtype, remaining,
            )
            return False

        payload = self._build_payload(subtype, metadata)

        success = self._post_with_retry(payload)

        if success:
            self._last_alert_time[subtype] = time.monotonic()
            self._sent_count += 1
            logger.info(
                "✅ Alert sent — type=CCTV_ALERT subtype=%s camera=%s [total sent: %d]",
                subtype, self.camera_id, self._sent_count,
            )
        else:
            self._failed_count += 1
            logger.warning(
                "❌ Alert delivery failed — subtype=%s [total failed: %d]",
                subtype, self._failed_count,
            )

        return success

    @property
    def stats(self) -> dict:
        """Return delivery statistics."""
        return {
            "sent": self._sent_count,
            "failed": self._failed_count,
            "camera_id": self.camera_id,
        }

    # ──────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────
    def _build_payload(
        self,
        subtype: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Construct the SurakshaNet API payload."""
        payload = {
            "type": "CCTV_ALERT",
            "subtype": subtype,
            "camera_id": self.camera_id,
            "location": {
                "lat": self.location.get("lat", 0.0),
                "lng": self.location.get("lng", 0.0),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if metadata:
            payload["metadata"] = metadata
        return payload

    def _post_with_retry(self, payload: dict) -> bool:
        """
        POST payload to the backend with exponential back-off retries.
        Returns True on any 2xx response.
        """
        url = self.backend_url + self.ALERT_ENDPOINT
        delay = 0.5  # initial back-off delay in seconds

        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.post(
                    url,
                    json=payload,
                    timeout=self.timeout_seconds,
                    headers={
                        "Content-Type": "application/json",
                        "X-Source": "surakshanet-ai-cctv",
                        "X-Camera-Id": self.camera_id,
                    },
                )
                if response.ok:
                    logger.debug(
                        "POST %s → %d (attempt %d)",
                        url, response.status_code, attempt,
                    )
                    return True
                else:
                    logger.warning(
                        "POST %s returned HTTP %d (attempt %d): %s",
                        url, response.status_code, attempt, response.text[:200],
                    )

            except requests.exceptions.ConnectionError:
                logger.warning(
                    "Connection error to %s (attempt %d/%d)",
                    url, attempt, self.max_retries,
                )
            except requests.exceptions.Timeout:
                logger.warning(
                    "Request to %s timed out (attempt %d/%d)",
                    url, attempt, self.max_retries,
                )
            except requests.exceptions.RequestException as exc:
                logger.error("Unexpected HTTP error: %s", exc)
                break  # non-retriable error

            if attempt < self.max_retries:
                logger.debug("Retrying in %.1fs …", delay)
                time.sleep(delay)
                delay = min(delay * 2, 10.0)  # exponential back-off, cap 10s

        return False

    def _is_on_cooldown(self, subtype: str) -> bool:
        last = self._last_alert_time.get(subtype)
        if last is None:
            return False
        return (time.monotonic() - last) < self.cooldown_seconds

    def _cooldown_remaining(self, subtype: str) -> float:
        last = self._last_alert_time.get(subtype, 0.0)
        return max(0.0, self.cooldown_seconds - (time.monotonic() - last))