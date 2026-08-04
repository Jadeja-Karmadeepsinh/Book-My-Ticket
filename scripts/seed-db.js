import fs from "fs/promises";
import { pool } from "../src/common/config/db.js"

async function seedDatabase () {
    try {
        console.log("[Seed] Starting...")

        const sql = await fs.readFile("./sql/seed.sql", "utf8");

        await pool.query(sql);

        console.log("[DB] seeded successfully.");
    } catch (error) {
        console.error();
        console.error(error);
    } finally {
        await pool.end();
    }
}

seedDatabase();