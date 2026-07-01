/**
 * Authentication Controller
 *
 * This module contains the handlers for registration, login, token refresh, and token verification.
 * It coordinates request validation results, delegates database access to the User Model,
 * and signs JWT access/refresh tokens.
 */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
// Define salt rounds for bcrypt. The requirement is salt=12.
const SALT_ROUNDS = 12;
/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
  const { email, password, name } = req.body;
  try {
    // 1. Check if the user already exists in the database by calling the User Model
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }
    // 2. Hash the user's password using bcrypt
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    // 3. Create the user using the User Model
    const newUser = await User.create(email, passwordHash, name);
    // 4. Return success 201 Created
    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.created_at,
      },
    });
  } catch (err) {
    console.error("Error during user registration:", err.message);
    return res
      .status(500)
      .json({ error: "Server error occurred during user registration." });
  }
}
/**
 * Log in an existing user and return tokens
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;
  try {
    // 1. Query the User Model for the user by email
    const user = await User.findByEmail(email);

    if (!user) {
      // Security Tip: Return a generic "invalid credentials" error message rather than
      // "User not found" to prevent email enumeration.
      return res.status(401).json({ error: "Invalid email or password." });
    }
    // 2. Compare the provided password with the stored hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    // 3. Generate a short-lived Access Token (expires in 15 minutes)
    // The key contract specifies that downstream services require: { userId, email, iat, exp }
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    // 4. Generate a long-lived Refresh Token (expires in 7 days)
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, sub: user.id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh",
      { expiresIn: "7d" },
    );
    // 5. Send response with both tokens and basic user info
    return res.status(200).json({
      message: "Login successful.",
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Error during user login:", err.message);
    return res
      .status(500)
      .json({ error: "Server error occurred during login." });
  }
}
/**
 * Refresh an expired access token using a valid refresh token
 * POST /api/auth/refresh
 */
async function refresh(req, res) {
  const { refreshToken } = req.body;
  const refreshSecret =
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";
  try {
    // 1. Verify the signature and expiration of the refresh token
    const decoded = jwt.verify(refreshToken, refreshSecret);
    // 2. Generate a new short-lived Access Token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, sub: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    // 3. Return the new access token
    return res.status(200).json({
      token: newAccessToken,
    });
  } catch (err) {
    console.error("Error during token refresh:", err.message);

    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Refresh token has expired. Please log in again." });
    }

    return res
      .status(401)
      .json({ error: "Invalid refresh token. Please log in again." });
  }
}
/**
 * Verify a token and return user profile details
 * GET /api/auth/verify
 */
async function verify(req, res) {
  return res.status(200).json({
    valid: true,
    user: req.user,
  });
}
module.exports = {
  register,
  login,
  refresh,
  verify,
};
