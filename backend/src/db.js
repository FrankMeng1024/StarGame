// db.js — MySQL 连接池
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
});

// 初始化表（首次启动自动建表）
async function initDB() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS saves (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      openid    VARCHAR(64) NOT NULL UNIQUE,
      data      JSON NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_openid (openid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[db] table saves ready');
}

module.exports = { pool, initDB };
