# SafeRoute — Design Specification

**Hackathon:** IntelliAI Arena 2026 · Track 2, Problem Statement 3  
**Team deliverable:** design.md  
**Version:** 1.0  
**Status:** Approved for build

---

## 1. System Architecture

SafeRoute is a **client-only SPA** — there is no backend server. All logic runs in the browser. The three external services (Firebase, Google Maps, Gemini) are called directly from the React frontend.

```
┌─────────────────────────────────────────────────────┐
│                  React SPA (Vite)                   │
│                                                     │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────┐ │
│  │  Map Module  │  │ Scoring Engine │  │ AI Panel│ │
│  │  (GMaps JS)  │  │  (Haversine)   │  │(Gemini) │ │
│  └──────┬───────┘  └───────┬────────┘  └────┬────┘ │
│         │                  │                │      │
└─────────┼──────────────────┼────────────────┼──────┘
          │                  │                │
   ┌──────▼──────┐   ┌───────▼──────┐  ┌─────▼──────┐
   │ Google Maps │   │   Firebase   │  │   Gemini   │
   │  JS API v3  │   │  Firestore   │  │ 1.5 Flash  │
   │ Directions  │   │  (realtime)  │  │    API     │
   │  Heatmap    │   │  Anon Auth   │  └────────────┘
   └─────────────┘   └─────────────┘
```

**Key architectural decisions:**

- **No Cloud Functions.** Firestore client SDK handles all reads/writes. This eliminates server cold-start latency and removes a build step.
- **Gemini called client-side.** The API key is a browser-restricted key (scoped to the hosting domain). Acceptable for a hackathon; note for production: move behind a function.
- **State lives in React context**, not a server. Incidents from Firestore are cached in component state after the `onSnapshot` callback fires.

---

## 2. Project File Structure

```
saferoute/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx                  # Vite entry, wraps app in providers
│   ├── App.jsx                   # Root layout: Sidebar + MapView
│   │
│   ├── components/
│   │   ├── MapView.jsx           # Google Map container, heatmap, polyline
│   │   ├── RoutePanel.jsx        # Origin / destination inputs + submit
│   │   ├── TimeSlider.jsx        # 0–23 h slider, updates heatmap weights
│   │   ├── RiskBadge.jsx         # Numeric score + colour label chip
│   │   ├── GeminiPanel.jsx       # AI summary card with loading state
│   │   ├── IncidentReporter.jsx  # Click-on-map form to report incident
│   │   ├── SOSButton.jsx         # Fixed bottom-right CTA
│   │   └── Legend.jsx            # Green/amber/red key
│   │
│   ├── hooks/
│   │   ├── useIncidents.js       # Firestore onSnapshot → state
│   │   ├── useRoute.js           # Directions API call → polyline
│   │   ├── useRiskScore.js       # Haversine scoring logic
│   │   └── useGemini.js          # Gemini API call + loading state
│   │
│   ├── lib/
│   │   ├── firebase.js           # Firebase app init + Firestore export
│   │   ├── gemini.js             # Gemini SDK init + prompt builder
│   │   ├── haversine.js          # Pure function: distance in metres
│   │   ├── riskScore.js          # Score formula + time multiplier
│   │   └── seedData.js           # 10 pre-seeded Indore incidents
│   │
│   └── styles/
│       └── index.css             # Tailwind base + custom overrides
│
├── .env.local                    # API keys (gitignored)
├── firebase.json                 # Hosting config
├── .firebaserc                   # Project alias
└── vite.config.js
```

---

## 3. Component Tree

```
App
├── MapView
│   ├── GoogleMap
│   │   ├── HeatmapLayer          ← driven by incidents + time slider
│   │   ├── DirectionsRenderer    ← coloured polyline segments
│   │   └── IncidentReporter      ← click listener → report form overlay
│   └── Legend
│
├── Sidebar  (desktop: right panel / mobile: bottom sheet)
│   ├── RoutePanel
│   │   ├── OriginInput
│   │   ├── DestinationInput
│   │   └── SubmitButton
│   ├── TimeSlider
│   ├── RiskBadge
│   └── GeminiPanel
│
└── SOSButton                     ← fixed, always on top
```

---

## 4. UI Layout

### 4.1 Desktop (≥ 768 px)

