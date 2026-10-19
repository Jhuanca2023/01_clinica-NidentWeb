import fsDriver from "unstorage/drivers/fs";
import redisDriver from "unstorage/drivers/redis";

// Select at runtime: no Redis credentials in build artifacts.
export default function sessionDriver() {
  if (process.env.REDIS_URL)
    return redisDriver({
      url: process.env.REDIS_URL,
      base: "nident:sessions",
      ttl: 3600,
      maxRetriesPerRequest: 2,
    });
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NIDENT_ALLOW_FILE_SESSIONS !== "true"
  ) {
    throw new Error(
      "Define REDIS_URL para sesiones de producción. Los archivos locales solo se permiten explícitamente en pruebas aisladas.",
    );
  }
  return fsDriver({ base: process.env.NIDENT_SESSION_DIR || "./.sessions" });
}
