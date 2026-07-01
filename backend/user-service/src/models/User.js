/**
 * User Model / Data Access Object (DAO)
 *
 * In a traditional Node/Express MVC or Clean Architecture setup, the Model layer is
 * responsible for all interactions with the database. By separating SQL query logic
 * from our controllers (which handle HTTP requests and responses), we achieve a clean
 * separation of concerns and make our codebase easier to test, maintain, and scale.
 */
const { pool } = require("../db/connect");
class User {
  /**
   * Creates a new user record in the database.
   *
   * @param {string} email - Normalized email address.
   * @param {string} passwordHash - Hashed password.
   * @param {string} name - User's full name.
   * @returns {Promise<object>} The newly created user object.
   */
  static async create(email, passwordHash, name) {
    const query = `
      INSERT INTO users (email, password_hash, name) 
      VALUES ($1, $2, $3) 
      RETURNING id, email, name, created_at
    `;
    const result = await pool.query(query, [email, passwordHash, name]);
    return result.rows[0];
  }
  /**
   * Finds a user by their email address.
   * Useful during login and checking duplicate registrations.
   *
   * @param {string} email - The email to search for.
   * @returns {Promise<object|null>} The user object or null if not found.
   */
  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }
  /**
   * Finds a user by their unique UUID.
   * Useful when retrieving profile information of an authenticated user.
   *
   * @param {string} id - The UUID of the user.
   * @returns {Promise<object|null>} The user object (excluding sensitive password hash) or null.
   */
  static async findById(id) {
    const query = "SELECT id, email, name, wallet_balance, addresses, favorites, phone, profile_image, created_at FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  static async updateWallet(id, newBalance) {
    const query = "UPDATE users SET wallet_balance = $1 WHERE id = $2 RETURNING *";
    const result = await pool.query(query, [newBalance, id]);
    return result.rows[0];
  }

  static async updateAddresses(id, addresses) {
    const query = "UPDATE users SET addresses = $1 WHERE id = $2 RETURNING *";
    const result = await pool.query(query, [JSON.stringify(addresses), id]);
    return result.rows[0];
  }

  static async updateFavorites(id, favorites) {
    const query = "UPDATE users SET favorites = $1 WHERE id = $2 RETURNING *";
    const result = await pool.query(query, [JSON.stringify(favorites), id]);
    return result.rows[0];
  }

  static async updateProfile(id, name, phone, profileImage) {
    const query = "UPDATE users SET name = $1, phone = $2, profile_image = $3 WHERE id = $4 RETURNING *";
    const result = await pool.query(query, [name, phone, profileImage, id]);
    return result.rows[0];
  }
}
module.exports = User;