```
┌───────────────────────────────────────────────────────────┐
│  🛡 SafeRoute                              [SOS 🆘]        │
├──────────────────────────────────┬────────────────────────┤
│                                  │  From: ____________    │
│                                  │  To:   ____________    │
│                                  │  [Find Safe Route]     │
│         Google Map               │  ──────────────────    │
│                                  │  🕐 Time: [──●──] 11PM │
│      (heatmap overlay)           │  ──────────────────    │
│      (coloured polyline)         │  Risk Score: 72 🔴     │
│                                  │  ──────────────────    │
│                                  │  🤖 Gemini Summary     │
│                                  │  "This route passes…"  │
└──────────────────────────────────┴────────────────────────┘
```

### 4.2 Mobile (< 768 px)

Full-width map fills the viewport. A **bottom sheet** slides up with route input, time slider, risk badge, and Gemini summary. The SOS button is a fixed red FAB (56 × 56 px) at bottom-right, always above the sheet.

```
┌─────────────────┐
│                 │
│   Google Map    │
│                 │
│            [🆘] │   ← fixed FAB
├─────────────────┤
│ From / To input │   ← bottom sheet (collapsible)
│ Time slider     │
│ Risk: 72 🔴     │
│ Gemini summary  │
└─────────────────┘
```

### 4.3 Colour System

| Token | Hex | Usage |
|-------|-----|-------|
| `--risk-safe` | `#22c55e` | Polyline, badge — score 0–33 |
| `--risk-moderate` | `#f59e0b` | Polyline, badge — score 34–66 |
| `--risk-high` | `#ef4444` | Polyline, badge — score 67–100 |
| `--brand` | `#7c3aed` | App bar, SOS button, CTA |
| `--surface` | `#ffffff` | Sidebar / bottom sheet background |
| `--muted` | `#6b7280` | Secondary text, labels |

---

## 5. State Management

All state is managed with React `useState` / `useContext`. No Redux or Zustand needed at this scale.

### 5.1 Global Context: `AppContext`

```js
{
  incidents: Incident[],        // live from Firestore onSnapshot
  sliderHour: number,           // 0–23, controlled by TimeSlider
  route: {
    origin: string,
    destination: string,
    waypoints: LatLng[],        // sampled from Directions polyline
    polylineSegments: Segment[] // each with colour
  } | null,
  riskScore: number | null,     // 0–100
  geminiSummary: string | null, // 2–3 sentence response
  geminiLoading: boolean
}
```

### 5.2 State Update Flow

```
User moves TimeSlider
  → sliderHour updates in context
    → useIncidents recalculates time-weighted heatmap data
      → HeatmapLayer re-renders with new weights
        → (if route exists) useRiskScore recalculates score
          → RiskBadge updates
            → useGemini re-fires with new score
              → GeminiPanel updates
```

```
User submits route
  → useRoute calls Directions API → polyline
    → useRiskScore scores waypoints against incidents
      → Segments coloured, RiskBadge shows score
        → useGemini fires Gemini call
          → GeminiPanel shows loading → then summary
```

---

## 6. Key Module Designs

### 6.1 `haversine.js`

```js
// Returns distance in metres between two LatLng points
export function haversine({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }) {
  const R = 6_371_000; // Earth radius in metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### 6.2 `riskScore.js`

```js
const BASE_WEIGHT = { harassment_history: 3, poor_lighting: 2, isolated: 1 };

const NIGHT_MULTIPLIER = {
  harassment_history: 1.5,
  poor_lighting: 2.0,
  isolated: 1.8,
};

function isNightHour(hour) {
  return hour >= 21 || hour < 6;
}

export function scoreRoute(waypoints, incidents, sliderHour) {
  const MAX_PER_WAYPOINT = 25;
  let total = 0;

  for (const wp of waypoints) {
    const nearby = incidents.filter(i => haversine(wp, i) <= 150);
    let wpScore = nearby.reduce((sum, i) => {
      const base = BASE_WEIGHT[i.type] ?? 1;
      const mult = isNightHour(sliderHour) ? NIGHT_MULTIPLIER[i.type] ?? 1 : 1;
      return sum + base * mult;
    }, 0);
    total += Math.min(wpScore, MAX_PER_WAYPOINT);
  }

  const maxPossible = waypoints.length * MAX_PER_WAYPOINT;
  return Math.round(Math.min((total / maxPossible) * 100, 100));
}
```

### 6.3 `gemini.js` — Prompt Builder

```js
export function buildPrompt({ origin, destination, time, incidents, score }) {
  const incidentList = incidents.length
    ? incidents.map(i => `${i.type.replace(/_/g,' ')} near ${i.label}`).join(', ')
    : 'No incidents reported nearby';

  return `Route from ${origin} to ${destination} at ${time}. \
Nearby incidents: ${incidentList}. \
Current risk score: ${score}/100. \
Is this route safe?`;
}

