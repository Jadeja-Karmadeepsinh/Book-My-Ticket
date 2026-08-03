import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(8080),
    DATABASE_URL: z.string().startsWith("postgres", { message: "Must be a valid Postgres connection string" }),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    JWT_ACCESS_SECRET: z.string().min(32, { message: "JWT access secret must be at least 32 characters" }),
    JWT_REFRESH_SECRET: z.string().min(32, { message: "JWT refresh secret must be at least 32 characters" }),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d")
});

export const env = envSchema.parse(process.env);

//"Convert the input into this type before validating it."
// Common uses
// z.coerce.number()   // "42" -> 42
// z.coerce.boolean()  // "true" -> true (be careful; coercion follows JS rules)
// z.coerce.date()     // "2026-08-02" -> Date object
// z.coerce.string()   // 123 -> "123"
// Because number() accepts both integers and decimals, while ports must be whole numbers.