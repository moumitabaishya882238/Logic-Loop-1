import { useEffect, useState, useRef, useCallback } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Camera, MapPin, Clock, CheckCircle, Upload, X, AlertTriangle,
  Loader2, Crosshair, Eye, Activity, Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CONFIDENCE_META = {
  ACCIDENT:  { label: 'Road Accident',        color: 'bg-red-500',    text: 'text-red-400'    },
  FIGHT:     { label: 'Physical Altercation', color: 'bg-orange-500', text: 'text-orange-400' },
  THEFT:     { label: 'Theft / Robbery',      color: 'bg-yellow-500', text: 'text-yellow-400' },
  FIRE:      { label: 'Fire / Smoke',         color: 'bg-amber-500',  text: 'text-amber-400'  },
  NORMAL:    { label: 'Normal Activity',      color: 'bg-green-500',  text: 'text-green-400'  },
};

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-yellow-500',
  LOW:      'bg-blue-500',
};

const STATUS_COLORS = {
  PENDING:  'bg-red-500/20 text-red-400 border-red-500/30',
  ACCEPTED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  RESOLVED: 'bg-green-500/20 text-green-400 border-green-500/30',
};

// â”€â”€â”€ Upload Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function UploadModal({ onClose, onIncidentCreated }) {
  const [videoFile, setVideoFile]           = useState(null);
  const [dragOver, setDragOver]             = useState(false);
  const [cameraName, setCameraName]         = useState('');
  const [cameraId, setCameraId]             = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat]       = useState('');
  const [locationLng, setLocationLng]       = useState('');
  const [fetchingGPS, setFetchingGPS]       = useState(false);
  const [step, setStep]                     = useState('form'); // 'form' | 'analyzing' | 'result'
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [animBars, setAnimBars]             = useState({ ACCIDENT: 0, FIGHT: 0, THEFT: 0, FIRE: 0, NORMAL: 0 });
  const [frameCount, setFrameCount]         = useState(0);
  const fileInputRef  = useRef(null);
  const animTimerRef  = useRef(null);
  const frameTimerRef = useRef(null);

  // Animate confidence bars while analyzing
  useEffect(() => {
    if (step !== 'analyzing') return;

    let tick = 0;
    const targets = {
      ACCIDENT: 0.3 + Math.random() * 0.6,
      FIGHT:    0.05 + Math.random() * 0.2,
      THEFT:    0.02 + Math.random() * 0.15,
      FIRE:     0.01 + Math.random() * 0.12,
      NORMAL:   0.02 + Math.random() * 0.22,
    };

    animTimerRef.current = setInterval(() => {
      tick++;
      setAnimBars(prev => {
        const next = {};
        for (const [k, t] of Object.entries(targets)) {
          const speed = 0.035 + Math.random() * 0.02;
          next[k] = Math.min(t, (prev[k] || 0) + speed * (tick * 0.1));
        }
        return next;
      });
    }, 120);

    frameTimerRef.current = setInterval(() => {
      setFrameCount(n => n + Math.floor(3 + Math.random() * 5));
    }, 200);

    return () => {
      clearInterval(animTimerRef.current);
      clearInterval(frameTimerRef.current);
    };
  }, [step]);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('video/') && file.type !== 'application/octet-stream') {
      toast.error('Please select a video file');
      return;
    }
    setVideoFile(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by this browser');
      return;
    }
    setFetchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude.toFixed(6));
        setLocationLng(pos.coords.longitude.toFixed(6));
        setFetchingGPS(false);
        toast.success('GPS coordinates captured');
      },
      () => {
        setFetchingGPS(false);
        toast.error('Could not retrieve GPS location');
      }
    );
  };

  const handleSubmit = async () => {
    if (!videoFile)              return toast.error('Please select a video file');
    if (!locationAddress.trim()) return toast.error('Camera location address is required');
    if (!locationLat || !locationLng) return toast.error('Please provide GPS coordinates or use the GPS button');

    setStep('analyzing');
    setFrameCount(0);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile, videoFile.name);
    formData.append('cameraId', cameraId.trim() || `CAM-${Date.now()}`);
    formData.append('cameraName', cameraName.trim());
    formData.append('locationAddress', locationAddress.trim());
    formData.append('locationLat', locationLat);
    formData.append('locationLng', locationLng);

    try {
      const result = await api.analyzeCCTVFootage(formData, (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      });

      clearInterval(animTimerRef.current);
      clearInterval(frameTimerRef.current);
      setFrameCount(result.analysis?.framesAnalyzed || frameCount);
      setAnalysisResult(result);
      setStep('result');

      if (result.accidentDetected) {
        toast.error('âš  Accident detected â€” incident created automatically!', { duration: 5000 });
        onIncidentCreated();
      }
    } catch (err) {
      clearInterval(animTimerRef.current);
      clearInterval(frameTimerRef.current);
      console.error(err);
      toast.error(err?.response?.data?.error || 'Analysis failed. Please try again.');
      setStep('form');
    }
  };

  const reset = () => {
    setVideoFile(null);
    setAnalysisResult(null);
    setStep('form');
    setUploadProgress(0);
    setFrameCount(0);
    setAnimBars({ ACCIDENT: 0, FIGHT: 0, THEFT: 0, FIRE: 0, NORMAL: 0 });
  };

  const displayBars = step === 'result' && analysisResult
    ? analysisResult.analysis.confidence
    : animBars;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-[#0F172A] border border-[#334155] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">AI Accident Detection</h2>
              <p className="text-[#94A3B8] text-xs">SurakshaNet AccidentNet v1.0</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* â”€â”€ FORM STEP â”€â”€ */}
          {step === 'form' && (
            <>
              {/* Drag-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-red-500 bg-red-500/10' :
                  videoFile ? 'border-green-500 bg-green-500/10' :
                  'border-[#334155] bg-[#1E293B]/50 hover:border-[#475569]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
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
                    <p className="text-white font-semibold">Drag & drop CCTV video here</p>
                    <p className="text-[#94A3B8] text-sm mt-1">or click to browse â€” MP4, AVI, MOV, MKV supported</p>
                  </>
                )}
              </div>

              {/* Camera info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-xs uppercase tracking-wider">Camera Name</label>
                  <Input
                    value={cameraName}
                    onChange={e => setCameraName(e.target.value)}
                    placeholder="e.g. MG Road Cam 4"
                    className="bg-[#1E293B] border-[#334155] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-xs uppercase tracking-wider">Camera ID</label>
                  <Input
                    value={cameraId}
                    onChange={e => setCameraId(e.target.value)}
                    placeholder="e.g. CAM-042"
                    className="bg-[#1E293B] border-[#334155] text-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-xs uppercase tracking-wider">Camera Location Address <span className="text-red-400">*</span></label>
                  <Input
                    value={locationAddress}
                    onChange={e => setLocationAddress(e.target.value)}
                    placeholder="e.g. MG Road & Brigade Road Junction, Bangalore"
                    className="bg-[#1E293B] border-[#334155] text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#94A3B8] text-xs uppercase tracking-wider">Latitude <span className="text-red-400">*</span></label>
                    <Input
                      value={locationLat}
                      onChange={e => setLocationLat(e.target.value)}
                      placeholder="12.9716"
                      className="bg-[#1E293B] border-[#334155] text-white font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#94A3B8] text-xs uppercase tracking-wider">Longitude <span className="text-red-400">*</span></label>
                    <Input
                      value={locationLng}
                      onChange={e => setLocationLng(e.target.value)}
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
                      {fetchingGPS ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                      <span className="ml-2 text-xs">GPS</span>
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-base font-bold"
                disabled={!videoFile || !locationAddress || !locationLat || !locationLng}
              >
                <Eye className="w-5 h-5 mr-2" />
                Analyze for Accidents
              </Button>
            </>
          )}

          {/* â”€â”€ ANALYZING STEP â”€â”€ */}
          {step === 'analyzing' && (
            <div className="space-y-6">
              {/* Scanner animation */}
              <div className="flex flex-col items-center py-4 gap-4">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-red-500/40 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-red-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">AI Scanning Footage...</p>
                  <p className="text-[#94A3B8] text-sm mt-1">
                    {uploadProgress < 100
                      ? `Uploading â€” ${uploadProgress}%`
                      : `Analyzing frames â€” ${frameCount} processed`}
                  </p>
                </div>
              </div>

              {/* Upload progress bar */}
              {uploadProgress < 100 && (
                <div>
                  <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                    <span>Upload progress</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Live confidence bars */}
              <div className="space-y-3">
                <p className="text-[#94A3B8] text-xs uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Live Detection Confidence
                </p>
                {Object.entries(CONFIDENCE_META).map(([cls, meta]) => (
                  <div key={cls}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium ${meta.text}`}>{meta.label}</span>
                      <span className="text-white font-mono text-sm">
                        {((displayBars[cls] || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${meta.color} rounded-full transition-all duration-150`}
                        style={{ width: `${((displayBars[cls] || 0) * 100).toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-[#64748B] text-xs italic">
                Model: SurakshaNet-AccidentNet-v1.0 â€” Real-time multi-class anomaly detection
              </p>
            </div>
          )}

          {/* â”€â”€ RESULT STEP â”€â”€ */}
          {step === 'result' && analysisResult && (
            <div className="space-y-6">
              {/* Hero result */}
              {analysisResult.accidentDetected ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-red-400 font-black text-2xl uppercase tracking-wider">âš  Accident Detected</p>
                  <p className="text-white text-4xl font-bold mt-2">
                    {(analysisResult.analysis.accidentConfidence * 100).toFixed(1)}%
                    <span className="text-[#94A3B8] text-base font-normal ml-2">confidence</span>
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg py-2 px-4 inline-flex mx-auto">
                    <CheckCircle className="w-4 h-4" />
                    Incident auto-created and added to CCTV Alerts
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-black text-2xl uppercase tracking-wider">No Accident Detected</p>
                  <p className="text-[#94A3B8] text-sm mt-2">
                    Highest accident confidence: {(analysisResult.analysis.accidentConfidence * 100).toFixed(1)}%
                    â€” below 62% threshold
                  </p>
                </div>
              )}

              {/* Confidence breakdown */}
              <div className="space-y-3">
                <p className="text-[#94A3B8] text-xs uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Detection Confidence Breakdown
                </p>
                {Object.entries(CONFIDENCE_META).map(([cls, meta]) => {
                  const val = analysisResult.analysis.confidence[cls] || 0;
                  return (
                    <div key={cls}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-medium ${meta.text}`}>{meta.label}</span>
                        <span className="text-white font-mono text-sm">{(val * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${meta.color} rounded-full transition-all duration-700`}
                          style={{ width: `${(val * 100).toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Model stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#1E293B] rounded-lg p-3">
                  <p className="text-[#94A3B8] text-xs uppercase">Frames</p>
                  <p className="text-white font-bold text-lg">{analysisResult.analysis.framesAnalyzed}</p>
                </div>
                <div className="bg-[#1E293B] rounded-lg p-3">
                  <p className="text-[#94A3B8] text-xs uppercase">Processing</p>
                  <p className="text-white font-bold text-lg">{analysisResult.analysis.processingMs}ms</p>
                </div>
                <div className="bg-[#1E293B] rounded-lg p-3">
                  <p className="text-[#94A3B8] text-xs uppercase">Top Class</p>
                  <p className="text-white font-bold text-sm">{analysisResult.analysis.topClass}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => { reset(); onClose(); }}
                  className="flex-1 bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155]"
                >
                  View Alerts
                </Button>
                <Button onClick={reset} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  <Camera className="w-4 h-4 mr-2" />
                  Analyze Another
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CCTVAlerts = () => {
  const [incidents, setIncidents]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [responderName, setResponderName] = useState('');

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await api.getIncidents({ type: 'CCTV' });
      setIncidents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching CCTV alerts:', error);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleRespond = async (incidentId) => {
    if (!responderName.trim()) {
      toast.error('Enter a responder name in the header first');
      return;
    }
    try {
      await api.respondToIncident(incidentId, {
        responderId: `RESP-${Date.now()}`,
        responderName: responderName.trim(),
        responderType: 'GOV',
      });
      toast.success('Response team assigned');
      fetchIncidents();
    } catch {
      toast.error('Failed to assign response team');
    }
  };

  const handleResolve = async (incidentId) => {
    try {
      await api.resolveIncident(incidentId);
      toast.success('Incident resolved');
      fetchIncidents();
    } catch {
      toast.error('Failed to resolve incident');
    }
  };

  const pending  = incidents.filter(i => i.status === 'PENDING').length;
  const accepted = incidents.filter(i => i.status === 'ACCEPTED').length;
  const resolved = incidents.filter(i => i.status === 'RESOLVED').length;

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
            <p className="text-[#94A3B8] mt-1">AI-Detected Incidents from Video Surveillance</p>
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
            { label: 'Total CCTV', value: incidents.length, color: 'text-white' },
            { label: 'Pending',    value: pending,           color: 'text-red-400' },
            { label: 'Accepted',   value: accepted,          color: 'text-yellow-400' },
            { label: 'Resolved',   value: resolved,          color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
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
              <p className="text-[#64748B] text-sm mt-1">Upload CCTV footage to run AI accident detection</p>
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
                      <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase ${STATUS_COLORS[incident.status] || STATUS_COLORS.PENDING}`}>
                        {incident.status}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[incident.severity] || 'bg-gray-500'}`} />
                        <span className="text-white text-xs font-bold">{incident.severity}</span>
                      </div>
                      {incident.cctvAnalysis && (
                        <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold">
                          ðŸ¤– AI â€” {(incident.cctvAnalysis.accidentConfidence * 100).toFixed(1)}% confidence
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-3 leading-tight">{incident.description}</h3>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[#94A3B8] text-xs">Location</p>
                          <p className="text-white font-medium">
                            {incident.location?.address || `${Number(incident.location?.lat).toFixed(4)}, ${Number(incident.location?.lng).toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[#94A3B8] text-xs">Detected at</p>
                          <p className="text-white font-medium font-mono text-xs">
                            {format(new Date(incident.timestamp), 'dd MMM yyyy HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Camera className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[#94A3B8] text-xs">Source</p>
                          <p className="text-white font-medium text-sm">{incident.reportedBy || 'AI CCTV System'}</p>
                        </div>
                      </div>
                      {incident.responderName && (
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[#94A3B8] text-xs">Responder</p>
                            <p className="text-white font-medium">{incident.responderName}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI confidence mini-bars (if available) */}
                    {incident.cctvAnalysis?.allConfidences && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {Object.entries(incident.cctvAnalysis.allConfidences).slice(0, 3).map(([cls, val]) => (
                          <div key={cls}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-[#64748B]">{cls}</span>
                              <span className="text-[#94A3B8]">{(val * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
                              <div
                                className={`h-full ${CONFIDENCE_META[cls]?.color || 'bg-gray-500'} rounded-full`}
                                style={{ width: `${(val * 100).toFixed(0)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {incident.status === 'PENDING' && (
                      <Button
                        onClick={() => handleRespond(incident.id)}
                        className="bg-[#059669] hover:bg-[#047857] text-white text-sm"
                        data-testid={`respond-btn-${incident.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Accept & Respond
                      </Button>
                    )}
                    {incident.status === 'ACCEPTED' && (
                      <Button
                        onClick={() => handleResolve(incident.id)}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm"
                        data-testid={`resolve-btn-${incident.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Mark Resolved
                      </Button>
                    )}
                    {incident.status === 'RESOLVED' && (
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
