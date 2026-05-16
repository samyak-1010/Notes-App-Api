const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const searchRoutes = require('./routes/search');
const metaRoutes = require('./routes/meta');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ───────────────────────────────────────────────────────

app.use(helmet());                       // Security headers
app.use(cors());                         // CORS for all origins
app.use(express.json({ limit: '1mb' })); // Parse JSON bodies

// ── Request logging (simple) ────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────

app.use('/', authRoutes);       // /register, /login
app.use('/notes', notesRoutes); // /notes CRUD + share
app.use('/search', searchRoutes); // /search?q=
app.use('/', metaRoutes);       // /about, /openapi.json

// ── Health check ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Notes App API running on http://localhost:${PORT}`);
  console.log(`📖 API Docs: http://localhost:${PORT}/openapi.json`);
  console.log(`ℹ️  About: http://localhost:${PORT}/about`);
});

module.exports = app;
