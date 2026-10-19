import modules from "../data/canvas-modules.json";
import pages from "../data/canvas-pages.json";
export type CanvasField = {
  id: string;
  type: string;
  value: string;
  label: string;
  group: string;
  target?: { attribute?: string; textIndex?: number };
};
export const canvasModules = modules as Record<
  string,
  { key: string; name: string; path: string; fields: CanvasField[] }
>;
export const canvasPages = pages;
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
const defaults = Object.fromEntries(
  Object.values(canvasModules).flatMap((m) =>
    m.fields.map((f) => [f.id, f.value]),
  ),
);
export function renderCanvas(
  body: string,
  content: Record<string, Record<string, string>> = {},
  editable = false,
): string {
  const values = Object.assign({}, defaults, ...Object.values(content));
  let result = body.replace(/\{\{nident:([a-z0-9-]+)\}\}/g, (_, id) =>
    escapeHtml(values[id] ?? ""),
  );
  if (!editable) result = result.replace(/ data-cms-fields="[^"]*"/g, "");
  return result;
}
