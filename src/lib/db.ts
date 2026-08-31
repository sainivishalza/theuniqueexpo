import mysql from "mysql2/promise";

const pool = mysql.createPool({
  // DB_SOCKET connects over a Unix socket instead of TCP -- needed in build
  // sandboxes (like Hostinger's hbuilds) that are network-isolated from the
  // DB server but still share its filesystem.
  ...(process.env.DB_SOCKET
    ? { socketPath: process.env.DB_SOCKET }
    : { host: process.env.DB_HOST || "localhost" }),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "theuniqueexpo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  charset: process.env.DB_CHARSET || "utf8mb4",
});

export default pool;
