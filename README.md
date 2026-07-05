# sunworks-site

The replacement for the WordPress sunworks.ca — plain static HTML, deployed on
Vercel, corrections through Claude, git push to deploy. Same pipeline as
strumworks.

## What's here

- `index.html` — placeholder homepage (real rebuild comes later, from the
  WP archive content)
- `news/` — **the newsletter archive page**, first brick of the new site
  - `news/issues.json` — one entry per issue (date, subject, archive URL,
    cached thumbnail)
  - `news/index.html` — generated, do not hand-edit
- `tools/build_news.py` — regenerates `news/index.html` from `issues.json`
- `wp-archive/` — **full scrape of the old WordPress site** (git-ignored,
  283 MB): all pages/posts/media JSON, rendered HTML of every page, and all
  282 media originals. Taken 2026-07-05 before GoDaddy hosting dies (Phase D
  of the exit runbook in bank-tracker/docs/sunworks-godaddy-exit.md).

## Adding a newsletter issue to the archive

1. Add an entry to `news/issues.json` (date, subject, url — thumb is
   auto-discovered)
2. `python3 tools/build_news.py`
3. Commit and push — Vercel deploys.

Issue archive HTML lives in the Supabase public bucket `newsletter-archive`
(chipsmsapp project); images in `newsletter-images`.
