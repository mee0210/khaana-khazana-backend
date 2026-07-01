/**
 * User Profile Routes
 *
 * This module defines routes for user profile actions, mounting the token verification middleware
 * to protect endpoints.
 */
const express = require("express");
const router = express.Router();
// Controllers
const userController = require("../controllers/userController");
// Middlewares
const { verifyToken } = require("../middleware/auth");
/**
 * @route   GET /api/users/me
 * @desc    Get currently logged-in user profile details
 * @access  Private (JWT Required)
 */
router.get("/me", verifyToken, userController.getMe);
router.put("/me", verifyToken, userController.updateProfile);
router.post("/me/wallet/add", verifyToken, userController.addFunds);
router.post("/me/addresses", verifyToken, userController.addAddress);
router.post("/me/favorites/:restaurantId", verifyToken, userController.toggleFavorite);
module.exports = router;
