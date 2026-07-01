const { body, validationResult } = require("express-validator");

const validatePayment = [
  body("orderId").notEmpty().withMessage("orderId is required"),
  body("userId").isUUID().withMessage("userId must be a valid UUID"),
  body("amount").isFloat({ gt: 0 }).withMessage("amount must be greater than 0"),
  body("idempotencyKey").notEmpty().withMessage("idempotencyKey is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validatePayment,
};
