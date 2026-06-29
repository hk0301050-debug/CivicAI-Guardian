export interface GPSLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number;
}

export interface AIAnalysisResult {
  category: string;
  severity: string; // e.g. Low, Medium, High, Critical
  confidence: string; // e.g. 95%
  risk: string; // e.g. Risk of tire damage, accident risk
  description: string; // detailed summary from AI
}

export interface RoutingResult {
  department: string;
  priority: string;
  reason: string;
}

export interface ServerDebugInfo {
  failedStep: string;
  errorMessage: string;
  imageSizeKb?: string | null;
  base64SizeKb?: string | null;
  beforeImageSizeKb?: string | null;
  beforeBase64SizeKb?: string | null;
  afterImageSizeKb?: string | null;
  afterBase64SizeKb?: string | null;
}

export interface DebugInfo {
  statusCode: string;
  rawResponse: string;
  url: string;
  serverDebug?: ServerDebugInfo | null;
}

export interface CivicReport {
  id: string;
  imageUrl: string;
  description: string;
  location: GPSLocation | null;
  manualLocation?: string | null;
  analysis: AIAnalysisResult;
  routing?: RoutingResult;
  createdAt: string;
  status?: string;
  debugInfo?: DebugInfo | null;
  generatedComplaintText?: string | null;
  deadline?: any;
  escalationLevel?: number;
  escalationNoticeText?: string | null;
}

export interface ComplaintDocument {
  complaintId: string;
  reportedBy: string;
  description: string;
  location: { latitude: number | null; longitude: number | null } | null;
  manualLocation?: string | null;
  evidence: { image: string };
  aiAnalysis: AIAnalysisResult;
  routing: RoutingResult;
  status: string;
  createdAt: any; // Firestore timestamp or similar
  debugInfo?: DebugInfo | null;
  generatedComplaintText?: string | null;
  deadline?: any;
  escalationLevel?: number;
  escalationNoticeText?: string | null;
}

export interface ResolutionVerification {
  id: string;
  complaintId: string;
  beforeImage: string;
  afterImage: string;
  resolved: boolean;
  confidence: number;
  reason: string;
  verifiedAt: string;
  isFallback?: boolean;
  notes?: string;
}

export interface AILog {
  id: string;
  agent: string;
  complaintId: string;
  input?: string;
  output: string;
  timestamp: string;
}



