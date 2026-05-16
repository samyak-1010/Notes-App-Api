const express = require('express');
const { query, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /search?q=keyword ───────────────────────────────────────────────────
// Full-text search across title and content of user's own + shared notes.

router.get(
  '/',
  authenticate,
  [
    query('q').trim().notEmpty().withMessage('Search query "q" is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('per_page').optional().isInt({ min: 1, max: 100 }).withMessage('per_page must be 1-100'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const userId = req.user.id;
    const keyword = `%${req.query.q}%`;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM notes n
      WHERE (n.user_id = ? OR n.id IN (SELECT note_id FROM shared_notes WHERE shared_with_user_id = ?))
        AND (n.title LIKE ? OR n.content LIKE ?)
    `).get(userId, userId, keyword, keyword);

    const notes = db.prepare(`
      SELECT n.* FROM notes n
      WHERE (n.user_id = ? OR n.id IN (SELECT note_id FROM shared_notes WHERE shared_with_user_id = ?))
        AND (n.title LIKE ? OR n.content LIKE ?)
      ORDER BY n.is_pinned DESC, n.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, keyword, keyword, perPage, offset);

    const formatted = notes.map(row => ({
      id: String(row.id),
      title: row.title,
      content: row.content,
      is_pinned: Boolean(row.is_pinned),
      is_archived: Boolean(row.is_archived),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.status(200).json({
      notes: formatted,
      page,
      per_page: perPage,
      total: countRow.total,
      total_pages: Math.ceil(countRow.total / perPage),
    });
  }
);

module.exports = router;
