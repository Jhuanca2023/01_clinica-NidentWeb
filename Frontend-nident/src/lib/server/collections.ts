import { parseFragment } from "parse5";
import {
  reviewMarkup,
  planMarkup,
  type Review,
  type Plan,
} from "../content-collections";
export function applyCollections(body: string, collections: any): string {
  if (!collections) return body;
  const tree = parseFragment(body, { sourceCodeLocationInfo: true });
  const edits: { start: number; end: number; value: string }[] = [];
  function walk(node: any) {
    const cls =
      node.attrs?.find((a: any) => a.name === "class")?.value.split(" ") || [];
    const loc = node.sourceCodeLocation;
    if (
      loc &&
      ((cls.includes("reviews-section") &&
        collections.reviews &&
        !collections.reviews.items.some((item: Review) => item.visible)) ||
        (cls.includes("plans-section") &&
          collections.plans &&
          !collections.plans.items.some(
            (item: Plan) => item.visible && item.featured,
          )))
    ) {
      edits.push({ start: loc.startOffset, end: loc.endOffset, value: "" });
      return;
    }
    let markup: string | undefined;
    if (cls.includes("reviews-track") && collections.reviews)
      markup = collections.reviews.items
        .filter((i: Review) => i.visible)
        .map(reviewMarkup)
        .join("");
    if (cls.includes("plans-grid") && collections.plans)
      markup = collections.plans.items
        .filter((i: Plan) => i.visible && i.featured)
        .map((i: Plan) => planMarkup(i))
        .join("");
    if (cls.includes("pack-catalog") && collections.plans)
      markup = collections.plans.items
        .filter((i: Plan) => i.visible)
        .map((i: Plan) => planMarkup(i, true))
        .join("");
    if (cls.includes("pack-catalog") && markup === "")
      markup =
        '<p class="small-note">Por ahora no hay planes publicados. Puedes comunicarte con la clínica para recibir orientación.</p>';
    if (markup !== undefined && loc?.endTag) {
      edits.push({
        start: loc.startTag.endOffset,
        end: loc.endTag.startOffset,
        value: markup,
      });
      return;
    }
    for (const child of node.childNodes || []) walk(child);
  }
  walk(tree);
  for (const edit of edits.sort((a, b) => b.start - a.start))
    body = body.slice(0, edit.start) + edit.value + body.slice(edit.end);
  return body;
}
