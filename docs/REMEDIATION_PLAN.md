# TrackUG Remediation Plan & Master Architectural Roadmap

> **Standard Compliance:** Uganda Data Protection and Privacy Act (DPPA) 2019, Section 43  
> **Target Architecture:** Multi-service event-driven system (GT06 TCP Ingestion, PostGIS/TimescaleDB, Redis Streams, SHA-256 Chained Audit Trail)

---

## 1. Executive Summary

This master remediation plan addresses all vulnerabilities, prototype shortcuts, missing integrations, and architectural fallbacks identified during the system audit of TrackUG. Each item defines its **Finding ID**, **Severity Level**, **Root Cause**, **Implementation Fix**, and **Verification Test Cases**.

---

## 2. Master Finding Matrix & Fix Roadmap

### FIND-001: Ephemeral In-Memory State & Refresh Reset
* **Severity:** `CRITICAL`
* **Affected Areas:** `src/App.tsx`, `src/data/mockData.ts`
* **Root Cause:**
  All domain entities (`vehicles`, `alerts`, `cases`, `sightings`, `geofences`, `devices`, `cameras`, `auditLogs`) resided exclusively in React component `useState`. Any page reload, browser crash, or tab navigation wiped active stolen vehicle cases, device provisionings, and audit records back to static mock arrays.
* **Implementation Fix:**
  1. Built a fault-tolerant storage manager (`src/utils/storage.ts`) providing automatic JSON serialization and hydration via `localStorage` with versioned namespacing (`trackug_v1_*`).
  2. Implemented active state hydration hooks across all primary slices with fallback to initial seed datasets.
  3. Added an administrative **"Reset to Default Seed Data"** control with two-stage confirmation in `SettingsScreen.tsx`.
* **Proving Test Cases:**
  * **TC-001.1 (Persistence on Reload):** Report vehicle `UBD 777Q` as stolen, verify case file `CRB/XXXX/2026` is created, trigger hard browser reload (`Ctrl+F5`), and assert case file and stolen status remain intact.
  * **TC-001.2 (Audit Ledger Persistence):** Execute a location query, reload page, and assert the cryptographic audit record is present in the ledger table.
  * **TC-001.3 (Administrative Seed Reset):** Trigger seed reset in Settings, confirm prompt, and assert state reverts cleanly to initial state without orphan keys.

---

### FIND-002: Uganda DPPA 2019 Section 43 Statutory Bypass
* **Severity:** `CRITICAL`
* **Affected Areas:** `src/App.tsx`, `src/components/AccessReasonModal.tsx`
* **Root Cause:**
  Section 43 of the Uganda Data Protection and Privacy Act 2019 mandates that all state or agency access to citizen geolocation telemetry must have an active operational justification and court/police reference. The prototype only invoked `AccessReasonModal` from `CasesScreen`, allowing agency operators to click any vehicle on the map or fleet list to inspect live coordinates and route breadcrumbs without justification.
* **Implementation Fix:**
  1. Wrapped vehicle selection in `handleSelectVehicleWithGate` in `App.tsx`.
  2. For `agency` and `admin` roles, vehicle coordinate access is blocked unless the plate exists in the active session's `unlockedPlates` registry.
  3. Clicking an un-cleared vehicle forces the `AccessReasonModal` prompt requiring a valid Case Reference # (CRB) and operational justification.
  4. Submission immediately commits an append-only audit event to the ledger and unlocks the vehicle for that session.
* **Proving Test Cases:**
  * **TC-002.1 (Unauthorized Access Block):** Log in as `agency`, click vehicle `UBD 777Q` on the Live Map. Assert modal appears and coordinates remain hidden behind the gate.
  * **TC-002.2 (Justification Recording):** Enter CRB `UPF-CRB-2026-8812` and reason "Stolen vehicle search warrant". Submit and assert vehicle details unlock while an audit event with action `VIEW_STOLEN_CASE_LOCATION` is recorded.
  * **TC-002.3 (Session Memory):** Re-click the same vehicle during the same session; assert no redundant prompt is shown.

---

### FIND-003: Unchained & Tamperable Audit Logs
* **Severity:** `HIGH`
* **Affected Areas:** `src/components/Screens/AuditLogScreen.tsx`, `src/types.ts`
* **Root Cause:**
  Audit records were stored as plain objects with generated string IDs (`aud-XXXX`). There was no mathematical proof of sequential integrity or tamper resistance; any record could be modified or deleted without detection.
