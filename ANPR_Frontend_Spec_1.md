# ANPR Enforcement Management System — Frontend Specification

**Document Version:** 1.0  
**Date:** June 2026  
**Camera Model:** XCW-MICROCAM-02  
**Payload Source:** `http://98.94.86.116/api/logs`  
**Audience:** Frontend Engineers, UI/UX Designers, QA Engineers

---

## 1. Project Overview

This document specifies the frontend for an **Automatic Number Plate Recognition (ANPR) Enforcement Management System**. The application ingests real-time vehicle detection events from the XCW-MICROCAM-02 ANPR camera via a backend webhook, displays live capture feeds, and provides a summary dashboard tracking all enforcement actions — fines, disputes, clamps, tows, impounds, bookings, booking hours, and revenue.

### 1.1 Goals

- Surface real-time vehicle scan events as they arrive from the camera
- Provide enforcement officers with a clear, fast interface to action each detected vehicle
- Give management an analytics dashboard summarising all enforcement metrics
- Support multi-session data with filtering by date, zone, and officer

### 1.2 Out of Scope (v1)

- Mobile native app (responsive web only)
- ANPR camera configuration / firmware
- Backend business logic or database design
- Payment gateway integration (revenue figures fed from backend)

---

## 2. System Architecture (Frontend Perspective)

```
XCW-MICROCAM-02 (Camera)
        │
        ▼
Backend Payload  ←──  http://98.94.86.116/api/logs
        │
        ├──── REST API  (CRUD for records, summaries, actions)
        │
        └──── WebSocket / SSE  (real-time plate detection push events)
                │
                ▼
        Frontend Web App
        ┌───────────────────────────────────────┐
        │  Live Detection Feed                  │
        │  Vehicle Records & Actions            │
        │  Summary / Analytics Dashboard        │
        │  Fine & Dispute Management            │
        │  Booking Management                   │
        │  Reports & Export                     │
        └───────────────────────────────────────┘
```

### 2.1 Data Flow

1. Camera captures a vehicle → sends detection event to backend webhook.
2. Backend processes the event, stores the record, and pushes a real-time notification (WebSocket/SSE) to all connected frontend clients.
3. Frontend receives the push event and appends the detection to the Live Feed without a page reload.
4. Enforcement officer reviews the capture and triggers an action (fine, clamp, tow, etc.) via a REST call.
5. Summary counters update instantly via optimistic UI, confirmed on next API poll.

---

## 3. Webhook Payload Schema

### 3.1 How the ARH Camera Produces Its Data

The camera is an **ARH (Adaptive Recognition Hungary) SmartCam** running the **Carmen ANPR engine**. Understanding its internal pipeline is critical to correctly rendering and validating what the frontend receives.

#### 3.1.1 Two-Stage ANPR Pipeline

The camera processes each vehicle through two sequential stages before dispatching a result:

```
Vehicle enters frame
        │
        ▼
┌─────────────────────┐
│   PRESELECTION      │  Fast pass: selects the best 1 frame from 3–8
│   (Pre-ANPR)        │  captured frames. Produces a preliminary plate
│                     │  text — fast but less accurate.
└────────┬────────────┘
         │  best frame + preliminary plate data
         ▼
┌─────────────────────┐
│   ANPR STAGE        │  Deep analysis of the selected frame.
│   (Carmen Engine)   │  Produces: final plate text (ANPR_TEXT),
│                     │  nationality, plate position bounding box.
└────────┬────────────┘
         │
         ▼  (optional — requires MMR licence)
┌─────────────────────┐
│   MMR STAGE         │  Make & Model Recognition. Adds vehicle
│   (if licensed)     │  make, model, submodel, category, colour.
└────────┬────────────┘
         │
         ▼
  Result fetched via HTTP GET ← http://98.94.86.116/api/logs
```

**Frontend implication:** The plate text that reaches the frontend (`anpr_text`) is the output of the deep ANPR stage, not the fast Preselection pass. It is the highest-quality read available. If a plate cannot be fully resolved (e.g. partial occlusion), the camera may still emit a result with `plate_text_only: true` and no `country` value.

#### 3.1.2 How the Camera Encodes Its Payload

The ARH camera's **Result Upload** module (ANPR → Result Upload) sends data via HTTP POST using a **configurable template**. The backend exposes `http://98.94.86.116/api/logs` which outputs the normalized JSON directly to the frontend.

The camera's native template variables map to the following JSON fields:

