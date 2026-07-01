/**
 * Authentication Routes
 *
 * This module defines the routes related to user authentication: register, login, refresh, and verify.
 * It integrates input validation, rate limiting, and token verification middlewares.
 */
const express = require("express");
const router = express.Router();
// Controllers
const authController = require("../controllers/authController");
// Middlewares
const {
  validateRegister,
  validateLogin,
  validateRefresh,
} = require("../middleware/validation");
const { loginRateLimiter } = require("../middleware/rateLimiter");
const { verifyToken } = require("../middleware/auth");
/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", validateRegister, authController.register);
/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get tokens (Access + Refresh)
 * @access  Public (Rate-limited)
 */
router.post("/login", loginRateLimiter, validateLogin, authController.login);
/**
 * @route   POST /api/auth/refresh
 * @desc    Get a new access token using a refresh token
 * @access  Public
 */
router.post("/refresh", validateRefresh, authController.refresh);
/**
 * @route   GET /api/auth/verify
 * @desc    Verify current access token & return user payload (used by downstream microservices)
 * @access  Private (JWT Required)
 */
router.get("/verify", verifyToken, authController.verify);
module.exports = router;
