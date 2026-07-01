/**
 * Express Application Configuration
 *
 * This file configures the Express application instance, applying global middlewares,
 * registering routers for different resources, and defining global error-handling logic.
 */
const express = require("express");
const cors = require("cors");
// Import route modules
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
// Initialize express app
const app = express();
// Global Middlewares
// Enable Cross-Origin Resource Sharing (CORS) so frontend clients or other microservices
// running on different domains/ports can make requests to our API.
app.use(cors());
// Parse incoming JSON request bodies (e.g. req.body in POST requests)
app.use(express.json());
// Application Routes
// Root check endpoint
app.get("/", (req, res) => {
  res.send("User Service is running.");
});
/**
 * Health check endpoint.
 * Returning status ok, uptime, and database connectivity.
 * Used by container orchestrators (like Kubernetes) and API Gateways (like Kong) for active health probes.
 */
app.get("/health", async (req, res) => {
  const { pool } = require("./db/connect");
  let dbStatus = "connected";

  try {
    // Simple verification query to test database responsiveness
    await pool.query("SELECT 1");
  } catch (err) {
    dbStatus = "disconnected";
  }
  res.status(200).json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    database: dbStatus,
    uptime: `${process.uptime().toFixed(2)}s`,
    timestamp: new Date().toISOString(),
  });
});
// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
/**
 * 404 handler for unmatched routes.
 */
app.use((req, res, next) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});
/**
 * Global Error-Handling Middleware
 *
 * By defining a middleware with 4 parameters (err, req, res, next), Express recognizes it as
 * an error handler. It catches any synchronous/asynchronous errors thrown in the controllers,
 * preventing server crashes and returning clean JSON responses.
 */
app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err.stack || err.message);

  // Return standard HTTP 500 Internal Server Error
  res.status(500).json({
    error:
      "An unexpected error occurred on the server. Please try again later.",
  });
});
module.exports = app;
