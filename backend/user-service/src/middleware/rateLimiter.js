/**
 * Rate Limiting Middleware
 *
 * Rate limiting is a security best practice to prevent brute-force attacks (such as
 * trying to guess user passwords on the login endpoint) and Distributed Denial of Service (DDoS)
 * attacks. We use the 'express-rate-limit' package to implement basic IP-based limiters.
 */
const rateLimit = require("express-rate-limit");
/**
 * Rate limiter specifically for the /login endpoint.
 * Restricts an IP address to 5 login requests every 15 minutes.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 5, // Limit each IP to 5 login requests per 'window' (here, per 15 minutes)
  message: {
    error:
      "Too many login attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
module.exports = {
  loginRateLimiter,
};
