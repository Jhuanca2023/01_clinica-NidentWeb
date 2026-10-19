export interface Review {
  id: string;
  visible: boolean;
  author: string;
  service: string;
  quote: string;
  rating: number;
  image: string;
  alt: string;
  note: string;
}
export interface Plan {
  id: string;
  visible: boolean;
  featured: boolean;
  title: string;
  slug: string;
  summary: string;
  image: string;
  alt: string;
  price: string;
  price_note: string;
  features: string[];
  conditions: string;
  cta: string;
  sections: { title: string; body: string }[];
}
export type CollectionItem = Review | Plan;
export const html = (text: string | number) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const star =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9Z"/></svg>';
export function reviewMarkup(item: Review): string {
  return `<article class="review-card" data-collection-id="${html(item.id)}"><header>${item.image ? `<img src="${html(item.image)}" alt="${html(item.alt)}" loading="lazy">` : ""}<div><h3>${html(item.author)}</h3><span>${html(item.service)}</span></div></header><div class="review-stars" role="img" aria-label="${html(item.rating)} de 5 estrellas">${star.repeat(Math.max(1, Math.min(5, item.rating)))}</div><blockquote>${html(item.quote)}</blockquote>${item.note ? `<p>${html(item.note)}</p>` : ""}</article>`;
}
export function planMarkup(item: Plan, catalog = false): string {
  const image = item.image
    ? `<img class="plan-cover" src="${html(item.image)}" alt="${html(item.alt)}" loading="lazy">`
    : "";
  const url = "/planes/" + encodeURIComponent(item.slug);
  if (catalog)
    return `<article class="pack-catalog-card" data-collection-id="${html(item.id)}"><a href="${url}">${image}</a><div><h2>${html(item.title)}</h2><p>${html(item.summary)}</p><span>${html(item.price)} <small>${html(item.price_note)}</small></span><a class="text-link" href="${url}">Ver qué incluye</a></div></article>`;
  return `<article data-collection-id="${html(item.id)}">${image}<h3>${html(item.title)}</h3><p>${html(item.summary)}</p><div class="plan-price">${html(item.price)}<span>${html(item.price_note)}</span></div><ul>${item.features.map((f) => `<li>${html(f)}</li>`).join("")}</ul><a class="btn ghost" href="${url}">Ver qué incluye</a></article>`;
}
