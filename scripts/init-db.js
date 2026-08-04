import fs from "fs/promises";
import { pool } from "../src/common/config/db.js"

export const initializeDatabase = async () => {
    try {
        console.log("[DB Initialization] Starting...");

        // Read schema.sql
        const sql = await fs.readFile("./sql/schema.sql", "utf8");

        // Execute SQL
        await pool.query(sql);

        console.log("[DB] initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize database.");
        console.error(error);
    } finally {
        await pool.end();
    }
}