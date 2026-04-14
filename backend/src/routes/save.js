// routes/save.js — GET/POST /api/save
// JWT 验证 → 读写 saves 表

const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const router = express.Router();

// JWT 中间件
function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid token' });
  }
}

// 读存档
router.get('/save', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT data FROM saves WHERE openid = ?',
      [req.user.openid]
    );
    res.json({ data: rows.length ? rows[0].data : null });
  } catch (e) {
    console.error('[save] read error:', e);
    res.status(500).json({ error: 'read failed' });
  }
});

// 写存档（upsert）
router.post('/save', auth, async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'data required' });

  try {
    await pool.execute(
      `INSERT INTO saves (openid, data) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
      [req.user.openid, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[save] write error:', e);
    res.status(500).json({ error: 'write failed' });
  }
});

module.exports = router;
