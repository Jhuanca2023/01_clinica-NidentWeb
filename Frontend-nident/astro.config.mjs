// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import netlify from "@astrojs/netlify";
const isNetlify =
  process.env.NETLIFY === "true" ||
  process.env.NIDENT_DEPLOY_TARGET === "netlify";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: isNetlify ? netlify() : node({ mode: "standalone" }),
  vite: {
    define: {
      "import.meta.env.NIDENT_DEMO_MODE": JSON.stringify(
        process.env.NIDENT_DEMO_MODE || "false",
      ),
    },
  },
  session: {
    ...(!isNetlify
      ? {
          driver: {
            entrypoint: new URL(
              "./src/lib/server/session-driver.mjs",
              import.meta.url,
            ),
          },
        }
      : {}),
    ttl: 3600,
    cookie: {
      name: "nident_session",
      sameSite: "lax",
      secure:
        isNetlify ||
        (process.env.PUBLIC_SITE_URL?.startsWith("https://") ?? false),
      path: "/",
    },
  },
});
