# 📝 Notes App — Backend API

A production-ready, multi-user notes service built with **Node.js**, **Express**, and **SQLite**. Think backend for Google Keep or Apple Notes — with authentication, full CRUD, note sharing, search, and smart organization features.

**Live URL**: `https://notes-app-api-1-b1ji.onrender.com`

---

## 🚀 Quick Start

```bash
# Clone & install
git clone https://github.com/your-username/notes-app.git
cd notes-app
npm install

# Start the server
npm start
# → http://localhost:3000
```

### Environment Variables (optional)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | _(built-in dev key)_ | Secret for signing JWT tokens. **Set this in production!** |
| `DB_PATH` | `./data/notes.db` | Path to the SQLite database file |

---

## 📋 API Endpoints

### Authentication

#### Register a New User

```
POST /register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

| Status | Description |
|---|---|
| `201 Created` | User registered successfully |
| `400 Bad Request` | Missing/invalid email or password (min 6 chars) |
| `409 Conflict` | Email already registered |

---

#### Login

```
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Failure (401)**:
```json
{
  "message": "Invalid email or password"
}
```

> Use the `access_token` in all authenticated requests as:  
> `Authorization: Bearer <your_jwt_token>`

---

### Notes CRUD

All note endpoints require the `Authorization: Bearer <token>` header.

#### Get All Notes

```
GET /notes
GET /notes?page=1&per_page=10
GET /notes?archived=true
GET /notes?pinned=true
```

Returns paginated notes (owned + shared with you). Pinned notes appear first.

**Response (200)**:
```json
{
  "notes": [
    {
      "id": "1",
      "title": "My Note",
      "content": "Hello World",
      "is_pinned": false,
      "is_archived": false,
      "created_at": "2026-05-16 14:13:53",
      "updated_at": "2026-05-16 14:13:53"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 1,
  "total_pages": 1
}
```

| Query Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `per_page` | int | `20` | Items per page (max 100) |
| `archived` | bool | `false` | Show archived notes instead |
| `pinned` | bool | _(all)_ | Filter by pinned status |

---

#### Get a Specific Note

```
GET /notes/:id
```

Returns `200` with the note if the user owns it or it was shared with them.  
Returns `404` if the note doesn't exist or the user has no access.

---

#### Create a New Note

```
POST /notes
Content-Type: application/json

{
  "title": "Meeting Notes",
  "content": "Discuss Q3 roadmap with the team"
}
```

**Response (201)**:
```json
{
  "id": "3",
  "title": "Meeting Notes",
  "content": "Discuss Q3 roadmap with the team",
  "is_pinned": false,
  "is_archived": false,
  "created_at": "2026-05-16 15:00:00",
  "updated_at": "2026-05-16 15:00:00"
}
```

---

#### Update a Note

```
PUT /notes/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content",
  "is_pinned": true,
  "is_archived": false
}
```

All fields are optional — only the fields you include will be updated.  
Only the **owner** can update a note. Returns `200` with the updated note.

---

#### Delete a Note

```
DELETE /notes/:id
```

Returns `204 No Content` on success. Only the **owner** can delete.

---

### Sharing

#### Share a Note with Another User

```
POST /notes/:id/share
Content-Type: application/json

{
  "share_with_email": "colleague@example.com"
}
```

After sharing, the recipient can access the note via `GET /notes/:id` and see it in their `GET /notes` listing.

| Status | Description |
|---|---|
| `200 OK` | Note shared successfully |
| `400 Bad Request` | Cannot share with yourself |
| `404 Not Found` | Note not found or target user doesn't exist |
| `409 Conflict` | Already shared with this user |

---

### Search

#### Full-Text Search

```
GET /search?q=keyword
GET /search?q=meeting&page=1&per_page=10
```

Searches across **title** and **content** of all notes the user has access to (owned + shared). Supports pagination.

---

### Meta

#### About

```
GET /about
```

```json
{
  "name": "Samyak Singh",
  "email": "samyaksingh1510@gmail.com",
  "my features": {
    "Note Pinning & Archiving": "Users can pin important notes...",
    "Full-Text Search": "Search across all note titles and content...",
    "Pagination": "All list endpoints support page & per_page..."
  }
}
```

#### API Documentation

```
GET /openapi.json
```

