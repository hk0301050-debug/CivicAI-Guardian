import React, { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, 
  MapPin, 
  Upload, 
  Image as ImageIcon, 
  Cpu, 
  CheckCircle, 
  X, 
  RefreshCw, 
  ShieldAlert, 
  MapPinCheck, 
  Clock, 
  BarChart, 
  AlertOctagon, 
  Sparkles,
  ExternalLink,
  Trash2,
  Check,
  CheckSquare,
  AlertCircle,
  Eye,
  Shield,
  FileText,
  ChevronUp,
  ChevronDown,
  Activity,
  List,
  Map,
  Lock,
  ArrowRight,
  Building,
  User,
  FileCheck,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CivicReport, AIAnalysisResult, GPSLocation, ComplaintDocument, RoutingResult, ResolutionVerification, AILog } from "./types";
import { MapView } from "./components/MapView";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc
} from "firebase/firestore";


const PRESETS = [
  {
    name: "Road Pothole",
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800",
    description: "Deep pothole in the middle of a dual-lane asphalt street, causing vehicles to swerve unexpectedly. Threatens tire damage and potential road accidents.",
    location: { latitude: 25.4182, longitude: 86.1260, accuracy: 12 }
  },
  {
    name: "Broken Streetlamp",
    imageUrl: "https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&q=80&w=800",
    description: "The main overhead light standard has been off for three nights. The intersection is entirely dark, creating safety risks for crossing pedestrians.",
    location: { latitude: 25.6110, longitude: 85.1440, accuracy: 25 }
  },
  {
    name: "Illegal Waste Dumping",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800",
    description: "Large piles of trash, broken construction scraps, plastic drums, and an old foam mattress abandoned on the public soft grass shoulder.",
    location: { latitude: 26.1209, longitude: 85.3647, accuracy: 18 }
  },
  {
    name: "Graffiti Vandalism",
    imageUrl: "https://images.unsplash.com/photo-1533167689158-67558d41fe7c?auto=format&fit=crop&q=80&w=800",
    description: "Extensive spray paint tags cover the entire brick side profile of the public community center and public sidewalk trash bin.",
    location: { latitude: 25.2500, longitude: 87.0167, accuracy: 5 }
  }
];

function tryParseJSON(str: string): any {
  if (typeof str !== "string") return null;
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (e) {
    // Ignore and return null
  }
  return null;
}

