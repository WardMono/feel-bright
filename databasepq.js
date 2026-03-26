const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'f_bright',
  password: 'Alfredmiguel363',
  port: 5432,
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database'))
  .catch((err) => console.error('❌ Connection error:', err.stack));

module.exports = pool;
