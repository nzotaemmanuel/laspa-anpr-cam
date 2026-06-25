# LASPA ANPR Console — Frontend Specification

**Document Version:** 1.2  
**Date:** June 2026  
**Payload Source:** `http://98.94.86.116/api/logs`  
**Audience:** Frontend Engineers, UI/UX Designers, QA Engineers

---

## 1. Project Overview

This document specifies the frontend for the **LASPA ANPR Console** (Automatic Number Plate Recognition Enforcement Management System). The application ingests real-time vehicle detection events from ANPR cameras via a backend webhook, displays live capture feeds, and provides a summary dashboard tracking all enforcement actions — fines, disputes, clamps, tows, impounds, bookings, booking hours, and revenue.

### 1.1 Goals

- Surface real-time vehicle scan events as they arrive from the cameras.
- Provide enforcement officers with a clear, fast interface to action each detected vehicle.
- Give management an analytics dashboard summarizing all enforcement metrics.
- Support multi-session data with filtering by date, zone, and officer.
- Provide a fully responsive layout that supports mobile-first ground operations.

### 1.2 Out of Scope (v1)

- Mobile native app (responsive web console only).
- ANPR camera configuration / firmware.
- Backend business logic or database design.
- Payment gateway integration (revenue figures fed from backend).

---

## 2. System Architecture (Frontend Perspective)

```
ANPR Cameras (e.g. ARH SmartCam)
        │
        ▼
Backend Payload  ←──  http://98.94.86.116/api/logs
        │
        ├──── REST API  (CRUD for records, summaries, actions)
        │
        ▼
Frontend Web App (LASPA ANPR Console)
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

### 3.1 How the Camera Produces Its Data

The cameras are **ARH (Adaptive Recognition Hungary) SmartCams** running the **Carmen ANPR engine**. Understanding its internal pipeline is critical to correctly rendering and validating what the frontend receives.

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

- Converts the internal Carmen DB character encoding to valid JSON-safe UTF-8.
- Handles non-Latin scripts (Arabic, Cyrillic, etc.) correctly.
- Must **not** be double-decoded by the frontend — treat the value as a plain UTF-8 string.

**Do not apply any additional URL-decoding or HTML-entity decoding to `anpr_text`.**

If the camera is configured with `DB2XML` instead of `DB2JSON` (older deployments), the backend must convert accordingly before forwarding.

#### 3.1.4 Image Handling — S3 Proxied Requests

The ARH camera embeds images directly in the payload as Base64-encoded JPEG strings. To optimize network usage, the backend decodes these and uploads them to an S3 bucket, returning the `vehicle_image_url` and `plate_image_url` URLs. To bypass CORS issues, the frontend configures a local proxy `/s3-proxy/` pointing to the AWS S3 domain `https://microcam-alpr-images-808715036111.s3.amazonaws.com`.

---

### 3.2 Normalised JSON Payload (Backend → Frontend)

After the backend normalises the ANPR camera output, the frontend receives the following JSON structure per detection event. Fields marked `?` are optional/nullable.

