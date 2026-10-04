CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL, type text NOT NULL CHECK (type IN ('fleet','agency','insurer','admin')),
 created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 org_id uuid REFERENCES organizations(id),
 email text NOT NULL, phone text, full_name text NOT NULL, password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','agency','fleet_manager','owner')),
 disabled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));

CREATE TABLE vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid REFERENCES users(id), org_id uuid REFERENCES organizations(id),
 plate text NOT NULL, plate_norm text NOT NULL,
 make text, model text, color text,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','stolen','recovered')),
 created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX vehicles_plate_uq ON vehicles (plate_norm);

CREATE TABLE devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 vehicle_id uuid REFERENCES vehicles(id), imei text NOT NULL UNIQUE,
 protocol text NOT NULL CHECK (protocol IN ('gt06','http_json')),
 secret_hash text NOT NULL, last_seen_at timestamptz, battery_pct smallint);

CREATE TABLE cameras (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL, location geography(Point,4326) NOT NULL,
 secret_hash text NOT NULL, last_seen_at timestamptz);

CREATE TABLE positions (
 device_id uuid NOT NULL REFERENCES devices(id), ts timestamptz NOT NULL,
 geom geography(Point,4326) NOT NULL, speed_kph real, heading smallint, ignition boolean,
 PRIMARY KEY (device_id, ts));
SELECT create_hypertable('positions','ts', chunk_time_interval => INTERVAL '1 day');
SELECT add_retention_policy('positions', INTERVAL '90 days');
CREATE INDEX positions_geom_gix ON positions USING gist (geom);

CREATE TABLE plate_sightings (
 id uuid NOT NULL DEFAULT gen_random_uuid(), ts timestamptz NOT NULL,
 camera_id uuid NOT NULL REFERENCES cameras(id),
 plate_raw text NOT NULL, plate_norm text NOT NULL, confidence real NOT NULL,
 snapshot_key text, matched_vehicle_id uuid REFERENCES vehicles(id),
 review_state text NOT NULL DEFAULT 'auto' CHECK (review_state IN ('auto','pending','confirmed','rejected')),
 PRIMARY KEY (id, ts));
SELECT create_hypertable('plate_sightings','ts', chunk_time_interval => INTERVAL '7 days');
CREATE INDEX plate_sightings_norm_ix ON plate_sightings (plate_norm, ts DESC);

CREATE TABLE geofences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES users(id),
 name text NOT NULL, polygon geography(Polygon,4326) NOT NULL,
 rule text NOT NULL CHECK (rule IN ('enter','exit','curfew','speed')),
 params jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true);
CREATE INDEX geofences_gix ON geofences USING gist (polygon);

CREATE TABLE geofence_vehicles (geofence_id uuid REFERENCES geofences(id) ON DELETE CASCADE,
 vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE, inside boolean,
 PRIMARY KEY (geofence_id, vehicle_id));

CREATE TABLE cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_id uuid NOT NULL REFERENCES vehicles(id),
 reported_by uuid NOT NULL REFERENCES users(id), police_ref text,
 state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','recovered','closed')),
 opened_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz);

CREATE TABLE case_access (case_id uuid REFERENCES cases(id), user_id uuid REFERENCES users(id),
 granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, PRIMARY KEY (case_id, user_id));

CREATE TABLE alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ts timestamptz NOT NULL DEFAULT now(),
 kind text NOT NULL CHECK (kind IN ('stolen_plate_seen','stolen_device_moved','geofence_enter',
 'geofence_exit','curfew','speed','device_offline','low_battery')),
 vehicle_id uuid REFERENCES vehicles(id), case_id uuid REFERENCES cases(id),
 source text NOT NULL CHECK (source IN ('device','camera','system')), ref_id text,
 geom geography(Point,4326), severity text NOT NULL CHECK (severity IN ('info','warn','critical')),
 state text NOT NULL DEFAULT 'new' CHECK (state IN ('new','ack','closed')), payload jsonb NOT NULL DEFAULT '{}');
CREATE INDEX alerts_state_ix ON alerts (state, ts DESC);

CREATE TABLE consents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES users(id),
 vehicle_id uuid NOT NULL REFERENCES vehicles(id), scope text NOT NULL, granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz);

CREATE TABLE share_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_id uuid NOT NULL REFERENCES vehicles(id),
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_by uuid NOT NULL REFERENCES users(id));

CREATE TABLE audit_events (id bigserial PRIMARY KEY, ts timestamptz NOT NULL DEFAULT now(),
 actor_id uuid, action text NOT NULL, target_type text NOT NULL, target_id text,
 reason text NOT NULL, ip inet);
