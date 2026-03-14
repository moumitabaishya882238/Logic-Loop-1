from ultralytics import YOLO
import os
import pathlib
import torch

# Patch for Windows to load Colab/Linux trained PyTorch models
pathlib.PosixPath = pathlib.WindowsPath

# Patch for PyTorch 2.6+ weights_only restriction
_original_load = torch.load
def _safe_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)
torch.load = _safe_load

model_path = os.path.abspath("e:/SurakshaNet/best.pt")
if os.path.exists(model_path):
    model = YOLO(model_path)
    print(f"Model Names: {model.names}")
else:
    print(f"Model not found at {model_path}")
