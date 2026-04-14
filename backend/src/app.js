// app.js — Express 入口
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// 路由
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/save'));

// 健康检查
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// 启动
const PORT = parseInt(process.env.PORT || '3000');

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] listening on :${PORT}`);
      console.log(`[server] health: http://localhost:${PORT}/health`);
    });
  })
  .catch((e) => {
    console.error('[server] startup failed:', e);
    process.exit(1);
  });
