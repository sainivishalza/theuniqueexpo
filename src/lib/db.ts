import mysql from "mysql2/promise";
import fs from "fs";

// DB_SOCKET connects over a Unix socket instead of TCP -- needed in build
// sandboxes (like Hostinger's hbuilds) that are network-isolated from the
// DB server but still share its filesystem. That env var is set globally
// (build and runtime share the same config), but the *runtime* serving
// process runs in a different, non-isolated sandbox where that socket
// file doesn't exist -- so check it actually exists before trusting it,
// and fall back to a normal TCP connection otherwise.
const socketExists =
  !!process.env.DB_SOCKET && fs.existsSync(process.env.DB_SOCKET);

const pool = mysql.createPool({
  ...(socketExists
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
