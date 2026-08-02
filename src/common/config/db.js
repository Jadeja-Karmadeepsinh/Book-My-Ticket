import 'dotenv/config'
import { env } from './env.js'
import pg from 'pg'

const { Pool } = pg;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.on("error", (err) => {
    console.error("[DB] Unexpected pool error:", err.message);
});

// Sometimes DB connection dies
// Network drops
// Neon restarts
// Without this you may never know why.
// With this
// console.error(...)
// you immediately know.


try {
    const client = await pool.connect();
    console.log(`[DB] Connected successfully (${env.NODE_ENV})`);
    client.release();
} catch (err) {
    console.log("[DB] connection failed:", err.message);
    process.exit(1);
}

const shutdown = (signal) => {
    console.log(`${signal} received`);
    await pool.end();
    process.exit(0); //graceful exit
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

//What does rejectUnauthorized: false do?
// It tells Node.js:
// "Use SSL encryption, but don't verify the certificate."
// Maximum simultaneous DB connections.
// Imagine 100 users
// Pool size 5
// means 5 connections 95 wait instead of opening 100 PostgreSQL connections
// idleTimeoutMillis
// If a connection isn't used for 10 seconds close it instead of wasting resources.
// connectionTimeoutMillis
// How long Node waits for a connection. Otherwise hang forever
// keepAlive
// Keeps TCP alive. Useful on cloud providers.
