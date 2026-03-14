import os
import io
import cv2
import numpy as np
import base64
import pathlib

# Patch for Windows to load Colab/Linux trained PyTorch models
temp = pathlib.PosixPath
pathlib.PosixPath = pathlib.WindowsPath

# Patch for PyTorch 2.6+ weights_only restriction
import torch
_original_load = torch.load
def _safe_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)
torch.load = _safe_load

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI(title="SurakshaNet AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the weights from the repo root (E:\SurakshaNet\best.pt)
# We go up one level from ai-engine to reach the project root
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'best.pt'))
model = None

@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        print(f"Loading YOLOv8 model from {MODEL_PATH}...")
        model = YOLO(MODEL_PATH)
        print("Model loaded successfully.")
    else:
        print(f"WARNING: Model file not found at {MODEL_PATH}")
        print("Please download best.pt from Colab and place it in the SurakshaNet root directory.")

def draw_boxes(image: np.ndarray, detections) -> np.ndarray:
    """Draw bounding boxes and labels on the image"""
    img_copy = image.copy()
    
    for det in detections:
        x1, y1, x2, y2 = map(int, det.xyxy[0])
        conf = float(det.conf[0])
        class_id = int(det.cls[0])
        label = model.names[class_id]
        
        # Draw red box for accident
        color = (0, 0, 255) # BGR
        cv2.rectangle(img_copy, (x1, y1), (x2, y2), color, 2)
        
        # Add label
        text = f"{label} {conf:.2f}"
        cv2.putText(img_copy, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
    return img_copy

@app.post("/detect")
async def detect_accident(file: UploadFile = File(...)):
    print(f"Received request at /detect. Filename: {file.filename}")
    if not model:
        raise HTTPException(status_code=503, detail="AI Model is not loaded. Ensure best.pt is in the root directory.")
        
    try:
        # Read the uploaded image file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
             raise HTTPException(status_code=400, detail="Invalid image file format")
             
        # Run inference (Baseline set to 0.4 to catch low-conf for internal logging, but 0.6 for trigger)
        results = model.predict(source=img, conf=0.40, save=False)
        
        detections = []
        has_accident = False
        
        if len(results) > 0 and len(results[0].boxes) > 0:
            result = results[0]
            print(f"YOLO found {len(result.boxes)} object(s). Analyzing...")
            for box in result.boxes:
                 class_id = int(box.cls[0])
                 class_name = model.names[class_id]
                 conf = float(box.conf[0])
                 print(f" -> Detected: [{class_name}] conf: {conf:.4f}")
                 
                 # The user merged all classes to "accident" in Roboflow, but we'll check broadly
                 # or simply assume any high-confidence detection is the accident class.
                 if conf >= 0.60:
                     has_accident = True
                     
                     x1, y1, x2, y2 = map(float, box.xyxy[0])
                     detections.append({
                         "class": class_name,
                         "confidence": conf,
                         "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
                     })
                     
            # Draw the boxes only if accident found, then encode to base64
            if has_accident:
                 annotated_img = draw_boxes(img, result.boxes)
                 _, buffer = cv2.imencode('.jpg', annotated_img)
                 b64_img = base64.b64encode(buffer).decode('utf-8')
                 data_uri = f"data:image/jpeg;base64,{b64_img}"
                 
                 return {
                     "detected": True,
                     "detections": detections,
                     "annotated_frame": data_uri
                 }
                 
        # No accident found
        print(" -> No accidents reached confidence threshold.")
        return {"detected": False, "detections": []}
        
    except Exception as e:
        print(f"Error during detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
def get_status():
    return {
        "status": "online", 
        "model_loaded": model is not None,
        "model_path": MODEL_PATH
    }

if __name__ == "__main__":
    import uvicorn
    # Start the AI Inference server on port 8002
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
