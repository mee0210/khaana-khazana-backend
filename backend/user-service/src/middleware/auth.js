/**
 * Authentication Middleware
 *
 * This middleware intercepts requests to protected routes. It checks for a JSON Web Token (JWT)
 * in the Authorization header, verifies it, and attaches the user payload to the request object.
 * Downstream routes can then access the logged-in user's details via req.user.
 */
const jwt = require("jsonwebtoken");
/**
 * Middleware function to verify JWT and protect routes.
 * Expected Header Format: Authorization: Bearer <token>
 */
function verifyToken(req, res, next) {
  // 1. Retrieve the Authorization header
  const authHeader = req.headers["authorization"];

  // 2. Check if the header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error:
        "Access Denied: No token provided in the Authorization header. Format must be 'Bearer <token>'.",
    });
  }
  // 3. Extract the actual token string (split by space)
  const token = authHeader.split(" ")[1];
  try {
    // 4. Verify the token signature and expiration against the JWT_SECRET
    // The decoded object represents the payload we signed (userId, email, etc.)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach the decoded payload to the request object
    // Downstream controllers can access req.user.userId and req.user.email
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    // 6. Pass control to the next route handler or middleware
    next();
  } catch (err) {
    // Handle specific token verification errors to be helpful
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({
          error:
            "Access Denied: The JWT token has expired. Please refresh your token.",
        });
    }

    return res
      .status(403)
      .json({
        error: "Access Denied: Invalid or tampered authentication token.",
      });
  }
}
module.exports = {
  verifyToken,
};