| ARH Template Variable | JSON Field Name | Notes |
|---|---|---|
| `$(ID)` | `event_id` | Auto-incremented DB event ID from camera |
| `$(ANPR_TEXT)` via `$DB2JSON(...)` | `anpr_text` | **The extracted plate number** — JSON-safe encoded |
| `$(cameraid)` | `camera_id` | Camera hardware ID (MAC-based) |
| `$(location)` | `camera_location` | Location string set in camera Title Editor |
| `$FormatTime($(FRAMETIMEMS),...)` | `captured_at` | ISO 8601 from frame timestamp in ms |
| `$(normal_img)` | `vehicle_image_b64` | Full vehicle capture — **Base64 JPEG** |
| `$(lp_img)` | `plate_image_b64` | Cropped plate image — **Base64 JPEG** |
| `$(aux_img)` | `overview_image_b64` | Secondary/overview sensor image — Base64 JPEG, nullable |
| Country (long) `$r` | `country_long` | e.g. `"Nigeria"`, `"Ghana"` |
| Country (short) `$f` | `country_short` | e.g. `"NIG"`, `"GH"` |
| State (long) `$g` | `state_long` | State/region name if resolved |
| State (short) `$j` | `state_short` | State abbreviation |
| Direction `$i` | `direction` | `"APPROACHING"` or `"LEAVING"` (ARH terms), mapped to `IN`/`OUT` |
| Make `$l` | `vehicle_make` | From MMR stage — nullable if MMR not licensed |
| Model `$k` | `vehicle_model` | From MMR stage — nullable |
| Submodel `$L` | `vehicle_submodel` | From MMR stage — nullable |
| Category `$M` | `vehicle_category` | e.g. `"Car"`, `"Truck"`, `"Bus"` |
| Color `$N` | `vehicle_colour` | From MMR stage — nullable |
| Speed `$x` | `speed_kmh` | From radar — nullable (SpeedCam models only) |
| GPS latitude `$A` | `gps_lat` | Nullable — only on GPS-equipped units |
| GPS longitude `$U` | `gps_lng` | Nullable — only on GPS-equipped units |
| Confidence mode | `plate_confidence_mode` | `0` = text only (Preselection), `1` = text + jurisdiction (full ANPR) |

#### 3.1.3 Critical Note on `anpr_text` Encoding

The plate text extracted by the Carmen engine (`ANPR_TEXT`) passes through the function `$DB2JSON($(ANPR_TEXT))` before being embedded in the HTTP payload. This function:

- Converts the internal Carmen DB character encoding to valid JSON-safe UTF-8
- Handles non-Latin scripts (Arabic, Cyrillic, etc.) correctly
- Must **not** be double-decoded by the frontend — treat the value as a plain UTF-8 string

**Do not apply any additional URL-decoding or HTML-entity decoding to `anpr_text`.**

If the camera is configured with `DB2XML` instead of `DB2JSON` (older deployments), the backend must convert accordingly before forwarding.

#### 3.1.4 Image Handling — Base64 vs URL

The ARH camera embeds images **directly in the payload as Base64-encoded JPEG strings** (not as URLs). The backend at `http://98.94.86.116` decodes these and either:

- **Option A (preferred):** Save images to disk / object storage and return `vehicle_image_url`, `plate_image_url` URLs in the normalised JSON
- **Option B:** Pass through raw Base64 strings in the JSON

The frontend spec assumes **Option A** (URL references) for performance. If Option B is used, the frontend must render images using a `data:image/jpeg;base64,...` src attribute, with a file-size caution (images can be 50–150 KB each as Base64).

---

### 3.2 Normalised JSON Payload (Backend → Frontend)

After the backend normalises the ARH camera output, the frontend receives the following JSON structure per detection event. Fields marked `?` are optional/nullable.

```json
{
  "event_id": "123456789",
  "camera_id": "00-1D-4D-11-77-A9",
  "camera_name": "Zone A — Entry Gate",
  "camera_location": "Main Entrance Block 4",
  "captured_at": "2026-06-24T09:42:11.594+01:00",

  "anpr_text": "ABC123XY",
  "plate_confidence_mode": 1,
  "country_long": "Nigeria",
  "country_short": "NIG",
  "state_long": "Lagos",
  "state_short": "LA",

  "vehicle_image_url": "http://98.94.86.116/images/vehicles/123456789_full.jpg",
  "plate_image_url": "http://98.94.86.116/images/plates/123456789_lp.jpg",
  "overview_image_url": null,

  "vehicle_category": "Car",
  "vehicle_make": "Toyota",
  "vehicle_model": "Corolla",
  "vehicle_submodel": null,
  "vehicle_colour": "Silver",

  "direction": "IN",
  "speed_kmh": null,
  "gps_lat": null,
  "gps_lng": null,

  "status": "SCANNED",
  "enforcement_status": null,
  "officer_id": null,
  "notes": null
}
```

