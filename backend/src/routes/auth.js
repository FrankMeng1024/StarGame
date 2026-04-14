// routes/auth.js — POST /api/login
// 接收微信 code → 换 openid → 签发 JWT

const express = require('express');
const jwt = require('jsonwebtoken');
const https = require('https');
const router = express.Router();

const APPID = process.env.WX_APPID;
const SECRET = process.env.WX_APPSECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// 向微信服务器换 openid
function wxCode2Session(code) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`;
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (d) => raw += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.errcode) reject(new Error(`wx error ${parsed.errcode}: ${parsed.errmsg}`));
          else resolve(parsed.openid);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

router.post('/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  try {
    const openid = await wxCode2Session(code);
    const token = jwt.sign({ openid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token });
  } catch (e) {
    console.error('[auth] login error:', e.message);
    res.status(500).json({ error: 'login failed' });
  }
});

module.exports = router;
