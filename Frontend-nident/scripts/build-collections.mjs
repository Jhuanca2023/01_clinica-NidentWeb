import fs from "node:fs";
import { parseFragment } from "parse5";
import { createHash } from "node:crypto";
const pages = JSON.parse(
  fs.readFileSync(new URL("../src/data/canvas-pages.json", import.meta.url)),
);
const modules = JSON.parse(
  fs.readFileSync(new URL("../src/data/canvas-modules.json", import.meta.url)),
);
const defaults = Object.fromEntries(
  Object.values(modules).flatMap((m) => m.fields.map((f) => [f.id, f.value])),
);
const attr = (n, key) => n?.attrs?.find((a) => a.name === key)?.value || "";
const cls = (n, name) => attr(n, "class").split(" ").includes(name);
const all = (n, p) => {
  const result = [];
  function walk(n) {
    if (p(n)) result.push(n);
    for (const c of n.childNodes || []) walk(c);
  }
  walk(n);
  return result;
};
const first = (n, p) => all(n, p)[0];
const text = (n) =>
  (n?.nodeName === "#text"
    ? n.value
    : (n?.childNodes || []).map(text).join("")
  ).trim();
const uuid = (key) => {
  const h = createHash("sha256").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const resolve = (s) =>
  s.replace(/\{\{nident:([a-z0-9-]+)\}\}/g, (_, id) => defaults[id] ?? "");
const seeds = {
  reviews: { items: [], bindings: {} },
  plans: { items: [], bindings: {} },
};
function item(kind, values) {
  const index = seeds[kind].items.length;
  function walk(value, path) {
    if (typeof value === "string") {
      if (value.includes("{{nident:"))
        seeds[kind].bindings[`items.${index}.${path}`] = value;
      return resolve(value);
    }
    if (Array.isArray(value))
      return value.map((v, i) => walk(v, `${path}.${i}`));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [
          k,
          walk(v, path ? `${path}.${k}` : k),
        ]),
      );
    return value;
  }
  seeds[kind].items.push(walk(values, ""));
}
const home = parseFragment(pages.find((p) => p.path === "/").body);
const reviews = first(home, (n) => cls(n, "reviews-track"));
for (const [index, n] of all(reviews, (n) => cls(n, "review-card")).entries())
  item("reviews", {
    id: uuid("review-" + index),
    visible: true,
    author: text(first(n, (n) => n.tagName === "h3")),
    service: text(
      first(
        first(n, (n) => n.tagName === "header"),
        (n) => n.tagName === "span",
      ),
    ),
    quote: text(first(n, (n) => n.tagName === "blockquote")),
    rating: 5,
    image: attr(
      first(n, (n) => n.tagName === "img"),
      "src",
    ),
    alt: "",
    note: text(first(n, (n) => n.tagName === "p")),
  });
const catalog = parseFragment(
  pages.find((p) => p.path === "/promociones").body,
);
for (const [index, n] of all(catalog, (n) =>
  cls(n, "pack-catalog-card"),
).entries()) {
  const slug = resolve(
    attr(
      first(n, (n) => n.tagName === "a"),
      "href",
    ),
  )
    .split("/")
    .pop();
  const detail = parseFragment(
    pages.find((p) => p.path === "/packs/" + slug).body,
  );
  const price = first(detail, (n) => cls(n, "pack-price"));
  const includes = first(detail, (n) => cls(n, "pack-checks"));
  const sections = all(
    detail,
    (n) =>
      n.tagName === "section" &&
      ["para-ti", "visita", "dudas"].includes(attr(n, "id")),
  ).map((s) => ({
    title: text(first(s, (n) => n.tagName === "h2")),
    body: all(s, (n) => ["p", "li", "summary"].includes(n.tagName))
      .map(text)
      .join("\n\n"),
  }));
  item("plans", {
    id: uuid("plan-" + slug),
    visible: true,
    featured: index < 3,
    title: text(first(n, (n) => n.tagName === "h2")),
    slug,
    summary: text(first(n, (n) => n.tagName === "p")),
    image: attr(
      first(n, (n) => n.tagName === "img"),
      "src",
    ),
    alt: attr(
      first(n, (n) => n.tagName === "img"),
      "alt",
    ),
    price: (price.childNodes || [])
      .filter((n) => n.nodeName === "#text")
      .map(text)
      .join(""),
    price_note: text(first(price, (n) => n.tagName === "small")),
    features: all(includes, (n) => n.tagName === "li").map(text),
    conditions:
      "Plan ilustrativo. La clínica debe validar el contenido, precio y condiciones antes de ofrecerlo.",
    cta: "Solicitar información",
    sections,
  });
}
fs.writeFileSync(
  new URL(
    "../../Backend-nident/database/seeders/data/nident-collections.json",
    import.meta.url,
  ),
  JSON.stringify(seeds, null, 2),
);
console.log(
  `Colecciones: ${seeds.reviews.items.length} reseñas y ${seeds.plans.items.length} planes.`,
);
