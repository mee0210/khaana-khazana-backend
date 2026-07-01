const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");
const { verifyToken } = require("../middleware/auth");
const { validatePayment } = require("../middleware/validation");

// 1. Process a new payment (Requires JWT and validation)
router.post("/", verifyToken, validatePayment, paymentController.processPayment);

// 2. Retrieve payment by its ID (Requires JWT)
router.get("/:paymentId", verifyToken, paymentController.getPayment);

// 3. Retrieve all payments by Order ID
router.get("/order/:orderId", verifyToken, paymentController.getPaymentByOrder);

// 4. Simulate Failure (For Circuit Breaker Testing)
router.post("/simulate-failure", paymentController.simulateFailure);

// 5. Circuit Breaker Health Check
router.get("/health/circuit", paymentController.checkCircuitHealth);

module.exports = router;
