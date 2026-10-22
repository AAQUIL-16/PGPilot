require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("PostgreSQL connected successfully");
    console.log("Database time:", result.rows[0].now);

    app.listen(PORT, () => {
      console.log(`PGPilot server running on port ${PORT}`);
    });
  } catch (error) {
  console.error("Database connection failed:");
  console.error("Error code:", error.code);
  console.error("Error message:", error.message);
  console.error("Error details:", error.cause?.message);
  process.exit(1);
}
}

startServer();