```json
{
  "event_id": "123456789",
  "camera_id": "00-1D-4D-11-77-A9",
  "camera_name": "Zone A — Entry Gate",
  "camera_location": "Main Entrance Block 4",
  "captured_at": "2026-06-24T09:42:11.594Z",

  "anpr_text": "ABC123XY",
  "plate_confidence_mode": 1,
  "country_long": "Nigeria",
  "country_short": "NGA",
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
| `event_id` | string | Camera internal DB event ID — unique per camera |
| `camera_id` | string | Camera hardware MAC-based ID |
| `camera_location` | string | Location label configured in camera Title Editor |
| `captured_at` | ISO 8601 | Frame timestamp normalized to UTC (e.g. appended with `Z` if missing offset) |
| `anpr_text` | string | **Plate number text** — Carmen ANPR final output, UTF-8, JSON-safe. |
| `plate_confidence_mode` | int | `0` = preliminary text only (Preselection stage); `1` = full text + jurisdiction (ANPR stage complete). Only mode `1` results should be actioned without officer verification. |
| `country_long` | string? | Country of plate registration (long name) |
| `country_short` | string? | Country of plate registration (ISO-style code) |
| `state_long` / `state_short` | string? | State/region if resolved by the engine |
| `vehicle_image_url` | string | Full-frame vehicle capture |
| `plate_image_url` | string | Cropped plate region |
| `overview_image_url` | string? | Secondary sensor overview image, nullable |
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

Given that `anpr_text` is the raw ANPR output, the frontend applies these display rules:

**Rendering:**
- Always display `anpr_text` in a **monospace font** (e.g. `JetBrains Mono`) to prevent confusion between similar characters (`0`/`O`, `I`/`1`, `B`/`8`).
- Display in **ALL CAPS** regardless of how it arrives.
- **Badge displays**: The country code badge prefix (`[NGA]` or similar) is **omitted** globally to keep plate listings clean and focused. The state abbreviation (e.g., `LA`) is shown on the right of the plate if resolved.

**Confidence gating:**
- `plate_confidence_mode = 1` (full ANPR result) → display normally with green confidence indicators.
- `plate_confidence_mode = 0` (Preselection/preliminary only) → display with amber warning badge "Preliminary read — verify plate" and disable one-click enforcement actions; officer must manually confirm plate text first.
- If `anpr_text` is empty or null → display "No plate detected" in muted text; still show vehicle images.

**Plate correction flow:**
- Officers can tap the edit icon on any pending detection card to manually correct `anpr_text`.
- Corrected values are saved and stored separately as `corrected_plate_text` alongside the original `anpr_text` for auditing.

### 3.5 Duplicate Event Handling

- The frontend applies a client-side duplicate check on the Live Feed: if the same `anpr_text` appears within 60 seconds, it displays a yellow warning banner: `"Possible repeat — last seen Xs ago"`.
- This warning does not block the event stream.

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
/reports              → Reports & Export
/settings             → System Settings (camera config, zones, user roles)
```

---

### 4.2 Page: Summary Analytics Dashboard (`/dashboard`)

Displays the core KPIs and supporting charts. All layout wrappers are responsive, using `p-4 md:p-6`.

#### 4.2.1 KPI Cards (top row)

Each card displays a count, label, delta trend vs. previous period, and a visual sparkline.

1. **Total Scanned Vehicles** (Integer)
2. **Vehicles Fined** (Integer)
3. **Disputed Fines** (Integer)
4. **Vehicles Clamped** (Integer)
5. **Vehicles Towed** (Integer)
6. **Vehicles Impounded** (Integer)
7. **Total Bookings** (Integer)
8. **Total Booking Hours** (Decimal)
9. **Total Revenue** (Currency, formatted in Naira `₦`)

#### 4.2.2 Dashboard Supporting Charts

- **Scans Over Time** — Line chart toggleable between daily/weekly/monthly ranges.
- **Enforcement Breakdown** — Donut chart showing relative distribution of citations.
- **Revenue Trend** — Bar chart displaying yields by day.
- **Top Violation Zones** — Horizontal bar chart displaying infractions grouped by location.
- **Recent Activity Feed** — Last 10 captured logs with the following responsive column rules:
  * **Location**: hidden on small screens (`hidden sm:table-cell`).
  * **Category/Details**: hidden on small and tablet screens (`hidden md:table-cell`).

---

### 4.3 Page: Live Detection Feed (`/live`)

The real-time operational view used by enforcement officers. Features an audio alert toggle and dynamic connection state indicator.

#### 4.3.1 WebSocket Reconnection & Backoff

To handle network outages gracefully, the connection logic employs an exponential backoff system:
- Connection retries begin at `3000ms`.
- Subsequent failed attempts multiply the retry delay by `1.5` up to a maximum interval of `30000ms`.
- Upon successful reconnection, the interval immediately resets to `3000ms`.

---

