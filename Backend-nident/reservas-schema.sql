-- Propuesta de restricciones. No ejecutado y no sustituye una API autenticada.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE agenda_resource_allocation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL,
    room_id uuid NOT NULL,
    location_id uuid NOT NULL,
    service_id uuid NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    status text NOT NULL CHECK (status IN ('held', 'confirmed', 'expired', 'cancelled')),
    hold_expires_at timestamptz,
    owner_token_hash text NOT NULL,
    idempotency_key uuid UNIQUE,
    CHECK (ends_at > starts_at),
    CHECK (status <> 'held' OR hold_expires_at IS NOT NULL),
    EXCLUDE USING gist (
        professional_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status IN ('held', 'confirmed')),
    EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status IN ('held', 'confirmed'))
);
