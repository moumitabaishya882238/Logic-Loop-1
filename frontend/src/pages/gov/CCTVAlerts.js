import { useEffect, useState, useRef, useCallback } from "react";
import { GovLayout } from "@/components/GovLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle,
  Upload,
  X,
  AlertTriangle,
  Loader2,
  Crosshair,
  Eye,
  Activity,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CONFIDENCE_META = {
  ACCIDENT: {
    label: "Road Accident",
    color: "bg-red-500",
    text: "text-red-400",
  },
  FIGHT: {
    label: "Physical Altercation",
    color: "bg-orange-500",
    text: "text-orange-400",
  },
  THEFT: {
    label: "Theft / Robbery",
    color: "bg-yellow-500",
    text: "text-yellow-400",
  },
  FIRE: {
    label: "Fire / Smoke",
    color: "bg-amber-500",
    text: "text-amber-400",
  },
  NORMAL: {
    label: "Normal Activity",
    color: "bg-green-500",
    text: "text-green-400",
  },
};

const SEVERITY_COLORS = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-500",
};

const STATUS_COLORS = {
  PENDING: "bg-red-500/20 text-red-400 border-red-500/30",
  ACCEPTED: "bg-yellow-500",
  RESOLVED: "bg-green-500",
};

function UploadModal({ onClose, onIncidentCreated }) {
  const [videoFile, setVideoFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraName, setCameraName] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [fetchingGPS, setFetchingGPS] = useState(false);

  const [step, setStep] = useState("form"); // 'form' | 'analyzing' | 'result'
  const [analysisResult, setAnalysisResult] = useState(null);

  const [frameCount, setFrameCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const lastProcessedTimeRef = useRef(0);
  const processIntervalMs = 1000; // Process 1 frame every 1 second

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/") || file.type === "application/octet-stream";
    const isImage = file.type.startsWith("image/");
    
    if (!isVideo && !isImage) {
      toast.error("Please select a valid video or image file");
      return;
    }
    setVideoFile(file);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by this browser");
      return;
    }
    setFetchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude.toFixed(6));
        setLocationLng(pos.coords.longitude.toFixed(6));
        setFetchingGPS(false);
        toast.success("GPS coordinates captured");
      },
      () => {
        setFetchingGPS(false);
        toast.error("Could not retrieve GPS location");
      },
    );
  };

  const processFrame = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      videoRef.current.paused ||
      videoRef.current.ended
    ) {
      if (isProcessing) requestAnimationFrame(processFrame);
      return;
    }

    const currentTime = videoRef.current.currentTime * 1000;
    if (currentTime - lastProcessedTimeRef.current >= processIntervalMs) {
      console.log(`Processing frame at ${currentTime}ms...`);
      lastProcessedTimeRef.current = currentTime;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Setup canvas dimensions to match video
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Frame = canvas.toDataURL("image/jpeg", 0.8);

      setFrameCount((prev) => prev + 1);

      console.log("Sending frame to AI backend...");
      console.log("Sending frame to AI backend...");
      try {
        const data = await api.processAIFrame({
          videoFrameBase64: base64Frame,
          cameraId: cameraId.trim() || `CAM-${Date.now()}`,
          locationLat: parseFloat(locationLat),
          locationLng: parseFloat(locationLng),
        });

        if (data.detected) {
          // Found an accident! Pause inference
          video.pause();
          setIsProcessing(false);
          setAnalysisResult({
            accidentDetected: true,
            confidence: data.detections[0].confidence,
            annotatedFrame: data.annotatedFrame,
            incidentId: data.incidentId,
          });
          setStep("result");
          toast.error(
            "⚠️ Accident detected — incident created automatically!",
            { duration: 5000 },
          );
          onIncidentCreated();
          return;
        }
      } catch (err) {
        console.error("Frame processing error:", err);
        // Continue processing even if one frame fails
      }
    }

    if (isProcessing) {
      requestAnimationFrame(processFrame);
    }
  };

  const handleVideoEnded = () => {
    setIsProcessing(false);
    setAnalysisResult({
      accidentDetected: false,
      confidence: 0,
      annotatedFrame: null,
    });
    setStep("result");
  };

  useEffect(() => {
    if (step === "analyzing" && videoRef.current && videoFile) {
      videoRef.current.src = URL.createObjectURL(videoFile);
      videoRef.current.play().catch(toast.error);
    }
  }, [step, videoFile]);

  const handleSubmit = async () => {
    if (!videoFile) return toast.error("Please select a video or image file");
    if (!locationAddress.trim())
      return toast.error("Camera location address is required");
    if (!locationLat || !locationLng)
      return toast.error("Please provide GPS coordinates or use the GPS button");

    const isImage = videoFile.type.startsWith("image/");

    if (isImage) {
      await processImage();
    } else {
      setStep("analyzing");
      setFrameCount(0);
      setIsProcessing(true);
      lastProcessedTimeRef.current = -processIntervalMs;
    }
  };

  const processImage = async () => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target.result;
      setStep("analyzing");
      setIsProcessing(true);
      setFrameCount(1);
      
      try {
        const data = await api.processAIFrame({
          videoFrameBase64: base64Image,
          cameraId: cameraId.trim() || `IMG-${Date.now()}`,
          locationLat: parseFloat(locationLat),
          locationLng: parseFloat(locationLng),
        });

        if (data.detected) {
          setAnalysisResult({
            accidentDetected: true,
            confidence: data.detections[0].confidence,
            annotatedFrame: data.annotatedFrame,
            incidentId: data.incidentId,
          });
          toast.error("âš ï¸ Accident detected in image!");
        } else {
          setAnalysisResult({
            accidentDetected: false,
            confidence: 0,
            annotatedFrame: null,
          });
          toast.success("No accident detected in image");
        }
        setStep("result");
        setIsProcessing(false);
      } catch (err) {
        console.error("Image processing error:", err);
        const errorMsg = err.response?.data?.error || err.message;
        toast.error(`Failed to process image: ${errorMsg}`);
        setStep("form");
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(videoFile);
  };

  const reset = () => {
    setVideoFile(null);
    setAnalysisResult(null);
    setStep("form");
    setFrameCount(0);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-[#0F172A] border border-[#334155] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">
                AI Accident Detection
              </h2>
              <p className="text-[#94A3B8] text-xs">
                SurakshaNet Live YOLOv8 Inference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* —— FORM STEP —— */}
          {step === "form" && (
            <>
              {/* Drag-drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-red-500 bg-red-500/10"
                    : videoFile
                      ? "border-green-500 bg-green-500/10"
                      : "border-[#334155] bg-[#1E293B]/50 hover:border-[#475569]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
                {videoFile ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-semibold">{videoFile.name}</p>
                    <p className="text-[#94A3B8] text-sm mt-1">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB â€” click to change
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
                    <p className="text-white font-semibold">Drag & drop CCTV Footage or Image here</p>
                    <p className="text-[#94A3B8] text-sm mt-1">or click to browse â€” MP4, JPG, PNG supported</p>
                  </>
                )}
              </div>

              {/* Camera info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Camera Name
                  </label>
                  <Input
                    value={cameraName}
                    onChange={(e) => setCameraName(e.target.value)}
                    placeholder="e.g. MG Road Cam 4"
                    className="bg-[#1E293B] border-[#334155] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Camera ID
                  </label>
                  <Input
                    value={cameraId}
                    onChange={(e) => setCameraId(e.target.value)}
                    placeholder="e.g. CAM-042"
                    className="bg-[#1E293B] border-[#334155] text-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                    Camera Location Address{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. MG Road & Brigade Road Junction, Bangalore"
                    className="bg-[#1E293B] border-[#334155] text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                      Latitude <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={locationLat}
                      onChange={(e) => setLocationLat(e.target.value)}
                      placeholder="12.9716"
                      className="bg-[#1E293B] border-[#334155] text-white font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#94A3B8] text-xs uppercase tracking-wider">
                      Longitude <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={locationLng}
                      onChange={(e) => setLocationLng(e.target.value)}
                      placeholder="77.5946"
                      className="bg-[#1E293B] border-[#334155] text-white font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleGPS}
                      disabled={fetchingGPS}
                      variant="outline"
                      className="w-full border-[#334155] text-[#94A3B8] hover:text-white hover:border-[#475569]"
                    >
                      {fetchingGPS ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Crosshair className="w-4 h-4" />
                      )}
                      <span className="ml-2 text-xs">GPS</span>
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-base font-bold"
                disabled={
                  !videoFile || !locationAddress || !locationLat || !locationLng
                }
              >
                <Eye className="w-5 h-5 mr-2" />
                Start Live AI Scanning
              </Button>
            </>
          )}

          {/* —— ANALYZING STEP —— */}
          {step === "analyzing" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4 gap-4">
                <div className="text-center w-full">
                  <p className="text-white font-bold text-lg flex items-center justify-center gap-2">
                    <Activity className="w-5 h-5 text-red-500 animate-pulse" />
                    Live AI Inference Engine Active
                  </p>
                  <p className="text-[#94A3B8] text-sm mt-1">
                    SurakshaNet AccidentNet v1.0 Model Stream
                  </p>
                </div>
                <div className="w-full rounded-xl overflow-hidden border border-[#334155] bg-black relative">
                  {videoFile?.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(videoFile)}
                      className="w-full max-h-[500px] object-contain"
                      alt="Analyzing..."
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      className="w-full max-h-[500px] object-contain"
                      controls={true}
                      autoPlay={true}
                      playsInline={true}
                      muted={true}
                      onEnded={handleVideoEnded}
                      onPlay={() => {
                        setIsProcessing(true);
                        requestAnimationFrame(processFrame);
                      }}
                    />
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex justify-between w-full px-4 text-xs text-[#94A3B8] items-center">
                  <span className="flex items-center gap-2 text-blue-400 font-bold tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />{" "}
                    STREAMING TO FASTAPI
                  </span>
                  <span className="bg-[#1E293B] px-3 py-1 rounded-full border border-[#334155]">
                    Frames Processed: {frameCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* —— RESULT STEP —— */}
          {step === "result" && analysisResult && (
            <div className="space-y-6">
              {/* Hero result */}
              {analysisResult.accidentDetected ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-red-400 font-black text-2xl uppercase tracking-wider">
                    ⚠️ Accident Detected
                  </p>
                  <p className="text-white text-4xl font-bold mt-2">
                    {(analysisResult.confidence * 100).toFixed(2)}%
                    <span className="text-[#94A3B8] text-base font-normal ml-2">
                      confidence
                    </span>
                  </p>

                  {analysisResult.annotatedFrame && (
                    <div className="mt-4 p-2 bg-black rounded-lg inline-block border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                      <img
                        src={analysisResult.annotatedFrame}
                        alt="AI Annotated Frame"
                        className="rounded w-full max-h-[400px] object-contain"
                      />
                    </div>
                  )}

                  <div className="mt-6 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg py-3 px-4 inline-flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Incident auto-created and added to CCTV Alerts Board
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-black text-2xl uppercase tracking-wider">
                    No Accident Detected
                  </p>
                  <p className="text-[#94A3B8] text-sm mt-2">
                    The video finished processing without any accidents detected
                    matching out threshold criteria.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="flex-1 bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155]"
                >
                  View Alerts Board
                </Button>
                <Button
                  onClick={reset}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Analyze Another Feed
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// —— Main Page ——

const CCTVAlerts = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [responderName, setResponderName] = useState("");

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await api.getIncidents({ type: "CCTV" });
      setIncidents(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching CCTV alerts:", error);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleRespond = async (incidentId) => {
    if (!responderName.trim()) {
      toast.error("Enter a responder name in the header first");
      return;
    }
    try {
      await api.respondToIncident(incidentId, {
        responderId: `RESP-${Date.now()}`,
        responderName: responderName.trim(),
        responderType: "GOV",
      });
      toast.success("Response team assigned");
      fetchIncidents();
    } catch {
      toast.error("Failed to assign response team");
    }
  };

  const handleResolve = async (incidentId) => {
    try {
      await api.resolveIncident(incidentId);
      toast.success("Incident resolved");
      fetchIncidents();
    } catch {
      toast.error("Failed to resolve incident");
    }
  };

  const pending = incidents.filter((i) => i.status === "PENDING").length;
  const accepted = incidents.filter((i) => i.status === "ACCEPTED").length;
  const resolved = incidents.filter((i) => i.status === "RESOLVED").length;

  return (
    <GovLayout>
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onIncidentCreated={fetchIncidents}
        />
      )}

      <div className="p-6 space-y-6" data-testid="cctv-alerts-page">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">CCTV ALERTS</h1>
            <p className="text-[#94A3B8] mt-1">
              AI-Detected Incidents from Video Surveillance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="Responder Name"
              value={responderName}
              onChange={(e) => setResponderName(e.target.value)}
              className="bg-[#1E293B] border-[#334155] text-white w-48"
              data-testid="responder-name-input"
            />
            <Button
              onClick={() => setShowModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              data-testid="add-cctv-btn"
            >
              <Camera className="w-4 h-4 mr-2" />
              Add CCTV Footage
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Total CCTV",
              value: incidents.length,
              color: "text-white",
            },
            { label: "Pending", value: pending, color: "text-red-400" },
            { label: "Accepted", value: accepted, color: "text-yellow-400" },
            { label: "Resolved", value: resolved, color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-[#1E293B] border border-[#334155] rounded-lg p-4"
            >
              <p className="text-[#94A3B8] text-sm uppercase">{label}</p>
              <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Incident list */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#94A3B8] mx-auto" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-12 text-center">
              <Camera className="w-12 h-12 mx-auto mb-3 text-[#94A3B8] opacity-40" />
              <p className="text-[#94A3B8]">No CCTV alerts yet</p>
              <p className="text-[#64748B] text-sm mt-1">
                Upload CCTV footage to run AI accident detection
              </p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 hover:border-[#475569] transition-colors"
                data-testid={`cctv-incident-${incident.id}`}
              >
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <Camera className="w-5 h-5 text-red-400 shrink-0" />
                      <span
                        className={`px-2.5 py-1 rounded border text-xs font-bold uppercase ${STATUS_COLORS[incident.status] || STATUS_COLORS.PENDING}`}
                      >
                        {incident.status}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[incident.severity] || "bg-gray-500"}`}
                        />
                        <span className="text-white text-xs font-bold">
                          {incident.severity}
                        </span>
                      </div>
                      {incident.cctvAnalysis && (
                        <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold">
                          ðŸ¤– AI â€”{" "}
                          {(
                            incident.cctvAnalysis.accidentConfidence * 100
                          ).toFixed(1)}
                          % confidence
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-3 leading-tight">
                      {incident.description}
                    </h3>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[#94A3B8] text-xs">Location</p>
                          <p className="text-white font-medium">
                            {incident.location?.address ||
                              `${Number(incident.location?.lat).toFixed(4)}, ${Number(incident.location?.lng).toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[#94A3B8] text-xs">Detected at</p>
                          <p className="text-white font-medium font-mono text-xs">
                            {format(
                              new Date(incident.timestamp),
                              "dd MMM yyyy HH:mm:ss",
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Camera className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[#94A3B8] text-xs">Source</p>
                          <p className="text-white font-medium text-sm">
                            {incident.reportedBy || "AI CCTV System"}
                          </p>
                        </div>
                      </div>
                      {incident.responderName && (
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[#94A3B8] text-xs">Responder</p>
                            <p className="text-white font-medium">
                              {incident.responderName}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI confidence mini-bars (if available) */}
                    {incident.cctvAnalysis?.allConfidences && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {Object.entries(incident.cctvAnalysis.allConfidences)
                          .slice(0, 3)
                          .map(([cls, val]) => (
                            <div key={cls}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-[#64748B]">{cls}</span>
                                <span className="text-[#94A3B8]">
                                  {(val * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${CONFIDENCE_META[cls]?.color || "bg-gray-500"} rounded-full`}
                                  style={{
                                    width: `${(val * 100).toFixed(0)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {incident.status === "PENDING" && (
                      <Button
                        onClick={() => handleRespond(incident.id)}
                        className="bg-[#059669] hover:bg-[#047857] text-white text-sm"
                        data-testid={`respond-btn-${incident.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Accept & Respond
                      </Button>
                    )}
                    {incident.status === "ACCEPTED" && (
                      <Button
                        onClick={() => handleResolve(incident.id)}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm"
                        data-testid={`resolve-btn-${incident.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Mark Resolved
                      </Button>
                    )}
                    {incident.status === "RESOLVED" && (
                      <span className="text-green-400 text-sm font-semibold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GovLayout>
  );
};

export default CCTVAlerts;
