import type { APIRoute } from "astro";
import { api } from "../../lib/server/api";
export const POST: APIRoute = async ({ session, redirect, locals }) => {
  const refreshToken = await session!.get("refreshToken");
  try {
    if (refreshToken)
      await api("/auth/logout", {
        method: "POST",
        token: locals.token,
        body: { refreshToken },
      });
  } catch {
    /* local logout remains available during API outage */
  }
  session!.destroy();
  return redirect("/admin/login");
};
