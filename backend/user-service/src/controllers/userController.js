/**
 * User Profile Controller
 *
 * This module handles fetching details of the currently authenticated user by delegating
 * database queries to the User model.
 */
const User = require("../models/User");
/**
 * Fetch the authenticated user's profile details
 * GET /api/users/me
 */
async function getMe(req, res) {
  // 1. Get the userId attached to the request by the verifyToken middleware
  const userId = req.user.userId;
  try {
    // 2. Fetch the user details using the User Model
    const user = await User.findById(userId);
    // 3. If the user doesn't exist in the database, return 404
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }
    // 4. Return the user profile
    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      walletBalance: user.wallet_balance,
      addresses: user.addresses || [],
      favorites: user.favorites || [],
      phone: user.phone || '',
      profileImage: user.profile_image || '',
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error("Error retrieving user profile:", err.message);
    return res
      .status(500)
      .json({ error: "Server error occurred while fetching user profile." });
  }
}

async function addFunds(req, res) {
  const userId = req.user.userId;
  const { amount } = req.body;
  try {
    const user = await User.findById(userId);
    const newBalance = parseFloat(user.wallet_balance || 0) + parseFloat(amount || 0);
    const updated = await User.updateWallet(userId, newBalance);
    return res.status(200).json({ walletBalance: updated.wallet_balance });
  } catch (err) {
    return res.status(500).json({ error: "Failed to add funds." });
  }
}

async function addAddress(req, res) {
  const userId = req.user.userId;
  const { type, address, phone } = req.body;
  try {
    const user = await User.findById(userId);
    let addresses = user.addresses || [];
    addresses.push({ type, address, phone, isDefault: addresses.length === 0, icon: type === 'Home' ? 'HomeIcon' : 'Briefcase' });
    const updated = await User.updateAddresses(userId, addresses);
    return res.status(200).json({ addresses: updated.addresses });
  } catch (err) {
    return res.status(500).json({ error: "Failed to add address." });
  }
}

async function toggleFavorite(req, res) {
  const userId = req.user.userId;
  const { restaurantId } = req.params;
  try {
    const user = await User.findById(userId);
    let favorites = user.favorites || [];
    if (favorites.includes(restaurantId)) {
      favorites = favorites.filter(id => id !== restaurantId);
    } else {
      favorites.push(restaurantId);
    }
    const updated = await User.updateFavorites(userId, favorites);
    return res.status(200).json({ favorites: updated.favorites });
  } catch (err) {
    return res.status(500).json({ error: "Failed to toggle favorite." });
  }
}

async function updateProfile(req, res) {
  const userId = req.user.userId;
  const { name, phone, profileImage } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }
  
  try {
    const updated = await User.updateProfile(userId, name, phone || '', profileImage || '');
    return res.status(200).json({
      name: updated.name,
      phone: updated.phone,
      profileImage: updated.profile_image
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update profile." });
  }
}

module.exports = {
  getMe,
  addFunds,
  addAddress,
  toggleFavorite,
  updateProfile
};
