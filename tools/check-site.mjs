import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pages = ["index.html", "menu.html", "space.html", "reservation.html", "access.html"];
const requiredAssets = [
  "assets/css/styles.css",
  "assets/js/main.js",
  "assets/images/home-hero.jpg",
  "assets/images/menu-hero.jpg",
  "assets/images/space-hero.jpg",
  "assets/images/reservation-hero.jpg",
  "assets/images/access-hero.jpg",
  "sitemap.xml",
  "robots.txt"
];

const errors = [];

async function exists(file) {
  try {
    const entry = await stat(path.join(root, file));
    return entry.isFile();
  } catch {
    return false;
  }
}

for (const file of [...pages, ...requiredAssets]) {
  if (!(await exists(file))) {
    errors.push(`Missing file: ${file}`);
  }
}

const htmlFiles = await readdir(root).then((files) => files.filter((file) => file.endsWith(".html")));
for (const file of htmlFiles) {
  const html = await readFile(path.join(root, file), "utf8");
  for (const href of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const target = href[1];
    if (/^(https?:|mailto:|tel:|#)/.test(target)) continue;
    const clean = target.split("#")[0].split("?")[0];
    if (clean && !(await exists(clean))) {
      errors.push(`${file} references missing asset/page: ${target}`);
    }
    if (target.startsWith("/")) {
      errors.push(`${file} uses root-relative path: ${target}`);
    }
  }
  if (!html.includes("架空") || !html.includes("20歳未満")) {
    errors.push(`${file} must include fictional-site and age notices`);
  }
  for (const match of html.matchAll(/<(h[12])([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const [, tag, attrs, inner] = match;
    const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    const hasManualLines = attrs.includes("headline-lines") && inner.includes('class="line"');
    if (text.length >= 14 && !hasManualLines) {
      errors.push(`${file} ${tag} needs intentional Japanese line breaks: ${text}`);
    }
  }
}

const css = await readFile(path.join(root, "assets/css/styles.css"), "utf8");
for (const rule of ["line-break: strict", "text-wrap: balance", "word-break: auto-phrase"]) {
  if (!css.includes(rule)) {
    errors.push(`assets/css/styles.css missing Japanese headline rule: ${rule}`);
  }
}

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const page of pages) {
  const url = page === "index.html" ? "https://sakurairiya.github.io/japanese-luxury-bar-site/" : `https://sakurairiya.github.io/japanese-luxury-bar-site/${page}`;
  if (!sitemap.includes(url)) {
    errors.push(`sitemap.xml missing ${url}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Site check passed: ${pages.length} pages and ${requiredAssets.length} assets verified.`);
