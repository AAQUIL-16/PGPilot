
const { Pool } = require("pg");
require("dotenv").config();

const isCloudDatabase = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
  isCloudDatabase
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: true,
        },
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

pool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL connection error:",
    error.message
  );
});

module.exports = pool;

console.log("Cloud database enabled:", isCloudDatabase);
console.log(
  "Database host:",
  isCloudDatabase
    ? new URL(process.env.DATABASE_URL).hostname
    : process.env.DB_HOST || "localhost"
);
