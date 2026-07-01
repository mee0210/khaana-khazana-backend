const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("Database Connected successfully");
    client.release();

    // Note: order_id is NOT UNIQUE here, as per user requirement, to allow multiple attempts per order.
    // However, idempotency_key IS UNIQUE to prevent the exact same attempt from being processed twice.
    const createPaymentsTableQuery = `
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        idempotency_key VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createPaymentsTableQuery);
    console.log("Database Schema Initialized: 'payments' table is ready.");
  } catch (err) {
    console.error("Database connection or migration failed:");
    console.error("DB Error:", err.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  pool,
};
