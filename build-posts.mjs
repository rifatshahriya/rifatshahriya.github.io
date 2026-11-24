// Builds one real web page per published blog post (blog/<slug>/index.html),
// a blog index (blog/index.html), sitemap.xml and robots.txt.
// Runs on GitHub (see .github/workflows/build-posts.yml). Needs Node 18+.
import fs from "node:fs";

const PROJECT = "rifat-shahriya";
const API_KEY = "AIzaSyCNLvS4l6wE2B7CBUw8EdT__OlY1X1aRj4"; // public web key, same as the website uses

const fsv = v => {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return +v.integerValue;
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("mapValue" in v) { const o = {}, f = v.mapValue.fields || {}; for (const k in f) o[k] = fsv(f[k]); return o; }
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fsv);
  return null;
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugOf = p => {
  const t = String(p.title || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  return (t || "post") + "-" + String(p.id).replace(/[^a-z0-9]/gi, "").toLowerCase();
};
const iso = d => { const t = Date.parse(d); return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10); };
const exc = t => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > 150 ? t.slice(0, 150).trimEnd() + "…" : t; };
const paras = t => String(t || "").split(/\n{2,}/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x).replace(/\n/g, "<br>")}</p>`).join("\n");

// 1) read the website data (public read, same as the live site)
let content;
try {
  if (process.env.DOC_JSON) content = JSON.parse(fs.readFileSync(process.env.DOC_JSON, "utf8"));
  else {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/site/public?key=${API_KEY}`);
    if (!r.ok) throw new Error("Firestore answered HTTP " + r.status);
    const j = await r.json();
    content = fsv({ mapValue: { fields: j.fields || {} } }).content || {};
  }
} catch (e) { console.error("Could not read the website data — nothing was changed.", e.message); process.exit(1); }

const posts = (content.blog || []).filter(p => p && p.show !== false && p.title && p.id);
const base = String((content.blogset && content.blogset.base) || process.env.SITE_URL || "https://rifatshahriya.github.io").trim().replace(/\/+$/, "");
const siteTitle = (content.site && content.site.title) || "Rifat Shahriya";
const th = content.theme || {};
const bg = /^#[0-9a-f]{6}$/i.test(th.bg || "") ? th.bg : "#F4F3EF";
const ink = /^#[0-9a-f]{6}$/i.test(th.ink || "") ? th.ink : "#111111";
const barTitle = (content.blogset && content.blogset.bar) || "Blog";
const today = new Date().toISOString().slice(0, 10);

const css = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:${bg};color:${ink};font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.7}
a{color:inherit}.bar{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;background:${bg};border-bottom:1px solid color-mix(in srgb,${ink} 14%,${bg});font-weight:600}
.bar a{text-decoration:none}.wrap{max-width:760px;margin:0 auto;padding:40px 22px 90px}.meta{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
h1{font-size:clamp(2rem,6.5vw,3.4rem);line-height:1.1;letter-spacing:-.04em;margin:14px 0 24px}img{max-width:100%;height:auto;border-radius:16px;margin:8px 0 26px;display:block}
p{font-size:clamp(17px,2.2vw,20px);margin:0 0 1.1em}.btn{display:inline-block;margin-top:30px;padding:14px 24px;border:1px solid ${ink};border-radius:99px;text-decoration:none;font-weight:600}
.card{display:block;text-decoration:none;border:1px solid color-mix(in srgb,${ink} 16%,${bg});border-radius:18px;padding:20px 22px;margin:0 0 16px}.card h2{margin:6px 0 8px;font-size:1.4rem;letter-spacing:-.02em;line-height:1.2}.card p{font-size:16px;opacity:.7;margin:0}`;

const head = (title, desc, url, extra = "") => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="${esc(siteTitle)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">${extra}<style>${css}</style></head><body>`;
const bar = `<div class="bar"><a href="${base}/">${esc(siteTitle)}</a><a href="${base}/blog/">${esc(barTitle)}</a></div>`;

fs.rmSync("blog", { recursive: true, force: true });
fs.mkdirSync("blog", { recursive: true });

const urls = [{ loc: base + "/", last: today }];

if (posts.length) {
  for (const p of posts) {
    const slug = slugOf(p), url = `${base}/blog/${slug}/`, desc = p.excerpt ? exc(p.excerpt) : exc(p.body) || p.title;
    const img = p.img && /^https?:\/\//.test(p.img.src || "") ? p.img.src : "";
    const d = iso(p.date);
    const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: desc, mainEntityOfPage: url, author: { "@type": "Person", name: siteTitle } };
    if (d) ld.datePublished = d; if (img) ld.image = img;
    const extra = `<meta property="og:type" content="article">${img ? `<meta property="og:image" content="${esc(img)}">` : ""}<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
    const html = head(`${p.title} — ${siteTitle}`, desc, url, extra) + bar +
      `<main class="wrap"><article><div class="meta">${esc(p.tag || "")}${p.tag && p.date ? " · " : ""}${esc(p.date || "")}</div><h1>${esc(p.title)}</h1>${img ? `<img src="${esc(img)}" alt="${esc(p.img.alt || p.title)}">` : ""}${paras(p.body)}</article><a class="btn" href="${base}/blog/">← All posts</a> <a class="btn" href="${base}/">Open the website</a></main></body></html>`;
    fs.mkdirSync(`blog/${slug}`, { recursive: true });
    fs.writeFileSync(`blog/${slug}/index.html`, html);
    urls.push({ loc: url, last: d || today });
  }
  const list = posts.map(p => `<a class="card" href="${base}/blog/${slugOf(p)}/"><div class="meta">${esc(p.tag || "")}${p.tag && p.date ? " · " : ""}${esc(p.date || "")}</div><h2>${esc(p.title)}</h2><p>${esc(p.excerpt ? exc(p.excerpt) : exc(p.body))}</p></a>`).join("\n");
  const t = (content.blogset && content.blogset.title) || "All writing";
  fs.writeFileSync("blog/index.html", head(`${t} — ${siteTitle}`, `${t} by ${siteTitle}`, base + "/blog/") + bar + `<main class="wrap"><div class="meta">${esc(barTitle)}</div><h1>${esc(t)}</h1>${list}</main></body></html>`);
  urls.splice(1, 0, { loc: base + "/blog/", last: today });
}

fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <lastmod>${u.last}</lastmod>\n  </url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
console.log(`Built ${posts.length} post page(s) for ${base}`);
