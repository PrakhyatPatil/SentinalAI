# SafeRoute — Requirements Specification

**Hackathon:** IntelliAI Arena 2026 · Track 2, Problem Statement 3  
**Team deliverable:** requirements.md  
**Version:** 1.0  
**Status:** Approved for build

---

## 1. Project Overview

SafeRoute is a real-time women's safety navigation web app that scores routes by safety risk, overlays crowd-reported incident heatmaps on a live map, and uses Gemini AI to explain risks in plain language. A one-tap SOS button pre-fills a WhatsApp message with the user's GPS coordinates.

The product targets women navigating unfamiliar or late-night routes in urban areas, demoed on Indore / AITR campus geography.

---

## 2. Functional Requirements

### 2.1 Incident Reporting

| ID | Requirement |
|----|-------------|
| FR-01 | A user can drop a pin on the map to report an incident at any location |
| FR-02 | The report form must offer at minimum three incident type options: **Poor Lighting**, **Isolated Area**, **Harassment History** |
| FR-03 | Each incident is stored in Firestore with: `lat`, `lng`, `type`, `timestamp`, `weight` |
| FR-04 | Incidents appear on the map in real time for all sessions via `onSnapshot()` listener — no page refresh required |
| FR-05 | The app must ship pre-seeded with **10 realistic incidents** around AITR / Indore for demo purposes |

### 2.2 Heatmap Visualisation

| ID | Requirement |
|----|-------------|
| FR-06 | Incidents must be rendered as a **Google Maps HeatmapLayer**, not as individual pins |
| FR-07 | The heatmap must support **time-of-day weighting**: incidents reported after 9 PM carry higher weight when the time slider is in the 9 PM–6 AM window |
| FR-08 | A **time-of-day slider** (0–23 h) must be visible on the UI and update heatmap weights on change without a network call |

### 2.3 Route Input & Risk Scoring

| ID | Requirement |
|----|-------------|
| FR-09 | The user can enter an **origin** and **destination** as text addresses or by clicking the map |
| FR-10 | The app fetches the route polyline via **Google Maps Directions API** |
| FR-11 | The app cross-references every route waypoint (sampled every ~100 m) against Firestore incidents using **Haversine distance** (threshold: 150 m radius) |
| FR-12 | A weighted risk score **0–100** is calculated from nearby incidents, factoring in incident type, recency, and time-of-day weight |
| FR-13 | The route polyline is colour-coded by segment: **green** (0–33), **amber** (34–66), **red** (67–100) |
| FR-14 | The aggregate risk score is displayed as a numeric badge alongside a colour label |

### 2.4 Gemini AI Safety Summary

| ID | Requirement |
|----|-------------|
| FR-15 | When a route is calculated, the app sends a structured prompt to **Gemini 1.5 Flash** containing: origin, destination, current time, list of nearby incidents, and the computed risk score |
| FR-16 | Gemini must return a **2–3 sentence** natural-language safety assessment |
| FR-17 | The summary is displayed in a **sidebar / bottom panel** visible without scrolling on desktop and mobile |
| FR-18 | The Gemini response must not be alarmist; the system prompt enforces a calm, advisory tone |
| FR-19 | A loading state (spinner or skeleton) must be shown while the Gemini call is in flight |

### 2.5 SOS Feature

| ID | Requirement |
|----|-------------|
| FR-20 | A clearly visible **SOS button** is accessible from the main map view at all times |
| FR-21 | On tap, the app requests the device's GPS coordinates via the **Geolocation API** |
| FR-22 | The button opens `wa.me/?text=SOS+I+need+help.+My+location:+[lat],[lng]` — no third-party messaging API required |
| FR-23 | If geolocation is denied, the SOS message falls back to a static help text without coordinates |

### 2.6 Authentication

| ID | Requirement |
|----|-------------|
| FR-24 | The app uses **Firebase Anonymous Authentication** — no sign-up or login screen |
| FR-25 | Anonymous auth must complete silently on app load; the user should never see an auth prompt |

---

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | **Performance:** Map tiles and heatmap must render within 2 seconds on a 4G connection |
| NFR-02 | **Performance:** Gemini API response must be displayed within 5 seconds of route submission |
| NFR-03 | **Mobile-first:** All UI components must be fully usable on a 390 px wide viewport (iPhone 14 equivalent) |
| NFR-04 | **Availability:** The app must be deployed to Firebase Hosting and accessible via a public URL on any device judges use |
| NFR-05 | **Offline graceful degradation:** If Gemini is unreachable, the app still shows the colour-coded route and numeric score |
| NFR-06 | **Security:** Firestore security rules must allow anonymous reads and writes; no raw API keys exposed in client bundle beyond those whitelisted for browser use |
| NFR-07 | **Accessibility:** SOS button and route submit button must have ARIA labels and be tappable at ≥ 44 px touch target |
| NFR-08 | **Demo reliability:** All demo data (seed incidents, sample routes) must work without an internet connection to the Gemini API as a fallback for presentation environments |