* **Implementation Fix:**
  1. Engineered a cryptographic hash chaining utility (`src/utils/cryptoAudit.ts`) using the native Web Crypto API (`crypto.subtle.digest('SHA-256')`).
  2. Every audit link computes:
     $$\text{Hash}_n = \text{SHA-256}(\text{Hash}_{n-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{TargetID} \parallel \text{Reason} \parallel \text{IP})$$
  3. Integrated a **"Verify Cryptographic Chain"** action in `AuditLogScreen.tsx` that re-hashes all records from Genesis to prove zero tampering.
* **Proving Test Cases:**
  * **TC-003.1 (Genesis & Link Calculation):** Create 5 distinct audit events and verify each record's `prevHash` equals the preceding record's `hash`.
  * **TC-003.2 (Ledger Verification Pass):** Click "Verify Cryptographic Chain" and assert status outputs `TAMPER_CHECK: PASSED`.
  * **TC-003.3 (Tamper Detection):** Manually alter a record's reason in storage; run verification and assert the tool flags the exact broken link index.

---

### FIND-004: Inactive Geofences, Curfews & Speed Rules
* **Severity:** `HIGH`
* **Affected Areas:** `src/components/Screens/GeofencesScreen.tsx`, `src/utils/geoRules.ts`
* **Root Cause:**
  Geofences were rendered visually on MapLibre GL, but no evaluation algorithm ran against vehicle coordinates. Vehicles could enter high-security zones, exceed 50 km/h in Kampala CBD, or move during night curfew hours (22:00–05:30 EAT) with zero alerts generated.
* **Implementation Fix:**
  1. Built a high-performance 2D Ray-Casting Point-in-Polygon containment check in `src/utils/geoRules.ts`.
  2. Implemented `isCurfewActive()` supporting East Africa Time (`Africa/Kampala`, UTC+3) and midnight crossing logic.
  3. Hooked evaluation directly into the periodic telemetry interval in `App.tsx` to automatically emit `speed` and `curfew` alerts.
* **Proving Test Cases:**
  * **TC-004.1 (CBD Speed Violation):** Move vehicle at 65 km/h inside the Kampala CBD Security Zone polygon (limit 40 km/h). Assert a `warn` alert (`kind: 'speed'`) is dispatched within 4 seconds.
  * **TC-004.2 (Night Curfew Breach):** Evaluate vehicle movement inside the Industrial Area polygon during curfew hours. Assert a `critical` alert (`kind: 'curfew'`) is emitted.
  * **TC-004.3 (Debounce & Deduplication):** Assert consecutive ticks inside the zone do not spam duplicate new alerts for the same violation episode.

---

### FIND-005: Unrealistic Telemetry Drift into Lake Victoria
* **Severity:** `MEDIUM`
* **Affected Areas:** `src/App.tsx` (telemetry interval)
* **Root Cause:**
  Position simulation calculated new coordinates using an unconstrained angular delta (`cos(heading) * factor`), causing vehicles to drift straight across terrain, off highways, and eventually into Lake Victoria over extended sessions.
* **Implementation Fix:**
  1. Structured Kampala road corridor waypoint networks (`northern_bypass`, `jinja_road`, `entebbe_road`, `cbd_loop`) in `src/utils/geoRules.ts`.
  2. Bound each vehicle to a corridor route with index cycling, maintaining realistic road speeds, headings, and road names (e.g., *Kalerwe Flyover*, *Spear Motors Nakawa*).
* **Proving Test Cases:**
  * **TC-005.1 (Road Corridor Adherence):** Run simulation for 200 ticks. Assert all coordinates remain within 30 meters of designated road corridors.
  * **TC-005.2 (Water Avoidance):** Assert no vehicle coordinate enters Lake Victoria or unmapped water bodies.

---

### FIND-006: Incomplete ANPR OCR Review-to-Alert Pipeline
* **Severity:** `HIGH`
* **Affected Areas:** `src/components/Screens/PlateReviewScreen.tsx`, `src/App.tsx`
* **Root Cause:**
  Confirming an ambiguous plate in the optical review queue (`handleConfirmOCR`) merely toggled `reviewState = 'confirmed'`. It did not correlate the confirmed plate against the Stolen Vehicles list or active police warrants.
* **Implementation Fix:**
  1. Enhanced `handleConfirmOCR` to normalize plate text and query against active stolen vehicles.
  2. On match, automatically dispatch a `critical` `stolen_plate_seen` alert containing the camera's GPS coordinates and junction name.
  3. Triggered the audio alert chime and created a `CONFIRM_ANPR_STOLEN_MATCH` cryptographic audit record.
* **Proving Test Cases:**
  * **TC-006.1 (Stolen Match Alert):** In `PlateReviewScreen`, confirm ambiguous plate reading `UBG 123A` (stolen). Assert a `stolen_plate_seen` alert appears in the inbox with camera coordinates.
  * **TC-006.2 (Audio Feedback):** Assert alert audio chime fires upon match confirmation.
  * **TC-006.3 (Non-Stolen Plate):** Confirm a non-stolen plate (`UAX 892K`); assert no critical stolen alert is generated.

---

### FIND-007: Weak Role-Based Scoping (RBAC)
* **Severity:** `HIGH`
* **Affected Areas:** `src/components/Navbar.tsx`, `src/utils/rbac.ts`
* **Root Cause:**
  Changing roles in the navigation bar was purely visual. An `owner` user could see all national trackers on the map, inspect third-party GT06 device IMEIs, and view confidential police case dockets.
* **Implementation Fix:**
  1. Implemented server-style scoping filters in `src/utils/rbac.ts`:
     * `filterVehiclesByRole`: Restricts `owner` to `ownerId === 'usr-owner-1'`. Restricts `fleet_manager` to commercial fleet vehicles.
     * `filterCasesByRole`: Restricts case access by ownership and role.
  2. Applied scoping to `LiveMap`, tracker sidebar, `VehiclesScreen`, and `CasesScreen`.
* **Proving Test Cases:**
  * **TC-007.1 (Citizen Owner Isolation):** Switch to `owner` role. Assert the live map and tracker sidebar only display `UBG 123A`. Assert other citizen vehicles are absent.
  * **TC-007.2 (Fleet Isolation):** Switch to `fleet_manager` role. Assert only Nile Logistics and commercial transit vehicles appear.
  * **TC-007.3 (Agency Visibility):** Switch to `agency` role. Assert full national fleet is visible subject to reason-gating.

---

### FIND-008: Non-Functional Universal Search Input
* **Severity:** `MEDIUM`
* **Affected Areas:** `src/components/Navbar.tsx`, list screens
* **Root Cause:**
  The top navigation bar accepted `searchQuery` input, but child screens never consumed it, rendering universal search dead across all views.
* **Implementation Fix:**
  1. Connected `searchQuery` prop across `VehiclesScreen`, `CasesScreen`, `AlertsInboxScreen`, `AuditLogScreen`, and the Live Map left panel.
  2. Implemented multi-field substring filtering (Plate, Make/Model, Owner Name, Police CRB #, Action, Legal Reason).
* **Proving Test Cases:**
  * **TC-008.1 (Map Search):** Type "Premio" in top search bar. Assert left panel filters immediately to matching vehicles.
  * **TC-008.2 (Cases Search):** Type "Flying Squad" in search bar. Open Cases screen and assert only assigned cases appear.
  * **TC-008.3 (Audit Search):** Type "STOLEN" and assert audit table filters to matching event actions.

---

### FIND-009: Decoupled Telemetry Playback Slider
* **Severity:** `MEDIUM`
* **Affected Areas:** `src/components/Screens/VehicleDetailDrawer.tsx`
* **Root Cause:**
  Scrubbing the route history slider updated a local index within the drawer, but did not reposition the vehicle marker or focus on the map canvas.
* **Implementation Fix:**
  1. Synchronized route playback scrubbing with the vehicle's active map coordinate.
  2. Updated the 24-hour speed chart tooltip and cursor position to match the scrubbed playback timestamp.
* **Proving Test Cases:**
  * **TC-009.1 (Scrubber Sync):** Scrub route playback slider to 50%; assert map marker shifts to historical waypoint and speed chart cursor updates.

---

### FIND-010: Missing Low Battery Hardware Health Alerts
* **Severity:** `LOW`
* **Affected Areas:** `src/App.tsx`, `src/types.ts`
* **Root Cause:**
  `AlertKind` defined `low_battery`, but device battery levels never degraded or triggered notifications when falling below 20%.
* **Implementation Fix:**
  1. Integrated battery discharge simulation for moving vehicles.
  2. Dispatched an automated `low_battery` warning alert when battery drops below 20%.
* **Proving Test Cases:**
  * **TC-010.1 (Battery Alert):** Trigger simulated battery drop to 18%; assert `low_battery` alert appears in Alerts Inbox.

---

## 3. Prototype Component Disposition

| Component / Asset | Disposition | Destination in Production Monorepo |
|---|---|---|
| `src/components/PlateTag.tsx` | **Port** | `packages/ui-kit/src/PlateTag.tsx` |
| `src/components/StatusPill.tsx` | **Port** | `packages/ui-kit/src/StatusPill.tsx` |
| `src/components/Screens/HistoricalSpeedChart.tsx` | **Port** | `apps/web-dashboard/src/components/telemetry/HistoricalSpeedChart.tsx` |
| `src/components/Modals/ForensicExportModal.tsx` | **Port** | `apps/web-dashboard/src/components/modals/ForensicExportModal.tsx` |
| `src/components/ConfirmStolenModal.tsx` | **Port** | `apps/web-dashboard/src/components/modals/ConfirmStolenModal.tsx` |
| `src/components/AccessReasonModal.tsx` | **Port & Enhance** | `apps/web-dashboard/src/components/auth/AccessGate.tsx` |
| `src/components/Screens/PublicShareScreen.tsx` | **Port** | `apps/web-dashboard/src/components/modals/PublicShareModal.tsx` |
| `src/components/Navbar.tsx` | **Port** | `apps/web-dashboard/src/components/layout/Navbar.tsx` |
| `src/components/Screens/VehicleDetailDrawer.tsx` | **Port** | `apps/web-dashboard/src/components/vehicles/VehicleDetailDrawer.tsx` |
| `src/utils/cryptoAudit.ts` | **Port** | `packages/domain/src/cryptoAudit.ts` |
| `src/utils/geoRules.ts` | **Port** | `packages/domain/src/geoRules.ts` |
| `src/data/mockData.ts` | **Discard** | Replace with PostgreSQL migrations & `pnpm db:seed` |
| `src/App.tsx` In-Memory Arrays | **Discard** | Replace with Fastify/Express REST & WebSocket API clients |
| `src/App.tsx` Coordinate Math Drift | **Discard** | Replace with GT06 TCP Ingestion Gateway & OSM Simulator |

---

## 4. Phase-by-Phase Execution Roadmap

```
[Phase R0: Inventory & Audit] ──> [Phase R1: Identity & Shell] ──> [Phase R2: Persistence & API]
                                                                                │
                                                                                v
[Phase R5: ANPR to Alert] <── [Phase R4: Rule Engine] <── [Phase R3: Scoping & Lawful Access]
           │
           v
[Phase R6: Search Engine] ──> [Phase R7: Map Playback] ──> [Phase R8: Simulator] ──> [Phase R9: Release]
```

* **Phase R0 (Complete):** Prototype inventory, reproduction of fallbacks, remediation plan documentation (`REMEDIATION_PLAN.md`).
* **Phase R1 (Backend + Frontend Identity):** User registration, TOTP MFA for agency/admin, refresh token rotation, agency domain allowlist (`@police.go.ug`).
* **Phase R2 (Persistence & Tamper-Evident Audit):** PostgreSQL/PostGIS migrations, Timescale hypertables, SHA-256 ledger chaining, `pnpm audit:verify`.
* **Phase R3 (Access Control & Lawful Purpose):** PostgreSQL Row-Level Security (RLS), case-bound time-limited access grants, IMEI masking for citizens.
* **Phase R4 (Rule Engine & Hardware Health):** 2D Ray-Casting geofence enter/exit, Africa/Kampala curfew checks across midnight, speed hysteresis, GT06 heartbeat timeout detection.
* **Phase R5 (ANPR Confirmation Pipeline):** Atomic database transactions for camera match confirmations, immediate `stolen_plate_seen` alert dispatch, retroactive 24h lookup.
* **Phase R6 (Scope-Aware Search):** Trigram (`pg_trgm`) index search with RBAC filters and legal audit logging.
* **Phase R7 (Synchronized Map Playback):** Unified playback store, server-side route decimation, and MapLibre camera/ghost marker sync.
* **Phase R8 (Realistic Kampala Simulator):** OpenStreetMap corridor-constrained vehicle movement, real GT06 TCP packet generation, and plausibility filters.
* **Phase R9 (Hardening & Deployment):** End-to-end acceptance tests, automated staging deployment with backup/restore drills, and final release sign-off.