### 3.3 Field Definitions

| Field | Type | Description |
|---|---|---|
| `event_id` | string | ARH internal DB event ID — unique per camera |
| `camera_id` | string | Camera hardware MAC-based ID |
| `camera_location` | string | Location label configured in camera Title Editor |
| `captured_at` | ISO 8601 | Frame timestamp with timezone, derived from `FRAMETIMEMS` |
| `anpr_text` | string | **Plate number text** — Carmen ANPR final output, UTF-8, JSON-safe via `DB2JSON`. This is the authoritative plate read. |
| `plate_confidence_mode` | int | `0` = preliminary text only (Preselection stage); `1` = full text + jurisdiction (ANPR stage complete). Only mode `1` results should be actioned without officer verification. |
| `country_long` | string? | Country of plate registration (long name) |
| `country_short` | string? | Country of plate registration (ISO-style code) |
| `state_long` / `state_short` | string? | State/region if resolved by the engine |
| `vehicle_image_url` | string | Full-frame vehicle capture (the `normal_img` from camera) |
| `plate_image_url` | string | Cropped plate region (the `lp_img` from camera) |
| `overview_image_url` | string? | Secondary sensor overview image (`aux_img`), nullable |
| `vehicle_category` | string? | Vehicle class from MMR — `Car`, `Truck`, `Bus`, `Motorcycle`, `Van` |
| `vehicle_make` | string? | Vehicle make from MMR stage — null if MMR not licensed |
| `vehicle_model` | string? | Vehicle model from MMR stage |
| `vehicle_colour` | string? | Vehicle colour from MMR stage |
| `direction` | enum | `IN` (approaching / entering) \| `OUT` (leaving / exiting) \| `UNKNOWN` |
| `speed_kmh` | float? | Radar-measured speed — null on non-SpeedCam deployments |
| `status` | enum | `SCANNED` \| `ACTIONED` \| `CLEARED` |
| `enforcement_status` | enum? | `FINED` \| `CLAMPED` \| `TOWED` \| `IMPOUNDED` \| `BOOKED` \| `DISPUTED` \| null |
| `officer_id` | string? | Officer who actioned the vehicle |

### 3.4 Plate Text Display Rules

Given that `anpr_text` is the raw Carmen ANPR output, the frontend must apply these display rules:

**Rendering:**
- Always display `anpr_text` in a **monospace font** (e.g. `JetBrains Mono`) to prevent confusion between similar characters (`0`/`O`, `I`/`1`, `B`/`8`)
- Display in **ALL CAPS** regardless of how it arrives
- If `country_short` is present, display it as a prefix badge: `[NIG] ABC123XY`

**Confidence gating:**
- `plate_confidence_mode = 1` (full ANPR result with jurisdiction) → display normally with green confidence indicator
- `plate_confidence_mode = 0` (Preselection/preliminary only — no jurisdiction resolved) → display with amber warning badge "Preliminary read — verify plate" and disable one-click enforcement actions; officer must manually confirm before actioning
- If `anpr_text` is empty or null → display "No plate detected" in muted text; still show vehicle images

**Plate correction flow:**
- Officers can tap an edit icon on any low-confidence or unresolved plate to manually correct `anpr_text`
- Corrected values must be stored separately (e.g. `corrected_plate_text`) alongside the original `anpr_text` for audit trail purposes
- The API call to correct a plate: `PATCH /api/v1/vehicles/{event_id}` with `{ "corrected_plate_text": "ABC123XY", "officer_id": "..." }`

### 3.5 Duplicate Event Handling

The ARH camera has a built-in **Duplicate Timeout** setting (ANPR Settings → Filters → Duplicate timeout, default 10 seconds). Within this window, the same plate will not be re-emitted by the camera itself. However:

- The frontend should still apply a client-side duplicate check on the Live Feed: if the same `anpr_text` appears within 60 seconds, flag the card with a yellow "Possible repeat — last seen Xs ago" banner
- Do not block the event — duplicates may be legitimate (e.g. vehicle turning around)

---

## 4. Pages & Screen Specifications

### 4.1 Page Map

