import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = path.join(root, 'site');
const frontend = path.join(root, 'Frontend-nident');
const special = { index: '/', servicios: '/tratamientos', contacto: '/reservar', contactanos: '/contacto', navegacion: '/mapa-del-sitio' };
const treatments = ['diseno-sonrisa', 'endodoncia', 'implantes', 'limpieza-blanqueamiento', 'odontologia-general', 'odontopediatria', 'ortodoncia', 'periodoncia'];
const routeFor = (name) => special[name] ?? (treatments.includes(name) ? `/tratamientos/${name}` : name.startsWith('pack-') ? `/packs/${name.slice(5)}` : `/${name}`);
const files = fs.readdirSync(source).filter(name => name.endsWith('.html'));
const routeMap = Object.fromEntries(files.map(file => [file, routeFor(file.slice(0, -5))]));
const text = (html) => html.replace(/<[^>]+>/g, '').trim();
const rewrite = (html) => html.replace(/(href|src|poster)="([^"#]+)"/g, (match, attr, value) => {
  if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(value)) return match;
  const name = value.split(/[?#]/)[0];
  if (routeMap[name]) return `${attr}="${routeMap[name]}${value.slice(name.length)}"`;
  if (/^(assets|css|js)\//.test(value)) return `${attr}="/${value}"`;
  return match;
});
const pages = files.map(file => {
  const html = rewrite(fs.readFileSync(path.join(source, file), 'utf8'));
  const body = html.match(/<body([^>]*)>([\s\S]*)<\/body>/i);
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  return { source: file, path: routeMap[file], title: text(head.match(/<title>(.*?)<\/title>/)?.[1] ?? 'Nident'), bodyClass: body?.[1].match(/class="([^"]*)"/)?.[1] ?? 'nident', body: body?.[2] ?? '', head: head.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta[^>]*name="description"[^>]*>/g, '') };
});
const home = pages.find(p => p.path === '/');
const hero = [...home.body.matchAll(/<div class="hero-slide[^>]*>[\s\S]*?<div class="slide-copy">([\s\S]*?)<\/h1><p>(.*?)<\/p><div class="row"><a class="btn hero-primary" href="([^"]+)">([\s\S]*?)<\/a>/g)].map(match => {
  const image = match[0].match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/);
  const lines = [...match[1].matchAll(/<span class="hero-line-content">([\s\S]*?)<\/span>/g)].map(m => text(m[1]));
  return { title: lines[0], line: lines[1], description: match[2], image: image[1], alt: image[2], url: match[3], cta: text(match[4]) };
});
const content = { brand: 'Nident', tagline: 'Sonríe a tu manera. Te acompañamos.', email: '', phone: '', logo: '/assets/img/marca/logo1-trim.webp', nav: [{ label: 'Inicio', url: '/' }, { label: 'Tratamientos', url: '/tratamientos' }, { label: 'Nosotros', url: '/nosotros' }, { label: 'Tienda', url: '/tienda' }, { label: 'Sedes', url: '/nosotros#sedes' }, { label: 'Contacto', url: '/contacto' }], hero };
fs.mkdirSync(path.join(frontend, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(frontend, 'src/data/template-pages.json'), JSON.stringify(pages));
const seeds = path.join(root, 'Backend-nident/database/seeders/data');
fs.mkdirSync(seeds, { recursive: true });
fs.writeFileSync(path.join(seeds, 'nident-site.json'), JSON.stringify({ content, pages: pages.map(p => ({ path: p.path, source: p.source, title: p.title, description: '', published: true })) }, null, 2));
for (const directory of ['assets', 'css', 'js']) fs.cpSync(path.join(source, directory), path.join(frontend, 'public', directory), {
  recursive: true,
  filter: file => !file.replaceAll('\\', '/').includes('/documentacion') && !file.endsWith('.md'),
});
for (const file of fs.readdirSync(path.join(frontend, 'public/js')).filter(name => name.endsWith('.js'))) {
  const target = path.join(frontend, 'public/js', file);
  let script = fs.readFileSync(target, 'utf8').replace(/(['"`])assets\//g, '$1/assets/');
  if (file === 'packs.js') script = script.replace('if(form){', "if(form&&!form.hasAttribute('data-api-contact')){");
  fs.writeFileSync(target, script);
}
fs.writeFileSync(path.join(frontend, 'src/data/route-map.json'), JSON.stringify(routeMap, null, 2));
console.log(`Importadas ${pages.length} páginas y ${hero.length} banners; recursos copiados sin modificar site/.`);
