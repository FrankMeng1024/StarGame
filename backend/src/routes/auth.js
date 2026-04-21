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

// DEV MODE: 所有登录直接返回 mock openid，跳过微信 code 换取
// TODO: 上线前删除此块，恢复真实 wxCode2Session 逻辑
const DEV_MOCK_OPENID = 'test_dev_user_001';

router.post('/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  const openid = DEV_MOCK_OPENID;
  console.log(`[auth] DEV MODE — using mock openid: ${openid}`);
  const token = jwt.sign({ openid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token });
});

module.exports = router;