```
/                     → Redirect to /dashboard
/dashboard            → Summary Analytics Dashboard
/live                 → Live Detection Feed
/vehicles             → Vehicle Records (searchable log)
/vehicles/:event_id   → Vehicle Detail & Action Panel
/fines                → Fine Management
/fines/:fine_id       → Fine Detail & Dispute Panel
/bookings             → Booking Management
/bookings/new         → New Booking Form
/reports              → Reports & Export
/settings             → System Settings (camera config, zones, user roles)
```

---

### 4.2 Page: Summary Analytics Dashboard (`/dashboard`)

This is the primary management view. It displays the **9 core KPI cards** and supporting charts.

#### 4.2.1 KPI Cards (top row)

Each card shows: the current count/value, a label, a delta vs. previous period, and a sparkline trend.

| # | Card Label | Metric Key | Format |
|---|---|---|---|
| 1 | Total Scanned Vehicles | `total_scanned` | Integer |
| 2 | Vehicles Fined | `total_fined` | Integer |
| 3 | Disputed Fines | `total_disputed` | Integer |
| 4 | Vehicles Clamped | `total_clamped` | Integer |
| 5 | Vehicles Towed | `total_towed` | Integer |
| 6 | Vehicles Impounded | `total_impounded` | Integer |
| 7 | Total Bookings | `total_bookings` | Integer |
| 8 | Total Booking Hours | `total_booking_hours` | Decimal (hrs) |
| 9 | Total Revenue | `total_revenue` | Currency (₦) |

#### 4.2.2 Dashboard Supporting Charts

- **Scans Over Time** — Line chart, hourly/daily/weekly toggle
- **Enforcement Breakdown** — Donut chart (Fined / Clamped / Towed / Impounded / Cleared)
- **Revenue Trend** — Bar chart, filterable by date range
- **Top Violation Zones** — Horizontal bar chart by zone name
- **Recent Activity Feed** — Last 20 enforcement actions, live-updating

#### 4.2.3 Filters (global, persistent in URL params)

- Date range picker (today / this week / this month / custom)
- Zone selector (multi-select dropdown)
- Camera selector (single or all)
- Officer selector

#### 4.2.4 API Endpoint

```
GET /api/v1/summary?from=&to=&zone=&camera_id=&officer_id=
```

Response shape:
```json
{
  "total_scanned": 1240,
  "total_fined": 312,
  "total_disputed": 45,
  "total_clamped": 87,
  "total_towed": 33,
  "total_impounded": 12,
  "total_bookings": 198,
  "total_booking_hours": 412.5,
  "total_revenue": 1845000.00,
  "currency": "NGN",
  "period": { "from": "2026-06-01", "to": "2026-06-24" }
}
```

---

### 4.3 Page: Live Detection Feed (`/live`)

The real-time operational view used by enforcement officers on the ground.

#### 4.3.1 Layout

```
┌──────────────────────────────────────────────────┐
│  LIVE FEED  ●  XCW-MICROCAM-02  [Zone A]  09:42  │
├──────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ Vehicle Img │  │ Plate Img   │  │  Plate:   │ │
│  │             │  │ [ABC-123XY] │  │ ABC-123XY │ │
│  │             │  └─────────────┘  │ Toyota    │ │
│  │             │                   │ Silver    │ │
│  └─────────────┘                   │ Saloon    │ │
│                                    │ IN · Zone A│ │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ 09:42:11  │ │
│  [FINE]  [CLAMP]  [TOW]            └───────────┘ │
│  [IMPOUND]  [BOOK]  [CLEAR]                       │
├──────────────────────────────────────────────────┤
│  RECENT DETECTIONS                                │
│  09:41 · MNO-456-AB · Fined       · Zone A  [▶]  │
│  09:39 · XYZ-789-CD · Cleared     · Zone B  [▶]  │
│  09:37 · LKJ-321-EF · Clamped     · Zone A  [▶]  │
└──────────────────────────────────────────────────┘
```

#### 4.3.2 Behaviour

- **Auto-scroll:** Each new detection event pushes to the top of the feed. A sticky banner appears ("3 new events — scroll to top") when the user has scrolled down.
- **Sound alert:** Optional audible beep per new detection (toggleable by officer).
- **Status badge:** Each detection card shows a colour-coded badge — `PENDING` (amber), `FINED` (red), `CLEARED` (green), `CLAMPED` (orange), `TOWED` (purple), `IMPOUNDED` (dark red), `BOOKED` (blue), `DISPUTED` (yellow).
- **Connection indicator:** A dot icon shows WebSocket connection state — green (connected), amber (reconnecting), red (disconnected with retry countdown).

#### 4.3.3 Real-Time Connection

