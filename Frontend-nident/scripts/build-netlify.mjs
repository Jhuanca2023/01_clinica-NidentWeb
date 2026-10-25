import { spawnSync } from "node:child_process";
const env = { ...process.env, NIDENT_DEPLOY_TARGET: "netlify" };
env.NIDENT_DEMO_MODE ??= env.API_INTERNAL_URL ? "false" : "true";
if (env.NIDENT_DEMO_MODE !== "true") {
  if (
    !env.API_INTERNAL_URL ||
    !/^https:\/\//.test(env.API_INTERNAL_URL) ||
    /localhost|127\.0\.0\.1/.test(env.API_INTERNAL_URL)
  )
    throw Error(
      "Para conectar Laravel define API_INTERNAL_URL con la URL HTTPS pública de /api/v1.",
    );
}
if (!env.PUBLIC_SITE_URL) {
  env.PUBLIC_SITE_URL = ["deploy-preview", "branch-deploy"].includes(
    env.CONTEXT,
  )
    ? env.DEPLOY_PRIME_URL
    : env.URL;
}
if (!env.PUBLIC_SITE_URL) delete env.PUBLIC_SITE_URL;
console.log(
  env.NIDENT_DEMO_MODE === "true"
    ? "Netlify: demostración con contenido incluido; formularios y administración desactivados."
    : "Netlify: frontend conectado al backend configurado.",
);
const result = spawnSync(
  process.execPath,
  ["node_modules/astro/bin/astro.mjs", "build"],
  { env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
