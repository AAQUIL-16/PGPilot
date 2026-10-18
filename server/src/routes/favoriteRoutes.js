
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getUserFavorites } = require("../services/favoriteService");

const router = express.Router();

// All favorites routes require a valid JWT
router.use(authMiddleware);

// GET /api/favorites
// Return only the logged-in user's saved PGs
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await getUserFavorites(userId);

    return res.status(200).json({
      success: true,
      total: favorites.length,
      favorites,
    });
  } catch (error) {
    console.error("Fetch favorites error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch favorites",
    });
  }
});

// POST /api/favorites
// Save a PG for the logged-in user
router.post("/", async (req, res) => {
  try {
    const {
      googlePlaceId,
      name,
      address,
      rating
    } = req.body || {};

    // Validate required fields
    if (
      typeof googlePlaceId !== "string" ||
      !googlePlaceId.trim() ||
      googlePlaceId.length > 255 ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 255
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid PG ID and name are required",
      });
    }

    if (
      address !== undefined &&
      address !== null &&
      typeof address !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid PG address",
      });
    }

    if (
      rating !== undefined &&
      rating !== null &&
      (
        typeof rating !== "number" ||
        !Number.isFinite(rating) ||
        rating < 0 ||
        rating > 5
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 0 and 5",
      });
    }

    const userId = req.user.id;

    const result = await require("../config/db").query(
      `INSERT INTO favorites
         (user_id, google_place_id, pg_name, pg_address, google_rating)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, google_place_id)
       DO UPDATE SET
         pg_name = EXCLUDED.pg_name,
         pg_address = EXCLUDED.pg_address,
         google_rating = EXCLUDED.google_rating
       RETURNING
         id, google_place_id, pg_name, pg_address,
         google_rating, created_at`,
      [
        userId,
        googlePlaceId.trim(),
        name.trim(),
        address?.trim() || null,
        rating ?? null
      ]
    );

    return res.status(200).json({
      success: true,
      message: "PG saved to favorites successfully",
      favorite: result.rows[0]
    });

  } catch (error) {
    console.error("Save favorite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save PG to favorites"
    });
  }
});


 // DELETE /api/favorites/:googlePlaceId
 // Remove a PG only from the logged-in user's favorites
 router.delete("/:googlePlaceId", async (req, res) => {
   try {
     const googlePlaceId = req.params.googlePlaceId;

     if (
       typeof googlePlaceId !== "string" ||
       !googlePlaceId.trim() ||
       googlePlaceId.length > 255
     ) {
       return res.status(400).json({
         success: false,
         message: "Valid PG ID is required",
       });
     }

     const pool = require("../config/db");

     const result = await pool.query(
       `DELETE FROM favorites
        WHERE user_id = $1 AND google_place_id = $2
        RETURNING id, google_place_id, pg_name`,
       [req.user.id, googlePlaceId.trim()]
     );

     if (result.rowCount === 0) {
       return res.status(404).json({
         success: false,
         message: "PG not found in your favorites",
       });
     }

     return res.status(200).json({
       success: true,
       message: "PG removed from favorites successfully",
       removedFavorite: result.rows[0],
     });
   } catch (error) {
     console.error("Delete favorite error:", error.message);

     return res.status(500).json({
       success: false,
       message: "Unable to remove PG from favorites",
     });
   }
 });


module.exports = router;
