
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [users, searches, feedback] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM users"),
      pool.query("SELECT COUNT(*) AS total FROM search_history"),
      pool.query(`
        SELECT
          COUNT(*) AS total,
          ROUND(AVG(rating)::numeric, 1) AS average_rating
        FROM platform_feedback
      `)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: Number(users.rows[0].total),
        totalSearches: Number(searches.rows[0].total),
        totalFeedback: Number(feedback.rows[0].total),
        averageRating:
          feedback.rows[0].average_rating === null
            ? null
            : Number(feedback.rows[0].average_rating)
      }
    });
  } catch (error) {
    console.error("Statistics API error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load platform statistics"
    });
  }
});

module.exports = router;