export const SYSTEM_PROMPT =
  `You are a women's safety advisor. Given a route and nearby reported incidents, \
give a 2–3 sentence safety assessment. Be specific, helpful, and not alarmist.`;
```

### 6.4 `useIncidents.js` — Realtime Firestore Hook

```js
export function useIncidents() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'incidents'), snap => {
      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub; // cleanup on unmount
  }, []);

  return incidents;
}
```

### 6.5 Polyline Segmentation

The Directions API returns a single encoded polyline. To colour it by risk:

1. Decode the polyline into an array of `LatLng` points.
2. Group consecutive points into segments of ~5 points each.
3. Score each segment against nearby incidents.
4. Render each segment as a separate `Polyline` component with `strokeColor` set from the segment score.

---

## 7. Firebase Configuration

### 7.1 Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /incidents/{doc} {
      allow read: if true;
      allow write: if request.auth != null;  // anonymous auth is sufficient
    }
  }
}
```

### 7.2 Environment Variables (`.env.local`)

```
VITE_GOOGLE_MAPS_API_KEY=...
VITE_GEMINI_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

All `VITE_` prefixed — Vite exposes these to the browser bundle automatically.

---

## 8. Seed Data (`seedData.js`)

10 realistic incidents around AITR Indore / Rajwada / Vijay Nagar:

| # | Lat | Lng | Type | Hour | Weight |
|---|-----|-----|------|------|--------|
| 1 | 22.7196 | 75.8577 | poor_lighting | 22 | 2 |
| 2 | 22.7213 | 75.8601 | isolated | 23 | 1 |
| 3 | 22.7183 | 75.8550 | harassment_history | 21 | 3 |
| 4 | 22.7240 | 75.8620 | poor_lighting | 20 | 2 |
| 5 | 22.7165 | 75.8540 | isolated | 22 | 1 |
| 6 | 22.7200 | 75.8590 | harassment_history | 23 | 3 |
| 7 | 22.7230 | 75.8610 | poor_lighting | 21 | 2 |
| 8 | 22.7175 | 75.8565 | isolated | 22 | 1 |
| 9 | 22.7220 | 75.8580 | harassment_history | 20 | 3 |
| 10 | 22.7190 | 75.8595 | poor_lighting | 23 | 2 |

Seed script writes these to Firestore once on first load, keyed by a `seeded` flag in a `meta` collection to avoid duplicates.

---

## 9. Demo Flow (for presentation rehearsal)

This is the exact sequence to walk through in the 2-minute live demo:

1. **Open app** → heatmap visible over Indore map. Explain what the red zones mean.
2. **Move time slider** to 11 PM → heatmap intensifies. Say: *"Same city, higher risk at night."*
3. **Enter route** (e.g., AITR → Vijay Nagar Square) → hit Find Safe Route.
4. **Polyline appears** coloured amber/red. Risk badge shows e.g. 74/100.
5. **Gemini summary** loads in sidebar. **Read it aloud.** This is the emotional peak.
6. **Report a new incident** by clicking near the route. Watch polyline darken and score jump live.
7. **Tap SOS** → WhatsApp opens pre-filled. Say: *"No server, no API, just works."*

**Talking points for Q&A:**
- "Time-aware scoring — the only team that accounts for time of day."
- "Gemini doesn't just score, it explains — that's the safety advisor experience."
- "Entire backend is Firebase — we qualified for the GCP bonus automatically."

---

## 10. Build Hour Checklist

| Hour | Done when… |
|------|-----------|
| H1 | Map loads, Firebase connected, anonymous auth signed in, incident write works |
| H2 | HeatmapLayer renders live incidents, time slider changes weights visually |
| H3 | Route polyline renders coloured by risk score, RiskBadge shows number |
| H4 | Gemini summary appears in sidebar after route submit |
| H5 | SOS opens WhatsApp with coordinates, seed data loaded, mobile layout clean |
| H6 | Firebase Hosting URL live, GitHub pushed, 3-slide deck done, demo rehearsed ×2 |

---

*design.md · SafeRoute · IntelliAI Arena 2026*
