# TrackUG — National Vehicle Telemetry & Law Enforcement Intelligence System

> **Uganda Data Protection and Privacy Act (DPPA) 2019 — Section 43 Compliant**  
> High-throughput GPS tracker ingestion (GT06 binary protocol), automated ANPR optical camera correlation, spatial rule enforcement across Kampala arterial corridors, and an append-only cryptographic SHA-256 audit ledger.

---

## 1. System Architecture

TrackUG is designed as an inter-agency vehicle tracking and anti-theft intelligence platform. It ingests high-frequency GPS telemetry, processes spatial boundaries in real time, correlates roadside optical ANPR cameras with stolen vehicle watchlists, and enforces statutory privacy controls.

```
                            +-------------------------------------------------------------+
                            |                       DATA SOURCES                          |
                            +-------------------------------------------------------------+
                                       |                                       |
                [ GT06 GPS Trackers / IoT Devices ]             [ Roadside ANPR Camera Nodes ]
                  Binary TCP Packets (Port 5023)                  Signed JSON Webhooks (HTTPS)
                                       |                                       |
                                       v                                       v
+---------------------------------------------------------------------------------------------------------+
|                                        INGESTION & GATEWAY LAYER                                        |
|  - TCP Frame Decoder (0x01 Login, 0x12/0x22 GPS Position, 0x13 Heartbeat, 0x16/0x26 Hardware Alarm)    |
|  - CRC16-CCITT Frame Integrity Check & HMAC-SHA256 Camera Webhook Signature Verification                |
+---------------------------------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------------------------------+
|                                    SPATIAL & EVENT RULE ENGINE                                          |
|  - Kampala Corridor Waypoint Progression (Northern Bypass, Jinja Road, Entebbe Road, CBD Loop)         |
|  - 2D Ray-Casting Point-in-Polygon Geofence Boundary Check (Kampala CBD Security Zone)                  |
|  - Zone Speed Limit Threshold Check (> 40 km/h in CBD)                                                  |
|  - Africa/Kampala Time (UTC+3) Curfew Evaluator across Midnight (22:00 - 05:30 EAT)                     |
|  - Low Battery Voltage & Hardware Tamper Disconnect Detection                                           |
+---------------------------------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------------------------------+
|                                    PERSISTENCE & COMPLIANCE LEDGER                                      |
|  - PostgreSQL 16 + PostGIS + TimescaleDB (Time-series GPS coordinates, 90-day partitioned retention)   |
|  - LocalStorage Engine (Client-side offline hydration and state resilience)                             |
|  - Cryptographic Append-Only Audit Ledger: Hash_n = SHA-256(Hash_{n-1} + Timestamp + Actor + Reason)    |
+---------------------------------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------------------------------+
|                                   REAL-TIME PRESENTATION LAYER (SPA)                                    |
|  - MapLibre GL Interactive Kampala Geospatial Canvas (Vector Corridors, Camera Nodes, Geofences)        |
|  - Recharts 24-Hour Historical Speed Telemetry Area Chart (50 km/h Urban Regulatory Baseline)           |
|  - Statutory Reason-Gated Telemetry Access Modal (DPPA Section 43 Enforcement)                          |
|  - Human-in-the-Loop Low-Confidence ANPR Plate Review Queue (Keyboard Shortcuts: C, R, S)                 |
|  - RFC 4180 Forensic Telemetry CSV Dossier Generator with Legal Header and SHA-256 Checksum            |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. System Structure & Role-Based Access Control (RBAC)

TrackUG enforces strict role-based data isolation to prevent unauthorized surveillance and comply with privacy legislation:

| Role | Scope of Access | Telemetry & Case Permissions | Hardware Management |
|---|---|---|---|
| **Citizen Owner** (`owner`) | Restricted strictly to user's registered vehicle (`UBG 123A`). | Can report emergency theft (SOS), inspect own telemetry, and generate expiring public share links. Cannot view other citizens' vehicles, hardware IMEIs, or police dockets. | Read-only battery & ignition status |
| **Fleet Manager** (`fleet_manager`) | Commercial logistics fleet (`Nile Logistics Ltd`). | Real-time tracking of assigned commercial trucks, speed violation monitoring, and fleet geofence oversight. | Read-only device IMEI & SIM status |
| **Law Enforcement** (`agency`) | National vehicle fleet & active investigation cases. | **Reason-Gated:** Must supply a valid police case reference (CRB) and statutory justification before coordinates and historical breadcrumbs unlock. Access is cryptographically audit-logged. | Camera node registration & incident review |
| **System Administrator** (`admin`) | Full platform oversight & audit verification. | Complete visibility, system settings configuration, seed state reset, and cryptographic ledger verification. | Full device & camera provisioning |

---

## 3. How the System Works

### 3.1. Telemetry Ingestion & Corridor Simulation
* Vehicles progress along realistic Kampala arterial road corridors:
  * **Northern Bypass Corridor:** Busega $\rightarrow$ Namungoona $\rightarrow$ Kalerwe $\rightarrow$ Kyebando $\rightarrow$ Kiwatule $\rightarrow$ Namboole.
  * **Jinja Road Corridor:** Kitgum House $\rightarrow$ Wampewo Roundabout $\rightarrow$ Nakawa $\rightarrow$ Banda $\rightarrow$ Kireka.
  * **Entebbe Road Corridor:** Clock Tower Queensway $\rightarrow$ Kibuye $\rightarrow$ Najjanankumbi $\rightarrow$ Zana.
  * **Kampala CBD Loop:** Kampala Road Posta $\rightarrow$ Parliamentary Avenue $\rightarrow$ Yusuf Lule $\rightarrow$ Mulago $\rightarrow$ Wandegeya.
* Eliminates unnatural coordinate drift, ensuring vehicles remain on road networks and never drift into Lake Victoria.

### 3.2. Automated Spatial Rule Engine (`src/utils/geoRules.ts`)
* **Point-in-Polygon Ray Casting:** On every coordinate tick, vehicle coordinates `[lat, lon]` are evaluated against active polygonal geofences.
* **Urban Speed Limits:** If speed exceeds zone restrictions (e.g. $> 40\text{ km/h}$ in Kampala CBD), a `warn` alert is emitted.
* **Night Curfews:** Evaluates local East Africa Time (`Africa/Kampala`, UTC+3). If a vehicle moves inside a curfew zone during restricted hours ($22:00 - 05:30\text{ EAT}$ across midnight), a `critical` curfew alert triggers.
* **Low Battery Detection:** If device battery drops below $20\%$, a `low_battery` alert is dispatched.

### 3.3. Emergency Theft Reporting & Intercept Dispatch
1. An owner or officer clicks **"Report Stolen"**.
2. **`ConfirmStolenModal`** requires entering the exact vehicle registration plate in uppercase as legal confirmation.
3. Upon confirmation:
   * Vehicle status switches to `stolen` with red pulse markers on the live map.
   * A new Police Investigation Case docket is generated with a unique CRB reference (`UPF/CPS/KLA/CRB/XXXX/2026`).
   * Flying Squad Rapid Intercept Teams are assigned.
   * A `critical` `stolen_device_moved` alert is broadcast, and the emergency audio chime sounds.
   * A SHA-256 chained audit record is committed to the ledger.

### 3.4. ANPR Camera Correlation & Optical Review Queue
1. Roadside ANPR camera nodes capture optical plate readings.
2. Detections with optical ambiguity ($< 85\%$ confidence) enter the **`PlateReviewScreen`**.
3. Operators inspect the raw crop and use keyboard shortcuts:
   * **`C` (Confirm):** Validates plate match. If the plate matches an active stolen vehicle, the system immediately fires a `stolen_plate_seen` critical alert, links camera junction coordinates to the police case docket, sounds the chime, and logs the action.
   * **`R` (Reject):** Discards false positives.
   * **`S` (Skip):** Advances to the next queued sighting.

### 3.5. Statutory Reason-Gated Access Protocol (Section 43 DPPA 2019)
* Under Section 43 of the Uganda Data Protection and Privacy Act 2019, law enforcement access to real-time citizen GPS telemetry must be justified.
* When an agency user clicks an un-cleared vehicle on the map or vehicles list, **`AccessReasonModal`** appears.
* The operator must provide an active Case Reference / Court Warrant # and operational justification.
* Once submitted, the vehicle's coordinates and historical tracks unlock for that session, and an immutable audit event is recorded.

### 3.6. Tamper-Evident Cryptographic Audit Ledger (`src/utils/cryptoAudit.ts`)
* Every administrative action, emergency report, location read, and forensic export computes an append-only SHA-256 cryptographic hash:
  $$\text{Hash}_n = \text{SHA-256}(\text{Hash}_{n-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{TargetID} \parallel \text{Reason} \parallel \text{IP})$$
* **`AuditLogScreen`** includes an interactive **"Verify Cryptographic Chain"** utility that recalculates hashes from Genesis to prove zero tampering.

### 3.7. Forensic CSV Telemetry Dossier Export
* The **`ForensicExportModal`** exports high-resolution telemetry as RFC 4180 CSV files suitable for judicial submission.
* Includes statutory classification headers, device IMEI, time in EAT, GPS coordinates, speed violations, ignition states, dwell stoppage minutes, ANPR checkpoint matches, and an algorithmic SHA-256 integrity signature.

---

## 4. Project File Structure

```
trackug/
├── index.html                           # App entry point, metadata, and stylesheet mounts
├── package.json                         # Dependencies (MapLibre, Recharts, Lucide, Express, Drizzle)
├── tsconfig.json                        # Strict TypeScript compiler configuration
├── vite.config.ts                       # Vite bundler configuration with Tailwind CSS plugin
├── metadata.json                        # AI Studio applet specifications and permissions
├── README.md                            # Comprehensive system architecture & operational manual
│
├── public/
│   ├── favicon.svg                      # TrackUG national emblem icon
│   └── maplibre-gl-worker.mjs           # Static MapLibre GL Web Worker fallback
│
└── src/
    ├── App.tsx                          # Root application state, route coordinator & rule engine
    ├── main.tsx                         # React 19 application mount
    ├── index.css                        # Tailwind v4 import & custom map animation tokens
    ├── types.ts                         # Complete domain TypeScript interfaces & enums
    │
    ├── data/
    │   └── mockData.ts                  # Default seed data (Kampala vehicles, cases, cameras, geofences)
    │
    ├── utils/
    │   ├── cryptoAudit.ts               # Web Crypto SHA-256 hash chaining & ledger verification
    │   ├── geoRules.ts                  # 2D Ray-Casting Point-in-Polygon & Kampala road corridors
    │   ├── rbac.ts                      # Role-based access filters (owner, fleet, agency, admin)
    │   └── storage.ts                   # LocalStorage persistence manager & reset mechanisms
    │
    └── components/
        ├── Navbar.tsx                   # 56px top bar with universal search, role switch & theme toggle
        ├── PlateTag.tsx                 # Authentic Ugandan number plate renderer with national flag
        ├── StatusPill.tsx               # Status badges (active, stolen, recovered, online, offline)
        ├── AccessReasonModal.tsx        # Section 43 DPPA 2019 statutory justification dialog
        ├── ConfirmStolenModal.tsx       # Verified theft affidavit modal with exact plate confirmation
        │
        ├── Map/
        │   └── LiveMap.tsx              # MapLibre GL map canvas, vehicle markers & corridor layers
        │
        ├── Modals/
        │   └── ForensicExportModal.tsx  # Court-admissible RFC 4180 CSV telemetry exporter
        │
        └── Screens/
            ├── AlertsInboxScreen.tsx    # High-priority alert feed (speed, curfew, stolen sightings)
            ├── AuditLogScreen.tsx       # Cryptographic audit ledger table & verification tool
            ├── CasesScreen.tsx          # Police stolen vehicle investigation case dockets
            ├── DevicesCamerasScreen.tsx # GT06 GPS trackers & roadside ANPR camera hardware registry
            ├── GeofencesScreen.tsx      # Security perimeter polygons & night curfew rules
            ├── HistoricalSpeedChart.tsx # Recharts 24h speed telemetry area chart & aggregate metrics
            ├── OwnerHomeScreen.tsx      # Citizen mobile-first view with SOS theft report button
            ├── PlateReviewScreen.tsx    # Human-in-the-loop ANPR OCR queue with keyboard shortcuts
            ├── PublicShareScreen.tsx    # Ephemeral tokenized vehicle tracker for public sharing
            ├── SettingsScreen.tsx       # System preferences, emergency contacts & seed reset
            ├── VehicleDetailDrawer.tsx  # Telemetry flyout drawer (Live, History, Hardware, Details)
            └── VehiclesScreen.tsx       # Enrolled fleet directory with universal search filtering
```

---

## 5. Development & Verification Commands

### Development Server
```bash
npm run dev
# Starts local Vite development server on port 3000
```

### Type Checking & Linting
```bash
npm run lint
# Runs TypeScript compiler check (tsc --noEmit)
```

### Production Build
```bash
npm run build
# Compiles TypeScript and generates optimized static assets in dist/
```

---

## 6. Regulatory & Statutory Compliance

* **Act:** Data Protection and Privacy Act, 2019 (Republic of Uganda)
* **Section 43 Enforcement:** Strict operational logging of all law enforcement requests accessing personal location data.
* **Audit Immutability:** Revocation of `UPDATE` and `DELETE` access on audit tables, enforced via cryptographic hash chaining.
* **National Plate Standard:** ISO 7591 compliant optical styling reflecting Ugandan vehicle registration standards.
