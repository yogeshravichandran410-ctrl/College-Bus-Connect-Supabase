const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.warn("SUPABASE_DB_URL is not set. Add your Supabase Postgres connection string to backend/.env");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

module.exports = pool;
