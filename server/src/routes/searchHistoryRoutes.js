
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Get only the logged-in user's search history
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, destination, results_count, created_at
       FROM search_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      searches: result.rows
    });
  } catch (error) {
    console.error("Search history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch search history"
    });
  }
});

// Delete one history record belonging to the user
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid search history ID"
      });
    }

    const result = await pool.query(
      `DELETE FROM search_history
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Search history record not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Search removed from history"
    });
  } catch (error) {
    console.error("Delete search history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete search history"
    });
  }
});

module.exports = router;
