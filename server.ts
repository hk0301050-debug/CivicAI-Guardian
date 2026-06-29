import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

dotenv.config();

const firebaseConfig = {
  apiKey: "AIzaSyBF45JTE6YUzXGIlm8WTX55AKlsJMeYtTo",
  authDomain: "civicpulse-523e6.firebaseapp.com",
  projectId: "civicpulse-523e6",
  storageBucket: "civicpulse-523e6.firebasestorage.app",
  messagingSenderId: "955662681999",
  appId: "1:955662681999:web:3caa9fd0559fc40b722dfa"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Lazy initializer for GoogleGenAI client (helps avoid crashes if key is initially absent)
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (aiInstance) return aiInstance;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined. Please configure it in your Settings > Secrets.");
  }
  
  aiInstance = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  return aiInstance;
}

// Check if error is 503 or model overloaded / resource exhausted
function is503OrOverloadedError(err: any): boolean {
  if (!err) return false;
  if (err.status === 503 || err.statusCode === 503 || err.status === 429 || err.statusCode === 429) {
    return true;
  }
  const errMsg = String(err.message || err.description || err || "").toLowerCase();
  return (
    errMsg.includes("503") ||
    errMsg.includes("overloaded") ||
    errMsg.includes("service unavailable") ||
    errMsg.includes("over capacity") ||
    errMsg.includes("resource exhausted") ||
    errMsg.includes("too many requests") ||
    errMsg.includes("429")
  );
}

function serializeError(err: any): any {
  if (!err) return null;
  const serialized: any = {};
  
  serialized.message = err.message || String(err);
  serialized.name = err.name || "Error";
  serialized.stack = err.stack || "";
  
  if (err.status !== undefined) serialized.status = err.status;
  if (err.statusCode !== undefined) serialized.statusCode = err.statusCode;
  if (err.statusText !== undefined) serialized.statusText = err.statusText;
  if (err.errorDetails !== undefined) serialized.errorDetails = err.errorDetails;
  if (err.details !== undefined) serialized.details = err.details;
  if (err.headers !== undefined) serialized.headers = err.headers;
  
  if (err.response) {
    serialized.response = {
      status: err.response.status,
      statusText: err.response.statusText,
    };
    try {
      if (err.response.headers && typeof err.response.headers.entries === "function") {
        serialized.response.headers = Object.fromEntries(err.response.headers.entries());
      } else if (err.response.headers) {
        serialized.response.headers = err.response.headers;
      }
    } catch (_) {}
  }

  try {
    const keys = Object.getOwnPropertyNames(err);
    for (const key of keys) {
      if (typeof err[key] !== "function" && key !== "stack") {
        serialized[key] = err[key];
      }
    }
  } catch (_) {}
  
  return serialized;
}

