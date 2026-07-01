/**
 * Input Validation Middleware
 *
 * This module uses 'express-validator' to define validation rules for our endpoints.
 * Validating inputs on the server is critical to prevent injection attacks, SQL issues,
 * and malformed data from corrupting our database or causing runtime errors.
 */
const { body, validationResult } = require("express-validator");
/**
 * Utility middleware that checks the validation result of the request.
 * If any of the validation checks failed, it returns a 400 Bad Request
 * response containing the list of validation errors, blocking the request from proceeding.
 */
const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
/**
 * Validation rules for user registration (/api/auth/register).
 * Checks that the email is valid, the password meets minimum requirements, and a name is provided.
 */
const validateRegister = [
  body("email")
    .isEmail()
    .withMessage("Must be a valid email address.")
    .normalizeEmail(), // Sanitizer: standardizes email casing and spacing
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long.")
    .trim(),
  body("name")
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters.")
    .trim(),
  validateResult, // Run validation check after all rules
];
/**
 * Validation rules for user login (/api/auth/login).
 * Verifies that email and password fields are present and correctly formatted.
 */
const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Must be a valid email address.")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required.").trim(),
  validateResult,
];
/**
 * Validation rules for token refresh (/api/auth/refresh).
 * Ensures that a refreshToken is sent in the request body.
 */
const validateRefresh = [
  body("refreshToken")
    .notEmpty()
    .withMessage("refreshToken is required in the request body.")
    .trim(),
  validateResult,
];
module.exports = {
  validateRegister,
  validateLogin,
  validateRefresh,
};
