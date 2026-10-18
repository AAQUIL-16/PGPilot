
require("dotenv").config();

const pool = require("./src/config/db");

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database_name, NOW() AS server_time"
    );

    console.log("PostgreSQL connected successfully!");
    console.log("Database:", result.rows[0].database_name);
    console.log("Server time:", result.rows[0].server_time);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
