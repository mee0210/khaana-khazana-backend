require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db/pool");
const paymentRoutes = require("./routes/payment");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Payment Service is running.");
});

app.get("/health", async (req, res) => {
  const { pool } = require("./db/pool");
  let dbStatus = "connected";

  try {
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

app.use("/api/payments", paymentRoutes);

app.use((req, res, next) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err.stack || err.message);
  res.status(500).json({
    error: "An unexpected error occurred on the server.",
  });
});

const PORT = process.env.PORT || 3002;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("=============================================");
    console.log(`Payment Service listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("=============================================");
  });
});

module.exports = app;