### 4.4 Page: Vehicle Records (`/vehicles`)

A searchable, sortable, paginated log of all detected vehicles.

#### 4.4.1 Responsive DataTable Columns

To prevent horizontal clipping on mobile devices, columns are hidden responsively:

| Column | Sortable | Responsive Class | Notes |
|---|---|---|---|
| Plate Number | Yes | (Visible always) | Opens detail page |
| Plate Crop | No | (Visible always) | Cropped plate thumbnail |
| Vehicle Preview | No | `hidden md:table-cell` | Full vehicle thumbnail |
| Date & Time | Yes | (Visible always) | WAT local timezone format |
| Zone Location | Yes | `hidden sm:table-cell` | Camera location string |
| Status | Yes | (Visible always) | Color-coded status pill |
| Actions | No | (Visible always) | Audit details navigation |

---

### 4.5 Page: Fine Management (`/fines`)

Displays details of all citations issued. 

#### 4.5.1 Responsive Columns
- **Offence Code**: `hidden sm:table-cell`
- **Issued Date**: `hidden md:table-cell`
- **Due Date**: `hidden sm:table-cell`
- **Issued By**: `hidden md:table-cell`

---

### 4.6 Page: Booking Management (`/bookings`)

Displays details of parking bay bookings.
- **Zone/Bay**: `hidden sm:table-cell`
- **Start Time**: `hidden sm:table-cell`
- **Officer**: `hidden md:table-cell`

---

## 5. UI Component Library

### 5.1 Design Tokens (Tailwind CSS v4 & index.css)

All UI elements are configured with dynamic light/dark theme variables inside [index.css](file:///c:/Users/HP/OneDrive/Emmanuel%20Docs/Bell%20International%20Limited/LASPA/LASPA-ANPR-Cam/src/index.css):

```css
/* Color Mappings */
:root {
  /* Dark Theme variables */
  --bg-base:        #080C18;
  --bg-surface:     rgba(14, 20, 40, 0.65);
  --bg-surface-2:   rgba(20, 28, 55, 0.80);
  --bg-elevated:    rgba(25, 35, 65, 0.90);
  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-muted:   rgba(255, 255, 255, 0.10);
  --text-primary:   #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted:     #475569;
}

:root.light {
  /* Light Theme variables */
  --bg-base:        #EEF2FF;
  --bg-surface:     rgba(255, 255, 255, 0.75);
  --bg-surface-2:   rgba(240, 245, 255, 0.85);
  --bg-elevated:    rgba(255, 255, 255, 0.95);
  --border-subtle:  rgba(99, 102, 241, 0.10);
  --border-muted:   rgba(99, 102, 241, 0.18);
  --text-primary:   #0F172A;
  --text-secondary: #475569;
  --text-muted:     #94A3B8;
}
```

---

## 6. Authentication & Roles

### 6.1 Authentication Bypass for Local Testing

For local development and testing convenience, if no `currentUser` is present in the Zustand store, the system automatically initializes a default Admin session:
- **Officer ID**: `default_admin`
- **Username**: `admin`
- **Name**: `Administrator`
- **Role**: `ADMIN`
- **Badge Number**: `BADGE-0001`
- **Token**: `bypass-token`

This ensures that routing protections do not block offline navigation.

### 6.2 Role-Based Access Control
- **Officer**: Access to Dashboard, Live Feed, Vehicles, Fines, and Bookings.
- **Supervisor**: Access to all Officer features + Reports + resolving and waiving fines.
- **Admin**: Complete access to all features, including User Management and camera/webhook configs under Settings.

---

## 7. Recommended Stack

The application is built utilizing the following stack:
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **State Management**: Zustand 5
- **Routing**: React Router v7 (client-side Layout nesting)
- **Styling**: Tailwind CSS v4 + `@tailwindcss/vite`
- **Icons**: Lucide React
- **Charts**: Recharts
- **Linter**: Oxlint

---

*End of Specification — v1.2 (updated to match final build configurations)*
