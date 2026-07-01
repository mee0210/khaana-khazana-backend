/**
 * Database Connection & Schema Initialization Module
 *
 * This module configures and exports the PostgreSQL connection pool using the 'pg' library.
 * It also handles the automatic creation of the 'users' table on application startup
 * to simplify database setup.
 */
const { Pool } = require("pg");
// Create a new connection pool. Connection pooling allows multiple simultaneous
// database queries to share a cache of reusable connections, improving performance.
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  // Note: For production, we can also specify max connections, idle timeouts, etc.
});
/**
 * Initializes the database connection and runs auto-migrations.
 * This runs when the server starts up.
 */
async function connectDB() {
  try {
    // Test the connection by acquiring a client from the pool
    const client = await pool.connect();
    console.log("Database Connected successfully");

    // Release the client back to the pool immediately after testing the connection
    client.release();
    // Run auto-migration: create the 'users' table if it does not exist.
    // We use UUID (Universally Unique Identifier) for user IDs instead of auto-incrementing integers
    // to prevent enumeration attacks and simplify distributed database merging in microservices.
    // In PostgreSQL 13+, gen_random_uuid() is built-in and does not require extensions.
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        wallet_balance DECIMAL(10,2) DEFAULT 0.00,
        addresses JSONB DEFAULT '[]',
        favorites JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createUsersTableQuery);

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites JSONB DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) DEFAULT '';
    `);
    console.log("Database Schema Initialized: 'users' table is ready.");
  } catch (err) {
    console.error("Database connection or migration failed:");
    console.error("DB Error:", err.message);
    // In a production microservice, you might want to terminate the process
    // if the database is unreachable, or implement a retry mechanism.
    process.exit(1);
  }
}
module.exports = {
  connectDB,
  pool,
};