function normalizeMimeType(contentType: string | null, url: string): string {
  if (!contentType) {
    contentType = "";
  }
  // Split by semicolon in case of headers like "image/jpeg; charset=utf-8"
  let mime = contentType.toLowerCase().split(";")[0].trim();
  
  if (mime === "image/jpg") {
    return "image/jpeg";
  }
  
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  if (allowed.includes(mime)) {
    return mime;
  }
  
  // Try to determine by extension
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  
  return "image/jpeg"; // default fallback
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

// Quota-aware circuit breaker state
let consecutive429Count = 0;
let circuitBreakerCooldownUntil: number | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isCircuitBreakerActive(): boolean {
  if (circuitBreakerCooldownUntil && Date.now() < circuitBreakerCooldownUntil) {
    return true;
  }
  return false;
}

function is429Error(err: any): boolean {
  if (!err) return false;
  if (err.status === 429 || err.statusCode === 429) {
    return true;
  }
  const errMsg = String(err.message || err.description || err || "").toLowerCase();
  return (
    errMsg.includes("429") ||
    errMsg.includes("quota") ||
    errMsg.includes("exhausted") ||
    errMsg.includes("too many requests")
  );
}

// Automatic retry helper: wait 2 seconds (2000ms) and retry, up to 3 attempts total.
async function callGeminiDynamicWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3, delayMs = 2000): Promise<T> {
  if (isCircuitBreakerActive()) {
    throw new Error("AI quota temporarily reached, please try again shortly");
  }

  let firstAttemptError: any = null;
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (isCircuitBreakerActive()) {
      throw new Error("AI quota temporarily reached, please try again shortly");
    }

    try {
      const result = await fn();
      consecutive429Count = 0; // Reset consecutive 429 counter on success
      return result;
    } catch (err: any) {
      lastError = err;
      
      // On the very first attempt, capture and log detailed diagnostics
      if (attempt === 1) {
        firstAttemptError = serializeError(err);
        console.error("====== GEMINI FIRST ATTEMPT RAW ERROR DIAGNOSTICS ======");
        console.error("MESSAGE:", err.message);
        console.error("STATUS / HTTP CODE:", err.status || err.statusCode || "N/A");
        console.error("RAW ERROR OBJECT KEYS:", Object.getOwnPropertyNames(err));
        console.error("FULL SERIALIZED ERROR DETAILS:", JSON.stringify(firstAttemptError, null, 2));
        console.error("=========================================================");
      } else {
        console.warn(`Gemini call failed (attempt ${attempt}/${maxAttempts}):`, err);
      }
      
      if (is429Error(err)) {
        consecutive429Count++;
        console.warn(`[CIRCUIT BREAKER] Consecutive 429 error detected. Count: ${consecutive429Count}/3`);
        if (consecutive429Count >= 3) {
          circuitBreakerCooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minutes cooldown
          console.error(`[CIRCUIT BREAKER] Circuit breaker activated! Cooldown until ${new Date(circuitBreakerCooldownUntil).toISOString()}`);
        }
      }

      const isOverloaded = is503OrOverloadedError(err);
      if (isOverloaded && attempt < maxAttempts) {
        console.log(`Matched 503 or overloaded/exhausted error. waiting 2 seconds before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        // Attach first attempt error to the thrown error
        if (err && typeof err === "object") {
          err.firstAttemptError = firstAttemptError;
        }
        throw err;
      }
    }
  }
  if (lastError && typeof lastError === "object") {
    lastError.firstAttemptError = firstAttemptError;
  }
  throw lastError;
}

// API endpoint to analyze the uploaded civic issue image
app.post("/api/analyze", async (req, res) => {
  if (isCircuitBreakerActive()) {
    console.warn("[CIRCUIT BREAKER] /api/analyze blocked because cooldown is active.");
    return res.status(429).json({
      error: "AI quota temporarily reached, please try again shortly",
      serverDebug: {
        failedStep: "Circuit Breaker Active",
        errorMessage: "AI quota temporarily reached, please try again shortly",
        classification: "QUOTA_EXCEEDED"
      }
    });
  }

  let failedStep = "Cloudinary Download";
  let imageSizeKb: string | null = null;
  let base64SizeKb: string | null = null;
  try {
    const { imageUrl, userDescription, location, complaintId } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: "Missing required parameter: imageUrl" });
    }

    const ai = getGeminiClient();

    // --- STEP 1: Cloudinary download with separate try/catch and timeout ---
    let base64Data = "";
    let mimeType = "image/jpeg";
    try {
      console.log(`[DIAGNOSTICS] Starting Cloudinary download for image: ${imageUrl}`);
      const imageRes = await fetchWithTimeout(imageUrl, {}, 20000);
      if (!imageRes.ok) {
        throw new Error(`Cloudinary server returned HTTP ${imageRes.status} ${imageRes.statusText}`);
      }
      
      const arrayBuffer = await imageRes.arrayBuffer();
      imageSizeKb = (arrayBuffer.byteLength / 1024).toFixed(2);
      console.log(`[DIAGNOSTICS] Cloudinary download complete. Image size: ${imageSizeKb} KB`);
      
      base64Data = Buffer.from(arrayBuffer).toString('base64');
      base64SizeKb = (base64Data.length / 1024).toFixed(2);
      console.log(`[DIAGNOSTICS] Base64 conversion complete. Base64 size: ${base64SizeKb} KB`);
      
      mimeType = normalizeMimeType(imageRes.headers.get('content-type'), imageUrl);
    } catch (downloadError: any) {
      console.error("[DIAGNOSTICS] Step 1 Failed: Cloudinary download failed.", downloadError);
      throw new Error(`[Cloudinary Download Failure] ${downloadError.message || downloadError}`);
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      }
    };

    // The exact prompt specified in requirements:
    const promptString = `You are a civic infrastructure analysis AI. Analyze the provided image of a reported civic issue. Return ONLY valid JSON in this exact format, no other text: { "category": "", "severity": "", "confidence": "", "risk": "", "description": "" }`;

    const textPart = {
      text: `${promptString}\n\nAdditional context/witness description: "${userDescription || 'No description provided.'}"`
    };

    // Delay 1.5 seconds after image upload / download completes, before calling Vision Agent
    console.log("[DIAGNOSTICS] Delaying 1.5s before Vision Agent call...");
    await delay(1500);

    // --- STEP 2: Gemini call with separate try/catch ---
    failedStep = "Gemini Call";
    let response;
    try {
      console.log(`[DIAGNOSTICS] Sending request to Gemini...`);
      // 1. First Call: Vision Agent analysis wrapped with automatic 503 retry logic
      response = await callGeminiDynamicWithRetry(() => 
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: "application/json"
          }
        })
      );
      console.log(`[DIAGNOSTICS] Gemini response received successfully.`);
    } catch (geminiError: any) {
      console.error("[DIAGNOSTICS] Step 2 Failed: Gemini Vision analysis failed.", geminiError);
      throw new Error(`[Gemini Vision API Failure] ${geminiError.message || geminiError}`);
    }

    const resultText = response.text || "";
    const cleanedText = resultText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Gemini returned invalid JSON:", resultText);
      return res.status(500).json({ 
        error: "Failed to parse Gemini AI response as JSON",
        rawResponse: resultText
      });
    }

    // Delay 1.5 seconds between Vision Agent and Routing Agent
    console.log("[DIAGNOSTICS] Delaying 1.5s before Routing Agent call...");
    await delay(1500);

    // 2. Second Call: Authority Routing Agent
    const locationStr = location 
      ? `Latitude: ${location.latitude}, Longitude: ${location.longitude}`
      : "Coordinates not available";

    const routingPrompt = `You are a civic routing AI. Given an issue category and location, determine which municipal department is responsible and how urgently it should be handled.

Issue category: ${parsedAnalysis.category || "General"}
Severity: ${parsedAnalysis.severity || "Medium"}
Location: ${locationStr}

Return ONLY valid JSON in this exact format, no other text:

{
  "department": "",
  "priority": "",
  "reason": ""
}

Use this department mapping as guidance for the model:
- Pothole / Roads & Sidewalks -> Road Department
- Streetlight -> Electric Department
- Garbage / waste -> Sanitation Department
- Water leakage -> Water Department
- Anything else -> General Civic Department`;

    // Wrapped with automatic 503 retry logic as well
    const routingResponse = await callGeminiDynamicWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: routingPrompt,
        config: {
          responseMimeType: "application/json"
        }
      })
    );

    const routingText = routingResponse.text || "";
    const cleanedRouting = routingText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    
    let parsedRouting;
    try {
      parsedRouting = JSON.parse(cleanedRouting);
    } catch (routeParseError) {
      console.error("Failed to parse routing JSON:", routingText);
      parsedRouting = {
        department: "General Civic Department",
        priority: parsedAnalysis.severity || "Medium",
        reason: "Failed to auto-route with AI. Handed over to general dispatch due to format mismatch."
      };
    }

    if (complaintId) {
      try {
        const logsCol = collection(db, "ai_logs");
        
        // 1. Vision Agent Log
        await addDoc(logsCol, {
          agent: "vision",
          complaintId,
          input: `${promptString}\n\nAdditional context/witness description: "${userDescription || 'No description provided.'}"`,
          output: JSON.stringify(parsedAnalysis),
          timestamp: serverTimestamp()
        });

        // 2. Routing Agent Log
        await addDoc(logsCol, {
          agent: "routing",
          complaintId,
          input: routingPrompt,
          output: JSON.stringify(parsedRouting),
          timestamp: serverTimestamp()
        });
        
        console.log(`[DIAGNOSTICS] Successfully wrote ai_logs for vision and routing. Complaint ID: ${complaintId}`);
      } catch (logErr) {
        console.error("Failed to write Vision/Routing ai_logs:", logErr);
      }
    }

    return res.json({
      analysis: parsedAnalysis,
      routing: parsedRouting
    });

  } catch (error: any) {
    console.error("Error during issue analysis:", error);
    let classification = "UNKNOWN_ERROR";
    let statusCode = "500";
    if (isCircuitBreakerActive() || is429Error(error)) {
      classification = "QUOTA_EXCEEDED";
      statusCode = "429";
    } else if (is503OrOverloadedError(error)) {
      classification = "MODEL_OVERLOADED";
      statusCode = "503";
    }

    const responsePayload: any = { 
      error: error.message || "Internal server error",
      serverDebug: {
        failedStep,
        imageSizeKb,
        base64SizeKb,
        errorMessage: error.message || String(error),
        classification,
        statusCode
      }
    };
    if (error.firstAttemptError) {
      responsePayload.diagnostic = error.firstAttemptError;
    }
    return res.status(Number(statusCode) || 500).json(responsePayload);
  }
});

// API endpoint to verify repair resolution of an issue
app.post("/api/verify", async (req, res) => {
  if (isCircuitBreakerActive()) {
    console.warn("[CIRCUIT BREAKER] /api/verify blocked because cooldown is active.");
    return res.status(429).json({
      error: "AI quota temporarily reached, please try again shortly",
      serverDebug: {
        failedStep: "Circuit Breaker Active",
        errorMessage: "AI quota temporarily reached, please try again shortly",
        classification: "QUOTA_EXCEEDED"
      }
    });
  }

  let failedStep = "Before Image Download";
  let beforeImageSizeKb: string | null = null;
  let beforeBase64SizeKb: string | null = null;
  let afterImageSizeKb: string | null = null;
  let afterBase64SizeKb: string | null = null;
  try {
    const { beforeImageUrl, afterImageUrl, category, description, complaintId } = req.body;

    if (!beforeImageUrl || !afterImageUrl) {
      return res.status(400).json({ error: "Missing required parameters: beforeImageUrl and afterImageUrl are required." });
    }

    const ai = getGeminiClient();

    // 1. Fetch and convert before image to inline base64 with separate try/catch and timeout
    let beforeBase64 = "";
    let beforeMimeType = "image/jpeg";
    try {
      console.log(`[DIAGNOSTICS] Downloading before image: ${beforeImageUrl}`);
      const beforeRes = await fetchWithTimeout(beforeImageUrl, {}, 20000);
      if (!beforeRes.ok) {
        throw new Error(`Before image server returned HTTP ${beforeRes.status} ${beforeRes.statusText}`);
      }
      const beforeBuffer = await beforeRes.arrayBuffer();
      beforeImageSizeKb = (beforeBuffer.byteLength / 1024).toFixed(2);
      console.log(`[DIAGNOSTICS] Before image download complete. Size: ${beforeImageSizeKb} KB`);
      
      beforeBase64 = Buffer.from(beforeBuffer).toString("base64");
      beforeBase64SizeKb = (beforeBase64.length / 1024).toFixed(2);
      console.log(`[DIAGNOSTICS] Before image base64 size: ${beforeBase64SizeKb} KB`);
      
      beforeMimeType = normalizeMimeType(beforeRes.headers.get("content-type"), beforeImageUrl);
    } catch (beforeError: any) {
      console.error("[DIAGNOSTICS] Step 1 Failed: Before image download failed.", beforeError);
      throw new Error(`[Before Image Download Failure] ${beforeError.message || beforeError}`);
    }

    const beforeImagePart = {
      inlineData: {
        mimeType: beforeMimeType,
        data: beforeBase64
      }
    };

    // 2. Fetch and convert after image to inline base64 with separate try/catch and timeout
    failedStep = "After Image Download";
    let afterBase64 = "";
    let afterMimeType = "image/jpeg";
    try {
      console.log(`[DIAGNOSTICS] Downloading after image: ${afterImageUrl}`);
      const afterRes = await fetchWithTimeout(afterImageUrl, {}, 20000);
      if (!afterRes.ok) {
        throw new Error(`After image server returned HTTP ${afterRes.status} ${afterRes.statusText}`);
      }
      const afterBuffer = await afterRes.arrayBuffer();
      afterImageSizeKb = (afterBuffer.byteLength / 1024).toFixed(2);
      console.log(`[DIAGNOSTICS] After image download complete. Size: ${afterImageSizeKb} KB`);
      
      afterBase64 = Buffer.from(afterBuffer).toString("base64");
      afterBase64SizeKb = (afterBase64.length / 1024).toFixed(2);
      console.log(`[DIAGNOSTICS] After image base64 size: ${afterBase64SizeKb} KB`);
      
      afterMimeType = normalizeMimeType(afterRes.headers.get("content-type"), afterImageUrl);
    } catch (afterError: any) {
      console.error("[DIAGNOSTICS] Step 2 Failed: After image download failed.", afterError);
      throw new Error(`[After Image Download Failure] ${afterError.message || afterError}`);
    }

    const afterImagePart = {
      inlineData: {
        mimeType: afterMimeType,
        data: afterBase64
      }
    };

    // 3. Structure the multi-part content cleanly by interleaving instructions so the AI can pair each image perfectly with its role.
    const textPartBefore = {
      text: "Below is the 'before' image of the location (displaying the original reported issue):\n"
    };
    
    const textPartAfter = {
      text: "\nBelow is the 'after' image of the location (submitted by the authority as proof of repair/fixing):\n"
    };

    const promptString = `\nOriginal issue category: ${category || "General"}
Original issue description: ${description || "No description provided."}

Analyze and compare these two images to determine:
1. Does the 'after' image show the same location/issue area as the 'before' image?
2. Has the reported problem visibly been fixed?
3. Does the evidence look genuine (not a stock photo, not an unrelated location)?

confidence must be a whole number between 0 and 100, representing percent confidence — do not return a decimal like 0.95.

Return ONLY valid JSON in this exact format, no other text:

{
  "resolved": true,
  "confidence": 85, // integer from 0 to 100, NOT a decimal between 0 and 1
  "reason": ""
}`;

    const textPartPrompt = {
      text: promptString
    };

    // Delay 1.5 seconds before comparison call
    console.log("[DIAGNOSTICS] Delaying 1.5s before Gemini Verification Call...");
    await delay(1500);

    // 4. Send to Gemini 3.5 Flash with separate try/catch
    failedStep = "Gemini Verification Call";
    let response;
    try {
      console.log("[DIAGNOSTICS] Sending interleaved images and verification prompt to Gemini 3.1 Flash Lite...");
      response = await callGeminiDynamicWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: { parts: [textPartBefore, beforeImagePart, textPartAfter, afterImagePart, textPartPrompt] },
          config: {
            responseMimeType: "application/json"
          }
        })
      );
      console.log("[DIAGNOSTICS] Gemini verification response received successfully.");
    } catch (geminiError: any) {
      console.error("[DIAGNOSTICS] Step 3 Failed: Gemini Verification failed.", geminiError);
      throw new Error(`[Gemini Verification API Failure] ${geminiError.message || geminiError}`);
    }

    const resultText = response.text || "";
    const cleanedText = resultText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedText);
      console.log("[DIAGNOSTICS] Raw parsedResult.confidence from JSON.parse:", parsedResult.confidence);
      
      // Normalize confidence value to be a whole number between 0 and 100
      if (parsedResult && parsedResult.confidence !== undefined) {
        let conf = typeof parsedResult.confidence === "number" ? parsedResult.confidence : parseFloat(String(parsedResult.confidence));
        if (!isNaN(conf)) {
          if (conf > 0 && conf <= 1.0) {
            conf = conf * 100;
          }
          parsedResult.confidence = Math.min(100, Math.max(0, Math.round(conf)));
        } else {
          parsedResult.confidence = 85;
        }
      } else if (parsedResult) {
        parsedResult.confidence = 85;
      }
      console.log("[DIAGNOSTICS] Normalized parsedResult.confidence:", parsedResult.confidence);
    } catch (parseError) {
      console.error("Gemini returned invalid JSON for verification:", resultText);
      return res.status(500).json({
        error: "Failed to parse Gemini verification response as JSON",
        rawResponse: resultText
      });
    }

    if (complaintId) {
      try {
        const logsCol = collection(db, "ai_logs");
        await addDoc(logsCol, {
          agent: "resolution_verification",
          complaintId,
          input: promptString,
          output: JSON.stringify(parsedResult),
          timestamp: serverTimestamp()
        });
        console.log(`[DIAGNOSTICS] Successfully wrote ai_logs for resolution verification. Complaint ID: ${complaintId}`);
      } catch (logErr) {
        console.error("Failed to write Resolution Verification ai_log:", logErr);
      }
    }

    return res.json(parsedResult);

  } catch (error: any) {
    console.error("Error during resolution verification:", error);
    let classification = "UNKNOWN_ERROR";
    let statusCode = "500";
    if (isCircuitBreakerActive() || is429Error(error)) {
      classification = "QUOTA_EXCEEDED";
      statusCode = "429";
    } else if (is503OrOverloadedError(error)) {
      classification = "MODEL_OVERLOADED";
      statusCode = "503";
    }

    const responsePayload: any = { 
      error: error.message || "Internal server error",
      serverDebug: {
        failedStep,
        beforeImageSizeKb,
        beforeBase64SizeKb,
        afterImageSizeKb,
        afterBase64SizeKb,
        errorMessage: error.message || String(error),
        classification,
        statusCode
      }
    };
    if (error.firstAttemptError) {
      responsePayload.diagnostic = error.firstAttemptError;
    }
    return res.status(Number(statusCode) || 500).json(responsePayload);
  }
});

// 4th AI Agent: Complaint Generator Agent
app.post("/api/generate-complaint", async (req, res) => {
  if (isCircuitBreakerActive()) {
    console.warn("[CIRCUIT BREAKER] /api/generate-complaint blocked because cooldown is active.");
    return res.status(429).json({
      error: "AI quota temporarily reached, please try again shortly",
      serverDebug: {
        failedStep: "Circuit Breaker Active",
        errorMessage: "AI quota temporarily reached, please try again shortly",
        classification: "QUOTA_EXCEEDED"
      }
    });
  }

  const { complaintId } = req.body;
  if (!complaintId) {
    return res.status(400).json({ error: "Missing required parameter: complaintId" });
  }

  let failedStep = "Fetch Complaint Document";
  try {
    console.log(`[DIAGNOSTICS] Looking up complaint doc in Firestore: ${complaintId}`);
    const complaintDocRef = doc(db, "complaints", complaintId);
    const complaintSnap = await getDoc(complaintDocRef);

    if (!complaintSnap.exists()) {
      failedStep = "Complaint Document Not Found";
      return res.status(404).json({ error: `Complaint with ID ${complaintId} not found.` });
    }

    const docData = complaintSnap.data();

    const category = docData.aiAnalysis?.category || docData.analysis?.category || "General Civic Issue";
    const description = docData.description || "No description provided.";
    
    // Address extraction: check if location has address, or fallback to coords
    const location = docData.location;
    let address = "Unknown Location";
    if (location) {
      if (location.address) {
        address = location.address;
      } else if (typeof location.latitude === "number" && typeof location.longitude === "number") {
        address = `LAT: ${location.latitude.toFixed(6)}, LON: ${location.longitude.toFixed(6)}`;
      }
    }

    const severity = docData.aiAnalysis?.severity || docData.analysis?.severity || "Medium";
    const evidence_url = docData.evidence?.image || docData.imageUrl || "No image link provided.";
    const department = docData.routing?.department || "General Civic Department";

    const promptString = `You are a civic complaint drafting AI. Generate a clear, formal complaint suitable for
submission to a municipal department, based on the following data.

Problem: ${category} — ${description}
Location: ${address}
Severity: ${severity}
Evidence: image attached (see link: ${evidence_url})
Department: ${department}

Write a short, formal complaint (4-6 sentences) including:
- What the problem is
- Where it is
- Why it's urgent (based on severity/risk)
- What action is requested

Return plain text only, no JSON, no markdown formatting.`;

    // Delay 1.5 seconds before calling the model
    console.log("[DIAGNOSTICS] Delaying 1.5s before Gemini Generation Call...");
    await delay(1500);

    const ai = getGeminiClient();
    failedStep = "Gemini Call";
    console.log("[DIAGNOSTICS] Calling Gemini 3.1 Flash Lite for Complaint Generation...");

    let response;
    try {
      response = await callGeminiDynamicWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptString,
        })
      );
    } catch (geminiError: any) {
      console.error("[DIAGNOSTICS] Gemini Generation call failed.", geminiError);
      throw geminiError;
    }

    const rawResponseText = response.text || "";
    const generatedText = rawResponseText.trim();

    // 5. On Success Persistence:
    failedStep = "Save Generated Complaint Text";
    await updateDoc(complaintDocRef, {
      generatedComplaintText: generatedText,
      debugInfo: null // clear any previous debugInfo on success
    });

    // Write a new doc to ai_logs
    failedStep = "Write AI Log";
    const logsCol = collection(db, "ai_logs");
    await addDoc(logsCol, {
      agent: "complaint_gen",
      complaintId,
      input: promptString,
      output: generatedText,
      timestamp: serverTimestamp()
    });

    console.log(`[DIAGNOSTICS] Successfully generated complaint text and saved for: ${complaintId}`);
    return res.json({
      success: true,
      generatedComplaintText: generatedText
    });

  } catch (error: any) {
    console.error("Error during Complaint Generation agent execution:", error);
    let classification = "UNKNOWN_ERROR";
    let statusCode = "500";
    if (isCircuitBreakerActive() || is429Error(error)) {
      classification = "QUOTA_EXCEEDED";
      statusCode = "429";
    } else if (is503OrOverloadedError(error)) {
      classification = "MODEL_OVERLOADED";
      statusCode = "503";
    }

    const debugInfo: any = {
      statusCode,
      rawResponse: (error.message || String(error)).slice(0, 150),
      url: `http://localhost:3000/api/generate-complaint`,
      label: classification,
      serverDebug: {
        failedStep,
        errorMessage: error.message || String(error),
        classification,
        statusCode
      }
    };

    // On failure: write debugInfo to the complaint doc, leaving generatedComplaintText empty/null
    try {
      const complaintDocRef = doc(db, "complaints", complaintId);
      await updateDoc(complaintDocRef, {
        generatedComplaintText: null,
        debugInfo: debugInfo
      });
    } catch (saveDbError) {
      console.error("Failed to persist debugInfo to complaint doc on failure:", saveDbError);
    }

    return res.status(Number(statusCode) || 500).json({
      error: error.message || "Internal server error during complaint generation",
      serverDebug: debugInfo.serverDebug
    });
  }
});

