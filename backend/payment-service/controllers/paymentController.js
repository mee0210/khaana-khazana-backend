const { pool } = require("../db/pool");

// Global flag for simulating circuit breaker failures
let forceFailure = false;

async function processPayment(req, res) {
  const { orderId, userId, amount, idempotencyKey } = req.body;

  // Check if we are simulating a failure
  if (forceFailure) {
    return res.status(503).json({ error: "Simulated Service Unavailable (Circuit Breaker Test)" });
  }

  // Idempotency: Use a transaction to ensure exact once semantics
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if the idempotency_key already exists
    const checkQuery = "SELECT * FROM payments WHERE idempotency_key = $1";
    const checkResult = await client.query(checkQuery, [idempotencyKey]);

    if (checkResult.rows.length > 0) {
      // If it exists, return the cached result
      await client.query("COMMIT");
      const existingPayment = checkResult.rows[0];
      return res.status(200).json({
        paymentId: existingPayment.id,
        orderId: existingPayment.order_id,
        status: existingPayment.status,
        amount: existingPayment.amount,
        idempotencyKey: existingPayment.idempotency_key,
        message: "Cached response (Idempotent request)",
      });
    }

    // Process new payment: simulate success 90% of the time
    const isSuccess = Math.random() > 0.1;
    const paymentStatus = isSuccess ? "SUCCESS" : "FAILED";

    const insertQuery = `
      INSERT INTO payments (order_id, user_id, amount, status, idempotency_key)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, order_id, status, amount, idempotency_key, created_at
    `;
    const insertValues = [orderId, userId, amount, paymentStatus, idempotencyKey];
    
    const result = await client.query(insertQuery, insertValues);
    await client.query("COMMIT");

    const newPayment = result.rows[0];
    
    return res.status(201).json({
      paymentId: newPayment.id,
      orderId: newPayment.order_id,
      status: newPayment.status,
      amount: newPayment.amount,
      idempotencyKey: newPayment.idempotency_key,
      message: "New payment processed",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Payment processing error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}

async function getPayment(req, res) {
  const { paymentId } = req.params;
  
  try {
    const query = "SELECT * FROM payments WHERE id = $1";
    const result = await pool.query(query, [paymentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Ensure the user requesting owns this payment
    if (result.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: "Access denied to this payment record" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching payment:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getPaymentByOrder(req, res) {
  const { orderId } = req.params;
  
  try {
    // Note: Since an order can have multiple payment attempts, we return all attempts for the order
    const query = "SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No payments found for this order" });
    }

    return res.status(200).json({ attempts: result.rows });
  } catch (err) {
    console.error("Error fetching payment by order:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

function simulateFailure(req, res) {
  forceFailure = !forceFailure;
  return res.status(200).json({
    message: forceFailure 
      ? "Simulated failures ENABLED. Next requests will return 503." 
      : "Simulated failures DISABLED. Normal operations resumed.",
    circuitOpen: forceFailure
  });
}

function checkCircuitHealth(req, res) {
  return res.status(200).json({
    circuitOpen: forceFailure,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  processPayment,
  getPayment,
  getPaymentByOrder,
  simulateFailure,
  checkCircuitHealth,
};
