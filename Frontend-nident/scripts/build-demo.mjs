import fs from "node:fs";
const read = (name) =>
  JSON.parse(
    fs.readFileSync(
      new URL(
        "../../Backend-nident/database/seeders/data/" + name,
        import.meta.url,
      ),
      "utf8",
    ),
  );
const seed = read("nident-site.json");
const collections = read("nident-collections.json");
collections.products = { items: read("nident-products.json") };
fs.writeFileSync(
  new URL("../src/data/demo-site.json", import.meta.url),
  JSON.stringify({
    ...seed,
    modules: {},
    collections,
    business: {
      commercial_name: "Nident",
      legal_name: "",
      tax_id: "",
      address: "",
      email: "",
    },
  }),
);
console.log(
  "Contenido de demostración generado desde los defaults públicos de Nident, sin datos de la base.",
);
