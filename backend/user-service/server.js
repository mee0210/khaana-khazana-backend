// 1. Initialize OpenTelemetry tracing first before loading any other modules.
// This is critical so that OpenTelemetry can hook into HTTP, Express, and PostgreSQL
// libraries and record telemetry spans automatically.
require("./src/otel");
// 2. Load environment variables from the .env file.
require("dotenv").config();
const app = require("./src/app");
const { connectDB } = require("./src/db/connect");
const PORT = process.env.PORT || 5000;
/**
 * Starts the User Service microservice
 */
async function start() {
  try {
    // 3. Connect to the PostgreSQL database and run schema auto-migrations
    await connectDB();
    // 4. Start the Express server listener
    app.listen(PORT, () => {
      console.log(`=============================================`);
      console.log(`User Service listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`=============================================`);
    });
  } catch (err) {
    console.error("Critical: Failed to start User Service:", err.message);
    process.exit(1);
  }
}
// Global exception handlers to prevent silent process death or unhandled promise leaks
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection at:", promise, "reason:", reason);
  // Optional: Graceful recovery or crash log
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown:", error);
  // A crash indicates something is fatally wrong; recommend restarting the process
  process.exit(1);
});
start();
