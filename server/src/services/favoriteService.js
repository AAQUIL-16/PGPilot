
const pool = require("../config/db");

/**
 * Get all saved PGs belonging to a specific user.
 *
 * userId must be a valid UUID.
 * The API controller will eventually obtain this
 * from a verified JWT, not from an untrusted URL.
 */
async function getUserFavorites(userId) {
  const query = `
    SELECT
      id,
      google_place_id,
      pg_name,
      pg_address,
      google_rating,
      created_at
    FROM favorites
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

module.exports = {
  getUserFavorites,
};
