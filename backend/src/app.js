// app.js — Express 入口
require('dotenv').config();

// 必要环境变量检查 — 缺失时立即退出
const REQUIRED_ENV = ['JWT_SECRET', 'WX_APPID', 'WX_APPSECRET', 'DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('[startup] missing required env vars:', missing.join(', '));
  process.exit(1);
}

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
