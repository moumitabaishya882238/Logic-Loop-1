"""
SurakshaNet — Video Stream Utility
utils/video_stream.py

Wraps OpenCV VideoCapture in a dedicated reader thread so that the main
detection loop always has the *latest* frame available without blocking
on I/O.  This pattern (background grab thread + shared frame slot) is a
standard trick for eliminating camera-buffer lag in real-time CV apps.

Supports:
  - Webcam (source=0, 1, …)
  - RTSP streams (source="rtsp://user:pass@ip:port/stream")
  - Local video files (source="path/to/video.mp4")
"""

import logging
import threading
import time
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger("SurakshaNet.VideoStream")


class VideoStream:
    """
    Background-threaded video stream reader.

    Usage:
        stream = VideoStream(source=0, resize_width=640)
        stream.start()
        while True:
            frame = stream.read()
            if frame is None:
                continue
            # ... process frame ...
        stream.stop()
    """

    def __init__(
        self,
        source: int | str = 0,
        resize_width: Optional[int] = 640,
        reconnect_delay: float = 2.0,
        max_reconnect_attempts: int = 10,
    ):
        """
        Args:
            source: Camera index, RTSP URL, or video file path.
            resize_width: Resize frames to this width (preserving aspect ratio).
                          Set to None to keep original resolution.
            reconnect_delay: Seconds to wait before reconnect attempt.
            max_reconnect_attempts: Give up after N failed reconnects.
        """
        self.source = source
        self.resize_width = resize_width
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_attempts = max_reconnect_attempts

        self._cap: Optional[cv2.VideoCapture] = None
        self._frame: Optional[np.ndarray] = None
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._connected = False

    # ──────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────
    def start(self) -> "VideoStream":
        """Open the capture device and start the background reader thread."""
        self._open_capture()
        self._thread = threading.Thread(
            target=self._reader_loop,
            daemon=True,
            name="VideoStreamReader",
        )
        self._thread.start()
        logger.info("VideoStream started — source: %s", self.source)
        return self

    def read(self) -> Optional[np.ndarray]:
        """
        Return the most recently captured frame, or None if not yet available.
        Thread-safe.
        """
        with self._lock:
            if self._frame is None:
                return None
            return self._frame.copy()

    def stop(self) -> None:
        """Signal the reader thread to stop and release the capture device."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
        if self._cap is not None:
            self._cap.release()
        logger.info("VideoStream stopped.")

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def resolution(self) -> Optional[tuple[int, int]]:
        """Returns (width, height) of the current capture, or None."""
        if self._cap and self._cap.isOpened():
            w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            return (w, h)
        return None

    # ──────────────────────────────────────────────
    # Internal
    # ──────────────────────────────────────────────
    def _open_capture(self) -> bool:
        """Attempt to open the VideoCapture. Returns True on success."""
        if self._cap is not None:
            self._cap.release()

        self._cap = cv2.VideoCapture(self.source)

        # Performance tuning for real-time use
        self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal buffer lag

        if not self._cap.isOpened():
            logger.error("Cannot open video source: %s", self.source)
            self._connected = False
            return False

        res = self.resolution
        logger.info("Capture opened — resolution: %s", res)
        self._connected = True
        return True

    def _reader_loop(self) -> None:
        """
        Continuously grab frames in a background thread.
        Stores only the *latest* frame; older frames are discarded.
        Auto-reconnects on stream failure.
        """
        reconnect_attempts = 0

        while not self._stop_event.is_set():
            if self._cap is None or not self._cap.isOpened():
                # Attempt reconnect
                if reconnect_attempts >= self.max_reconnect_attempts:
                    logger.error(
                        "Max reconnect attempts (%d) reached — giving up.",
                        self.max_reconnect_attempts,
                    )
                    break
                logger.warning(
                    "Stream unavailable — reconnect attempt %d/%d in %.1fs …",
                    reconnect_attempts + 1, self.max_reconnect_attempts,
                    self.reconnect_delay,
                )
                time.sleep(self.reconnect_delay)
                reconnect_attempts += 1
                self._open_capture()
                continue

            ret, frame = self._cap.read()
            if not ret:
                logger.warning("Frame grab failed — stream may have ended.")
                self._connected = False
                self._cap.release()
                continue  # triggers reconnect on next iteration

            reconnect_attempts = 0  # reset on successful read
            self._connected = True

            # Optional resize for performance
            if self.resize_width is not None:
                frame = self._resize(frame, self.resize_width)

            with self._lock:
                self._frame = frame

        self._connected = False

    @staticmethod
    def _resize(frame: np.ndarray, target_width: int) -> np.ndarray:
        """Resize frame to target_width, preserving aspect ratio."""
        h, w = frame.shape[:2]
        if w == target_width:
            return frame
        scale = target_width / w
        new_h = int(h * scale)
        return cv2.resize(frame, (target_width, new_h), interpolation=cv2.INTER_LINEAR)