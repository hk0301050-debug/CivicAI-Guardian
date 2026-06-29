# CivicAI Guardian

**AI-Powered Civic Complaint Accountability System**

Built solo for the **Vibe2Ship Hackathon** (Coding Ninjas × Google for Developers) — *Community Hero: Hyperlocal Problem Solver* track.

🔗 **Live App:** [civicai-guardian-8964...run.app](https://civicai-guardian-8964...run.app) *(replace with your deployed link)*
📄 **Project Description:** [Google Doc link] *(replace with your doc link)*

---

## The Problem

Civic complaint systems today share one core failure: **a complaint being submitted does not guarantee that action will be taken.**

- Citizens don't know which department is responsible for an issue.
- Complaints lack structured evidence or severity assessment.
- There's no visibility into whether a department has acted.
- Ignored complaints have no automated escalation path.
- A "resolved" status can be claimed with no proof it actually happened.

## The Solution

CivicAI Guardian builds a complete, AI-verified accountability loop:

```
Report → Verify → Route → Track → Escalate → Resolve → Confirm
```

Five purpose-built Gemini AI agents power this loop — each handling one distinct reasoning task, with every agent's raw input/output logged and visibly surfaced, rather than hidden behind a single opaque "AI did something" status.

---

## AI Agent Architecture

| # | Agent | Input | Output |
|---|-------|-------|--------|
| 1 | **Vision Agent** | Citizen photo + description | Category, severity, risk, description |
| 2 | **Authority Routing Agent** | Category, severity, location | Department, priority, reasoning |
| 3 | **Complaint Generator Agent** | Structured complaint data | Formal complaint letter (plain text) |
| 4 | **Resolution Verification Agent** ⭐ | Before image + after image | Resolved (bool), confidence (0–100), reason |
| 5 | **Escalation Agent** ⭐ | Complaint data + days overdue | Formal escalation notice (plain text) |

All five agents run on **Gemini (`gemini-3.1-flash-lite`)** via **Google AI Studio**, with:
- A shared **1.5-second inter-call delay** to avoid burst rate limits
- A **quota-aware circuit breaker** that suspends new AI calls for 5 minutes after 3 consecutive quota-exceeded responses, returning an immediate, clearly classified error instead of a misleading generic failure
- Structured **error classification** (`QUOTA_EXCEEDED`, `MODEL_OVERLOADED`, `UNEXPECTED_RESPONSE_FORMAT`) persisted per-complaint, with a manual retry path

The **Resolution Verification Agent** was adversarially tested with deliberately mismatched before/after image pairs and correctly flagged them as verification failures — confirming it performs genuine visual comparison rather than defaulting to an automatic pass.

---

## Key Features

- **Smart Issue Reporting** — photo + GPS or manual address + description. Submission requires at least one genuine location signal; geolocation failures show an honest in-app warning rather than silently defaulting to incorrect coordinates.
- **Resolution Verification** ⭐ (flagship) — independently verifies authority-submitted repair proof against the original complaint photo, with a confidence score and written rationale.
- **Escalation Agent** ⭐ — every complaint gets a 7-day SLA countdown; an authority can trigger a formal, AI-drafted escalation notice once a deadline passes (server-side re-validated, not just client-trusted).
- **AI Activity Log** — a collapsible, per-complaint panel showing every agent's raw output in chronological order, for full reasoning transparency.
- **Live Community Pulse Map** — Leaflet + OpenStreetMap, severity-colored pins, click-to-expand detail. Surfaced on both the public homepage (no login required) and the authenticated Citizen Portal, sharing one live data source.
- **Live public statistics** — Total Reports, In Progress, Resolved, High Priority counts, sourced directly from the live database on the homepage.
- **Role-separated UI** — citizens see a clean status; authorities see full diagnostics and a retry control on AI failures.

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI / Reasoning | Google AI Studio + Gemini (`gemini-3.1-flash-lite`) |
| Database | Firebase Firestore |
| Authentication | Firebase Anonymous Authentication |
| Media Storage | Cloudinary |
| Mapping | Leaflet + OpenStreetMap |
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js / Express |

> **Why Cloudinary instead of Firebase Storage?** Firebase Storage now requires the billing-linked Blaze plan even for free-tier usage. Cloudinary's free tier with an unsigned upload preset avoids any billing requirement, with only the resulting `secure_url` stored in Firestore — a storage-layer swap that doesn't change the schema or agent logic.

---

## Database Schema (Firestore)

- **`complaints`** — core complaint record: description, location, `aiAnalysis`, `routing`, `generatedComplaintText`, `status`, `deadline`, `escalationLevel`
- **`authority_updates`** — status changes, messages, and repair-proof evidence from authorities
- **`resolution_verification`** — before/after image pair, resolved verdict, confidence score, reason
- **`escalation_history`** — generated escalation notices, from-department, to-officer, date
- **`ai_logs`** — every agent call's raw input/output, keyed by `complaintId`, powering the AI Activity Log panel

---

## Getting Started (Local Setup)

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/civicai-guardian.git
cd civicai-guardian

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file with:
#   GEMINI_API_KEY=your_google_ai_studio_api_key
#   FIREBASE_API_KEY=your_firebase_config
#   CLOUDINARY_CLOUD_NAME=your_cloud_name
#   CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset

# 4. Run the development server
npm run dev
```

> This project was built entirely inside **Google AI Studio Build Mode**. The exported code reflects that environment; if running locally, you may need to adjust environment-variable handling to match your local Node/Vite setup.

---

## Known Limitations & Deliberate Scope Decisions

Built solo in a time-boxed window — the following were intentionally scoped out rather than left as oversights:

- **Authority access** uses a shared demo access code rather than verified individual accounts. A production version would use department-issued credentials or SSO.
- **Manual-address-only complaints** (no GPS) are not plotted on the map, since the map requires numeric coordinates and address geocoding was out of scope for this build.
- **AI Fraud Verification**, **multi-channel complaint output** (PDF/WhatsApp/email), a **full predictive Analytics Agent**, and an **authority response-extension workflow** are documented as Future Scope — see the Project Description document for details.

---

## Hackathon Scoring Alignment

| Criteria | Weight | How this project addresses it |
|---|---|---|
| Agentic Depth | 20% | 5 distinct agents, each independently logged and inspectable via the AI Activity Log |
| Problem Solving & Impact | 20% | Full accountability loop, not just complaint registration |
| Innovation & Creativity | 20% | Independent AI-driven resolution verification and automated escalation |
| Usage of Google Technologies | 15% | Built entirely in Google AI Studio; all reasoning runs on Gemini |
| Product Experience & Design | 10% | Role-separated dashboards, live public map and stats, transparent error states |
| Technical Implementation | 10% | Quota-aware circuit breaker, server-side validation, real-time Firestore sync |
| Completeness & Usability | 5% | Deployed, end-to-end tested, seeded with real demo data |

---

## License

Built for the Vibe2Ship Hackathon. No license specified — all rights reserved by the author unless otherwise noted.