Returns the full [OpenAPI 3.0.3](https://swagger.io/docs/specification/v3_0/basic-structure/) specification.

#### Health Check

```
GET /health
```

```json
{ "status": "ok", "timestamp": "2026-05-16T14:13:53.000Z" }
```

---

## ✨ Custom Feature: Note Pinning & Archiving

Inspired by how Google Keep and Apple Notes handle organization:

- **Pin** a note → `PUT /notes/:id` with `{ "is_pinned": true }`  
  Pinned notes always appear **at the top** of all listings.

- **Archive** a note → `PUT /notes/:id` with `{ "is_archived": true }`  
  Archived notes are **hidden** from the default `GET /notes` response.  
  Retrieve them with `GET /notes?archived=true`.

**Why this feature?** Real users don't just create notes — they organize them. Pinning surfaces what matters most, archiving keeps things tidy without deleting. It's a small API surface that adds significant UX value.

---

## 🏗️ Architecture

```
src/
├── index.js              # Express app setup, middleware, routing
├── db.js                 # SQLite initialization, schema, indexes
├── openapi.json          # OpenAPI 3.0.3 specification
├── middleware/
│   └── auth.js           # JWT verification middleware
└── routes/
    ├── auth.js           # /register, /login
    ├── notes.js          # /notes CRUD + /notes/:id/share
    ├── search.js         # /search?q=keyword
    └── meta.js           # /about, /openapi.json
```

### Tech Stack

| Component | Technology | Why |
|---|---|---|
| Runtime | Node.js | Fast, async I/O, huge ecosystem |
| Framework | Express 5 | Lightweight, flexible, auto async error handling |
| Database | SQLite (better-sqlite3) | Zero-config, file-based, fast for this scale |
| Auth | JWT + bcryptjs | Industry standard, stateless authentication |
| Validation | express-validator | Declarative input validation |
| Security | Helmet + CORS | HTTP security headers out of the box |

### Database Schema

```
users
├── id (PK, AUTOINCREMENT)
├── email (UNIQUE, NOCASE)
├── password_hash
└── created_at

notes
├── id (PK, AUTOINCREMENT)
├── user_id (FK → users)
├── title
├── content
├── is_pinned (default 0)
├── is_archived (default 0)
├── created_at
└── updated_at

shared_notes
├── id (PK, AUTOINCREMENT)
├── note_id (FK → notes, CASCADE DELETE)
├── shared_with_user_id (FK → users)
├── created_at
└── UNIQUE(note_id, shared_with_user_id)
```

---

## 🔒 Security

- **Password hashing** — bcrypt with 10 salt rounds
- **JWT tokens** — 24-hour expiration, signed with `JWT_SECRET`
- **Input validation** — All endpoints validate and sanitize inputs
- **HTTP headers** — Helmet.js sets secure defaults (CSP, X-Frame-Options, etc.)
- **Access control** — Notes are scoped to owner + explicitly shared users
- **Error opacity** — Accessing another user's note returns `404` (not `403`) to avoid leaking note existence

---

## 🐳 Docker

```bash
# Build
docker build -t notes-app .

# Run
docker run -p 3000:3000 -v notes-data:/app/data notes-app
```

The `data/` directory is where SQLite stores the database. Mount a volume to persist data across container restarts.

---

## ☁️ Deployment (Render.com)

The project includes a `render.yaml` for one-click deployment:

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo — Render auto-detects `render.yaml`
4. A persistent disk (1GB) is configured for SQLite storage
5. `JWT_SECRET` is auto-generated as an environment variable

---

## 📊 Edge Case Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Duplicate email registration | `409` | `"Email already registered"` |
| Invalid/missing JWT | `401` | `"Authorization header is missing"` / `"Invalid token"` |
| Expired JWT | `401` | `"Token has expired"` |
| Access another user's note | `404` | `"Note not found"` |
| Missing required fields | `400` | Descriptive validation message |
| Empty title or content | `400` | `"Title is required"` / `"Content is required"` |
| Share note with yourself | `400` | `"Cannot share a note with yourself"` |
| Share with non-existent user | `404` | `"User not found"` |
| Duplicate share | `409` | `"Note is already shared with this user"` |
| Invalid note ID format | `400` | `"Note ID must be a positive integer"` |
| Unknown route | `404` | `"Route METHOD /path not found"` |

---