```javascript
// WebSocket subscription (preferred)
ws://98.94.86.116/ws/live-feed

// Fallback: SSE
GET /api/v1/live/stream  (Content-Type: text/event-stream)

// Fallback-fallback: Polling
GET /api/v1/live/latest?after=<last_event_id>  (poll every 5s)
```

#### 4.3.4 Action Buttons

When an officer clicks an action on a pending detection card:

| Button | Action Triggered | Required Fields |
|---|---|---|
| FINE | Opens fine form modal | Amount, Offence Code, Notes |
| CLAMP | Confirms clamp action | Officer badge, Notes |
| TOW | Confirms tow action | Tow company, Destination |
| IMPOUND | Confirms impound | Impound yard, Reason |
| BOOK | Opens booking form | Duration (hrs), Bay number |
| CLEAR | Marks as no offence | Notes (optional) |

All actions call:
```
POST /api/v1/vehicles/{event_id}/action
Body: { "action": "FINED", "officer_id": "...", "details": { ... } }
```

---

### 4.4 Page: Vehicle Records (`/vehicles`)

A searchable, sortable, paginated log of all detected vehicles.

#### 4.4.1 Filters

- Search by plate number (partial match supported)
- Date range
- Zone
- Enforcement status (multi-select)
- Camera
- Vehicle colour / type (optional secondary filters)

#### 4.4.2 Table Columns

| Column | Sortable | Notes |
|---|---|---|
| Plate Number | Yes | Clickable — opens detail page |
| Plate Image | No | Thumbnail (expandable on hover) |
| Vehicle Image | No | Thumbnail (expandable on hover) |
| Date & Time | Yes | Local timezone display |
| Zone | Yes | |
| Make / Colour | No | |
| Direction | No | IN / OUT badge |
| Status | Yes | Colour-coded badge |
| Officer | No | |
| Actions | No | Quick-action icon buttons |

Pagination: 50 records per page, with "load more" option. Virtualized list recommended for large datasets.

#### 4.4.3 API Endpoint

```
GET /api/v1/vehicles?plate=&from=&to=&zone=&status=&page=&limit=
```

---

### 4.5 Page: Vehicle Detail & Action Panel (`/vehicles/:event_id`)

Full view of a single detection event.

#### 4.5.1 Layout Sections

**A — Capture Evidence**
- Full-resolution vehicle image (lightbox-expandable)
- Cropped plate image
- OCR confidence score with visual indicator (e.g. green ≥ 0.90, amber 0.75–0.89, red < 0.75)

**B — Vehicle Details**
- Plate number (editable if OCR confidence < 0.85, with "Correct Plate" button)
- Vehicle make, colour, type, direction, zone, timestamp, camera

**C — Enforcement History**
- Timeline of all actions taken on this vehicle (if repeat offender, shows history across events)
- Each entry: timestamp, action, officer, notes, fine amount

**D — Action Panel**
- Same action buttons as Live Feed
- Shows current status prominently
- Dispute button visible if status is `FINED`

**E — Notes**
- Free text field for officer remarks
- Saved automatically on blur

---

### 4.6 Page: Fine Management (`/fines`)

#### 4.6.1 List View Filters

- Plate number search
- Fine status: `ISSUED` / `PAID` / `DISPUTED` / `WAIVED` / `OVERDUE`
- Date range
- Offence code
- Officer

#### 4.6.2 Table Columns

Plate Number | Offence | Amount | Issued Date | Due Date | Status | Officer | Actions

#### 4.6.3 Fine Detail Page (`/fines/:fine_id`)

- All fine metadata
- Payment status timeline
- Dispute section: if disputed, shows dispute reason, date filed, resolution status
- "Uphold Fine" / "Waive Fine" action buttons (role-gated to supervisors)

---

### 4.7 Page: Booking Management (`/bookings`)

#### 4.7.1 List View

Table of all bookings: Plate | Bay / Zone | Start Time | Duration (hrs) | End Time | Status | Revenue | Officer

Status values: `ACTIVE` / `COMPLETED` / `OVERSTAYED` / `CANCELLED`

Overstayed bookings highlighted in amber.

#### 4.7.2 New Booking Form (`/bookings/new`)

Fields:
- Plate number (lookup from vehicle records or manual entry)
- Zone / Bay number
- Start time (defaults to now)
- Duration (hrs) — calculated end time shown live
- Officer ID
- Notes

On submit: `POST /api/v1/bookings`

---

### 4.8 Page: Reports & Export (`/reports`)

#### 4.8.1 Report Types

