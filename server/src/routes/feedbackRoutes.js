
const express = require("express");
const pool = require("../config/db");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many feedback submissions. Please try again after 15 minutes."
  }
});

router.use(feedbackLimiter);

router.post("/", async (req, res) => {
  try {
    const rating = req.body?.rating;
    const message = req.body?.message;

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    if (
      typeof message !== "string" ||
      message.trim().length < 10 ||
      message.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Feedback must contain 10 to 1000 characters"
      });
    }

    const result = await pool.query(
      `INSERT INTO platform_feedback (rating, message)
       VALUES ($1, $2)
       RETURNING id, rating, message, created_at`,
      [rating, message.trim()]
    );

    return res.status(201).json({
      success: true,
      message: "Thank you for your feedback!",
      feedback: result.rows[0]
    });
  } catch (error) {
    console.error("Feedback error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to submit feedback"
    });
  }
});

module.exports = router;
