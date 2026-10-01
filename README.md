# Face Recognition: FaceFinder

**A full-stack face detection app: upload a photo or paste a link, and every face is circled, numbered and scored. Built with React, Node.js (Express), PostgreSQL and the Clarifai face-detection model.**

[![CI](https://github.com/Arshath1470/face-recognition-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Arshath1470/face-recognition-app/actions/workflows/ci.yml)
![Node 22](https://img.shields.io/badge/Node.js-22-15171A)
![React 19](https://img.shields.io/badge/React-19-15171A)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-15171A)

![Scan view](docs/screenshots/scan.png)

| Landing | Contact sheet (history) | Profile |
| --- | --- | --- |
| ![Landing page](docs/screenshots/landing.png) | ![History](docs/screenshots/history.png) | ![Profile](docs/screenshots/profile.png) |

<sub>Screenshots use the app's own illustrated group portrait with sample results, captured from the running UI.</sub>

## Features

- **Two ways in**: paste a public image link, or drag and drop a JPEG, PNG or WebP up to 5 MB.
- **Face boxes that stay aligned at any size**: Clarifai returns each face as fractions of the image, and the UI positions every box in percentages over the photo, so nothing needs re-measuring when the layout changes.
- **Confidence per face**, largest face first, with hover highlighting between the list and the photo.
- **Contact sheet history** with cursor pagination and per-scan delete.
- **Accounts**: registration, sign-in, profile stats (photos scanned, faces found, last scan) and full account deletion.
- **Privacy by design**: uploaded image bytes go to the detector and are discarded. Only face coordinates are stored. Deleting an account cascades to all its scans.
- **Works without an API key**: if `CLARIFAI_PAT` is not set, a deterministic simulated detector runs instead and the UI says so, which keeps local demos and CI self-contained.

## Architecture

```mermaid
flowchart LR
    browser([Browser<br/>React + Material UI]) --> nginx[nginx<br/>static files + /api proxy]
    nginx --> api[Express API<br/>Node 22]
    api --> pg[(PostgreSQL)]
    api -- "image URL or base64" --> clarifai[Clarifai<br/>face-detection model]
```

```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant C as Clarifai
    participant DB as PostgreSQL
    UI->>API: POST /api/detections (link or multipart upload)
    API->>API: verify JWT, rate limit, validate input
    API->>C: POST /v2/users/clarifai/apps/main/models/face-detection/outputs
    C-->>API: regions[].region_info.bounding_box (0..1)
    API->>API: normalise, drop empty boxes, sort largest first
    API->>DB: INSERT detection (coordinates only)
    API-->>UI: 201 { faceCount, faces[{ box, confidence }] }
```

### Backend decisions

- **Dependency injection for testability.** `createApp({ db, detector, config })` builds the Express app, so tests run the real HTTP stack against a real database with either the simulated detector or a stubbed Clarifai client.
- **Detector interface.** [`detectors/clarifai.js`](backend/src/detectors/clarifai.js) and [`detectors/mock.js`](backend/src/detectors/mock.js) implement the same `detect(image)` contract. Clarifai errors, timeouts (10 s via `AbortSignal.timeout`) and network failures become clear 4xx/5xx responses and nothing is saved.
- **Security basics done properly.** bcrypt password hashing, HS256 JWTs with issuer and algorithm pinned, Helmet headers, per-IP rate limits on sign-in and per-user limits on scans, MIME and size checks on uploads, parameterised SQL everywhere, and other users' scans answer 404.
- **Migrations without an ORM.** A small runner applies `migrations/*.sql` in order inside transactions and records them in `schema_migrations`; a Postgres advisory lock stops two replicas from migrating at once.
- **Operational hygiene.** Structured JSON logs with pino, a `/api/health` endpoint that checks the database, graceful shutdown on `SIGTERM`, non-root containers with health checks.

## Run it

### Docker Compose

```bash
cp .env.example .env     # optional: add CLARIFAI_PAT for real detection
docker compose up --build
```

Open <http://localhost:8080>, create an account and scan a photo.

To use real detection, create a free Clarifai account, generate a **personal access token** under *Settings → Secrets* and put it in `.env` as `CLARIFAI_PAT`. Without it the app runs in demo mode with simulated boxes.

### Local development

```bash
docker compose up -d db
cd backend && npm install && npm run dev      # API on http://localhost:4000
cd frontend && npm install && npm run dev     # UI on http://localhost:5173, proxies /api
```

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://facefinder:facefinder@localhost:5432/facefinder` | PostgreSQL connection |
| `JWT_SECRET` | dev value | HMAC secret, at least 32 bytes |
| `JWT_TTL` | `2h` | Session length |
| `CLARIFAI_PAT` | empty | Clarifai personal access token; enables real detection |
| `FACE_DETECTOR` | `clarifai` if a token is set, else `mock` | Force a detector |
| `CLARIFAI_MODEL_ID` / `CLARIFAI_MODEL_VERSION_ID` | `face-detection` / latest | Pin a model version |
| `MAX_UPLOAD_MB` | `5` | Upload size limit |
| `AUTH_RATE_LIMIT` / `DETECT_RATE_LIMIT` | `20` per 15 min / `30` per min | Abuse protection |

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account, returns `{ token, user }` |
| POST | `/api/auth/login` | Sign in |
| GET, PUT, DELETE | `/api/me` | Profile with stats, rename, delete account |
| POST | `/api/detections` | Scan `{ imageUrl }` (JSON) or an `image` file (multipart) |
| GET | `/api/detections?limit=&before=` | History, newest first, cursor-paginated |
| GET, DELETE | `/api/detections/:id` | One scan |
| GET | `/api/health` | Liveness, database check and active detector |

Errors are `{ "error": "message", "fields": { "email": "Enter a valid email address" } }`.

## Tests and CI

```bash
docker compose up -d db
cd backend && npm test       # 22 tests: auth, detections, pagination, isolation, rate limits, Clarifai parsing
cd frontend && npm test      # box geometry, labels, upload validation, overlay rendering
```

[GitHub Actions](.github/workflows/ci.yml) runs the API tests against a PostgreSQL service container, tests and builds the frontend, validates the Compose file, then builds both images with layer caching and publishes them to GitHub Container Registry from `main`. Dependabot keeps npm packages, base images and Actions current.

## Project layout

```
face-recognition-app/
├── backend/
│   ├── src/
│   │   ├── app.js            routes, validation, rate limits
│   │   ├── auth.js           bcrypt + JWT
│   │   ├── detectors/        Clarifai client and simulated detector
│   │   ├── migrate.js        SQL migration runner
│   │   └── server.js         startup and graceful shutdown
│   ├── migrations/
│   └── test/
├── frontend/
│   └── src/
│       ├── components/       FaceOverlay (the boxes), Layout, RequireAuth
│       ├── pages/            Landing, Scan, History, Profile, AuthPage
│       └── lib/              geometry and formatting helpers
├── docker-compose.yml
└── .github/
```

## Ideas for next steps

- Face landmarks and attributes from additional Clarifai models
- Store optional thumbnails in object storage with signed URLs
- OpenAPI spec and generated client
- Kubernetes manifests (see [HungryBox](https://github.com/Arshath1470/hungrybox) for the pattern)

## License

[MIT](LICENSE)
