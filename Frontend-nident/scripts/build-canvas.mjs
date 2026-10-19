import fs from "node:fs";
import { parseFragment } from "parse5";
const pages = JSON.parse(
  fs.readFileSync(new URL("../src/data/template-pages.json", import.meta.url)),
);
const home = pages.find((p) => p.path === "/");
const common = Object.fromEntries(
  ["header", "footer"].map((tag) => [
    tag,
    home.body.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`))[0],
  ]),
);
const modules = {};
function compile(html, key, name, path) {
  const fields = [];
  const edits = [];
  const tree = parseFragment(html, { sourceCodeLocationInfo: true });
  function walk(node, excluded = false) {
    const attrs = Object.fromEntries(
      (node.attrs || []).map((a) => [a.name, a.value]),
    );
    excluded ||=
      ["script", "style", "svg", "noscript"].includes(node.tagName) ||
      (attrs.class || "").split(" ").includes("n-hero");
    if (!excluded && node.sourceCodeLocation?.startTag) {
      const ids = [];
      const add = (type, value, start, end, label, target) => {
        const id = `${key}-${fields.length}`;
        fields.push({
          id,
          type,
          value,
          label: label || value.replace(/\s+/g, " ").slice(0, 65) || "Texto",
          group: node.tagName,
          target,
        });
        ids.push(id);
        edits.push({ start, end, value: `{{nident:${id}}}` });
      };
      for (const attr of node.attrs || []) {
        const type =
          attr.name === "src" && node.tagName === "img"
            ? "image"
            : attr.name === "alt" && node.tagName === "img"
              ? "text"
              : attr.name === "href" && node.tagName === "a"
                ? "link"
                : null;
        const loc = node.sourceCodeLocation.attrs?.[attr.name];
        if (type && loc) {
          const raw = html.slice(loc.startOffset, loc.endOffset);
          const match = raw.match(/^[^=]+=(["'])([\s\S]*)\1$/);
          if (match)
            add(
              type,
              attr.value,
              loc.startOffset + raw.indexOf(match[1]) + 1,
              loc.endOffset - 1,
              type === "image"
                ? attrs.alt || "Imagen"
                : type === "link"
                  ? "Destino del enlace"
                  : "Descripción de imagen",
              { attribute: attr.name },
            );
        }
      }
      for (const child of node.childNodes || []) {
        if (
          child.nodeName === "#text" &&
          child.value.trim() &&
          child.sourceCodeLocation
        ) {
          add(
            "text",
            child.value,
            child.sourceCodeLocation.startOffset,
            child.sourceCodeLocation.endOffset,
            undefined,
            { textIndex: node.childNodes.indexOf(child) },
          );
        }
      }
      if (ids.length)
        edits.push({
          start: node.sourceCodeLocation.startTag.endOffset - 1,
          end: node.sourceCodeLocation.startTag.endOffset - 1,
          value: ` data-cms-fields="${ids.join(",")}"`,
        });
    }
    for (const child of node.childNodes || []) walk(child, excluded);
  }
  walk(tree);
  for (const edit of edits.sort((a, b) => b.start - a.start))
    html = html.slice(0, edit.start) + edit.value + html.slice(edit.end);
  modules[key] = { key, name, path, fields };
  return html;
}
const header = compile(
  common.header,
  "encabezado",
  "Encabezado y navegación",
  "/",
);
const footer = compile(common.footer, "footer", "Footer y cierre", "/");
const compiled = pages.map((page) => {
  const key =
    page.path === "/" ? "inicio" : page.path.slice(1).replaceAll("/", "-");
  let body = page.body
    .replace(/<header\b[\s\S]*?<\/header>/, "<!--NIDENT-HEADER-->")
    .replace(/<footer\b[\s\S]*?<\/footer>/, "<!--NIDENT-FOOTER-->");
  body = compile(body, key, page.title.replace(/\s*[·|].*$/, ""), page.path);
  body = body
    .replace("<!--NIDENT-HEADER-->", header)
    .replace("<!--NIDENT-FOOTER-->", footer);
  return { ...page, body, module: key };
});
fs.writeFileSync(
  new URL("../src/data/canvas-pages.json", import.meta.url),
  JSON.stringify(compiled),
);
fs.writeFileSync(
  new URL("../src/data/canvas-modules.json", import.meta.url),
  JSON.stringify(modules),
);
fs.writeFileSync(
  new URL(
    "../../Backend-nident/database/seeders/data/nident-canvas.json",
    import.meta.url,
  ),
  JSON.stringify(modules),
);
console.log(
  `Canvas: ${Object.keys(modules).length} módulos, ${Object.values(modules).reduce((n, m) => n + m.fields.length, 0)} campos.`,
);
