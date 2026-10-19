// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  session: {
    driver: {
      entrypoint: new URL(
        "./src/lib/server/session-driver.mjs",
        import.meta.url,
      ),
    },
    ttl: 3600,
    cookie: {
      name: "nident_session",
      sameSite: "lax",
      secure: process.env.PUBLIC_SITE_URL?.startsWith("https://") ?? false,
      path: "/",
    },
  },
});
