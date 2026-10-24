import fs from "node:fs";
import { createHash } from "node:crypto";
const products = JSON.parse(
  fs.readFileSync(new URL("../public/assets/products.json", import.meta.url)),
);
const items = products.map((p) => {
  const h = createHash("sha256")
    .update("product-" + p.id)
    .digest("hex");
  return {
    id: `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`,
    visible: true,
    title: p.name,
    slug: p.id,
    summary: p.description,
    image: "/assets/img/" + p.image,
    alt: p.name,
    price: String(p.price),
    category: p.category,
    sku: p.id.toUpperCase(),
    stock: null,
    details:
      "Producto de la plantilla. Precio y disponibilidad pendientes de validación por la clínica.",
  };
});
fs.writeFileSync(
  new URL(
    "../../Backend-nident/database/seeders/data/nident-products.json",
    import.meta.url,
  ),
  JSON.stringify(items, null, 2),
);
