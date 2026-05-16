const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication
router.use(authenticate);

// ── Helper: format note for response ────────────────────────────────────────

function formatNote(row) {
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    is_pinned: Boolean(row.is_pinned),
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── GET /notes ──────────────────────────────────────────────────────────────
// Returns owned + shared notes. Supports pagination & archive filter.

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('per_page').optional().isInt({ min: 1, max: 100 }).withMessage('per_page must be 1-100'),
    query('archived').optional().isIn(['true', 'false']).withMessage('archived must be true or false'),
    query('pinned').optional().isIn(['true', 'false']).withMessage('pinned must be true or false'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const offset = (page - 1) * perPage;

    // Filter by archive status (default: show non-archived)
    const showArchived = req.query.archived === 'true';
    const archivedFilter = showArchived ? 1 : 0;

    // Optional: filter by pinned only
    let pinnedClause = '';
    const params = [userId, userId, archivedFilter];
    if (req.query.pinned !== undefined) {
      pinnedClause = 'AND n.is_pinned = ?';
      params.push(req.query.pinned === 'true' ? 1 : 0);
    }

    // Count total for pagination metadata
    const countQuery = `
      SELECT COUNT(*) as total FROM notes n
      WHERE (n.user_id = ? OR n.id IN (SELECT note_id FROM shared_notes WHERE shared_with_user_id = ?))
        AND n.is_archived = ?
        ${pinnedClause}
    `;
    const { total } = db.prepare(countQuery).get(...params);

    // Fetch paginated, pinned first
    const dataQuery = `
      SELECT n.* FROM notes n
      WHERE (n.user_id = ? OR n.id IN (SELECT note_id FROM shared_notes WHERE shared_with_user_id = ?))
        AND n.is_archived = ?
        ${pinnedClause}
      ORDER BY n.is_pinned DESC, n.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const notes = db.prepare(dataQuery).all(...params, perPage, offset).map(formatNote);

    return res.status(200).json({
      notes,
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    });
  }
);

// ── GET /notes/:id ──────────────────────────────────────────────────────────

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Note ID must be a positive integer')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const noteId = parseInt(req.params.id);
    const userId = req.user.id;

    const note = db.prepare(`
      SELECT n.* FROM notes n
      WHERE n.id = ?
        AND (n.user_id = ? OR n.id IN (SELECT note_id FROM shared_notes WHERE shared_with_user_id = ?))
    `).get(noteId, userId, userId);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    return res.status(200).json(formatNote(note));
  }
);

// ── POST /notes ─────────────────────────────────────────────────────────────

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, content } = req.body;
    const userId = req.user.id;

    const result = db.prepare(
      'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)'
    ).run(userId, title, content);

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json(formatNote(note));
  }
);

// ── PUT /notes/:id ──────────────────────────────────────────────────────────

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Note ID must be a positive integer'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
    body('is_pinned').optional().isBoolean().withMessage('is_pinned must be a boolean'),
    body('is_archived').optional().isBoolean().withMessage('is_archived must be a boolean'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const noteId = parseInt(req.params.id);
    const userId = req.user.id;

    // Only the owner can update
    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const title = req.body.title !== undefined ? req.body.title : note.title;
    const content = req.body.content !== undefined ? req.body.content : note.content;
    const isPinned = req.body.is_pinned !== undefined ? (req.body.is_pinned ? 1 : 0) : note.is_pinned;
    const isArchived = req.body.is_archived !== undefined ? (req.body.is_archived ? 1 : 0) : note.is_archived;

    db.prepare(`
      UPDATE notes
      SET title = ?, content = ?, is_pinned = ?, is_archived = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, content, isPinned, isArchived, noteId);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);

    return res.status(200).json(formatNote(updated));
  }
);

// ── DELETE /notes/:id ───────────────────────────────────────────────────────

router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Note ID must be a positive integer')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const noteId = parseInt(req.params.id);
    const userId = req.user.id;

    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);

    return res.status(204).send();
  }
);

// ── POST /notes/:id/share ───────────────────────────────────────────────────

router.post(
  '/:id/share',
  [
    param('id').isInt({ min: 1 }).withMessage('Note ID must be a positive integer'),
    body('share_with_email')
      .trim()
      .notEmpty().withMessage('share_with_email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const noteId = parseInt(req.params.id);
    const userId = req.user.id;
    const { share_with_email } = req.body;

    // Verify the note exists and belongs to the current user
    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Find the target user
    const targetUser = db.prepare('SELECT id, email FROM users WHERE email = ?').get(share_with_email);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Can't share with yourself
    if (targetUser.id === userId) {
      return res.status(400).json({ message: 'Cannot share a note with yourself' });
    }

    // Check if already shared
    const existing = db.prepare(
      'SELECT id FROM shared_notes WHERE note_id = ? AND shared_with_user_id = ?'
    ).get(noteId, targetUser.id);

    if (existing) {
      return res.status(409).json({ message: 'Note is already shared with this user' });
    }

    db.prepare(
      'INSERT INTO shared_notes (note_id, shared_with_user_id) VALUES (?, ?)'
    ).run(noteId, targetUser.id);

    return res.status(200).json({ message: `Note shared successfully with ${share_with_email}` });
  }
);

module.exports = router;
