const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ── GET /about ──────────────────────────────────────────────────────────────

router.get('/about', (req, res) => {
  return res.status(200).json({
    name: 'Samyak Singh',
    email: 'samyaksingh1510@gmail.com',
    'my features': {
      'Note Pinning & Archiving':
        'Users can pin important notes so they always appear at the top of their list, and archive notes they want to keep but hide from the default view. This mirrors how real note-taking apps (Google Keep, Apple Notes) let users organize without deleting — chosen because it demonstrates practical product thinking and adds meaningful UX value with minimal API surface.',
      'Full-Text Search':
        'Search across all note titles and content with a simple keyword query. Supports pagination. Chosen because search is a must-have for any notes app with more than a handful of items.',
      'Pagination':
        'All list endpoints support page & per_page query parameters with total count metadata. Essential for scalability and frontend integration.',
    },
  });
});

// ── GET /openapi.json ───────────────────────────────────────────────────────

router.get('/openapi.json', (req, res) => {
  const specPath = path.join(__dirname, '..', 'openapi.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  return res.status(200).json(spec);
});

module.exports = router;
