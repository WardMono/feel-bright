const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const useSsl = process.env.DB_SSL === 'true' || isProduction;

const hasConnectionString = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;

const baseConfig = hasConnectionString
  ? {
      connectionString: process.env.DATABASE_URL.trim()
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: Number(process.env.DB_PORT || 5432)
    };

const pool = new Pool({
  ...baseConfig,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database'))
  .catch((err) => console.error('❌ Connection error:', err.stack));

module.exports = pool;