| Report | Description |
|---|---|
| Daily Enforcement Summary | All 9 KPIs for a given day |
| Revenue Report | Revenue by zone, officer, date range |
| Dispute Report | All disputed fines with resolution status |
| Officer Activity Report | Actions per officer over period |
| Repeat Offenders Report | Plates with 2+ violations |
| Vehicle Scan Log | Full detection log (filterable) |

#### 4.8.2 Export Formats

- CSV (all reports)
- PDF (summary and revenue reports)
- Excel / XLSX (tabular reports)

Export calls: `GET /api/v1/reports/{report_type}?format=csv&from=&to=&...`

---

### 4.9 Page: Settings (`/settings`)

Accessible to Admin role only.

- **Camera Management:** List of connected cameras, status indicator, last heartbeat, zone assignment
- **Zone Configuration:** Add/edit zones, map view with zone boundaries
- **User & Role Management:** Officers, Supervisors, Admins — CRUD
- **Offence Codes & Fine Amounts:** Configurable table of offence codes and default fine amounts
- **Notification Settings:** Email/SMS alerts for new disputes, daily summary dispatch
- **Webhook Status:** Shows last received event timestamp, event rate (events/min), error rate

---

## 5. UI Component Library

### 5.1 Core Components Required

| Component | Description |
|---|---|
| `DetectionCard` | Real-time event card with images, plate, actions |
| `PlateImage` | Cropped plate display with OCR confidence badge |
| `VehicleImage` | Full vehicle image with lightbox |
| `StatusBadge` | Colour-coded enforcement status pill |
| `KPICard` | Metric card with count, label, delta, sparkline |
| `ActionButton` | Primary action button (Fine, Clamp, Tow, etc.) |
| `ActionModal` | Modal for capturing action details |
| `LiveIndicator` | WebSocket connection dot indicator |
| `DataTable` | Sortable, paginated table with filter row |
| `DateRangePicker` | Date range filter control |
| `ExportButton` | Download trigger with format selector |
| `Timeline` | Vertical event history timeline |
| `ConfidenceMeter` | Visual OCR confidence indicator |
| `ZoneSelector` | Dropdown with multi-select support |
| `ReportCard` | Report type selection card |

### 5.2 Design Tokens

```css
/* Palette */
--colour-bg:           #0F1117;   /* Near-black base */
--colour-surface:      #1A1D27;   /* Card/panel surface */
--colour-border:       #2C2F3E;   /* Subtle borders */
--colour-text-primary: #E8EAF0;   /* Primary text */
--colour-text-muted:   #6B7280;   /* Secondary text */

/* Enforcement status colours */
--colour-scanned:      #4B9FE1;   /* Blue */
--colour-fined:        #EF4444;   /* Red */
--colour-disputed:     #F59E0B;   /* Amber */
--colour-clamped:      #F97316;   /* Orange */
--colour-towed:        #A855F7;   /* Purple */
--colour-impounded:    #991B1B;   /* Dark red */
--colour-booked:       #0EA5E9;   /* Cyan */
--colour-cleared:      #22C55E;   /* Green */

/* Accent */
--colour-accent:       #3B82F6;   /* Primary blue */
--colour-accent-hover: #2563EB;

/* Typography */
--font-display:  'Inter', sans-serif;  /* UI chrome */
--font-mono:     'JetBrains Mono', monospace;  /* Plate numbers */
--font-data:     'Tabular', 'Inter', sans-serif;  /* Tables, KPIs */
```

> **Note:** Plate numbers must always be rendered in monospace to ensure character legibility (0 vs O, 1 vs l, etc.).

---

## 6. State Management

### 6.1 Global Store Shape (recommended: Zustand or Redux Toolkit)

```typescript
interface AppState {
  // Live feed
  liveEvents: DetectionEvent[];
  feedConnected: boolean;
  newEventCount: number;  // unread count when scrolled down

  // Summary
  summary: SummaryMetrics;
  summaryFilters: DateRange & ZoneFilters;
  summaryLoading: boolean;

  // Vehicle records
  vehicles: PaginatedResult<Vehicle>;
  vehicleFilters: VehicleFilters;

  // Auth
  currentUser: Officer | null;
  role: 'OFFICER' | 'SUPERVISOR' | 'ADMIN';

  // Settings
  cameras: Camera[];
  zones: Zone[];
}
```

### 6.2 Real-Time Event Handling

```typescript
// On WebSocket message received:
function onDetectionEvent(event: DetectionEvent) {
  // 1. Prepend to live feed list (cap at 500 items in memory)
  // 2. Increment newEventCount if user has scrolled down
  // 3. Optimistically increment total_scanned in summary
  // 4. Play audio alert if enabled
  // 5. Show browser notification if tab is not focused
}
```