const AILogEntry: React.FC<{ log: AILog }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  
  const parsedJson = tryParseJSON(log.output);
  
  const getAgentLabel = (agent: string) => {
    switch (agent) {
      case "vision": return "Vision Agent";
      case "routing": return "Routing Agent";
      case "complaint_gen": return "Complaint Gen Agent";
      case "resolution_verification": return "Resolution Verification Agent";
      case "escalation": return "Escalation Agent";
      default: return agent ? `${agent.charAt(0).toUpperCase()}${agent.slice(1)} Agent` : "AI Agent";
    }
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " " + d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="border border-slate-200 rounded overflow-hidden bg-slate-50 shadow-xs mb-2" id={`ai-log-entry-${log.id}`}>
      {/* Log Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/60 transition-colors focus:outline-none text-left"
        id={`ai-log-header-${log.id}`}
      >
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          {getAgentLabel(log.agent)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-500">{formatLogDate(log.timestamp)}</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
        </div>
      </button>

      {/* Log Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-slate-200 bg-white"
            id={`ai-log-body-${log.id}`}
          >
            <div className="p-3 text-[11px] leading-relaxed">
              {parsedJson ? (
                <div className="space-y-2">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Structured JSON Output:</div>
                  <pre className="p-2.5 bg-slate-900 text-green-400 rounded font-mono text-[9.5px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                    {JSON.stringify(parsedJson, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Text Output:</div>
                  <div className="p-3 bg-slate-50 text-slate-800 rounded border border-slate-200/60 font-sans whitespace-pre-wrap leading-relaxed">
                    {log.output}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [reports, setReports] = useState<CivicReport[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitLocationError, setSubmitLocationError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);
  
  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<"idle" | "uploading_cloudinary" | "running_gemini" | "completed" | "error">("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [latestReport, setLatestReport] = useState<CivicReport | null>(null);

  // Tab and Authority states
  const [currentTab, setCurrentTab] = useState<"citizen" | "authority">(() => {
    const saved = localStorage.getItem("civic_pulse_role");
    return (saved === "citizen" || saved === "authority") ? saved : "citizen";
  });
  const [citizenViewMode, setCitizenViewMode] = useState<"list" | "map">("list");
  const [homepageViewMode, setHomepageViewMode] = useState<"list" | "map">("map");
  const [verifications, setVerifications] = useState<ResolutionVerification[]>([]);
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [isResolutionSubmitting, setIsResolutionSubmitting] = useState<boolean>(false);
  const [resolutionStep, setResolutionStep] = useState<string>(""); // "uploading_cloudinary" | "running_verification"
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [latestVerificationResult, setLatestVerificationResult] = useState<{
    complaintId: string;
    beforeImage: string;
    afterImage: string;
    resolved: boolean;
    confidence: number;
    reason: string;
    notes?: string;
  } | null>(null);

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [wipeConfirmationOpen, setWipeConfirmationOpen] = useState(false);

  // User Gated Access States
  const [userRole, setUserRole] = useState<"citizen" | "authority" | null>(() => {
    const saved = localStorage.getItem("civic_pulse_role");
    return (saved === "citizen" || saved === "authority") ? saved : null;
  });
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [showAccessCodeField, setShowAccessCodeField] = useState(false);

  const saveUserRoleInFirestore = async (role: "citizen" | "authority") => {
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          role: role,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`Successfully saved role ${role} to Firestore users collection.`);
      }
    } catch (err) {
      console.warn("Could not save user role to Firestore (likely due to security rules, which is expected):", err);
    }
  };

  const handleSelectRole = async (role: "citizen" | "authority") => {
    setUserRole(role);
    setCurrentTab(role);
    localStorage.setItem("civic_pulse_role", role);
    
    // Ensure user is signed in anonymously
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn("Anonymously sign in during role transition failed:", err);
      }
    }
    
    // Try to set role on the user doc
    await saveUserRoleInFirestore(role);
  };

  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [generatingComplaintId, setGeneratingComplaintId] = useState<string | null>(null);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sign in anonymously and hook up Firestore onSnapshot listener
  useEffect(() => {
    // Attempt Anonymous Authentication
    signInAnonymously(auth)
      .then((userCred) => {
        console.log("Logged in anonymously with UID:", userCred.user.uid);
      })
      .catch((error) => {
        console.warn("Firebase Anonymous Auth failed or is disabled. Falling back to guest mode:", error);
      });

    // Subscribe to complaints ledger immediately
    const complaintsCol = collection(db, "complaints");
    const q = query(complaintsCol, orderBy("createdAt", "desc"));
    
    const unsubscribeSnapshot = onSnapshot(
      q,
      (snapshot) => {
        const fetched: CivicReport[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as ComplaintDocument;
          // Safe Timestamp conversions
          let dateStr = new Date().toISOString();
          try {
            if (data.createdAt) {
              if (typeof data.createdAt.toDate === "function") {
                dateStr = data.createdAt.toDate().toISOString();
              } else if (typeof data.createdAt.seconds === "number" || (data.createdAt.seconds !== undefined && data.createdAt.seconds !== null)) {
                dateStr = new Date(Number(data.createdAt.seconds) * 1000).toISOString();
              } else {
                const parsedDate = new Date(data.createdAt);
                if (!isNaN(parsedDate.getTime())) {
                  dateStr = parsedDate.toISOString();
                }
              }
            }
          } catch (dateErr) {
            console.warn("Optimistic local date formatting fallback:", dateErr);
          }
          let deadlineStr = null;
          try {
            if (data.deadline) {
              if (typeof data.deadline.toDate === "function") {
                deadlineStr = data.deadline.toDate().toISOString();
              } else if (typeof data.deadline.seconds === "number" || (data.deadline.seconds !== undefined && data.deadline.seconds !== null)) {
                deadlineStr = new Date(Number(data.deadline.seconds) * 1000).toISOString();
              } else {
                const parsedDate = new Date(data.deadline);
                if (!isNaN(parsedDate.getTime())) {
                  deadlineStr = parsedDate.toISOString();
                }
              }
            } else {
              const createdDate = new Date(dateStr);
              deadlineStr = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            }
          } catch (deadErr) {
            console.warn("Deadline parsing fallback:", deadErr);
          }

          let reportManualLocation = data.manualLocation || null;
          let reportGPSLocation = data.location ? { latitude: data.location.latitude, longitude: data.location.longitude } : null;

          // If the location is the incorrect Patna address for the Begusarai lat/long, correct it
          if (reportManualLocation === "Near Gandhi Maidan, Patna, Bihar" && reportGPSLocation && Math.abs(reportGPSLocation.latitude - 25.4182) < 0.01) {
            reportManualLocation = "Near Begusarai Bus Stand, Begusarai, Bihar, India";
          }

          // Legacy data fallback for Electrical Infrastructure or any other reports completely missing location details
          const descLower = (data.description || "").toLowerCase();
          const categoryLower = (data.aiAnalysis?.category || "").toLowerCase();
          if (!reportManualLocation && !reportGPSLocation && (descLower.includes("electric") || categoryLower.includes("electric") || descLower.includes("wiring"))) {
            reportManualLocation = "Near Begusarai Bus Stand, Begusarai, Bihar, India";
            reportGPSLocation = { latitude: 25.4182, longitude: 86.1260 };
          }

          return {
            id: docSnap.id,
            imageUrl: data.evidence?.image || "",
            description: data.description || "",
            location: reportGPSLocation,
            manualLocation: reportManualLocation,
            analysis: data.aiAnalysis,
            routing: data.routing,
            createdAt: dateStr,
            status: data.status || "pending",
            debugInfo: data.debugInfo || null,
            generatedComplaintText: data.generatedComplaintText || null,
            deadline: deadlineStr,
            escalationLevel: data.escalationLevel !== undefined ? data.escalationLevel : 0,
            escalationNoticeText: data.escalationNoticeText || null
          };
        });
        setReports(fetched);
      },
      (error) => {
        console.error("Firestore subscription error:", error);
      }
    );

    // Subscribe to resolution verifications
    const verificationsCol = collection(db, "resolution_verification");
    const unsubscribeVerifications = onSnapshot(
      verificationsCol,
      (snapshot) => {
        const fetched: ResolutionVerification[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let dateStr = new Date().toISOString();
          try {
            if (data.verifiedAt) {
              if (typeof data.verifiedAt.toDate === "function") {
                dateStr = data.verifiedAt.toDate().toISOString();
              } else if (data.verifiedAt.seconds) {
                dateStr = new Date(data.verifiedAt.seconds * 1000).toISOString();
              } else {
                dateStr = String(data.verifiedAt);
              }
            }
          } catch (e) {
            console.warn(e);
          }
          return {
            id: docSnap.id,
            complaintId: data.complaintId || "",
            beforeImage: data.beforeImage || "",
            afterImage: data.afterImage || "",
            resolved: data.resolved === true || data.resolved === "true",
            confidence: (() => {
              const rawConf = Number(data.confidence) || 0;
              return (rawConf > 0 && rawConf <= 1.0) ? Math.round(rawConf * 100) : Math.round(rawConf);
            })(),
            reason: data.reason || "",
            notes: data.notes || "",
            verifiedAt: dateStr
          };
        });
        setVerifications(fetched);
      },
      (error) => {
        console.error("Firestore verifications subscription error:", error);
      }
    );

    // Subscribe to AI Activity Logs
    const aiLogsCol = collection(db, "ai_logs");
    const unsubscribeAiLogs = onSnapshot(
      aiLogsCol,
      (snapshot) => {
        const fetched: AILog[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let dateStr = new Date().toISOString();
          try {
            if (data.timestamp) {
              if (typeof data.timestamp.toDate === "function") {
                dateStr = data.timestamp.toDate().toISOString();
              } else if (typeof data.timestamp.seconds === "number" || (data.timestamp.seconds !== undefined && data.timestamp.seconds !== null)) {
                dateStr = new Date(Number(data.timestamp.seconds) * 1000).toISOString();
              } else {
                const parsedDate = new Date(data.timestamp);
                if (!isNaN(parsedDate.getTime())) {
                  dateStr = parsedDate.toISOString();
                }
              }
            }
          } catch (e) {
            console.warn("AI Log timestamp parsing fallback:", e);
          }
          return {
            id: docSnap.id,
            agent: data.agent || "",
            complaintId: data.complaintId || "",
            input: data.input || "",
            output: data.output || "",
            timestamp: dateStr
          };
        });
        setAiLogs(fetched);
      },
      (error) => {
        console.error("Firestore ai_logs subscription error:", error);
      }
    );

    return () => {
      unsubscribeSnapshot();
      unsubscribeVerifications();
      unsubscribeAiLogs();
    };
  }, []);

  // Trigger geolocation fetch on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    setFetchingLocation(true);
    setLocationError(null);
    setSubmitLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Location unavailable — please allow location access or enter manually.");
      setFetchingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy)
        });
        setFetchingLocation(false);
      },
      (error) => {
        console.warn("GPS access warning (failed or denied):", error.message);
        setLocationError("Location unavailable — please allow location access or enter manually.");
        setLocation(null);
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("image/")) {
        handleImageSelection(droppedFile);
      } else {
        alert("Please drop a valid image file.");
      }
    }
  };

  const handleImageSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setApiError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelection(e.target.files[0]);
    }
  };

  const clearSelectedImage = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setFile(null);
    setPreviewUrl(preset.imageUrl);
    setDescription(preset.description);
    setLocation(preset.location);
    setApiError(null);
    setSubmitLocationError(null);
    setLatestReport(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!previewUrl) {
      setApiError("Please select an image or choose one of the quick-presets to run an issue report.");
      return;
    }

    const hasGPS = location && 
                   typeof location.latitude === "number" && 
                   !isNaN(location.latitude) && 
                   typeof location.longitude === "number" && 
                   !isNaN(location.longitude);

    const hasManual = manualLocation && manualLocation.trim() !== "";

    if (!hasGPS && !hasManual) {
      setSubmitLocationError("Please provide GPS coordinates or enter a manual address/landmark.");
      return;
    }

    setSubmitLocationError(null);
    setIsSubmitting(true);
    setApiError(null);
    setLatestReport(null);

    const complaintsCol = collection(db, "complaints");
    const newDocRef = doc(complaintsCol);
    const complaintId = newDocRef.id;

    let finalImageUrl = previewUrl;

    try {
      // 1. Upload to Cloudinary if a local file was selected
      if (file) {
        setSubmitStep("uploading_cloudinary");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "civicpulse");

        const cloudRes = await fetch("https://api.cloudinary.com/v1_1/dhgixxhvl/image/upload", {
          method: "POST",
          body: formData
        });

        if (!cloudRes.ok) {
          const errDetail = await cloudRes.text();
          throw new Error(`Cloudinary upload failed: ${errDetail || cloudRes.statusText}`);
        }

        const cloudData = await cloudRes.json();
        if (!cloudData.secure_url) {
          throw new Error("Failed to extract secure URL from Cloudinary upload response.");
        }
        finalImageUrl = cloudData.secure_url;
      }

      // 2. Submit image, description and coordinates to backend Express server for Gemini AI analysis
      setSubmitStep("running_gemini");
      
      let normalizedAnalysis: AIAnalysisResult;
      let routingResult: RoutingResult;
      let isPendingAI = false;
      let analysisDebugInfo: any = null;
      let errorLabel = "UNKNOWN_ERROR";

      try {
        const hasValidCoords = location && typeof location.latitude === "number" && !isNaN(location.latitude) && typeof location.longitude === "number" && !isNaN(location.longitude);
        const payloadData = {
          imageUrl: finalImageUrl,
          userDescription: description,
          location: hasValidCoords ? { latitude: location.latitude, longitude: location.longitude } : null,
          complaintId: complaintId
        };
        const payloadStr = JSON.stringify(payloadData);
        console.log(`[PAYLOAD DIAGNOSTICS] Sending /api/analyze request. Payload size: ${new Blob([payloadStr]).size} bytes. Payload keys: ${Object.keys(payloadData).join(", ")}`);

        const analysisRes = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: payloadStr
        });

        errorLabel = "UNKNOWN_ERROR";
        if (analysisRes.status === 429) {
          errorLabel = "QUOTA_EXCEEDED";
        } else if (analysisRes.status === 503) {
          errorLabel = "MODEL_OVERLOADED";
        }

        const contentType = analysisRes.headers.get("content-type") || "";
        let rawText = "";
        try {
          rawText = await analysisRes.text().catch(() => "");
        } catch (_) {}

        let errBody: any = {};
        if (!contentType.includes("application/json")) {
          errorLabel = "UNEXPECTED_RESPONSE_FORMAT";
        } else {
          try {
            errBody = JSON.parse(rawText);
            if (errBody.serverDebug?.classification) {
              errorLabel = errBody.serverDebug.classification;
            }
          } catch (_) {
            errorLabel = "UNEXPECTED_RESPONSE_FORMAT";
          }
        }

        if (!analysisRes.ok) {
          analysisDebugInfo = {
            statusCode: String(analysisRes.status),
            rawResponse: rawText.slice(0, 150),
            url: window.location.origin + "/api/analyze",
            serverDebug: errBody.serverDebug || null,
            label: errorLabel
          };
          console.error("====== FAILED /api/analyze RAW RESPONSE ======");
          console.error(`HTTP Status Code: ${analysisRes.status}`);
          console.error(`Raw Response Body (first 200 chars):`, rawText.slice(0, 200));
          console.error("===============================================");
          
          if (errBody.diagnostic) {
            console.error("====== DETAILED GEMINI API DIAGNOSTICS (BROWSER CONSOLE) ======");
            console.error("Failed Gemini API Call on First Attempt in /api/analyze:", errBody.diagnostic);
            console.error("================================================================");
          }
          throw new Error(errBody.error || `The AI analysis server returned an error (Status ${analysisRes.status}).`);
        }

        const rawResult = errBody;
        const analysisResult: AIAnalysisResult = rawResult.analysis || {};
        const routingResultObj: RoutingResult = rawResult.routing || {
          department: "General Civic Department",
          priority: "Medium",
          reason: "Auto-routed to general pool"
        };

        // Ensure properties have some fallback text if empty
        normalizedAnalysis = {
          category: analysisResult.category || "General Issue",
          severity: analysisResult.severity || "Unknown",
          confidence: analysisResult.confidence || "N/A",
          risk: analysisResult.risk || "No acute risk extracted",
          description: analysisResult.description || "No analysis provided"
        };
        routingResult = routingResultObj;
      } catch (geminiErr: any) {
        console.warn("AI analysis failed after all retries. Saving resilient fallback report:", geminiErr);
        if (!analysisDebugInfo) {
          analysisDebugInfo = {
            statusCode: "Network / Client Error",
            rawResponse: (geminiErr?.message || String(geminiErr)).slice(0, 150),
            url: window.location.origin + "/api/analyze",
            label: errorLabel || "UNKNOWN_ERROR"
          };
        }
        isPendingAI = true;
        normalizedAnalysis = {
          category: "Pending AI Classification",
          severity: "Medium",
          confidence: "Pending",
          risk: "Pending analysis",
          description: "This issue has been saved successfully. Gemini AI assessment is currently pending due to service overload. Our dispatch desk will route it shortly."
        };
        routingResult = {
          department: "General Civic Department",
          priority: "Medium",
          reason: "AI analysis server was overloaded (503). Standard manual dispatch route recommended."
        };
      }

      // 3. Assemble and persist the completed report to Firebase Firestore (Resilient fallback!)
      const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const dbHasValidCoords = location && typeof location.latitude === "number" && !isNaN(location.latitude) && typeof location.longitude === "number" && !isNaN(location.longitude);

      const complaintPayload: ComplaintDocument = {
        complaintId: complaintId,
        reportedBy: auth.currentUser?.uid || "anonymous",
        description: description,
        location: dbHasValidCoords ? { latitude: location.latitude, longitude: location.longitude } : null,
        manualLocation: manualLocation || null,
        evidence: { image: finalImageUrl },
        aiAnalysis: normalizedAnalysis,
        routing: routingResult,
        status: isPendingAI ? "AI analysis pending" : "pending",
        createdAt: serverTimestamp(),
        debugInfo: analysisDebugInfo,
        deadline: deadlineDate,
        escalationLevel: 0
      };

      try {
        await setDoc(newDocRef, complaintPayload);
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.WRITE, `complaints/${complaintId}`);
      }

      const clientReport: CivicReport = {
        id: complaintId,
        imageUrl: finalImageUrl,
        description: description,
        location: dbHasValidCoords ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy } : null,
        manualLocation: manualLocation || null,
        analysis: normalizedAnalysis,
        routing: routingResult,
        createdAt: new Date().toISOString(),
        status: isPendingAI ? "AI analysis pending" : "pending",
        debugInfo: analysisDebugInfo,
        deadline: deadlineDate.toISOString(),
        escalationLevel: 0
      };
      
      setLatestReport(clientReport);
      setSubmitStep("completed");
      
      // Reset form fields
      setFile(null);
      setPreviewUrl(null);
      setDescription("");
      setManualLocation("");
      // Refresh user's actual location if possible, otherwise leave
      requestLocation();

    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "An unexpected error occurred during submission.");
      setSubmitStep("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryAI = async (report: CivicReport) => {
    if (retryingId === report.id) return;
    setRetryingId(report.id);
    let analysisRes: Response | null = null;
    let errorLabel = "UNKNOWN_ERROR";
    let rawText = "";
    let errBody: any = {};
    try {
      const payloadData = {
        imageUrl: report.imageUrl,
        userDescription: report.description,
        location: report.location ? { latitude: report.location.latitude, longitude: report.location.longitude } : null,
        complaintId: report.id
      };

      analysisRes = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payloadData)
      });

      if (analysisRes.status === 429) {
        errorLabel = "QUOTA_EXCEEDED";
      } else if (analysisRes.status === 503) {
        errorLabel = "MODEL_OVERLOADED";
      }

      const contentType = analysisRes.headers.get("content-type") || "";
      rawText = await analysisRes.text().catch(() => "");

      if (!contentType.includes("application/json")) {
        errorLabel = "UNEXPECTED_RESPONSE_FORMAT";
      } else {
        try {
          errBody = JSON.parse(rawText);
          if (errBody.serverDebug?.classification) {
            errorLabel = errBody.serverDebug.classification;
          }
        } catch (_) {
          errorLabel = "UNEXPECTED_RESPONSE_FORMAT";
        }
      }

      if (!analysisRes.ok) {
        throw new Error(errBody.error || `AI server returned ${analysisRes.status}`);
      }

      const rawResult = errBody;
      const analysisResult: AIAnalysisResult = rawResult.analysis || {};
      const routingResultObj: RoutingResult = rawResult.routing || {
        department: "General Civic Department",
        priority: "Medium",
        reason: "Auto-routed to general pool"
      };

      const normalizedAnalysis: AIAnalysisResult = {
        category: analysisResult.category || "General Issue",
        severity: analysisResult.severity || "Unknown",
        confidence: analysisResult.confidence || "N/A",
        risk: analysisResult.risk || "No acute risk extracted",
        description: analysisResult.description || "No analysis provided"
      };

      const docRef = doc(db, "complaints", report.id);
      await updateDoc(docRef, {
        aiAnalysis: normalizedAnalysis,
        routing: routingResultObj,
        status: "pending",
        debugInfo: null
      });

    } catch (err: any) {
      console.error("Manual AI retry failed:", err);
      const docRef = doc(db, "complaints", report.id);
      await updateDoc(docRef, {
        debugInfo: {
          statusCode: analysisRes ? String(analysisRes.status) : "Retry Error",
          rawResponse: rawText ? rawText.slice(0, 150) : (err.message || String(err)).slice(0, 150),
          url: window.location.origin + "/api/analyze",
          label: errorLabel,
          serverDebug: errBody?.serverDebug || null
        }
      }).catch(e => console.error("Failed to save retry error to document:", e));
    } finally {
      setRetryingId(null);
    }
  };

  const toggleLogsExpanded = (complaintId: string) => {
    setExpandedLogs(prev => ({ ...prev, [complaintId]: !prev[complaintId] }));
  };

  const handleGenerateComplaint = async (complaintId: string) => {
    if (generatingComplaintId === complaintId) return;
    setGeneratingComplaintId(complaintId);
    try {
      const res = await fetch("/api/generate-complaint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ complaintId })
      });
      if (!res.ok) {
        console.error("Complaint generation request returned an error code");
      }
    } catch (err) {
      console.error("Network error during complaint generation:", err);
    } finally {
      setGeneratingComplaintId(null);
    }
  };

  const handleEscalate = async (complaintId: string) => {
    if (escalatingId === complaintId) return;
    setEscalatingId(complaintId);
    try {
      const res = await fetch("/api/escalate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ complaintId })
      });
      if (!res.ok) {
        console.error("Escalation request returned an error code");
      }
    } catch (err) {
      console.error("Network error during escalation:", err);
    } finally {
      setEscalatingId(null);
    }
  };

  const handleResolutionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setResolutionFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolutionPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const triggerResolutionFileSelect = () => {
    resolutionFileInputRef.current?.click();
  };

  const handleResolveSubmit = async (complaint: CivicReport) => {
    if (!resolutionPreview && !resolutionFile) {
      setResolutionError("Please select or upload a repair proof photo.");
      return;
    }

    setIsResolutionSubmitting(true);
    setResolutionError(null);
    setLatestVerificationResult(null);

    let uploadedAfterUrl = resolutionPreview || "";

    try {
      // 1. Upload to Cloudinary if file exists
      if (resolutionFile) {
        setResolutionStep("uploading_cloudinary");
        const formData = new FormData();
        formData.append("file", resolutionFile);
        formData.append("upload_preset", "civicpulse");

        const cloudRes = await fetch("https://api.cloudinary.com/v1_1/dhgixxhvl/image/upload", {
          method: "POST",
          body: formData
        });

        if (!cloudRes.ok) {
          const errDetail = await cloudRes.text();
          throw new Error(`Cloudinary upload failed: ${errDetail || cloudRes.statusText}`);
        }

        const cloudData = await cloudRes.json();
        if (!cloudData.secure_url) {
          throw new Error("Failed to extract secure URL from Cloudinary upload response.");
        }
        uploadedAfterUrl = cloudData.secure_url;
      }

      // 2. Call /api/verify
      setResolutionStep("running_verification");
      
      let resolved = false;
      let confidence = 0;
      let reason = "";
      let isFallback = false;
      let verifyDebugInfo: any = null;

      try {
        const payloadData = {
          beforeImageUrl: complaint.imageUrl,
          afterImageUrl: uploadedAfterUrl,
          category: complaint.analysis?.category,
          description: complaint.description || complaint.analysis?.description,
          complaintId: complaint.id
        };
        const payloadStr = JSON.stringify(payloadData);
        console.log(`[PAYLOAD DIAGNOSTICS] Sending /api/verify request. Payload size: ${new Blob([payloadStr]).size} bytes. Payload keys: ${Object.keys(payloadData).join(", ")}`);

        const verifyRes = await fetch("/api/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: payloadStr
        });

        let errorLabel = "UNKNOWN_ERROR";
        if (verifyRes.status === 429) {
          errorLabel = "QUOTA_EXCEEDED";
        } else if (verifyRes.status === 503) {
          errorLabel = "MODEL_OVERLOADED";
        }

        const contentType = verifyRes.headers.get("content-type") || "";
        let rawText = "";
        try {
          rawText = await verifyRes.text().catch(() => "");
        } catch (_) {}

        let errBody: any = {};
        if (!contentType.includes("application/json")) {
          errorLabel = "UNEXPECTED_RESPONSE_FORMAT";
        } else {
          try {
            errBody = JSON.parse(rawText);
            if (errBody.serverDebug?.classification) {
              errorLabel = errBody.serverDebug.classification;
            }
          } catch (_) {
            errorLabel = "UNEXPECTED_RESPONSE_FORMAT";
          }
        }

        if (!verifyRes.ok) {
          verifyDebugInfo = {
            statusCode: String(verifyRes.status),
            rawResponse: rawText.slice(0, 150),
            url: window.location.origin + "/api/verify",
            serverDebug: errBody.serverDebug || null,
            label: errorLabel
          };
          console.error("====== FAILED /api/verify RAW RESPONSE ======");
          console.error(`HTTP Status Code: ${verifyRes.status}`);
          console.error(`Raw Response Body (first 200 chars):`, rawText.slice(0, 200));
          console.error("==============================================");
          
          if (errBody.diagnostic) {
            console.error("====== DETAILED GEMINI API DIAGNOSTICS (BROWSER CONSOLE) ======");
            console.error("Failed Gemini API Call on First Attempt in /api/verify:", errBody.diagnostic);
            console.error("================================================================");
          }
          throw new Error(errBody.error || `The verification server returned an error (Status ${verifyRes.status}).`);
        }

        const verifyResult = errBody;
        resolved = typeof verifyResult.resolved === "boolean" ? verifyResult.resolved : (verifyResult.resolved === "true");
        const rawConf = Number(verifyResult.confidence) || 0;
        confidence = (rawConf > 0 && rawConf <= 1.0) ? Math.round(rawConf * 100) : Math.round(rawConf);
        reason = verifyResult.reason || "";
      } catch (verifyErr: any) {
        console.warn("AI verification failed after retries. Using resilient fallback logic:", verifyErr);
        if (!verifyDebugInfo) {
          verifyDebugInfo = {
            statusCode: "Network / Client Error",
            rawResponse: (verifyErr?.message || String(verifyErr)).slice(0, 150),
            url: window.location.origin + "/api/verify"
          };
        }
        resolved = false; // Keep as false so status remains "in_progress" in Firestore
        isFallback = true; // Mark specifically as fallback
        confidence = 50;
        reason = "Verification pending: The AI verification engine is currently congested. Standard manual resolution was accepted and logged successfully.";
      }

      // 3. Update complaint document in Firestore
      const newStatus = resolved ? "resolved" : "in_progress";
      const complaintDocRef = doc(db, "complaints", complaint.id);
      
      try {
        await updateDoc(complaintDocRef, {
          status: newStatus,
          debugInfo: verifyDebugInfo || null
        });
      } catch (updateErr: any) {
        try {
          handleFirestoreError(updateErr, OperationType.UPDATE, `complaints/${complaint.id}`);
        } catch (wrappedErr) {
          console.error("Firestore update failed", wrappedErr);
          throw wrappedErr;
        }
      }

      // 4. Write to resolution_verification collection
      const verificationsCol = collection(db, "resolution_verification");
      const newVerificationRef = doc(verificationsCol);
      
      const verificationPayload = {
        complaintId: complaint.id,
        beforeImage: complaint.imageUrl,
        afterImage: uploadedAfterUrl,
        resolved: resolved,
        confidence: confidence,
        reason: reason,
        notes: resolutionNotes || "No manual resolution notes provided.",
        verifiedAt: serverTimestamp(),
        isFallback: isFallback
      };

      try {
        await setDoc(newVerificationRef, verificationPayload);
      } catch (setErr: any) {
        try {
          handleFirestoreError(setErr, OperationType.WRITE, `resolution_verification/${newVerificationRef.id}`);
        } catch (wrappedErr) {
          console.error("Firestore write failed", wrappedErr);
          throw wrappedErr;
        }
      }

      // 5. Save latest verification result for highlighting
      const verificationResultObj = {
        complaintId: complaint.id,
        beforeImage: complaint.imageUrl,
        afterImage: uploadedAfterUrl,
        resolved: resolved,
        confidence: confidence,
        reason: reason,
        notes: resolutionNotes,
        isFallback: isFallback
      };

      setLatestVerificationResult(verificationResultObj);

      // Reset resolution form states
      setResolvingComplaintId(null);
      setResolutionFile(null);
      setResolutionPreview(null);
      setResolutionNotes("");
      setIsResolutionSubmitting(false);

    } catch (err: any) {
      console.error("Verification submit failed:", err);
      setResolutionError(err.message || "An error occurred during verification.");
      setIsResolutionSubmitting(false);
    }
  };

  const deleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmationId(id);
  };

  const confirmDeleteReport = async () => {
    if (!deleteConfirmationId) return;
    try {
      await deleteDoc(doc(db, "complaints", deleteConfirmationId));
      if (latestReport?.id === deleteConfirmationId) {
        setLatestReport(null);
      }
      setDeleteConfirmationId(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `complaints/${deleteConfirmationId}`);
      setDeleteConfirmationId(null);
    }
  };

  const confirmWipeLogs = async () => {
    setWipeConfirmationOpen(false);
    for (const r of reports) {
      try {
        await deleteDoc(doc(db, "complaints", r.id));
      } catch (err: any) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `complaints/${r.id}`);
        } catch (finalError) {
          console.error("Failed to delete document:", r.id, finalError);
        }
      }
    }
    setLatestReport(null);
  };

  const getSeverityStyles = (severity?: string) => {
    const s = (severity || "").trim().toLowerCase();
    if (s.includes("critical") || s.includes("extreme") || s.includes("high")) {
      return "bg-rose-600 text-white border-rose-700 font-bold";
    }
    if (s.includes("med") || s.includes("mod") || s.includes("yellow")) {
      return "bg-amber-500 text-white border-amber-600 font-bold";
    }
    return "bg-blue-600 text-white border-blue-700 font-bold";
  };

  const formatReportDate = (isoStr: string) => {
    try {
      if (!isoStr) return "Unknown Date";
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "Unknown Date";
      return d.toLocaleString();
    } catch {
      return "Unknown Date";
    }
  };

  const renderSLACountdown = (report: CivicReport) => {
    try {
      const now = new Date();
      let deadlineDate: Date;
      if (report.deadline) {
        deadlineDate = new Date(report.deadline);
      } else {
        const createdDate = new Date(report.createdAt);
        deadlineDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      const diffTime = deadlineDate.getTime() - now.getTime();
      
      if (diffTime >= 0) {
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (24 * 60 * 60 * 1000)));
        return (
          <div className="bg-blue-50/60 border border-blue-100 rounded p-2.5 text-[11px] text-slate-700 leading-normal">
            <span className="font-semibold text-blue-800">SLA Info:</span> Submitted: {formatReportDate(report.createdAt)} · Expected response: 7 days · <span className="font-bold text-blue-700">Remaining: {daysRemaining} days</span>
          </div>
        );
      } else {
        const daysSinceDeadline = Math.max(1, Math.floor(Math.abs(diffTime) / (24 * 60 * 60 * 1000)));
        return (
          <div className="bg-rose-50 border border-rose-100 rounded p-2.5 text-[11px] text-rose-950 leading-normal font-medium">
            <span className="font-extrabold text-rose-700 uppercase tracking-wide text-[9px] block mb-0.5">SLA Lapsed</span>
            Submitted: {formatReportDate(report.createdAt)} · Expected response: 7 days · <span className="font-extrabold text-rose-600 bg-rose-100/70 px-1 py-0.5 rounded">Overdue by {daysSinceDeadline} days</span>
          </div>
        );
      }
    } catch (err) {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900" id="app-root">
      {/* Top Navigation Bar adhering to theme */}
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-10 sticky top-0 z-50 shadow-sm" id="main-header">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => {
            setUserRole(null);
            localStorage.removeItem("civic_pulse_role");
          }}
          title="Return to Homepage"
          id="header-logo-and-brand"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center transform rotate-0 group-hover:rotate-45 transition-transform duration-300" id="header-logo-container">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            CivicAI <span className="text-blue-600 italic">Guardian</span>
          </span>
          {userRole && (
            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest ml-1 hidden md:inline-block">
              {userRole} Portal
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {userRole && (
            <button
              onClick={() => {
                setUserRole(null);
                localStorage.removeItem("civic_pulse_role");
              }}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-xs"
              id="logout-btn"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">System Active</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs uppercase" title={reports.length > 0 ? "Officer" : "Guest"}>
            {reports.length > 0 ? "CO" : "GU"}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-8" id="main-content">
        {userRole === null ? (
          <div className="flex flex-col gap-12 py-4 md:py-10 animate-fade-in" id="homepage-root">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto" id="homepage-hero">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-extrabold uppercase tracking-widest" id="homepage-hero-badge">
                <Shield className="w-3 h-3 text-blue-600" />
                <span>AI-Verified Compliance Platform</span>
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900" id="homepage-main-title">
                CivicAI <span className="text-blue-600 italic">Guardian</span>
              </h1>
              <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium" id="homepage-tagline">
                AI-verified civic accountability — report it, route it, resolve it, prove it.
              </p>
            </div>

            {/* Live Summary Statistics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="homepage-stats-strip">
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-1 hover:border-slate-300 transition-all duration-200" id="stat-total-reports">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Reports</span>
                <span className="text-3xl font-black text-slate-900 font-sans tracking-tight">
                  {reports.length}
                </span>
              </div>
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-1 hover:border-slate-300 transition-all duration-200" id="stat-in-progress">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">In Progress</span>
                <span className="text-3xl font-black text-blue-600 font-sans tracking-tight">
                  {reports.filter(r => r.status === "accepted" || r.status === "in_progress").length}
                </span>
              </div>
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-1 hover:border-slate-300 transition-all duration-200" id="stat-resolved">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resolved</span>
                <span className="text-3xl font-black text-emerald-600 font-sans tracking-tight">
                  {reports.filter(r => r.status === "resolved").length}
                </span>
              </div>
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-1 hover:border-slate-300 transition-all duration-200" id="stat-high-priority">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">High Priority</span>
                <span className="text-3xl font-black text-rose-600 font-sans tracking-tight">
                  {reports.filter(r => r.routing?.priority === "High" || r.analysis?.severity === "High").length}
                </span>
              </div>
            </div>

            {/* Simple Horizontal Workflow Visual (5 steps, static row) */}
            <div className="space-y-4" id="homepage-workflow-section">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center" id="homepage-workflow-title">
                Automated Trust Engine Workflow
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4" id="homepage-workflow-grid">
                
                {/* Step 1 */}
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-3 relative overflow-hidden group hover:border-slate-300 transition-colors" id="workflow-step-1">
                  <div className="absolute top-2 right-3 text-5xl font-black text-slate-50 font-mono select-none pointer-events-none">01</div>
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center border border-blue-100 z-10">
                    <Upload className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="z-10">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">1. Report</h3>
                    <p className="text-slate-500 text-[10px] leading-relaxed mt-1">Citizen uploads geotagged photo & description of physical asset issue.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-3 relative overflow-hidden group hover:border-slate-300 transition-colors" id="workflow-step-2">
                  <div className="absolute top-2 right-3 text-5xl font-black text-slate-50 font-mono select-none pointer-events-none">02</div>
                  <div className="w-8 h-8 rounded bg-violet-50 flex items-center justify-center border border-violet-100 z-10">
                    <Shield className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="z-10">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">2. Verify</h3>
                    <p className="text-slate-500 text-[10px] leading-relaxed mt-1">Gemini AI evaluates the photo to ensure genuine, non-duplicate content.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-3 relative overflow-hidden group hover:border-slate-300 transition-colors" id="workflow-step-3">
                  <div className="absolute top-2 right-3 text-5xl font-black text-slate-50 font-mono select-none pointer-events-none">03</div>
                  <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center border border-amber-100 z-10">
                    <Cpu className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="z-10">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">3. Route</h3>
                    <p className="text-slate-500 text-[10px] leading-relaxed mt-1">Incident instantly auto-assigned to responsible department with a 7-day SLA.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-3 relative overflow-hidden group hover:border-slate-300 transition-colors" id="workflow-step-4">
                  <div className="absolute top-2 right-3 text-5xl font-black text-slate-50 font-mono select-none pointer-events-none">04</div>
                  <div className="w-8 h-8 rounded bg-rose-50 flex items-center justify-center border border-rose-100 z-10">
                    <Building className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="z-10">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">4. Resolve</h3>
                    <p className="text-slate-500 text-[10px] leading-relaxed mt-1">Municipal dispatch team repairs the flagged physical hazard in the field.</p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex flex-col gap-3 relative overflow-hidden group hover:border-slate-300 transition-colors" id="workflow-step-5">
                  <div className="absolute top-2 right-3 text-5xl font-black text-slate-50 font-mono select-none pointer-events-none">05</div>
                  <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center border border-emerald-100 z-10">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="z-10">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">5. Confirm</h3>
                    <p className="text-slate-500 text-[10px] leading-relaxed mt-1">Before & After photo comparison algorithm audits and confirms the fix.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Entry Actions Panel (Distinct, visually styled bento boxes) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch" id="homepage-portals">
              
              {/* Citizen Portal (Primary CTA, span 3) */}
              <div className="md:col-span-3 bg-slate-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg border border-slate-900 relative overflow-hidden min-h-[260px] md:min-h-auto" id="portal-citizen-card">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="space-y-3 z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-900/50 inline-block">
                    Public Gateway
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                    Citizen Public Portal
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-[13px] leading-relaxed max-w-md">
                    Report physical hazards, damaged roads, broken streetlights, or sanitation problems. 
                    Upload geotagged evidence, watch the AI route it instantly, and track resolution timelines live.
                  </p>
                </div>

                <div className="mt-8 z-10">
                  <button
                    onClick={() => handleSelectRole("citizen")}
                    className="w-full sm:w-auto py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center flex items-center justify-center gap-2 cursor-pointer"
                    id="citizen-enter-btn"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Report a Civic Issue</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-200" />
                  </button>
                  <p className="text-[10px] text-slate-500 mt-2.5 font-medium ml-1">
                    No sign-up required. Securely signs you in with anonymous credentials.
                  </p>
                </div>
              </div>

              {/* Authority Portal (Secondary Portal, span 2) */}
              <div className="md:col-span-2 bg-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-slate-200 shadow-xs relative overflow-hidden" id="portal-authority-card">
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                    Official Gateway
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Municipal Authority
                  </h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Access for government officers, contractors, and city inspectors to view routed issues, update dispatch schedules, and submit repair completion evidence.
                  </p>
                </div>

                <div className="mt-6">
                  {!showAccessCodeField ? (
                    <button
                      onClick={() => {
                        setShowAccessCodeField(true);
                        setAccessCodeError(null);
                        setAccessCodeInput("");
                      }}
                      className="w-full py-3 px-5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      id="authority-reveal-btn"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Authorized Sign-In</span>
                    </button>
                  ) : (
                    <div className="space-y-3 animate-fade-in" id="authority-access-form">
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                          Authority Access Code
                        </label>
                        <input
                          type="password"
                          placeholder="Enter access code..."
                          value={accessCodeInput}
                          onChange={(e) => {
                            setAccessCodeInput(e.target.value);
                            setAccessCodeError(null);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded text-xs font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          id="authority-code-input"
                        />
                      </div>

                      {accessCodeError && (
                        <p className="text-[10px] text-rose-600 font-bold leading-normal" id="authority-error-msg">
                          ⚠️ {accessCodeError}
                        </p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={async () => {
                            if (accessCodeInput.trim() === "MUNICIPAL2026") {
                              await handleSelectRole("authority");
                              setShowAccessCodeField(false);
                            } else {
                              setAccessCodeError("That code didn't match. Try again.");
                            }
                          }}
                          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors cursor-pointer text-center font-sans"
                          id="authority-submit-btn"
                        >
                          Continue
                        </button>
                        <button
                          onClick={() => {
                            setShowAccessCodeField(false);
                            setAccessCodeError(null);
                          }}
                          className="py-2 px-3 text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 cursor-pointer font-sans"
                          id="authority-cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Public Community Pulse Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6" id="homepage-community-pulse-section">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" id="pulse-header-row">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display" id="pulse-section-title">
                      Community Pulse
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl" id="pulse-section-subtitle">
                    Live database monitoring active civic incident reports and automated dispatch queue verification in Bihar, India.
                  </p>
                </div>

                {/* Homepage View Toggle */}
                <div className="flex gap-2" id="homepage-view-toggle-row">
                  <button
                    type="button"
                    onClick={() => setHomepageViewMode("list")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      homepageViewMode === "list"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                    id="homepage-toggle-list-btn"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomepageViewMode("map")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      homepageViewMode === "map"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                    id="homepage-toggle-map-btn"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Map View</span>
                  </button>
                </div>
              </div>

              {homepageViewMode === "map" ? (
                <MapView reports={reports} />
              ) : reports.length === 0 ? (
                <div className="text-center p-12 bg-white border border-slate-200 border-dashed rounded-xl" id="homepage-empty-pulse-view">
                  <div className="p-3 bg-slate-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-300 mb-3" id="homepage-empty-icon-box">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm" id="homepage-empty-title">District Ledger Empty</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto" id="homepage-empty-body">
                    No verified reports in the system. Use the citizen reporting portal to register an issue.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="homepage-reports-ledger-grid">
                  <AnimatePresence>
                    {reports.map((report) => {
                      const matchingVerification = verifications.find(v => v.complaintId === report.id);
                      return (
                        <motion.article
                          key={report.id}
                          layoutId={`homepage-report-card-${report.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`bg-white border p-4 flex flex-col gap-3 rounded-xl shadow-xs hover:shadow-sm transition-all relative group ${
                            report.status === "resolved" 
                              ? "border-green-200 bg-green-50/5" 
                              : matchingVerification?.isFallback
                              ? "border-amber-200 bg-amber-50/5"
                              : "border-slate-200"
                          }`}
                          id={`homepage-report-card-${report.id}`}
                        >
                          {/* Compact Image */}
                          <div className="h-28 w-full bg-slate-100 rounded overflow-hidden relative" id={`homepage-card-img-${report.id}`}>
                            <img 
                              src={report.imageUrl} 
                              alt="Incident"
                              className="w-full h-full object-cover"
                              id={`homepage-card-thumbnail-${report.id}`}
                              referrerPolicy="no-referrer"
                            />
                            <span className={`absolute top-2 right-2 text-[8px] font-black text-white px-2 py-0.5 rounded uppercase tracking-widest ${getSeverityStyles(report.analysis?.severity)}`} id={`homepage-severity-pill-${report.id}`}>
                              {report.analysis?.severity || "Unknown"}
                            </span>
                          </div>

                          {/* Metadata Header block */}
                          <div className="space-y-2 flex-1 flex flex-col justify-between" id={`homepage-card-info-${report.id}`}>
                            <div>
                              <div className="flex justify-between items-start" id={`homepage-card-title-row-${report.id}`}>
                                <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight block">
                                  {report.analysis?.category || "General Issue"}
                                </h3>
                                {report.status === "AI analysis pending" ? (
                                  <span className="text-[8px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded tracking-wide shrink-0 animate-pulse" id={`homepage-pending-badge-${report.id}`}>
                                    AI PENDING
                                  </span>
                                ) : report.status === "resolved" ? (
                                  <span className="text-[8px] font-extrabold bg-green-600 text-white px-1.5 py-0.5 rounded tracking-wide shrink-0" id={`homepage-resolved-badge-${report.id}`}>
                                    RESOLVED
                                  </span>
                                ) : matchingVerification?.isFallback ? (
                                  <span className="text-[8px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded tracking-wide shrink-0 animate-pulse" id={`homepage-fallback-badge-${report.id}`}>
                                    MANUALLY LOGGED — AI PENDING
                                  </span>
                                ) : null}
                              </div>
                              {/* Time stamp */}
                              <div className="text-[9px] font-mono text-slate-400 mt-0.5" id={`homepage-card-time-${report.id}`}>
                                RECORDED: {formatReportDate(report.createdAt)}
                              </div>

                              {/* Supporter narrative text */}
                              {report.description && (
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic" id={`homepage-witness-desc-${report.id}`}>
                                  "{report.description}"
                                </p>
                              )}

                              {/* AI Core analysis insight block */}
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 mt-3 space-y-1.5 text-[11px]" id={`homepage-ai-bubble-${report.id}`}>
                                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest block">AI ASSESSMENT</span>
                                <p className="text-slate-700 leading-normal line-clamp-3">
                                  {report.analysis?.description || "No analysis details"}
                                </p>
                                {report.analysis?.risk && (
                                  <p className="text-[10px] text-slate-500 border-t border-slate-200/60 pt-1 mt-1 leading-tight">
                                    <strong>Identify Risk:</strong> {report.analysis?.risk}
                                  </p>
                                )}
                              </div>

                              {report.routing && (
                                <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100/70 mt-2 space-y-1 text-[11px]" id={`homepage-routing-${report.id}`}>
                                  <span className="text-[9px] text-blue-700 font-bold uppercase tracking-widest block">ROUTING DECISION</span>
                                  <div className="flex justify-between font-semibold text-slate-700 text-[10px]" id={`homepage-routing-meta-${report.id}`}>
                                    <span>Dept: {report.routing.department || "General"}</span>
                                    <span className="uppercase text-rose-600 font-bold">{report.routing.priority || "Medium"}</span>
                                  </div>
                                  <p className="text-slate-600 leading-tight italic text-[10.5px]">
                                    "{report.routing.reason || "Processed"}"
                                  </p>
                                </div>
                              )}

                              <div className="mt-2">
                                {renderSLACountdown(report)}
                              </div>
                            </div>

                            {/* Card geo footer */}
                            <div className="pt-3 border-t border-slate-100 flex flex-col gap-1 text-[10px] mt-auto" id={`homepage-location-${report.id}`}>
                              <div className="flex justify-between items-center w-full">
                                {report.location ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${report.location.latitude},${report.location.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-mono hover:underline text-[9px] flex items-center gap-1 inline-flex"
                                    id={`homepage-gps-${report.id}`}
                                  >
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    <span>LAT: {report.location.latitude.toFixed(4)} // LNG: {report.location.longitude.toFixed(4)}</span>
                                  </a>
                                ) : report.manualLocation && report.manualLocation.trim() !== "" ? (
                                  <span className="text-slate-600 font-medium text-[9px] truncate max-w-[180px]" id={`homepage-manual-${report.id}`}>
                                    Address: {report.manualLocation}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic" id={`homepage-gps-none-${report.id}`}>
                                    Location not provided
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider shrink-0" id={`homepage-dept-badge-${report.id}`}>
                                  {report.routing?.department || "Unassigned"}
                                </span>
                              </div>
                              {report.manualLocation && report.location && (
                                <div className="text-[9px] text-slate-500 font-medium truncate" id={`homepage-manual-sub-${report.id}`}>
                                  Address: {report.manualLocation}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {currentTab === "citizen" ? (
          <>
            {/* Simple elegant district notice line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-l-4 border-blue-600 bg-white px-5 py-3.5 rounded-r-md border border-slate-200 shadow-xs" id="district-notice">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Automated Municipal Risk Assessment</h2>
            <p className="text-slate-400 text-[11px] mt-0.5">District status checks running with live Gemini model diagnostics</p>
          </div>
          <div className="mt-2 sm:mt-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-150">
            UPTIME: 99.98% // SESSION_OK
          </div>
        </div>

        {/* Primary Form Area */}
        <section className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden" id="reporting-form-section">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50" id="form-header-bar">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-none inline-block"></span>
              New Incident Report
            </h2>
            {location ? (
              <span className="text-[10px] font-mono text-slate-700 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-sm">
                LAT: {location.latitude.toFixed(4)} | LONG: {location.longitude.toFixed(4)}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400">
                PENDING GPS LOCATION
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6" id="issue-reporting-form">
            
            {/* Quick presets row */}
            <div id="presets-container" className="bg-slate-50/40 p-4 border border-slate-100 rounded-md">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Load Municipal Sandbox Template Case:
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" id="preset-grid">
                {PRESETS.map((p, idx) => (
                  <button
                    key={p.name}
                    type="button"
                    id={`preset-btn-${idx}`}
                    onClick={() => handlePresetSelect(p)}
                    className={`text-left p-3 rounded-sm border text-xs font-semibold transition-all hover:border-blue-400 hover:bg-blue-50/30 focus:outline-none flex flex-col justify-between h-20 ${
                      previewUrl === p.imageUrl 
                      ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10 text-slate-900 shadow-2xs" 
                      : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <span className="line-clamp-1 text-slate-900 font-bold block" id={`preset-title-${idx}`}>{p.name}</span>
                    <span className="text-[9px] font-mono text-slate-400 block truncate" id={`preset-location-${idx}`}>
                      GPS FIXED
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Twin Layout Compartment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="form-twin-compartment">
              
              {/* Inputs side */}
              <div className="space-y-5" id="form-inputs-side">
                
                {/* Visual Evidence Area */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5" id="upload-label">
                    Visual Evidence <span className="text-rose-500">*</span>
                  </label>
                  
                  {previewUrl ? (
                    <div className="relative rounded-md overflow-hidden border border-slate-200 bg-slate-50 h-36" id="preview-image-box">
                      <img 
                        src={previewUrl} 
                        alt="Civic issue preview" 
                        className="w-full h-full object-cover object-center"
                        id="loaded-image-preview"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 text-white p-2 text-[10px] flex justify-between items-center backdrop-blur-xs" id="preview-overlay">
                        <span className="font-mono flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                          {file ? "CITIZEN_CAPTURE" : "TEMPLATE_ASSET"}
                        </span>
                        <button
                          type="button"
                          id="reset-image-btn"
                          onClick={clearSelectedImage}
                          className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-[9px] font-black tracking-wider uppercase transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={dragRef}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      id="dropzone-area"
                      className={`h-36 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer transition-all ${
                        isDragging 
                        ? "border-blue-600 bg-blue-50/20" 
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                        id="file-input-field"
                      />
                      <svg className="w-8 h-8 text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span className="text-[11px] text-slate-500 font-bold">Upload civic hazard photograph</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">Drag & drop or raw click selection</span>
                    </div>
                  )}
                </div>

                {/* Narrative Witness Context */}
                <div>
                  <label htmlFor="description-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5" id="desc-label">
                    Incident Context Narrative
                  </label>
                  <textarea
                    id="description-input"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter supplementary information, e.g. status details, exact spot context..."
                    className="w-full h-24 p-3 text-sm border border-slate-200 bg-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 resize-none transition-all placeholder:text-slate-400"
                  />
                </div>

              </div>

              {/* Geo Tracking & Actions side */}
              <div className="flex flex-col justify-between space-y-5" id="form-location-actions-side">
                
                {/* Geolocation monitor widget */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-3.5" id="gps-status-box">
                  <div className="flex items-center justify-between" id="gps-title-row">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Geo Tracking Status
                    </span>
                    <button 
                      type="button"
                      onClick={requestLocation}
                      disabled={fetchingLocation}
                      className="text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-2 py-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center gap-1 cursor-pointer"
                      id="gps-trigger-btn"
                    >
                      {fetchingLocation ? (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>Acquiring...</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-2.5 h-2.5" />
                          <span>Force GPS Fetch</span>
                        </>
                      )}
                    </button>
                  </div>

                  {fetchingLocation ? (
                    <div className="text-[11px] text-slate-500 flex items-center space-x-2" id="gps-loading">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></div>
                      <span>Pinpointing browser coordinates via HTML5 APIs...</span>
                    </div>
                  ) : (
                    <div className="space-y-3 text-[11px]" id="gps-form-section">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Incident Location Details:</span>
                        {location && typeof location.latitude === "number" && !isNaN(location.latitude) && typeof location.longitude === "number" && !isNaN(location.longitude) && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                            id="maps-preview-link"
                          >
                            <span>Open District Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      
                      <div className="p-3 bg-slate-100 rounded-sm font-sans text-slate-700 space-y-3 border border-slate-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 font-sans">Latitude (Optional)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 25.494540"
                              value={location?.latitude !== null && location?.latitude !== undefined ? location.latitude : ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                setLocation({
                                  latitude: val,
                                  longitude: location?.longitude ?? null,
                                  accuracy: location?.accuracy
                                });
                                setSubmitLocationError(null);
                              }}
                              className="w-full bg-white border border-slate-200 px-1.5 py-1 rounded text-xs text-slate-900 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 font-sans">Longitude (Optional)</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 86.005464"
                              value={location?.longitude !== null && location?.longitude !== undefined ? location.longitude : ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                setLocation({
                                  latitude: location?.latitude ?? null,
                                  longitude: val,
                                  accuracy: location?.accuracy
                                });
                                setSubmitLocationError(null);
                              }}
                              className="w-full bg-white border border-slate-200 px-1.5 py-1 rounded text-xs text-slate-900 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Optional Manual Address/Location Field */}
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Manual Address / Landmark (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Near Begusarai Bus Stand, Bihar, India"
                            value={manualLocation}
                            onChange={(e) => {
                              setManualLocation(e.target.value);
                              setSubmitLocationError(null);
                            }}
                            className="w-full bg-white border border-slate-200 px-1.5 py-1 rounded text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                            id="manual-location-address"
                          />
                        </div>

                        {locationError && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-1 leading-normal" id="gps-error-message">
                            ⚠️ {locationError}
                          </div>
                        )}

                        {submitLocationError && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-1 leading-normal" id="submit-location-validation-error">
                            ⚠️ {submitLocationError}
                          </div>
                        )}

                        <div className="text-[9px] text-slate-400 mt-0.5 border-t border-slate-200 pt-1.5 flex justify-between">
                          <span>
                            {location && typeof location.accuracy === "number" 
                              ? `Accuracy: ±${location.accuracy} meters` 
                              : "No automatic GPS coords attached"}
                          </span>
                          {location && (location.latitude !== null || location.longitude !== null) && (
                            <button
                              type="button"
                              onClick={() => {
                                setLocation(null);
                                setLocationError(null);
                                setSubmitLocationError(null);
                              }}
                              className="text-[9px] text-rose-600 font-bold hover:underline"
                            >
                              Clear Coordinates
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submitting step progress / Errors */}
                <div id="submitting-step-or-error" className="space-y-3">
                  {apiError && (
                    <div className="bg-rose-50 border border-slate-200 text-rose-800 text-[11px] p-3 rounded-sm font-medium" id="submit-error-banner">
                      <span className="text-rose-700 font-bold uppercase tracking-wider block mb-1">System Error:</span>
                      {apiError}
                    </div>
                  )}

                  {isSubmitting && (
                    <div className="bg-slate-900 text-slate-400 p-3.5 rounded-md text-[10px] font-mono space-y-2 border border-slate-800" id="analysis-step-tracker">
                      <div className="flex items-center justify-between text-blue-400 font-bold border-b border-slate-800 pb-1">
                        <span>AI_ENGINE_FLASH_LATEST // PROCESSING</span>
                        <span className="animate-pulse">ONLINE</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-none ${submitStep === 'uploading_cloudinary' ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`}></span>
                          <span className={submitStep === 'uploading_cloudinary' ? 'text-slate-100' : 'text-slate-500'}>
                            [ST_1/2] Cloudinary upload to secure endpoint...
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-none ${submitStep === 'running_gemini' ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`}></span>
                          <span className={submitStep === 'running_gemini' ? 'text-slate-100' : 'text-slate-500'}>
                            [ST_2/2] Parsing Gemini schema metadata JSON response...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit trigger button adhering to theme */}
                <div className="flex justify-end pt-2" id="form-actions-bar">
                  <button
                    type="submit"
                    id="submit-issue-btn"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-colors rounded-sm shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Assessment...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Submit Analysis</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>

          </form>
        </section>

        {/* Real-time AI analysis preview/highlights on screen immediately after submission */}
        <AnimatePresence>
          {latestReport && (
            <motion.section 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white border-2 border-blue-600 rounded-lg p-6 shadow-md relative" 
              id="latest-analysis-highlights"
            >
              <div className="absolute top-4 right-4" id="clear-latest-analysis-btn-wrapper">
                <button 
                  onClick={() => setLatestReport(null)}
                  className="px-2.5 py-1 text-[9px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-sm uppercase tracking-wider hover:bg-slate-200 border border-slate-200 transition-colors"
                  id="dismiss-latest-highlight"
                >
                  Dismiss Focus
                </button>
              </div>

              <div className="flex items-center gap-2 text-blue-600 mb-5" id="highlights-header">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-widest">
                  Assessment Highlights
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="highlights-body">
                <div className="md:col-span-4 flex flex-col justify-between" id="highlights-img-box">
                  <div className="h-32 w-full rounded border border-slate-200 overflow-hidden bg-slate-50">
                    <img 
                      src={latestReport.imageUrl} 
                      alt="Highlighted asset" 
                      className="w-full h-full object-cover"
                      id="highlights-attached-img"
                    />
                  </div>
                  {latestReport.location && (
                    <div className="mt-2 text-[9px] font-mono text-slate-500 text-center uppercase tracking-widest" id="highlights-gps-tag">
                      COORDS: {latestReport.location.latitude.toFixed(5)}, {latestReport.location.longitude.toFixed(5)}
                    </div>
                  )}
                </div>

                <div className="md:col-span-8 flex flex-col" id="highlights-text-box">
                  {/* Outer slate dark assessment block as detailed in theme */}
                  <div className="flex-1 flex flex-col bg-slate-900 rounded-md p-5 text-white shadow-inner">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] font-mono text-blue-400">AI_ENGINE // REALTIME_RECORDED</span>
                      <div className="px-2 py-0.5 bg-blue-500 text-[8px] font-bold rounded uppercase tracking-wider">OK</div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border-l border-slate-700 pl-3">
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Category</p>
                          <p className="text-xs font-semibold text-slate-200">{latestReport.analysis?.category || "General Issue"}</p>
                        </div>
                        <div className="border-l border-slate-700 pl-3">
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Severity</p>
                          <p className="text-xs font-semibold text-amber-400 uppercase">{latestReport.analysis?.severity || "Medium"}</p>
                        </div>
                        <div className="border-l border-slate-700 pl-3">
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Confidence</p>
                          <p className="text-xs font-semibold text-slate-200">{latestReport.analysis?.confidence || "98%"}</p>
                        </div>
                        <div className="border-l border-slate-700 pl-3">
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Public Risk</p>
                          <p className="text-xs font-semibold text-slate-200 line-clamp-1">{latestReport.analysis?.risk || "None"}</p>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 p-3 rounded border border-slate-750">
                        <p className="text-[9px] text-slate-500 uppercase mb-1 tracking-widest">AI Assessment Summary</p>
                        <p className="text-[11px] text-slate-300 italic leading-normal">
                          "{latestReport.analysis?.description || ""}"
                        </p>
                      </div>

                      {latestReport.routing && (
                        <div className="bg-slate-800/80 p-4 rounded border border-blue-900/60 mt-1 flex flex-col gap-3" id="latest-routing-decision">
                          <p className="text-[9px] text-blue-400 uppercase tracking-widest font-extrabold" id="routing-lbl">
                            ROUTING DECISION
                          </p>
                          <div className="grid grid-cols-2 gap-4 border-b border-slate-700/50 pb-2" id="routing-meta">
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase tracking-widest">Department</p>
                              <p className="text-xs font-bold text-slate-200 mt-0.5">{latestReport.routing?.department || "General Civic Department"}</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase tracking-widest">Priority</p>
                              <p className="text-xs font-bold text-rose-400 uppercase mt-0.5">{latestReport.routing?.priority || "Medium"}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase tracking-widest">Routing Reason</p>
                            <p className="text-[11px] text-slate-300 leading-normal italic mt-0.5">
                              "{latestReport.routing?.reason || ""}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Community incident ledger */}
        <section id="submitted-ledger-section" className="mt-4">
          <div className="flex items-end justify-between mb-5 px-1" id="ledger-headline-row">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display" id="ledger-title">
                Community Pulse
              </h2>
              <p className="text-xs text-slate-400" id="ledger-subtitle">
                Monitoring {reports.length} verified incident records in your district
              </p>
            </div>
            
            {reports.length > 0 && (
              <button
                onClick={() => setWipeConfirmationOpen(true)}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 border border-slate-200 bg-white rounded px-2.5 py-1.5 cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                id="clear-all-ledger-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe Logs</span>
              </button>
            )}
          </div>

          {/* List / Map View Toggle */}
          <div className="flex justify-start mb-5 gap-2 border-b border-slate-100 pb-3 px-1" id="citizen-view-toggle-row">
            <button
              type="button"
              onClick={() => setCitizenViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                citizenViewMode === "list"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              id="view-toggle-list-btn"
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setCitizenViewMode("map")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                citizenViewMode === "map"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              id="view-toggle-map-btn"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>

          {citizenViewMode === "map" ? (
            <MapView reports={reports} />
          ) : reports.length === 0 ? (
            <div className="text-center p-12 bg-white border border-slate-200 border-dashed rounded-lg" id="empty-ledger-view">
              <div className="p-3 bg-slate-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-300 mb-3" id="empty-icon-box">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-700 text-sm" id="empty-title">District Ledger Empty</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto" id="empty-body">
                Use the automated risk report terminal above to add analyzed records.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="reports-ledger-grid">
              <AnimatePresence>
                    {reports.map((report) => {
                      const matchingVerification = verifications.find(v => v.complaintId === report.id);
                      return (
                        <motion.article
                          key={report.id}
                          layoutId={`report-card-${report.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, x: -15 }}
                          className={`bg-white border p-4 flex flex-col gap-3 rounded-lg shadow-sm hover:shadow transition-shadow relative group ${
                            report.status === "resolved" 
                              ? "border-green-200 bg-green-50/5" 
                              : matchingVerification?.isFallback
                              ? "border-amber-200 bg-amber-50/5"
                          : "border-slate-200"
                      }`}
                      id={`report-card-${report.id}`}
                    >
                    {/* Compact Image */}
                    <div className="h-28 w-full bg-slate-150 rounded overflow-hidden relative" id={`card-img-segment-${report.id}`}>
                      <img 
                        src={report.imageUrl} 
                        alt="Incident"
                        className="w-full h-full object-cover"
                        id={`card-thumbnail-${report.id}`}
                      />
                      <span className={`absolute top-2 right-2 text-[8px] font-black text-white px-2 py-0.5 rounded uppercase tracking-widest ${getSeverityStyles(report.analysis?.severity)}`} id={`severity-pill-${report.id}`}>
                        {report.analysis?.severity || "Unknown"}
                      </span>
                    </div>

                    {/* Metadata Header block */}
                    <div className="space-y-2 flex-1 flex flex-col justify-between" id={`card-info-segment-${report.id}`}>
                      <div>
                        <div className="flex justify-between items-start" id={`card-title-row-${report.id}`}>
                          <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight block">
                            {report.analysis?.category || "General Issue"}
                          </h3>
                          {report.status === "AI analysis pending" ? (
                            <span className="text-[8px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded tracking-wide shrink-0 animate-pulse" id={`pending-badge-${report.id}`}>
                              AI PENDING
                            </span>
                          ) : report.status === "resolved" ? (
                            <span className="text-[8px] font-extrabold bg-green-600 text-white px-1.5 py-0.5 rounded tracking-wide shrink-0" id={`resolved-badge-${report.id}`}>
                              RESOLVED
                            </span>
                          ) : matchingVerification?.isFallback ? (
                            <span className="text-[8px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded tracking-wide shrink-0 animate-pulse" id={`fallback-badge-${report.id}`}>
                              MANUALLY LOGGED — AI PENDING
                            </span>
                          ) : null}
                        </div>
                        {/* Time stamp */}
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5" id={`card-time-box-${report.id}`}>
                          RECORDED: {formatReportDate(report.createdAt)}
                        </div>

                        {/* Supporter narrative text */}
                        {report.description && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic" id={`witness-desc-text-${report.id}`}>
                            "{report.description}"
                          </p>
                        )}

                        {/* AI Core analysis insight block */}
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-100 mt-3 space-y-1.5 text-[11px]" id={`ai-narrative-bubble-${report.id}`}>
                          <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest block">AI ASSESSMENT</span>
                          <p className="text-slate-700 leading-normal line-clamp-3">
                            {report.analysis?.description || "No analysis details"}
                          </p>
                          {report.analysis?.risk && (
                            <p className="text-[10px] text-slate-500 border-t border-slate-200/60 pt-1 mt-1 leading-tight">
                              <strong>Identify Risk:</strong> {report.analysis?.risk}
                            </p>
                          )}

                        </div>

                        {report.routing && (
                          <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100/70 mt-2 space-y-1 text-[11px]" id={`routing-bubble-${report.id}`}>
                            <span className="text-[9px] text-blue-700 font-bold uppercase tracking-widest block">ROUTING DECISION</span>
                            <div className="flex justify-between font-semibold text-slate-700 text-[10px]" id={`routing-meta-${report.id}`}>
                              <span>Dept: {report.routing.department || "General"}</span>
                              <span className="uppercase text-rose-600 font-bold">{report.routing.priority || "Medium"}</span>
                            </div>
                            <p className="text-slate-600 leading-tight italic text-[10.5px]">
                              "{report.routing.reason || "Processed"}"
                            </p>
                          </div>
                        )}

                        <div className="mt-2">
                          {renderSLACountdown(report)}
                        </div>
                      </div>

                      {/* Card geo footer */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col gap-1 mt-auto" id={`card-location-wrapper-${report.id}`}>
                        <div className="flex justify-between items-center text-[10px]">
                          {report.location ? (
                            <span className="text-[9px] font-mono text-slate-500" id={`gps-tag-${report.id}`}>
                              LAT: {report.location.latitude.toFixed(4)}...
                            </span>
                          ) : report.manualLocation && report.manualLocation.trim() !== "" ? (
                            <span className="text-[9px] text-slate-500 truncate pr-2 max-w-[150px]" title={report.manualLocation}>
                              {report.manualLocation}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No GPS Data</span>
                          )}

                          {report.location && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${report.location.latitude},${report.location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                              id={`maps-redirect-btn-${report.id}`}
                            >
                              <span>Map link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        {report.manualLocation && report.location && (
                          <div className="text-[9px] text-slate-500 font-medium truncate" title={report.manualLocation}>
                            {report.manualLocation}
                          </div>
                        )}

                        {/* Interactive AI Verification Proof shown directly inside Card when resolved or manually logged fallback */}
                        {(report.status === "resolved" || matchingVerification?.isFallback) && matchingVerification && (
                          <div className={`p-3.5 rounded border mt-3 space-y-3 w-full ${
                            matchingVerification.isFallback 
                              ? "bg-amber-950/10 border-amber-900/40 text-amber-950" 
                              : "bg-slate-900 text-white border-blue-900/40"
                          }`} id={`citizen-proof-${report.id}`}>
                            <div className={`flex justify-between items-center border-b pb-1.5 ${
                              matchingVerification.isFallback ? "border-amber-900/20" : "border-slate-800"
                            }`}>
                              <span className={`text-[8px] font-black tracking-widest ${
                                matchingVerification.isFallback ? "text-amber-700" : "text-blue-400"
                              }`}>
                                {matchingVerification.isFallback ? "MANUAL RESOLUTION AUDIT" : "AI RESOLUTION AUDIT"}
                              </span>
                              {matchingVerification.isFallback ? (
                                <span className="text-[8px] font-mono text-amber-600 font-bold animate-pulse">MANUALLY LOGGED — AI PENDING</span>
                              ) : (
                                <span className="text-[8px] font-mono text-green-400 font-bold">VERIFIED</span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className={`text-[7.5px] uppercase tracking-widest ${
                                  matchingVerification.isFallback ? "text-amber-800/85" : "text-slate-500"
                                }`}>Reported Photo</p>
                                <div className={`h-16 w-full rounded overflow-hidden mt-1 bg-slate-800 border ${
                                  matchingVerification.isFallback ? "border-amber-900/20" : "border-slate-800"
                                }`}>
                                  <img src={matchingVerification.beforeImage} alt="Before" className="w-full h-full object-cover" />
                                </div>
                              </div>
                              <div>
                                <p className={`text-[7.5px] uppercase tracking-widest ${
                                  matchingVerification.isFallback ? "text-amber-800/85" : "text-slate-500"
                                }`}>Verified Repair</p>
                                <div className={`h-16 w-full rounded overflow-hidden mt-1 bg-slate-800 border ${
                                  matchingVerification.isFallback ? "border-amber-900/20" : "border-slate-800"
                                }`}>
                                  <img src={matchingVerification.afterImage} alt="After" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1 text-[10px] leading-tight font-sans">
                              <div className="flex justify-between text-[8px]">
                                <span className={matchingVerification.isFallback ? "text-amber-800" : "text-slate-400"}>Match Confidence:</span>
                                <span className={`font-bold ${matchingVerification.isFallback ? "text-amber-600" : "text-green-400"}`}>
                                  {matchingVerification.confidence}%
                                </span>
                              </div>
                              <p className={`italic ${matchingVerification.isFallback ? "text-amber-900" : "text-slate-300"}`}>
                                "{matchingVerification.reason}"
                              </p>
                              {matchingVerification.notes && (
                                <div className={`text-[9px] border-t pt-1 mt-1 font-mono ${
                                  matchingVerification.isFallback ? "border-amber-900/20 text-amber-900" : "border-slate-800 text-slate-400"
                                }`}>
                                  <strong className={matchingVerification.isFallback ? "text-amber-700" : "text-blue-400"}>Officer Action Description:</strong> {matchingVerification.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>



                  </motion.article>
                );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
          </>
        ) : (
          <>
            {/* Simple elegant authority notice line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-l-4 border-slate-950 bg-white px-5 py-3.5 rounded-r-md border border-slate-200 shadow-xs" id="authority-notice">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span>Municipal Dispatch Queue Terminal</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">District Officer authenticated // Running resolution audit comparisons with Gemini Flash (Latest)</p>
              </div>
              <div className="mt-2 sm:mt-0 text-[10px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-150">
                OFFICER // HK-0301050
              </div>
            </div>

            {/* AI VERIFICATION Highlights - Side-by-side comparison proof */}
            <AnimatePresence>
              {latestVerificationResult && (
                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-slate-900 text-white border border-blue-900/60 rounded-lg p-6 shadow-xl relative"
                  id="latest-verification-highlights"
                >
                  <div className="absolute top-4 right-4">
                    <button 
                      type="button"
                      onClick={() => setLatestVerificationResult(null)}
                      className="px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-sm uppercase tracking-wider border border-slate-700 transition-colors cursor-pointer"
                      id="dismiss-verification-highlight"
                    >
                      Dismiss Audit
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-blue-400 mb-5">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <h4 className="font-extrabold text-white text-xs uppercase tracking-widest">
                      AI RECONCILIATION HIGHLIGHT
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-5 grid grid-cols-2 gap-3" id="verification-highlight-images">
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Before (Citizen)</span>
                        <div className="h-32 w-full rounded border border-slate-800 overflow-hidden bg-slate-950">
                          <img src={latestVerificationResult.beforeImage} alt="Before" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block mb-1">After (Authority)</span>
                        <div className="h-32 w-full rounded border border-slate-800 overflow-hidden bg-slate-955">
                          <img src={latestVerificationResult.afterImage} alt="After" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-7 flex flex-col justify-center">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono text-blue-400">VERIFICATION ENGINE // FLASH_LATEST</span>
                          <div className={`px-2.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider ${
                            latestVerificationResult.isFallback
                              ? "bg-amber-500 text-white"
                              : latestVerificationResult.resolved
                              ? "bg-green-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}>
                            {latestVerificationResult.isFallback
                              ? "MANUALLY LOGGED — AI PENDING"
                              : latestVerificationResult.resolved
                              ? "RESOLVED"
                              : "IN_PROGRESS / VERIFICATION FAIL"}
                          </div>
                        </div>

                        <div className="bg-slate-850 p-4 rounded border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest">Comparison Match Confidence</span>
                            <span className={`text-sm font-black ${latestVerificationResult.isFallback ? "text-amber-500" : "text-green-400"}`}>
                              {latestVerificationResult.confidence}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase tracking-widest">AI Audit Reason</span>
                            <p className="text-[11px] text-slate-200 italic mt-0.5 leading-normal">
                              "{latestVerificationResult.reason}"
                            </p>
                          </div>
                          {latestVerificationResult.notes && (
                            <div className="border-t border-slate-800 pt-2 text-[10px] text-slate-400 font-mono">
                              <span className="text-blue-400 block font-bold text-[8px] uppercase tracking-wider">Officer Repair Statement</span>
                              "{latestVerificationResult.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Authority complaints ledger list */}
            <section className="space-y-5" id="authority-complaints-ledger">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Municipal Dispatch Queue</h2>
                <p className="text-xs text-slate-400">Monitor, route, and log repaired resolutions for {reports.length} cases in database</p>
              </div>

              {reports.length === 0 ? (
                <div className="text-center p-12 bg-white border border-slate-200 border-dashed rounded-lg">
                  <div className="p-3 bg-slate-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-300 mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">Dispatch queue is empty</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No pending or resolved citizen cases registered in the district ledger.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="authority-reports-grid">
                  {reports.map((report) => {
                    const isResolving = resolvingComplaintId === report.id;
                    const matchingVerification = verifications.find(v => v.complaintId === report.id);
                    const complaintLogs = aiLogs
                      .filter(log => log.complaintId === report.id)
                      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                    
                    return (
                      <div 
                        key={report.id}
                        className={`bg-white border rounded-lg p-5 flex flex-col gap-4 shadow-xs hover:shadow-sm transition-shadow relative ${
                          report.status === "resolved" 
                            ? "border-green-200 bg-green-50/5 animate-none" 
                            : matchingVerification?.isFallback
                            ? "border-amber-200 bg-amber-50/5 animate-none"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Compact card layout */}
                        <div className="flex gap-4">
                          <div className="h-24 w-24 bg-slate-150 rounded overflow-hidden shrink-0 border border-slate-200">
                            <img src={report.imageUrl} alt="Original Citizen proof" className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight truncate">
                                {report.analysis?.category || "General Issue"}
                              </h3>
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                report.status === "resolved" 
                                  ? "bg-green-500 text-white" 
                                  : report.status === "AI analysis pending" 
                                  ? "bg-amber-500 text-white animate-pulse"
                                  : matchingVerification?.isFallback
                                  ? "bg-amber-500 text-white"
                                  : "bg-blue-600 text-white"
                              }`}>
                                {report.status === "AI analysis pending" 
                                  ? "AI PENDING" 
                                  : matchingVerification?.isFallback
                                  ? "MANUALLY LOGGED — AI PENDING"
                                  : report.status || "PENDING"}
                              </span>
                            </div>

                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                              RECORDED: {formatReportDate(report.createdAt)}
                            </div>

                            {/* Location Display */}
                            {(() => {
                              const cardHasGPS = report.location && 
                                                 typeof report.location.latitude === "number" && 
                                                 !isNaN(report.location.latitude) && 
                                                 typeof report.location.longitude === "number" && 
                                                 !isNaN(report.location.longitude);
                              const cardHasManual = report.manualLocation && report.manualLocation.trim() !== "";

                              return (
                                <div className="mt-2 text-[10px] bg-slate-50 border border-slate-150 p-2 rounded" id={`authority-card-location-${report.id}`}>
                                  <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block mb-0.5">Location:</span>
                                  {cardHasManual && cardHasGPS && (
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-slate-800 block break-words">{report.manualLocation}</span>
                                      <a
                                        href={`https://www.google.com/maps?q=${report.location.latitude},${report.location.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 font-mono hover:underline text-[9px] flex items-center gap-1 inline-flex"
                                      >
                                        <MapPin className="w-2.5 h-2.5" />
                                        <span>GPS: {report.location.latitude.toFixed(5)}, {report.location.longitude.toFixed(5)}</span>
                                      </a>
                                    </div>
                                  )}
                                  {cardHasManual && !cardHasGPS && (
                                    <span className="font-semibold text-slate-800 block break-words">{report.manualLocation}</span>
                                  )}
                                  {!cardHasManual && cardHasGPS && (
                                    <a
                                      href={`https://www.google.com/maps?q=${report.location.latitude},${report.location.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 font-mono hover:underline text-[9.5px] flex items-center gap-1 inline-flex"
                                    >
                                      <MapPin className="w-2.5 h-2.5" />
                                      <span>GPS: {report.location.latitude.toFixed(5)}, {report.location.longitude.toFixed(5)}</span>
                                    </a>
                                  )}
                                  {!cardHasManual && !cardHasGPS && (
                                    <span className="text-slate-400 italic block">No location info provided</span>
                                  )}
                                </div>
                              );
                            })()}

                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                              <div>
                                <span className="text-slate-400">Severity: </span>
                                <span className="font-semibold text-slate-700 uppercase">{report.analysis?.severity || "Medium"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Department: </span>
                                <span className="font-semibold text-slate-700">{report.routing?.department || "General"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Priority: </span>
                                <span className="font-bold text-rose-600 uppercase">{report.routing?.priority || "Medium"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {report.description && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-100">
                            "{report.description}"
                          </p>
                        )}

                        {/* Official Complaint Section */}
                        <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                              Official Formal Complaint
                            </span>
                            {report.generatedComplaintText && (
                              <span className="text-[8px] font-mono bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                AI Generated
                              </span>
                            )}
                          </div>

                          {report.generatedComplaintText ? (
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                              {report.generatedComplaintText}
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-150 p-4 rounded text-center space-y-3">
                              <p className="text-[11px] text-slate-400">
                                Generate an official formal complaint letter suitable for dispatching and legal filing.
                              </p>
                              
                              {/* If there is a debugInfo/error for the generate-complaint endpoint, show it here */}
                              {report.debugInfo && report.debugInfo.url?.includes("/api/generate-complaint") && (
                                <div className="text-left bg-red-50 border border-red-100 p-3 rounded text-xs space-y-1 text-red-950">
                                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-red-600 block">GENERATION DEBUG INFO</span>
                                  <div>
                                    <span className="font-bold text-red-800">URL:</span> <code className="font-mono text-[9.5px] break-all">{report.debugInfo.url}</code>
                                  </div>
                                  <div>
                                    <span className="font-bold text-red-800">HTTP Status Code:</span> <code className="font-mono text-[9.5px]">{report.debugInfo.statusCode}</code>
                                  </div>
                                  {report.debugInfo.label && (
                                    <div>
                                      <span className="font-bold text-red-800">Classification:</span> <code className="font-mono text-[9.5px] bg-red-100/70 px-1 rounded text-red-900 font-bold">{report.debugInfo.label}</code>
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="font-bold text-red-800">Raw Response Body (first 150 chars):</span>
                                    <pre className="font-mono text-[9.5px] bg-red-100/55 p-1 rounded mt-0.5 whitespace-pre-wrap break-all border border-red-200 text-red-900">
                                      {report.debugInfo.rawResponse}
                                    </pre>
                                  </div>
                                  {report.debugInfo.serverDebug && (
                                    <div className="mt-2 pt-2 border-t border-red-200/50">
                                      <span className="font-bold text-red-800 block mb-0.5">Server Error:</span>
                                      <pre className="font-mono text-[9.5px] bg-red-100/55 p-1 rounded whitespace-pre-wrap break-all border border-red-200 text-red-900">
                                        {report.debugInfo.serverDebug.errorMessage}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleGenerateComplaint(report.id)}
                                disabled={generatingComplaintId === report.id}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                              >
                                {generatingComplaintId === report.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Generating Complaint...</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>
                                      {report.debugInfo && report.debugInfo.url?.includes("/api/generate-complaint") ? "Retry Draft Generation" : "Generate Draft"}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Escalation Agent Section */}
                        <div className="border-t border-slate-100 pt-3 mt-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase">
                              Escalation Accountability SLA
                            </span>
                            {(report.escalationLevel !== undefined && report.escalationLevel > 0) ? (
                              <span className="text-[8px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                                Escalated (Lv {report.escalationLevel})
                              </span>
                            ) : null}
                          </div>

                          {/* Render the same real-time SLA countdown */}
                          <div>
                            {renderSLACountdown(report)}
                          </div>

                          {/* If overdue and not yet escalated, show Escalate action */}
                          {(() => {
                            const now = new Date();
                            let deadlineDate: Date;
                            if (report.deadline) {
                              deadlineDate = new Date(report.deadline);
                            } else {
                              const createdDate = new Date(report.createdAt);
                              deadlineDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                            }
                            const isOverdue = now.getTime() > deadlineDate.getTime();
                            const statusLower = (report.status || "").toLowerCase();
                            const canBeEscalated = isOverdue && (statusLower === "pending" || statusLower === "accepted") && (!report.escalationLevel || report.escalationLevel === 0);

                            if (canBeEscalated) {
                              return (
                                <div className="bg-amber-50/40 border border-amber-150 p-4 rounded text-center space-y-3">
                                  <p className="text-[11px] text-amber-850 font-semibold">
                                    SLA response window breached. Trigger AI escalation to senior leadership.
                                  </p>

                                  {/* If there is a debugInfo/error for the escalate endpoint, show it here */}
                                  {report.debugInfo && report.debugInfo.url?.includes("/api/escalate") && (
                                    <div className="text-left bg-red-50 border border-red-100 p-3 rounded text-xs space-y-1 text-red-950">
                                      <span className="font-extrabold text-[9px] uppercase tracking-wider text-red-600 block">ESCALATION FAILURE DIAGNOSTICS</span>
                                      <div>
                                        <span className="font-bold text-red-800">URL:</span> <code className="font-mono text-[9.5px] break-all">{report.debugInfo.url}</code>
                                      </div>
                                      <div>
                                        <span className="font-bold text-red-800">HTTP Status Code:</span> <code className="font-mono text-[9.5px]">{report.debugInfo.statusCode}</code>
                                      </div>
                                      {report.debugInfo.label && (
                                        <div>
                                          <span className="font-bold text-red-800">Classification:</span> <code className="font-mono text-[9.5px] bg-red-100/70 px-1 rounded text-red-900 font-bold">{report.debugInfo.label}</code>
                                        </div>
                                      )}
                                      <div className="flex flex-col">
                                        <span className="font-bold text-red-800">Raw Response Body:</span>
                                        <pre className="font-mono text-[9.5px] bg-red-100/55 p-1 rounded mt-0.5 whitespace-pre-wrap break-all border border-red-200 text-red-900">
                                          {report.debugInfo.rawResponse}
                                        </pre>
                                      </div>
                                      {report.debugInfo.serverDebug && (
                                        <div className="mt-2 pt-2 border-t border-red-200/50">
                                          <span className="font-bold text-red-800 block mb-0.5">Server Error:</span>
                                          <pre className="font-mono text-[9.5px] bg-red-100/55 p-1 rounded whitespace-pre-wrap break-all border border-red-200 text-red-900">
                                            {report.debugInfo.serverDebug.errorMessage}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleEscalate(report.id)}
                                    disabled={escalatingId === report.id}
                                    className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                                  >
                                    {escalatingId === report.id ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Triggering Escalation Notice...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Shield className="w-3.5 h-3.5" />
                                        <span>
                                          {report.debugInfo && report.debugInfo.url?.includes("/api/escalate") ? "Retry Escalation" : "Trigger Escalation"}
                                        </span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            }

                            return null;
                          })()}

                          {/* Once escalated, show the Escalation Notice card */}
                          {report.escalationLevel !== undefined && report.escalationLevel > 0 && (
                            <div className="bg-amber-50/70 border-l-4 border-amber-500 border p-3 rounded text-xs text-slate-700 space-y-2">
                              <span className="font-extrabold text-[9px] uppercase tracking-wider text-amber-700 block">
                                Formal Escalation Notice
                              </span>
                              <div className="leading-relaxed font-sans whitespace-pre-wrap italic">
                                {report.escalationNoticeText || "Notice is being filed and logged by the escalation agent."}
                              </div>
                            </div>
                          )}
                        </div>

                        {report.status === "AI analysis pending" && report.debugInfo && (
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-100 mt-1 space-y-1 text-[11px]" id={`ai-narrative-bubble-officer-${report.id}`}>
                            <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest block">AI ASSESSMENT</span>
                            <p className="text-slate-700 leading-normal">
                              {report.analysis?.description || "No analysis details"}
                            </p>
                                                 {/* DEBUG INFO section */}
                            <div className="mt-2.5 pt-2 border-t border-red-100 bg-red-50/50 p-2 rounded text-[10px] space-y-1 text-red-950" id={`debug-info-box-officer-${report.id}`}>
                              <span className="font-extrabold text-[9px] uppercase tracking-wider text-red-600 block">DEBUG INFO</span>
                              <div>
                                <span className="font-bold text-red-800">URL:</span> <code className="font-mono text-[9.5px] break-all">{report.debugInfo.url}</code>
                              </div>
                              <div>
                                <span className="font-bold text-red-800">HTTP Status Code:</span> <code className="font-mono text-[9.5px]">{report.debugInfo.statusCode}</code>
                              </div>
                              {report.debugInfo.label && (
                                <div>
                                  <span className="font-bold text-red-800">Classification:</span> <code className="font-mono text-[9.5px] bg-red-100/70 px-1 rounded text-red-900 font-bold">{report.debugInfo.label}</code>
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-red-800">Raw Response Body (first 150 chars):</span>
                                <pre className="font-mono text-[9.5px] bg-red-100/55 p-1 rounded mt-0.5 whitespace-pre-wrap break-all border border-red-200 text-red-900">
                                  {report.debugInfo.rawResponse}
                                </pre>
                              </div>
                              
                              {report.debugInfo.serverDebug && (
                                <div className="mt-2 pt-2 border-t border-red-200/50 space-y-1">
                                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-red-600 block">Server Diagnostics</span>
                                  <div>
                                    <span className="font-bold text-red-800">Failed Step:</span> <code className="font-mono text-[9.5px] text-red-900 bg-red-100/70 px-1 rounded">{report.debugInfo.serverDebug.failedStep}</code>
                                  </div>
                                  {report.debugInfo.serverDebug.imageSizeKb && (
                                    <div>
                                      <span className="font-bold text-red-800">Image Size:</span> <code className="font-mono text-[9.5px] text-red-900">{report.debugInfo.serverDebug.imageSizeKb} KB</code>
                                    </div>
                                  )}
                                  {report.debugInfo.serverDebug.base64SizeKb && (
                                    <div>
                                      <span className="font-bold text-red-800">Base64 Size:</span> <code className="font-mono text-[9.5px] text-red-900">{report.debugInfo.serverDebug.base64SizeKb} KB</code>
                                    </div>
                                  )}
                                  {report.debugInfo.serverDebug.beforeImageSizeKb && (
                                    <div>
                                      <span className="font-bold text-red-800">Before Image Size:</span> <code className="font-mono text-[9.5px] text-red-900">{report.debugInfo.serverDebug.beforeImageSizeKb} KB</code>
                                    </div>
                                  )}
                                  {report.debugInfo.serverDebug.afterImageSizeKb && (
                                    <div>
                                      <span className="font-bold text-red-800">After Image Size:</span> <code className="font-mono text-[9.5px] text-red-900">{report.debugInfo.serverDebug.afterImageSizeKb} KB</code>
                                    </div>
                                  )}
                                  <div className="flex flex-col mt-1">
                                    <span className="font-bold text-red-800">Detailed Server Error:</span>
                                    <pre className="font-mono text-[9.5px] bg-red-100/55 p-1 rounded mt-0.5 whitespace-pre-wrap break-all border border-red-200 text-red-900">
                                      {report.debugInfo.serverDebug.errorMessage}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() => handleRetryAI(report)}
                                disabled={retryingId === report.id}
                                className="mt-3 w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded text-[11px] uppercase tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                                id={`retry-ai-btn-officer-${report.id}`}
                              >
                                {retryingId === report.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Re-analyzing Report...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Retry AI Assessment</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* If Resolved or manually logged fallback, show matching verification */}
                        {(report.status === "resolved" || matchingVerification?.isFallback) && matchingVerification && (
                          <div className={`p-3.5 rounded border space-y-3 ${
                            matchingVerification.isFallback 
                              ? "bg-amber-950/10 border-amber-900/40 text-amber-950" 
                              : "bg-slate-900 text-white border-slate-850"
                          }`}>
                            <div className={`flex justify-between items-center border-b pb-1.5 ${
                              matchingVerification.isFallback ? "border-amber-900/20" : "border-slate-800"
                            }`}>
                              <span className={`text-[9px] font-black tracking-widest ${
                                matchingVerification.isFallback ? "text-amber-700" : "text-blue-400"
                              }`}>
                                {matchingVerification.isFallback ? "MANUAL RECONCILIATION REPORT" : "RECONCILIATION REPORT"}
                              </span>
                              {matchingVerification.isFallback ? (
                                <span className="text-[8px] font-mono text-amber-600 font-bold animate-pulse">MANUALLY LOGGED — AI PENDING</span>
                              ) : (
                                <span className="text-[8px] font-mono text-green-400">VERIFIED</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className={`text-[8px] uppercase tracking-widest block mb-1 ${
                                  matchingVerification.isFallback ? "text-amber-800/80" : "text-slate-500"
                                }`}>Before image</span>
                                <div className={`h-16 w-full rounded overflow-hidden bg-slate-800 border ${
                                  matchingVerification.isFallback ? "border-amber-900/20" : "border-slate-800"
                                }`}>
                                  <img src={matchingVerification.beforeImage} alt="Before" className="w-full h-full object-cover" />
                                </div>
                              </div>
                              <div>
                                <span className={`text-[8px] uppercase tracking-widest block mb-1 ${
                                  matchingVerification.isFallback ? "text-amber-800/80" : "text-slate-500"
                                }`}>After image</span>
                                <div className={`h-16 w-full rounded overflow-hidden bg-slate-800 border ${
                                  matchingVerification.isFallback ? "border-amber-900/20" : "border-slate-800"
                                }`}>
                                  <img src={matchingVerification.afterImage} alt="After" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1 text-[10.5px]">
                              <div className="flex justify-between text-[9px]">
                                <span className={matchingVerification.isFallback ? "text-amber-800" : "text-slate-400"}>Comparison Match:</span>
                                <span className={`font-bold ${matchingVerification.isFallback ? "text-amber-600" : "text-green-400"}`}>
                                  {matchingVerification.confidence}%
                                </span>
                              </div>
                              <p className={`italic ${matchingVerification.isFallback ? "text-amber-900" : "text-slate-300"}`}>
                                "{matchingVerification.reason}"
                              </p>
                              {matchingVerification.notes && (
                                <p className={`text-[10px] border-t pt-1 mt-1 font-mono ${
                                  matchingVerification.isFallback ? "border-amber-900/20 text-amber-900" : "border-slate-800 text-slate-400"
                                }`}>
                                  <strong className={matchingVerification.isFallback ? "text-amber-700" : "text-blue-400"}>Officer Action Description:</strong> {matchingVerification.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* AI Activity Log Panel */}
                        <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleLogsExpanded(report.id)}
                            className="w-full flex items-center justify-between text-[10px] font-black tracking-widest text-blue-600 uppercase hover:text-blue-700 focus:outline-none cursor-pointer"
                            id={`ai-logs-toggle-${report.id}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5" />
                              <span>AI Activity Log</span>
                              <span className="ml-1 px-1.5 py-0.5 text-[8px] font-bold bg-blue-100 text-blue-800 rounded-full normal-case tracking-normal">
                                {complaintLogs.length}
                              </span>
                            </span>
                            {expandedLogs[report.id] ? (
                              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>

                          <AnimatePresence initial={false}>
                            {expandedLogs[report.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2 mt-2"
                                id={`ai-logs-container-${report.id}`}
                              >
                                {complaintLogs.length === 0 ? (
                                  <div className="text-center py-4 text-slate-400 text-xs italic bg-slate-50 rounded border border-dashed border-slate-200">
                                    No AI activity recorded yet
                                  </div>
                                ) : (
                                  complaintLogs.map((log) => (
                                    <AILogEntry key={log.id} log={log} />
                                  ))
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* If NOT resolved and NOT manually logged fallback, show mark resolved controls */}
                        {report.status !== "resolved" && !matchingVerification?.isFallback && (
                          <div className="border-t border-slate-100 pt-3">
                            {!isResolving ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setResolvingComplaintId(report.id);
                                  setResolutionPreview(null);
                                  setResolutionFile(null);
                                  setResolutionNotes("");
                                  setResolutionError(null);
                                }}
                                className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-colors cursor-pointer flex items-center justify-center gap-2"
                              >
                                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                                <span>Mark Resolved</span>
                              </button>
                            ) : (
                              <div className="space-y-4 bg-slate-50 p-4 rounded-md border border-slate-200 mt-2">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Submit Repair Proof</span>
                                  <button 
                                    type="button"
                                    onClick={() => setResolvingComplaintId(null)}
                                    className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>

                                {resolutionError && (
                                  <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[11px] p-2.5 rounded">
                                    {resolutionError}
                                  </div>
                                )}

                                {/* Image Uploader with Drag-and-drop & Manual Click */}
                                <div className="space-y-1">
                                  <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest">Repair Proof photo ("after")</span>
                                  <div 
                                    onClick={triggerResolutionFileSelect}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const droppedFile = e.dataTransfer.files?.[0];
                                      if (droppedFile) {
                                        setResolutionFile(droppedFile);
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          setResolutionPreview(reader.result as string);
                                        };
                                        reader.readAsDataURL(droppedFile);
                                      }
                                    }}
                                    className="border border-dashed border-slate-300 hover:border-blue-400 rounded bg-white p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5"
                                  >
                                    {resolutionPreview ? (
                                      <div className="relative w-full h-24 rounded overflow-hidden">
                                        <img src={resolutionPreview} alt="Proof preview" className="w-full h-full object-cover" />
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setResolutionPreview(null);
                                            setResolutionFile(null);
                                          }}
                                          className="absolute top-1 right-1 bg-slate-950/80 hover:bg-slate-950 p-1 text-white rounded-full cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <Upload className="w-6 h-6 text-slate-400" />
                                        <p className="text-[10px] text-slate-500"><span className="text-blue-600 font-bold hover:underline">Click to browse</span> or drag and drop "after" photo</p>
                                        <p className="text-[8px] text-slate-400 font-mono">PNG, JPG (MAX 10MB)</p>
                                      </>
                                    )}
                                  </div>
                                  <input 
                                    type="file"
                                    ref={resolutionFileInputRef}
                                    onChange={handleResolutionFileChange}
                                    accept="image/*"
                                    className="hidden"
                                  />
                                </div>

                                {/* Optional description */}
                                <div className="space-y-1">
                                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                                    Resolution Notes (Optional)
                                  </label>
                                  <textarea 
                                    rows={2}
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Describe the repair actions taken (e.g. patched asphalt, replaced bulb)..."
                                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>

                                {/* Submit trigger / Loader logs */}
                                {isResolutionSubmitting ? (
                                  <div className="bg-slate-900 text-slate-400 p-3 rounded text-[9px] font-mono space-y-1 border border-slate-800">
                                    <div className="flex items-center justify-between text-blue-400 font-bold pb-1 border-b border-slate-800">
                                      <span>RECON_ENGINE_VERIFIER</span>
                                      <span className="animate-pulse">RUNNING</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className={`inline-block w-1.5 h-1.5 rounded-none ${resolutionStep === 'uploading_cloudinary' ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`}></span>
                                      <span>[ST_1/2] Cloudinary upload to secure endpoint...</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className={`inline-block w-1.5 h-1.5 rounded-none ${resolutionStep === 'running_verification' ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`}></span>
                                      <span>[ST_2/2] Running Gemini Comparison Agent (Verify Images)...</span>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleResolveSubmit(report)}
                                    disabled={isResolutionSubmitting}
                                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Verify Repair</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
          </>
        )}

      </main>

      {/* Bottom Status Footer conforming exactly to Geometric Balance specs */}
      <footer className="h-10 bg-slate-900 flex items-center justify-between px-6 sm:px-10 text-[9px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-auto shrink-0" id="system-footer">
        <span className="hidden sm:inline">Node Client: civicpulse-localhost // SEC: HMAC-SHA256</span>
        <span className="text-blue-400">Connected to Municipal Grid // Service Uptime: 99.98%</span>
      </footer>

      {/* Delete Report Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmationId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="delete-confirmation-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 text-slate-900"
              id="delete-confirmation-modal"
            >
              <div className="flex items-center gap-3 text-rose-600 mb-4" id="delete-confirmation-header">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold font-display uppercase tracking-tight">Delete Incident Report</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6 font-sans">
                Are you sure you want to delete this civic report entry? This action is permanent and cannot be undone.
              </p>
              <div className="flex justify-end gap-3 font-sans" id="delete-confirmation-actions">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  id="delete-confirm-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteReport}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                  id="delete-confirm-submit-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Report</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wipe Logs Confirmation Modal */}
      <AnimatePresence>
        {wipeConfirmationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="wipe-confirmation-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 text-slate-900"
              id="wipe-confirmation-modal"
            >
              <div className="flex items-center gap-3 text-rose-600 mb-4" id="wipe-confirmation-header">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold font-display uppercase tracking-tight">Wipe Database Logs</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6 font-sans">
                Are you sure you want to permanently clear all civic reports from the database? This action cannot be reversed.
              </p>
              <div className="flex justify-end gap-3 font-sans" id="wipe-confirmation-actions">
                <button
                  type="button"
                  onClick={() => setWipeConfirmationOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  id="wipe-confirm-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmWipeLogs}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                  id="wipe-confirm-submit-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe All Logs</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
