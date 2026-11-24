# Rifat Shahriya — Personal Website

A single-file website (`index.html`) with a built-in admin panel at `#/admin`.
Content is stored in Firebase Firestore, so editing never needs a re-upload.

## Publish on GitHub Pages
1. Create a new repository on GitHub (e.g. `rifat-shahriya-website`).
2. Upload all files from this folder (including `.nojekyll`).
3. Repository → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. Wait a minute. Your site appears at `https://USERNAME.github.io/REPOSITORY/`.

## After publishing (important)
- Firebase Console → **Authentication → Settings → Authorized domains** → add `USERNAME.github.io` (or your own domain), otherwise admin login will not work.
- In the admin panel → **Content → Site & SEO**, set *Website address* to your real URL, then download a fresh `sitemap.xml` / `robots.txt` from the **Visitors** tab and replace the ones here.
- Firestore rules must allow the `stats` collection (the Visitors tab shows the exact rule).

## Files
- `index.html` — the whole website + admin panel
- `404.html` — same page, so unknown links still open the site
- `robots.txt`, `sitemap.xml` — for search engines
- `.nojekyll` — tells GitHub Pages to serve files as they are

## Blog post pages (own URL per post)
1. Admin → Blog → design: tick "Share links point to each post's own page" and write your site address.
2. GitHub → Actions → "Build post pages" → Run workflow (also runs every 6 hours).
3. It creates `blog/<post>/index.html`, `sitemap.xml`, `robots.txt` automatically.