---

## 4. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend framework | React 18 + Vite | Fast dev server, HMR, minimal config |
| Maps | Google Maps JS API v3 (`@react-google-maps/api`) | Directions, HeatmapLayer, Geocoding all in one SDK |
| Database & realtime | Firebase Firestore (client SDK) | No backend server needed; `onSnapshot` for live updates |
| Auth | Firebase Anonymous Auth | Zero friction, no user account required |
| AI | Gemini 1.5 Flash (`@google/generative-ai`) | Free tier, low latency, sufficient for 2–3 sentence summaries |
| Hosting | Firebase Hosting | GCP bonus criteria; single `firebase deploy` command |
| Styling | Tailwind CSS | Utility-first, mobile-responsive, fast to iterate |

---

## 5. External API Integrations

### 5.1 Google Maps JavaScript API
- **Services used:** Maps, Directions, Geocoding, Visualization (HeatmapLayer)
- **Auth:** API key restricted to the Firebase Hosting domain
- **Quota risk:** Directions API has a $200/month free credit; well within hackathon usage

### 5.2 Firebase Firestore
- **Collection:** `incidents`
- **Access pattern:** Real-time listener on full collection; writes on incident report submission
- **No server SDK required** — client-side Firestore rules handle access control

### 5.3 Gemini 1.5 Flash API
- **Endpoint:** `generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Trigger:** Called once per route calculation, not on every map interaction
- **Input tokens:** ~300 (route + incident list + score)
- **Output tokens:** ~100 (2–3 sentences)
- **Free tier limit:** 15 requests/min — well within demo needs

### 5.4 WhatsApp Deep Link (no API)
- **Format:** `https://wa.me/?text=...` (URL-encoded)
- **No server:** Entirely client-side; opens WhatsApp natively on mobile
- **Coordinates:** Injected from `navigator.geolocation.getCurrentPosition()`

---

## 6. Data Model

### Firestore Collection: `incidents`

```
incidents/{docId}
  lat:        number       // WGS84 latitude
  lng:        number       // WGS84 longitude
  type:       string       // "poor_lighting" | "isolated" | "harassment_history"
  timestamp:  Timestamp    // Firestore server timestamp
  weight:     number       // Base weight 1–3 (3 = most severe)
  hour:       number       // 0–23, hour of day when incident was reported
```

### Incident Type Weights

| Type | Base Weight | Night Multiplier (9 PM – 6 AM) |
|------|------------|-------------------------------|
| `harassment_history` | 3 | 1.5× |
| `poor_lighting` | 2 | 2.0× |
| `isolated` | 1 | 1.8× |

---

## 7. Risk Score Formula

```
For each route waypoint W:
  nearby_incidents = incidents where haversine(W, incident) ≤ 150m

  segment_score = Σ (incident.weight × time_multiplier(incident.hour, slider_hour))
                  capped at 25 per waypoint

aggregate_score = (Σ segment_scores / max_possible_score) × 100
                  clamped to [0, 100]
```

---

## 8. Gemini Prompt Specification

**System prompt:**
```
You are a women's safety advisor. Given a route and nearby reported incidents,
give a 2–3 sentence safety assessment. Be specific, helpful, and not alarmist.
```

**User prompt template:**
```
Route from [ORIGIN] to [DESTINATION] at [TIME].
Nearby incidents: [INCIDENT_LIST].
Current risk score: [SCORE]/100.
Is this route safe?
```

**INCIDENT_LIST format:** comma-separated strings, e.g.  
`"Poor lighting near Main Gate (reported 11 PM)", "Isolated area near Sector 5"`

---

## 9. Out of Scope

The following are explicitly excluded to stay within the 6-hour build window:

- User login / persistent accounts
- Push notifications or background alerts
- Native mobile app (iOS / Android)
- Backend server or Cloud Functions
- Route comparison (A vs B routes)
- Police station / hospital overlay
- Historical analytics dashboard
- Gemini Pro or multimodal inputs

---

## 10. Judging Criteria Mapping

| Criterion | Weight | How SafeRoute addresses it |
|-----------|--------|---------------------------|
| Technical implementation | 35% | Real-time Firestore, Directions API, Haversine scoring, HeatmapLayer |
| Innovation & creativity | 30% | Time-aware risk scoring; no other team will have the time slider |
| UI/UX design & usability | 15% | Mobile-first, colour-coded polyline, clean sidebar summary |
| Gemini API / GCP bonus | 10% | Gemini 1.5 Flash + Firebase Hosting = full GCP stack |
| Presentation & demo | 10% | Live incident → route recolour flow; Gemini read aloud |

---

*requirements.md · SafeRoute · IntelliAI Arena 2026*
