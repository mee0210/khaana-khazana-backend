const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Access Denied: No token provided in the Authorization header. Format must be 'Bearer <token>'.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access Denied: The JWT token has expired. Please refresh your token.",
      });
    }

    return res.status(403).json({
      error: "Access Denied: Invalid or tampered authentication token.",
    });
  }
}

module.exports = {
  verifyToken,
};
