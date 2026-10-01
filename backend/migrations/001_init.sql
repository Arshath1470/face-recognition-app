CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only detection results are stored. Uploaded image bytes are never written to disk or the database.
CREATE TABLE detections (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    source      TEXT        NOT NULL CHECK (source IN ('url', 'upload')),
    image_url   TEXT,
    face_count  INTEGER     NOT NULL CHECK (face_count >= 0),
    faces       JSONB       NOT NULL,
    provider    TEXT        NOT NULL,
    duration_ms INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX detections_user_created_idx ON detections (user_id, created_at DESC);