---

## 7. Authentication & Roles

### 7.1 Auth Flow

- JWT-based authentication
- Login page at `/login` — username + password
- Access token stored in memory (not localStorage); refresh token in HttpOnly cookie
- Auto-refresh on 401 responses

### 7.2 Role-Based Access

| Feature | Officer | Supervisor | Admin |
|---|---|---|---|
| View Live Feed | ✅ | ✅ | ✅ |
| Take Actions (Fine, Clamp, etc.) | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ |
| Resolve Disputes | ❌ | ✅ | ✅ |
| Waive Fines | ❌ | ✅ | ✅ |
| Export Reports | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Settings | ❌ | ❌ | ✅ |

---

## 8. Error States & Edge Cases

| Scenario | UI Behaviour |
|---|---|
| WebSocket disconnected | Amber pulsing dot + "Reconnecting…" banner; auto-retry with backoff |
| Image URL fails to load | Grey placeholder with camera icon + "Image unavailable" |
| `plate_confidence_mode = 0` (Preselection only, no jurisdiction) | Amber badge "Preliminary read — verify plate". Enforcement action buttons require officer manual confirmation. Edit icon shown to correct plate. |
| `anpr_text` is null or empty | "No plate detected" shown in muted text. Images still displayed. Officer can manually enter plate to proceed. |
| Duplicate `anpr_text` within 60 s | Yellow banner "Possible repeat — last seen Xs ago". Do not suppress event. |
| Action submission fails | Toast error, button re-enabled, optimistic update rolled back |
| No events in last 10 min | Subtle "No recent activity" notice (not an error — normal off-peak) |
| Session expired | Intercept 401, redirect to `/login`, preserve intended URL |

---

## 9. Performance Requirements

| Metric | Target |
|---|---|
| First Contentful Paint (dashboard) | < 1.5s |
| Live Feed event-to-render latency | < 500ms from server push |
| Vehicle records table (1000 rows) | Virtualized, scroll at 60fps |
| Image thumbnails | Lazy-loaded, served with width parameter (e.g. `?w=120`) |
| Summary API response | < 800ms (cached server-side for 60s) |
| Offline state (PWA optional) | Show last-known data with stale banner |

---

## 10. Recommended Tech Stack

| Layer | Recommendation | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | Concurrent mode for real-time updates |
| Build Tool | Vite | Fast HMR in dev |
| State | Zustand | Lightweight; easy WebSocket integration |
| Data Fetching | TanStack Query (React Query) | Cache, refetch, pagination |
| Real-time | native WebSocket API | With reconnect logic via `reconnecting-websocket` |
| UI Components | shadcn/ui + Tailwind CSS | Accessible, customisable |
| Charts | Recharts | Lightweight; works well with React |
| Tables | TanStack Table | Virtualisation built-in |
| Date handling | date-fns | Lightweight |
| Forms | React Hook Form + Zod | Validation |
| Export | jsPDF + xlsx | Client-side PDF/Excel |
| Auth | Custom JWT hook | HttpOnly cookie for refresh token |
| Routing | React Router v6 | File-based routing pattern |

---

## 11. API Integration Summary

| Method | Endpoint | Purpose |
|---|---|---|
| WS | `ws://98.94.86.116/ws/live-feed` | Real-time detection events |
| GET | `/api/v1/summary` | Dashboard KPIs |
| GET | `/api/v1/vehicles` | Paginated vehicle records |
| GET | `/api/v1/vehicles/:id` | Single vehicle detail |
| POST | `/api/v1/vehicles/:id/action` | Take enforcement action |
| GET | `/api/v1/fines` | Fine list |
| GET | `/api/v1/fines/:id` | Fine detail |
| PATCH | `/api/v1/fines/:id` | Update fine (pay, waive, dispute) |
| GET | `/api/v1/bookings` | Booking list |
| POST | `/api/v1/bookings` | Create booking |
| PATCH | `/api/v1/bookings/:id` | Update booking |
| GET | `/api/v1/reports/:type` | Export report |
| GET | `/api/v1/cameras` | Camera list & status |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |

---

## 12. Accessibility & Responsive Design

- WCAG 2.1 AA compliance minimum
- All action buttons keyboard-accessible with visible focus ring
- Status badges do not rely on colour alone — include icon + label
- Responsive breakpoints: Desktop (≥1280px) primary; Tablet (768–1279px) supported; Mobile (< 768px) read-only dashboard view
- `prefers-reduced-motion` respected — no animations in reduced motion mode
- All images have descriptive `alt` attributes (plate number, vehicle description)