// 5th AI Agent: Escalation Agent
app.post("/api/escalate", async (req, res) => {
  if (isCircuitBreakerActive()) {
    console.warn("[CIRCUIT BREAKER] /api/escalate blocked because cooldown is active.");
    return res.status(429).json({
      error: "AI quota temporarily reached, please try again shortly",
      serverDebug: {
        failedStep: "Circuit Breaker Active",
        errorMessage: "AI quota temporarily reached, please try again shortly",
        classification: "QUOTA_EXCEEDED"
      }
    });
  }

  const { complaintId } = req.body;
  if (!complaintId) {
    return res.status(400).json({ error: "Missing required parameter: complaintId" });
  }

  let failedStep = "Fetch Complaint Document";
  try {
    console.log(`[DIAGNOSTICS] Looking up complaint doc for escalation in Firestore: ${complaintId}`);
    const complaintDocRef = doc(db, "complaints", complaintId);
    const complaintSnap = await getDoc(complaintDocRef);

    if (!complaintSnap.exists()) {
      failedStep = "Complaint Document Not Found";
      return res.status(404).json({ error: `Complaint with ID ${complaintId} not found.` });
    }

    const docData = complaintSnap.data();

    // Recheck status server-side (only proceeds if pending or accepted)
    const status = (docData.status || "").toLowerCase();
    if (status !== "pending" && status !== "accepted") {
      return res.status(400).json({
        error: `Escalation is only permitted for complaints with status 'pending' or 'accepted'. Current status is '${docData.status}'.`
      });
    }

    // Recheck deadline server-side
    let deadlineDate: Date;
    if (docData.deadline) {
      if (typeof docData.deadline.toDate === "function") {
        deadlineDate = docData.deadline.toDate();
      } else {
        deadlineDate = new Date(docData.deadline);
      }
    } else if (docData.createdAt) {
      let createdDate: Date;
      if (typeof docData.createdAt.toDate === "function") {
        createdDate = docData.createdAt.toDate();
      } else {
        createdDate = new Date(docData.createdAt);
      }
      deadlineDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      return res.status(400).json({
        error: "Cannot determine SLA deadline because both 'deadline' and 'createdAt' are missing on this complaint."
      });
    }

    const now = new Date();
    if (now.getTime() <= deadlineDate.getTime()) {
      return res.status(400).json({
        error: "SLA Deadline has not passed yet. Early escalation is not permitted.",
        deadline: deadlineDate.toISOString()
      });
    }

    const category = docData.aiAnalysis?.category || docData.analysis?.category || "General Civic Issue";
    const description = docData.description || "No description provided.";
    const department = docData.routing?.department || "General Civic Department";
    
    const submittedDateStr = docData.createdAt 
      ? (typeof docData.createdAt.toDate === "function" ? docData.createdAt.toDate().toISOString() : new Date(docData.createdAt).toISOString())
      : new Date().toISOString();

    const daysSinceDeadline = Math.max(1, Math.floor((now.getTime() - deadlineDate.getTime()) / (24 * 60 * 60 * 1000)));

    const promptString = `You are a civic escalation AI. A citizen's complaint has not received an authority response
within the expected SLA window. Generate a short, formal escalation notice.

Complaint ID: ${complaintId}
Issue: ${category} — ${description}
Department: ${department}
Submitted: ${submittedDateStr}
Days overdue: ${daysSinceDeadline}

Write a brief, formal escalation notice (4-6 sentences) addressed to a senior municipal
officer, including:
- What the complaint is and its ID
- Which department failed to respond and how long it's been overdue
- Why it should be prioritized now (use severity if available)
- A request for immediate review and action

Return plain text only, no JSON, no markdown formatting.`;

    // Delay 1.5 seconds before calling the model
    console.log("[DIAGNOSTICS] Delaying 1.5s before Gemini Escalation Call...");
    await delay(1500);

    const ai = getGeminiClient();
    failedStep = "Gemini Call";
    console.log("[DIAGNOSTICS] Calling Gemini 3.1 Flash Lite for Escalation Notice...");

    let response;
    try {
      response = await callGeminiDynamicWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptString,
        })
      );
    } catch (geminiError: any) {
      console.error("[DIAGNOSTICS] Gemini Escalation call failed.", geminiError);
      throw geminiError;
    }

    const rawResponseText = response.text || "";
    const generatedText = rawResponseText.trim();

    // On Success: increment escalationLevel by 1, write escalation history, write ai logs
    failedStep = "Update Complaint Escalation Level";
    const newEscalationLevel = (docData.escalationLevel || 0) + 1;
    await updateDoc(complaintDocRef, {
      escalationLevel: newEscalationLevel,
      escalationNoticeText: generatedText,
      debugInfo: null // clear any previous debugInfo on success
    });

    failedStep = "Create Escalation History Document";
    const escCol = collection(db, "escalation_history");
    await addDoc(escCol, {
      complaintId,
      reason: "No response within SLA window",
      fromDepartment: department,
      toDepartment: "Senior Municipal Officer",
      date: new Date().toISOString(),
      escalationNoticeText: generatedText
    });

    failedStep = "Write AI Log";
    const logsCol = collection(db, "ai_logs");
    await addDoc(logsCol, {
      agent: "escalation",
      complaintId,
      input: promptString,
      output: generatedText,
      timestamp: serverTimestamp()
    });

    console.log(`[DIAGNOSTICS] Successfully generated escalation notice for: ${complaintId}`);
    return res.json({
      success: true,
      escalationLevel: newEscalationLevel,
      escalationNoticeText: generatedText
    });

  } catch (error: any) {
    console.error("Error during Escalation agent execution:", error);
    let classification = "UNKNOWN_ERROR";
    let statusCode = "500";
    if (isCircuitBreakerActive() || is429Error(error)) {
      classification = "QUOTA_EXCEEDED";
      statusCode = "429";
    } else if (is503OrOverloadedError(error)) {
      classification = "MODEL_OVERLOADED";
      statusCode = "503";
    }

    const debugInfo: any = {
      statusCode,
      rawResponse: (error.message || String(error)).slice(0, 150),
      url: `http://localhost:3000/api/escalate`,
      label: classification,
      serverDebug: {
        failedStep,
        errorMessage: error.message || String(error),
        classification,
        statusCode
      }
    };

    // On failure: write debugInfo to the complaint doc
    try {
      const complaintDocRef = doc(db, "complaints", complaintId);
      await updateDoc(complaintDocRef, {
        debugInfo: debugInfo
      });
    } catch (saveDbError) {
      console.error("Failed to persist debugInfo to complaint doc on failure:", saveDbError);
    }

    return res.status(Number(statusCode) || 500).json({
      error: error.message || "Internal server error during escalation",
      serverDebug: debugInfo.serverDebug
    });
  }
});

// Vite Middleware & SPA serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CivicAI Guardian listening on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to boot Express server:", err);
});
