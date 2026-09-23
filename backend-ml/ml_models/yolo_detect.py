"""
YOLOv8 hazard detection on actual image pixels (ultralytics).

Uses pretrained COCO weights as a PLACEHOLDER polar model. Bounding boxes and
confidence scores come from real inference, not URL hashing.
"""
from __future__ import annotations

import base64
import os
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import requests
from PIL import Image, ExifTags

_MODEL = None
_MODEL_LOAD_ERROR: Optional[str] = None

# COCO names that can plausibly map to polar ops imagery (still a placeholder overlay).
_POLAR_HINTS = {
    "person": ("CREW_IN_HAZARD_ZONE", "MEDIUM"),
    "truck": ("VEHICLE", "LOW"),
    "car": ("VEHICLE", "LOW"),
    "bus": ("VEHICLE", "LOW"),
    "boat": ("VESSEL", "MEDIUM"),
    "airplane": ("AIRCRAFT", "MEDIUM"),
    "bird": ("WILDLIFE", "LOW"),
    "dog": ("WILDLIFE", "LOW"),
    "bear": ("WILDLIFE", "HIGH"),
    "fire hydrant": ("INFRASTRUCTURE", "LOW"),
    "stop sign": ("INFRASTRUCTURE", "LOW"),
    "bench": ("INFRASTRUCTURE", "LOW"),
    "backpack": ("EQUIPMENT", "LOW"),
    "suitcase": ("EQUIPMENT", "LOW"),
    "skis": ("EQUIPMENT", "LOW"),
    "snowboard": ("EQUIPMENT", "LOW"),
}


def _get_model():
    global _MODEL, _MODEL_LOAD_ERROR
    if _MODEL is not None:
        return _MODEL
    if _MODEL_LOAD_ERROR:
        raise RuntimeError(_MODEL_LOAD_ERROR)
    try:
        from ultralytics import YOLO

        weights = os.environ.get("YOLO_WEIGHTS", "yolov8n.pt")
        _MODEL = YOLO(weights)
        return _MODEL
    except Exception as exc:
        _MODEL_LOAD_ERROR = str(exc)
        raise


def _load_image(image_url: str) -> Image.Image:
    if image_url.startswith("data:"):
        header, b64 = image_url.split(",", 1)
        return Image.open(BytesIO(base64.b64decode(b64))).convert("RGB")
    if os.path.isfile(image_url):
        return Image.open(image_url).convert("RGB")
    response = requests.get(image_url, timeout=20)
    response.raise_for_status()
    return Image.open(BytesIO(response.content)).convert("RGB")


def _exif_gps(img: Image.Image) -> Optional[Tuple[float, float]]:
    try:
        exif = img.getexif()
        if not exif:
            return None
        gps_key = None
        for tag, name in ExifTags.TAGS.items():
            if name == "GPSInfo":
                gps_key = tag
                break
        if gps_key is None or gps_key not in exif:
            return None
        gps = exif.get_ifd(gps_key) if hasattr(exif, "get_ifd") else exif.get(gps_key)
        if not gps:
            return None

        def _to_deg(values):
            d, m, s = values
            return float(d) + float(m) / 60.0 + float(s) / 3600.0

        lat = _to_deg(gps[2])
        lng = _to_deg(gps[4])
        if gps.get(1) == "S":
            lat = -lat
        if gps.get(3) == "W":
            lng = -lng
        return lat, lng
    except Exception:
        return None


def detect_hazards_from_url(image_url: str) -> Dict[str, Any]:
    img = _load_image(image_url)
    pixels = np.array(img)
    model = _get_model()
    results = model(pixels, conf=0.25, verbose=False)

    gps = _exif_gps(img)
    detections: List[Dict[str, Any]] = []
    confidences: List[float] = []

    if results:
        result = results[0]
        names = result.names or {}
        if result.boxes is not None:
            for box in result.boxes:
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                xyxy = box.xyxy[0].tolist()
                coco_name = names.get(cls, str(cls))
                polar_type, severity = _POLAR_HINTS.get(coco_name, ("UNKNOWN_OBJECT", "LOW"))
                if conf > 0.7:
                    severity = "HIGH" if polar_type not in {"VEHICLE", "INFRASTRUCTURE", "EQUIPMENT"} else severity
                confidences.append(conf * 100)
                det: Dict[str, Any] = {
                    "type": polar_type,
                    "coco_class": coco_name,
                    "bounding_box": {
                        "x": int(xyxy[0]),
                        "y": int(xyxy[1]),
                        "width": int(xyxy[2] - xyxy[0]),
                        "height": int(xyxy[3] - xyxy[1]),
                    },
                    "confidence": round(conf * 100, 1),
                    "severity": severity,
                }
                if gps:
                    det["latitude"] = gps[0]
                    det["longitude"] = gps[1]
                detections.append(det)

    mean_conf = round(float(np.mean(confidences)), 1) if confidences else 0.0
    explanation = (
        "PLACEHOLDER polar detector: pretrained YOLOv8n (COCO). "
        f"Ran inference on {pixels.shape[1]}×{pixels.shape[0]} pixels and found "
        f"{len(detections)} object(s). Class names are COCO; polar labels are a "
        "heuristic overlay, not a crevasse-trained taxonomy. "
        "Production requires a custom Antarctic hazard dataset."
    )
    if gps:
        explanation += " GPS taken from image EXIF."
    else:
        explanation += " No EXIF GPS; coordinates omitted (not invented)."

    return {
        "detections": detections,
        "image_url": image_url,
        "image_size": {"width": int(pixels.shape[1]), "height": int(pixels.shape[0])},
        "explanation": explanation,
        "confidence": mean_conf,
        "model_version": "yolov8n-pretrained-PLACEHOLDER",
        "processed_at": datetime.now().isoformat(),
        "note": "Using generic pretrained COCO weights — not custom-trained on Antarctic hazards",
    }