---

## 13. Open Questions for Backend Team

The ARH camera manual (reviewed June 2026) has resolved several previously open items. The remaining questions are listed below.

### 13.1 Resolved by ARH Camera Manual

| Item | Resolution |
|---|---|
| **Plate text field name** | `$(ANPR_TEXT)` via `$DB2JSON()` — arrives as `anpr_text` in normalised JSON |
| **Image encoding** | Camera embeds images as Base64 JPEG in payload (`normal_img`, `lp_img`, `aux_img`). Backend decodes and serves as URLs. |
| **Direction values** | ARH emits `APPROACHING` / `LEAVING` — backend maps to `IN` / `OUT` |
| **Plate confidence** | ARH uses `plate_confidence_mode` (0 = Preselection only, 1 = full ANPR + jurisdiction). No 0–1 float. |
| **Duplicate suppression** | Camera has built-in duplicate timeout (default 10 s). Frontend adds a 60 s soft-flag warning. |
| **Camera event ID format** | `$(ID)` — sequential integer per camera DB. Backend must namespace by `camera_id`. |
| **MMR field source** | Make, model, colour, category come from MMR stage — only if MMR Hardware Key Licence is installed. |
| **Result encoding** | Camera must be configured with `$DB2JSON()` (not `$DB2XML()`) for the backend to receive clean JSON-safe plate text. |

### 13.2 Still Open

1. **WebSocket vs SSE:** Which real-time protocol does the backend expose to the frontend?
2. **Image URL auth:** Are served image URLs publicly accessible, or do they require auth headers on fetch?
3. **Pagination style:** Cursor-based or offset/page-based for `/vehicles`?
4. **Historical data range:** How far back does `/summary` support? Is data archived or rolling?
5. **Dispute workflow:** Is dispute submission officer-initiated only, or can vehicle owners submit externally?
6. **Camera heartbeat endpoint:** Does the backend expose a `/cameras/:id/health` endpoint? The ARH camera logs are at Maintenance → Camera Log — is this surfaced via API?
7. **Revenue currency:** Confirmed NGN (₦)? Fixed or configurable per deployment zone?
8. **Plate correction enrichment:** When an officer submits a corrected plate, does the backend re-run blacklist/whitelist rules against the corrected value?
9. **Multi-camera `event_id` uniqueness:** ARH `$(ID)` is sequential per-device. Confirm the backend generates a system-wide unique ID before forwarding to the frontend.
10. **MMR licence status:** Is MMR installed? If not, `vehicle_make`, `vehicle_model`, `vehicle_colour`, and `vehicle_category` will always be null — those fields should be hidden, not shown as "Unknown".

---

## 14. ARH Camera Configuration Checklist (for Backend / DevOps)

These camera settings must be verified before the frontend can receive correctly structured data. Derived from the ARH SmartCam User's Manual.

| Setting | Camera UI Path | Required Value |
|---|---|---|
| Upload Method | ANPR → Result Upload → Upload Method | `HTTP` |
| Upload Host | ANPR → Result Upload → Host | `98.94.86.116` |
| Data template — plate text | ANPR → Result Upload → Configure Result File Format | Must use `$DB2JSON($(ANPR_TEXT))` |
| Upload Content: Image | Result Upload → Upload Content | ✅ Enabled (`normal_img`) |
| Upload Content: Plate Image | Result Upload → Upload Content | ✅ Enabled (`lp_img`) |
| Upload Content: Result Data | Result Upload → Upload Content | ✅ Enabled |
| Processing Stage | ANPR → ANPR Settings → Processing stages | `ANPR` or `ANPR+MMR` |
| Event Filter | ANPR → ANPR Settings → Filters → Event filter | `Return events with license plate` |
| Duplicate timeout | ANPR → ANPR Settings → Filters → Duplicate timeout | `10` seconds (adjust per site) |
| Create LP images | ANPR → ANPR Settings | ✅ Enabled |
| Location string | ANPR → Title Editor → Device location string | Human-readable zone name e.g. `Zone A - Main Gate` |
| Device ID string | ANPR → Title Editor → Device ID string | Deployment-specific identifier |
| NTP client | Basic Setup → Date and Time → NTP client | `Regular NTP client` with reachable server |
| Timezone | Basic Setup → Date and Time → Time zone | `Africa/Lagos` (WAT, UTC+1) |

---

*End of Specification — v1.1 (updated with ARH SmartCam camera manual findings)*
