const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '').trim();

let poolConfig;

if (connectionString) {
  // Railway internal: postgres.railway.internal — no SSL needed
  // Local: localhost / 127.0.0.1 — no SSL needed
  // Remote/Public: *.proxy.rlwy.net, *.railway.app — SSL needed
  const isInternalOrLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1') ||
    connectionString.includes('railway.internal');

  poolConfig = {
    connectionString,
    ssl: isInternalOrLocal ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  const dbPass = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  poolConfig = {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    ...(dbPass ? { password: String(dbPass).trim() } : {}),
    database: process.env.PGDATABASE || process.env.DB_NAME || 'railway',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

// Non-blocking database connection test
pool.connect((err, client, release) => {
  if (err) {
    console.warn('⚠️ Warning: Initial PostgreSQL connection attempt failed:', err.message);
    console.warn('Backend will continue running and retry database queries on incoming requests.');
  } else {
    console.log('✅ Connected to PostgreSQL database successfully!');
    if (typeof release === 'function') release();
  }
});

module.exports = pool;