import sys
import traceback

try:
    from ultralytics import YOLO
    model = YOLO('../best.pt')
    print("Loaded fine initially")
except Exception as e:
    print("Error loading normally:")
    traceback.print_exc()
    
    # Try pathlib patch
    print("\n--- Attempting pathlib patch ---")
    import pathlib
    try:
        pathlib.PosixPath = pathlib.WindowsPath
        model = YOLO('../best.pt')
        print("Loaded fine with patch")
    except Exception as e2:
        print("Still failed:")
        traceback.print_exc()
